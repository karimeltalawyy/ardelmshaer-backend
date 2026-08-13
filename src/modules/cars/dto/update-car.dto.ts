import { PartialType } from '@nestjs/swagger';
import { CreateCarDto } from './create-car.dto';

// Every field is optional. `carType` is included because the admin edit dialog
// sends the full car profile — omitting it here made ValidationPipe
// (forbidNonWhitelisted) reject the whole PATCH with 400.
export class UpdateCarDto extends PartialType(CreateCarDto) {}
