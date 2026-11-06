/** Bounded production-export interaction checks; no project dependencies are changed.
 * Usage: node scripts/check-browser.mjs path/to/playwright/index.mjs [chromium|webkit] [--live]
 * PLAYWRIGHT_BROWSERS_PATH can name your own temporary browser install.
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ts from 'typescript';
const runFile = promisify(execFile);
const scratch = resolve('test/scratch/browser-check');
await mkdir(scratch, { recursive:true });
// Compile the same pure engine used by the export to generate winning input sequences.
for (const name of ['engine','levels','challenge','solver']) {
  let code = ts.transpileModule(await readFile(`src/game/${name}.ts`,'utf8'), { compilerOptions:{ target:ts.ScriptTarget.ES2020, module:ts.ModuleKind.ES2020 } }).outputText;
  code = code.replace(/from '(\.\/[^']+)'/g, "from '$1.mjs'");
  await writeFile(`${scratch}/${name}.mjs`, code);
}
const { boardFor, definitionFor, settlementSeed, dailyV2Seed, dailySeed, shareHash } = await import(pathToFileURL(`${scratch}/challenge.mjs`));
const { solve } = await import(pathToFileURL(`${scratch}/solver.mjs`));
const fixture = JSON.parse(await readFile('tests/settlement-status-2026-11-06.json','utf8'));
const apiURL = fixture.source;
const liveURL = 'https://squeek-burrow-rescue-squeekchain.imd.site/';
const playwright = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : 'playwright');
const browserName = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : 'chromium';
const results = { browser:browserName, at:new Date().toISOString(), scenarios:[], errors:[], resourceErrors:[], screenshots:[], geometry:[], live:null };
const contentTypes = { '.html':'text/html', '.js':'application/javascript', '.mjs':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png' };
const server = createServer(async(req,res) => {
  try {
    const path = decodeURIComponent(new URL(req.url,'http://preview.local').pathname);
    if (!path.startsWith('/preview/')) { res.writeHead(404).end(); return; }
    const file = resolve('dist', path.slice('/preview/'.length) || 'index.html');
    if (!file.startsWith(resolve('dist') + '/')) { res.writeHead(403).end(); return; }
    const bytes = await readFile(file);
    res.setHeader('content-type',contentTypes[extname(file)] ?? 'application/octet-stream');
    res.end(bytes);
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0,'127.0.0.1',r));
const base = `http://127.0.0.1:${server.address().port}/preview/`;
let browser;
// A curl transport bridge for external resources: fresh public HTTP bytes, never fake API data.
// This handles environments where Chromium's direct external requests return ERR_EMPTY_RESPONSE.
let curlRequestIndex = 0;
async function curlResource(url) {
  const headersPath = `${scratch}/curl-headers-${curlRequestIndex++}.txt`;
  const { stdout } = await runFile('curl',['-sS','-L','-A','Mozilla/5.0','--max-time','25','-D',headersPath,'-w','\n%{http_code}',url], { encoding:'buffer', maxBuffer:8*1024*1024 });
  const split = stdout.lastIndexOf(10);
  const status = Number(stdout.subarray(split+1).toString());
  if (status !== 200) throw new Error(`HTTP ${status}: ${url}`);
  const headers = {};
  for (const line of (await readFile(headersPath,'utf8')).split(/\r?\n/)) {
    const m = /^access-control-allow-origin:\s*(.+)/i.exec(line);
    if (m) headers['access-control-allow-origin'] = m[1];
  }
  await unlink(headersPath);
  return { status, body:stdout.subarray(0,split), headers };
}
const keys = { U:'ArrowUp',D:'ArrowDown',L:'ArrowLeft',R:'ArrowRight' };
const names = { U:'Move up',D:'Move down',L:'Move left',R:'Move right' };
const solution = a => solve(boardFor(a),a.variant, definitionFor(a).par[a.variant] + 8).moves;
try {
  browser = await playwright[browserName].launch({ headless:true });
  let mode = 'nap';
  let anchor = fixture.builder.anchor.transactionHash;
  const context = await browser.newContext({ viewport:{width:390,height:844}, hasTouch:true, isMobile:browserName === 'chromium', ignoreHTTPSErrors:true, reducedMotion:'reduce' });
  await context.addInitScript(() => {
    Object.defineProperty(navigator,'clipboard',{ value:{ writeText:async(value) => { window.__copied = value; } }, configurable:true });
    localStorage.setItem('sbr:prefs',JSON.stringify({ lang:'en',sound:false }));
  });
  const page = await context.newPage();
  page.on('pageerror', e => results.errors.push(e.message));
  page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) results.resourceErrors.push(`${r.status()} ${new URL(r.url()).pathname}`); });
  await page.route(apiURL, async(route) => {
    if (mode === 'offline') return route.abort();
    if (mode === 'real') {
      const live = await curlResource(apiURL);
      return route.fulfill({ ...live, contentType:'application/json' });
    }
    const body = { measurement:{ ...fixture.measurement, coreStatus:mode === 'wheel' ? 'SPINNING':'IDLE', rpmMilli:mode === 'wheel' ? 42000:0, observedAt:new Date(mode === 'stale' ? Date.now()-300000 : Date.now()).toISOString(), freshness:mode === 'stale' ? 'stale':'online', staleAfterSeconds:120 }, builder:{ anchor:{ ...fixture.builder.anchor, transactionHash:mode === 'no-anchor' ? null : anchor } } };
    return route.fulfill({ json:body, headers:{'access-control-allow-origin':'*'} });
  });
  const label = () => page.locator('.board').getAttribute('aria-label');
  const currentHash = () => page.evaluate(() => document.querySelector('.source-details code')?.textContent ?? document.querySelector('#settlement-h')?.parentElement.querySelector('code')?.textContent);
  const click = name => page.getByRole('button',{name,exact:true}).first().click();
  const check = async(name,fn) => { await fn(); results.scenarios.push({name,passed:true}); };
  const shot = async(name) => { await page.evaluate(() => scrollTo(0,0)); const path = `${scratch}/${browserName}-${name}.png`; await page.screenshot({path,fullPage:false}); results.geometry.push(await page.evaluate((name) => ({name,width:innerWidth,height:innerHeight,boardBottom:document.querySelector('.board').getBoundingClientRect().bottom,padBottom:document.querySelector('.pad').getBoundingClientRect().bottom,overflow:document.documentElement.scrollWidth>innerWidth}),name)); results.screenshots.push(path.replace(resolve('.')+'/','')); };
  await check('390 first screen exposes product, board and touch d-pad',async() => {
    await page.goto(base);
    await page.waitForFunction(() => document.querySelector('.rules h2')?.textContent?.includes('live state'));
    assert.match(await page.title(),/Squeek Burrow Rescue/);
    const visible = await page.evaluate(() => ({ board:document.querySelector('.board').getBoundingClientRect().bottom, pad:document.querySelector('.pad').getBoundingClientRect().bottom, h:innerHeight, overflow:document.documentElement.scrollWidth > innerWidth }));
    assert(visible.board <= visible.h && visible.pad <= visible.h);
    assert(!visible.overflow);
    await shot('390');
  });
  let napLink;
  await check('first-level touch win, stars, route progress and copied legacy result',async() => {
    const a = { kind:'level',level:0,sym:0,variant:'nap' };
    for (const d of solution(a)) await page.getByRole('button',{ name:names[d],exact:true }).tap();
    await page.locator('.result.won').waitFor();
    assert.match(await page.locator('.result').innerText(),/23 moves/);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('sbr:progress'))['L1:nap'].stars),3);
    await click('Copy result link');
    napLink = await page.evaluate(() => window.__copied);
    assert(napLink.includes('#level?l=1&v=n&m='));
    await shot('win');
  });
  await check('legacy result verifies offline; watching changes no progress',async() => {
    mode = 'offline';
    await page.goto(napLink);
    assert.match(await page.locator('.replay').innerText(),/Replay verified/);
    const before = await page.evaluate(() => localStorage.getItem('sbr:progress'));
    await click('Watch verified replay');
    await page.waitForFunction(() => document.querySelector('.board')?.getAttribute('aria-label')?.includes('Moves: 23/'),null,{timeout:12000});
    assert.equal(await page.evaluate(() => localStorage.getItem('sbr:progress')),before);
    await click('Return to your attempt');
    assert.match(await label(),/Moves: 0\//);
  });
  await check('first-level Wheel win using WASD and separate route completion',async() => {
    mode='wheel';
    await page.goto(base);
    await page.waitForFunction(() => document.querySelector('.hud .chip')?.textContent === 'Wheel route');
    const a = { kind:'level',level:0,sym:0,variant:'wheel' };
    for (const d of solution(a)) await page.keyboard.press({U:'w',D:'s',L:'a',R:'d'}[d]);
    await page.locator('.result.won').waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('sbr:progress'))['L1:wheel'].stars),3);
    assert.equal(await page.locator('.hud .chip').evaluate(el => el.getBoundingClientRect().height),28);
  });
  await check('real settlement hash starts a deterministic, frozen rescue',async() => {
    mode='real';
    await page.goto(base);
    await page.waitForFunction(() => !document.querySelector('.modes button:last-child').disabled);
    await click('Play settlement rescue');
    anchor = await currentHash();
    assert.match(anchor,/^0x[0-9a-f]{64}$/);
    const before = await label();
    results.realSettlement = { anchor, attempt:settlementSeed(anchor) };
    mode='wheel';
    await click('Check now');
    assert.equal(await label(),before);
    await click('Restart');
    assert.equal(await label(),before);
    assert.equal(await currentHash(),anchor);
    await shot('settlement');
  });
  let settlementLink;
  await check('real settlement rescue win and self-contained result sharing',async() => {
    const a = settlementSeed(anchor);
    for (const d of solution(a)) await page.keyboard.press(keys[d]);
    await page.locator('.result.won').waitFor();
    await click('Copy result link');
    settlementLink = await page.evaluate(() => window.__copied);
    assert(settlementLink.includes('#settlement?g=1&a='+anchor));
    mode='offline';
    await page.evaluate(() => { localStorage.removeItem('sbr:settlement'); localStorage.removeItem('sbr:progress'); });
    await page.goto(settlementLink);
    await page.reload();
    assert.equal(await page.evaluate(() => localStorage.getItem('sbr:settlement')),null);
    assert.equal(await page.evaluate(() => localStorage.getItem('sbr:progress')),null);
    assert.match(await page.locator('.replay').innerText(),/Replay verified/);
    assert.equal(await currentHash(),anchor);
    await shot('settlement-replay');
    await page.locator('#settlement-h').scrollIntoViewIfNeeded();
    const sourcePath = `${scratch}/${browserName}-settlement-source.png`;
    await page.screenshot({path:sourcePath});
    results.screenshots.push(sourcePath.replace(resolve('.')+'/',''));
    const renderedHash = await page.locator('#settlement-h').locator('..').locator('code').evaluate(el => ({text:el.textContent,wrap:getComputedStyle(el).overflowWrap,width:el.getBoundingClientRect().width,scroll:el.scrollWidth}));
    assert.equal(renderedHash.text,anchor);
    assert.equal(renderedHash.wrap,'anywhere');
    assert(renderedHash.scroll <= renderedHash.width+1);
  });
  await check('new Daily is date-only and Play Daily opens today from an older v2 link',async() => {
    mode='wheel';
    const old = dailyV2Seed('2026-10-29');
    await page.goto(base+shareHash(old,solution(old)));
    assert.match(await label(),/2026-10-29/);
    assert.match(await page.locator('.replay').innerText(),/Replay verified/);
    await click('Play daily challenge');
    assert((await label()).includes(new Date().toISOString().slice(0,10)));
    assert.equal(await page.locator('.hud .chip').innerText(),'Nap route');
    await click('Share challenge');
    const shared = await page.evaluate(() => window.__copied);
    assert(shared.includes('#daily?g=2&d='));
    assert(!shared.includes('&a='));
  });
  await check('legacy anchored Daily still verifies; its Play Daily opens today',async() => {
    mode='offline';
    const seed = dailySeed('2026-10-29',fixture.builder.anchor.transactionHash);
    const a = {kind:'daily',...seed,variant:'nap'};
    await page.goto(base+shareHash(a,solution(a)));
    assert.match(await page.locator('.replay').innerText(),/Replay verified/);
    assert((await page.locator('#daily-h').locator('..').innerText()).includes(fixture.builder.anchor.transactionHash));
    await click('Play daily challenge');
    assert((await label()).includes(new Date().toISOString().slice(0,10)));
  });
  await check('stale practice freezes through move and Undo; Restart snapshots recovery',async() => {
    mode='stale';
    await page.goto(base);
    await page.getByText('Stale: older than the API freshness limit',{exact:true}).waitFor();
    assert.match(await page.locator('.rules h2').innerText(),/Practice mode/);
    await page.keyboard.press('ArrowDown');
    await click('Undo');
    mode='wheel';
    await click('Check now');
    await page.getByText('Fresh',{exact:true}).waitFor();
    assert.equal(await page.locator('.hud .chip').innerText(),'Nap route');
    await click('Restart');
    assert.equal(await page.locator('.hud .chip').innerText(),'Wheel route');
  });
  await check('next-move worker gives a usable hint and strategy is expandable',async() => {
    mode='offline';
    await page.goto(base);
    await click('Get next-move hint');
    await page.waitForFunction(() => document.querySelector('.hint-message')?.textContent?.startsWith('Try moving'));
    await page.locator('.strategy summary').click();
    assert.match(await page.locator('.strategy').innerText(),/Walk onto each pup/);
  });
  await check('missing anchor disables Settlement while Daily remains playable',async() => {
    mode='no-anchor';
    await page.evaluate(() => localStorage.removeItem('sbr:settlement'));
    await page.goto(base);
    await page.getByText('Fresh',{exact:true}).waitFor();
    assert.equal(await page.locator('.modes button:last-child').isDisabled(),true);
    assert.match(await page.locator('#settlement-h').locator('..').innerText(),/No valid settlement hash yet/);
    await click('Play daily challenge');
    assert.equal(await page.locator('.hud .chip').innerText(),'Nap route');
  });
  await check('crate corner warnings and beetle predictions appear on the board',async() => {
    mode='offline';
    await page.goto(base+'#level?l=2&v=n');
    await page.waitForFunction(() => document.querySelector('.board')?.getAttribute('aria-label')?.startsWith('Level 2') && document.querySelector('.board')?.getAttribute('aria-label')?.includes('Moves: 0/'));
    for (const d of 'DDRURUL') await page.keyboard.press(keys[d]);
    await page.locator('.stuck-crate').waitFor();
    assert.match(await page.locator('.warning').innerText(),/Crate in a dead corner/);
    await click('Undo');
    assert.equal(await page.locator('.stuck-crate').count(),0);
    await page.goto(base+'#level?l=3&v=n');
    await page.locator('.beetle-arrow').waitFor();
    assert.equal(await page.locator('.beetle-arrow').count(),1);
    await shot('beetle');
  });
  await check('Chinese, dialog keyboard focus, reduced motion and reflow',async() => {
    await click('Switch to Chinese');
    assert.equal(await page.locator('html').getAttribute('lang'),'zh-CN');
    await page.getByRole('button',{name:'玩法说明',exact:true}).click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog[open]').count(),0);
    assert.equal(await page.evaluate(() => document.activeElement.textContent),'玩法说明');
    await shot('zh-390');
    for (const width of [320,390,960,1440]) {
      await page.setViewportSize({width,height:width===320?700:900});
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    assert.equal(await page.evaluate(() => document.getAnimations().filter(a=>a.playState==='running'&&a.effect.getTiming().iterations===Infinity).length),0);
    await shot('zh-1440');
    await click('切换到英文');
    await page.setViewportSize({width:1440,height:900});
    await page.goto(base);
    await shot('1440');
  });
  await check('keyboard skip link and 200% text enlargement retain usable reflow',async() => {
    await page.goto(base);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.className),'skip');
    await shot('keyboard-focus');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id),'play');
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(() => document.documentElement.style.fontSize='200%');
    results.textEnlargement = await page.evaluate(() => ({ width:innerWidth, scroll:document.documentElement.scrollWidth, offenders:[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0 && r.right>innerWidth+1 && !el.closest('svg');}).map(el=>({tag:el.tagName,cls:el.className,text:el.textContent.slice(0,60),right:el.getBoundingClientRect().right})).slice(0,12) }));
    await shot('text-200');
    assert(results.textEnlargement.scroll<=results.textEnlargement.width);
    await page.evaluate(() => document.documentElement.style.fontSize='');
  });
  await check('four chapters and all-pups ending with explicit test-only saved progress',async() => {
    assert.equal(await page.locator('.chapters > li').count(),4);
    await page.evaluate(() => localStorage.setItem('sbr:progress',JSON.stringify(Object.fromEntries(Array.from({length:12},(_,i)=>[`L${i+1}`,{stars:1,moves:40}])))));
    await page.reload();
    assert.match(await page.locator('.ending').innerText(),/All 36 pups are home/);
    const endingPath = `${scratch}/${browserName}-ending.png`;
    await page.locator('.ending').screenshot({path:endingPath});
    results.screenshots.push(endingPath.replace(resolve('.')+'/',''));
  });
  if (process.argv.includes('--live')) {
    const liveContext = await browser.newContext({viewport:{width:390,height:844},ignoreHTTPSErrors:true});
    await liveContext.addInitScript(() => localStorage.setItem('sbr:prefs',JSON.stringify({lang:'en',sound:false,practice:true,route:'nap'})));
    const livePage = await liveContext.newPage();
    const fetched = [];
    await livePage.route('https://**/*',async(route) => {
      const url=route.request().url();
      if (!url.startsWith(liveURL) && url !== apiURL) return route.abort();
      const reply=await curlResource(url);
      fetched.push({url,status:reply.status});
      const type=url===apiURL?'application/json':contentTypes[extname(new URL(url).pathname)] ?? 'text/html';
      return route.fulfill({...reply,contentType:type});
    });
    await livePage.goto(liveURL,{waitUntil:'networkidle'});
    await livePage.locator('.board').waitFor();
    for (const d of solution({kind:'level',level:0,sym:0,variant:'nap'})) await livePage.keyboard.press(keys[d]);
    await livePage.locator('.result.won').waitFor();
    const path=`${scratch}/${browserName}-live.png`;
    await livePage.screenshot({path});
    const liveReplay = shareHash({kind:'level',level:0,sym:0,variant:'nap'},solution({kind:'level',level:0,sym:0,variant:'nap'}));
    await livePage.goto(liveURL+liveReplay,{waitUntil:'networkidle'});
    assert.match(await livePage.locator('.replay').innerText(),/Replay verified/);
    const hasNewMode=await livePage.getByRole('button',{name:'Settlement Rescue',exact:true}).count()>0;
    results.live={url:liveURL,transport:'fresh curl public HTTP resources rendered at the live origin; direct browser transport unavailable',title:await livePage.title(),firstLevelWin:true,verifiedReplay:true,hasNewMode,fetched,screenshot:path.replace(resolve('.')+'/',''),publication:hasNewMode?'new mode detected; inspect version':'existing legacy build; new export awaits assignment publisher'};
    await liveContext.close();
  }
  await context.close();
  assert.equal(results.errors.length,0);
  assert.equal(results.resourceErrors.length,0);
} catch (e) {
  results.failure=String(e?.stack ?? e);
  process.exitCode=1;
} finally {
  await browser?.close();
  await new Promise(r=>server.close(r));
  await writeFile(`${scratch}/${browserName}-results.json`,JSON.stringify(results,null,2)+'\n');
  console.log(JSON.stringify(results,null,2));
}
