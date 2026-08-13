import { ConflictException, NotFoundException } from '@nestjs/common';
import { CarsService } from './cars.service';

// Minimal Prisma mock — only the methods hardDelete touches
function makePrisma(overrides: Partial<{
  carFindUnique: any;
  tripCount: any;
  carDelete: any;
}> = {}) {
  return {
    car: {
      findUnique: overrides.carFindUnique ?? jest.fn().mockResolvedValue({ id: 'car-1' }),
      delete: overrides.carDelete ?? jest.fn().mockResolvedValue({ id: 'car-1' }),
    },
    trip: {
      count: overrides.tripCount ?? jest.fn().mockResolvedValue(0),
    },
  } as any;
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
  it('throws ConflictException instead of hitting the FK constraint when trips exist', async () => {
    const carDelete = jest.fn();
    const service = new CarsService(
      makePrisma({ tripCount: jest.fn().mockResolvedValue(3), carDelete }),
    );

    await expect(service.hardDelete('car-1')).rejects.toThrow(ConflictException);
    expect(carDelete).not.toHaveBeenCalled();
  });

  it('mentions the trip count so the admin knows why the delete was refused', async () => {
    const service = new CarsService(makePrisma({ tripCount: jest.fn().mockResolvedValue(3) }));
    await expect(service.hardDelete('car-1')).rejects.toThrow(/3/);
  });

  it('deletes the car when nothing references it', async () => {
    const carDelete = jest.fn().mockResolvedValue({ id: 'car-1' });
    const service = new CarsService(makePrisma({ carDelete }));

    await expect(service.hardDelete('car-1')).resolves.toEqual({ id: 'car-1' });
    expect(carDelete).toHaveBeenCalledWith({ where: { id: 'car-1' } });
  });
});
