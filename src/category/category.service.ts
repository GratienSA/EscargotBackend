import {
    BadRequestException,
    ForbiddenException,
    Injectable,
  } from '@nestjs/common';
  import { PrismaService } from 'src/prisma/prisma.service';
  import { CategoryDto } from './dto/category.dto';
  
  @Injectable()
  export class CategoryService {
    constructor(private prisma: PrismaService) {}
  
    async getAllCategories() {
      const categoriesCount = await this.prisma.category.count();
      const categories = await this.prisma.category.findMany();
      return {
        totalResults: categoriesCount,
        categories: categories,
      };
    }
  
    async insertNewCategory(dto: CategoryDto) {
      return this.prisma.category.create({
        data: {
          name: dto.name,
          description: dto.description,
        },
      });
    }
  
    async editCategory(id: number, dto: CategoryDto) {
      if (!id || !dto.name) {
        throw new BadRequestException('Missing fields');
      }
      const existingCategoryName = await this.prisma.category.findFirst({
        where: {
          name: dto.name,
        },
      });
  
      if (existingCategoryName) {
        throw new ForbiddenException('Name already taken');
      } else {
        return this.prisma.category.update({
          where: {
            id: id,
          },
          data: {
            name: dto.name,
          },
        });
      }
    }
  
    async deleteCategory(id: number) {
      if (!id) {
        throw new BadRequestException('id is missing');
      } else {
        const existingCategory = await this.prisma.category.findUnique({
          where: {
            id: id,
          },
          select: {
            id: true,
          },
        });
        if (!existingCategory || !existingCategory.id) {
          throw new ForbiddenException("Category doesn't exist");
        }
  
        return this.prisma.category.delete({
          where: {
            id: id,
          },
        });
      }
    }
  }
  