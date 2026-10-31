// Regional events must remain readable and reachable when map details stack
// below the map on phones. Exercise the real event renderer and map controls.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'outputs/region-events');
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (error, data) => {
    if (error) return res.writeHead(404).end();
    res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.UEBH_BROWSER_EXECUTABLE || undefined });
  const errors = [], results = [];
  try {
    for (const [width, height] of [[320, 740], [390, 844], [662, 706], [844, 390], [768, 1024], [1440, 1000]]) {
      for (const language of ['zh', 'en']) {
        const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', hasTouch: width < 1000 });
        const page = await context.newPage();
        page.on('pageerror', error => errors.push(error.message));
        try {
          await page.goto(`http://127.0.0.1:${server.address().port}`);
          await page.evaluate(language => {
            Tutorial.preferences.hints = false; Tutorial.dismissInvitation();
            document.getElementById('btn-start-game').click(); I18n.setLanguage(language);
            Dice.rollEvents = () => [1, 3, 5, 1];
            Events.processEventDay();
          }, language);
          await page.evaluate(() => document.fonts.ready);

          async function checkEvents(region, expected) {
            await page.locator(`[data-atlas-region="${region}"]`).click();
            const visibleEvents = page.locator('#atlas-current-events .region-events:not([hidden])');
            assert.equal(await visibleEvents.count(), 1, 'Show events only for the selected region.');
            assert.equal(await visibleEvents.getAttribute('id'), `${region}-events`);
            assert.deepEqual(await visibleEvents.locator('.region-event-tag').evaluateAll(tags => tags.map(tag => tag.classList[1])), expected);
            assert.equal(await page.locator('#atlas-event-region').innerText(), await page.evaluate(region => I18n.language === 'en' ? I18n.translateString(GAME_DATA.regions[region].nameZh) : GAME_DATA.regions[region].nameZh, region));
            const metrics = await page.evaluate(() => {
              const section = document.getElementById('atlas-current-events'), r = section.getBoundingClientRect();
              const dossier = document.getElementById('atlas-dossier').getBoundingClientRect();
              const fields = [...section.querySelectorAll('.region-events:not([hidden]) .region-event-tag, .region-events:not([hidden]) .region-event-tag > *')];
              return {
                overflow: document.documentElement.scrollWidth > innerWidth + 1,
                clipped: fields.some(el => { const b = el.getBoundingClientRect(); return b.width <= 0 || b.height <= 0 || b.left < r.left - 1 || b.right > r.right + 1 || el.scrollWidth > el.clientWidth + 1; }),
                // The entire section must fit above the phone's fixed actions.
                reachable: innerWidth > 760 || (r.top >= 0 && r.bottom <= document.querySelector('.action-bar').getBoundingClientRect().top + 1),
                fullWidth: innerWidth > 760 || r.width > dossier.width * .8,
                untranslated: document.documentElement.lang === 'en' && /[\u3400-\u9fff]/.test(section.innerText),
                focused: innerWidth > 760 || document.activeElement === section,
              };
            });
            assert.deepEqual(metrics, { overflow: false, clipped: false, reachable: true, fullWidth: true, untranslated: false, focused: true }, `${width}x${height} ${language} ${region}`);
          }

          await checkEvents('halebeard', ['abundance', 'madness']);
          await checkEvents('coastal', ['clarity']);
          await checkEvents('scar', ['weather']);

          // A new event day replaces the previous events, including empty areas.
          await page.evaluate(() => { Dice.rollEvents = () => [1, 1, 1, 1]; Events.processEventDay(); });
          await checkEvents('coastal', []);
          assert.equal(await page.locator('#coastal-events .region-events-empty').isVisible(), true);
          await checkEvents('halebeard', ['abundance', 'clarity', 'weather', 'madness']);
          const label = `${width}-${height}-${language}`;
          await page.screenshot({ path: path.join(out, `${label}.png`), animations: 'disabled' });
          await page.locator('#atlas-current-events').screenshot({ path: path.join(out, `${label}-events.png`), animations: 'disabled' });

          // Navigation and a real save/load must not detach or duplicate events.
          await page.evaluate(() => { GameState.save(); GameState.activeEvents = { halebeard: [], coastal: [], scar: [] }; GameState.load(); UI.render(); });
          await checkEvents('halebeard', ['abundance', 'clarity', 'weather', 'madness']);
          await page.locator('.atlas-nav [data-atlas-page="village"]').click();
          assert.equal(await page.locator('#atlas-current-events').isVisible(), false);
          await page.locator('.atlas-nav [data-atlas-page="map"]').click();
          assert.equal(await page.locator('#atlas-current-events').isVisible(), true);
          assert.equal(await page.locator('#halebeard-events').count(), 1);
          results.push({ width, height, language, passed: true });
        } finally { await context.close(); }
      }
    }
    fs.writeFileSync(path.join(out, 'checks.json'), JSON.stringify({ results, errors }, null, 2));
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ cases: results.length, errors, passed: true }));
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
