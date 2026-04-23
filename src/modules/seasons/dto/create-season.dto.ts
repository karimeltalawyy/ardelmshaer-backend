import { IsEnum, IsNumber, IsPositive, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SeasonType } from '@prisma/client';

export class CreateSeasonDto {
  @ApiProperty({ example: 'موسم الحج' })
  @IsString()
  nameAr: string;

  @ApiProperty({ example: 'Hajj Season' })
  @IsString()
  nameEn: string;

  @ApiProperty({ enum: SeasonType })
  @IsEnum(SeasonType)
  type: SeasonType;

  @ApiProperty({ example: '2026-05-01', description: 'ISO date string (YYYY-MM-DD)' })
  @IsString()
  startDate: string;

  @ApiProperty({ example: '2026-05-15', description: 'ISO date string (YYYY-MM-DD)' })
  @IsString()
  endDate: string;

  @ApiProperty({ example: 1.5, description: 'Price multiplier (e.g. 1.5 = 50% increase)' })
  @IsNumber()
  @IsPositive()
  priceMultiplier: number;
}
