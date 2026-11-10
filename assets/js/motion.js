/* ============================================================
   motion.js — revelações, progresso e deriva (v2)
   Sem dependências. ~2 KB. Tudo respeita prefers-reduced-motion.
   ============================================================ */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var docEl = document.documentElement;

  /* ---------- 1. quebra a headline em linhas mascaradas ---------- */
  function splitLines() {
    var boxes = document.querySelectorAll('[data-lines]');
    for (var i = 0; i < boxes.length; i++) {
      var spans = boxes[i].children;
      for (var j = 0; j < spans.length; j++) {
        var s = spans[j];
        if (s.querySelector('.ln-i')) continue;
        var inner = document.createElement('span');
        inner.className = 'ln-i';
        while (s.firstChild) inner.appendChild(s.firstChild);
        s.appendChild(inner);
        inner.style.setProperty('--d', j);
      }
    }
  }

  /* ---------- 2. revelação por scroll ---------- */
  var targets = [];

  function collect() {
    targets = [].slice.call(document.querySelectorAll('[data-reveal],[data-lines],[data-arch],[data-line]'));
    // stagger automático dentro de grades
    var grids = document.querySelectorAll('[data-stagger]');
    for (var g = 0; g < grids.length; g++) {
      var kids = grids[g].querySelectorAll('[data-reveal]');
      for (var k = 0; k < kids.length; k++) kids[k].style.setProperty('--d', Math.min(k, 6));
    }
  }

  function show(el) {
    el.classList.add('is-in');
  }

  function initObserver() {
    if (reduce || !('IntersectionObserver' in window)) {
      targets.forEach(show);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        show(e.target);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.01 });

    targets.forEach(function (t) {
      // o que já está na primeira dobra entra na hora, com um respiro
      var r = t.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92) {
        setTimeout(show.bind(null, t), 80);
      } else {
        io.observe(t);
      }
    });
  }

  /* ---------- 3. barra de progresso ---------- */
  function progress() {
    var bar = document.createElement('div');
    bar.className = 'progress';
    document.body.appendChild(bar);
    var raf = false;

    function update() {
      var h = docEl.scrollHeight - window.innerHeight;
      var p = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      raf = false;
    }
    window.addEventListener('scroll', function () {
      if (!raf) { raf = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- 4. deriva da marca d'água ---------- */
  function drift() {
    var mark = document.querySelector('.hero-mark');
    if (!mark || reduce) return;
    var raf = false;
    function update() {
      var y = Math.min(window.scrollY, window.innerHeight) * 0.07;
      mark.style.transform = 'translateY(calc(-50% + ' + y.toFixed(1) + 'px))';
      raf = false;
    }
    window.addEventListener('scroll', function () {
      if (!raf) { raf = true; requestAnimationFrame(update); }
    }, { passive: true });
  }

  /* ---------- 5. imagem do consultório: parallax curto ---------- */
  function parallax() {
    var imgs = [].slice.call(document.querySelectorAll('[data-parallax] img'));
    if (!imgs.length || reduce) return;
    var raf = false;
    function update() {
      for (var i = 0; i < imgs.length; i++) {
        var el = imgs[i];
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > window.innerHeight + 200) continue;
        var p = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
        el.style.transform = 'translateY(' + (p * 18).toFixed(1) + 'px) scale(1.04)';
      }
      raf = false;
    }
    window.addEventListener('scroll', function () {
      if (!raf) { raf = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  function boot() {
    splitLines();
    collect();
    initObserver();
    progress();
    drift();
    parallax();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
