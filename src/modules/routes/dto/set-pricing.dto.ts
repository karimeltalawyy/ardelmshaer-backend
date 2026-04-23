import { IsEnum, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CarType } from '@prisma/client';

export class SetPricingDto {
  @ApiProperty({ enum: CarType })
  @IsEnum(CarType)
  carType: CarType;

  @ApiProperty({ example: 400, description: 'Base price in SAR' })
  @IsNumber()
  @IsPositive()
  basePrice: number;
}
