import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readSiteFile(name) {
  return fs.readFileSync(path.join(projectRoot, name), 'utf8');
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.className = '';
    this.textContent = '';
    this.listeners = new Map();
    this.classList = {
      add: (value) => { this.className = `${this.className} ${value}`.trim(); },
      remove: (value) => { this.className = this.className.split(' ').filter((part) => part !== value).join(' '); }
    };
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = children.flatMap((child) => child.tagName === 'fragment' ? child.children : [child]);
  }

  addEventListener(name, callback) {
    this.listeners.set(name, callback);
  }
}

function waitForUpdates() {
  return new Promise((resolve) => setImmediate(resolve));
}

test('MathJax configuration accepts both common TeX delimiters and restricts unsafe URLs', () => {
  const context = { window: {} };
  vm.runInNewContext(readSiteFile('mathjax-config.js'), context);
  const config = context.window.MathJax;

  assert.equal(config.tex.inlineMath['[+]'][0][0], '$');
  assert.equal(config.tex.inlineMath['[+]'][0][1], '$');
  assert.equal(config.loader.load[0], 'ui/safe');
  assert.equal(config.options.safeOptions.safeProtocols.javascript, false);
  assert.equal(config.options.safeOptions.safeProtocols.data, false);
  assert.equal(config.options.safeOptions.safeProtocols.file, false);
  assert.match(readSiteFile('upcoming.html'), /mathjax@4\.0\.0\/tex-svg\.js/);
  assert.match(readSiteFile('past.html'), /mathjax@4\.0\.0\/tex-svg\.js/);
});

test('an open Upcoming page refreshes new submissions and typesets their math', async () => {
  const elements = {
    'seminar-list': new FakeElement('ul'),
    'schedule-status': new FakeElement('p'),
    'schedule-refresh': new FakeElement('button')
  };
  const documentListeners = new Map();
  const document = {
    hidden: false,
    createElement: (tagName) => new FakeElement(tagName),
    createDocumentFragment: () => new FakeElement('fragment'),
    getElementById: (id) => elements[id],
    addEventListener: (name, callback) => documentListeners.set(name, callback)
  };
  const schedule = JSON.parse(readSiteFile('data/schedule.json'));
  const published = JSON.parse(readSiteFile('data/submissions.json'));
  let submissions = [];
  let timer;
  let typesetCalls = 0;
  let clearCalls = 0;
  let fetchCalls = 0;
  const window = {
    MathJax: {
      startup: { promise: Promise.resolve() },
      typesetClear: () => { clearCalls += 1; },
      typesetPromise: async () => { typesetCalls += 1; }
    },
    setInterval: (callback, milliseconds) => { timer = { callback, milliseconds }; }
  };
  const fetch = async (url) => {
    fetchCalls += 1;
    const value = url.startsWith('data/schedule.json') ? schedule : submissions;
    return { ok: true, json: async () => structuredClone(value) };
  };

  vm.runInNewContext(readSiteFile('seminars.js'), { document, window, fetch, URL, Date });
  await waitForUpdates();
  await waitForUpdates();

  assert.equal(timer.milliseconds, 60_000);
  assert.equal(elements['seminar-list'].children[0].className, 'available-seminar');
  const bookingUrl = new URL(elements['seminar-list'].children[0].children.at(-1).children[1].href);
  assert.match(bookingUrl.searchParams.get('title'), /not the talk title/);

  submissions = published;
  timer.callback();
  await waitForUpdates();
  await waitForUpdates();

  assert.equal(elements['seminar-list'].children[0].className, 'scheduled-seminar');
  assert.equal(elements['schedule-status'].textContent, '1 seminar currently scheduled.');
  assert.equal(typesetCalls >= 2, true);
  assert.equal(clearCalls >= 2, true);

  const beforeHidden = fetchCalls;
  document.hidden = true;
  timer.callback();
  await waitForUpdates();
  assert.equal(fetchCalls, beforeHidden);

  document.hidden = false;
  documentListeners.get('visibilitychange')();
  await waitForUpdates();
  assert.equal(fetchCalls > beforeHidden, true);
});
