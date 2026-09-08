import { readFile } from 'node:fs/promises';
import path from 'node:path';

const output = path.resolve('dist/index.html');
const html = await readFile(output, 'utf8');
if (!html.includes('<div id="root"></div>')) {
  throw new Error('dist/index.html does not contain the application root');
}
if (!html.includes('assets/')) {
  throw new Error('dist/index.html does not reference built assets');
}
