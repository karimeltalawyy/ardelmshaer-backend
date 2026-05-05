import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PassengerDto } from '../../bookings/dto/passenger.dto';
import { OperationType } from './create-driver-booking.dto';

export class CreateAdminDriverBookingDto {
  @ApiPropertyOptional({ enum: OperationType, description: 'Trip operation type (مغادرة/تشغيل)' })
  @IsOptional()
  @IsEnum(OperationType)
  operationType?: OperationType;

  @ApiProperty({ description: 'Selected car UUID. Driver is derived from the car assignment.' })
  @IsUUID()
  carId: string;

  @ApiProperty({ description: 'Origin destination UUID' })
  @IsUUID()
  originId: string;

  @ApiProperty({ description: 'Destination destination UUID' })
  @IsUUID()
  destinationId: string;

  @ApiProperty({ example: '2026-05-15T08:00:00.000Z' })
  @IsDateString()
  departureAt: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  passengerCount: number;

  @ApiProperty({ example: '+966501234567' })
  @IsString()
  @MinLength(7)
  contactPhone: string;

  @ApiProperty({ example: 350, description: 'Trip price entered by admin' })
  @IsNumber()
  @Min(1)
  price: number;

  @ApiProperty({ type: [PassengerDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  passengers: PassengerDto[];

  @ApiPropertyOptional({ enum: ['cash', 'card', 'mada'], default: 'cash' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
