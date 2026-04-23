import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

const SAUDI_MOBILE_RE = /^(\+?966|00966)?0?(5[03-9][0-9]{7})$/;

export function validateSaudiPhone(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  return SAUDI_MOBILE_RE.test(value.replace(/\s/g, ''));
}

export function normalizeSaudiPhone(value: string): string {
  if (!value || typeof value !== 'string') {
    throw new Error('Invalid Saudi phone number');
  }
  const match = value.replace(/\s/g, '').match(SAUDI_MOBILE_RE);
  if (!match) throw new Error('Invalid Saudi phone number');
  return `+966${match[2]}`;
}

@ValidatorConstraint({ name: 'IsSaudiPhone', async: false })
export class IsSaudiPhoneConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    return validateSaudiPhone(value);
  }

  defaultMessage(): string {
    return 'رقم الجوال يجب أن يكون رقماً سعودياً صحيحاً (05XXXXXXXX)';
  }
}

export function IsSaudiPhone(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsSaudiPhoneConstraint,
    });
  };
}
