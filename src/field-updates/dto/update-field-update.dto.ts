import { PartialType } from '@nestjs/swagger';
import { CreateFieldUpdateDto } from './create-field-update.dto';

export class UpdateFieldUpdateDto extends PartialType(CreateFieldUpdateDto) {}
