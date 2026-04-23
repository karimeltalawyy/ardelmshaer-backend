import { IsInt, IsNumber, IsString, Min, Max, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCancellationPolicyDto {
  @ApiProperty({ example: 24, description: 'Hours before trip departure' })
  @IsInt()
  @Min(0)
  hoursBeforeTrip: number;

  @ApiPropertyOptional({ example: 80, description: 'Refund percentage (0–100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  refundPercentage?: number;

  @ApiPropertyOptional({ example: 80, description: 'Alias for refundPercentage (accepted from legacy frontend)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  refundPercent?: number;

  @ApiPropertyOptional({ example: 'إلغاء قبل 24 ساعة — استرداد 80%' })
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiPropertyOptional({ example: 'Cancel 24h before — 80% refund' })
  @IsOptional()
  @IsString()
  descriptionEn?: string;
}

export class UpdateCancellationPolicyDto {
  @ApiPropertyOptional({ example: 48 })
  @IsOptional()
  @IsInt()
  @Min(0)
  hoursBeforeTrip?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  refundPercentage?: number;

  @ApiPropertyOptional({ example: 100, description: 'Alias for refundPercentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  refundPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
