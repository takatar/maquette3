const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const pages = [['/', 'index.html'], ['/presentation', 'presentation/index.html'], ['/services', 'services/index.html'], ['/contact', 'contact/index.html']];
const script = fs.readFileSync(path.join(root, 'assets/site.js'), 'utf8');
const stylesheet = fs.readFileSync(path.join(root, 'assets/site.css'), 'utf8');
const html = pages.map(([, file]) => fs.readFileSync(path.join(root, file), 'utf8'));

assert.match(script, /const WHATSAPP_NUMBER = '221771234567'/);
assert.match(script, /encodeURIComponent\(RESERVATION_MESSAGE\)/);
assert.match(script, /querySelectorAll\('\[data-reservation\]'\)/);
assert.match(script, /target = '_blank'/);
assert.match(script, /rel = 'noopener noreferrer'/);
assert.match(script, /data-floating-whatsapp/);
assert.match(script, /aria-expanded/);
assert.match(stylesheet, /prefers-reduced-motion:reduce/);
assert.match(stylesheet, /:focus-visible/);

for (const [index, content] of html.entries()) {
  assert.match(content, /<html lang="fr">/);
  assert.match(content, /<main id="contenu">/);
  assert.match(content, /<h1\b/);
  assert.match(content, /<meta name="description"/);
  assert.match(content, /data-reservation/);
  assert.match(content, /data-header/);
  assert.match(content, /data-footer/);
  assert.match(content, /data-floating-whatsapp/);
  assert.doesNotMatch(content, /https?:\/\/(?:images|unsplash|pexels|pixabay)/i);
  assert.doesNotMatch(content, /<form\b|<iframe\b/i);
  for (const [, image] of content.matchAll(/(?:src|href)="(\/images\/[^"#?]+)"/g)) {
    assert.ok(fs.existsSync(path.join(root, image.slice(1))), `Image inexistante sur ${pages[index][0]}: ${image}`);
  }
}
assert.equal(new Set(html.map((content) => content.match(/<title>(.*?)<\/title>/)[1])).size, 4, 'Les titres des pages doivent être distincts');
assert.match(html[3], /coordonnées.*fictifs/i);
assert.match(html[2], /À confirmer auprès de l'établissement/);

async function run() {
  const port = 41871;
  const server = spawn(process.execPath, ['server.js'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
  try {
    for (let attempt = 0; attempt < 60; attempt++) {
      try { await fetch(`http://127.0.0.1:${port}/`); break; }
      catch { await new Promise((resolve) => setTimeout(resolve, 50)); }
    }
    for (const [url] of pages) {
      const response = await fetch(`http://127.0.0.1:${port}${url}`);
      assert.equal(response.status, 200, `Route ${url}`);
      assert.match(await response.text(), /<main id="contenu">/);
    }
    for (const asset of ['/assets/site.js', '/assets/site.css', '/assets/icons.svg', '/images/optimized/20261028_174951.jpg']) {
      const response = await fetch(`http://127.0.0.1:${port}${asset}`, { method: 'HEAD' });
      assert.equal(response.status, 200, `Ressource ${asset}`);
    }
    assert.equal((await fetch(`http://127.0.0.1:${port}/nonexistent`)).status, 404);
    assert.equal((await fetch(`http://127.0.0.1:${port}/%ZZ`)).status, 400);
    console.log('OK : 4 pages, ressources locales, liens WhatsApp, contenu et routes vérifiés.');
  } finally { server.kill(); }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });