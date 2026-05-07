import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

const mockPrisma = {
  booking: { findUnique: jest.fn() },
  document: { findFirst: jest.fn(), create: jest.fn(), count: jest.fn(), findMany: jest.fn() },
  user: { findUnique: jest.fn() },
};

const mockWhatsapp = { notifyDriverWithManifest: jest.fn(), notifyAdminWithManifest: jest.fn() };
const mockConfig = { get: jest.fn().mockReturnValue(undefined) };

describe('DocumentsService.getHtml', () => {
  let service: DocumentsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WhatsappService, useValue: mockWhatsapp },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get(DocumentsService);
  });

  it('throws NotFoundException when booking is not found', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue({ role: 'admin' });
    await expect(service.getHtml('unknown-id', 'user-1', 'passenger_manifest'))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequestException when booking has no trip', async () => {
    mockPrisma.booking.findUnique.mockResolvedValue({ id: 'b1', trip: null, riderId: 'user-1', rider: null });
    mockPrisma.user.findUnique.mockResolvedValue({ role: 'admin' });
    await expect(service.getHtml('b1', 'user-1', 'passenger_manifest'))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns an HTML string containing Arabic route names when trip data is complete', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: 'admin' });
    mockPrisma.booking.findUnique.mockResolvedValue({
      id: 'b1',
      bookingSerial: 1,
      totalPrice: 100,
      basePrice: 90,
      seasonMultiplier: 1,
      platformFee: 10,
      driverPayout: 80,
      paymentMethod: 'cash',
      paymentStatus: 'pending',
      seatCount: 2,
      riderId: 'user-1',
      rider: { id: 'user-1', fullName: 'Ali', phone: '0501234567', role: 'rider' },
      passengers: [{ fullName: 'Ali', nationality: 'SA', idNumber: '1234', phone: '0501234567' }],
      trip: {
        id: 't1',
        departureAt: '2026-06-01T08:00:00.000Z',
        bookingMode: 'full_car',
        status: 'scheduled',
        route: {
          origin: { nameAr: 'مكة المكرمة', nameEn: 'Mecca' },
          destination: { nameAr: 'المدينة المنورة', nameEn: 'Medina' },
        },
        car: { brand: 'Toyota', model: 'Hiace', plateNumber: 'ABC123', carType: 'starex' },
        driver: { user: { id: 'u2', fullName: 'Ahmed', phone: '0507654321' } },
      },
    });

    const html = await service.getHtml('b1', 'user-1', 'passenger_manifest');
    expect(typeof html).toBe('string');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('مكة المكرمة');
  });
});
