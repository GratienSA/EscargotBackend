import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { Inventory } from '@prisma/client';
import { CreateInventoryDto } from './dto';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  create(@Body() createInventoryDto: CreateInventoryDto): Promise<Inventory> {
    return this.inventoryService.create(createInventoryDto);
  }

  @Get()
  findAll(): Promise<Inventory[]> {
    return this.inventoryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Inventory> {
    return this.inventoryService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInventoryDto: Partial<CreateInventoryDto>): Promise<Inventory> {
    return this.inventoryService.update(+id, updateInventoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<Inventory> {
    return this.inventoryService.remove(+id);
  }
}