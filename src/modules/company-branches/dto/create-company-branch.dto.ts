import { ArrayUnique, IsArray, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCompanyBranchDto {
  @ApiProperty({ example: 'فرع المدينة' })
  @IsString()
  nameAr: string;

  @ApiProperty({ example: 'Madinah Branch' })
  @IsString()
  nameEn: string;

  @ApiProperty({ example: 'المدينة المنورة - طريق المطار' })
  @IsString()
  addressAr: string;

  @ApiProperty({ example: 'Madinah - Airport Road' })
  @IsString()
  addressEn: string;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    type: [String],
    description: 'Pickup time slots in HH:mm format',
    example: ['08:00', '10:30', '13:00'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { each: true })
  pickupSlots?: string[];
}
