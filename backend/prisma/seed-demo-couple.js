/**
 * Seed a ready-to-use demo couple: two email/password accounts linked by an
 * active Relationship with shared consent, so every couple feature (matchup,
 * shared goals, partner activity, meetings, etc.) works out of the box.
 *
 * Usage:
 *   node prisma/seed-demo-couple.js            # from backend/
 *   npm run seed:demo-couple                   # from backend/
 *
 * Accounts created (idempotent — safe to re-run):
 *   alex@demo.loverescue.app  / DemoCouple2026!
 *   jamie@demo.loverescue.app / DemoCouple2026!
 *
 * Override the password with DEMO_COUPLE_PASSWORD (min 8 chars, matching the
 * signup rule in routes/auth.js). Both accounts are seeded as `premium` so
 * nothing is paywalled while demoing.
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const PASSWORD = process.env.DEMO_COUPLE_PASSWORD || 'DemoCouple2026!';

const partners = [
  {
    email: 'alex@demo.loverescue.app',
    firstName: 'Alex',
    lastName: 'Demo',
    gender: 'male',
  },
  {
    email: 'jamie@demo.loverescue.app',
    firstName: 'Jamie',
    lastName: 'Demo',
    gender: 'female',
  },
];

async function main() {
  if (PASSWORD.length < 8) {
    throw new Error('DEMO_COUPLE_PASSWORD must be at least 8 characters');
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const users = [];
  for (const partner of partners) {
    const user = await prisma.user.upsert({
      where: { email: partner.email },
      update: {
        passwordHash,
        firstName: partner.firstName,
        lastName: partner.lastName,
        gender: partner.gender,
        subscriptionStatus: 'premium',
      },
      create: {
        ...partner,
        passwordHash,
        authProvider: 'email',
        subscriptionStatus: 'premium',
      },
    });
    users.push(user);
    console.log(`User ready: ${user.email} (${user.id})`);
  }

  const [alex, jamie] = users;

  let relationship = await prisma.relationship.findFirst({
    where: {
      OR: [
        { user1Id: alex.id, user2Id: jamie.id },
        { user1Id: jamie.id, user2Id: alex.id },
      ],
    },
  });

  if (relationship) {
    relationship = await prisma.relationship.update({
      where: { id: relationship.id },
      data: { status: 'active', sharedConsent: true },
    });
    console.log(`Relationship already existed, refreshed: ${relationship.id}`);
  } else {
    relationship = await prisma.relationship.create({
      data: {
        user1Id: alex.id,
        user2Id: jamie.id,
        status: 'active',
        sharedConsent: true,
      },
    });
    console.log(`Relationship created: ${relationship.id}`);
  }

  console.log('\nDemo couple ready to log in:');
  for (const partner of partners) {
    console.log(`  ${partner.email} / ${PASSWORD}`);
  }
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
