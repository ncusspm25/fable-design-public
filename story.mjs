const response = await fetch(new URL('events.json', import.meta.url));
if (!response.ok) throw new Error('Could not load the AOAWA story events.');
const { events } = await response.json();

const story = document.querySelector('.story');
const stage = document.querySelector('.stage');
const visual = document.querySelector('.visual');
const canvas = document.querySelector('.scene');
const poster = document.querySelector('.scene-poster');
const posterSource = poster.querySelector('source');
const posterImage = poster.querySelector('img');
const caption = document.querySelector('figcaption');
const themeColor = document.querySelector('meta[name="theme-color"]');
const articles = [...document.querySelectorAll('.chapter')];
const links = [...document.querySelectorAll('.chapters a')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const labels = ['Bamboo whisk · Ceramic bowl', 'Hot water · Matcha powder', 'Bamboo whisk · Back and forth', 'Whisked matcha · Fine foam'];
const chapters = events.map(({ id, webProgress }, index) => ({
  id, ...webProgress, still: index === 0 ? webProgress.before : webProgress.action,
}));

for (const chapter of chapters) {
  document.getElementById(chapter.id).style.setProperty('--beat', chapter.action);
}

const clamp = value => Math.max(0, Math.min(1, value));
function ease(value) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

let scene;
let fallback = false;
let frameRequest = 0;
let lastFrame;
let lastIndex = -1;
let origin = 0;
let distance = 1;

function selectPoster(index) {
  const base = 'assets/' + chapters[index].id;
  if (posterImage.getAttribute('src') === base + '-desktop.webp') return;
  posterSource.srcset = base + '-mobile.webp';
  posterImage.src = base + '-desktop.webp';
}

function showFallback() {
  fallback = true;
  scene = undefined;
  canvas.hidden = true;
  poster.hidden = false;
  visual.dataset.renderer = 'fallback';
  if (lastIndex >= 0) selectPoster(lastIndex);
  schedule();
}

function setChapter(index) {
  if (lastIndex === index) return;
  const focused = lastIndex >= 0 && articles[lastIndex].contains(document.activeElement);
  lastIndex = index;
  stage.dataset.chapter = chapters[index].id;
  caption.textContent = labels[index];
  articles.forEach((article, item) => { article.hidden = item !== index; });
  links.forEach((link, item) => {
    if (item === index) link.setAttribute('aria-current', 'step');
    else link.removeAttribute('aria-current');
  });
  if (!poster.hidden) selectPoster(index);
  if (focused) links[index].focus({ preventScroll: true });
}

function update() {
  frameRequest = 0;
  if (document.hidden) return;

  const progress = clamp((scrollY - origin) / distance);
  const index = chapters.findLastIndex(chapter => progress + .0002 >= chapter.before);
  const chapter = chapters[index];
  const simplified = reducedMotion.matches || fallback;
  const frame = simplified ? chapter.still : progress;
  const ending = chapters.at(-1);
  const serve = clamp((frame - ending.before) / (ending.after - ending.before));
  const light = ease((serve - .32) / .47);

  setChapter(index);
  visual.style.setProperty('--paper-reveal', light);
  const lightTheme = light > .54;
  if (stage.hasAttribute('data-light') !== lightTheme) {
    stage.toggleAttribute('data-light', lightTheme);
    themeColor.content = getComputedStyle(stage).getPropertyValue('--theme-color').trim();
  }
  links.forEach((link, item) => {
    const { before, after } = chapters[item];
    link.parentElement.style.setProperty('--progress', clamp((progress - before) / (after - before)));
  });

  const copyStart = chapter === ending ? ending.before + .078 : chapter.before;
  const entrance = index === 0 ? 1 : ease((progress - copyStart) / .034);
  const exit = index === chapters.length - 1 ? 1 : ease((chapter.after - progress) / .027);
  const opacity = simplified ? 1 : Math.min(entrance, exit);
  articles[index].style.setProperty('--copy-opacity', opacity);
  articles[index].inert = opacity < .3;

  if (scene && lastFrame !== frame) {
    lastFrame = frame;
    scene.render(frame);
    if (visual.dataset.renderer !== 'ready') {
      visual.dataset.renderer = 'ready';
      poster.hidden = true;
    }
  }
}

function schedule() {
  if (!frameRequest) frameRequest = requestAnimationFrame(update);
}

function measure() {
  origin = scrollY + story.getBoundingClientRect().top;
  distance = Math.max(1, story.offsetHeight - stage.offsetHeight);
  if (scene) {
    scene.resize(visual.clientWidth, visual.clientHeight);
    lastFrame = undefined;
  }
  schedule();
}

function progressFor(hash) {
  if (hash === '#start' || !hash) return 0;
  return chapters.find(chapter => '#' + chapter.id === hash)?.action;
}

function goTo(hash, smooth) {
  const progress = progressFor(hash);
  if (progress === undefined) return;
  scrollTo({ top: origin + distance * progress, behavior: smooth && !reducedMotion.matches ? 'smooth' : 'instant' });
  schedule();
}

stage.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  if (location.hash !== link.hash) history.pushState(null, '', link.hash);
  goTo(link.hash, true);
});

const observer = new ResizeObserver(measure);
observer.observe(visual);
observer.observe(story);
addEventListener('scroll', schedule, { passive: true });
addEventListener('hashchange', () => goTo(location.hash, false));
addEventListener('resize', measure, { passive: true });
reducedMotion.addEventListener('change', schedule);
document.addEventListener('visibilitychange', schedule);
canvas.addEventListener('webglcontextlost', showFallback);
measure();
if (location.hash) goTo(location.hash, false);

import('./scene.mjs').then(({ createMatchaScene }) => {
  scene = createMatchaScene(canvas, events);
  measure();
}).catch(error => {
  console.warn('AOAWA: using still images for the story.', error);
  showFallback();
});
