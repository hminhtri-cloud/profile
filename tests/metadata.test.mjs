import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {identify, createResult, analyzeDataset, finalize, decodeText} from '../static/js/pages/metadata-engine.mjs';

const samples = resolve(import.meta.dirname, '../../dllt/meta_data_analysis');
const fb = 'facebook-huynhminhtri546767-16_08_2026-TOSLvCm2';
const ig = 'instagram-poan';
const facebookPaths = [
  'logged_information/search/your_search_history.json',
  'connections/friends/your_friends.json',
  'logged_information/activity_messages/people_and_friends.json',
  'personal_information/profile_information/profile_update_history.json',
  'your_facebook_activity/comments_and_reactions/comments.json',
  ...Array.from({length: 6}, (_, i) => `your_facebook_activity/comments_and_reactions/likes_and_reactions${i ? `_${i}` : ''}.json`),
];
const instagramPaths = [
  'connections/followers_and_following/followers_1.json',
  'connections/followers_and_following/following.json',
  'your_instagram_activity/likes/liked_posts.json',
  'your_instagram_activity/comments/post_comments_1.json',
  'your_instagram_activity/story_interactions/story_likes.json',
];
async function run(folder, paths) {
  const files = paths.map(path => ({path: `${folder}/${path}`, name: path.split('/').at(-1)}));
  const selected = identify(files);
  assert.equal(selected.matches.length, paths.length);
  const report = createResult(selected.platform);
  for (const dataset of selected.matches) {
    analyzeDataset(report, dataset, JSON.parse(await readFile(join(samples, dataset.path), 'utf8')));
  }
  return finalize(report);
}
const section = (result, name) => result.sections.find(item => item.title === name);
const sum = data => Object.values(data).reduce((a, b) => a + b, 0);

test('real Facebook export matches legacy decoded input and aggregation', async () => {
  const result = await run(fb, facebookPaths);
  const legacy = join(samples, 'facebook_data_analysis');
  const searches = JSON.parse(await readFile(join(legacy, 'your_search_history_decoded.json'), 'utf8')).searches_v2;
  const friends = JSON.parse(await readFile(join(legacy, 'your_friends_decoded.json'), 'utf8')).friends_v2;
  const profile = JSON.parse(await readFile(join(legacy, 'profile_update_history_decoded.json'), 'utf8')).profile_updates_v2;
  const search = section(result, 'Search & visit history');
  assert.equal(search.total, searches.length);
  assert.equal(sum(search.monthly), searches.length);
  assert.equal(sum(search.hourly), searches.length);
  assert.equal(sum(search.activityTypes), searches.length);
  const decodedTitles = Object.groupBy(searches, row => row.title || 'Untitled');
  assert.deepEqual(search.activityTypes, Object.fromEntries(Object.entries(decodedTitles).map(([title, rows]) => [title, rows.length])));
  const vnMonth = new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit'});
  const firstParts = Object.fromEntries(vnMonth.formatToParts(new Date(searches[0].timestamp * 1000)).map(part => [part.type, part.value]));
  const firstMonth = `${firstParts.year}-${firstParts.month}`;
  assert.ok(search.monthly[firstMonth] > 0);
  assert.equal(search.queryCount, searches.flatMap(item => item.data || []).filter(item => item.text).length);
  assert.equal(section(result, 'Friends added').total, friends.length);
  assert.equal(Object.values(section(result, 'Friends added').cumulative).at(-1), friends.length);
  assert.equal(section(result, 'Profile picture updates').total, profile.filter(item => item.title?.includes('cập nhật ảnh đại diện')).length);
  const decodedReactions = await readdir(join(legacy, 'react'));
  const reactionFiles = decodedReactions.filter(name => /^likes_and_reactions(?:_\d+)?\.json$/.test(name));
  let legacyReactionTotal = 0;
  for (const file of reactionFiles) legacyReactionTotal += JSON.parse(await readFile(join(legacy, 'react', file), 'utf8')).length;
  assert.equal(section(result, 'Reactions').total, legacyReactionTotal);
  assert.equal(sum(section(result, 'Reactions').monthly), legacyReactionTotal);
  assert.equal(sum(result.comparison.reactions), legacyReactionTotal);
  assert.equal(sum(result.comparison.comments), section(result, 'Comments').total);
  assert.ok(search.topTerms.length);
  assert.equal(result.datasets.length, facebookPaths.length);
});

test('real Instagram export produces timestamped results without Facebook assumptions', async () => {
  const result = await run(ig, instagramPaths);
  assert.equal(result.platform, 'Instagram');
  for (const item of result.sections) { assert.ok(item.total > 0); assert.equal(sum(item.monthly), item.total); }
  const followers = JSON.parse(await readFile(join(samples, ig, instagramPaths[0]), 'utf8'));
  assert.equal(section(result, 'Followers').total, followers.filter(item => typeof item.string_list_data?.[0]?.timestamp === 'number').length);
});

test('rejects wrong structure and malformed records while permitting partial data', () => {
  assert.equal(identify([{path: 'folder/../../logged_information/search/your_search_history.json'}]).matches.length, 0);
  assert.equal(identify([{path: 'folder/other/logged_information/search/your_search_history.json'}]).matches.length, 0);
  const entry = identify([{path: 'export/connections/friends/your_friends.json'}]).matches[0];
  const report = createResult('Facebook');
  assert.throws(() => analyzeDataset(report, entry, {friends_v2: {}}), /schema/);
  analyzeDataset(report, entry, {friends_v2: [{timestamp: 1700000000}, {timestamp: 'bad'}, null]});
  assert.equal(section(finalize(report), 'Friends added').total, 1);
  assert.equal(decodeText('Huá»³nh Minh TrÃ­'), 'Huỳnh Minh Trí');
});
