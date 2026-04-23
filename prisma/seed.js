"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding car type configs...');
    const carTypes = [
        { carType: 'sedan', bookingMode: 'whole_car', defaultCapacity: 4, labelAr: 'سيدان', labelEn: 'Sedan' },
        { carType: 'family', bookingMode: 'whole_car', defaultCapacity: 7, labelAr: 'عائلي', labelEn: 'Family' },
        { carType: 'vip', bookingMode: 'whole_car', defaultCapacity: 4, labelAr: 'في آي بي', labelEn: 'VIP' },
        { carType: 'limousine', bookingMode: 'whole_car', defaultCapacity: 6, labelAr: 'ليموزين', labelEn: 'Limousine' },
        { carType: 'minibus', bookingMode: 'per_seat', defaultCapacity: 14, labelAr: 'ميني باص', labelEn: 'Minibus' },
        { carType: 'bus', bookingMode: 'per_seat', defaultCapacity: 50, labelAr: 'باص', labelEn: 'Bus' },
    ];
    for (const config of carTypes) {
        await prisma.carTypeConfig.upsert({
            where: { carType: config.carType },
            update: { labelAr: config.labelAr, labelEn: config.labelEn, isActive: true },
            create: { ...config, isActive: true },
        });
        console.log(`  ✓ ${config.labelEn} (${config.bookingMode})`);
    }
    console.log('\nSeed complete.');
}
main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map