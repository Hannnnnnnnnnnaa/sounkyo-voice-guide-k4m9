/* Soap bubbles for the creatures of Sounkyo (いきもののシャボン玉).
   Bubbles.render(container, creatures, {lang, placeName, onOpen})
   - each bubble floats gently and holds a small motif drawing and the creature's short name
   - tapping a bubble grows it until it fills the screen (the explanation is written inside it)
   - closing shrinks it back into the bubble it came from
   Data comes from guide.json "creatures" (Notion いきものDB). Colors are the palette of Sounkyo's nature. */
(function(){
const C={snow:'#F5F4EF',mist:'#E3E6E2',tuff:'#77736C',night:'#1E2B3C',spruce:'#2E4A3C',river:'#3D7C84',moss:'#7E8A4E',birch:'#D7A33A',rowan:'#B5452C',matatabi:'#D995A6',ice:'#CFE3EA',momonga:'#A39A8C',bark:'#6B5642'};
const MOTIF={
 'カエデの葉':`<path d="M30 6l4 10 8-5-2 10 10-1-7 8 8 6-11 2 2 9-9-6-3 12-3-12-9 6 2-9-11-2 8-6-7-8 10 1-2-10 8 5z" fill="${C.rowan}"/><path d="M30 26v28" stroke="${C.bark}" stroke-width="1.6" stroke-linecap="round"/>`,
 'カバノキ':`<rect x="24" y="14" width="10" height="42" rx="3" fill="${C.snow}" stroke="${C.tuff}" stroke-width=".8"/><g fill="${C.night}"><rect x="25" y="22" width="5" height="1.6" rx=".8"/><rect x="28" y="31" width="5" height="1.4" rx=".7"/><rect x="25" y="41" width="6" height="1.6" rx=".8"/></g><g fill="${C.birch}"><ellipse cx="18" cy="14" rx="9" ry="7"/><ellipse cx="40" cy="12" rx="10" ry="8"/><ellipse cx="29" cy="7" rx="8" ry="6"/></g>`,
 'カツラの葉':`<path d="M30 50C14 40 8 28 14 18c4-7 12-7 16 0 4-7 12-7 16 0 6 10 0 22-16 32z" fill="${C.birch}"/><path d="M30 50V20M30 34l-8-7M30 34l8-7M30 42l-10-4M30 42l10-4" stroke="#B3842A" stroke-width="1.2" stroke-linecap="round" fill="none"/>`,
 '倒木と芽':`<rect x="6" y="36" width="48" height="12" rx="6" fill="${C.bark}"/><circle cx="12" cy="42" r="4" fill="#8A7256"/><path d="M34 36c0-8 0-12 0-16" stroke="${C.moss}" stroke-width="2" stroke-linecap="round"/><path d="M34 24c-7-1-10-5-10-9 6 0 10 3 10 9zM34 21c6-1 9-5 9-9-6 0-9 3-9 9z" fill="${C.moss}"/><path d="M20 36v-6" stroke="${C.moss}" stroke-width="1.6" stroke-linecap="round"/><path d="M20 31c-4 0-6-3-6-5 4 0 6 2 6 5z" fill="${C.moss}"/>`,
 'つる':`<path d="M12 52C12 34 30 38 30 24S46 12 48 6" stroke="${C.moss}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M22 38c-8-2-10-8-8-12 6 1 9 6 8 12z" fill="${C.moss}"/><path d="M34 26c8-1 11-6 10-11-6 1-10 5-10 11z" fill="${C.matatabi}"/><path d="M42 12c3-3 7-3 8-1" stroke="${C.snow}" stroke-width="3" stroke-linecap="round"/><path d="M14 48c-6 0-8-4-7-7 5 0 7 3 7 7z" fill="${C.matatabi}" opacity=".8"/>`,
 '花':`<g transform="translate(30 28)">${[0,72,144,216,288].map(a=>`<ellipse rx="7" ry="11" transform="rotate(${a}) translate(0 -11)" fill="${C.matatabi}"/>`).join('')}<circle r="6" fill="${C.birch}"/></g><path d="M30 40v16" stroke="${C.moss}" stroke-width="2" stroke-linecap="round"/>`,
 'コオロギ':`<ellipse cx="30" cy="34" rx="15" ry="8" fill="${C.bark}"/><circle cx="16" cy="32" r="6" fill="#584634"/><path d="M12 28C6 18 10 10 18 8M14 27C12 16 18 10 26 10" stroke="#584634" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M38 38l10 12M34 40l2 12M24 40l-2 10M42 34l12 4" stroke="#584634" stroke-width="2" stroke-linecap="round"/><path d="M20 30h22" stroke="${C.birch}" stroke-width="1" opacity=".7"/>`,
 'ザリガニ':`<ellipse cx="32" cy="34" rx="7" ry="13" fill="${C.bark}"/><path d="M32 46c-6 4-6 9 0 10 6-1 6-6 0-10z" fill="#584634"/><path d="M27 24l-8-10M37 24l8-10" stroke="${C.bark}" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="17" cy="11" rx="5" ry="7" transform="rotate(-25 17 11)" fill="${C.rowan}" opacity=".85"/><ellipse cx="47" cy="11" rx="5" ry="7" transform="rotate(25 47 11)" fill="${C.rowan}" opacity=".85"/><path d="M26 32l-8 2M26 38l-8 4M38 32l8 2M38 38l8 4" stroke="#584634" stroke-width="1.4" stroke-linecap="round"/>`,
 '爪あと':`<rect x="16" y="4" width="28" height="54" rx="6" fill="${C.bark}"/><g stroke="${C.snow}" stroke-width="2.4" stroke-linecap="round" opacity=".9"><path d="M22 18l6 20M28 16l6 20M34 18l5 18"/></g>`,
 'キツツキ':`<path d="M18 50c2-14 6-24 16-30 6-3 12 0 12 6 0 8-6 12-12 16l-4 10z" fill="${C.night}"/><circle cx="40" cy="22" r="7" fill="${C.night}"/><path d="M36 15c3-4 8-4 10 0-3 1-6 1-10 0z" fill="${C.rowan}"/><path d="M46 22l10-2-10 4z" fill="${C.tuff}"/><circle cx="42" cy="21" r="1.2" fill="${C.snow}"/><rect x="12" y="4" width="6" height="54" rx="3" fill="${C.bark}" opacity=".7"/>`,
 'モモンガ':`<path d="M8 30c8-10 16-12 22-12s14 2 22 12c-6 2-10 6-12 12-4-4-6-4-10-4s-6 0-10 4c-2-6-6-10-12-12z" fill="${C.momonga}"/><circle cx="30" cy="20" r="7" fill="${C.momonga}"/><circle cx="27" cy="19" r="1.6" fill="${C.night}"/><circle cx="33" cy="19" r="1.6" fill="${C.night}"/><path d="M30 42c0 6-2 10-6 12" stroke="${C.momonga}" stroke-width="4" stroke-linecap="round" fill="none"/>`,
 'キツネ・シカ':`<path d="M14 14l8 12h16l8-12-4 18c0 10-6 18-12 18s-12-8-12-18z" fill="#C7782F"/><path d="M22 38c4 6 12 6 16 0-2 8-6 12-8 12s-6-4-8-12z" fill="${C.snow}"/><circle cx="25" cy="32" r="1.6" fill="${C.night}"/><circle cx="35" cy="32" r="1.6" fill="${C.night}"/><circle cx="30" cy="46" r="1.8" fill="${C.night}"/>`,
 'その他':`<path d="M30 52C16 42 14 22 30 8c16 14 14 34 0 44z" fill="${C.moss}"/><path d="M30 52V16" stroke="${C.spruce}" stroke-width="1.4"/>`
};
const svg=m=>`<svg viewBox="0 0 60 60" aria-hidden="true">${MOTIF[m]||MOTIF['その他']}</svg>`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

const css=`
.bb-field{position:relative;border-radius:22px;padding:22px 10px 18px;overflow:hidden;
 background:radial-gradient(120% 80% at 50% 0%,#3D7C84 0%,#2E4A3C 62%,#24392F 100%)}
.bb-field::before{content:"";position:absolute;inset:auto 0 0 0;height:46px;opacity:.5;
 background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 46'%3E%3Cpath d='M0 46V30l14-18 12 18 10-26 14 26 12-14 10 14 16-22 12 22 14-16 12 16 18-24 14 24 12-12 10 12 16-20 14 20 12-16 14 16 18-24 12 24 14-14 10 14 16-22 14 22 12-12 12 12V46z' fill='%231E2B3C'/%3E%3C/svg%3E") bottom/400px 46px repeat-x;pointer-events:none}
.bb-wrap{position:relative;display:flex;flex-wrap:wrap;justify-content:center;gap:6px 8px;z-index:1}
.bb{--s:96px;width:var(--s);height:var(--s);border-radius:50%;border:0;padding:0;cursor:pointer;position:relative;flex:none;
 margin-top:var(--dy,0);animation:bbfloat var(--t,7s) ease-in-out var(--d,0s) infinite;-webkit-tap-highlight-color:transparent;
 background:
  radial-gradient(circle at 30% 24%,rgba(255,255,255,.95) 0 6%,rgba(255,255,255,0) 15%),
  radial-gradient(circle at 72% 78%,rgba(217,149,166,.35),rgba(217,149,166,0) 45%),
  radial-gradient(circle at 22% 72%,rgba(207,227,234,.55),rgba(207,227,234,0) 50%),
  radial-gradient(circle at 80% 30%,rgba(215,163,58,.25),rgba(215,163,58,0) 40%),
  radial-gradient(circle at 50% 50%,rgba(245,244,239,.10) 55%,rgba(245,244,239,.42) 70%,rgba(245,244,239,.75) 100%);
 box-shadow:inset 0 0 0 1.3px rgba(245,244,239,.75),0 6px 16px rgba(10,20,16,.25)}
.bb svg{position:absolute;left:22%;top:14%;width:56%;height:56%;filter:drop-shadow(0 1px 1px rgba(30,43,60,.25))}
.bb b{position:absolute;left:8%;right:8%;bottom:15%;font:500 10.5px/1.25 "Zen Kaku Gothic New",system-ui,sans-serif;color:#fff;text-shadow:0 1px 3px rgba(30,43,60,.8);text-align:center}
.bb:focus-visible{outline:2px solid #D7A33A;outline-offset:3px}
.bb.gone{visibility:hidden}
@keyframes bbfloat{0%,100%{transform:translate(0,0)}25%{transform:translate(2px,-7px)}50%{transform:translate(-1px,-3px)}75%{transform:translate(-3px,-8px)}}
.bb-hint{position:relative;z-index:1;text-align:center;font-size:11.5px;color:rgba(245,244,239,.8);margin:10px 0 0}
.bb-full{position:fixed;inset:0;z-index:80;overflow:auto;-webkit-overflow-scrolling:touch;color:#1E2B3C;
 background:
  radial-gradient(circle at 28% 16%,rgba(255,255,255,.95) 0 3%,rgba(255,255,255,0) 9%),
  radial-gradient(circle at 80% 85%,rgba(217,149,166,.28),rgba(217,149,166,0) 40%),
  radial-gradient(circle at 12% 70%,rgba(207,227,234,.7),rgba(207,227,234,0) 45%),
  radial-gradient(circle at 88% 22%,rgba(215,163,58,.22),rgba(215,163,58,0) 38%),
  #F5F4EF;
 clip-path:circle(var(--r0) at var(--x) var(--y));transition:clip-path .75s cubic-bezier(.45,0,.2,1)}
.bb-full.open{clip-path:circle(var(--r1) at var(--x) var(--y))}
.bb-full .in{max-width:560px;margin:0 auto;padding:calc(54px + env(safe-area-inset-top)) 22px calc(40px + env(safe-area-inset-bottom));opacity:0;transform:scale(.92);transition:opacity .45s .25s,transform .6s .2s cubic-bezier(.3,0,.2,1)}
.bb-full.open .in{opacity:1;transform:none}
.bb-full .x{position:fixed;right:16px;top:calc(14px + env(safe-area-inset-top));width:40px;height:40px;border-radius:50%;border:0;background:rgba(30,43,60,.08);font-size:20px;cursor:pointer;color:#1E2B3C;z-index:2}
.bb-full .art{width:150px;height:150px;margin:0 auto 6px;border-radius:50%;position:relative;
 background:radial-gradient(circle at 32% 26%,#fff 0 7%,rgba(255,255,255,0) 18%),radial-gradient(circle,rgba(207,227,234,.35) 55%,rgba(207,227,234,.8) 100%);box-shadow:inset 0 0 0 1.5px rgba(61,124,132,.25)}
.bb-full .art svg{position:absolute;inset:18%;width:64%;height:64%}
.bb-full .lab{text-align:center;font-size:12px;color:#77736C;margin:0}
.bb-full h3{text-align:center;font-family:"Zen Antique Soft",serif;font-weight:400;font-size:26px;margin:2px 0 4px;letter-spacing:.04em}
.bb-full .ai{text-align:center;font-size:13px;margin:0 0 10px;color:#3D7C84}
.bb-full p{line-height:1.85;margin:10px 0}
.bb-full .tag{display:inline-block;background:#CFE3EA;border-radius:8px;padding:3px 10px;font-size:12.5px;margin:4px 6px 4px 0}
.bb-full .note{border-left:3px solid #B5452C;background:rgba(255,255,255,.7);border-radius:0 10px 10px 0;padding:6px 12px;font-size:13.5px}
.bb-full .sec{background:rgba(255,255,255,.65);border-radius:14px;padding:10px 14px;margin:10px 0;font-size:14px}
.bb-full .sec b{display:block;font-size:11.5px;color:#77736C;font-weight:500}
.bb-full .go{display:block;text-align:center;text-decoration:none;background:#2E4A3C;color:#F5F4EF;border-radius:999px;padding:12px;font-weight:700;margin:14px 0 6px}
.bb-full .src{font-size:11.5px;color:#77736C;border-top:1px solid #E3E6E2;margin-top:16px;padding-top:8px}
.bb-full .src a{display:block;color:#3D7C84;margin:2px 0}
.bb-full .close2{display:block;margin:18px auto 0;border:1.5px solid #2E4A3C;background:transparent;color:#2E4A3C;border-radius:999px;padding:10px 30px;font:700 14px "Zen Kaku Gothic New",system-ui,sans-serif;cursor:pointer}
@media (prefers-reduced-motion:reduce){.bb{animation:none}.bb-full,.bb-full .in{transition:opacity .3s}}
`;
function injectCSS(){if(document.getElementById('bb-css'))return;const s=document.createElement('style');s.id='bb-css';s.textContent=css;document.head.appendChild(s)}
function rnd(i){const x=Math.sin(i*12.9898+7)*43758.5453;return x-Math.floor(x)}

const T={ja:{hint:'シャボン玉を押してみて',close:'とじる',ainu:'アイヌ語の名前',meaning:'意味',when:'見られる季節',ainuRel:'アイヌの人々との関わり',rel:'まわりの生きものとの関係',src:'出典',where:'見られる場所',cat:{植物:'植物',動物:'動物',鳥:'鳥',虫:'虫',水の生きもの:'水の生きもの','キノコ・菌':'キノコ・菌'}},
 en:{hint:'Tap a bubble',close:'Close',ainu:'Ainu name',meaning:'Meaning',when:'When to see it',ainuRel:'Ties with the Ainu people',rel:'Ties with other living things',src:'Sources',where:'Where to see it',cat:{植物:'Plant',動物:'Animal',鳥:'Bird',虫:'Insect',水の生きもの:'Water life','キノコ・菌':'Fungus'}}};

function render(el,list,opt={}){
 injectCSS();const lang=opt.lang==='en'?'en':'ja',L=T[lang];
 const lab=c=>lang==='en'?(c.label_en||c.name_en||c.label||c.name):(c.label||c.name);
 el.innerHTML=`<div class="bb-field"><div class="bb-wrap">${list.map((c,i)=>{const s=86+Math.round(rnd(i)*26);
  return `<button class="bb" data-i="${i}" style="--s:${s}px;--dy:${Math.round(rnd(i+5)*18)}px;--t:${6+rnd(i+9)*4}s;--d:${-rnd(i+3)*6}s" aria-label="${esc(lab(c))}">${svg(c.motif)}<b>${esc(lab(c))}</b></button>`}).join('')}</div><p class="bb-hint">${L.hint}</p></div>`;
 el.querySelector('.bb-wrap').addEventListener('click',e=>{const b=e.target.closest('.bb');if(b)open(b,list[+b.dataset.i],lang,opt)});
}

function open(btn,c,lang,opt){
 const L=T[lang],r=btn.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
 const far=Math.hypot(Math.max(cx,innerWidth-cx),Math.max(cy,innerHeight-cy))+20;
 const name=lang==='en'?(c.name_en||c.name):c.name, desc=lang==='en'?(c.description_en||c.description):c.description;
 const label=lang==='en'?(c.label_en||c.name_en||c.label||c.name):(c.label||c.name);
 const places=(opt.places||[]).filter(p=>c.points&&c.points.includes(p.id));
 const d=document.createElement('div');d.className='bb-full';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-label',name);
 d.style.setProperty('--x',cx+'px');d.style.setProperty('--y',cy+'px');d.style.setProperty('--r0',(r.width/2)+'px');d.style.setProperty('--r1',far+'px');
 d.innerHTML=`<button class="x" aria-label="${L.close}">×</button><div class="in">
  <div class="art">${svg(c.motif)}</div><p class="lab">${esc(L.cat[c.category]||c.category||'')}</p><h3>${esc(label)}</h3>
  ${label!==name?`<p class="lab" style="margin-top:-2px">${esc(name)}</p>`:''}
  ${c.ainu_name?`<p class="ai">${L.ainu}：${esc(c.ainu_name)}${c.ainu_meaning?`（${L.meaning}：${esc(c.ainu_meaning)}）`:''}</p>`:''}
  <p>${esc(desc)}</p>
  ${c.when&&lang==='ja'?`<span class="tag">${L.when}：${esc(c.when)}</span>`:''}
  ${c.note&&lang==='ja'?`<p class="note">${esc(c.note)}</p>`:''}
  ${c.ainu_relation&&lang==='ja'?`<div class="sec"><b>${L.ainuRel}</b>${esc(c.ainu_relation)}</div>`:''}
  ${c.relations&&lang==='ja'?`<div class="sec"><b>${L.rel}</b>${esc(c.relations)}</div>`:''}
  ${places.map(p=>`<a class="go" href="guide.html#${esc(p.id)}">${L.where}：${esc(p.name)} ›</a>`).join('')}
  ${c.sources&&c.sources.length?`<div class="src">${L.src}${c.sources.map(s=>s.url?`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(lang==='en'?(s.name_en||s.name):s.name)}</a>`:`<span>${esc(s.name)}</span>`).join('')}</div>`:''}
  <button class="close2">${L.close}</button></div>`;
 document.body.appendChild(d);btn.classList.add('gone');
 const prevOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';
 requestAnimationFrame(()=>requestAnimationFrame(()=>d.classList.add('open')));
 if(opt.onOpen)opt.onOpen(c);
 const close=()=>{
  const r2=btn.getBoundingClientRect();   // the page may have moved; shrink back to where the bubble is now
  d.style.setProperty('--x',(r2.left+r2.width/2)+'px');d.style.setProperty('--y',(r2.top+r2.height/2)+'px');d.style.setProperty('--r0',(r2.width/2)+'px');
  d.classList.remove('open');
  const done=()=>{d.remove();btn.classList.remove('gone');document.documentElement.style.overflow=prevOverflow;btn.focus({preventScroll:true})};
  if(reduce)done();else setTimeout(done,760);
  removeEventListener('keydown',onKey)};
 const onKey=e=>{if(e.key==='Escape')close()};addEventListener('keydown',onKey);
 d.querySelector('.x').onclick=close;d.querySelector('.close2').onclick=close;
 setTimeout(()=>d.querySelector('.x').focus({preventScroll:true}),400);
}
window.Bubbles={render};
})();
