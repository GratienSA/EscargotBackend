import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdviceService } from './advice.service';
import { CreateAdviceDto } from './dto/create.advice.dto';
import { UpdateAdviceDto } from './dto/update.advice.dto';
import { GetUser } from 'src/auth/decorator';
import { User } from '@prisma/client';
import { JwtGuard } from 'src/auth/guard/jwt.guard';

@UseGuards(JwtGuard)
@Controller('advice')
export class AdviceController {
  constructor(private readonly adviceService: AdviceService) {}

  @Get('/all')
  getAllAdvices() {
    return this.adviceService.getAll();
  }

  @Post('/new')
  createAdvice(@Body() dto: CreateAdviceDto, @GetUser() user: User) {
    return this.adviceService.createAdvice(dto, user);
  }

  @Patch('/update/:id')
  updateAdvice(
    @Body() dto: UpdateAdviceDto,
    @Param('id') id: string,
    @GetUser() user: User,
  ) {
    return this.adviceService.updateAdvice(dto, user, +id);
  }

  @HttpCode(204)
  @Delete('/delete/:id')
  deleteAdvice(@Param('id') id: string, @GetUser() user: User) {
    return this.adviceService.deleteAdvice(+id, user);
  }


  @Get('/product/:productId')
  getAdvicesByProduct(@Param('productId') productId: string) {
    return this.adviceService.getAdvicesByProduct(+productId);
  }
}