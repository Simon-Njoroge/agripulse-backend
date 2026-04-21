import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FieldUpdatesService } from './field-updates.service';
import { CreateFieldUpdateDto } from './dto/create-field-update.dto';
import { UpdateFieldUpdateDto } from './dto/update-field-update.dto';

@Controller('field-updates')
export class FieldUpdatesController {
  constructor(private readonly fieldUpdatesService: FieldUpdatesService) {}

  @Post()
  create(@Body() createFieldUpdateDto: CreateFieldUpdateDto) {
    return this.fieldUpdatesService.create(createFieldUpdateDto);
  }

  @Get()
  findAll() {
    return this.fieldUpdatesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fieldUpdatesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFieldUpdateDto: UpdateFieldUpdateDto) {
    return this.fieldUpdatesService.update(+id, updateFieldUpdateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fieldUpdatesService.remove(+id);
  }
}
