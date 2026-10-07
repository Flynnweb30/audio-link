import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { extractMediaItem, getApiErrorMessage } from '../src/utils/api.ts';
import { createHistoryErrorItem, markHistoryAction, sortHistory, upsertHistoryItem } from '../src/utils/history.ts';

const root = process.cwd();

const item = {
  id: 'media_1',
  originalName: 'demo.mp3',
  filename: 'demo.mp3',
  mediaType: 'audio' as const,
  mimeType: 'audio/mpeg',
  size: 100,
  createdAt: '2026-10-01T00:00:00.000Z',
  directUrl: 'https://example.com/media/demo.mp3',
  playerUrl: 'https://example.com/?view=media_1',
};

assert.deepEqual(extractMediaItem({ success: true, item }), item);
assert.deepEqual(extractMediaItem({ items: [{ broken: true }, item] }), item);
assert.equal(extractMediaItem({ success: true, item: { id: 'only-id' } }), null);
assert.equal(getApiErrorMessage({ error: 'Bad upload' }, 'Fallback'), 'Bad upload');
assert.equal(getApiErrorMessage({}, 'Fallback'), 'Fallback');

const updated = markHistoryAction({ ...item }, 'preview');
const upserted = upsertHistoryItem([item], updated);
assert.equal(upserted.length, 1);
assert.equal(upserted[0].lastAction, 'preview');

const historyError = createHistoryErrorItem({
  id: 'batch_1',
  originalName: 'broken.opus',
  size: 20,
  mediaType: 'audio',
  mimeType: 'audio/opus',
  error: 'Malformed JSON',
});
assert.equal(historyError.status, 'error');
assert.equal(historyError.directUrl, '');

const newer = { ...item, id: 'new', updatedAt: '2026-10-07T00:00:00.000Z' };
assert.deepEqual(sortHistory([item, newer]).map((x) => x.id), ['new', 'media_1']);

const requiredFiles = [
  'firestore.rules',
  'render.yaml',
  'public/robots.txt',
  'public/sitemap.xml',
  'src/components/Seo.tsx',
  'src/components/AudioUploader.tsx',
  'src/components/FullHistoryModal.tsx',
];

for (const relative of requiredFiles) {
  assert.ok(fs.existsSync(path.join(root, relative)), `Missing ${relative}`);
}

const sitemap = fs.readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8');
assert.match(sitemap, /<urlset[^>]+sitemaps\.org\/schemas\/sitemap\/0\.9/);
assert.match(sitemap, /<loc>https:\/\/audiolink-media-service\.onrender\.com\/<\/loc>/);

const robots = fs.readFileSync(path.join(root, 'public/robots.txt'), 'utf8');
assert.match(robots, /Disallow: \/api\//);
assert.match(robots, /Sitemap: https:\/\/audiolink-media-service\.onrender\.com\/sitemap\.xml/);

console.log('All AudioLink unit/configuration tests passed.');
