import { mkdir } from 'node:fs/promises';
import { once } from 'node:events';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { markersFor, readEventLedger } from '../../scripts/event-ledger.mjs';
import { createMatchaServer } from './server.mjs';

const ledger = await readEventLedger('events.json');
const actions = markersFor(ledger, 'webProgress').filter(marker => marker.phase === 'action');
const shots = [['opening', 0], ...actions.map(({ eventId, at }) => [eventId, at])];
const out = resolve(process.argv[2] ?? '../../docs/screenshots');
await mkdir(out, { recursive: true });
const server = createMatchaServer().listen(0, '127.0.0.1');
await once(server, 'listening');
const browser = await chromium.launch({
  executablePath: process.env.AOAWA_CHROMIUM || chromium.executablePath(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  for (const [name, width, height] of [['mobile', 375, 844], ['tablet', 768, 900], ['desktop', 1280, 900]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (!response.ok()) errors.push(response.status() + ' ' + response.url()); });
    page.on('console', message => { if (message.type() === 'warning') console.log(name, message.text()); });
    await page.goto('http://127.0.0.1:' + server.address().port);
    await page.locator('.visual[data-renderer="ready"]').waitFor({ timeout: 15000 });
    await page.evaluate(() => document.fonts.ready);

    for (const [state, progress] of shots) {
      const layout = await page.evaluate(async p => {
        const story = document.querySelector('.story');
        const stage = document.querySelector('.stage');
        scrollTo({ top: (story.offsetHeight - stage.offsetHeight) * p, behavior: 'instant' });
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return { overflow: document.documentElement.scrollWidth > innerWidth, chapter: stage.dataset.chapter };
      }, progress);
      if (layout.overflow) errors.push('Horizontal overflow at ' + state);
      if (state !== 'opening' && state !== layout.chapter) errors.push('Incorrect chapter at ' + state);
      await page.screenshot({ path: join(out, name + '-' + state + '.png') });
    }
    const fonts = await page.evaluate(() => [...document.fonts].map(font => [font.family, font.style, font.status]));
    console.log(JSON.stringify({ name, fonts, errors }));
    if (errors.length) process.exitCode = 1;
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
