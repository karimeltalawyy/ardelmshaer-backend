import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CarType } from '@prisma/client';

export class CreateCarDto {
  @ApiProperty({ example: '2f9a4f2f-1b1a-4f76-b8a9-6bbf6dce8a0f' })
  @IsUUID()
  driverId: string;

  @ApiProperty({ enum: ['starex', 'staria'] })
  @IsEnum(['starex', 'staria'] as const)
  carType: 'starex' | 'staria';

  @ApiProperty({ example: 'ABC 1234' })
  @IsString()
  @MinLength(2)
  plateNumber: string;

  @ApiProperty({ example: 'Toyota' })
  @IsString()
  brand: string;

  @ApiProperty({ example: 'Hiace' })
  @IsString()
  model: string;

  @ApiProperty({ example: 2023 })
  @IsInt()
  @Min(2000)
  @Max(2030)
  year: number;

  @ApiProperty({ example: 14 })
  @IsInt()
  @Min(1)
  @Max(60)
  totalSeats: number;

  @ApiPropertyOptional({
    description: 'Visual seat map JSON for the frontend seat picker (per_seat cars only)',
    example: { rows: 4, cols: 4, layout: [] },
  })
  @IsOptional()
  seatLayoutJson?: Record<string, any>;
}
