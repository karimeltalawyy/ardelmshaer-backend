import { validateSaudiPhone, normalizeSaudiPhone } from './is-saudi-phone.validator';

describe('validateSaudiPhone', () => {
  it('accepts 05XXXXXXXX (10 digits, starts with 05)', () => {
    expect(validateSaudiPhone('0532345678')).toBe(true);
  });

  it('accepts 5XXXXXXXX (9 digits, starts with 5)', () => {
    expect(validateSaudiPhone('532345678')).toBe(true);
  });

  it('accepts +9665XXXXXXXX E.164 format', () => {
    expect(validateSaudiPhone('+966532345678')).toBe(true);
  });

  it('accepts 009665XXXXXXXX', () => {
    expect(validateSaudiPhone('00966532345678')).toBe(true);
  });

  it('rejects numbers not starting with 05/5', () => {
    expect(validateSaudiPhone('0712345678')).toBe(false);
  });

  it('rejects numbers that are too short', () => {
    expect(validateSaudiPhone('053234567')).toBe(false);
  });

  it('rejects numbers that are too long', () => {
    expect(validateSaudiPhone('05323456789')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateSaudiPhone('')).toBe(false);
  });

  it('rejects non-numeric characters', () => {
    expect(validateSaudiPhone('0532abc678')).toBe(false);
  });

  it('rejects unallocated prefix 51', () => {
    expect(validateSaudiPhone('0512345678')).toBe(false);
  });

  it('rejects unallocated prefix 52', () => {
    expect(validateSaudiPhone('0522345678')).toBe(false);
  });
});

describe('normalizeSaudiPhone', () => {
  it('converts 05XXXXXXXX to E.164 +9665XXXXXXXX', () => {
    expect(normalizeSaudiPhone('0532345678')).toBe('+966532345678');
  });

  it('converts 5XXXXXXXX to E.164 +9665XXXXXXXX', () => {
    expect(normalizeSaudiPhone('532345678')).toBe('+966532345678');
  });

  it('keeps +9665XXXXXXXX unchanged', () => {
    expect(normalizeSaudiPhone('+966532345678')).toBe('+966532345678');
  });

  it('converts 009665XXXXXXXX to E.164', () => {
    expect(normalizeSaudiPhone('00966532345678')).toBe('+966532345678');
  });
});
