import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SeatPosition } from '@prisma/client';

export class SeatItemDto {
  @ApiProperty({ example: 'A1', description: 'Unique seat code within the car' })
  @IsString()
  @MinLength(1)
  seatCode: string;

  @ApiProperty({ enum: SeatPosition })
  @IsEnum(SeatPosition)
  position: SeatPosition;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isExtraLegroom?: boolean;
}

export class CreateSeatsDto {
  @ApiProperty({ type: [SeatItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeatItemDto)
  seats: SeatItemDto[];
}
