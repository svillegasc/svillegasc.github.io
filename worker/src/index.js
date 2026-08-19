const RATE_LIMIT = 30;
const RATE_WINDOW = 3600;
const MAX_BODY_SIZE = 1024;
const SITE_URL = 'https://svillegasc.github.io';
const CACHE_TTL = 3600;

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

function buildSystemPrompt(siteContent) {
  return `Eres el asistente técnico de Santiago Villegas Castro. Solo puedes responder basándote estrictamente en el siguiente texto extraído de su portafolio web. Si te preguntan algo fuera de este contexto, responde exactamente: "No tengo esa información". Sé conciso y no uses frases de relleno.

REGLAS INQUEBRANTABLES:
- Responde en el MISMO IDIOMA en el que escribe el usuario (español o inglés).
- Máximo 3 oraciones por respuesta.
- Solo puedes usar información que esté en el texto del portafolio.
- Si la pregunta no tiene respuesta en el texto, di "No tengo esa información".
- No inventes datos, no deduzcas, no supongas.
- Refiérete a Santiago en tercera persona.
- Si preguntan por contratación, dirige al formulario de contacto o LinkedIn.

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

      const { message, lang } = body;
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return json({ error: 'Message is required' }, 400, headers);
      }

      const truncated = message.slice(0, 500);
      const userPrefix = lang === 'en' ? '[User writes in English]' : '[User writes in Spanish]';

      const siteContent = await getSiteContent();
      const systemPrompt = buildSystemPrompt(siteContent);

      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `${userPrefix}\n${truncated}` },
          ],
          temperature: 0.3,
          max_tokens: 300,
        }),
      });

      if (!groqRes.ok) {
        const errBody = await groqRes.text();
        console.log('Groq error:', groqRes.status, errBody);
        return json({ error: 'AI service temporarily unavailable' }, 502, headers);
      }

      const data = await groqRes.json();
      console.log('Groq response:', JSON.stringify(data).slice(0, 500));
      let reply = data.choices?.[0]?.message?.content || 'No response generated.';
      const thinkStart = reply.indexOf('<think>');
      if (thinkStart !== -1) {
        const thinkEnd = reply.indexOf('</think>', thinkStart);
        reply = thinkEnd !== -1
          ? reply.slice(0, thinkStart) + reply.slice(thinkEnd + 9)
          : reply.slice(0, thinkStart);
      }
      reply = reply.trim();

      return json({ reply }, 200, headers);
    } catch (err) {
      console.log('Worker error:', err.message, err.stack);
      return json({ error: 'Internal error' }, 500, headers);
    }
  },
};
