import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
  ArrayMinSize,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PickupMode } from '@prisma/client';
import { PassengerDto } from './passenger.dto';

export class CreateBookingDto {
  @ApiProperty()
  @IsUUID()
  tripId: string;

  @ApiProperty({ example: 3, description: 'Operational passenger count for manifest/compliance' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  passengerCount: number;

  @ApiProperty({ example: '+966501234567', description: 'Primary contact phone for this booking' })
  @IsString()
  @MinLength(7)
  contactPhone: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'CAR_SEAT IDs to reserve — required for per_seat trips. One seat per passenger.',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  seatIds?: string[];

  @ApiProperty({ type: [PassengerDto], description: 'Passenger details required for the manifest' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  passengers: PassengerDto[];

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ enum: PickupMode, default: PickupMode.branch })
  @IsOptional()
  @IsEnum(PickupMode)
  pickupMode?: PickupMode;

  @ApiPropertyOptional({ description: 'Required when pickupMode is branch' })
  @IsOptional()
  @IsUUID()
  pickupBranchId?: string;

  @ApiPropertyOptional({ description: 'Required when pickupMode is user_location' })
  @IsOptional()
  @IsString()
  pickupAddress?: string;

  @ApiPropertyOptional({
    description: 'Pickup time selected by rider when trip allows custom pickup time',
    example: '2026-04-05T09:30:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  pickupTime?: string;
}
