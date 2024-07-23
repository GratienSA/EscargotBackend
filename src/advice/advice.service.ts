import {
    BadRequestException,
    Injectable,
    NotFoundException,
    ForbiddenException,
  } from '@nestjs/common';
  import { PrismaService } from 'src/prisma/prisma.service';
  import { CreateAdviceDto, UpdateAdviceDto } from './dto';
  import { User } from '@prisma/client';
  
  @Injectable()
  export class AdviceService {
    constructor(private prisma: PrismaService) {}
  
    async getAll() {
      return this.prisma.advice.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        take: 30,
        select: {
          id: true,
          content: true,
          rating: true,
          createdAt: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          product: {
            select: {
              name: true,
            },
          },
        },
      });
    }
  
    async createAdvice(dto: CreateAdviceDto, user: User) {
      const existingProduct = await this.prisma.product.findUnique({
        where: {
          id: dto.productId,
        },
      });
  
      if (!existingProduct) {
        throw new BadRequestException('Product not found');
      }
  
      return this.prisma.advice.create({
        data: {
          ...dto,
          userId: user.id,
        },
      });
    }
  
    async updateAdvice(dto: UpdateAdviceDto, user: User, id: number) {
      const existingAdvice = await this.prisma.advice.findUnique({
        where: {
          id: id,
        },
      });
  
      if (!existingAdvice) {
        throw new NotFoundException('Advice not found');
      }
  
      if (existingAdvice.userId !== user.id) {
        throw new ForbiddenException('You can only update your own advice');
      }
  
      return this.prisma.advice.update({
        where: {
          id: id,
        },
        data: {
          ...dto,
        },
      });
    }
  
    async deleteAdvice(id: number, user: User) {
      const existingAdvice = await this.prisma.advice.findUnique({
        where: {
          id: id,
        },
      });
  
      if (!existingAdvice) {
        throw new NotFoundException('Advice not found');
      }
  
      if (existingAdvice.userId !== user.id) {
        throw new ForbiddenException('You can only delete your own advice');
      }
  
      return this.prisma.advice.delete({
        where: {
          id: id,
        },
      });
    }
  
    async getAdvicesByProduct(productId: number) {
      const product = await this.prisma.product.findUnique({
        where: {
          id: productId,
        },
      });
  
      if (!product) {
        throw new NotFoundException('Product not found');
      }
  
      return this.prisma.advice.findMany({
        where: {
          productId: productId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    }
  }