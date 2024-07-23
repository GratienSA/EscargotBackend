import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtGuard } from 'src/auth/guard';
import { User } from '@prisma/client';
import { GetUser } from 'src/auth/decorator';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}
  
  @Get('/all')
  getAllProducts() {
    return this.productService.getAllProducts();
  }

  @Get('/search')
  globalSearch(
    @Query('query') query: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 12,
    @Query('sort') sort: string,
    @Query('category') category: string,
    @Query('priceRange') priceRange: string,
    @Query('rating') rating: number,
    @GetUser() user: User
  ) {
    return this.productService.globalSearch({
      query,
      user,
      page,
      limit,
      sort,
      category,
      priceRange,
      rating
    });
  }

  @UseGuards(JwtGuard)
  @Post('/new')
  createProduct(@Body() createProductDto: CreateProductDto, @GetUser() user: User) {
    return this.productService.createProduct(createProductDto, user);
  }

  @Get('/:id')
  getProductById(@Param('id', ParseIntPipe) id: number) {
    return this.productService.getProductById(id);
  }

  @UseGuards(JwtGuard)
  @Patch('/update/:id')
  updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto
  ) {
    return this.productService.updateProduct(id, updateProductDto);
  }

  @UseGuards(JwtGuard)
  @Delete('/delete/:id')
  removeProduct(@Param('id', ParseIntPipe) id: number) {
    return this.productService.deleteProduct(id);
  }

  @Get('category/:id')
  getProductsByCategory(@Param('id', ParseIntPipe) id: number) {
    return this.productService.getProductsByCategory(id);
  }
}