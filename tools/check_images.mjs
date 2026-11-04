/* Local browser QA; Playwright is a work-only dependency, never shipped to visitors. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.BASE_URL||'http://127.0.0.1:8766';
const out=path.resolve(process.env.QA_OUTPUT||'artifacts/ai-images');
await fs.mkdir(out,{recursive:true});
const data=JSON.parse(await fs.readFile('guide.json','utf8'));
const credits=JSON.parse(await fs.readFile('photos/credits.json','utf8'));
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});
const errors=[],badImages=[];
async function open(url,{width=390,scheme='light'}={}) {
  const ctx=await browser.newContext({viewport:{width,height:width===390?844:900},colorScheme:scheme,reducedMotion:'reduce'});
  await ctx.route('**/*',r=>new URL(r.request().url()).origin!==base&&!['GET','HEAD'].includes(r.request().method())?r.abort():r.continue());
  const page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().startsWith(base+'/photos/')&&r.status()>=400)badImages.push(r.url());});
  await page.goto(base+'/'+url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('.momonga-rest'));
  if(url.startsWith('guide'))await page.waitForFunction(()=>document.querySelector('#photo img,#photo .ph'));
  else await page.waitForFunction(()=>G&&Object.keys(CRED).length);
  return {ctx,page};
}
async function loaded(page,selector) {
  await page.locator(selector).evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
}
try {
  assert.equal(Object.keys(credits).length,18);
  // Every delivered landscape image and regenerated thumbnail can actually be decoded by Chrome.
  const {ctx,page}=await open('top.html');
  const gallery=await page.evaluate(()=>Object.fromEntries(Object.entries(GALLERY).map(([id,list])=>[id,list.map(x=>({path:photoSrc(id,x),caption:x.c}))])));
  for(const [id,list] of Object.entries(gallery))for(const image of list) {
    assert.equal(image.caption,credits[image.path].caption);
    assert.ok(credits[image.path].ai_generated);
  }
  for(const file of Object.keys(credits)) {
    const result=await page.evaluate(async file=>{
      for(const src of [file,file.replace(/\.jpg$/,'-thumb.jpg')]) {
        const image=new Image();image.src=src;await image.decode();
        if(!image.naturalWidth)throw new Error(src);
      }
      return true;
    },file);
    assert.ok(result);
  }
  // Missing seasons stay pending instead of silently using a different season or a substitute photo.
  for(const season of ['spring','summer','autumn','winter']) {
    await page.evaluate(season=>show(SLIDES.findIndex(x=>x.s===season)),season);
    for(const point of data.points) {
      const state=await page.evaluate(id=>({markup:scene(id,true),gallery:gallery(id)}),point.id);
      if(point.photos[season]) assert.ok(state.markup.includes(point.photos[season]));
      else {
        assert.ok(state.markup.includes('準備中'));
        assert.ok(!state.markup.includes('<img')&&!state.markup.includes('<svg'));
        assert.ok(state.gallery.includes('準備中'));
      }
    }
  }
  await page.evaluate(()=>show(SLIDES.findIndex(x=>x.s==='winter')));
  assert.ok((await page.locator('#credit').textContent()).includes('温泉街'));
  assert.ok(!(await page.locator('#credit').textContent()).includes('氷瀑まつり'));
  assert.ok((await page.locator('#credit').textContent()).includes('AIで作った季節のイメージ'));
  // Open the place sheet and select an approved image from another season.
  await page.evaluate(()=>openPlace(G.points.find(p=>p.id==='momijidani-entrance')));
  assert.equal(await page.locator('.bigph .photo-pending').textContent(),'準備中');
  await page.locator('.gal button').first().click();
  await loaded(page,'.bigph img');
  assert.ok((await page.locator('.bigph + .k').textContent()).includes('AIで作った季節のイメージ'));
  await ctx.close();
  let seasonsChecked=0;
  for(const point of data.points)for(const lang of ['ja','en']) {
    const {ctx,page}=await open('guide.html?lang='+lang+'#'+point.id);
    for(const season of ['spring','summer','autumn','winter']) {
      await page.locator('#seasons button[data-s="'+season+'"]').click();
      const expected=point.photos[season];
      if(expected) {
        await loaded(page,'#photo img');
        assert.equal(await page.locator('#photo img').getAttribute('src'),expected);
        const credit=point.photo_credits[season];
        assert.ok((await page.locator('#photo .pcred').textContent()).includes(lang==='en'?credit.credit_en:credit.credit));
        assert.equal(await page.locator('#photo .pcred a').first().getAttribute('href'),credit.source_url);
      } else {
        assert.equal(await page.locator('#photo img').count(),0);
        assert.ok((await page.locator('#photo .ph').textContent()).includes(lang==='ja'?'準備中':'coming soon'));
      }
      seasonsChecked++;
    }
    await ctx.close();
  }
  for(const [name,url,width,scheme] of [
    ['top-mobile','top.html',390,'light'],['guide-mobile','guide.html?lang=ja#naming-1921',390,'light'],
    ['pending-mobile','guide.html?lang=ja#momiji-falls',390,'light'],
    ['top-desktop','top.html',1280,'light'],['guide-desktop-en-dark','guide.html?lang=en#naming-1921',1280,'dark']
  ]) {
    const {ctx,page}=await open(url,{width,scheme});
    if(url.startsWith('top'))await page.evaluate(()=>show(SLIDES.findIndex(x=>x.s==='winter')));
    else await page.locator('#seasons button[data-s="winter"]').click();
    await loaded(page,url.startsWith('top')?'.scene.on img':'#photo img');
    await page.screenshot({path:path.join(out,name+'.png'),animations:'disabled'});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await ctx.close();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(badImages,[]);
  const result={passed:true,landscapeImages:18,thumbnails:18,missingSeasonalPaths:6,guideSeasonLanguageChecks:seasonsChecked,screenshots:5,browser:browser.version()};
  await fs.writeFile(path.join(out,'checks.json'),JSON.stringify(result,null,2)+'\n');
  console.log(result);
} finally {await browser.close();}
