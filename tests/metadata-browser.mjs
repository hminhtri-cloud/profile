// Optional browser smoke test: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/metadata-browser.mjs
import {spawn} from 'node:child_process';
import {resolve, join} from 'node:path';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(import.meta.dirname, '..');
const url = 'http://127.0.0.1:5089';
const server = spawn(resolve(root, '.venv/bin/python'), ['-m', 'flask', '--app', 'app', 'run', '--port', '5089'], {cwd: root, stdio: 'ignore'});
let browser;
let temp;
try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${url}/projects/metadata`)).ok) break; } catch {}
    if (i === 59) throw new Error('Flask server failed to start');
    await new Promise(done => setTimeout(done, 200));
  }
  browser = await chromium.launch({headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const page = await browser.newPage();
  await page.goto(`${url}/projects`);
  await page.getByRole('link', {name: 'Open analysis'}).click();
  assert.match(page.url(), /\/projects\/metadata$/);
  const samples = resolve(root, '../dllt/meta_data_analysis');
  for (const [folder, expected] of [
    ['facebook-huynhminhtri546767-16_08_2026-TOSLvCm2', 'Facebook analysis'],
    ['instagram-poan', 'Instagram analysis'],
  ]) {
    await page.locator('#metadata-folder').setInputFiles(resolve(samples, folder));
    await page.getByRole('button', {name: 'Analyze folder'}).click();
    await page.getByRole('heading', {name: expected}).waitFor({timeout: 90000});
    assert.ok(await page.locator('.metadata-chart').count() > 0);
    assert.match(await page.locator('#metadata-status').innerText(), /Analysis complete/);
    console.log(`${folder}: dashboard rendered`);
  }
  temp = await mkdtemp(join(tmpdir(), 'metadata-e2e-'));
  const exportDir = join(temp, 'export');
  await mkdir(join(exportDir, 'connections/friends'), {recursive: true});
  await mkdir(join(exportDir, 'logged_information/search'), {recursive: true});
  await writeFile(join(exportDir, 'connections/friends/your_friends.json'), JSON.stringify({friends_v2: [{timestamp: 1700000000}]}));
  await writeFile(join(exportDir, 'logged_information/search/your_search_history.json'), '{bad json');
  await writeFile(join(exportDir, 'unrelated.txt'), 'not a dataset');
  await page.locator('#metadata-folder').setInputFiles(exportDir);
  await page.getByRole('button', {name: 'Analyze folder'}).click();
  await page.getByRole('heading', {name: 'Facebook analysis'}).waitFor();
  assert.match(await page.locator('.metadata-warnings').innerText(), /Invalid JSON/);
  assert.match(await page.locator('.metadata-stat-grid').innerText(), /Friends added/);
  await page.goto(`${url}/projects/metadata`);
  await page.locator('#metadata-folder').evaluate(input => input.dispatchEvent(new Event('change', {bubbles: true})));
  assert.match(await page.locator('#metadata-error').innerText(), /empty/);
} finally { await browser?.close(); server.kill(); if (temp) await rm(temp, {recursive: true, force: true}); }
