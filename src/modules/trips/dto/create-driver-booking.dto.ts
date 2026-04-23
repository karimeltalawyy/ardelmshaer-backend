import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
  ArrayMinSize,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PassengerDto } from '../../bookings/dto/passenger.dto';

export enum OperationType {
  DEPARTURE = 'departure',
  OPERATION = 'operation',
}

export class CreateDriverBookingDto {
  @ApiPropertyOptional({ enum: OperationType, description: 'Trip operation type (مغادرة/تشغيل)' })
  @IsOptional()
  @IsEnum(OperationType)
  operationType?: OperationType;

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
