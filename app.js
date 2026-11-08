/* app.js — поведение лендинга. Подключается через <script src="app.js"> (CSP: script-src 'self'). */
(function () {
  'use strict';

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- защита от встраивания в чужой iframe (clickjacking) ----------
     Примечание: заголовок frame-ancestors в <meta> не работает, его нужно отдавать HTTP-заголовком сервера. */
  if (window.top !== window.self) {
    document.documentElement.style.display = 'none';
    try { window.top.location = window.location.href; } catch (e) { /* чужой origin — страница остаётся скрытой */ }
    return;
  }

  /* ---------- первый экран: анимация фото стартует после декодирования картинки ---------- */
  (function () {
    const fr = document.querySelector('.photo-frame');
    const img = fr && fr.querySelector('img');
    if (!img) return;
    let started = false, rafId = 0;
    const go = () => {
      if (started) return;
      started = true;
      rafId = requestAnimationFrame(() => fr.classList.add('go'));
    };
    (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(go);
    const timer = setTimeout(go, 1200);     // страховка
    img.addEventListener('animationend', () => fr.classList.add('done'), { once: true });
  })();

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

  /* ---------- ветер: хаотичные скруглённые полоски пролетают по фону при загрузке ---------- */
  (function () {
    const cv = document.getElementById('wind');
    if (!cv) return;
    if (reduceMotion) { cv.remove(); return; }
    const ctx = cv.getContext('2d');
    if (!ctx) { cv.remove(); return; }
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const W = innerWidth, H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.scale(dpr, dpr);
    const rnd = (a, b) => a + Math.random() * (b - a);
    const streaks = Array.from({ length: 38 }, () => ({
      y: rnd(-.04, 1.04) * H, len: rnd(180, 560), w: rnd(2.5, 10), delay: rnd(.15, 2.0), dur: rnd(1.7, 3.0),
      amp: rnd(8, 52), fr: rnd(.003, .011), ph: rnd(0, 6.28), tilt: rnd(-.24, .16), a: rnd(.12, .34),
      c: Math.random() < .7 ? '216,20,31' : '244,98,108'
    }));
    const t0 = performance.now();
    let rafId = 0;
    function frame(now) {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      let alive = false;
      for (const s of streaks) {
        const p = (t - s.delay) / s.dur;
        if (p >= 1) continue;
        alive = true;
        if (p <= 0) continue;
        const e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;   // плавный разгон и торможение
        const hx = -s.len * .3 + e * (W + s.len * 1.6), tx = hx - s.len;
        const env = Math.pow(Math.sin(Math.PI * p), .55);
        const yAt = x => s.y + x * s.tilt + Math.sin(x * s.fr + s.ph + p * 3) * s.amp;
        const g = ctx.createLinearGradient(tx, yAt(tx), hx, yAt(hx));
        g.addColorStop(0, 'rgba(' + s.c + ',0)');
        g.addColorStop(.7, 'rgba(' + s.c + ',' + (s.a * env * .8) + ')');
        g.addColorStop(1, 'rgba(' + s.c + ',' + (s.a * env) + ')');
        ctx.strokeStyle = g; ctx.lineWidth = s.w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let x = tx; x <= hx; x += 14) { const y = yAt(x); x === tx ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.lineTo(hx, yAt(hx));
        ctx.stroke();
      }
      if (alive) rafId = requestAnimationFrame(frame); else cv.remove();   // по окончании холст удаляется
    }
    rafId = requestAnimationFrame(frame);
  })();
})();
