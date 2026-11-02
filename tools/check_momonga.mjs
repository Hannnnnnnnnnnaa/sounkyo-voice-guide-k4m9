/* Browser QA only; no browser/test package is shipped to visitors.
   Serve the repository, then set PLAYWRIGHT_MODULE to an installed Playwright module. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:8766';
const output = path.resolve(process.env.QA_OUTPUT || 'artifacts/momonga');
await fs.mkdir(output, {recursive:true});
const browser = await chromium.launch({channel:process.env.BROWSER_CHANNEL || 'chrome',headless:true});
const failures = [];
const pet = '.momonga-pet';
const pose = page => page.locator(pet).getAttribute('data-pose');
const hostWait = ms => new Promise(resolve => setTimeout(resolve,ms));
async function until(test, label) {
  for (let i=0;i<300;i++) { if (await test()) return; await hostWait(50); }
  throw new Error('Timed out: '+label);
}
async function tap(page, selector) {
  const box=await page.locator(selector).boundingBox();
  assert.ok(box,selector+' is visible');
  await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
}
async function safe(page) {
  const result=await page.evaluate(() => {
    const lane=document.querySelector('.momonga-lane').getBoundingClientRect();
    const reading=document.querySelector('#momonga-reading').getBoundingClientRect();
    const p=document.querySelector('.momonga-pet');
    const r=p.getBoundingClientRect();
    const rest=document.querySelector('.momonga-rest').getBoundingClientRect();
    const button=document.querySelector('.momonga-rest');
    const dialogue=document.querySelector('.momonga-dialogue');
    const d=dialogue.getBoundingClientRect();
    const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
    const inside=r=>r.top>=lane.top-.5&&r.bottom<=lane.bottom+.5&&r.left>=0&&r.right<=innerWidth;
    return {
      separate:reading.bottom<=lane.top+.5,
      visible:(p.hidden||inside(r))&&inside(rest),
      scrolling:document.documentElement.scrollWidth<=innerWidth,
      sizes:Math.abs(lane.height-90)<.01&&Math.abs(rest.width-44)<.01&&Math.abs(rest.height-44)<.01&&(p.hidden||Math.abs(r.width-80)<.01&&Math.abs(r.height-80)<.01),
      iconOnly:button.textContent.trim()===''&&Boolean(button.getAttribute('aria-label'))&&Boolean(button.querySelector('svg[aria-hidden="true"]')),
      noOverlap:(p.hidden||!overlaps(r,rest))&&(dialogue.hidden||inside(d)&&!overlaps(d,rest)&&!overlaps(d,r))
    };
  });
  assert.deepEqual(result,{separate:true,visible:true,scrolling:true,sizes:true,iconOnly:true,noOverlap:true});
}
async function context(options={}) {
  const ctx=await browser.newContext({viewport:{width:390,height:844},locale:'ja-JP',...options});
  // Never submit synthetic survey answers while exercising the existing pages.
  await ctx.route('**/*',r=>new URL(r.request().url()).origin!==base && !['GET','HEAD'].includes(r.request().method()) ? r.abort() : r.continue());
  await ctx.addInitScript(() => { Math.random=()=>0; });
  return ctx;
}
async function open(ctx,url,clock=true) {
  const page=await ctx.newPage();
  page.on('pageerror',error=>failures.push(url+': '+error.message));
  if(clock) {
    const now=new Date('2026-10-31T07:00:00Z');
    await page.clock.install({time:now});
    await page.clock.pauseAt(now);
  }
  await page.goto(base+'/'+url,{waitUntil:'domcontentloaded'});
  await until(()=>page.locator(pet).isVisible(),'mascot loads');
  await until(()=>page.evaluate(()=>Boolean(window.Momonga)),'component loads');
  return page;
}
try {
  for (const file of ['top.html','guide.html?lang=ja#momijidani-entrance']) {
    const ctx=await context();
    const page=await open(ctx,file);
    assert.equal(await pose(page),'yuagari');
    await safe(page);
    await page.clock.runFor(2000);
    assert.equal(await pose(page),'stand');
    await page.clock.runFor(10000);
    assert.equal(await pose(page),'crouch');
    await page.clock.runFor(260);
    assert.equal(await pose(page),'jump');
    await page.clock.runFor(220);
    assert.equal(await pose(page),'glide');
    await safe(page);
    await page.clock.runFor(1000);
    assert.equal(await pose(page),'land');
    await page.clock.runFor(1319);
    assert.equal(await pose(page),'land','clumsy landing keeps its extra second');
    await page.clock.runFor(1);
    assert.equal(await pose(page),'stand');
    await tap(page,pet);
    assert.equal(await pose(page),'surprise');
    await page.clock.runFor(280);
    assert.equal(await pose(page),'wave');
    assert.equal(await page.locator('.momonga-dialogue').isVisible(),false,'missing Notion lines stay silent');
    await page.clock.runFor(1500);
    await page.clock.runFor(50000);
    assert.equal(await pose(page),'sleepy','automatic carousels must not count as activity');
    await page.evaluate(()=>document.querySelector('#momonga-reading').scrollTo({top:200,behavior:'instant'}));
    await until(async()=>await pose(page)==='stand','scroll wakes mascot');
    await safe(page);
    await page.setViewportSize({width:320,height:568});
    await safe(page);
    await page.setViewportSize({width:844,height:390});
    await safe(page);
    await page.setViewportSize({width:390,height:844});
    const dock=await page.locator('.momonga-rest').boundingBox();
    await tap(page,'.momonga-rest');
    assert.equal(await page.locator(pet).isVisible(),false);
    assert.deepEqual(await page.locator('.momonga-rest').boundingBox(),dock,'wake icon stays in the same place');
    assert.equal(await page.locator('.momonga-rest').getAttribute('aria-label'),'モモンガを起こす');
    await safe(page);
    assert.equal(await page.evaluate(()=>localStorage.getItem('sounkyo-guide:momonga-resting')),'true');
    await page.reload({waitUntil:'domcontentloaded'});
    assert.equal(await page.locator(pet).isVisible(),false,'rest persists after reload');
    assert.deepEqual(await page.locator('.momonga-rest').boundingBox(),dock,'wake icon position survives reload');
    await safe(page);
    await tap(page,'.momonga-rest');
    await until(()=>page.locator(pet).isVisible(),'wake button restores mascot');
    assert.deepEqual(await page.locator('.momonga-rest').boundingBox(),dock,'waking does not move the control');
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.clock.runFor(1);
    assert.equal(await pose(page),'stand');
    await tap(page,pet);
    await page.clock.runFor(60000);
    assert.equal(await pose(page),'stand','reduced motion never changes pose');
    console.log('PASS interaction, idle, persistence, reduced motion:',file);
    await ctx.close();
  }
  // Test fixtures only. Production dialogue remains entirely in guide.json.
  const ctx=await context();
  const page=await open(ctx,'guide.html?lang=en#momijidani-entrance');
  await page.clock.runFor(2000);
  await page.evaluate(()=>window.Momonga.setData({momonga_lines:[{text:'QA-JA',text_en:'QA-EN'}]}));
  await tap(page,pet); await page.clock.runFor(280);
  assert.equal(await page.locator('.momonga-dialogue').textContent(),'QA-EN');
  await safe(page);
  await page.evaluate(()=>window.Momonga.setData({momonga_lines:[{text:'QA-JA'}]}));
  await tap(page,pet); await page.clock.runFor(280);
  assert.equal(await page.locator('.momonga-dialogue').textContent(),'QA-JA','English falls back to approved Japanese');
  await page.evaluate(()=>window.Momonga.setData({momonga_lines:['<img src=x onerror="window.qaInjected=true">']}));
  await tap(page,pet); await page.clock.runFor(280);
  assert.equal(await page.locator('.momonga-dialogue img').count(),0);
  assert.equal(await page.evaluate(()=>window.qaInjected),undefined);
  console.log('PASS Notion-only dialogue, language fallback, text-only rendering');
  await ctx.close();
  for (const [name,url,width,scheme] of [
    ['top-mobile','top.html',390,'light'],
    ['guide-mobile','guide.html?lang=ja#momijidani-entrance',390,'light'],
    ['top-desktop','top.html',1280,'light'],
    ['guide-desktop-en-dark','guide.html?lang=en#momijidani-entrance',1280,'dark']
  ]) {
    const ctx=await context({viewport:{width,height:width===390?844:900},colorScheme:scheme});
    const page=await open(ctx,url);
    await page.clock.runFor(2000);
    await safe(page);
    await page.screenshot({path:path.join(output,name+'.png'),animations:'disabled'});
    if(width===390) {
      await tap(page,'.momonga-rest');
      await safe(page);
      await page.screenshot({path:path.join(output,name+'-resting.png'),animations:'disabled'});
    }
    await ctx.close();
  }
  // Real elapsed time and a real CSS glide, recorded as frames for the PR GIF.
  const film=await context();
  const live=await open(film,'top.html',false);
  await until(async()=>await pose(live)==='crouch','real-time movement starts');
  await fs.mkdir(path.join(output,'frames'),{recursive:true});
  for(let i=0;i<32;i++) {
    await safe(live);
    await live.screenshot({path:path.join(output,'frames',String(i).padStart(3,'0')+'.png')});
    await hostWait(60);
  }
  await film.close();
  assert.deepEqual(failures,[],'no browser JavaScript errors');
  await fs.writeFile(path.join(output,'checks.json'),JSON.stringify({passed:true,screenshots:6,realMotionFrames:32,laneHeight:90,characterSize:80,iconSize:44,browser:browser.version()},null,2));
  console.log('PASS screenshots and real-time motion frames:',output);
} finally { await browser.close(); }
