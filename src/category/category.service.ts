import {
    BadRequestException,
    ForbiddenException,
    Injectable,
  } from '@nestjs/common';
  import { PrismaService } from 'src/prisma/prisma.service';
  import { CategoryDto } from './dto/category.dto';
import { Prisma } from '@prisma/client';
  
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
      try {
        
        const existingCategory = await this.prisma.category.findUnique({
          where: { name: dto.name },
        });
  
        if (existingCategory) {
          throw new Error(`La catégorie "${dto.name}" existe déjà.`);
        }
  
        // Créez la nouvelle catégorie
        return await this.prisma.category.create({
          data: {
            name: dto.name,
            description: dto.description,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          // Gérer les erreurs spécifiques à Prisma
          if (error.code === 'P2002') {
            throw new Error('Une erreur d\'unicité s\'est produite.');
          }
        }
        // Relancer l'erreur pour le traitement ultérieur
        throw error;
      }
    }
    
    async getCategoryById(id: number) {
      try {
        const category = await this.prisma.category.findUnique({
          where: { id: id },
        });
    
        if (!category) {
          throw new Error(`La catégorie avec l'ID ${id} n'existe pas.`);
        }
    
        return category;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2001') {
            throw new Error('La catégorie demandée n\'existe pas.');
          }
        }
        throw error;
      }
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
  