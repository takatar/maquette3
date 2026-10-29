const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'out');
const pages = ['index.html', 'presentation/index.html', 'services/index.html', 'contact/index.html'];
const manifest = JSON.parse(fs.readFileSync(path.join(output, '.mondrian-static.json'), 'utf8'));
assert.equal(manifest.format, 'le-mondrian-static-v1');

const read = (file) => fs.readFileSync(path.join(output, file));
for (const file of manifest.files) assert.ok(fs.statSync(path.join(output, file)).isFile(), `${file} absent`);
assert.equal(manifest.files.filter((name) => name.endsWith('.html')).length, 4);

for (const page of pages) {
  const content = read(page).toString('utf8');
  const prefix = page === 'index.html' ? './' : '../';
  assert.ok(content.includes(`data-base="${prefix}"`), `${page} : préfixe absent`);
  assert.match(content, /<main id="contenu">/);
  assert.doesNotMatch(content, /\b(?:href|src)="\//, `${page} : URL absolue restante`);
  for (const [, url] of content.matchAll(/\b(?:href|src)="([^"#]+)(?:#[^"]*)?"/g)) {
    if (/^(?:https?:|mailto:|tel:)/.test(url)) continue;
    assert.ok(fs.existsSync(path.resolve(output, path.dirname(page), url)), `${page} : lien cassé ${url}`);
  }
}
assert.ok(manifest.files.some((name) => name.startsWith('images/optimized/')));
assert.equal(read('assets/site.js').toString('utf8'), fs.readFileSync(path.join(root, 'assets/site.js'), 'utf8'));

// Simulation d'un hébergement statique dans /demo/ : pas de réécriture de routes.
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (!url.pathname.startsWith('/demo/')) { response.writeHead(404).end(); return; }
  const relative = decodeURIComponent(url.pathname.slice('/demo/'.length));
  const file = path.resolve(output, relative || 'index.html', relative.endsWith('/') ? 'index.html' : '');
  if (!file.startsWith(output + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404).end(); return; }
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
  response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(response);
});

server.listen(0, '127.0.0.1', async () => {
  try {
    const base = `http://127.0.0.1:${server.address().port}/demo/`;
    for (const page of pages) {
      const url = page === 'index.html' ? base : base + page.replace(/index\.html$/, '');
      const response = await fetch(url);
      assert.equal(response.status, 200, `${url} inaccessible`);
      assert.match(await response.text(), /<main id="contenu">/);
    }
    for (const file of manifest.files) {
      const response = await fetch(base + file);
      assert.equal(response.status, 200, `Ressource ${file} inaccessible`);
    }
    console.log(`OK : export statique autonome, quatre pages et ${manifest.files.length} fichiers servis dans /demo/.`);
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally { server.close(); }
});