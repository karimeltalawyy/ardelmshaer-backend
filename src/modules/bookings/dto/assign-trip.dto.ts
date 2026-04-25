import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignTripDto {
  @ApiProperty({ description: 'ID of the scheduled trip to link to this booking request' })
  @IsUUID()
  tripId: string;
}
