  document.getElementById('year').textContent = new Date().getFullYear();

  function setLang(lang){
    document.body.setAttribute('data-lang', lang);
    document.documentElement.setAttribute('lang', lang);
    document.getElementById('btn-es').classList.toggle('active', lang === 'es');
    document.getElementById('btn-en').classList.toggle('active', lang === 'en');
  }

  // header scroll state
  var header = document.getElementById('site-header');
  window.addEventListener('scroll', function(){
    header.classList.toggle('scrolled', window.scrollY > 12);
  });

  // mobile nav
  function toggleMobileNav(open){
    document.getElementById('mobile-nav').classList.toggle('open', open);
  }

  // scroll reveal
  var revealEls = document.querySelectorAll('.reveal');
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('in-view'); io.unobserve(e.target); }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(function(el){ io.observe(el); });

  // contact form -> Web3Forms (email never appears in client-side code)
  var form = document.getElementById('contact-form');
  var statusEl = document.getElementById('form-status');
  var submitBtn = document.getElementById('cf-submit');

  form.addEventListener('submit', async function(e){
    e.preventDefault();
    var lang = document.body.getAttribute('data-lang');
    submitBtn.disabled = true;
    statusEl.textContent = lang === 'es' ? 'Enviando…' : 'Sending…';
    statusEl.className = 'form-status form-status-pending';

    try{
      var response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      });
      var result = await response.json();
      if(result.success){
        statusEl.textContent = lang === 'es' ? '¡Mensaje enviado! Te responderé pronto.' : "Message sent! I'll get back to you soon.";
        statusEl.className = 'form-status form-status-ok';
        form.reset();
      } else {
        throw new Error(result.message || 'submission failed');
      }
    } catch(err){
      statusEl.textContent = lang === 'es'
        ? 'No se pudo enviar. Intenta de nuevo o escríbeme por LinkedIn.'
        : "Couldn't send it. Please try again or reach out on LinkedIn.";
      statusEl.className = 'form-status form-status-error';
    } finally {
      submitBtn.disabled = false;
    }
  });

  // set initial CV link on load
  setLang('es');
