import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SuggestDestinationDto {
  @ApiProperty({ example: 'الطائف' })
  @IsString()
  @MinLength(2)
  nameAr: string;
}
