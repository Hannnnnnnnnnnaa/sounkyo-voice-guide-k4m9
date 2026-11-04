/* Browser QA only; no browser/test package is shipped to visitors.
   Serve the repository, then set PLAYWRIGHT_MODULE to an installed Playwright module. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:8766';
const output = path.resolve(process.env.QA_OUTPUT || 'artifacts/momonga-motion');
await fs.mkdir(output,{recursive:true});
const browser = await chromium.launch({channel:process.env.BROWSER_CHANNEL || 'chrome',headless:true});
const failures = [], pet = '.momonga-pet';
const hostWait = ms => new Promise(resolve => setTimeout(resolve,ms));
const pose = page => page.locator(pet).getAttribute('data-pose');
async function context(options={}) {
  const ctx=await browser.newContext({viewport:{width:390,height:844},locale:'ja-JP',...options});
  // Never submit synthetic survey answers while exercising the existing pages.
  await ctx.route('**/*',r=>new URL(r.request().url()).origin!==base && !['GET','HEAD'].includes(r.request().method()) ? r.abort() : r.continue());
  // Reproducible choices while retaining the production distribution of motion types.
  await ctx.addInitScript(() => { let seed=51; Math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296); });
  return ctx;
}
async function open(ctx,url,clock=true) {
  const page=await ctx.newPage();
  page.on('pageerror',error=>failures.push(url+': '+error.message));
  if(clock) {
    const now=new Date('2026-11-04T07:00:00Z');
    await page.clock.install({time:now});
    await page.clock.pauseAt(new Date(now.getTime()+10000));
  }
  await page.goto(base+'/'+url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('.momonga-facing img.is-visible'));
  return page;
}
async function tap(page,selector) {
  // Use the public control, at its rendered position, rather than an internal test API.
  await page.locator(selector).click();
}
async function layout(page) {
  const result=await page.evaluate(() => {
    const stage=document.querySelector('.momonga-stage'), p=document.querySelector('.momonga-pet'), r=p.getBoundingClientRect();
    const b=document.querySelector('.momonga-rest'), box=b.getBoundingClientRect();
    return {
      ordinary:!document.querySelector('#momonga-reading,.momonga-lane')&&document.querySelector('.page').parentElement===document.body&&getComputedStyle(document.body).overflow!=='hidden',
      overlay:getComputedStyle(stage).position==='fixed'&&getComputedStyle(stage).pointerEvents==='none',
      size:Math.abs(r.width-(innerWidth>=768?64:52))<.01 && Math.abs(r.height-r.width)<.01,
      icon:box.width===44&&box.height===44&&b.textContent.trim()===''&&Boolean(b.getAttribute('aria-label')),
      noHorizontalScroll:document.documentElement.scrollWidth<=innerWidth,
      inViewport:p.hidden||r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,
      bubblePassThrough:getComputedStyle(document.querySelector('.momonga-dialogue')).pointerEvents==='none'
    };
  });
  assert.deepEqual(result,{ordinary:true,overlay:true,size:true,icon:true,noHorizontalScroll:true,inViewport:true,bubblePassThrough:true});
}
async function safeStop(page) {
  const collisions=await page.evaluate(() => {
    const p=document.querySelector('.momonga-pet');
    if(p.hidden||p.dataset.parked!=='true') return [];
    const r=p.getBoundingClientRect();
    const selector='a[href],button,input,textarea,select,summary,[role="button"],[role="link"],[contenteditable="true"],audio,video,iframe,#map,.leaflet-container,.player,.bar,[data-momonga-avoid]';
    return [...document.querySelectorAll(selector)].filter(el=>!el.closest('.momonga-stage')&&getComputedStyle(el).visibility!=='hidden').filter(el=>[...el.getClientRects()].some(b=>b.width&&b.height&&r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top)).map(el=>el.id||el.tagName);
  });
  assert.deepEqual(collisions,[],'parked mascot avoids all protected controls');
}
async function step(page,ms) { await page.clock.runFor(ms); await safeStop(page); }
try {
  const observed=new Set();
  for (const file of ['top.html','guide.html?lang=ja#momijidani-entrance']) {
    const ctx=await context(), page=await open(ctx,file);
    await layout(page);
    await step(page,2500);
    assert.equal(await pose(page),'stand');
    const breathBefore=await page.locator('.momonga-body').getAttribute('style');
    await step(page,250);
    assert.notEqual(await page.locator('.momonga-body').getAttribute('style'),breathBefore,'a parked mascot breathes, including at a viewport corner');
    // Inspect actual RAF positions, pose fades and stretch through several random journeys.
    let previous, largestFrameStep=0, fading=false, squashed=false, stretched=false, facingLeft=false, facingRight=false;
    for(let i=0;i<360;i++) {
      await step(page,100);
      const sample=await page.evaluate(()=>{
        const p=document.querySelector('.momonga-pet');
        const pos=new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.momonga-position')).transform);
        const body=new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.momonga-body')).transform);
        return {x:pos.m41,y:pos.m42,motion:p.dataset.motion,sy:Math.hypot(body.m21,body.m22),flip:document.querySelector('.momonga-facing').style.transform,fade:[...p.querySelectorAll('img')].some(i=>{const a=Number(getComputedStyle(i).opacity);return a>0&&a<1;})};
      });
      if(previous) largestFrameStep=Math.max(largestFrameStep,Math.hypot(sample.x-previous.x,sample.y-previous.y));
      previous=sample; observed.add(sample.motion);
      fading ||= sample.fade; squashed ||= sample.sy<.94; stretched ||= sample.sy>1.03;
      if(sample.motion==='glide') { facingRight ||= sample.flip==='scaleX(-1)'; facingLeft ||= sample.flip==='scaleX(1)'; }
    }
    assert.ok(largestFrameStep<100,'no teleports between samples');
    assert.ok(fading,'sprites crossfade'); assert.ok(squashed&&stretched,'jump anticipation/stretch/landing squash');
    const beforeHidden=await page.locator('.momonga-position').getAttribute('style');
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
    await step(page,20000);
    assert.equal(await page.locator('.momonga-position').getAttribute('style'),beforeHidden,'hidden-tab handler stops RAF movement');
    await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    // A pointer action keeps the idle timer separate from autonomous carousels.
    await page.mouse.click(4,4);
    await step(page,50000);
    assert.equal(await pose(page),'sleepy','45 seconds without visitor activity parks and sleeps');
    await page.evaluate(()=>window.scrollBy({top:scrollY>300?-180:180,behavior:'instant'}));
    // Native scroll events are delivered by the compositor, outside the paused JS clock.
    await hostWait(100);
    await step(page,100);
    assert.notEqual(await pose(page),'sleepy','window scrolling wakes the mascot');
    assert.ok(await page.evaluate(()=>scrollY>0),'the normal window scrolls');
    // Let scroll follow-through settle, then greet.
    await step(page,5000);
    await tap(page,pet); await step(page,16);
    assert.equal(await pose(page),'surprise');
    const start=await page.locator('.momonga-position').boundingBox();
    await step(page,160);
    const bounced=await page.locator('.momonga-position').boundingBox();
    assert.ok(bounced.y<start.y,'tap makes a small jump');
    await step(page,300);
    assert.equal(await pose(page),'wave');
    assert.equal(await page.locator('.momonga-dialogue').isVisible(),false,'no Notion lines means no bubble');
    await step(page,2000);
    await page.evaluate(()=>window.Momonga.setData({momonga_lines:[{text:'QA-JA',text_en:'QA-EN'}]}));
    await tap(page,pet); await step(page,400);
    assert.equal(await page.locator('.momonga-dialogue').textContent(),'QA-JA');
    const dock=await page.locator('.momonga-rest').boundingBox();
    await tap(page,'.momonga-rest');
    assert.equal(await page.locator(pet).isVisible(),false);
    assert.deepEqual(await page.locator('.momonga-rest').boundingBox(),dock);
    assert.equal(await page.locator('.momonga-rest').getAttribute('aria-label'),'モモンガを起こす');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('.momonga-facing img.is-visible'));
    assert.equal(await page.locator(pet).isVisible(),false,'rest persists');
    await tap(page,'.momonga-rest');
    assert.equal(await page.locator(pet).isVisible(),true);
    await page.emulateMedia({reducedMotion:'reduce'});
    await step(page,100);
    const still=await page.locator('.momonga-position').boundingBox();
    await step(page,60000);
    assert.equal(await pose(page),'stand');
    assert.deepEqual(await page.locator('.momonga-position').boundingBox(),still,'reduced motion stays still');
    await tap(page,pet); await step(page,400);
    assert.equal(await pose(page),'stand','reduced motion has no greeting bounce');
    await step(page,6001);
    assert.equal(await page.locator('.momonga-dialogue').isVisible(),false);
    for(const viewport of [{width:320,height:568},{width:844,height:390},{width:390,height:844}]) {
      await page.setViewportSize(viewport); await step(page,100); await layout(page); await safeStop(page);
    }
    console.log('PASS window scroll, safety, animation, idle, tap, rest, reduced motion:',file,{largestFrameStep,facingLeft,facingRight});
    await ctx.close();
  }
  for(const kind of ['hop','glide','float']) assert.ok(observed.has(kind),'observed '+kind);
  // No safe place means no parked mascot covering a control, including with reduced motion.
  const ctx=await context({reducedMotion:'reduce'}), page=await open(ctx,'guide.html?lang=en#momijidani-entrance');
  await page.evaluate(()=>window.Momonga.setData({momonga_lines:[{text:'QA-JA',text_en:'QA-EN'}]}));
  await tap(page,pet);
  assert.equal(await page.locator('.momonga-dialogue').textContent(),'QA-EN');
  await page.evaluate(()=>window.Momonga.setData({momonga_lines:[{text:'QA-JA'}]}));
  await tap(page,pet);
  assert.equal(await page.locator('.momonga-dialogue').textContent(),'QA-JA');
  await page.evaluate(()=>window.Momonga.setData({momonga_lines:['<img src=x onerror="window.qaInjected=true">']}));
  await tap(page,pet);
  assert.equal(await page.locator('.momonga-dialogue img').count(),0);
  assert.equal(await page.evaluate(()=>window.qaInjected),undefined);
  await page.evaluate(()=>{const blocker=document.createElement('button');blocker.id='qa-blocker';blocker.style='position:fixed;inset:0;z-index:1;width:100%;height:100%';document.body.append(blocker);dispatchEvent(new Event('resize'));});
  assert.equal(await page.locator(pet).isVisible(),false);
  await page.evaluate(()=>{document.querySelector('#qa-blocker').remove();dispatchEvent(new Event('resize'));});
  assert.equal(await page.locator(pet).isVisible(),true);
  // A transparent overlay and bubble must not swallow an underlying page button.
  assert.equal(await page.evaluate(()=>{const b=document.querySelector('.lang button');const r=b.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2).closest('button')===b;}),true);
  console.log('PASS approved dialogue, fallback, HTML escaping, full-screen control avoidance and click-through');
  await ctx.close();
  for (const [name,url,width,scheme] of [
    ['top-mobile','top.html',390,'light'],['guide-mobile','guide.html?lang=ja#momijidani-entrance',390,'light'],
    ['top-desktop','top.html',1280,'light'],['guide-desktop-en-dark','guide.html?lang=en#momijidani-entrance',1280,'dark']
  ]) {
    const ctx=await context({viewport:{width,height:width===390?844:900},colorScheme:scheme});
    const page=await open(ctx,url); await step(page,3000); await layout(page);
    await page.screenshot({path:path.join(output,name+'.png'),animations:'disabled'});
    await ctx.close();
  }
  // Full viewport, real elapsed RAF motion. No sped-up clock in the PR recording.
  const film=await context(), live=await open(film,'guide.html?lang=ja#momijidani-entrance',false);
  const frameDir=path.join(output,'frames');
  await fs.rm(frameDir,{recursive:true,force:true});
  await fs.mkdir(frameDir,{recursive:true});
  const cdp=await film.newCDPSession(live), recording=[], frames=[];
  let capturing=true;
  cdp.on('Page.screencastFrame',event=>{
    cdp.send('Page.screencastFrameAck',{sessionId:event.sessionId}).catch(()=>{});
    if (!capturing) return;
    const at=event.metadata.timestamp*1000;
    if (!Number.isFinite(at) || at<=0 || recording.length && at<recording.at(-1).at) return;
    frames.push(Buffer.from(event.data,'base64'));
    recording.push({at});
  });
  await cdp.send('Page.startScreencast',{format:'jpeg',quality:85,maxWidth:390,maxHeight:844,everyNthFrame:4});
  await hostWait(16000);
  await cdp.send('Page.stopScreencast');
  capturing=false;
  await cdp.detach();
  for(let i=0;i<frames.length;i++) await fs.writeFile(path.join(frameDir,String(i).padStart(4,'0')+'.jpg'),frames[i]);
  const began=recording[0].at;
  recording.forEach(frame=>{frame.at-=began;});
  await film.close();
  assert.ok(recording.at(-1).at>=10000,'recording is at least 10 real seconds');
  assert.ok(recording.at(-1).at<30000,'recording timestamps are continuous');
  assert.deepEqual(failures,[],'no browser JavaScript errors');
  await fs.writeFile(path.join(output,'checks.json'),JSON.stringify({passed:true,screenshots:4,realMotionFrames:recording.length,recordingMs:recording.at(-1).at,recordingPage:'guide.html',viewport:'390x844',mobileSize:52,desktopSize:64,iconSize:44,motions:[...observed],browser:browser.version()},null,2));
  await fs.writeFile(path.join(output,'recording.json'),JSON.stringify(recording));
  console.log('PASS screenshots and 16-second real-time recording:',output);
} finally { await browser.close(); }
