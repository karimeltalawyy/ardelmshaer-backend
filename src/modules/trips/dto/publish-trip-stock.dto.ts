import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator';

export class PublishTripStockDto {
  @ApiProperty({ description: 'Route id for all selected cars' })
  @IsUUID()
  routeId: string;

  @ApiProperty({ example: '2026-04-05T08:00:00.000Z' })
  @IsDateString()
  departureAt: string;

  @ApiProperty({ type: [String], description: 'Cars to publish as trips' })
  @IsArray()
  @IsUUID('4', { each: true })
  carIds: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;
}
