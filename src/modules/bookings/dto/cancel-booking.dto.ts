import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CancelBookingDto {
  @ApiPropertyOptional({ example: 'Change of plans' })
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}
