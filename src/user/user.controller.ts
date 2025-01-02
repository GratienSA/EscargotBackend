import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  UseGuards,
  Param,
  ParseIntPipe,
  UploadedFile,
  UseInterceptors,
  Put,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/index';
import { User } from '@prisma/client';
import { GetUser } from 'src/auth/decorator/get-user-decorator';
import { JwtGuard } from 'src/auth/guard/jwt.guard';
import { PaymentMethodDto } from './dto/payment-method.dto';



@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtGuard)
  @Get('/all')
  getAllUsers() {
    return this.userService.getAllUsers();
  }

  @UseGuards(JwtGuard)
  @Get('profile')
  getProfile(@GetUser() user: User) {
    return this.userService.getUserProfile(user.id);
  }

  @UseGuards(JwtGuard)
  @Get(':id')
  async getUserById(@Param('id', ParseIntPipe) userId: number) {
    return this.userService.getUserProfile(userId);
  }

  @UseGuards(JwtGuard)
  @Patch('profile')
  @UseInterceptors(FileInterceptor('picture'))
  async updateUser(
    @GetUser('id') userId: number,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (file) {
      updateUserDto.profileImagePath = file.filename;
    }
    return this.userService.updateUser(userId, updateUserDto);
  }

  @UseGuards(JwtGuard)
  @HttpCode(204)
  @Delete('/delete/:id')
  deleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.userService.deleteUser(id);
  }


@Put(':id/payment-method')
async updatePaymentMethod(
  @Param('id') id: string,
  @Body() paymentMethodDto: PaymentMethodDto
) {
  return this.userService.updatePaymentMethod(parseInt(id), paymentMethodDto.type);
}
}