import { BookingMode, CarType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type CarTypeSeed = {
  bookingMode: BookingMode;
  defaultCapacity: number;
  labelAr: string;
  labelEn: string;
};

const DEFAULT_CAR_TYPE_CONFIGS: Partial<Record<CarType, CarTypeSeed>> = {
  starex: { bookingMode: 'whole_car', defaultCapacity: 12, labelAr: 'هيونداي ستاريكس', labelEn: 'Hyundai Starex' },
  staria: { bookingMode: 'whole_car', defaultCapacity: 11, labelAr: 'هيونداي ستاريا',  labelEn: 'Hyundai Staria' },
};

export async function ensureCarTypeConfig(
  prisma: PrismaService,
  carType: CarType,
) {
  const cfg = DEFAULT_CAR_TYPE_CONFIGS[carType];
  if (!cfg) throw new Error(`Unsupported car type: ${carType}`);
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

export const SUPPORTED_CAR_TYPES: CarType[] = ['starex', 'staria'];

