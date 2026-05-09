import {
  ArrayMinSize,
  IsArray,
  IsDateString,
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

export class CreateAdminDriverBookingDto {
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

  @ApiPropertyOptional({ default: 'cash' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
