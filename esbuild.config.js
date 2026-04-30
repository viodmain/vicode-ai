const esbuild = require('esbuild');

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  sourcemap: true,
  mainFields: ['module', 'main'],
  banner: {
    js: `
      // vicode - AI Sandbox Visualizer
      // Copyright (c) 2024
    `
  }
};

async function main() {
  if (isWatch) {
    const context = await esbuild.context(buildOptions);
    await context.watch();
    console.log('🔍 Watching for changes...');
  } else {
    await esbuild.build(buildOptions);
    console.log('✅ Extension built successfully');
  }
}

main().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
