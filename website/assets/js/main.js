/* Bahar Al-Sharq — site interactions. No third-party requests; GSAP is self-hosted. */
(() => {
  'use strict';
  const doc = document.documentElement;
  doc.classList.remove('no-js'); doc.classList.add('js');
  const LANG = document.body.dataset.lang === 'en' ? 'en' : 'ar';
  doc.lang = LANG; doc.dir = LANG === 'en' ? 'ltr' : 'rtl';            // also covers embedded previews
  const RTL = LANG === 'ar';
  const T = {
    ar: { open: 'فتح القائمة', close: 'إغلاق القائمة', name: 'الرجاء كتابة الاسم', phone: 'الرجاء كتابة رقم صحيح', view: 'عرض', discover: 'اكتشف',
          msg: (n, p, s, m) => `مرحباً بحار الشرق 👋\nالاسم: ${n}\nالجوال: ${p}\nالخدمة: ${s}${m ? `\nالتفاصيل: ${m}` : ''}` },
    en: { open: 'Open menu', close: 'Close menu', name: 'Please enter your name', phone: 'Please enter a valid number', view: 'View', discover: 'Explore',
          msg: (n, p, s, m) => `Hello Bahar Al-Sharq 👋\nName: ${n}\nMobile: ${p}\nService: ${s}${m ? `\nDetails: ${m}` : ''}` }
  }[LANG];
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const WA = '967784007800';
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  $('#year') && ($('#year').textContent = new Date().getFullYear());

  /* ---------- seven rays helper (the logo's rays) ---------- */
  function rays(svg, cx, cy, r1, r2, spread, cls) {
    const ns = 'http://www.w3.org/2000/svg';
    for (let i = 0; i < 7; i++) {
      const a = (-90 - spread / 2 + i * spread / 6) * Math.PI / 180;
      const l = document.createElementNS(ns, 'line');
      l.setAttribute('x1', cx + r1 * Math.cos(a)); l.setAttribute('y1', cy + r1 * Math.sin(a));
      l.setAttribute('x2', cx + r2 * Math.cos(a)); l.setAttribute('y2', cy + r2 * Math.sin(a));
      l.setAttribute('class', cls); l.setAttribute('pathLength', '1');
      svg.appendChild(l);
    }
    return $$('line', svg);
  }
  const loaderRays = rays($('#loader-rays'), 100, 112, 58, 86, 150, 'ray');
  const heroRays = rays($('#hero-rays'), 200, 200, 150, 196, 150, 'ray');

  /* ---------- off-screen videos pause (battery + CPU) ---------- */
  const vio = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (v.closest('#reel')) return;
    if (e.isIntersecting) { const p = v.play(); p && p.catch(() => {}); } else v.pause();
  }), { rootMargin: '200px' });
  $$('video[autoplay]').forEach(v => { v.muted = true; vio.observe(v); });

  /* ---------- header, progress, back-to-top ---------- */
  const header = $('#header'), prog = $('#progress'), top = $('#to-top');
  let lastY = 0;
  const onScroll = () => {
    const y = scrollY, h = doc.scrollHeight - innerHeight;
    header.classList.toggle('scrolled', y > 40);
    header.classList.toggle('hide', y > 500 && y > lastY && !doc.classList.contains('menu-open'));
    prog.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    top.classList.toggle('show', y > 900);
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  top.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

  /* ---------- mobile menu ---------- */
  const burger = $('#burger');
  const setMenu = open => { doc.classList.toggle('menu-open', open); burger.setAttribute('aria-expanded', open); burger.setAttribute('aria-label', open ? T.close : T.open); document.body.style.overflow = open ? 'hidden' : ''; };
  burger.addEventListener('click', () => setMenu(!doc.classList.contains('menu-open')));
  $$('#mobile-menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') { setMenu(false); closeLB(); } });

  /* ---------- tabs ---------- */
  const tabs = $$('[role="tab"]');
  tabs.forEach(t => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { const i = tabs.indexOf(t); select(tabs[(i + 1) % tabs.length]); tabs[(i + 1) % tabs.length].focus(); } });
  });
  function select(t) { tabs.forEach(x => { const on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; $('#' + x.getAttribute('aria-controls')).hidden = !on; }); }

  /* ---------- gallery filter + lightbox ---------- */
  const items = $$('.g-item');
  $$('.filter').forEach(b => b.addEventListener('click', () => {
    $$('.filter').forEach(x => x.setAttribute('aria-pressed', x === b));
    const f = b.dataset.filter;
    items.forEach(it => it.classList.toggle('hidden', f !== 'all' && it.dataset.cat !== f));
    hasGSAP && ScrollTrigger.refresh();
  }));
  const lb = $('#lightbox'), lbImg = $('#lb-img'), lbCap = $('#lb-cap');
  let cur = 0, lastFocus = null;
  const visible = () => items.filter(i => !i.classList.contains('hidden'));
  function openLB(it) { const v = visible(); cur = v.indexOf(it); lastFocus = it; show(); lb.hidden = false; $('#lb-close').focus(); document.body.style.overflow = 'hidden'; }
  function show() { const it = visible()[cur]; lbImg.src = it.dataset.full; lbImg.alt = it.querySelector('img').alt; lbCap.textContent = it.querySelector('figcaption').textContent; }
  function closeLB() { if (lb.hidden) return; lb.hidden = true; document.body.style.overflow = ''; lastFocus && lastFocus.focus(); }
  items.forEach(it => { it.addEventListener('click', () => openLB(it)); it.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLB(it); } }); });
  $('#lb-close').addEventListener('click', closeLB);
  $('#lb-next').addEventListener('click', () => { cur = (cur + 1) % visible().length; show(); });
  $('#lb-prev').addEventListener('click', () => { cur = (cur - 1 + visible().length) % visible().length; show(); });
  lb.addEventListener('click', e => { if (e.target === lb) closeLB(); });

  /* ---------- showreel ---------- */
  const reel = $('#reel'), rv = $('#reel video');
  $('#reel-play').addEventListener('click', () => { rv.muted = false; rv.controls = true; rv.play(); reel.classList.add('playing'); });
  rv.addEventListener('ended', () => reel.classList.remove('playing'));

  /* ---------- lead form → WhatsApp (nothing stored on any server) ---------- */
  const form = $('#lead-form');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const clean = v => v.replace(/[<>]/g, '').trim();
    const name = clean(form.name.value), phone = clean(form.phone.value), svc = clean(form.service.value), msg = clean(form.message.value);
    let ok = true;
    const err = (el, t) => { el.closest('.field').querySelector('.err').textContent = t; if (t) ok = false; };
    err(form.name, name.length < 2 ? T.name : '');
    err(form.phone, /^[+0-9\s-]{7,20}$/.test(phone) ? '' : T.phone);
    if (!ok) return;
    const text = T.msg(name, phone, svc, msg);
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  });

  /* ---------- profile book tilt ---------- */
  const book = $('#book');
  if (fine && !reduce) {
    const cover = $('.cover', book);
    book.addEventListener('pointermove', e => { const r = book.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; cover.style.transform = `rotateY(${(RTL ? -18 : 18) + x * 24}deg) rotateX(${6 - y * 16}deg)`; });
    book.addEventListener('pointerleave', () => { cover.style.transform = ''; });
  }

  /* ---------- custom cursor + magnetic buttons ---------- */
  if (fine && !reduce) {
    doc.classList.add('has-cursor');
    const c = $('#cursor'), d = $('#cursor-dot');
    let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
    addEventListener('pointermove', e => { doc.classList.add('cursor-live'); mx = e.clientX; my = e.clientY; d.style.transform = `translate(${mx}px,${my}px)`; }, { passive: true });
    (function loop() { cx += (mx - cx) * .18; cy += (my - cy) * .18; c.style.transform = `translate(${cx}px,${cy}px)`; requestAnimationFrame(loop); })();
    $$('a,button,.g-item').forEach(el => {
      el.addEventListener('pointerenter', () => { c.classList.toggle('big', el.classList.contains('g-item') || el.classList.contains('svc')); c.textContent = el.classList.contains('g-item') ? T.view : el.classList.contains('svc') ? T.discover : ''; c.style.opacity = el.classList.contains('g-item') || el.classList.contains('svc') ? 1 : .6; });
      el.addEventListener('pointerleave', () => { c.classList.remove('big'); c.textContent = ''; c.style.opacity = 1; });
    });
    $$('.magnetic').forEach(b => {
      b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px,${(e.clientY - r.top - r.height / 2) * .3}px)`; });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

  /* ---------- manifesto words ---------- */
  const man = $('#manifesto');
  man.innerHTML = man.textContent.trim().split(/\s+/).map(w => w.startsWith('*') ? `<span class="mw hl">${w.replace(/\*/g, '')}</span>` : `<span class="mw">${w}</span>`).join(' ');
  const mws = $$('.mw', man);

  /* =================================================================== GSAP */
  if (!hasGSAP || reduce) {
    doc.classList.add('loaded'); mws.forEach(w => w.classList.add('on'));
    $$('[data-count]').forEach(el => el.textContent = el.dataset.count);
    doc.classList.remove('js');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  gsap.set(loaderRays, { strokeDasharray: 1, strokeDashoffset: 1 });
  gsap.set(heroRays, { strokeDasharray: 1, strokeDashoffset: 1 });

  /* ---------- preloader ---------- */
  const pct = { v: 0 }, pctEl = $('#pct');
  const tlL = gsap.timeline();
  tlL.to(loaderRays, { strokeDashoffset: 0, duration: .5, stagger: .07, ease: 'power2.out' })
     .to(pct, { v: 100, duration: 1.4, ease: 'power1.inOut', onUpdate: () => pctEl.textContent = Math.round(pct.v) }, 0);
  const ready = new Promise(r => { if (document.readyState === 'complete') r(); else addEventListener('load', r); });
  Promise.race([Promise.all([ready, new Promise(r => setTimeout(r, 1500))]), new Promise(r => setTimeout(r, 3500))]).then(() => {
    gsap.to('#loader', { yPercent: -100, duration: .9, ease: 'power4.inOut', onComplete: () => { doc.classList.add('loaded'); ScrollTrigger.refresh(); } });
    document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
    heroIntro();
  });

  /* ---------- hero ---------- */
  function heroIntro() {
    const lines = $$('#hero-title .line');
    const tl = gsap.timeline({ delay: .35 });
    tl.from(lines, { yPercent: 110, duration: 1.1, stagger: .12, ease: 'power4.out' })
      .from('.hero-in', { y: 30, opacity: 0, duration: .8, stagger: .1, ease: 'power3.out' }, '-=.7')
      .from('.hero-sun .disc', { scale: 0, duration: 1.2, ease: 'back.out(1.4)' }, 0)
      .to(heroRays, { strokeDashoffset: 0, duration: .6, stagger: .06, ease: 'power2.out' }, .4)
      .from('.hero-waves', { yPercent: 60, duration: 1.2, ease: 'power3.out' }, .2);
    gsap.to('#hero-rays', { rotation: 8, transformOrigin: '50% 50%', duration: 6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  }
  gsap.to('.hero-media', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero-inner', { yPercent: -12, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  if (fine) {
    const sun = $('.hero-sun');
    addEventListener('pointermove', e => { const k = +sun.dataset.mouse; gsap.to(sun, { x: (e.clientX / innerWidth - .5) * k * 2, y: (e.clientY / innerHeight - .5) * k * 2, duration: 1.2, ease: 'power3.out' }); }, { passive: true });
  }

  /* ---------- reveals ---------- */
  // reveals use IntersectionObserver so anchor jumps and fast scrolls never leave content hidden
  let queue = [], qt = 0;
  const flush = () => { gsap.to(queue, { opacity: 1, y: 0, duration: .9, stagger: .08, ease: 'power3.out' }); queue = []; };
  const rio = new IntersectionObserver(es => es.forEach(e => {
    const el = e.target;
    if (!e.isIntersecting && e.boundingClientRect.top > 0) return;       // still below the fold
    rio.unobserve(el);
    if (el.hasAttribute('data-clip')) gsap.to(el, { clipPath: 'inset(0 0 0% 0)', duration: 1.3, ease: 'power4.inOut' });
    else { queue.push(el); clearTimeout(qt); qt = setTimeout(flush, 30); }
  }), { rootMargin: '0px 0px -10% 0px' });
  $$('[data-reveal],[data-clip]').forEach(el => rio.observe(el));
  $$('[data-speed]').forEach(el => gsap.fromTo(el, { yPercent: -+el.dataset.speed * 50 }, { yPercent: +el.dataset.speed * 50, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));

  /* ---------- counters ---------- */
  $$('[data-count]').forEach(el => { const o = { v: 0 }; gsap.to(o, { v: +el.dataset.count, duration: 1.8, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true }, onUpdate: () => el.textContent = Math.round(o.v) }); });

  /* ---------- manifesto scrub ---------- */
  ScrollTrigger.create({ trigger: man, start: 'top 80%', end: 'bottom 40%', scrub: true, onUpdate: s => { const n = Math.round(s.progress * mws.length); mws.forEach((w, i) => w.classList.toggle('on', i < n)); } });

  /* ---------- services: pinned horizontal scroll (desktop) ---------- */
  ScrollTrigger.matchMedia({
    '(min-width:1024px)': () => {
      const track = $('#svc-track');
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      const tw = gsap.to(track, { x: () => (RTL ? 1 : -1) * dist(), ease: 'none', scrollTrigger: { trigger: '#services', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .6, invalidateOnRefresh: true, anticipatePin: 1 } });
      return () => tw.kill();
    },
    '(max-width:1023px)': () => {
      gsap.utils.toArray('.svc').forEach(s => gsap.from(s, { y: 60, opacity: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: s, start: 'top 90%', once: true } }));
    }
  });

  /* ---------- blueprint drawn on scroll ---------- */
  (function () {
    const g = $('#bp-lines'), ns = 'http://www.w3.org/2000/svg';
    const add = (tag, attrs) => { const e = document.createElementNS(ns, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); e.setAttribute('class', 'ln'); e.setAttribute('pathLength', '1'); g.appendChild(e); };
    add('rect', { x: 260, y: 70, width: 300, height: 300, rx: 4 });
    for (let i = 1; i < 3; i++) add('line', { x1: 260 + i * 100, y1: 70, x2: 260 + i * 100, y2: 370 });
    for (let j = 1; j < 6; j++) add('line', { x1: 260, y1: 70 + j * 50, x2: 560, y2: 70 + j * 50 });
    add('rect', { x: 575, y: 70, width: 16, height: 300 });
    add('rect', { x: 110, y: 60, width: 90, height: 350, rx: 3 });
    add('line', { x1: 155, y1: 60, x2: 155, y2: 410 });
    for (let j = 1; j < 12; j++) add('line', { x1: 110, y1: 60 + j * 350 / 12, x2: 200, y2: 60 + j * 350 / 12 });
    add('path', { d: 'M96 430H214M110 410v20M200 410v20' });
    add('circle', { cx: 116, cy: 440, r: 8 }); add('circle', { cx: 194, cy: 440, r: 8 });
    const lines = $$('.ln', g);
    gsap.set(lines, { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.to(lines, { strokeDashoffset: 0, stagger: .03, ease: 'none', scrollTrigger: { trigger: '#bp', start: 'top 80%', end: 'center 45%', scrub: .8 } });
    gsap.from('#bp .dim, #bp text', { opacity: 0, duration: .8, stagger: .05, scrollTrigger: { trigger: '#bp', start: 'center 60%', once: true } });
  })();

  /* ---------- process rail ---------- */
  const steps = $$('.step');
  gsap.to('#rail', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '#steps', start: 'top 70%', end: 'bottom 55%', scrub: true, onUpdate: s => steps.forEach((st, i) => st.classList.toggle('on', s.progress >= i / (steps.length - 1) - .02)) } });

  /* ---------- marquee speed follows scroll velocity ---------- */
  ScrollTrigger.create({ onUpdate: s => { const v = Math.min(Math.abs(s.getVelocity()) / 1500, 3); $$('.marquee .track').forEach(t => t.style.animationDuration = (38 / (1 + v)) + 's'); } });

  /* ---------- active nav link ---------- */
  $$('.nav a').forEach(a => { const sec = $(a.getAttribute('href')); sec && ScrollTrigger.create({ trigger: sec, start: 'top 50%', end: 'bottom 50%', onToggle: s => a.classList.toggle('active', s.isActive) }); });

  /* ---------- smooth anchor scroll ---------- */
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => { const t = $(a.getAttribute('href')); if (!t) return; e.preventDefault(); scrollTo({ top: t.getBoundingClientRect().top + scrollY - 20, behavior: 'smooth' }); history.replaceState(null, '', a.getAttribute('href')); }));
})();
