import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, Matches } from 'class-validator';

export class TripStockQueryDto {
  @ApiProperty({ description: 'Route id to inspect stock for' })
  @IsUUID()
  routeId: string;

  @ApiProperty({ example: '2026-04-05', description: 'Service date (YYYY-MM-DD)' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'departureDate must be in YYYY-MM-DD format',
  })
  departureDate: string;
}
