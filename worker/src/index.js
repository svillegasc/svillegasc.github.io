const RATE_LIMIT = 30;
const RATE_WINDOW = 3600;
// Antes era 1024 bytes — con historial de conversación el body crece.
// 8 mensajes de historial * ~500 chars + el mensaje nuevo + overhead de JSON.
const MAX_BODY_SIZE = 8192;
const MAX_HISTORY_MESSAGES = 8; // últimos 4 intercambios (user+assistant)
const SITE_URL = 'https://svillegasc.github.io';
const CACHE_TTL = 3600;
const MAX_TOOL_ROUNDS = 2; // guardrail: evita loops de tool calling sin control

let cachedContent = null;
let cacheTimestamp = 0;

function stripHtml(html) {
  return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
}

async function getSiteContent() {
  const now = Date.now();
  if (cachedContent && (now - cacheTimestamp) < CACHE_TTL * 1000) {
    return cachedContent;
  }
  try {
    const res = await fetch(SITE_URL);
    if (!res.ok) return cachedContent || '';
    const html = await res.text();
    cachedContent = stripHtml(html);
    cacheTimestamp = now;
    return cachedContent;
  } catch {
    return cachedContent || '';
  }
}

// ---------- Tools (agente) ----------

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'capture_lead',
      description:
          'Registra el interés de un posible empleador o reclutador. Úsala SIEMPRE que el usuario pida ser contactado, proponga una vacante, pregunte cómo contratar a Santiago, o exprese interés claro en trabajar con él — aunque no haya dado todos los datos.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nombre de quien escribe, si lo dio' },
          company: { type: 'string', description: 'Empresa, si la mencionó' },
          contact: { type: 'string', description: 'Email u otra forma de contacto que haya dejado' },
          summary: { type: 'string', description: 'Resumen breve de lo que busca o propone' },
        },
        required: ['summary'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_latest_repos',
      description: 'Trae los repositorios públicos más recientes de Santiago en GitHub, con nombre, descripción y lenguaje.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

async function executeTool(name, args, env) {
  if (name === 'get_latest_repos') {
    try {
      const res = await fetch('https://api.github.com/users/svillegasc/repos?sort=updated&per_page=5', {
        headers: { 'User-Agent': 'svillegasc-portfolio-bot', Accept: 'application/vnd.github+json' },
      });
      if (!res.ok) return JSON.stringify({ error: 'No se pudo consultar GitHub en este momento.' });
      const repos = await res.json();
      const clean = repos.map((r) => ({
        name: r.name,
        description: r.description,
        url: r.html_url,
        language: r.language,
        updated_at: r.updated_at,
      }));
      return JSON.stringify(clean);
    } catch {
      return JSON.stringify({ error: 'No se pudo consultar GitHub en este momento.' });
    }
  }

  if (name === 'capture_lead') {
    try {
      if (!env.WEB3FORMS_KEY) return JSON.stringify({ error: 'Lead no registrado: falta configuración.' });
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: env.WEB3FORMS_KEY,
          subject: '🔥 Lead capturado por el asistente del portafolio',
          from_name: 'Asistente Santiago Villegas',
          name: args.name || 'No identificado',
          company: args.company || '-',
          contact: args.contact || '-',
          message: args.summary || '(sin resumen)',
        }),
      });
      if (!res.ok) return JSON.stringify({ error: 'No se pudo registrar el lead, pero igual sigue la conversación.' });
      return JSON.stringify({ ok: true });
    } catch {
      return JSON.stringify({ error: 'No se pudo registrar el lead, pero igual sigue la conversación.' });
    }
  }

  return JSON.stringify({ error: `Herramienta desconocida: ${name}` });
}

// -------------------------------------

function buildSystemPrompt(siteContent) {
  return `Eres el asistente técnico de Santiago Villegas Castro. Solo puedes responder basándote estrictamente en el siguiente texto extraído de su portafolio web, en el historial de esta conversación, o en el resultado de las herramientas disponibles. Si te preguntan algo fuera de este contexto, responde exactamente: "No tengo esa información". Sé conciso y no uses frases de relleno.

REGLAS INQUEBRANTABLES:
- Responde en el MISMO IDIOMA en el que escribe el usuario (español o inglés).
- Máximo 3 oraciones por respuesta.
- Usa el historial de la conversación para entender referencias como "eso", "ahí", "esa empresa", etc.
- Solo puedes usar información que esté en el texto del portafolio, en el historial, o en resultados de herramientas.
- Si la pregunta no tiene respuesta ahí, di "No tengo esa información".
- No inventes datos, no deduzcas, no supongas.
- Refiérete a Santiago en tercera persona.
- Si preguntan por contratación, proponen una vacante, o piden ser contactados: usa la herramienta capture_lead con la información disponible ANTES de responder, incluso si el usuario no dio todos los datos. Luego dirige también al formulario de contacto o LinkedIn.
- Si preguntan por proyectos recientes, repos, o en qué está trabajando ahora: usa get_latest_repos en vez de inventar o usar solo el texto estático.

CONTEXTO DEL PORTAFOLIO:
${siteContent}`;
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

function corsHeaders(origin, allowedOrigin) {
  const o = origin === allowedOrigin ? origin : allowedOrigin;
  return {
    'Access-Control-Allow-Origin': o,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

async function checkRateLimit(ip, env) {
  if (!env.RATE_LIMIT_KV) return true;
  const key = `rl:${ip}`;
  const count = parseInt(await env.RATE_LIMIT_KV.get(key) || '0');
  if (count >= RATE_LIMIT) return false;
  await env.RATE_LIMIT_KV.put(key, String(count + 1), { expirationTtl: RATE_WINDOW });
  return true;
}

function stripThink(text) {
  let reply = text;
  const thinkStart = reply.indexOf('<think>');
  if (thinkStart !== -1) {
    const thinkEnd = reply.indexOf('</think>', thinkStart);
    reply = thinkEnd !== -1
        ? reply.slice(0, thinkStart) + reply.slice(thinkEnd + 9)
        : reply.slice(0, thinkStart);
  }
  return reply.trim();
}

// NUEVO: nunca confiar ciegamente en lo que manda el cliente — valida forma,
// recorta cantidad de mensajes y longitud de cada uno, sin importar qué venga en el body.
function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 500) }));
}

async function callGroq(messages, env) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b',
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.3,
      max_tokens: 300,
    }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    console.log('Groq error:', res.status, errBody);
    return null;
  }
  return res.json();
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin, env.ALLOWED_ORIGIN);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/chat') {
      return json({ error: 'Not found' }, 404, headers);
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, headers);
    }

    const contentType = request.headers.get('Content-Type') || '';
    if (!contentType.includes('application/json')) {
      return json({ error: 'Content-Type must be application/json' }, 415, headers);
    }

    const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
    if (contentLength > MAX_BODY_SIZE) {
      return json({ error: 'Request body too large' }, 413, headers);
    }

    try {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      if (!(await checkRateLimit(ip, env))) {
        return json({ error: 'Rate limit exceeded. Try again later.' }, 429, headers);
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'Invalid JSON' }, 400, headers);
      }

      const { message, lang, history } = body;
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return json({ error: 'Message is required' }, 400, headers);
      }

      const truncated = message.slice(0, 500);
      const userPrefix = lang === 'en' ? '[User writes in English]' : '[User writes in Spanish]';

      const siteContent = await getSiteContent();
      const systemPrompt = buildSystemPrompt(siteContent);
      const safeHistory = sanitizeHistory(history);

      const messages = [
        { role: 'system', content: systemPrompt },
        ...safeHistory,
        { role: 'user', content: `${userPrefix}\n${truncated}` },
      ];

      // ---------- Loop de tool calling ----------
      let data = await callGroq(messages, env);
      if (!data) {
        return json({ error: 'AI service temporarily unavailable' }, 502, headers);
      }

      let rounds = 0;
      while (rounds < MAX_TOOL_ROUNDS) {
        const msg = data.choices?.[0]?.message;
        const toolCalls = msg?.tool_calls;
        if (!toolCalls || toolCalls.length === 0) break;

        messages.push(msg);
        for (const call of toolCalls) {
          let args = {};
          try {
            args = JSON.parse(call.function.arguments || '{}');
          } catch {
            args = {};
          }
          const result = await executeTool(call.function.name, args, env);
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: result,
          });
        }

        data = await callGroq(messages, env);
        if (!data) {
          return json({ error: 'AI service temporarily unavailable' }, 502, headers);
        }
        rounds++;
      }
      // -------------------------------------------

      console.log('Groq response:', JSON.stringify(data).slice(0, 500));
      let reply = data.choices?.[0]?.message?.content || 'No response generated.';
      reply = stripThink(reply);

      return json({ reply }, 200, headers);
    } catch (err) {
      console.log('Worker error:', err.message, err.stack);
      return json({ error: 'Internal error' }, 500, headers);
    }
  },
};