import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CarsService } from './cars.service';

// Minimal Prisma mock — only the methods getCarOptions touches
function makePrisma(overrides: Partial<{
  routeFindUnique: any;
  tripFindMany: any;
  carFindMany: any;
}> = {}) {
  return {
    route: {
      findUnique: overrides.routeFindUnique ?? jest.fn().mockResolvedValue(null),
    },
    trip: {
      findMany: overrides.tripFindMany ?? jest.fn().mockResolvedValue([]),
    },
    car: {
      findMany: overrides.carFindMany ?? jest.fn().mockResolvedValue([]),
    },
  } as any;
}

describe('CarsService.getCarOptions', () => {
  it('throws BadRequestException for invalid requestedDate format', async () => {
    const service = new CarsService(makePrisma() as any);
    await expect(service.getCarOptions('uuid-a', 'uuid-b', '25-04-2026')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws NotFoundException when no route exists between the two destinations', async () => {
    const service = new CarsService(makePrisma({ routeFindUnique: jest.fn().mockResolvedValue(null) }) as any);
    await expect(service.getCarOptions('uuid-a', 'uuid-b', '2026-05-01')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('returns null price for a car type with no active pricing', async () => {
    const prisma = makePrisma({
      routeFindUnique: jest.fn().mockResolvedValue({ id: 'route-1', pricings: [] }),
      carFindMany: jest.fn().mockResolvedValue([{ carType: 'starex' }, { carType: 'staria' }]),
    });
    const service = new CarsService(prisma as any);
    const result = await service.getCarOptions('uuid-a', 'uuid-b', '2026-05-01');
    expect(result.starex.price).toBeNull();
    expect(result.staria.price).toBeNull();
  });

  it('returns correct price and count when pricing and cars exist', async () => {
    const prisma = makePrisma({
      routeFindUnique: jest.fn().mockResolvedValue({
        id: 'route-1',
        pricings: [
          { carType: 'starex', basePrice: { valueOf: () => 120 } },
          { carType: 'staria', basePrice: { valueOf: () => 150 } },
        ],
      }),
      carFindMany: jest.fn().mockResolvedValue([
        { carType: 'starex' },
        { carType: 'starex' },
        { carType: 'staria' },
      ]),
    });
    const service = new CarsService(prisma as any);
    const result = await service.getCarOptions('uuid-a', 'uuid-b', '2026-05-01');
    expect(result.starex).toEqual({ count: 2, price: 120 });
    expect(result.staria).toEqual({ count: 1, price: 150 });
  });

  it('excludes cars on busy trips from the count', async () => {
    const prisma = makePrisma({
      routeFindUnique: jest.fn().mockResolvedValue({
        id: 'route-1',
        pricings: [{ carType: 'starex', basePrice: { valueOf: () => 120 } }],
      }),
      tripFindMany: jest.fn().mockResolvedValue([{ carId: 'car-busy' }]),
      carFindMany: jest.fn().mockResolvedValue([{ carType: 'starex' }]),
    });
    const service = new CarsService(prisma as any);
    const result = await service.getCarOptions('uuid-a', 'uuid-b', '2026-05-01');
    // car-busy was excluded; one free starex remains
    expect(result.starex.count).toBe(1);
  });
});
