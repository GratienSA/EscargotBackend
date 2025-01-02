import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAdviceDto, UpdateAdviceDto } from './dto'; // Assurez-vous que les DTO sont correctement importés
import { User } from '@prisma/client';
import { validate } from 'class-validator';

@Injectable()
export class AdviceService {
  constructor(private readonly prisma: PrismaService) {}

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
    // Validation des données d'avis
    const errors = await validate(dto);
    if (errors.length > 0) {
      throw new BadRequestException('Validation failed');
    }

    const existingProduct = await this.prisma.product.findUnique({
      where: {
        id: dto.productId,
      },
    });

    if (!existingProduct) {
      throw new BadRequestException('Produit non trouvé');
    }

    return this.prisma.advice.create({
      data: {
        ...dto,
        userId: user.id,
      },
    });
  }

  async updateAdvice(dto: UpdateAdviceDto, user: User, id: number) {
    // Validation des données d'avis
    const errors = await validate(dto);
    if (errors.length > 0) {
      throw new BadRequestException('Validation failed');
    }

    const existingAdvice = await this.prisma.advice.findUnique({
      where: {
        id: id,
      },
    });

    if (!existingAdvice) {
      throw new NotFoundException('Avis non trouvé');
    }

    if (existingAdvice.userId !== user.id) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres avis');
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
      throw new NotFoundException('Avis non trouvé');
    }

    if (existingAdvice.userId !== user.id) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres avis');
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
      throw new NotFoundException('Produit non trouvé');
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


  async createUpdateAdvice(data: CreateAdviceDto | UpdateAdviceDto, user: User) {
    // Validation des données d'avis
    const errors = await validate(data);
    if (errors.length > 0) {
      throw new BadRequestException('Validation failed');
    }

    // Vérification si le produit associé à l'avis existe
    const product = await this.prisma.product.findUnique({
      where: {
        id: data.productId,
      },
    });

    if (!product) throw new NotFoundException('Produit non trouvé');

    // Vérification si un avis existe déjà pour ce produit par cet utilisateur
    const existingAdvice = await this.prisma.advice.findFirst({
      where: {
        productId: data.productId,
        userId: user.id,
      },
    });

    // Transaction pour garantir l'intégrité des données
    await this.prisma.$transaction(async (tx) => {
      if (existingAdvice) {
        // Mettre à jour l'avis existant
        await tx.advice.update({
          where: { id: existingAdvice.id },
          data: {
            content: data.content,
            rating: data.rating,
          },
        });
      } else {
        // Créer un nouvel avis
        await tx.advice.create({
          data: {
            userId: user.id,
            productId: data.productId,
            content: data.content,
            rating: data.rating,
          },
        });
      }

      // Calculer la note moyenne et le nombre d'avis pour le produit
      const averageRating = await tx.advice.aggregate({
        where: { productId: data.productId },
        _avg: { rating: true },
      });


      // Mettre à jour le produit avec la nouvelle note moyenne
      await tx.product.update({
        where: { id: data.productId },
        data: {
          rating: averageRating._avg.rating || null, // Si aucun avis, mettre null ou une valeur par défaut
        },
      });
    });

    return {
      success: true,
      message: 'Avis mis à jour avec succès',
    };
  }
}