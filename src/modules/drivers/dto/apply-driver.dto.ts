import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyDriverDto {
  @ApiProperty({ example: 'SA-12345678', description: 'Saudi driving license number' })
  @IsString()
  @MinLength(4)
  licenseNumber: string;
}
