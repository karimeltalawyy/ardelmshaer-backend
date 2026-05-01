import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PassengerDto {
  @ApiProperty({ example: 'Ahmed Al-Rashidi' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({ example: 'Saudi' })
  @IsString()
  @MinLength(2)
  nationality: string;

  @ApiPropertyOptional({ example: '1098765432' })
  @IsOptional()
  @IsString()
  idNumber?: string;

  @ApiPropertyOptional({ example: '+966501234567', description: 'No longer required — omit if not collected' })
  @IsOptional()
  @IsString()
  phone?: string;
}
