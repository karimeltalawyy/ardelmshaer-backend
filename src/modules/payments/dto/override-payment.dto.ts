import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum OverridePaymentStatus {
  paid = 'paid',
  pending = 'pending',
  refunded = 'refunded',
}

export class OverridePaymentDto {
  @ApiProperty({ enum: OverridePaymentStatus, example: 'paid' })
  @IsEnum(OverridePaymentStatus)
  status: OverridePaymentStatus;

  @ApiPropertyOptional({ example: 'Manually confirmed by admin' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
