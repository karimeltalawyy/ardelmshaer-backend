import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpsertConfigDto {
  @ApiProperty({ example: 'platform_commission_rate' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  key: string;

  @ApiProperty({ example: '0.10' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  value: string;

  @ApiProperty({ example: 'نسبة عمولة المنصة' })
  @IsString()
  descriptionAr: string;

  @ApiProperty({ example: 'Platform commission rate' })
  @IsString()
  descriptionEn: string;
}
