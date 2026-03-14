const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Radio frequencies (the dial)
  const vibes = [
    { name: 'Late Night Drive', slug: 'late-night-drive', description: 'Dark, cruising, after-hours energy', color: '#1a003a', frequency: 88 },
    { name: 'Warehouse', slug: 'warehouse', description: 'Raw, industrial, high-energy', color: '#ff0066', frequency: 92 },
    { name: 'Sunset', slug: 'sunset', description: 'Warm, melodic, winding down', color: '#ff9966', frequency: 96 },
    { name: 'Deep Focus', slug: 'deep-focus', description: 'Minimal, hypnotic, work mode', color: '#0066cc', frequency: 102 },
    { name: 'Underground', slug: 'underground', description: 'Experimental, leftfield', color: '#333333', frequency: 108 },
  ];

  for (const vibe of vibes) {
    await prisma.vibe.upsert({
      where: { slug: vibe.slug },
      update: {},
      create: vibe,
    });
  }

  // Initialize now playing
  await prisma.nowPlaying.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton' },
  });

  console.log('📻 Selecta frequencies tuned:');
  vibes.forEach(v => console.log(`  ${v.frequency} FM — ${v.name}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
