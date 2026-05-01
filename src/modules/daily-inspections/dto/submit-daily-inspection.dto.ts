import { IsString, IsDateString, IsArray, ValidateNested, IsIn, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ChecklistItemDto {
  @ApiProperty()
  @IsString()
  itemId: string;

  @ApiProperty({ enum: ['ok', 'not_ok', 'unset'] })
  @IsIn(['ok', 'not_ok', 'unset'])
  outcome: 'ok' | 'not_ok' | 'unset';

  @ApiProperty()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class SubmitDailyInspectionDto {
  @ApiProperty()
  @IsString()
  driverName: string;

  @ApiProperty()
  @IsString()
  plateNumber: string;

  @ApiProperty()
  @IsDateString()
  inspectionDate: string;

  @ApiProperty()
  @IsString()
  inspectionTime: string;

  @ApiProperty({ type: [ChecklistItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklist: ChecklistItemDto[];
}
