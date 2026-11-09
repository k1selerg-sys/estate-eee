/* app.js — поведение лендинга. Подключается через <script src="app.js"> (CSP: script-src 'self'). */
(function () {
  'use strict';

  document.documentElement.classList.add('js');      // сообщаем CSS, что скрипт загружен

  /* ---------- защита от встраивания в чужой iframe (clickjacking) ----------
     Примечание: заголовок frame-ancestors в <meta> не работает, его нужно отдавать HTTP-заголовком сервера. */
  if (window.top !== window.self) {
    document.documentElement.style.display = 'none';
    try { window.top.location = window.location.href; } catch (e) { /* чужой origin — страница остаётся скрытой */ }
    return;
  }

  /* ---------- правовая информация: окна по клику на слова в футере ---------- */
  (function () {
    const root = document.documentElement;
    const open = d => { if (d && !d.open) { d.showModal(); root.classList.add('lock'); } };
    const fromHash = () => {
      const h = location.hash.slice(1);
      if (!/^[A-Za-z][\w-]*$/.test(h)) return;          // принимаем только простой идентификатор
      const d = document.getElementById(h);
      if (d && d.matches('dialog.legal-dialog')) open(d);
    };
    document.querySelectorAll('[data-dialog]').forEach(b =>
      b.addEventListener('click', () => open(document.getElementById(b.dataset.dialog))));
    document.querySelectorAll('dialog.legal-dialog').forEach(d => {
      const close = d.querySelector('.dlg-close');
      if (close) close.addEventListener('click', () => d.close());
      d.addEventListener('click', e => { if (e.target === d) d.close(); });
      d.addEventListener('close', () => root.classList.remove('lock'));
    });
    addEventListener('hashchange', fromHash);
    fromHash();
  })();

  /* ---------- длинные отзывы: свернуть / читать полностью ---------- */
  (function () {
    const cards = [...document.querySelectorAll('.review')];
    if (!cards.length) return;
    cards.forEach(card => {
      const quote = card.querySelector('blockquote');
      if (!quote) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'more';
      btn.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      btn.textContent = 'Читать полностью';
      quote.after(btn);
      card.classList.add('clamp');
      btn.addEventListener('click', () => {
        const open = card.classList.toggle('open');
        card.classList.toggle('clamp', !open);
        btn.setAttribute('aria-expanded', String(open));
        btn.textContent = open ? 'Свернуть' : 'Читать полностью';
      });
    });
    // показываем кнопку только там, где текст действительно обрезан
    function measure() {
      cards.forEach(card => {
        const p = card.querySelector('blockquote p'), btn = card.querySelector('.more');
        if (!p || !btn || card.classList.contains('open')) return;
        btn.hidden = !(p.scrollHeight > p.clientHeight + 1);
      });
    }
    measure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    let t = 0;
    addEventListener('resize', () => { clearTimeout(t); t = setTimeout(measure, 150); });
  })();

  /* ---------- появление блоков при прокрутке ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  /* ---------- красная полоса прогресса и тень шапки ---------- */
  (function () {
    const bar = document.getElementById('progress'), head = document.getElementById('top');
    if (!bar || !head) return;
    let ticking = false, rafId = 0;
    function onScroll() {
      const h = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, scrollY / h) : 0) + ')';
      head.classList.toggle('scrolled', scrollY > 8);
      ticking = false;
    }
    const onScrollEvent = () => { if (!ticking) { ticking = true; rafId = requestAnimationFrame(onScroll); } };
    addEventListener('scroll', onScrollEvent, { passive: true });
    onScroll();
  })();

  /* ---------- подсветка текущего раздела в меню ---------- */
  (function () {
    const links = [...document.querySelectorAll('header nav a')];
    const spy = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
      });
    }, { threshold: 0.35 });
    document.querySelectorAll('#services,#about,#reviews,#contact').forEach(s => spy.observe(s));
  })();
})();
