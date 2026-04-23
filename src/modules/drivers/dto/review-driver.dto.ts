import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReviewAction {
  approve = 'approve',
  reject = 'reject',
}

export class ReviewDriverDto {
  @ApiProperty({ enum: ReviewAction })
  @IsEnum(ReviewAction)
  action: ReviewAction;

  @ApiPropertyOptional({ example: 'Documents are invalid or expired' })
  @ValidateIf((o) => o.action === ReviewAction.reject)
  @IsString()
  rejectionReason?: string;
}
