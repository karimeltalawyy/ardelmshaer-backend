import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BookingsService } from './bookings.service';

const validDto = {
  originId:          'aaaaaaaa-0000-0000-0000-000000000001',
  destinationId:     'aaaaaaaa-0000-0000-0000-000000000002',
  requestedDate:     '2026-05-01',
  carTypePreference: 'starex' as const,
  passengerCount:    1,
  contactPhone:      '+966501234567',
  passengers:        [{ fullName: 'محمد', idNumber: '1234567890', nationality: 'SA', phone: '+966501234567' }],
};

function makePrisma(overrides: Partial<{
  destFindUnique: (args: any) => any;
  routeFindUnique: any;
  routePricingFindFirst: any;
  bookingCreate: any;
}> = {}) {
  const mockDest = (id: string) => ({ id, nameAr: 'مكة', nameEn: 'Makkah' });
  return {
    destination: {
      findUnique: overrides.destFindUnique
        ?? jest.fn().mockImplementation(({ where }) => Promise.resolve(mockDest(where.id))),
    },
    route: {
      findUnique: overrides.routeFindUnique
        ?? jest.fn().mockResolvedValue({ id: 'route-1' }),
    },
    routePricing: {
      findFirst: overrides.routePricingFindFirst
        ?? jest.fn().mockResolvedValue({ basePrice: { valueOf: () => 120, toString: () => '120' } }),
    },
    booking: {
      create: overrides.bookingCreate
        ?? jest.fn().mockResolvedValue({ id: 'booking-1', bookingSerial: 1 }),
    },
  } as any;
}

// Minimal stub for injected services that createGuest doesn't use
const noopServices = {
  documentsService: {},
  pdfService: {},
  whatsappService: { notifyAdminBookingRequest: jest.fn().mockResolvedValue(undefined) },
} as any;

describe('BookingsService.createGuest — pricing', () => {
  it('throws NotFoundException when origin destination does not exist', async () => {
    const prisma = makePrisma({
      destFindUnique: jest.fn().mockResolvedValue(null),
    });
    const service = new BookingsService(prisma, noopServices.documentsService, noopServices.pdfService, noopServices.whatsappService);
    await expect(service.createGuest(validDto)).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when no route exists between origin and destination', async () => {
    const prisma = makePrisma({
      routeFindUnique: jest.fn().mockResolvedValue(null),
    });
    const service = new BookingsService(prisma, noopServices.documentsService, noopServices.pdfService, noopServices.whatsappService);
    await expect(service.createGuest(validDto)).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when no active pricing exists for the car type', async () => {
    const prisma = makePrisma({
      routePricingFindFirst: jest.fn().mockResolvedValue(null),
    });
    const service = new BookingsService(prisma, noopServices.documentsService, noopServices.pdfService, noopServices.whatsappService);
    await expect(service.createGuest(validDto)).rejects.toThrow(BadRequestException);
  });

  it('saves the actual route price and returns totalPrice in the response', async () => {
    const createSpy = jest.fn().mockResolvedValue({ id: 'booking-1', bookingSerial: 42 });
    const prisma = makePrisma({ bookingCreate: createSpy });
    const service = new BookingsService(prisma, noopServices.documentsService, noopServices.pdfService, noopServices.whatsappService);

    const result = await service.createGuest(validDto);

    // DB call must have used the pricing value
    const createdWith = createSpy.mock.calls[0][0].data;
    expect(Number(createdWith.basePrice)).toBe(120);
    expect(Number(createdWith.totalPrice)).toBe(120);
    expect(Number(createdWith.platformFee)).toBe(0);

    // Response must include totalPrice
    expect(result.totalPrice).toBe(120);
  });
});
