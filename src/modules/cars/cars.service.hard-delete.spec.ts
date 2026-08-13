import { ConflictException, NotFoundException } from '@nestjs/common';
import { CarsService } from './cars.service';

// Minimal Prisma mock — only the methods hardDelete touches. $transaction hands the
// callback a client with the same shape, so the mock passes itself back.
function makePrisma(overrides: Partial<{
  carFindUnique: any;
  tripCount: any;
  tripDeleteMany: any;
  carDelete: any;
}> = {}) {
  const prisma: any = {
    car: {
      findUnique: overrides.carFindUnique ?? jest.fn().mockResolvedValue({ id: 'car-1' }),
      delete: overrides.carDelete ?? jest.fn().mockResolvedValue({ id: 'car-1' }),
    },
    trip: {
      count: overrides.tripCount ?? jest.fn().mockResolvedValue(0),
      deleteMany: overrides.tripDeleteMany ?? jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
  prisma.$transaction = jest.fn((cb: any) => cb(prisma));
  return prisma;
}

describe('CarsService.hardDelete', () => {
  it('throws NotFoundException when the car does not exist', async () => {
    const service = new CarsService(
      makePrisma({ carFindUnique: jest.fn().mockResolvedValue(null) }),
    );
    await expect(service.hardDelete('missing')).rejects.toThrow(NotFoundException);
  });

  // Regression: a car with trips hit a Postgres FK RESTRICT and surfaced as a bare
  // 500 "Internal server error" in the admin panel.
  it('refuses an unforced delete when trips exist, instead of hitting the FK constraint', async () => {
    const carDelete = jest.fn();
    const service = new CarsService(
      makePrisma({ tripCount: jest.fn().mockResolvedValue(3), carDelete }),
    );

    await expect(service.hardDelete('car-1')).rejects.toThrow(ConflictException);
    expect(carDelete).not.toHaveBeenCalled();
  });

  it('names the trip count so the admin knows what confirming will remove', async () => {
    const service = new CarsService(makePrisma({ tripCount: jest.fn().mockResolvedValue(3) }));
    await expect(service.hardDelete('car-1')).rejects.toThrow(/3/);
  });

  it('removes the trips and the car together when forced', async () => {
    const tripDeleteMany = jest.fn().mockResolvedValue({ count: 3 });
    const carDelete = jest.fn().mockResolvedValue({ id: 'car-1' });
    const prisma = makePrisma({
      tripCount: jest.fn().mockResolvedValue(3),
      tripDeleteMany,
      carDelete,
    });
    const service = new CarsService(prisma);

    await expect(service.hardDelete('car-1', true)).resolves.toEqual({ id: 'car-1' });
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(tripDeleteMany).toHaveBeenCalledWith({ where: { carId: 'car-1' } });
    expect(carDelete).toHaveBeenCalledWith({ where: { id: 'car-1' } });
  });

  it('deletes the car directly when nothing references it', async () => {
    const tripDeleteMany = jest.fn();
    const carDelete = jest.fn().mockResolvedValue({ id: 'car-1' });
    const service = new CarsService(makePrisma({ carDelete, tripDeleteMany }));

    await expect(service.hardDelete('car-1')).resolves.toEqual({ id: 'car-1' });
    expect(tripDeleteMany).not.toHaveBeenCalled();
  });
});
