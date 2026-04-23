import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TripStatus } from '@prisma/client';

export class UpdateTripStatusDto {
  @ApiProperty({ enum: TripStatus })
  @IsEnum(TripStatus)
  status: TripStatus;
}
