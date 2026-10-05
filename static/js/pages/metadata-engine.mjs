// Refactored from facebook_data_analysis: counts by month/year/hour, cumulative
// friends, search titles/terms, profile-photo updates, and comment/reaction trends.
const facebook = [
  ['search', 'Search history', 'logged_information/search/your_search_history.json'],
  ['friends', 'Friends added', 'connections/friends/your_friends.json'],
  ['interactions', 'People & friends interactions', 'logged_information/activity_messages/people_and_friends.json'],
  ['profile', 'Profile updates', 'personal_information/profile_information/profile_update_history.json'],
  ['comments', 'Comments', 'your_facebook_activity/comments_and_reactions/comments.json'],
  ['reactions', 'Reactions', /^your_facebook_activity\/comments_and_reactions\/likes_and_reactions(?:_\d+)?\.json$/],
];
const instagram = [
  ['followers', 'Followers', /^connections\/followers_and_following\/followers_\d+\.json$/],
  ['following', 'Following', 'connections/followers_and_following/following.json'],
  ['posts', 'Liked posts', 'your_instagram_activity/likes/liked_posts.json'],
  ['comments', 'Post comments', /^your_instagram_activity\/comments\/post_comments(?:_\d+)?\.json$/],
  ['stories', 'Story likes', 'your_instagram_activity/story_interactions/story_likes.json'],
];
export const MAX_FILE = 20 * 1024 * 1024;
export const MAX_TOTAL = 50 * 1024 * 1024;

export function identify(files) {
  const matches = [];
  let platform = null;
  for (const file of files) {
    const path = file.webkitRelativePath || file.path || file.name;
    if (!path || path.includes('\\') || path.split('/').some(p => p === '..' || p === '.' || !p)) continue;
    // The first segment is the selected folder; never match similarly named files elsewhere.
    const relative = path.includes('/') ? path.slice(path.indexOf('/') + 1) : path;
    for (const [kind, definitions] of [['Facebook', facebook], ['Instagram', instagram]]) {
      const found = definitions.find(([, , rule]) => typeof rule === 'string' ? rule === relative : rule.test(relative));
      if (found) {
        matches.push({file, path, relative, platform: kind, key: found[0], label: found[1]});
        platform ||= kind;
        break;
      }
    }
  }
  return {matches, platform};
}

// Facebook exports encode UTF-8 bytes as Latin-1 escaped characters. Correct
// the resulting text after JSON.parse, without modifying numbers or timestamps.
export function decodeText(value) {
  if (typeof value !== 'string' || !/[\u00c2-\u00f4][\u0080-\u00bf]/.test(value)) return value;
  try {
    const bytes = Uint8Array.from(value, char => char.charCodeAt(0));
    if (bytes.some((byte, i) => value.charCodeAt(i) > 255)) return value;
    return new TextDecoder('utf-8', {fatal: true}).decode(bytes);
  } catch { return value; }
}

const zone = 'Asia/Ho_Chi_Minh'; // Legacy search, interactions and profile charts.
const partsFormatter = new Intl.DateTimeFormat('en-CA', {timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'});
function time(timestamp, local = false) {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp < 0) return null;
  const date = new Date(timestamp * 1000);
  if (!Number.isFinite(date.getTime())) return null;
  if (!local) return {month: date.toISOString().slice(0, 7), year: String(date.getUTCFullYear()), hour: date.getUTCHours(), date: date.toISOString()};
  const fields = Object.fromEntries(partsFormatter.formatToParts(date).map(p => [p.type, p.value]));
  return {month: `${fields.year}-${fields.month}`, year: fields.year, hour: Number(fields.hour), date: `${fields.year}-${fields.month}-${fields.day} ${fields.hour}:${fields.minute}:${fields.second}`};
}
const count = (items, selector) => {
  const totals = new Map();
  for (const item of items) {
    const key = selector(item);
    if (key !== null && key !== undefined && key !== '') totals.set(String(key), (totals.get(String(key)) || 0) + 1);
  }
  return Object.fromEntries([...totals].sort(([a], [b]) => a.localeCompare(b)));
};
const series = (items, local = false) => ({
  monthly: count(items, row => time(row.timestamp, local)?.month),
  yearly: count(items, row => time(row.timestamp, local)?.year),
});
function validRecords(value, key) {
  const rows = key ? value?.[key] : value;
  if (!Array.isArray(rows)) throw new Error('Unexpected JSON schema');
  return rows.filter(row => row && typeof row === 'object' && !Array.isArray(row));
}
function withTime(rows, getTimestamp = row => row.timestamp) {
  return rows.map(row => ({...row, timestamp: getTimestamp(row)})).filter(row => time(row.timestamp));
}
function addBucket(result, key, rows) { (result._buckets[key] ||= []).push(...rows); }

export function analyzeDataset(result, dataset, json) {
  const {platform, key} = dataset;
  let rows;
  if (platform === 'Facebook') {
    const schema = {search: 'searches_v2', friends: 'friends_v2', profile: 'profile_updates_v2', comments: 'comments_v2'};
    rows = validRecords(json, schema[key]);
    // The raw reaction export is split across several files. Each file is additive.
    addBucket(result, key, withTime(rows));
  } else {
    if (key === 'following') rows = validRecords(json, 'relationships_following');
    else rows = validRecords(json);
    const stamp = key === 'followers' || key === 'following' ? row => row.string_list_data?.[0]?.timestamp
      : key === 'comments' ? row => row.string_map_data?.Time?.timestamp : row => row.timestamp;
    addBucket(result, key, withTime(rows, stamp));
  }
  const accepted = result._buckets[key].length - (result._counts?.[key] || 0);
  (result._counts ||= {})[key] = result._buckets[key].length;
  if (accepted < rows.length) result.warnings.push(`${dataset.relative}: ${rows.length - accepted} records without valid timestamps skipped.`);
  result.datasets.push({name: dataset.label, path: dataset.relative, records: accepted});
}

export function createResult(platform) { return {platform, datasets: [], warnings: [], _buckets: {}}; }

export function finalize(result) {
  const b = result._buckets;
  const output = {platform: result.platform, datasets: result.datasets, warnings: result.warnings, sections: []};
  function section(title, rows, local = false, extra = {}) {
    if (!rows?.length) return;
    output.sections.push({title, total: rows.length, ...series(rows, local), ...extra});
  }
  if (result.platform === 'Facebook') {
    const searches = b.search || [];
    if (searches.length) {
      const terms = searches.flatMap(row => Array.isArray(row.data) ? row.data.map(item => decodeText(item?.text)).filter(text => typeof text === 'string' && text.trim()) : []);
      const words = terms.flatMap(text => text.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || []);
      const localTimes = searches.map(row => time(row.timestamp, true));
      section('Search & visit history', searches, true, {
        hourly: Object.fromEntries(Array.from({length: 24}, (_, i) => [i, localTimes.filter(t => t.hour === i).length])),
        activityTypes: count(searches, row => decodeText(row.title) || 'Untitled'),
        activityByYear: Object.fromEntries([...new Set(localTimes.map(t => t.year))].sort().map(year => [year, count(searches.filter(row => time(row.timestamp, true).year === year), row => decodeText(row.title) || 'Untitled')])),
        first: time(Math.min(...searches.map(row => row.timestamp)), true).date,
        last: time(Math.max(...searches.map(row => row.timestamp)), true).date,
        topTerms: Object.entries(count(words, word => word)).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 40),
        queryCount: terms.length,
      });
    }
    const friends = b.friends || [];
    const yearly = series(friends).yearly;
    let cumulative = 0;
    section('Friends added', friends, false, {cumulative: Object.fromEntries(Object.entries(yearly).map(([year, amount]) => [year, cumulative += amount]))});
    section('People & friends interactions', b.interactions, true);
    const updates = b.profile || [];
    section('Profile picture updates', updates.filter(row => decodeText(row.title || '').includes('cập nhật ảnh đại diện')), true, {allUpdates: updates.length,
      history: updates.filter(row => decodeText(row.title || '').includes('cập nhật ảnh đại diện')).map(row => time(row.timestamp, true).date).sort()});
    section('Comments', b.comments);
    const reactions = b.reactions || [];
    section('Reactions', reactions, false, {likesMonthly: series(reactions.filter(row => {
      const kind = row.data?.[0]?.reaction?.reaction || row.label_values?.find(item => item.label === 'Cảm xúc')?.value;
      return typeof kind === 'string' && ['LIKE', 'THÍCH'].includes(kind.toUpperCase());
    })).monthly});
    if (b.comments?.length && reactions.length) {
      output.comparison = {
        comments: series(b.comments).monthly,
        reactions: series(reactions).monthly,
      };
    }
  } else {
    section('Followers', b.followers);
    section('Following', b.following);
    section('Liked posts', b.posts);
    section('Post comments', b.comments);
    section('Story likes', b.stories);
  }
  if (!output.sections.length) throw new Error('No valid timestamped records found in the recognized datasets.');
  return output;
}
