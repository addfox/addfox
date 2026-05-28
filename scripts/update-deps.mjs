import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const files = [
  'examples/addfox-with-react/package.json',
  'examples/addfox-with-vue-tsx/package.json',
  'examples/addfox-with-solid/package.json',
  'examples/addfox-with-svelte/package.json',
  'examples/addfox-with-preact/package.json',
  'examples/addfox-with-react-entry-false/package.json',
  'examples/addfox-with-react-shadcn/package.json',
  'examples/addfox-with-uno/package.json',
  'examples/addfox-with-tailwindcss/package.json',
  'examples/addfox-with-firefox-react/package.json',
  'examples/addfox-with-content-ui-react/package.json',
  'docs/package.json',
  'packages/create-addfox-app/templates/template-react-ts/package.json',
  'packages/create-addfox-app/templates/template-react-js/package.json',
  'packages/create-addfox-app/templates/template-vue-ts/package.json',
  'packages/create-addfox-app/templates/template-vue-js/package.json',
  'packages/create-addfox-app/templates/template-solid-ts/package.json',
  'packages/create-addfox-app/templates/template-solid-js/package.json',
  'packages/create-addfox-app/templates/template-svelte-ts/package.json',
  'packages/create-addfox-app/templates/template-svelte-js/package.json',
  'packages/create-addfox-app/templates/template-preact-ts/package.json',
  'packages/create-addfox-app/templates/template-preact-js/package.json',
];

const replacements = {
  '@rsbuild/plugin-react': '2.0.0',
  '@rsbuild/plugin-vue': '1.2.8',
  '@rsbuild/plugin-vue-jsx': '2.0.0',
  '@rsbuild/plugin-babel': '1.2.0',
  '@rsbuild/plugin-solid': '1.2.0',
  '@rsbuild/plugin-svelte': '1.1.1',
  '@rsbuild/plugin-preact': '1.7.2',
  '@rsbuild/plugin-node-polyfill': '1.4.4',
  '@rsdoctor/rspack-plugin': '1.5.11',
};

for (const file of files) {
  const fp = path.join(root, file);
  if (!fs.existsSync(fp)) {
    console.log('SKIP (not found):', file);
    continue;
  }
  let content = fs.readFileSync(fp, 'utf-8');
  let changed = false;
  for (const [pkg, version] of Object.entries(replacements)) {
    const regex = new RegExp(`("${pkg.replace(/\//g, '\\/')}": "\\^?)([^"]+)(")`, 'g');
    content = content.replace(regex, (match, p1, p2, p3) => {
      if (p2 !== version) {
        changed = true;
        return `"${pkg}": "${version}"`;
      }
      return match;
    });
  }
  if (changed) {
    fs.writeFileSync(fp, content, 'utf-8');
    console.log('UPDATED:', file);
  } else {
    console.log('NO CHANGE:', file);
  }
}
