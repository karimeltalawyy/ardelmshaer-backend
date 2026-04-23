"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const destinations = [
    { nameAr: 'مكة المكرمة', nameEn: 'Makkah', type: 'city', region: 'Makkah', sortOrder: 1 },
    { nameAr: 'المسجد الحرام', nameEn: 'Al-Masjid Al-Haram', type: 'landmark', region: 'Makkah', sortOrder: 2 },
    { nameAr: 'العزيزية', nameEn: 'Al-Aziziyah', type: 'landmark', region: 'Makkah', sortOrder: 3 },
    { nameAr: 'الشيشة', nameEn: 'Al-Shisha', type: 'landmark', region: 'Makkah', sortOrder: 4 },
    { nameAr: 'منى', nameEn: 'Mina', type: 'landmark', region: 'Makkah', sortOrder: 5 },
    { nameAr: 'عرفات', nameEn: 'Arafat', type: 'landmark', region: 'Makkah', sortOrder: 6 },
    { nameAr: 'مزدلفة', nameEn: 'Muzdalifah', type: 'landmark', region: 'Makkah', sortOrder: 7 },
    { nameAr: 'الزاهر', nameEn: 'Al-Zahir', type: 'landmark', region: 'Makkah', sortOrder: 8 },
    { nameAr: 'أجياد', nameEn: 'Ajyad', type: 'landmark', region: 'Makkah', sortOrder: 9 },
    { nameAr: 'النزهة - مكة', nameEn: 'Al-Nuzha (Makkah)', type: 'landmark', region: 'Makkah', sortOrder: 10 },
    { nameAr: 'مطار الملك عبدالعزيز الدولي', nameEn: 'King Abdulaziz Intl Airport', type: 'airport', region: 'Jeddah', sortOrder: 11 },
    { nameAr: 'المسجد النبوي', nameEn: 'Al-Masjid Al-Nabawi', type: 'landmark', region: 'Madinah', sortOrder: 2 },
    { nameAr: 'قباء', nameEn: 'Quba', type: 'landmark', region: 'Madinah', sortOrder: 3 },
    { nameAr: 'العوالي', nameEn: 'Al-Awali', type: 'landmark', region: 'Madinah', sortOrder: 4 },
    { nameAr: 'العيون - المدينة', nameEn: 'Al-Uyun (Madinah)', type: 'landmark', region: 'Madinah', sortOrder: 5 },
    { nameAr: 'مطار الأمير محمد بن عبدالعزيز', nameEn: 'Prince Mohammed bin Abdulaziz Airport', type: 'airport', region: 'Madinah', sortOrder: 6 },
    { nameAr: 'جدة', nameEn: 'Jeddah', type: 'city', region: 'Jeddah', sortOrder: 1 },
    { nameAr: 'البلد الجديد - جدة', nameEn: 'Al-Balad (Jeddah)', type: 'landmark', region: 'Jeddah', sortOrder: 2 },
    { nameAr: 'حي الروضة - جدة', nameEn: 'Al-Rawdah (Jeddah)', type: 'landmark', region: 'Jeddah', sortOrder: 3 },
    { nameAr: 'أبحر الشمالية', nameEn: 'Obhur Al-Shamaliyah', type: 'landmark', region: 'Jeddah', sortOrder: 4 },
    { nameAr: 'الطائف', nameEn: 'Taif', type: 'city', region: 'Taif', sortOrder: 1 },
    { nameAr: 'الهدا', nameEn: 'Al-Hada', type: 'landmark', region: 'Taif', sortOrder: 2 },
    { nameAr: 'الشفا', nameEn: 'Al-Shafa', type: 'landmark', region: 'Taif', sortOrder: 3 },
    { nameAr: 'مطار الطائف الدولي', nameEn: 'Taif International Airport', type: 'airport', region: 'Taif', sortOrder: 4 },
    { nameAr: 'الرياض', nameEn: 'Riyadh', type: 'city', region: 'Riyadh', sortOrder: 1 },
    { nameAr: 'مطار الملك خالد الدولي', nameEn: 'King Khalid Intl Airport', type: 'airport', region: 'Riyadh', sortOrder: 2 },
    { nameAr: 'ينبع', nameEn: 'Yanbu', type: 'city', region: 'Madinah', sortOrder: 10 },
    { nameAr: 'مطار ينبع', nameEn: 'Yanbu Airport', type: 'airport', region: 'Madinah', sortOrder: 11 },
    { nameAr: 'تبوك', nameEn: 'Tabuk', type: 'city', region: 'Tabuk', sortOrder: 1 },
    { nameAr: 'مطار تبوك الإقليمي', nameEn: 'Tabuk Regional Airport', type: 'airport', region: 'Tabuk', sortOrder: 2 },
    { nameAr: 'أبها', nameEn: 'Abha', type: 'city', region: 'Asir', sortOrder: 1 },
    { nameAr: 'خميس مشيط', nameEn: 'Khamis Mushait', type: 'city', region: 'Asir', sortOrder: 2 },
    { nameAr: 'مطار أبها الدولي', nameEn: 'Abha International Airport', type: 'airport', region: 'Asir', sortOrder: 3 },
    { nameAr: 'نجران', nameEn: 'Najran', type: 'city', region: 'Najran', sortOrder: 1 },
    { nameAr: 'مطار نجران', nameEn: 'Najran Airport', type: 'airport', region: 'Najran', sortOrder: 2 },
    { nameAr: 'جازان', nameEn: 'Jazan', type: 'city', region: 'Jazan', sortOrder: 1 },
    { nameAr: 'مطار جازان الإقليمي', nameEn: 'Jazan Regional Airport', type: 'airport', region: 'Jazan', sortOrder: 2 },
    { nameAr: 'بريدة', nameEn: 'Buraydah', type: 'city', region: 'Al-Qassim', sortOrder: 1 },
    { nameAr: 'عنيزة', nameEn: 'Unayzah', type: 'city', region: 'Al-Qassim', sortOrder: 2 },
    { nameAr: 'مطار القصيم الإقليمي', nameEn: 'Al-Qassim Regional Airport', type: 'airport', region: 'Al-Qassim', sortOrder: 3 },
    { nameAr: 'حائل', nameEn: 'Hail', type: 'city', region: 'Hail', sortOrder: 1 },
    { nameAr: 'مطار حائل الإقليمي', nameEn: 'Hail Regional Airport', type: 'airport', region: 'Hail', sortOrder: 2 },
    { nameAr: 'سكاكا', nameEn: 'Sakaka', type: 'city', region: 'Al-Jouf', sortOrder: 1 },
    { nameAr: 'مطار الجوف الإقليمي', nameEn: 'Al-Jouf Regional Airport', type: 'airport', region: 'Al-Jouf', sortOrder: 2 },
    { nameAr: 'الدمام', nameEn: 'Dammam', type: 'city', region: 'Eastern', sortOrder: 1 },
    { nameAr: 'الخبر', nameEn: 'Al-Khobar', type: 'city', region: 'Eastern', sortOrder: 2 },
    { nameAr: 'الأحساء', nameEn: 'Al-Ahsa', type: 'city', region: 'Eastern', sortOrder: 3 },
    { nameAr: 'مطار الملك فهد الدولي', nameEn: 'King Fahd Intl Airport', type: 'airport', region: 'Eastern', sortOrder: 4 },
    { nameAr: 'المطار', nameEn: 'Airport', type: 'airport', region: 'General', sortOrder: 99 },
];
async function main() {
    console.log(`Seeding ${destinations.length} destinations...`);
    let created = 0;
    let skipped = 0;
    for (const dest of destinations) {
        const existing = await prisma.destination.findFirst({
            where: { nameAr: dest.nameAr },
        });
        if (existing) {
            skipped++;
            continue;
        }
        await prisma.destination.create({ data: { ...dest, isActive: true } });
        console.log(`  ✓ ${dest.nameAr} (${dest.nameEn})`);
        created++;
    }
    console.log(`\nDone. Created: ${created}, Skipped (already exist): ${skipped}`);
}
main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed-destinations.js.map