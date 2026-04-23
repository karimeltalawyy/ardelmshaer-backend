import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTripDto {
  @ApiProperty({ description: 'Car to use for this trip' })
  @IsUUID()
  carId: string;

  @ApiProperty({ description: 'Route for this trip' })
  @IsUUID()
  routeId: string;

  @ApiProperty({ example: '2026-05-15T08:00:00.000Z' })
  @IsDateString()
  departureAt: string;

  @ApiPropertyOptional({
    description:
      'Price per seat (per_seat cars). Omit to auto-calculate from route pricing + active season.',
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  pricePerSeat?: number;

  @ApiPropertyOptional({
    description:
      'Price for whole car (whole_car cars). Omit to auto-calculate from route pricing + active season.',
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  priceWholeCar?: number;

  @ApiPropertyOptional({
    description: 'Allow rider to choose custom pickup time for this trip',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allowCustomPickupTime?: boolean;

  @ApiPropertyOptional({
    description: 'Allow rider to cancel this trip booking',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowRiderCancellation?: boolean;

  @ApiPropertyOptional({
    description: 'Optional refund policy applied to this trip when rider cancels',
  })
  @IsOptional()
  @IsUUID()
  cancellationPolicyId?: string;

  @ApiPropertyOptional({
    description: 'Optional cutoff (hours before departure) after which rider cannot cancel',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  cancellationCutoffHours?: number;

  @ApiPropertyOptional({
    description: 'Fallback pickup branch/location address shown when custom pickup time is not allowed',
  })
  @IsOptional()
  @IsString()
  pickupAddress?: string;
}
