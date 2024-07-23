import { Controller, Get, Query, UseGuards, ParseIntPipe, DefaultValuePipe, BadRequestException } from '@nestjs/common';
import { JwtGuard } from '../auth/guard';
import { GetUser } from '../auth/decorator';
import { User } from '@prisma/client';
import { ProductService } from '../product/product.service';

@UseGuards(JwtGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  async globalSearch(
    @GetUser() user: User,
    @Query('q') query?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
    @Query('sort') sort?: string,
    @Query('category') category?: string,
    @Query('priceRange') priceRange?: string,
    @Query('rating', new DefaultValuePipe(0), ParseIntPipe) rating?: number,
  ) {
    if (priceRange) {
      const [minPrice, maxPrice] = priceRange.split('-').map(Number);
      if (isNaN(minPrice) || isNaN(maxPrice)) {
        throw new BadRequestException('Invalid price range format. Use format: minPrice-maxPrice');
      }
    }

    return this.productService.globalSearch({
      query,
      user,
      page,
      limit,
      sort,
      category,
      priceRange,
      rating,
    });
  }
}