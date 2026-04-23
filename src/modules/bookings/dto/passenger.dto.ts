import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PassengerDto {
  @ApiProperty({ example: 'Ahmed Al-Rashidi' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({ example: 'Saudi' })
  @IsString()
  @MinLength(2)
  nationality: string;

  @ApiProperty({ example: '1098765432' })
  @IsString()
  @MinLength(5)
  idNumber: string;

  @ApiProperty({ example: '+966501234567' })
  @IsString()
  @MinLength(7)
  phone: string;
}
