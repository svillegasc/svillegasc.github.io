if (history.scrollRestoration) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

function setLang(lang) {
  document.body.setAttribute('data-lang', lang);
  document.documentElement.setAttribute('lang', lang);
  localStorage.setItem('lang', lang);
  const btnEs = document.getElementById('btn-es');
  const btnEn = document.getElementById('btn-en');
  if (btnEs) {
    btnEs.classList.toggle('active', lang === 'es');
    btnEs.setAttribute('aria-pressed', lang === 'es' ? 'true' : 'false');
  }
  if (btnEn) {
    btnEn.classList.toggle('active', lang === 'en');
    btnEn.setAttribute('aria-pressed', lang === 'en' ? 'true' : 'false');
  }
}

const btnEs = document.getElementById('btn-es');
const btnEn = document.getElementById('btn-en');
if (btnEs) btnEs.addEventListener('click', function () { setLang('es'); });
if (btnEn) btnEn.addEventListener('click', function () { setLang('en'); });

const header = document.getElementById('site-header');
if (header) {
  window.addEventListener('scroll', function () {
    header.classList.toggle('scrolled', window.scrollY > 12);
  });
}

function toggleMobileNav(open) {
  const nav = document.getElementById('mobile-nav');
  if (!nav) return;
  nav.classList.toggle('open', open);
  if (open) {
    const closeBtn = document.getElementById('menu-close-btn');
    if (closeBtn) closeBtn.focus();
  }
}

const menuOpenBtn = document.getElementById('menu-open-btn');
const menuCloseBtn = document.getElementById('menu-close-btn');
if (menuOpenBtn) menuOpenBtn.addEventListener('click', function () { toggleMobileNav(true); });
if (menuCloseBtn) menuCloseBtn.addEventListener('click', function () { toggleMobileNav(false); });
document.querySelectorAll('.mobile-nav a').forEach(function (el) {
  el.addEventListener('click', function () { toggleMobileNav(false); });
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') toggleMobileNav(false);
});

const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver(function (entries) {
  entries.forEach(function (e) {
    if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); }
  });
}, { threshold: 0.15 });
revealEls.forEach(function (el) { io.observe(el); });

const form = document.getElementById('contact-form');
const statusEl = document.getElementById('form-status');
const submitBtn = document.getElementById('cf-submit');

if (form) {
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const lang = document.body.getAttribute('data-lang');
    if (submitBtn) submitBtn.disabled = true;
    if (statusEl) {
      statusEl.textContent = lang === 'es' ? 'Enviando…' : 'Sending…';
      statusEl.className = 'form-status form-status-pending';
    }

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const result = await response.json();
      if (result.success) {
        if (statusEl) {
          statusEl.textContent = lang === 'es' ? '¡Mensaje enviado! Te responderé pronto.' : "Message sent! I'll get back to you soon.";
          statusEl.className = 'form-status form-status-ok';
        }
        form.reset();
      } else {
        throw new Error(result.message || 'submission failed');
      }
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = lang === 'es'
          ? 'No se pudo enviar. Intenta de nuevo o escríbeme por LinkedIn.'
          : "Couldn't send it. Please try again or reach out on LinkedIn.";
        statusEl.className = 'form-status form-status-error';
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

const saved = localStorage.getItem('lang');
const browserLang = navigator.language.startsWith('en') ? 'en' : 'es';
setLang(saved || browserLang);

const scrollTopBtn = document.getElementById('scroll-top-btn');
if (scrollTopBtn) {
  window.addEventListener('scroll', function () {
    scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
  });
  scrollTopBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
