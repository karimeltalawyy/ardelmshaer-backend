import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BookingMode, CarType } from '@prisma/client';

export class SearchTripsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  routeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  originId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  destinationId?: string;

  @ApiPropertyOptional({ example: '2026-05-15', description: 'Filter trips departing on this date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  departureDate?: string;

  @ApiPropertyOptional({ enum: BookingMode })
  @IsOptional()
  @IsEnum(BookingMode)
  bookingMode?: BookingMode;

  @ApiPropertyOptional({ enum: CarType })
  @IsOptional()
  @IsEnum(CarType)
  carType?: CarType;
}
