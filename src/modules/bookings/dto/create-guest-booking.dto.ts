import { IsArray, IsEnum, IsInt, IsString, IsUUID, Min, MinLength, ValidateNested, ArrayMinSize } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { IsSaudiPhone } from '../../../common/validators/is-saudi-phone.validator';

// Passenger details for guest bookings. Phone is intentionally omitted —
// the rider's phone (riderPhone) is the single point of contact for all passengers.
export class GuestPassengerDto {
  @ApiProperty({ example: 'محمد عبدالله' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  @MinLength(5)
  idNumber: string;

  @ApiProperty({ example: 'سعودي' })
  @IsString()
  @MinLength(2)
  nationality: string;
}

export class CreateGuestBookingDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID()
  tripId: string;

  @ApiProperty({ example: 'محمد عبدالله' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  riderName: string;

  @ApiProperty({ example: '0532345678', description: 'Saudi mobile number' })
  @IsSaudiPhone()
  riderPhone: string;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  passengerCount: number;

  @ApiProperty({ type: [GuestPassengerDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GuestPassengerDto)
  passengers: GuestPassengerDto[];

  @ApiProperty({ example: 'حي النزهة، جدة' })
  @IsString()
  @MinLength(3)
  pickupAddress: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}
