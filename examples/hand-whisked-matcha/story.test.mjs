import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import { chromium } from 'playwright-core';
import { readEventLedger } from '../../scripts/event-ledger.mjs';
import { createMatchaServer } from './server.mjs';

const { events } = await readEventLedger(new URL('events.json', import.meta.url));
const progress = Object.fromEntries(events.map(event => [event.id, event.webProgress]));
let browser;
let server;
let base;

before(async () => {
  server = createMatchaServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({
    executablePath: process.env.AOAWA_CHROMIUM || chromium.executablePath(),
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
});

after(async () => {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
});

const chapter = (page, name) => page.locator('.stage[data-chapter="' + name + '"]').waitFor();
const link = (page, name) => page.locator('.chapters a[href="#' + name + '"]');
const mobile = { width: 375, height: 844 };

test('real wheel input, chapter navigation and replay reach the expected rendered states', async () => {
  const page = await browser.newPage({ viewport: mobile });
  try {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.locator('.visual[data-renderer="ready"]').waitFor();
    await chapter(page, 'sift');
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    const travel = await page.evaluate(() => document.querySelector('.story').offsetHeight - document.querySelector('.stage').offsetHeight);
    const delta = Math.round(travel * progress.pour.action);
    await page.mouse.move(166, 300);
    await page.mouse.wheel(0, delta);
    await chapter(page, 'pour');
    assert.equal(await link(page, 'pour').getAttribute('aria-current'), 'step');
    await page.mouse.wheel(0, -delta);
    await chapter(page, 'sift');
    await page.waitForFunction(() => scrollY === 0);

    await link(page, 'whisk').press('Enter');
    await chapter(page, 'whisk');
    assert.equal(await page.locator('figcaption').textContent(), 'Bamboo whisk · Back and forth');
    await link(page, 'serve').click();
    await page.locator('.stage[data-light]').waitFor();
    await chapter(page, 'serve');
    await page.getByRole('link', { name: 'Make another bowl' }).click();
    await page.waitForFunction(() => scrollY === 0);
    await chapter(page, 'sift');
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test('reduced motion keeps the still inside a chapter and updates it on touch navigation', async () => {
  const page = await browser.newPage({ viewport: mobile, hasTouch: true, reducedMotion: 'reduce' });
  try {
    await page.addInitScript(() => {
      window.aoawaDraws = 0;
      const prototype = WebGL2RenderingContext.prototype;
      for (const method of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
        const draw = prototype[method];
        prototype[method] = function (...parameters) {
          if (this.canvas.matches('.scene')) window.aoawaDraws++;
          return draw.apply(this, parameters);
        };
      }
    });
    await page.goto(base + '/#whisk');
    await page.locator('.visual[data-renderer="ready"]').waitFor();
    await chapter(page, 'whisk');
    const before = await page.evaluate(() => window.aoawaDraws);
    assert.ok(before > 0);
    await page.evaluate(async at => {
      const story = document.querySelector('.story');
      const stage = document.querySelector('.stage');
      scrollTo({ top: (story.offsetHeight - stage.offsetHeight) * at, behavior: 'instant' });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }, progress.whisk.action + .03);
    await chapter(page, 'whisk');
    assert.equal(await page.evaluate(() => window.aoawaDraws), before);
    await link(page, 'serve').tap();
    await chapter(page, 'serve');
    assert.ok(await page.evaluate(() => window.aoawaDraws) > before);
  } finally {
    await page.close();
  }
});

test('WebGL failure preserves chapter navigation and responsive still artwork', async () => {
  const page = await browser.newPage({ viewport: mobile, reducedMotion: 'reduce' });
  try {
    await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...options) {
        if (type.startsWith('webgl')) return null;
        return getContext.call(this, type, ...options);
      };
    });
    await page.goto(base);
    await page.locator('.visual[data-renderer="fallback"]').waitFor();
    const poster = page.locator('.scene-image');
    await poster.evaluate(image => image.decode());
    assert.match(await poster.evaluate(image => image.currentSrc), /sift-mobile\.webp$/);
    await link(page, 'pour').click();
    await chapter(page, 'pour');
    await poster.evaluate(image => image.decode());
    assert.match(await poster.evaluate(image => image.currentSrc), /pour-mobile\.webp$/);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForFunction(() => document.querySelector('.scene-image').currentSrc.endsWith('pour-desktop.webp'));
    await poster.evaluate(image => image.decode());
  } finally {
    await page.close();
  }
});
