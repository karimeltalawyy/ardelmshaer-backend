import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsMobilePhone, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAdminUserDto {
  @ApiProperty({ example: 'Mohamed Ali' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({ example: 'm@mo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '0000', minLength: 4 })
  @IsString()
  @MinLength(4)
  password: string;

  @ApiPropertyOptional({ example: '0501234567' })
  @IsOptional()
  @IsMobilePhone()
  phone?: string;

  @ApiPropertyOptional({ example: 'Saudi' })
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsOptional()
  @IsString()
  idNumber?: string;

  @ApiPropertyOptional({ example: 'rider', enum: ['rider', 'driver', 'admin'] })
  @IsOptional()
  @IsIn(['rider', 'driver', 'admin'])
  role?: 'rider' | 'driver' | 'admin';

  @ApiPropertyOptional({ example: 'active', enum: ['active', 'suspended'] })
  @IsOptional()
  @IsIn(['active', 'suspended'])
  status?: 'active' | 'suspended';

  @ApiPropertyOptional({ example: 'SA-12345678', description: 'Required when role=driver' })
  @IsOptional()
  @IsString()
  @MinLength(4)
  licenseNumber?: string;
}

