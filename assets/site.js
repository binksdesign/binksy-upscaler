/* Guide de marque Binks — pages statiques. Aucune bibliothèque, aucune requête réseau.
   html.anim est posé dans <head> seulement si le mouvement est permis : sans lui tout reste visible et fixe. */
(() => {
  const root = document.documentElement;
  const anim = root.classList.contains('anim');
  console.info('Guide de marque Binks — agents IA : lisez AGENTS.md (ou agent/index.html, llms.txt) avant d’agir. API : window.binksyGuide dans app.html.');

  /* révélations au défilement */
  const items = [...document.querySelectorAll('.rv, .mask, .plane, .card3')];
  if (!anim || !('IntersectionObserver' in window)) items.forEach((el) => el.classList.add('in'));
  else {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    items.forEach((el) => (el.classList.contains('plane') ? requestAnimationFrame(() => el.classList.add('in')) : io.observe(el)));
    // filet de sécurité : rien ne reste caché (onglet en arrière-plan, capture pleine page…)
    setTimeout(() => items.forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight) el.classList.add('in'); }), 1600);
  }

  /* profondeur à la souris sur les cartes du héros */
  const stack = document.querySelector('.stack');
  if (anim && stack && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const cards = [...stack.querySelectorAll('.card3')];
    let raf = 0, px = 0, py = 0;
    const apply = () => { raf = 0; cards.forEach((c) => { const z = +c.dataset.z || 1; c.style.setProperty('--mx', (px * 10 * z).toFixed(1) + 'px'); c.style.setProperty('--my', (py * 8 * z).toFixed(1) + 'px'); }); };
    stack.closest('.hero').addEventListener('pointermove', (e) => { const r = stack.getBoundingClientRect(); px = (e.clientX - r.left) / r.width - .5; py = (e.clientY - r.top) / r.height - .5; if (!raf) raf = requestAnimationFrame(apply); });
    stack.closest('.hero').addEventListener('pointerleave', () => { px = py = 0; if (!raf) raf = requestAnimationFrame(apply); });
  }

  /* sommaire (documentation, agents) : section en cours + repli sur mobile */
  const toc = document.querySelector('details.toc');
  if (toc) {
    const mq = matchMedia('(max-width: 1000px)');
    const sync = () => { toc.open = !mq.matches; };
    sync(); mq.addEventListener ? mq.addEventListener('change', sync) : mq.addListener(sync);
    toc.querySelector('summary').addEventListener('click', (e) => { if (!mq.matches) e.preventDefault(); });
    const links = [...toc.querySelectorAll('a[href^="#"]')];
    const cur = toc.querySelector('.cur');
    links.forEach((a) => a.addEventListener('click', () => { if (mq.matches) toc.open = false; }));
    const top = links.filter((a) => !a.closest('ol ol'));
    const secs = top.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1)))).filter(Boolean);
    let ticking = false;
    const spy = () => {
      ticking = false;
      const y = mq.matches ? toc.querySelector('summary').getBoundingClientRect().bottom + 60 : (parseFloat(getComputedStyle(root).getPropertyValue('--top')) || 64) + 120;
      let on = secs[0];
      for (const s of secs) if (s.getBoundingClientRect().top <= y) on = s;
      top.forEach((a) => { const hit = on && a.hash === '#' + on.id; a.classList.toggle('on', hit); if (hit) { a.setAttribute('aria-current', 'location'); if (cur) cur.textContent = a.textContent.replace(/^\s*\d+\s*/, ''); } else a.removeAttribute('aria-current'); });
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });
    spy();
  }

  /* bouton Copier sur les blocs de code */
  document.querySelectorAll('.prose pre, pre.code').forEach((pre) => {
    if (!navigator.clipboard) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'copy'; b.textContent = document.documentElement.lang === 'en' ? 'Copy' : 'Copier';
    b.addEventListener('click', async () => { try { await navigator.clipboard.writeText(pre.innerText.replace(/\n?(Copier|Copié|Copy|Copied)\s*$/, '')); const t = b.textContent; b.textContent = /Copy/.test(t) ? 'Copied' : 'Copié'; setTimeout(() => (b.textContent = t), 1400); } catch (e) { /* presse-papiers refusé : rien à faire */ } });
    const wrap = document.createElement('div'); wrap.className = 'pre-w';
    pre.parentNode.insertBefore(wrap, pre); wrap.append(pre, b);
  });
})();
