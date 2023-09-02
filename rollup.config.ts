// Rollup builds only the browser version using the Node.js build.
import { nodeResolve as resolve } from '@rollup/plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import minify from 'rollup-plugin-babel-minify';
import json from '@rollup/plugin-json';

const BrowserBuildPath = './dist/browser/ucore.min.js';

export default [{
  input: './dist/nodejs/index.js',
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  onwarn: (message) => {
    if (message.code === 'MISSING_NODE_BUILTINS') return;
  },
  output: {
    name: 'Ucore',
    file: BrowserBuildPath,
    format: 'iife',
    sourcemap: false,
    globals: {
      'http': '{}',
      'https': '{}',
    },
  },
  plugins: [
    resolve({
      preferBuiltins: true,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      jsnext: true,
      main: true,
      browser: true,
    }),
    commonjs({
      namedExports: { Ucore: ['UCORE'] },
    }),
    minify({ comments: false }),
    json(),
  ],
  external: [
    'http',
    'https',
  ]
}];
