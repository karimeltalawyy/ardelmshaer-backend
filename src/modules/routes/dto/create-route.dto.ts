import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRouteDto {
  @ApiProperty({ example: 'uuid-of-origin' })
  @IsUUID()
  originId: string;

  @ApiProperty({ example: 'uuid-of-destination' })
  @IsUUID()
  destinationId: string;

  @ApiProperty({ example: 540, description: 'Estimated travel time in minutes', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedDurationMin?: number;
}
