import { BookingMode, CarType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type CarTypeSeed = {
  bookingMode: BookingMode;
  defaultCapacity: number;
  labelAr: string;
  labelEn: string;
};

const DEFAULT_CAR_TYPE_CONFIGS: Record<CarType, CarTypeSeed> = {
  sedan: { bookingMode: 'whole_car', defaultCapacity: 4, labelAr: 'سيدان', labelEn: 'Sedan' },
  family: { bookingMode: 'whole_car', defaultCapacity: 7, labelAr: 'عائلي', labelEn: 'Family' },
  vip: { bookingMode: 'whole_car', defaultCapacity: 4, labelAr: 'في آي بي', labelEn: 'VIP' },
  limousine: { bookingMode: 'whole_car', defaultCapacity: 6, labelAr: 'ليموزين', labelEn: 'Limousine' },
  minibus: { bookingMode: 'per_seat', defaultCapacity: 14, labelAr: 'ميني باص', labelEn: 'Minibus' },
  bus: { bookingMode: 'per_seat', defaultCapacity: 50, labelAr: 'باص', labelEn: 'Bus' },
};

export async function ensureCarTypeConfig(
  prisma: PrismaService,
  carType: CarType,
) {
  const cfg = DEFAULT_CAR_TYPE_CONFIGS[carType];
  return prisma.carTypeConfig.upsert({
    where: { carType },
    update: {
      bookingMode: cfg.bookingMode,
      defaultCapacity: cfg.defaultCapacity,
      labelAr: cfg.labelAr,
      labelEn: cfg.labelEn,
      isActive: true,
    },
    create: {
      carType,
      bookingMode: cfg.bookingMode,
      defaultCapacity: cfg.defaultCapacity,
      labelAr: cfg.labelAr,
      labelEn: cfg.labelEn,
      isActive: true,
    },
  });
}

export async function ensureAllCarTypeConfigs(prisma: PrismaService) {
  await Promise.all(
    (Object.keys(DEFAULT_CAR_TYPE_CONFIGS) as CarType[]).map((type) =>
      ensureCarTypeConfig(prisma, type),
    ),
  );
}

