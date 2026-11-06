/** Regression for mobile win/copy layout. Serves the committed export at a subpath.
 * node scripts/check-result-layout.mjs <playwright/index.mjs> [chromium|webkit] [output-dir]
 * Browser binaries and tools can live in test/scratch/; no app dependencies are added.
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const playwright = await import(process.argv[2] ? pathToFileURL(resolve(process.argv[2])).href : 'playwright');
const browserName = process.argv[3] || 'chromium';
const output = resolve(process.argv[4] || 'test/scratch/result-layout');
await mkdir(output, { recursive: true });
const root = resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://preview.local').pathname);
    assert(path.startsWith('/preview/'));
    const file = resolve(root, path.slice('/preview/'.length) || 'index.html');
    assert(file.startsWith(root + '/'));
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' }).end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/preview/`;
const results = { browser: browserName, at: new Date().toISOString(), scenarios: [], errors: [], resourceErrors: [] };
const keys = { R: 'ArrowRight', D: 'ArrowDown', L: 'ArrowLeft', U: 'ArrowUp' };
const moves = 'RRDDDDDLLUURRRRUUUDDDDR';
let browser;
const geometry = page => page.evaluate(() => {
  const box = selector => {
    const r = document.querySelector(selector).getBoundingClientRect();
    return { top: r.top + scrollY, bottom: r.bottom + scrollY, height: r.height, width: r.width };
  };
  return {
    hud: box('.hud'), board: box('.board'), result: box('.result'), controls: box('.controls'),
    position: getComputedStyle(document.querySelector('.result')).position,
    margin: getComputedStyle(document.querySelector('.result')).marginBlockStart,
    viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
  };
});
const unobscured = g => {
  assert(g.result.top >= g.board.bottom + 11, 'result must be below the board with a 12px gap');
  assert(g.result.top >= g.hud.bottom, 'result must not cover the goal, route or counters');
  assert(g.controls.top >= g.result.bottom + 11, 'controls must flow below the entire result');
  assert(g.scrollWidth <= g.viewport, 'no horizontal overflow');
};
try {
  browser = await playwright[browserName].launch({ headless: true });
  for (const width of [320, 390, 480]) for (const lang of ['en', 'zh']) for (const clipboard of ['success', 'denied']) {
    const scenario = { width, lang, clipboard, passed: false };
    const context = await browser.newContext({ viewport: { width, height: width === 320 ? 700 : 844 }, hasTouch: true, reducedMotion: 'reduce' });
    try {
      await context.addInitScript(({ lang, clipboard }) => {
        localStorage.setItem('sbr:prefs', JSON.stringify({ lang, sound: false }));
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
          writeText: async value => {
            if (clipboard === 'denied') throw new DOMException('Clipboard permission denied', 'NotAllowedError');
            window.__copied = value;
          },
        } });
      }, { lang, clipboard });
      const page = await context.newPage();
      page.on('pageerror', e => results.errors.push(e.message));
      page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) results.resourceErrors.push(`${r.status()} ${new URL(r.url()).pathname}`); });
      await page.route('https://api.squeekchain.com/v1/status', route => route.abort());
      await page.goto(base);
      await page.locator('.board').waitFor();
      if (width === 390) {
        scenario.firstScreen = await page.evaluate(() => ({ board: document.querySelector('.board').getBoundingClientRect().bottom, pad: document.querySelector('.pad').getBoundingClientRect().bottom, height: innerHeight }));
        assert(scenario.firstScreen.board <= scenario.firstScreen.height && scenario.firstScreen.pad <= scenario.firstScreen.height);
      }
      for (const move of moves) await page.keyboard.press(keys[move]);
      await page.locator('.result.won').waitFor();
      assert.match(await page.locator('.board').getAttribute('aria-label'), /23/);
      scenario.beforeCopy = await geometry(page);
      // Exercise sharing even on the broken build, to capture the reported expanded state.
      await page.locator('.result-actions .btn').nth(1).tap();
      const input = page.locator('.result .copy-msg input');
      await input.waitFor();
      const expected = lang === 'en' ? (clipboard === 'success' ? 'Link copied' : 'Copy failed. Select the link below.') : (clipboard === 'success' ? '链接已复制' : '复制失败，请手动选择下方链接。');
      assert.equal((await page.locator('.result .copy-msg').innerText()).trim(), expected);
      const link = await input.inputValue();
      assert.equal(new URL(link).hash, `#level?l=1&v=n&m=${moves}`);
      if (clipboard === 'success') assert.equal(await page.evaluate(() => window.__copied), link);
      scenario.afterCopy = await geometry(page);
      if (width === 320 && lang === 'en') {
        await page.evaluate(() => scrollTo(0, 0));
        scenario.screenshot = `${browserName}-320-${clipboard}.png`;
        await page.screenshot({ path: resolve(output, scenario.screenshot), fullPage: true });
      }
      unobscured(scenario.beforeCopy);
      unobscured(scenario.afterCopy);
      assert.equal(scenario.afterCopy.hud.top, scenario.beforeCopy.hud.top);
      assert.equal(scenario.afterCopy.hud.height, scenario.beforeCopy.hud.height);
      assert.equal(scenario.afterCopy.board.top, scenario.beforeCopy.board.top);
      await input.focus();
      assert.equal(await input.evaluate(el => el.selectionEnd - el.selectionStart), link.length, 'fallback URL can be selected completely');
      await page.locator('.result-actions .btn.primary').tap();
      assert.equal(await page.locator('.result').count(), 0, 'Next level removes the result');
      await page.goto(link);
      assert.match(await page.locator('.replay').innerText(), lang === 'en' ? /Replay verified/ : /已在本浏览器重放验证/);
      scenario.passed = true;
    } catch (error) {
      scenario.failure = error.message;
      process.exitCode = 1;
    } finally {
      results.scenarios.push(scenario);
      await context.close();
    }
  }
  assert.equal(results.errors.length, 0);
  assert.equal(results.resourceErrors.length, 0);
} catch (error) {
  results.failure = error.message;
  process.exitCode = 1;
} finally {
  await browser?.close();
  await new Promise(r => server.close(r));
  await writeFile(resolve(output, `${browserName}-results.json`), JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify({ browser: browserName, passed: results.scenarios.filter(s => s.passed).length, total: results.scenarios.length, errors: results.errors, failures: results.scenarios.filter(s => !s.passed).map(({ width, lang, clipboard, failure }) => ({ width, lang, clipboard, failure })), failure: results.failure }, null, 2));
}
