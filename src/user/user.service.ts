import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDto } from './dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getAllUsers() {
    return this.prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
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

  async deleteUser(id: number) {
    try {
      return await this.prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException("User doesn't exist");
      }
      throw error;
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
}