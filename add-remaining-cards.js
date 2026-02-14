const fs = require('fs');
const path = require('path');

const domains = [
  { file: 'teacher.cards.ts', prefix: 'te', domain: 'Teacher', domainName: 'Enseignant' },
  { file: 'urban-planning.cards.ts', prefix: 'up', domain: 'UrbanPlanning', domainName: 'Urbanisme' },
  { file: 'health.cards.ts', prefix: 'he', domain: 'Health', domainName: 'Santé' },
  { file: 'firefighter.cards.ts', prefix: 'fi', domain: 'Firefighter', domainName: 'Pompier' },
  { file: 'justice.cards.ts', prefix: 'ju', domain: 'Justice', domainName: 'Justice' },
  { file: 'finance.cards.ts', prefix: 'fn', domain: 'Finance', domainName: 'Finance' },
  { file: 'crafts.cards.ts', prefix: 'cr', domain: 'Crafts', domainName: 'Artisanat' },
  { file: 'military.cards.ts', prefix: 'mi', domain: 'Military', domainName: 'Militaire' },
];

function generateCards(domain) {
  const cards = [];
  const rarities = ['Common', 'Common', 'Common', 'Uncommon', 'Uncommon', 'Rare', 'Rare', 'Rare', 'Legendary', 'Legendary'];
  const abilities = [
    '',
    'Quand embauché : Piochez 1 carte.',
    'Célérité',
    'Construction',
    'Première Frappe',
    'Portée',
    'Quand embauché : Réparez 2 Résilience à un Métier ciblé.',
    'Quand embauché : Piochez 2 cartes.',
    'Vos autres Métiers gagnent +1 Résilience.',
    'Vos Métiers coûtent 1 de moins.',
  ];

  for (let i = 41; i <= 100; i++) {
    const id = `${domain.prefix}-${i.toString().padStart(3, '0')}`;
    const cost = Math.min(Math.max(1, Math.floor((i - 40) / 10) + 1), 8);
    const prod = Math.min(cost, 6);
    const res = Math.min(cost, 6);
    const rarity = rarities[Math.min(Math.floor((i - 41) / 6), 9)];
    const abilityIndex = (i % 10);
    const ability = abilityIndex < abilities.length ? abilities[abilityIndex] : '';

    const card = `  {
    id: '${id}',
    name: '${domain.domainName} ${i - 40}',
    domain: Domain.${domain.domain},
    type: CardType.Job,
    cost: ${cost},
    rarity: Rarity.${rarity},
    productivity: ${prod},
    resilience: ${res},
    ability: '${ability}',
    flavorText: '« Profession ${domain.domainName.toLowerCase()}. »',
    image: 'images/cards/${id}.png',
  },`;

    cards.push(card);
  }

  return cards.join('\n');
}

domains.forEach(domain => {
  const filePath = path.join(__dirname, 'src', 'app', 'data', domain.file);

  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove closing bracket
    content = content.trim();
    if (content.endsWith('];')) {
      content = content.slice(0, -2).trim();
      if (content.endsWith(',')) {
        content = content.slice(0, -1);
      }
      content += ',';
    }

    // Add new cards
    const newCards = '\n  // ── Extended Collection (41-100) ──\n' + generateCards(domain);
    content += newCards + '\n];';

    // Write back
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Added 60 cards to ${domain.file}`);
  } catch (error) {
    console.error(`✗ Error processing ${domain.file}:`, error.message);
  }
});

console.log('\n✓ All cards generated!');
console.log('Total new cards added: 480 (60 × 8 domains)');
console.log('Combined with existing: ~1070 total cards');
