#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Simple minification functions
function minifyCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/;\s*}/g, '}') // Remove semicolons before closing braces
    .replace(/{\s+/g, '{') // Remove spaces after opening braces
    .replace(/;\s+/g, ';') // Remove spaces after semicolons
    .trim();
}

function minifyJS(js) {
  return js
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*$/gm, '') // Remove line comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/;\s*}/g, '}') // Remove semicolons before closing braces
    .replace(/{\s+/g, '{') // Remove spaces after opening braces
    .replace(/;\s+/g, ';') // Remove spaces after semicolons
    .trim();
}

// Build configuration for new structure
const buildConfig = {
  // Copy from public/ to dist/
  publicFiles: [
    'index.html',
    '404.html',
    'manifest.webmanifest',
    'service-worker.js',
    '_redirects',
    '_headers'
  ],
  
  // Copy from public/icons/ to dist/icons/
  iconFiles: [
    'icon-192.png',
    'icon-192-maskable.png',
    'icon-256.png',
    'icon-384.png',
    'icon-512.png',
    'icon-512-maskable.png'
  ],
  
  // Copy from public/pages/ to dist/pages/
  pageFiles: [
    'troop_swap_calculator.html',
    'battle_results.html',
    'control_point.html',
    'known_enemies.html'
  ],
  
  // Minify from src/ and copy to dist/
  sourceFiles: {
    'src/styles/styles.css': 'styles.css',
    'src/scripts/app.js': 'app.js',
    'src/scripts/components/shared-nav.js': 'scripts/shared-nav.js',
    'src/scripts/components/shared-footer.js': 'scripts/shared-footer.js'
  }
};

// Ensure dist directory structure exists
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

ensureDir('dist');
ensureDir('dist/icons');
ensureDir('dist/pages');
ensureDir('dist/scripts');

console.log('Building for production...');

// Copy public files
buildConfig.publicFiles.forEach(file => {
  const sourcePath = `public/${file}`;
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, `dist/${file}`);
    console.log(`Copied: ${sourcePath} → dist/${file}`);
  } else {
    console.warn(`Warning: ${sourcePath} not found`);
  }
});

// Copy icon files
buildConfig.iconFiles.forEach(file => {
  const sourcePath = `public/icons/${file}`;
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, `dist/icons/${file}`);
    console.log(`Copied: ${sourcePath} → dist/icons/${file}`);
  } else {
    console.warn(`Warning: ${sourcePath} not found`);
  }
});

// Copy page files
buildConfig.pageFiles.forEach(file => {
  const sourcePath = `public/pages/${file}`;
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, `dist/pages/${file}`);
    console.log(`Copied: ${sourcePath} → dist/pages/${file}`);
  } else {
    console.warn(`Warning: ${sourcePath} not found`);
  }
});

// Process source files (minify and copy)
Object.entries(buildConfig.sourceFiles).forEach(([sourcePath, destPath]) => {
  if (fs.existsSync(sourcePath)) {
    const content = fs.readFileSync(sourcePath, 'utf8');
    
    // Determine minification function based on file type
    let minified;
    if (sourcePath.endsWith('.css')) {
      minified = minifyCSS(content);
    } else if (sourcePath.endsWith('.js')) {
      minified = minifyJS(content);
    } else {
      minified = content;
    }
    
    fs.writeFileSync(`dist/${destPath}`, minified);
    console.log(`Processed: ${sourcePath} → dist/${destPath}`);
  } else {
    console.warn(`Warning: ${sourcePath} not found`);
  }
});

// Copy .well-known directory if it exists
if (fs.existsSync('.well-known')) {
  ensureDir('dist/.well-known');
  if (fs.existsSync('.well-known/assetlinks.json')) {
    fs.copyFileSync('.well-known/assetlinks.json', 'dist/.well-known/assetlinks.json');
    console.log('Copied: .well-known/assetlinks.json');
  }
}

console.log('Build complete! Files are in the dist/ directory.');
console.log('Deploy the contents of dist/ to your hosting provider.');
