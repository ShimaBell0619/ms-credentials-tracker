import { readFileSync } from 'node:fs';

const html = readFileSync('dist/index.html', 'utf8');
const assetReferences = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
const absoluteLocalReferences = assetReferences.filter((reference) => reference.startsWith('/'));

if (absoluteLocalReferences.length > 0) {
  throw new Error(`GitHub Pages build contains root-absolute asset references: ${absoluteLocalReferences.join(', ')}`);
}

if (!assetReferences.some((reference) => reference.startsWith('./assets/'))) {
  throw new Error('GitHub Pages build did not contain relative ./assets references.');
}

console.log('GitHub Pages asset paths are relative and safe for nested PR preview paths.');
