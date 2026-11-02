/* UI only. Dialogue belongs to Notion -> guide.json.momonga_lines, never to this file. */
(() => {
  'use strict';
  const page = document.querySelector('.page');
  if (!page) return;
  const POSES = ['stand','wave','crouch','jump','glide','land','think','surprise','sleepy','yuagari'];
  const STORAGE = 'sounkyo-guide:momonga-resting';
  const IDLE = 45000;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const reading = document.createElement('div');
  reading.id = 'momonga-reading';
  page.before(reading);
  reading.append(page);
  document.body.classList.add('momonga-enabled');
  const stage = document.createElement('div');
  stage.className = 'momonga-stage';
  stage.innerHTML = '<div class="momonga-lane"></div><div class="momonga-position"><button type="button" class="momonga-pet" hidden><img alt="" width="80" height="80" draggable="false"></button><div class="momonga-dialogue" role="status" aria-live="polite" hidden></div></div><button type="button" class="momonga-rest"></button>';
  document.body.append(stage);
  const lane = stage.querySelector('.momonga-lane');
  const position = stage.querySelector('.momonga-position');
  const pet = stage.querySelector('.momonga-pet');
  const sprite = pet.querySelector('img');
  const bubble = stage.querySelector('.momonga-dialogue');
  const rest = stage.querySelector('.momonga-rest');
  const credit = document.createElement('span');
  credit.className = 'momonga-credit';
  page.querySelector('footer')?.append(credit);
  let resting = false;
  try { resting = localStorage.getItem(STORAGE) === 'true'; } catch (_) { /* Storage can be denied. */ }
  let lines = [], pose = 'stand', side = 'left', x = 12;
  let lastActivity = Date.now(), journeyTimer, idleTimer, bubbleTimer, action = null, assetsPromise;
  const images = new Map();
  const language = () => {
    const query = new URLSearchParams(location.search).get('lang');
    return (query === 'en' || (!query && document.documentElement.lang === 'en')) ? 'en' : 'ja';
  };
  function labels() {
    const en = language() === 'en';
    pet.setAttribute('aria-label', en ? 'Greet the flying squirrel' : 'モモンガにあいさつする');
    rest.textContent = en ? (resting ? 'Wake the flying squirrel' : 'Let the flying squirrel rest') : (resting ? 'モモンガを起こす' : 'モモンガを休ませる');
    rest.setAttribute('aria-pressed', String(resting));
    credit.textContent = en ? 'Flying squirrel: AI-created illustration (ChatGPT)' : 'エゾモモンガ：AIで作ったイメージ（ChatGPT）';
  }
  function hideBubble() { clearTimeout(bubbleTimer); bubble.hidden = true; bubble.textContent = ''; }
  function clearTimers() { clearTimeout(journeyTimer); clearTimeout(idleTimer); }
  function setPose(value) {
    pose = images.has(value) ? value : 'stand';
    pet.dataset.pose = pose;
    if (images.has(pose)) sprite.src = images.get(pose).src;
  }
  function locate() {
    x = side === 'left' ? 12 : Math.max(12, lane.clientWidth - 92);
    position.style.transition = 'none';
    position.style.setProperty('--momonga-x', `${x}px`);
    position.dataset.side = side;
  }
  function stopAction() {
    // Freeze an interrupted glide at its actual position, rather than teleporting to its target.
    const transform = getComputedStyle(position).transform;
    if (transform !== 'none') x = new DOMMatrixReadOnly(transform).m41;
    position.style.transition = 'none';
    position.style.setProperty('--momonga-x', `${x}px`);
    action?.abort();
    action = null;
    pet.classList.remove('momonga-lift');
  }
  function delay(ms, signal) {
    return new Promise(resolve => {
      const end = result => { clearTimeout(timer); signal.removeEventListener('abort', abort); resolve(result); };
      const abort = () => end(false);
      const timer = setTimeout(() => end(true), ms);
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) abort();
    });
  }
  function idle() {
    clearTimeout(idleTimer);
    if (resting || motion.matches || document.hidden) return;
    const remaining = IDLE - (Date.now() - lastActivity);
    idleTimer = setTimeout(() => {
      if (action) { idleTimer = setTimeout(idle, 250); return; }
      clearTimeout(journeyTimer);
      hideBubble();
      setPose('sleepy');
    }, Math.max(0, remaining));
  }
  function schedule() {
    clearTimeout(journeyTimer);
    if (!resting && !motion.matches && !document.hidden && pose !== 'sleepy') {
      journeyTimer = setTimeout(travel, 10000 + Math.random() * 10000);
    }
  }
  function finish(controller) {
    if (action !== controller) return;
    action = null;
    pet.classList.remove('momonga-lift');
    setPose('stand');
    idle(); schedule();
  }
  async function travel() {
    if (resting || motion.matches || document.hidden || pose === 'sleepy' || action) return;
    hideBubble();
    const controller = action = new AbortController(), signal = controller.signal;
    setPose('crouch');
    if (!await delay(260, signal)) return;
    setPose('jump');
    pet.classList.add('momonga-lift');
    if (!await delay(220, signal)) return;
    side = x < lane.clientWidth / 2 - 40 ? 'right' : 'left';
    const target = side === 'right' ? Math.max(12, lane.clientWidth - 92) : 12;
    pet.dataset.direction = target > x ? 'right' : 'left';
    setPose('glide');
    const duration = Math.min(1800, Math.max(1000, Math.abs(target - x) * 2.2));
    position.getBoundingClientRect(); // Commit the start before the CSS transition.
    position.style.transition = `transform ${duration}ms linear`;
    position.style.setProperty('--momonga-x', `${target}px`);
    if (!await delay(duration, signal)) return;
    x = target;
    position.style.transition = 'none';
    position.dataset.side = side;
    pet.classList.remove('momonga-lift');
    setPose('land');
    // A clumsy landing holds the slipped bucket for one extra second.
    if (!await delay(320 + (Math.random() < 0.35 ? 1000 : 0), signal)) return;
    finish(controller);
  }
  function speak() {
    hideBubble();
    const en = language() === 'en';
    const available = lines.map(line => typeof line === 'string' ? line : (line && (en ? line.text_en || line.text : line.text))).filter(line => typeof line === 'string' && line.trim());
    if (!available.length) return;
    // Database text is displayed as text, never executed as HTML.
    bubble.textContent = available[Math.floor(Math.random() * available.length)];
    const spaceLeft = x - 12, spaceRight = lane.clientWidth - x - 92;
    const onRight = spaceRight >= spaceLeft;
    const width = Math.min(220, Math.max(spaceLeft, spaceRight));
    bubble.style.width = `${width}px`;
    bubble.style.left = `${onRight ? 92 : -width - 12}px`;
    bubble.style.right = 'auto';
    bubble.hidden = false;
    bubbleTimer = setTimeout(hideBubble, 6000);
  }
  async function greet() {
    if (resting || document.hidden) return;
    activity(); clearTimeout(journeyTimer); stopAction();
    if (motion.matches) { setPose('stand'); speak(); return; }
    const controller = action = new AbortController(), signal = controller.signal;
    setPose('surprise');
    if (!await delay(280, signal)) return;
    setPose('wave'); speak();
    if (!await delay(1500, signal)) return;
    finish(controller);
  }
  function activity() {
    lastActivity = Date.now();
    if (pose === 'sleepy' && !resting) { setPose('stand'); schedule(); }
    idle();
  }
  async function loadAssets() {
    if (!assetsPromise) assetsPromise = Promise.all(POSES.map(async name => {
      const image = new Image();
      image.src = `photos/momonga/${name}.webp`;
      try { await image.decode(); images.set(name, image); } catch (_) { /* Missing optional poses fall back to stand. */ }
    }));
    await assetsPromise;
  }
  async function activate(intro) {
    await loadAssets();
    if (resting || document.hidden || !images.has('stand')) return;
    pet.hidden = false; locate();
    if (!intro || motion.matches) { setPose('stand'); idle(); schedule(); return; }
    const controller = action = new AbortController();
    setPose('yuagari');
    if (!await delay(2000, controller.signal)) return;
    finish(controller);
  }
  function setResting(value, persist = true) {
    resting = value;
    if (persist) { try { localStorage.setItem(STORAGE, String(value)); } catch (_) { /* Keep this page working without persistence. */ } }
    clearTimers(); stopAction(); hideBubble();
    document.body.classList.toggle('momonga-resting', resting);
    pet.hidden = resting || !images.has('stand');
    labels(); locate();
    if (!resting) { lastActivity = Date.now(); activate(false); }
  }
  pet.addEventListener('click', greet);
  rest.addEventListener('click', () => setResting(!resting));
  ['pointerdown','keydown','wheel','touchstart'].forEach(type => document.addEventListener(type, activity, { passive: true, capture: true }));
  // Auto-scrolling carousels are not visitor activity; only the reading viewport wakes it.
  reading.addEventListener('scroll', activity, { passive: true });
  addEventListener('resize', () => { clearTimers(); stopAction(); hideBubble(); locate(); setPose('stand'); idle(); schedule(); });
  motion.addEventListener('change', () => { clearTimers(); stopAction(); hideBubble(); locate(); setPose('stand'); idle(); schedule(); });
  document.addEventListener('visibilitychange', () => {
    clearTimers(); stopAction(); hideBubble();
    if (document.hidden) pet.hidden = true;
    else if (!resting) { lastActivity = Date.now(); activate(false); }
  });
  addEventListener('storage', event => { if (event.key === STORAGE) setResting(event.newValue === 'true', false); });
  new MutationObserver(() => { labels(); hideBubble(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  window.Momonga = { setData(data) { lines = Array.isArray(data?.momonga_lines) ? data.momonga_lines : []; hideBubble(); } };
  document.body.classList.toggle('momonga-resting', resting);
  labels(); locate();
  if (!resting) activate(true);
})();
