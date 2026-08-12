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

  // contact form -> mailto
  document.getElementById('contact-form').addEventListener('submit', function(e){
    e.preventDefault();
    var name = document.getElementById('cf-name').value;
    var email = document.getElementById('cf-email').value;
    var message = document.getElementById('cf-message').value;
    var subject = encodeURIComponent('Contacto desde portafolio — ' + name);
    var body = encodeURIComponent(message + '\n\n— ' + name + ' (' + email + ')');
    window.location.href = 'mailto:santivicastro18@gmail.com?subject=' + subject + '&body=' + body;
  });

  // set initial CV link on load
  setLang('es');
