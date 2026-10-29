// Export statique sans dépendance, publiable à la racine ou sous un sous-répertoire.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'out');
const manifestName = '.mondrian-static.json';
const pages = ['index.html', 'presentation/index.html', 'services/index.html', 'contact/index.html'];
const shared = ['assets/site.css', 'assets/site.js', 'assets/icons.svg'];
const generated = new Map();

for (const page of pages) {
  const source = fs.readFileSync(path.join(root, page), 'utf8');
  const prefix = page === 'index.html' ? './' : '../';
  const links = new Map([
    ['/', prefix],
    ['/presentation', `${prefix}presentation/`],
    ['/services', `${prefix}services/`],
    ['/contact', `${prefix}contact/`],
  ]);
  // Seuls les attributs URL commençant par / sont modifiés ; les liens externes restent inchangés.
  const html = source.replace(/\b(href|src)="(\/[^"?#]*)(#[^"]*)?"/g, (full, attribute, url, hash = '') => {
    const destination = links.get(url) ?? `${prefix}${url.slice(1)}`;
    return `${attribute}="${destination}${hash}"`;
  }).replace(/<body\s+data-page="([^"]+)"/, `<body data-page="$1" data-base="${prefix}"`);
  if (!html.includes(`data-base="${prefix}"`)) throw new Error(`Balise body manquante : ${page}`);
  generated.set(page, Buffer.from(html));
  for (const [, image] of source.matchAll(/(?:src|href)="(\/images\/[^"#?]+)"/g)) {
    const relative = image.slice(1);
    const file = path.resolve(root, relative);
    if (!file.startsWith(path.join(root, 'images') + path.sep) || !fs.existsSync(file)) {
      throw new Error(`Photographie introuvable : ${image}`);
    }
    generated.set(relative, fs.readFileSync(file));
  }
}

for (const resource of shared) generated.set(resource, fs.readFileSync(path.join(root, resource)));

function filesIn(directory, base = '') {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isSymbolicLink()) throw new Error(`Lien symbolique interdit dans out : ${entry.name}`);
    const relative = path.posix.join(base, entry.name);
    if (entry.isDirectory()) return filesIn(path.join(directory, entry.name), relative);
    if (!entry.isFile()) throw new Error(`Entrée non standard dans out : ${relative}`);
    return [relative];
  });
}

const existing = filesIn(output);
if (existing.length && !existing.includes(manifestName)) {
  throw new Error('out contient déjà des fichiers non issus de cet export. Aucun fichier modifié.');
}
let previous = [];
if (existing.includes(manifestName)) {
  const manifest = JSON.parse(fs.readFileSync(path.join(output, manifestName), 'utf8'));
  if (manifest.format !== 'le-mondrian-static-v1' || !Array.isArray(manifest.files) ||
      manifest.files.some((name) => !generated.has(name) && !/^images\/optimized\/[\w.()-]+\.jpg$/.test(name))) {
    throw new Error('Manifeste out invalide. Aucun fichier modifié.');
  }
  previous = manifest.files;
  const expected = new Set([...previous, manifestName]);
  if (existing.some((name) => !expected.has(name))) {
    throw new Error('out contient des fichiers supplémentaires. Aucun fichier modifié.');
  }
}

fs.mkdirSync(output, { recursive: true });
for (const old of previous) if (!generated.has(old)) fs.unlinkSync(path.join(output, old));
for (const [name, bytes] of generated) {
  const destination = path.join(output, name);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, bytes);
}
fs.writeFileSync(path.join(output, manifestName), JSON.stringify({ format: 'le-mondrian-static-v1', files: [...generated.keys()].sort() }, null, 2) + '\n');
console.log(`Export statique créé dans ${output} (${pages.length} pages, ${generated.size - pages.length - shared.length} photos).`);