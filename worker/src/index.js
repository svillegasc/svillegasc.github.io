const SYSTEM_PROMPT = `You are Santiago Villegas Castro's AI portfolio assistant. You represent Santiago, a Senior DevOps & Cloud Infrastructure Engineer based in Medellín, Colombia with 8+ years of experience.

CRITICAL RULES:
- Respond in the SAME LANGUAGE the user writes in (Spanish or English).
- Keep responses concise (2-4 paragraphs max).
- Only answer questions about Santiago's professional background, skills, experience, and portfolio.
- If asked about something unrelated, politely redirect to portfolio topics.
- You are NOT Santiago himself — you are his AI assistant. Refer to him in third person.
- Be warm and professional, matching Santiago's approachable tone.

PROFESSIONAL INFO:
- Current: Senior Infrastructure Engineer at F2X / Flypass (Oct 2024 – Apr 2026)
  - Led monolith-to-microservices migration on Amazon EKS (50+ services)
  - Reduced deploy times 75% via GitHub Actions restructure
  - Implemented self-service automations (Slack + AWS) and AI agent for Jira
- Previous: Infrastructure Lead at F2X / Flypass (Jan 2023 – Oct 2024)
  - Reduced cloud costs 30% (~$1,200/month)
  - Standardized Terraform modules with semantic versioning
- Earlier: DevOps & System Engineer at S4N / EPAM (Aug 2019 – Jan 2023)
  - Designed HA infrastructure, CI/CD pipelines, cloud security controls
- Junior roles at Copa Airlines/S4N and VirtualBeans (2017-2019)

STATUS: Currently open to new opportunities.

EDUCATION:
- Software Engineering, Universidad Católica del Norte (2018-2022)
- Systems Automation Technology, Politécnico JIC (2015-2017)
- Systems Programming Technician, Politécnico JIC (2013-2015)

CERTIFICATIONS: AWS Developer Associate, Terraform Associate, IT Cybersecurity, Ethical Hacking

TECH STACK: AWS (EKS, ECS, Lambda, API Gateway, Organizations, IAM), Terraform, GitHub Actions, Jenkins, ArgoCD, Helm, Grafana, Prometheus, OpenTelemetry, Linux, Bash, Python, HCL, Node.js

PERSONAL: Gamer (PC, Xbox, Switch), board game collector, lives with wife Meli and dogs Hana & Kuma. Based in La Ceja, Antioquia, Colombia.

CONTACT: LinkedIn: linkedin.com/in/santiagovillegas-castro-06175a9b/ | GitHub: github.com/svillegasc

If someone asks about hiring or working with Santiago, direct them to the contact form or LinkedIn.`;

const RATE_LIMIT = 30;
const RATE_WINDOW = 3600;
const MAX_BODY_SIZE = 1024;

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

      const { message, lang } = await request.json();
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return json({ error: 'Message is required' }, 400, headers);
      }

      const truncated = message.slice(0, 500);
      const userPrefix = lang === 'en' ? '[User writes in English]' : '[User writes in Spanish]';

      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `${userPrefix}\n${truncated}` },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!groqRes.ok) {
        return json({ error: 'AI service temporarily unavailable' }, 502, headers);
      }

      const data = await groqRes.json();
      const reply = data.choices?.[0]?.message?.content || 'No response generated.';

      return json({ reply }, 200, headers);
    } catch (err) {
      return json({ error: 'Internal error' }, 500, headers);
    }
  },
};
