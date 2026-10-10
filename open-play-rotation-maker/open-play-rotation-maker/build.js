// Bundles index.html + css/ + js/ into one self-contained file: dist/open-play-rotation-maker.html
// Run with:  node build.js
// The single file is what gets published as the shareable link.

const fs = require('fs');
const path = require('path');

const root = __dirname;
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

let html = read('index.html');

// Inline local stylesheets.
html = html.replace(/<link rel="stylesheet" href="(?!https?:)([^"]+)">/g,
  (_, href) => `<style>\n${read(href)}</style>`);

// Inline local scripts, joined into one <script> block in the same order.
const scripts = [];
html = html.replace(/<script src="(?!https?:)([^"]+)"><\/script>\n?/g, (_, src) => {
  scripts.push(`// ---- ${src} ----\n${read(src)}`);
  return '';
});
html = html.replace('</body>', `<script>\n${scripts.join('\n')}</script>\n</body>`);

// The publishing host adds its own <html>/<head>/<body> wrapper, so strip ours.
html = html
  .replace(/<!doctype html>\s*/i, '')
  .replace(/<\/?(html|head|body)[^>]*>\s*/gi, '')
  .replace(/<meta [^>]*>\s*/gi, '')
  .replace(/<!-- Load order[^>]*-->\s*/, '');

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', 'open-play-rotation-maker.html');
fs.writeFileSync(out, html);
console.log('Built ' + path.relative(root, out));
