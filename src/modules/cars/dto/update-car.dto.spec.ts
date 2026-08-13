import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateCarDto } from './update-car.dto';

/**
 * The admin car-edit dialog sends the full car profile, including `carType`
 * (see transport-frontend car-management.component.ts). Because main.ts runs
 * ValidationPipe with `forbidNonWhitelisted: true`, any property missing from
 * this DTO makes the whole PATCH fail with 400 "property carType should not
 * exist" — so the edit silently never saves.
 */
describe('UpdateCarDto', () => {
  async function validatePayload(payload: Record<string, unknown>) {
    const dto = plainToInstance(UpdateCarDto, payload, {
      enableImplicitConversion: true,
    });
    return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  }

  it('accepts the exact payload the admin edit dialog sends (including carType)', async () => {
    const errors = await validatePayload({
      carType: 'starex',
      brand: 'Hyundai',
      model: 'Starex',
      year: 2026,
      totalSeats: 11,
      plateNumber: 'ا ص م ٩٠٣٨',
    });

    expect(errors).toHaveLength(0);
  });

  it('still rejects a genuinely unknown property', async () => {
    const errors = await validatePayload({ brand: 'Hyundai', bogusField: 'x' });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('bogusField');
  });

  it('keeps every field optional so partial edits work', async () => {
    const errors = await validatePayload({ brand: 'Hyundai' });

    expect(errors).toHaveLength(0);
  });

  it('rejects an invalid carType value', async () => {
    const errors = await validatePayload({ carType: 'submarine' });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('carType');
  });
});
