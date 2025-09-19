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

// Files to copy as-is
const copyFiles = [
  'index.html',
  'troop_swap_calculator.html',
  'battle_results.html',
  'control_point.html',
  'known_enemies.html',
  '404.html',
  'manifest.webmanifest',
  'service-worker.js',
  'icon-192.png',
  'icon-192-maskable.png',
  'icon-256.png',
  'icon-384.png',
  'icon-512.png',
  'icon-512-maskable.png',
  'screenshot-desktop.png',
  'screenshot-mobile.png',
  '.htaccess',
  '_redirects',
  '_config.yml'
];

// Files to minify
const minifyFiles = {
  'styles.css': minifyCSS,
  'app.js': minifyJS
};

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Copy .well-known directory
if (fs.existsSync('.well-known')) {
  if (!fs.existsSync('dist/.well-known')) {
    fs.mkdirSync('dist/.well-known');
  }
  fs.copyFileSync('.well-known/assetlinks.json', 'dist/.well-known/assetlinks.json');
}

console.log('Building for production...');

// Copy files as-is
copyFiles.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, `dist/${file}`);
    console.log(`Copied: ${file}`);
  } else {
    console.warn(`Warning: ${file} not found`);
  }
});

// Minify files
Object.entries(minifyFiles).forEach(([file, minifyFn]) => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const minified = minifyFn(content);
    fs.writeFileSync(`dist/${file}`, minified);
    console.log(`Minified: ${file}`);
  } else {
    console.warn(`Warning: ${file} not found`);
  }
});

console.log('Build complete! Files are in the dist/ directory.');
console.log('Deploy the contents of dist/ to your hosting provider.');
