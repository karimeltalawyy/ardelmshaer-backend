import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  if (process.env.ALLOW_DEV_SEED !== 'true') {
    console.log('Seed is disabled by default. Set ALLOW_DEV_SEED=true to run dev seeding.');
    return;
  }

  console.log('Seeding car type configs (dev only)...');

  const carTypes = [
    { carType: 'sedan',     bookingMode: 'whole_car', defaultCapacity: 4,  labelAr: 'سيدان',     labelEn: 'Sedan'     },
    { carType: 'family',    bookingMode: 'whole_car', defaultCapacity: 7,  labelAr: 'عائلي',     labelEn: 'Family'    },
    { carType: 'vip',       bookingMode: 'whole_car', defaultCapacity: 4,  labelAr: 'في آي بي',  labelEn: 'VIP'       },
    { carType: 'limousine', bookingMode: 'whole_car', defaultCapacity: 6,  labelAr: 'ليموزين',   labelEn: 'Limousine' },
    { carType: 'minibus',   bookingMode: 'per_seat',  defaultCapacity: 14, labelAr: 'ميني باص',  labelEn: 'Minibus'   },
    { carType: 'bus',       bookingMode: 'per_seat',  defaultCapacity: 50, labelAr: 'باص',       labelEn: 'Bus'       },
  ] as const;

  for (const config of carTypes) {
    await prisma.carTypeConfig.upsert({
      where: { carType: config.carType },
      update: { labelAr: config.labelAr, labelEn: config.labelEn, isActive: true },
      create: { ...config, isActive: true },
    });
    console.log(`  ✓ ${config.labelEn} (${config.bookingMode})`);
  }

  const adminEmail = process.env.DEV_SEED_ADMIN_EMAIL;
  const adminPassword = process.env.DEV_SEED_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    console.log('\nSeeding admin account (dev only)...');
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 12);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        fullName: 'Platform Admin',
        password: hashedAdminPassword,
        role: 'admin',
        status: 'active',
      },
      create: {
        fullName: 'Platform Admin',
        email: adminEmail,
        password: hashedAdminPassword,
        role: 'admin',
        status: 'active',
      },
    });
    console.log(`  ✓ ${adminEmail}`);
  } else {
    console.log('\nSkipping admin seed (DEV_SEED_ADMIN_EMAIL/DEV_SEED_ADMIN_PASSWORD not set).');
  }

  console.log('\nDev seed complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
