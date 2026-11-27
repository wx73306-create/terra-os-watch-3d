import { readFile, writeFile } from 'node:fs/promises';
import { EOL } from 'node:os';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const sourceDir = fileURLToPath(new URL('.', import.meta.url));
const [template, ui, model, result] = await Promise.all([
  readFile(new URL('page.html', import.meta.url), 'utf8'),
  readFile(new URL('watch-screen.html', import.meta.url)),
  readFile(new URL('watch1127.glb', import.meta.url)),
  build({
    absWorkingDir: sourceDir,
    entryPoints: ['viewer.js'],
    bundle: true,
    format: 'iife',
    minify: true,
    legalComments: 'inline',
    write: false,
  }),
]);

const script = result.outputFiles[0].text.replaceAll('</script', '<\\/script');
const replacements = {
  WATCH_UI: ui.toString('base64'),
  WATCH_MODEL: model.toString('base64'),
  VIEWER: script,
};
const html = template.replace(/\{\{(WATCH_UI|WATCH_MODEL|VIEWER)\}\}/g, (_, key) => replacements[key]);
await writeFile(new URL('../index.html', import.meta.url), html.replace(/\r?\n/g, EOL));
