import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DestinationType } from '@prisma/client';

export class CreateDestinationDto {
  @ApiProperty({ example: 'الرياض' })
  @IsString()
  nameAr: string;

  @ApiProperty({ example: 'Riyadh' })
  @IsString()
  nameEn: string;

  @ApiProperty({ enum: DestinationType })
  @IsEnum(DestinationType)
  type: DestinationType;

  @ApiProperty({ example: 'Riyadh Region' })
  @IsString()
  region: string;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
