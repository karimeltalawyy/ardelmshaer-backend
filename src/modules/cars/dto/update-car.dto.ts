import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCarDto } from './create-car.dto';

// Allow updating everything except carType (changing car type requires a new car)
export class UpdateCarDto extends PartialType(OmitType(CreateCarDto, ['carType'] as const)) {}
