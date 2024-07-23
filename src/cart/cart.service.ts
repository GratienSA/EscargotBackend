import {
    BadRequestException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  import { PrismaService } from 'src/prisma/prisma.service';
  import { User } from '@prisma/client';
import { AddToCartDto } from './dto/Add-to-Cart.dto';
import { UpdateCartItemDto } from './dto/UpdateCartDto';
  
  @Injectable()
  export class CartService {
    constructor(private prisma: PrismaService) {}
  
    async getCart(userId: number) {
      const cart = await this.prisma.cart.findUnique({
        where: { userId },
        include: {
          cartProducts: {
            include: {
              product: {
                select: {
                  name: true,
                  price: true,
                  imagePath: true,
                },
              },
            },
          },
        },
      });
  
      if (!cart) {
        throw new NotFoundException('Cart not found');
      }
  
      return cart;
    }
  
    async addToCart(userId: number, addToCartDto: AddToCartDto) {
      const { productId, quantity } = addToCartDto;
  
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });
  
      if (!product) {
        throw new BadRequestException('Product not found');
      }
  
      let cart = await this.prisma.cart.findUnique({
        where: { userId },
      });
  
      if (!cart) {
        cart = await this.prisma.cart.create({
          data: { userId },
        });
      }
  
      const existingCartProduct = await this.prisma.cartProduct.findFirst({
        where: {
          cartId: cart.id,
          productId: productId,
        },
      });
  
      if (existingCartProduct) {
        return this.prisma.cartProduct.update({
          where: { id: existingCartProduct.id },
          data: { quantity: existingCartProduct.quantity + quantity },
        });
      } else {
        return this.prisma.cartProduct.create({
          data: {
            cartId: cart.id,
            productId,
            quantity,
          },
        });
      }
    }
  
    async updateCartItem(userId: number, productId: number, updateCartItemDto: UpdateCartItemDto) {
      const cart = await this.prisma.cart.findUnique({
        where: { userId },
      });
  
      if (!cart) {
        throw new NotFoundException('Cart not found');
      }
  
      const cartProduct = await this.prisma.cartProduct.findFirst({
        where: {
          cartId: cart.id,
          productId: productId,
        },
      });
  
      if (!cartProduct) {
        throw new NotFoundException('Product not found in cart');
      }
  
      if (updateCartItemDto.quantity === 0) {
        return this.prisma.cartProduct.delete({
          where: { id: cartProduct.id },
        });
      } else {
        return this.prisma.cartProduct.update({
          where: { id: cartProduct.id },
          data: { quantity: updateCartItemDto.quantity },
        });
      }
    }
  
    async removeFromCart(userId: number, productId: number) {
      const cart = await this.prisma.cart.findUnique({
        where: { userId },
      });
  
      if (!cart) {
        throw new NotFoundException('Cart not found');
      }
  
      const cartProduct = await this.prisma.cartProduct.findFirst({
        where: {
          cartId: cart.id,
          productId: productId,
        },
      });
  
      if (!cartProduct) {
        throw new NotFoundException('Product not found in cart');
      }
  
      return this.prisma.cartProduct.delete({
        where: { id: cartProduct.id },
      });
    }
  
    async clearCart(userId: number) {
      const cart = await this.prisma.cart.findUnique({
        where: { userId },
      });
  
      if (!cart) {
        throw new NotFoundException('Cart not found');
      }
  
      await this.prisma.cartProduct.deleteMany({
        where: { cartId: cart.id },
      });
  
      return { message: 'Cart cleared successfully' };
    }
  }