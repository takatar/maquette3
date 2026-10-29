// Contrôle visuel local facultatif via Edge/Chrome headless et son protocole DevTools.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const edge = process.env.BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 41872 + (process.pid % 1000) * 2;
const debugPort = port + 1;
const root = path.resolve(__dirname, '..');
const staticMode = process.argv.includes('--static');
const basePath = staticMode ? '/demo/' : '/';
const server = staticMode
  ? http.createServer((request, response) => {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (!pathname.startsWith(basePath)) { response.writeHead(404).end(); return; }
      const relative = pathname.slice(basePath.length);
      const file = path.resolve(root, 'out', relative || 'index.html', relative.endsWith('/') ? 'index.html' : '');
      if (!file.startsWith(path.join(root, 'out') + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        response.writeHead(404).end(); return;
      }
      const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
      response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(response);
    }).listen(port, '127.0.0.1')
  : spawn(process.execPath, ['server.js'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
const browser = spawn(edge, ['--headless=new', '--disable-gpu', '--no-first-run', '--disable-extensions', '--remote-debugging-port=' + debugPort, '--user-data-dir=' + path.join(os.tmpdir(), 'mondrian-browser-check-' + process.pid), 'about:blank'], { stdio: 'ignore' });

async function waitForTarget() {
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
      const page = targets.find((target) => target.type === 'page');
      if (page) return page;
    } catch { /* browser not ready */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('CDP browser unavailable');
}

async function main() {
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}${basePath}`);
      if (response.ok) break;
    } catch { /* server not ready */ }
    if (attempt === 79) throw new Error('Serveur local indisponible');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const target = await waitForTarget();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let counter = 0;
  const pending = new Map();
  socket.addEventListener('message', ({ data }) => {
    const packet = JSON.parse(data);
    if (pending.has(packet.id)) {
      const { resolve, reject } = pending.get(packet.id);
      pending.delete(packet.id);
      packet.error ? reject(new Error(packet.error.message)) : resolve(packet.result);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++counter;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  await send('Page.enable');
  await send('Runtime.enable');
  for (const width of [320, 390, 768, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width <= 390 });
    for (const route of staticMode ? ['', 'presentation/', 'services/', 'contact/'] : ['', 'presentation', 'services', 'contact']) {
      await send('Page.navigate', { url: `http://127.0.0.1:${port}${basePath}${route}` });
      let state;
      for (let attempt = 0; attempt < 30; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        const result = await send('Runtime.evaluate', { expression: `(() => {
        const header = document.querySelector('.site-header');
        const reservation = document.querySelector('.header-book');
        const menu = document.querySelector('.menu-toggle');
        if (!header || !reservation || !menu || document.readyState === 'loading') return null;
        return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, headerRight: header.getBoundingClientRect().right, bookingRight: reservation.getBoundingClientRect().right, menuRight: menu.getBoundingClientRect().right, overflowing: [...document.querySelectorAll('h1,h2,.btn,.brand,.contact-wa,.contact-fields-note')].filter(el => {const b=el.getBoundingClientRect(); return b.width && (b.right > innerWidth+1 || b.left < -1)}).map(el => el.tagName+'.'+el.className), bookings: [...document.querySelectorAll('[data-reservation]')].map(a => a.href), h1: document.querySelector('h1')?.textContent, mainImageLoaded: [...document.querySelectorAll('img:not([loading="lazy"])')].every(img => img.complete && img.naturalWidth > 0), nav: [...document.querySelectorAll('[data-navigation] a')].map(a => a.href) };
      })()`, returnByValue: true });
        if (result.exceptionDetails) throw new Error(`Erreur navigateur ${width}px ${route}: ${result.exceptionDetails.text} ${result.exceptionDetails.exception?.description || ''}`);
        state = result.result.value;
        if (state?.h1 && state.bookings?.length && state.mainImageLoaded) break;
      }
      assert.ok(state?.h1, `Page ${route} non prête à ${width}px`);
      console.log(`${width}px ${route}: scroll=${state.scrollWidth}, WhatsApp=${state.bookings.length}, overflow=${state.overflowing.join(',') || 'aucun'}`);
      assert.equal(state.width, width);
      assert.ok(state.scrollWidth <= width + 1, `${route} déborde à ${width}px : ${state.scrollWidth}px`);
      assert.ok(state.bookingRight <= width + 1, `${route} : le bouton du header déborde`);
      assert.deepEqual(state.overflowing, [], `${route} : éléments coupés à ${width}px`);
      assert.ok(state.bookings.every((url) => url.startsWith('https://wa.me/221771234567?text=Bonjour')), `${route} : lien WhatsApp incorrect`);
      assert.ok(state.mainImageLoaded, `${route} : la photo principale ne charge pas`);
      if (staticMode) assert.deepEqual(state.nav, ['', 'presentation/', 'services/', 'contact/'].map((part) => `http://127.0.0.1:${port}${basePath}${part}`));
      if (width === 390 && !route) {
        const capture = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        fs.writeFileSync(path.join(os.tmpdir(), 'mondrian-mobile-emulated.png'), Buffer.from(capture.data, 'base64'));
      }
      if (width === 390 && !route) {
        await send('Runtime.evaluate', { expression: `document.querySelector('[data-menu-toggle]').click()` });
        const menu = await send('Runtime.evaluate', { expression: `({ expanded: document.querySelector('[data-menu-toggle]').getAttribute('aria-expanded'), visible: getComputedStyle(document.querySelector('[data-navigation]')).display, links: [...document.querySelectorAll('[data-navigation] a')].map(a => a.getAttribute('href')) })`, returnByValue: true });
        assert.equal(menu.result.value.expanded, 'true');
        assert.notEqual(menu.result.value.visible, 'none');
        assert.deepEqual(menu.result.value.links, staticMode ? ['./', './presentation/', './services/', './contact/'] : ['/', '/presentation', '/services', '/contact']);
        await send('Runtime.evaluate', { expression: `document.querySelector('[data-menu-toggle]').click()` });
      }
    }
  }
  socket.close();
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => { browser.kill(); staticMode ? server.close() : server.kill(); });