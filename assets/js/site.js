/* Bárbara Martini — interações mínimas */
(() => {
  // pré-visualização de variantes: index.html?v=b
  const v = new URLSearchParams(location.search).get('v');
  if (v && ['a', 'b', 'c'].includes(v)) document.documentElement.dataset.v = v;
  document.documentElement.dataset.v = document.documentElement.dataset.v || 'a';

  // mantém o tema escolhido ao navegar entre páginas
  const tema = document.documentElement.getAttribute('data-theme');
  if (tema) {
    document.querySelectorAll('a[href$=".html"]').forEach((a) => {
      const href = a.getAttribute('href');
      if (!href || /^https?:/.test(href)) return;
      a.setAttribute('href', href + (href.includes('?') ? '&' : '?') + 'tema=' + tema);
    });
  }

  // comparação de fotos do hero: ?h=1|2|3 (mesmo padrão visual)
  const hq = new URLSearchParams(location.search).get('h');
  if (hq && ['1', '2', '3'].includes(hq)) {
    const im = document.querySelector('.hero-media img');
    if (im) im.src = 'assets/img/hero-' + hq + '.jpg';
  }

  // menu mobile
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  if (toggle && nav) {
    nav.id = nav.id || 'nav';
    const setOpen = (open) => {
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    };
    toggle.addEventListener('click', () => setOpen(!document.body.classList.contains('nav-open')));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  }

  // revelação das seções
  const targets = document.querySelectorAll('.hero, .section');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('seen');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    targets.forEach((el) => io.observe(el));
  } else {
    targets.forEach((el) => el.classList.add('seen'));
  }

  // o hero entra assim que a página assenta
  requestAnimationFrame(() => {
    requestAnimationFrame(() => document.querySelector('.hero')?.classList.add('seen'));
  });
})();
