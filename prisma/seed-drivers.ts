import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DRIVERS = [
  {
    fullName: 'تامر سمير السيد عبدالله',
    email: 'tamer.samir@ams-transport.sa',
    phone: '+966554517253',
    licenseNumber: '2601678291',
    plate: 'ا ص ر ٩٨٨٧',
    carType: 'starex' as const,
    carBrand: 'Hyundai',
    carModel: 'Starex',
    totalSeats: 12,
  },
  {
    fullName: 'محمد نصر عباس غانم',
    email: 'mohamed.nasr@ams-transport.sa',
    phone: '+966562975956',
    licenseNumber: '2605475041',
    plate: 'ا س ه ١٤٩٣',
    carType: 'staria' as const,
    carBrand: 'Hyundai',
    carModel: 'Staria',
    totalSeats: 11,
  },
  {
    fullName: 'تامر احمد ابراهيم بحيري',
    email: 'tamer.ahmed@ams-transport.sa',
    phone: '+966562661706',
    licenseNumber: '2624429672',
    plate: 'ا ص ر ٩٣١٣',
    carType: 'starex' as const,
    carBrand: 'Hyundai',
    carModel: 'Starex',
    totalSeats: 12,
  },
  {
    fullName: 'عمرو محمد محسن مرجان',
    email: 'amr.marjan@ams-transport.sa',
    phone: '+966573953244',
    licenseNumber: '2628074391',
    plate: 'ا س ه ١٥٢٥',
    carType: 'staria' as const,
    carBrand: 'Hyundai',
    carModel: 'Staria',
    totalSeats: 11,
  },
  {
    fullName: 'اسلام محمد عبدالهادي غريب',
    email: 'islam.gharib@ams-transport.sa',
    phone: '+966564719881',
    licenseNumber: '2628149573',
    plate: 'ا ص م ٩٠٣٨',
    carType: 'starex' as const,
    carBrand: 'Hyundai',
    carModel: 'Starex',
    totalSeats: 12,
  },
];

async function main() {
  console.log('Seeding car type configs for starex/staria...');

  await prisma.carTypeConfig.upsert({
    where: { carType: 'starex' },
    update: { bookingMode: 'whole_car', defaultCapacity: 12, labelAr: 'هيونداي ستاريكس', labelEn: 'Hyundai Starex', isActive: true },
    create: { carType: 'starex', bookingMode: 'whole_car', defaultCapacity: 12, labelAr: 'هيونداي ستاريكس', labelEn: 'Hyundai Starex', isActive: true },
  });

  await prisma.carTypeConfig.upsert({
    where: { carType: 'staria' },
    update: { bookingMode: 'whole_car', defaultCapacity: 11, labelAr: 'هيونداي ستاريا', labelEn: 'Hyundai Staria', isActive: true },
    create: { carType: 'staria', bookingMode: 'whole_car', defaultCapacity: 11, labelAr: 'هيونداي ستاريا', labelEn: 'Hyundai Staria', isActive: true },
  });

  console.log('  ✓ starex + staria configs');

  const defaultPassword = await bcrypt.hash('Driver@2026', 12);

  for (const d of DRIVERS) {
    console.log(`\nSeeding driver: ${d.fullName}`);

    const user = await prisma.user.upsert({
      where: { email: d.email },
      update: { fullName: d.fullName, phone: d.phone, role: 'driver', status: 'active' },
      create: {
        fullName: d.fullName,
        email: d.email,
        phone: d.phone,
        password: defaultPassword,
        role: 'driver',
        status: 'active',
      },
    });
    console.log(`  ✓ User: ${user.id}`);

    const profile = await prisma.driverProfile.upsert({
      where: { userId: user.id },
      update: {
        licenseNumber: d.licenseNumber,
        approvalStatus: 'approved',
        approvedAt: new Date(),
      },
      create: {
        userId: user.id,
        licenseNumber: d.licenseNumber,
        approvalStatus: 'approved',
        approvedAt: new Date(),
      },
    });
    console.log(`  ✓ DriverProfile: ${profile.id}`);

    const existing = await prisma.car.findUnique({ where: { plateNumber: d.plate } });
    if (existing) {
      console.log(`  ⚠ Car already exists: ${d.plate} — skipping`);
      continue;
    }

    const car = await prisma.car.create({
      data: {
        driverId: profile.id,
        carType: d.carType,
        plateNumber: d.plate,
        brand: d.carBrand,
        model: d.carModel,
        year: 2023,
        totalSeats: d.totalSeats,
        status: 'active',
      },
    });
    console.log(`  ✓ Car: ${car.id} (${d.plate})`);
  }

  console.log('\nSeed complete.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
