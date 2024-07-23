import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';

import { User } from '@prisma/client';
import { JwtGuard } from 'src/auth/guard';
import { GetUser } from 'src/auth/decorator';
import { AddToCartDto } from './dto/Add-to-Cart.dto';
import { UpdateCartItemDto } from './dto/UpdateCartDto';

@UseGuards(JwtGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@GetUser() user: User) {
    return this.cartService.getCart(user.id);
  }

  @Post('/add')
  async addToCart(@GetUser() user: User, @Body() addToCartDto: AddToCartDto) {
    return this.cartService.addToCart(user.id, addToCartDto);
  }

  @Patch('update/:productId')
  async updateCartItem(
    @GetUser() user: User,
    @Param('productId') productId: string,
    @Body() updateCartItemDto: UpdateCartItemDto
  ) {
    return this.cartService.updateCartItem(user.id, +productId, updateCartItemDto);
  }

  @Delete('remove/:productId')
  async removeFromCart(@GetUser() user: User, @Param('productId') productId: string) {
    return this.cartService.removeFromCart(user.id, +productId);
  }

  @Delete('clear')
  async clearCart(@GetUser() user: User) {
    return this.cartService.clearCart(user.id);
  }
}