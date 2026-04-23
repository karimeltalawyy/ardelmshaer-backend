import { IsEmail, IsString, MinLength, IsOptional, IsMobilePhone, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Ahmed Al-Rashidi' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({ example: 'ahmed@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongP@ssw0rd', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: '+966501234567' })
  @IsOptional()
  @IsMobilePhone()
  phone?: string;

  @ApiPropertyOptional({ example: 'rider', enum: ['rider'] })
  @IsOptional()
  @IsIn(['rider'])
  role?: 'rider';
}
