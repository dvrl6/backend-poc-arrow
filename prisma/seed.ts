import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { manualLevels } from './levels/manual-levels';
import { remoteLevels } from './levels/remote-levels';

const prisma = new PrismaClient();

async function seedManualLevels(): Promise<void> {
  for (const level of manualLevels) {
    await prisma.level.upsert({
      where: { number: level.number },
      update: {
        name: level.name,
        difficulty: level.difficulty,
        generationType: 'manual',
        seed: null,
        definitionJson: level.definitionJson,
      },
      create: {
        number: level.number,
        name: level.name,
        difficulty: level.difficulty,
        generationType: 'manual',
        seed: null,
        definitionJson: level.definitionJson,
      },
    });
  }
}

// Additional real, playable levels in the reserved remote-only band
// (number >= 1000). Additive/idempotent upsert by number; never touches the
// local levels (1-30) seeded above.
async function seedRemoteLevels(): Promise<void> {
  for (const level of remoteLevels) {
    await prisma.level.upsert({
      where: { number: level.number },
      update: {
        name: level.name,
        difficulty: level.difficulty,
        generationType: 'manual',
        seed: null,
        definitionJson: level.definitionJson,
      },
      create: {
        number: level.number,
        name: level.name,
        difficulty: level.difficulty,
        generationType: 'manual',
        seed: null,
        definitionJson: level.definitionJson,
      },
    });
  }
}

async function seedOptionalAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      role: UserRole.ADMIN,
      passwordHash,
    },
    create: {
      email,
      displayName: 'Demo Admin',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });
}

async function main(): Promise<void> {
  await seedManualLevels();
  await seedRemoteLevels();
  await seedOptionalAdmin();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
