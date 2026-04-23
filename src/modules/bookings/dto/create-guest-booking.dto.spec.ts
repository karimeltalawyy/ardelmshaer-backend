import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateGuestBookingDto } from './create-guest-booking.dto';

const validPayload = {
  tripId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  riderName: 'محمد عبدالله',
  riderPhone: '0532345678',
  passengerCount: 1,
  passengers: [{ fullName: 'محمد عبدالله', idNumber: '1234567890', nationality: 'سعودي' }],
  pickupAddress: 'حي النزهة، جدة',
  paymentMethod: 'cash',
};

async function validateDto(payload: object) {
  const dto = plainToInstance(CreateGuestBookingDto, payload);
  return validate(dto);
}

describe('CreateGuestBookingDto', () => {
  it('passes with valid payload', async () => {
    const errors = await validateDto(validPayload);
    expect(errors).toHaveLength(0);
  });

  it('fails without tripId', async () => {
    const { tripId, ...rest } = validPayload;
    const errors = await validateDto(rest);
    expect(errors.some(e => e.property === 'tripId')).toBe(true);
  });

  it('fails with invalid Saudi phone', async () => {
    const errors = await validateDto({ ...validPayload, riderPhone: '0712345678' });
    expect(errors.some(e => e.property === 'riderPhone')).toBe(true);
  });

  it('fails with empty riderName', async () => {
    const errors = await validateDto({ ...validPayload, riderName: '' });
    expect(errors.some(e => e.property === 'riderName')).toBe(true);
  });

  it('fails with empty passengers array', async () => {
    const errors = await validateDto({ ...validPayload, passengers: [] });
    expect(errors.some(e => e.property === 'passengers')).toBe(true);
  });

  it('fails with invalid paymentMethod', async () => {
    const errors = await validateDto({ ...validPayload, paymentMethod: 'bitcoin' });
    expect(errors.some(e => e.property === 'paymentMethod')).toBe(true);
  });

  it('fails when a passenger has an invalid fullName (too short)', async () => {
    const errors = await validateDto({
      ...validPayload,
      passengers: [{ fullName: 'A', idNumber: '1234567890', nationality: 'سعودي' }],
    });
    expect(errors.some(e => e.property === 'passengers')).toBe(true);
  });
});
