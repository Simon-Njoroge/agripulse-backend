import { Injectable } from '@nestjs/common';
import { CreateFieldUpdateDto } from './dto/create-field-update.dto';
import { UpdateFieldUpdateDto } from './dto/update-field-update.dto';

@Injectable()
export class FieldUpdatesService {
  create(createFieldUpdateDto: CreateFieldUpdateDto) {
    return 'This action adds a new fieldUpdate';
  }

  findAll() {
    return `This action returns all fieldUpdates`;
  }

  findOne(id: number) {
    return `This action returns a #${id} fieldUpdate`;
  }

  update(id: number, updateFieldUpdateDto: UpdateFieldUpdateDto) {
    return `This action updates a #${id} fieldUpdate`;
  }

  remove(id: number) {
    return `This action removes a #${id} fieldUpdate`;
  }
}
