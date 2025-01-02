
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Inventory } from '@prisma/client';
import { CreateInventoryDto } from './dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateInventoryDto): Promise<Inventory> {
    return this.prisma.inventory.create({
      data,
    });
  }

  async findAll(): Promise<Inventory[]> {
    return this.prisma.inventory.findMany();
  }

  async findOne(id: number): Promise<Inventory> {
    return this.prisma.inventory.findUnique({
      where: { id },
    });
  }

  async update(id: number, data: Partial<CreateInventoryDto>): Promise<Inventory> {
    return this.prisma.inventory.update({
      where: { id },
      data,
    });
  }

  async remove(id: number): Promise<Inventory> {
    return this.prisma.inventory.delete({
      where: { id },
    });
  }
}