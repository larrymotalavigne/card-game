#!/usr/bin/env node

/**
 * Update card data files to reference .png images instead of .svg
 *
 * Usage: node scripts/update-image-extensions.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'src', 'app', 'data');

const files = readdirSync(DATA_DIR).filter(f => f.endsWith('.cards.ts'));
let totalReplacements = 0;

for (const file of files) {
  const filePath = join(DATA_DIR, file);
  const content = readFileSync(filePath, 'utf-8');
  const updated = content.replace(/\.svg'/g, ".png'");
  const count = (content.match(/\.svg'/g) || []).length;

  if (count > 0) {
    writeFileSync(filePath, updated);
    console.log(`${file}: updated ${count} image paths`);
    totalReplacements += count;
  }
}

console.log(`\nTotal: ${totalReplacements} paths updated from .svg to .png`);
