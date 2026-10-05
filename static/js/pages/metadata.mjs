import {identify, MAX_FILE, MAX_TOTAL, createResult, analyzeDataset, finalize} from './metadata-engine.mjs';

const input = document.getElementById('metadata-folder');
const selection = document.getElementById('metadata-selection');
const button = document.getElementById('metadata-analyze');
const status = document.getElementById('metadata-status');
const error = document.getElementById('metadata-error');
const results = document.getElementById('metadata-results');
let chosen = null;
const format = n => new Intl.NumberFormat().format(n);
const bytes = n => `${(n / 1024 / 1024).toFixed(1)} MB`;
const pause = () => new Promise(resolve => setTimeout(resolve, 0));

function showError(message) { error.textContent = message; error.hidden = false; }
function clear() { error.hidden = true; error.textContent = ''; status.textContent = ''; results.hidden = true; results.replaceChildren(); }
function node(tag, cls, text) {
  const element = document.createElement(tag);
  if (cls) element.className = cls;
  if (text !== undefined) element.textContent = text;
  return element;
}
function chart(title, data, mode = 'bar') {
  const entries = Object.entries(data || {});
  if (!entries.length) return null;
  const panel = node('div', 'metadata-chart');
  panel.append(node('h3', '', title));
  const scroll = node('div', 'metadata-chart-scroll');
  const plot = node('div', `metadata-plot ${mode}`);
  const max = Math.max(...entries.map(([, n]) => n), 1);
  for (const [label, value] of entries) {
    const column = node('div', 'metadata-column');
    const bar = node('div', 'metadata-bar');
    bar.style.height = `${Math.max(2, value / max * 150)}px`;
    bar.title = `${label}: ${format(value)}`;
    column.append(node('span', 'metadata-bar-value', format(value)), bar, node('span', 'metadata-bar-label', label));
    plot.append(column);
  }
  scroll.append(plot); panel.append(scroll);
  return panel;
}
function comparisonChart(comparison) {
  const panel = node('div', 'metadata-chart');
  panel.append(node('h3', '', 'Comments vs reactions by month (UTC)'));
  const months = [...new Set([...Object.keys(comparison.comments), ...Object.keys(comparison.reactions)])].sort();
  const max = Math.max(1, ...months.flatMap(month => [comparison.comments[month] || 0, comparison.reactions[month] || 0]));
  const legend = node('p', 'metadata-legend');
  legend.append(node('span', 'metadata-legend-comments', '■ Comments'), node('span', 'metadata-legend-reactions', '■ Reactions'));
  panel.append(legend);
  const scroll = node('div', 'metadata-chart-scroll');
  const plot = node('div', 'metadata-plot');
  for (const month of months) {
    const column = node('div', 'metadata-column');
    const pair = node('div', 'metadata-pair');
    for (const [type, value] of [['comments', comparison.comments[month] || 0], ['reactions', comparison.reactions[month] || 0]]) {
      const bar = node('div', `metadata-bar metadata-${type}`);
      bar.style.height = `${Math.max(2, value / max * 150)}px`;
      bar.title = `${month} ${type}: ${format(value)}`;
      pair.append(bar);
    }
    column.append(pair, node('span', 'metadata-bar-label', month)); plot.append(column);
  }
  scroll.append(plot); panel.append(scroll);
  return panel;
}
function render(report) {
  results.replaceChildren();
  const heading = node('div', 'metadata-result-heading');
  heading.append(node('h2', '', `${report.platform} analysis`), node('p', '', `${format(report.datasets.length)} dataset files analyzed · Charts show real timestamped records`));
  results.append(heading);
  if (report.warnings.length) {
    const warnings = node('div', 'metadata-warnings');
    warnings.append(node('h3', '', 'Skipped files / records'));
    const list = node('ul');
    for (const warning of report.warnings) list.append(node('li', '', warning));
    warnings.append(list); results.append(warnings);
  }
  const stats = node('div', 'metadata-stat-grid');
  for (const section of report.sections) {
    const card = node('div', 'metadata-stat');
    card.append(node('strong', '', format(section.total)), node('span', '', section.title));
    stats.append(card);
  }
  results.append(stats);
  if (report.comparison) results.append(comparisonChart(report.comparison));
  for (const section of report.sections) {
    const block = node('section', 'metadata-section');
    block.append(node('h2', '', section.title));
    if (section.first) block.append(node('p', 'metadata-hint', `First: ${section.first} · Last: ${section.last} · ${format(section.queryCount)} search texts · Times shown in Asia/Ho_Chi_Minh`));
    if (section.allUpdates !== undefined) block.append(node('p', 'metadata-hint', `${format(section.allUpdates)} total profile updates; ${format(section.total)} picture updates`));
    const grid = node('div', 'metadata-chart-grid');
    for (const [title, data] of [
      ['Monthly activity', section.monthly], ['Yearly activity', section.yearly],
      ['Hour of day (Vietnam time)', section.hourly], ['Activity type', section.activityTypes],
      ['Cumulative friends by year', section.cumulative], ['Likes by month', section.likesMonthly],
    ]) {
      const graph = chart(title, data);
      if (graph) grid.append(graph);
    }
    if (section.activityByYear) {
      for (const [year, types] of Object.entries(section.activityByYear)) grid.append(chart(`Activity types in ${year}`, types));
    }
    block.append(grid);
    if (section.topTerms?.length) {
      const cloud = node('div', 'metadata-chart');
      cloud.append(node('h3', '', 'Search word frequency'));
      const words = node('div', 'metadata-words');
      const peak = section.topTerms[0][1];
      for (const [word, frequency] of section.topTerms) {
        const term = node('span', '', word);
        term.style.fontSize = `${0.85 + 1.3 * frequency / peak}rem`;
        term.title = `${word}: ${frequency}`;
        words.append(term);
      }
      cloud.append(words); block.append(cloud);
    }
    if (section.history) {
      const details = node('details', 'metadata-history');
      details.append(node('summary', '', 'Picture update timeline'));
      const list = node('ul');
      for (const date of section.history) list.append(node('li', '', date));
      details.append(list); block.append(details);
    }
    results.append(block);
  }
  results.hidden = false;
  results.scrollIntoView({behavior: 'smooth', block: 'start'});
}

input.addEventListener('change', () => {
  clear(); chosen = null; button.disabled = true; selection.hidden = true;
  const files = Array.from(input.files || []);
  if (!files.length) { showError('Folder is empty or no files were selected.'); return; }
  const {matches, platform} = identify(files);
  const name = (files[0].webkitRelativePath || files[0].name).split('/')[0];
  const size = files.reduce((sum, file) => sum + file.size, 0);
  selection.replaceChildren(node('h3', '', name), node('p', '', `${format(files.length)} files · ${bytes(size)} total · ${matches.length} recognized JSON files`));
  const list = node('ul');
  const groups = [...new Set(matches.map(item => item.label))];
  for (const label of groups) list.append(node('li', '', label));
  selection.append(list); selection.hidden = false;
  if (!matches.length) { showError('No supported JSON datasets found. Select the root of a Facebook or Instagram JSON export.'); return; }
  if (matches.some(item => item.platform !== platform)) { showError('Mixed Facebook and Instagram datasets: select one export folder at a time.'); return; }
  if (matches.some(item => item.file.size > MAX_FILE)) { showError(`A recognized JSON file exceeds ${bytes(MAX_FILE)}. Select a smaller export.`); return; }
  if (matches.reduce((sum, item) => sum + item.file.size, 0) > MAX_TOTAL) { showError(`Recognized JSON files exceed ${bytes(MAX_TOTAL)}.`); return; }
  chosen = {matches, platform}; button.disabled = false;
});

button.addEventListener('click', async () => {
  if (!chosen) return;
  clear(); button.disabled = true; input.disabled = true;
  const {matches, platform} = chosen;
  const report = createResult(platform);
  try {
    for (const [index, dataset] of matches.entries()) {
      status.textContent = `Reading files (${index + 1}/${matches.length}): ${dataset.label}`;
      await pause();
      try {
        const raw = await dataset.file.text();
        status.textContent = `Parsing data: ${dataset.label}`;
        await pause();
        analyzeDataset(report, dataset, JSON.parse(raw));
      } catch (problem) {
        report.warnings.push(`${dataset.relative}: ${problem instanceof SyntaxError ? 'Invalid JSON' : problem.message || 'Unable to read file'}`);
      }
    }
    status.textContent = 'Analyzing'; await pause();
    const output = finalize(report);
    status.textContent = 'Preparing results'; await pause();
    render(output);
    status.textContent = `Analysis complete: ${format(output.datasets.length)} dataset files processed.`;
  } catch (problem) { showError(problem.message || 'Analysis failed. Try selecting the folder again.'); status.textContent = ''; }
  finally { input.disabled = false; button.disabled = false; }
});
