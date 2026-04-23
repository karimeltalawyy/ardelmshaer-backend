import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, Min, ValidateNested } from 'class-validator';
import { PassengerDto } from './passenger.dto';

export class UpdateBookingPassengersDto {
  @ApiProperty({ example: 3, description: 'Operational passenger count for this booking' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  passengerCount: number;

  @ApiProperty({ type: [PassengerDto], description: 'Full manifest rows to persist for the booking' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  passengers: PassengerDto[];
}

