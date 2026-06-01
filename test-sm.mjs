import { rspack } from '@rspack/core';
import path from 'path';
import fs from 'fs';
import { tmpdir } from 'os';

const outDir = path.join(tmpdir(), 'rspack-sm-test-' + Date.now());
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'index.ts'), 'const a = 1;\nexport default a;');

const compiler = rspack({
  mode: 'development',
  entry: path.join(outDir, 'index.ts'),
  output: { path: path.join(outDir, 'dist'), filename: 'index.js' },
  module: {
    rules: [{
      test: /\.ts$/,
      use: {
        loader: 'builtin:swc-loader',
        options: { jsc: { parser: { syntax: 'typescript' } } }
      }
    }]
  },
  plugins: [
    new rspack.SourceMapDevToolPlugin({
      filename: null,
      test: /\.js$/,
    })
  ]
});

compiler.run((err, stats) => {
  if (err) { console.error(err); process.exit(1); }
  const content = fs.readFileSync(path.join(outDir, 'dist', 'index.js'), 'utf-8');
  console.log('Has sourcemap:', content.includes('sourceMappingURL'));
  console.log('Tail:', content.slice(-100));
  fs.rmSync(outDir, { recursive: true, force: true });
});
