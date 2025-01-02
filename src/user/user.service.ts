import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDto } from './dto';
import { PaymentMethod } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getAllUsers(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const users = await this.prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        address: true,
        city: true,
        postalCode: true,
        country: true,
        phone: true,
        email: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        profileImagePath: true,
      },
    });

    const totalUsers = await this.prisma.user.count(); 

    return {
      data: users,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
    };
  }

  async getUserProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        address: true,
        city: true,
        postalCode: true,
        country: true,
        phone: true,
        profileImagePath: true,
        isActive: true,
        gdprConsent: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUser(id: number, dto: UpdateUserDto) {
    try {
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: { 
          ...dto,
          updatedAt: new Date(),
        },
        select: {
          firstName: true,
          lastName: true,
          address: true,
          city: true,
          postalCode: true,
          country: true,
          phone: true,
          email: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          profileImagePath: true,
          gdprConsent: true,
        },
      });

      return updatedUser;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException("User doesn't exist");
      }
      throw error;
    }
  }

  async deleteUser(id: number): Promise<{ success: boolean; message: number }> {
    try {
        await this.prisma.user.delete({
            where: { id },
        });
    
        return { success: true, message: id }; 
    } catch (error) {
        if (error.code === 'P2025') {
            throw new NotFoundException("User doesn't exist");
        }
        throw error; // 
    }
}

  async getUserByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        address: true,
        city: true,
        postalCode: true,
        country: true,
        phone: true,
        profileImagePath: true,
        isActive: true,
        gdprConsent: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
  
  async getUserById(userId: number) {
    return this.getUserProfile(userId);
  }


async updatePaymentMethod(userId: number, paymentMethod: PaymentMethod) {
  try {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { paymentMethod },
    });

    if (!updatedUser) {
      throw new NotFoundException(`Utilisateur avec l'ID ${userId} non trouvé`);
    }

    return { success: true, message: 'Méthode de paiement mise à jour avec succès' };
  } catch (error) {
    if (error instanceof NotFoundException) {
      throw error;
    }
    throw new Error('Erreur lors de la mise à jour de la méthode de paiement');
  }
}

}