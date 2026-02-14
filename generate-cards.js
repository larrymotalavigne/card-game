const fs = require('fs');
const path = require('path');

// Domain configurations
const domains = [
  { name: 'police', prefix: 'po', theme: 'Police', jobs: [
    'Agent de Proximité', 'Policier Municipal', 'Agent Cynophile', 'Policier à Moto',
    'Lieutenant de Police', 'Agent Infiltré', 'Spécialiste Balistique', 'Commissaire',
    'Agent de Surveillance', 'Maître-Chien', 'Agent de Renseignement', 'Gardien de la Paix',
    'Agent BAC', 'Capitaine de Police', 'Négociateur RAID', 'Agent GIGN',
    'Profileur Criminel', 'Agent de Liaison', 'Contrôleur Routier', 'Agent des Stups',
    'Sergent-Chef', 'Agent de Protection Rapprochée', 'Analyste Vidéo', 'Agent CRS',
    'Commandant de Compagnie', 'Inspecteur Principal', 'Agent de Patrouille',
    'Agent de Police Judiciaire', 'Formateur Police', 'Agent des Frontières',
    'Expert en Désamorçage', 'Agent Pénitentiaire', 'Médecin Légiste',
    'Agent Anti-Émeute', 'Négociateur en Chef', 'Agent Motard d\'Escorte',
    'Contrôleur Général', 'Agent d\'Intervention', 'Spécialiste Cyber-Police',
    'Agent de Sécurité Ferroviaire', 'Inspecteur des Finances', 'Agent SWAT',
    'Chef de Section', 'Officier de Quart', 'Agent K-9',
    'Directeur de la Sécurité Publique', 'Agent de Proximité Mobile', 'Commandant RAID',
    'Expert en Explosifs', 'Responsable Cellule de Crise', 'Agent des Mœurs',
    'Coordinateur Opérationnel', 'Agent de Renseignement Territorial',
    'Procureur de la République', 'Brigade Fluviale', 'Unité Montée',
    'Préfet de Police', 'Ministre de l\'Intérieur'
  ]},
  { name: 'teacher', prefix: 'te', theme: 'Teacher', jobs: [] },
  { name: 'urban-planning', prefix: 'up', theme: 'UrbanPlanning', jobs: [] },
  { name: 'health', prefix: 'he', theme: 'Health', jobs: [] },
  { name: 'firefighter', prefix: 'fi', theme: 'Firefighter', jobs: [] },
  { name: 'justice', prefix: 'ju', theme: 'Justice', jobs: [] },
  { name: 'finance', prefix: 'fn', theme: 'Finance', jobs: [] },
  { name: 'crafts', prefix: 'cr', theme: 'Crafts', jobs: [] },
  { name: 'military', prefix: 'mi', theme: 'Military', jobs: [] },
];

// Generic job templates for quick generation
const jobTemplates = [
  { suffix: 'Junior', cost: 1, prod: 1, res: 1, rarity: 'Common' },
  { suffix: 'Assistant', cost: 2, prod: 2, res: 2, rarity: 'Common' },
  { suffix: 'Spécialiste', cost: 3, prod: 3, res: 2, rarity: 'Uncommon' },
  { suffix: 'Expert', cost: 4, prod: 3, res: 4, rarity: 'Rare' },
  { suffix: 'Chef d\'Équipe', cost: 4, prod: 4, res: 3, rarity: 'Rare' },
  { suffix: 'Responsable', cost: 5, prod: 4, res: 4, rarity: 'Rare' },
  { suffix: 'Directeur', cost: 6, prod: 5, res: 5, rarity: 'Epic' },
];

const abilities = [
  '',
  'Quand embauché : Piochez 1 carte.',
  'Célérité',
  'Construction',
  'Première Frappe',
  'Portée',
  'Quand embauché : Réparez 2 Résilience à un Métier ciblé.',
  'Quand embauché : Piochez 2 cartes.',
  'Vos autres Métiers du même domaine gagnent +1 Résilience.',
  'Vos Métiers du même domaine coûtent 1 de moins.',
  'Annule le prochain Événement adverse.',
  'Quand détruit : Piochez 1 carte.',
];

const flavorTexts = [
  'Au service de la communauté.',
  'Chaque jour compte.',
  'L\'expérience fait la différence.',
  'Efficacité et rigueur.',
  'Toujours prêt à intervenir.',
  'La qualité avant tout.',
];

function generateCard(id, name, domain, cost, prod, res, rarity, ability = '', flavor = '') {
  const domainCap = domain.charAt(0).toUpperCase() + domain.slice(1);
  const abilityStr = ability ? `ability: '${ability}',\n    ` : '';
  const flavorStr = flavor || flavorTexts[Math.floor(Math.random() * flavorTexts.length)];

  return `  {
    id: '${id}',
    name: '${name}',
    domain: Domain.${domainCap},
    type: CardType.Job,
    cost: ${cost},
    rarity: Rarity.${rarity},
    productivity: ${prod},
    resilience: ${res},
    ${abilityStr}flavorText: '« ${flavorStr} »',
    image: 'images/cards/${id}.png',
  },`;
}

function generateCardsForDomain(domain, start = 41, count = 60) {
  const cards = [];

  for (let i = 0; i < count; i++) {
    const num = start + i;
    const id = `${domain.prefix}-${num.toString().padStart(3, '0')}`;

    // Use specific job names if available, otherwise generate generic ones
    let name;
    if (domain.jobs && domain.jobs[i]) {
      name = domain.jobs[i];
    } else {
      const template = jobTemplates[i % jobTemplates.length];
      name = `${domain.theme} ${template.suffix} ${Math.floor(i / jobTemplates.length) + 1}`;
    }

    // Vary stats based on card number
    const cost = Math.min(1 + Math.floor(i / 10), 8);
    const prod = Math.min(cost, 6);
    const res = Math.min(cost, 6);
    const rarityMap = [
      'Common', 'Common', 'Common', 'Uncommon', 'Uncommon',
      'Rare', 'Rare', 'Epic', 'Epic', 'Legendary'
    ];
    const rarity = rarityMap[Math.min(Math.floor(i / 6), 9)];

    // Occasionally add abilities
    const ability = (i % 5 === 0) ? abilities[Math.floor(Math.random() * abilities.length)] : '';

    cards.push(generateCard(id, name, domain.name, cost, prod, res, rarity, ability));
  }

  return cards.join('\n');
}

// Generate and append cards to each domain file
domains.forEach(domain => {
  const filePath = path.join(__dirname, 'src', 'app', 'data', `${domain.name}.cards.ts`);

  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove the closing bracket and semicolon
    content = content.trim();
    if (content.endsWith('];')) {
      content = content.slice(0, -2).trim();
    }

    // Add new cards
    const newCards = '\n  // ── Extended Collection (41-100) ──\n' +
                     generateCardsForDomain(domain);
    content += newCards + '\n];';

    // Write back
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Added 60 cards to ${domain.name}`);
  } catch (error) {
    console.error(`✗ Error processing ${domain.name}:`, error.message);
  }
});

console.log('\n✓ Card generation complete!');
