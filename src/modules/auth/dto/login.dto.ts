import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'ahmed@example.com or 1234567890', description: 'Email address or national ID number' })
  @IsString()
  identifier: string;

  @ApiProperty({ example: 'StrongP@ssw0rd' })
  @IsString()
  password: string;
}
