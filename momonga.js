/* UI only. Dialogue belongs to Notion -> guide.json.momonga_lines, never to this file. */
(() => {
  'use strict';
  const page = document.querySelector('.page');
  if (!page) return;
  const POSES = ['stand','wave','crouch','jump','glide','land','think','surprise','sleepy','yuagari'];
  const STORAGE = 'sounkyo-guide:momonga-resting';
  const AVOID = 'a[href],button,input,textarea,select,summary,[role="button"],[role="link"],[contenteditable="true"],audio,video,iframe,#map,.leaflet-container,.player,.bar,[data-momonga-avoid]';
  const ICONS = {
    rest: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20.4 13.1A8.5 8.5 0 0 1 10.9 3.6a8.5 8.5 0 1 0 9.5 9.5Z"/></svg>',
    wake: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
  };
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  // This overlay never wraps, resizes or scrolls the page below it.
  const stage = document.createElement('div');
  stage.className = 'momonga-stage';
  stage.innerHTML = '<div class="momonga-bounds"></div><div class="momonga-position"><button type="button" class="momonga-pet" hidden><span class="momonga-body"><span class="momonga-facing"></span></span></button></div><div class="momonga-dialogue" role="status" aria-live="polite" hidden></div><button type="button" class="momonga-rest"></button>';
  document.body.append(stage);
  const bounds = stage.querySelector('.momonga-bounds');
  const position = stage.querySelector('.momonga-position');
  const pet = stage.querySelector('.momonga-pet');
  const body = stage.querySelector('.momonga-body');
  const facing = stage.querySelector('.momonga-facing');
  const bubble = stage.querySelector('.momonga-dialogue');
  const rest = stage.querySelector('.momonga-rest');
  const credit = document.createElement('span');
  credit.className = 'momonga-credit';
  page.querySelector('footer')?.append(credit);
  let resting = false;
  try { resting = localStorage.getItem(STORAGE) === 'true'; } catch (_) { /* Storage can be denied. */ }
  const images = new Map();
  let lines = [], pose = '', ready = false, sleeping = false, placed = false;
  let point = {x:0,y:0}, area, size = 52, obstacles = [];
  let route = null, greeting = null, introUntil = 2000, nextDecision = 0;
  let elapsed = 0, lastActivity = 0, lastStamp = null, raf = 0, lastCheck = -Infinity;
  let dirty = true, scrollYLast = scrollY, scrollTarget = 0, scrollLag = 0, breath = 0, bubbleUntil = 0, bubbleTimer;
  const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
  const mix = (a,b,t) => a+(b-a)*t;
  const ease = t => t*t*t*(t*(t*6-15)+10); // Zero velocity and acceleration at both ends.
  const randomWait = () => 3000+Math.random()*5000;
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const language = () => {
    const query = new URLSearchParams(location.search).get('lang');
    return (query === 'en' || (!query && document.documentElement.lang === 'en')) ? 'en' : 'ja';
  };
  function labels() {
    const en = language() === 'en';
    pet.setAttribute('aria-label',en ? 'Greet the flying squirrel' : 'モモンガにあいさつする');
    const label = en ? (resting ? 'Wake the flying squirrel' : 'Let the flying squirrel rest') : (resting ? 'モモンガを起こす' : 'モモンガを休ませる');
    rest.setAttribute('aria-label',label);
    rest.title = label;
    rest.innerHTML = resting ? ICONS.wake : ICONS.rest;
    rest.setAttribute('aria-pressed',String(resting));
    credit.textContent = en ? 'Flying squirrel: AI-created illustration (ChatGPT)' : 'エゾモモンガ：AIで作ったイメージ（ChatGPT）';
  }
  function hideBubble() { clearTimeout(bubbleTimer); bubble.hidden = true; bubble.textContent = ''; bubbleUntil = 0; }
  function setPose(value) {
    value = images.has(value) ? value : 'stand';
    if (value === pose && images.get(value)?.classList.contains('is-visible')) return;
    pose = value;
    pet.dataset.pose = value;
    // All decoded images stay stacked, so even interrupted fades remain continuous.
    images.forEach((image,name) => image.classList.toggle('is-visible',name === value));
  }
  function refreshSpace() {
    const r = bounds.getBoundingClientRect();
    size = position.offsetWidth;
    area = {left:r.left,top:r.top,right:Math.max(r.left,r.right-size),bottom:Math.max(r.top,r.bottom-size)};
    obstacles = [...document.querySelectorAll(AVOID)].filter(el => !stage.contains(el)).flatMap(el => {
      const css = getComputedStyle(el);
      if (css.visibility === 'hidden' || css.display === 'none') return [];
      return [...el.getClientRects()].filter(r => r.width && r.height && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth);
    });
    obstacles.push(rest.getBoundingClientRect());
    dirty = false; lastCheck = elapsed;
  }
  function contain(p) { return {x:clamp(p.x,area.left,area.right),y:clamp(p.y,area.top,area.bottom)}; }
  function safe(p,hitTest = false) {
    // The margin also covers the breathing, small tilts and landing squash.
    const m = 7, r = {left:p.x-m,top:p.y-m,right:p.x+size+m,bottom:p.y+size+m};
    if (p.x < 0 || p.x+size > stage.clientWidth || p.y < 0 || p.y+size > stage.clientHeight) return false;
    if (obstacles.some(o => r.left < o.right && r.right > o.left && r.top < o.bottom && r.bottom > o.top)) return false;
    if (!hitTest) return true;
    // Look underneath our own transparent overlay, including at the edges of the sprite.
    return [0,.5,1].every(a => [0,.5,1].every(b => !document.elementsFromPoint(p.x+a*size,p.y+b*size).some(el => !stage.contains(el) && el.closest(AVOID))));
  }
  function destination(corner = false,far = false,near = false) {
    const corners = [
      {x:area.left,y:area.bottom},{x:area.right,y:area.bottom},
      {x:area.left,y:area.top},{x:area.right,y:area.top}
    ];
    const candidates = [...corners];
    for (let i=0;i<32;i++) candidates.push({x:mix(area.left,area.right,Math.random()),y:mix(area.top,area.bottom,Math.random())});
    // A grid finds narrow free margins when the centre contains controls or a map.
    for (let a=0;a<=6;a++) for (let b=0;b<=8;b++) candidates.push({x:mix(area.left,area.right,a/6),y:mix(area.top,area.bottom,b/8)});
    let available = candidates.filter(p => safe(p));
    if (near) {
      const nearby = available.filter(p => distance(p,point)>size && distance(p,point)<=220);
      if (nearby.length) available = nearby;
    }
    if (corner) available.sort((a,b) => Math.min(...corners.map(c => distance(a,c)))-Math.min(...corners.map(c => distance(b,c))));
    else if (far) available.sort((a,b) => distance(b,point)-distance(a,point));
    else {
      // Shuffle rather than favouring the grid's first corner every time.
      for (let i=available.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [available[i],available[j]]=[available[j],available[i]]; }
      available.sort((a,b) => Number(distance(b,point)>size*1.5)-Number(distance(a,point)>size*1.5));
    }
    return available.find(p => safe(p,true)) || null;
  }
  function park(corner = true) {
    refreshSpace();
    const target = destination(corner);
    placed = Boolean(target);
    if (target) point = target;
    pet.hidden = !ready || resting || !placed;
    render(0,1,1,0);
  }
  function startRoute(target,kind = 'float') {
    if (!target) { placed = false; pet.hidden = true; route = null; nextDecision = elapsed+500; return; }
    hideBubble();
    if (!placed) { point = target; placed = true; pet.hidden = resting; }
    const d = distance(point,target), dx = target.x-point.x, dy = target.y-point.y;
    const bend = (Math.random()<.5 ? -1 : 1)*Math.min(65,d*.24);
    const normal = {x:-dy/Math.max(d,1)*bend,y:dx/Math.max(d,1)*bend};
    const pre = kind === 'hop' || kind === 'glide' ? 220 : 0;
    const flight = kind === 'glide' ? clamp(d*10,3200,5800) : kind === 'hop' ? clamp(d*6,1100,1800) : clamp(d*7.5,2200,4800);
    const land = pre ? 280 : 0;
    route = {from:{...point},to:target,c1:contain({x:point.x+dx/3+normal.x,y:point.y+dy/3+normal.y}),c2:contain({x:point.x+dx*2/3+normal.x,y:point.y+dy*2/3+normal.y}),start:elapsed,pre,flight,land,kind};
    pet.dataset.motion = kind;
    facing.style.transform = kind === 'glide' && dx>0 ? 'scaleX(-1)' : 'scaleX(1)';
    nextDecision = elapsed+Math.max(randomWait(),pre+flight+land+200);
  }
  function render(lift,sy,sx,tilt) {
    // Keep the 10px parking margin available for the tap's small hop, even in a corner.
    const p = area ? {x:clamp(point.x,area.left,area.right),y:clamp(point.y+scrollLag+lift,0,stage.clientHeight-size)} : point;
    position.style.transform = `translate3d(${p.x.toFixed(2)}px,${p.y.toFixed(2)}px,0)`;
    body.style.transform = `translateY(${(-breath).toFixed(3)}px) rotate(${tilt.toFixed(2)}deg) scale(${sx.toFixed(3)},${sy.toFixed(3)})`;
    // During a crossing, the page's controls still receive taps through the mascot.
    pet.style.pointerEvents = safe(p) ? 'auto' : 'none';
    pet.dataset.parked = String(!route && !greeting && !pet.hidden && safe(p));
  }
  function sampleRoute() {
    const r = route, t = elapsed-r.start;
    if (t < r.pre) {
      setPose('crouch');
      const squash = Math.sin(t/r.pre*Math.PI/2);
      return {lift:0,sy:1-.15*squash,sx:1+.06*squash,tilt:0};
    }
    const u = clamp((t-r.pre)/r.flight,0,1), e = ease(u), v = 1-e;
    point = {x:v*v*v*r.from.x+3*v*v*e*r.c1.x+3*v*e*e*r.c2.x+e*e*e*r.to.x,y:v*v*v*r.from.y+3*v*v*e*r.c1.y+3*v*e*e*r.c2.y+e*e*e*r.to.y};
    if (u < 1) {
      setPose(r.kind === 'glide' ? 'glide' : r.kind === 'hop' ? 'jump' : 'stand');
      return {lift:r.kind === 'hop' ? -28*Math.sin(Math.PI*e) : 0,sy:r.pre ? (u<.15 ? mix(.85,1.08,ease(u/.15)) : mix(1.08,1,ease((u-.15)/.85))) : 1,sx:1,tilt:r.kind === 'glide' ? Math.sign(r.to.x-r.from.x)*8*Math.sin(Math.PI*e) : 0};
    }
    // Recheck the whole landing area: scrolling or an expanded panel may have moved it.
    if (!safe(r.to,true)) {
      refreshSpace();
      startRoute(destination(sleeping),sleeping ? 'sleep' : 'float');
      return {lift:0,sy:1,sx:1,tilt:0};
    }
    const landT = r.land ? (t-r.pre-r.flight)/r.land : 1;
    if (landT < 1) {
      setPose('land');
      const squash = Math.sin(Math.PI*landT);
      return {lift:0,sy:1-.15*squash,sx:1+.07*squash,tilt:0};
    }
    route = null;
    setPose(sleeping ? 'sleepy' : 'stand');
    pet.dataset.motion = sleeping ? 'sleep' : 'idle';
    return {lift:0,sy:1,sx:1,tilt:0};
  }
  function speak() {
    hideBubble();
    const en = language() === 'en';
    const available = lines.map(line => typeof line === 'string' ? line : (line && (en ? line.text_en || line.text : line.text))).filter(line => typeof line === 'string' && line.trim());
    if (!available.length) return;
    bubble.textContent = available[Math.floor(Math.random()*available.length)];
    bubble.hidden = false;
    const w = bubble.offsetWidth, h = bubble.offsetHeight;
    const x = clamp(point.x+size/2-w/2,12,innerWidth-w-12);
    const y = point.y>h+24 ? point.y-h-12 : point.y+size+12;
    bubble.style.transform = `translate3d(${x}px,${clamp(y,12,innerHeight-h-12)}px,0)`;
    bubbleUntil = elapsed+6000;
    bubbleTimer = setTimeout(hideBubble,6000);
  }
  function tick(stamp) {
    raf = 0;
    if (resting || document.hidden || motion.matches || !ready) return;
    const dt = lastStamp === null ? 0 : Math.min(64,stamp-lastStamp);
    lastStamp = stamp; elapsed += dt;
    if (dirty || elapsed-lastCheck>180) refreshSpace();
    scrollLag += (scrollTarget-scrollLag)*(1-Math.exp(-dt/160));
    scrollTarget *= Math.exp(-dt/420);
    let shape = {lift:0,sy:1,sx:1,tilt:0};
    if (!sleeping && elapsed-lastActivity>=45000 && !greeting) {
      sleeping = true; introUntil = 0;
      startRoute(destination(true),'sleep');
    }
    if (greeting) {
      const t = elapsed-greeting.start;
      setPose(t<360 ? 'surprise' : 'wave');
      if (t<360) { shape.lift = -10*Math.sin(Math.PI*t/360); shape.sy = 1+.07*Math.sin(Math.PI*t/360); }
      else if (!bubbleUntil && !greeting.spoken) { speak(); greeting.spoken = true; }
      if (t>=2100) { greeting = null; setPose('stand'); nextDecision = elapsed+randomWait(); }
    } else if (route) shape = sampleRoute();
    else if (elapsed<introUntil) setPose('yuagari');
    else {
      setPose(sleeping ? 'sleepy' : 'stand');
      pet.dataset.motion = sleeping ? 'sleep' : 'idle';
      if ((!placed && elapsed>=nextDecision) || (placed && !safe(contain({x:point.x,y:point.y+scrollLag}),true))) startRoute(destination(sleeping),sleeping ? 'sleep' : 'float');
      else if (placed && !sleeping && elapsed>=nextDecision && !pet.matches(':focus-visible')) {
        const choice = Math.random();
        let kind = choice<.3 ? 'hop' : choice<.65 ? 'glide' : 'float';
        const target = destination(false,kind === 'glide',kind === 'hop');
        if (target && kind === 'hop' && distance(point,target)>240) kind = 'float';
        startRoute(target,kind);
      }
    }
    if (!greeting && bubbleUntil && elapsed>=bubbleUntil) hideBubble();
    const breathTarget = !route && !greeting && elapsed>=introUntil ? 1 : 0;
    breath += (breathTarget*(1+Math.sin(elapsed/650))*0.8-breath)*(1-Math.exp(-dt/200));
    render(shape.lift,shape.sy,shape.sx,shape.tilt);
    raf = requestAnimationFrame(tick);
  }
  function startLoop() {
    if (!raf && ready && !resting && !document.hidden && !motion.matches) { lastStamp = null; raf = requestAnimationFrame(tick); }
  }
  function stopLoop() { cancelAnimationFrame(raf); raf = 0; lastStamp = null; }
  function activity() {
    lastActivity = elapsed;
    if (sleeping) { sleeping = false; route = null; setPose('stand'); nextDecision = elapsed+randomWait(); }
  }
  function greet() {
    if (resting || document.hidden || !ready) return;
    activity(); hideBubble(); route = null; introUntil = 0;
    if (motion.matches) { setPose('stand'); speak(); return; }
    greeting = {start:elapsed,spoken:false};
    setPose('surprise'); pet.dataset.motion = 'greet';
    startLoop();
  }
  function setResting(value,persist = true) {
    resting = value; stopLoop(); route = null; greeting = null; sleeping = false; hideBubble();
    if (persist) { try { localStorage.setItem(STORAGE,String(value)); } catch (_) { /* Page-only preference still works. */ } }
    labels(); pet.hidden = resting || !ready;
    if (!resting && ready) { lastActivity = elapsed; introUntil = 0; nextDecision = elapsed+randomWait(); setPose('stand'); park(); startLoop(); }
  }
  function environment() {
    dirty = true;
    hideBubble();
    if (ready && motion.matches && !resting) { park(); setPose('stand'); }
  }
  pet.addEventListener('click',greet);
  // Keep a keyboard-focused mascot still until focus leaves it.
  pet.addEventListener('focus',() => { if (pet.matches(':focus-visible')) { route = null; nextDecision = Infinity; } });
  pet.addEventListener('blur',() => { nextDecision = elapsed+randomWait(); });
  rest.addEventListener('click',() => setResting(!resting));
  ['pointerdown','keydown','wheel','touchstart'].forEach(type => document.addEventListener(type,activity,{passive:true,capture:true}));
  addEventListener('scroll',() => {
    activity();
    if (!motion.matches) scrollTarget = clamp(scrollTarget-(scrollY-scrollYLast)*.18,-28,28);
    scrollYLast = scrollY; environment();
  },{passive:true});
  addEventListener('resize',() => { route = null; scrollLag = scrollTarget = 0; environment(); if (ready && !resting) park(); });
  document.addEventListener('toggle',environment,true);
  new ResizeObserver(environment).observe(page);
  motion.addEventListener('change',() => {
    stopLoop(); route = null; greeting = null; sleeping = false; scrollLag = scrollTarget = breath = 0;
    hideBubble(); setPose('stand'); introUntil = 0; nextDecision = elapsed+randomWait();
    if (ready && !resting) park(); startLoop();
  });
  document.addEventListener('visibilitychange',() => {
    stopLoop(); hideBubble();
    if (!document.hidden) { dirty = true; lastActivity = elapsed; startLoop(); }
  });
  addEventListener('storage',event => { if (event.key === STORAGE) setResting(event.newValue === 'true',false); });
  new MutationObserver(() => { labels(); hideBubble(); }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  window.Momonga = {setData(data) { lines = Array.isArray(data?.momonga_lines) ? data.momonga_lines : []; hideBubble(); }};
  labels();
  Promise.all(POSES.map(async name => {
    const image = new Image();
    image.alt = ''; image.draggable = false; image.src = `photos/momonga/${name}.webp`;
    try { await image.decode(); images.set(name,image); facing.append(image); } catch (_) { /* Optional poses fall back to stand. */ }
  })).then(() => {
    ready = images.has('stand');
    if (!ready) return;
    setPose(motion.matches ? 'stand' : 'yuagari');
    park(); nextDecision = randomWait(); startLoop();
  });
})();
