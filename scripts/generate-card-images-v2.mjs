#!/usr/bin/env node

/**
 * Generate pixel art v2 card images using Hugging Face SDXL model.
 * SDXL supports negative_prompt, which helps avoid text artifacts.
 *
 * Usage:
 *   HF_TOKEN=hf_xxx node scripts/generate-card-images-v2.mjs
 *   HF_TOKEN=hf_xxx node scripts/generate-card-images-v2.mjs --domain IT
 *   HF_TOKEN=hf_xxx node scripts/generate-card-images-v2.mjs --only it-001,it-002
 *   HF_TOKEN=hf_xxx node scripts/generate-card-images-v2.mjs --dry-run
 *   HF_TOKEN=hf_xxx node scripts/generate-card-images-v2.mjs --force
 */

import { HfInference } from '@huggingface/inference';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUTPUT_DIR = join(ROOT, 'public', 'images', 'cards-v2');
const DATA_DIR = join(ROOT, 'src', 'app', 'data');

// ─── Config ───────────────────────────────────────────────────────────────────

const MODEL = 'stabilityai/stable-diffusion-xl-base-1.0';
const DELAY_MS = 2000;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 15000;

const NEGATIVE_PROMPT = [
  'text', 'words', 'letters', 'numbers', 'writing', 'caption', 'title',
  'label', 'watermark', 'signature', 'logo', 'font', 'typography',
  'speech bubble', 'dialogue', 'subtitle', 'banner', 'UI', 'HUD',
  'blurry', 'low quality', 'deformed', 'ugly', 'realistic photo',
].join(', ');

// ─── Domain metadata for prompts ──────────────────────────────────────────────

const DOMAIN_PROMPT_INFO = {
  Informatique: { en: 'Information Technology', color: 'blue', bg: '#e8f0fe' },
  Urbanisme: { en: 'Urban Planning & Construction', color: 'green', bg: '#e6f4ea' },
  Enseignement: { en: 'Education & Teaching', color: 'golden yellow', bg: '#fef7e0' },
  Police: { en: 'Police & Law Enforcement', color: 'red', bg: '#fce4ec' },
  Santé: { en: 'Healthcare & Medicine', color: 'teal', bg: '#e0f2f1' },
  Pompiers: { en: 'Firefighting & Rescue', color: 'orange', bg: '#fff3e0' },
  Justice: { en: 'Justice & Legal System', color: 'purple', bg: '#f3e5f5' },
  Finance: { en: 'Finance & Banking', color: 'slate grey', bg: '#eceff1' },
  Artisanat: { en: 'Crafts & Trades', color: 'warm brown', bg: '#efebe9' },
  Armée: { en: 'Military & Defense', color: 'olive green', bg: '#f1f8e9' },
};

const RARITY_PROMPT = {
  Commune: 'simple, clean design',
  'Peu commune': 'detailed design with subtle highlights',
  Rare: 'elaborate design with glowing accents and shimmer',
  Légendaire: 'epic, dramatic lighting, golden aura, legendary, masterwork',
};

const TYPE_PROMPT = {
  Métier: 'character portrait, person at work',
  Outil: 'iconic object, item, equipment, centered',
  Événement: 'dramatic scene, action moment',
};

// ─── Parse card data from TypeScript files ────────────────────────────────────

function parseCardsFromFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const cards = [];

  const cardBlockRegex = /\{[^{}]*?id:\s*'([^']+)'[\s\S]*?\n  \}/gm;
  let match;

  while ((match = cardBlockRegex.exec(content)) !== null) {
    const block = match[0];
    const id = match[1];

    const get = (key) => {
      const m = block.match(new RegExp(`${key}:\\s*(?:Domain\\.|CardType\\.|Rarity\\.)?(?:['"])?([^'",}]+)`));
      return m ? m[1].trim() : '';
    };

    const getQuoted = (key) => {
      const m = block.match(new RegExp(`${key}:\\s*'((?:[^'\\\\]|\\\\.)*)'`));
      return m ? m[1].replace(/\\'/g, "'") : '';
    };

    const domainMap = {
      IT: 'Informatique', UrbanPlanning: 'Urbanisme', Teacher: 'Enseignement',
      Police: 'Police', Health: 'Santé', Firefighter: 'Pompiers',
      Justice: 'Justice', Finance: 'Finance', Crafts: 'Artisanat', Military: 'Armée',
    };
    const typeMap = { Job: 'Métier', Tool: 'Outil', Event: 'Événement' };
    const rarityMap = {
      Common: 'Commune', Uncommon: 'Peu commune', Rare: 'Rare', Legendary: 'Légendaire',
    };

    const rawDomain = get('domain');
    const rawType = get('type');
    const rawRarity = get('rarity');

    cards.push({
      id,
      name: getQuoted('name'),
      domain: domainMap[rawDomain] || rawDomain,
      type: typeMap[rawType] || rawType,
      rarity: rarityMap[rawRarity] || rawRarity,
      flavorText: getQuoted('flavorText'),
      ability: getQuoted('ability'),
      effect: getQuoted('effect'),
    });
  }

  return cards;
}

function loadAllCards() {
  const cards = [];
  const files = readdirSync(DATA_DIR).filter(f => f.endsWith('.cards.ts'));

  for (const file of files) {
    const parsed = parseCardsFromFile(join(DATA_DIR, file));
    cards.push(...parsed);
  }

  cards.sort((a, b) => a.id.localeCompare(b.id));
  return cards;
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(card) {
  const domainInfo = DOMAIN_PROMPT_INFO[card.domain] || { en: card.domain, color: 'neutral', bg: '#f0f0f0' };
  const rarityHint = RARITY_PROMPT[card.rarity] || 'clean design';
  const typeHint = TYPE_PROMPT[card.type] || 'scene';

  const flavorHint = card.flavorText
    ? `, inspired by: ${card.flavorText.replace(/[«»"]/g, '')}`
    : '';

  return [
    `16-bit pixel art, retro RPG video game style, visible pixels, limited color palette, crisp edges.`,
    `Centered subject on solid ${domainInfo.color}-tinted background.`,
    `${typeHint}, ${domainInfo.en} themed.`,
    `Subject: ${card.name}${flavorHint}.`,
    `${rarityHint}.`,
    `Pure illustration, no interface elements.`,
  ].join(' ');
}

// ─── Image generation ─────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateImage(hf, card, attempt = 1) {
  const prompt = buildPrompt(card);

  try {
    const blob = await hf.textToImage({
      model: MODEL,
      inputs: prompt,
      parameters: {
        negative_prompt: NEGATIVE_PROMPT,
        width: 512,
        height: 512,
        num_inference_steps: 30,
        guidance_scale: 7.5,
      },
    });

    return Buffer.from(await blob.arrayBuffer());
  } catch (error) {
    if (attempt <= RETRY_ATTEMPTS) {
      const isRateLimit = error.message?.includes('429') || error.message?.includes('rate')
        || error.message?.includes('Too Many') || error.statusCode === 429;
      const isLoading = error.message?.includes('loading') || error.message?.includes('503');
      const delay = isLoading ? 30000 : isRateLimit ? RETRY_DELAY_MS * attempt : RETRY_DELAY_MS;
      console.log(`    Retry ${attempt}/${RETRY_ATTEMPTS} in ${delay / 1000}s... (${error.message || error})`);
      await sleep(delay);
      return generateImage(hf, card, attempt + 1);
    }
    throw error;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');

  const domainFlag = args.indexOf('--domain');
  const filterDomain = domainFlag >= 0 ? args[domainFlag + 1] : null;

  const onlyFlag = args.indexOf('--only');
  const filterIds = onlyFlag >= 0 ? args[onlyFlag + 1].split(',') : null;

  const token = process.env.HF_TOKEN;
  if (!token && !dryRun) {
    console.error('Error: Set HF_TOKEN environment variable.');
    console.error('Get a free token at https://huggingface.co/settings/tokens');
    process.exit(1);
  }

  const hf = token ? new HfInference(token) : null;

  console.log('Loading card data...');
  let cards = loadAllCards();
  console.log(`Found ${cards.length} cards total.`);

  if (filterDomain) {
    const domainMatch = Object.entries(DOMAIN_PROMPT_INFO)
      .find(([k]) => k.toLowerCase().startsWith(filterDomain.toLowerCase()));
    if (domainMatch) {
      cards = cards.filter(c => c.domain === domainMatch[0]);
      console.log(`Filtered to domain "${domainMatch[0]}": ${cards.length} cards.`);
    } else {
      console.error(`Unknown domain: ${filterDomain}`);
      console.error(`Available: ${Object.keys(DOMAIN_PROMPT_INFO).join(', ')}`);
      process.exit(1);
    }
  }

  if (filterIds) {
    cards = cards.filter(c => filterIds.includes(c.id));
    console.log(`Filtered to specific IDs: ${cards.length} cards.`);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  let toGenerate = cards;

  if (!force) {
    toGenerate = cards.filter(c => {
      const pngPath = join(OUTPUT_DIR, `${c.id}.png`);
      if (existsSync(pngPath)) {
        const stat = statSync(pngPath);
        return stat.size < 1000;
      }
      return true;
    });
    const skipped = cards.length - toGenerate.length;
    if (skipped > 0) {
      console.log(`Skipping ${skipped} already-generated images. Use --force to regenerate.`);
    }
  }

  if (toGenerate.length === 0) {
    console.log('Nothing to generate! All images exist.');
    return;
  }

  console.log(`\nModel: ${MODEL}`);
  console.log(`Negative prompt: ${NEGATIVE_PROMPT}`);
  console.log(`Will generate ${toGenerate.length} images.`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  if (dryRun) {
    console.log('=== DRY RUN — Prompts only ===\n');
    for (const card of toGenerate) {
      console.log(`[${card.id}] ${card.name} (${card.domain} / ${card.type} / ${card.rarity})`);
      console.log(`  Prompt: ${buildPrompt(card)}`);
      console.log();
    }
    console.log(`Total: ${toGenerate.length} images would be generated.`);
    return;
  }

  let generated = 0;
  let failed = 0;
  const failures = [];
  const startTime = Date.now();

  for (let i = 0; i < toGenerate.length; i++) {
    const card = toGenerate[i];
    const progress = `[${i + 1}/${toGenerate.length}]`;

    process.stdout.write(`${progress} ${card.id} (${card.name})... `);

    try {
      const imageBuffer = await generateImage(hf, card);
      const outputPath = join(OUTPUT_DIR, `${card.id}.png`);
      writeFileSync(outputPath, imageBuffer);

      const sizeKB = (imageBuffer.length / 1024).toFixed(1);
      console.log(`done (${sizeKB}KB)`);
      generated++;
    } catch (error) {
      console.log(`FAILED: ${error.message || error}`);
      failures.push(card.id);
      failed++;
    }

    if (i < toGenerate.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== Done in ${elapsed}s ===`);
  console.log(`Generated: ${generated}, Failed: ${failed}, Skipped: ${cards.length - toGenerate.length}`);

  if (failures.length > 0) {
    const failedFile = join(__dirname, 'failed-cards-v2.txt');
    writeFileSync(failedFile, failures.join('\n') + '\n');
    console.log(`\nFailed IDs written to: ${failedFile}`);
    console.log(`Re-run with: HF_TOKEN=... node scripts/generate-card-images-v2.mjs --only ${failures.join(',')}`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
