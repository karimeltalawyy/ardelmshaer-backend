import { IsNumber, IsPositive, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOverrideDto {
  @ApiProperty({ example: 'uuid-of-route-pricing' })
  @IsUUID()
  routePricingId: string;

  @ApiProperty({ example: 600, description: 'Override price in SAR' })
  @IsNumber()
  @IsPositive()
  overridePrice: number;
}
