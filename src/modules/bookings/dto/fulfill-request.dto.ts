import { IsUUID, IsISO8601 } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FulfillRequestDto {
  @ApiProperty({ description: 'Car (and its driver) to assign to this trip' })
  @IsUUID()
  carId: string;

  @ApiProperty({ description: 'Exact departure datetime as ISO-8601', example: '2026-04-25T08:00:00.000Z' })
  @IsISO8601()
  departureAt: string;
}
