import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/email/email.service';
import { ProductGateway } from './product.gateway';
import { User } from '@prisma/client';

interface SearchParams {
  query?: string;
  user: User;
  page: number;
  limit: number;
  sort?: string;
  category?: string;
  priceRange?: string;
  rating?: number;

}
@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productGateway: ProductGateway,
    private readonly emailService: EmailService,
  ) {}

  async getAllProducts() {
    try {
      const products = await this.prisma.product.findMany({
        orderBy: {
          name: 'desc',
        },
        include: {
          category: {
            select: {
              name: true
            }
          },
          advice: true
        },
      });

      return products.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        imagePath: product.imagePath,
        category: product.category,
        averageRating: product.advice.length > 0
          ? product.advice.reduce((sum, advice) => sum + advice.rating, 0) / product.advice.length
          : null
      }));
    } catch (error) {
      console.error('Error in getAllProducts:', error);
      throw new InternalServerErrorException('An error occurred while fetching all products');
    }
  }

  async globalSearch(params: SearchParams) {
    const { query, page = 1, limit = 12, sort, category, priceRange, rating = 0,} = params;
    const skip = (page - 1) * limit;
    let orderBy: any = { name: 'asc' };
  
    if (sort) {
      const [field, direction] = sort.split('_');
      if (['price', 'name'].includes(field)) {
        orderBy = { [field]: direction === 'desc' ? 'desc' : 'asc' };
      }
    }
  
    const where: any = {};
  
    if (query) {
      const lowerQuery = query.toLowerCase();
      where.OR = [
        { name: { contains: lowerQuery } },
        { description: { contains: lowerQuery } },
        { category: { name: { contains: lowerQuery } } },
      ];
    }
  
    if (category) {
      const formattedCategory = category.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      where.category = { name: formattedCategory };
    }
  
    if (priceRange) {
      const [minPrice, maxPrice] = priceRange.split('-').map(Number);
      if (isNaN(minPrice) || isNaN(maxPrice)) {
        throw new BadRequestException('Invalid price range format. Use format: minPrice-maxPrice');
      }
      where.price = { gte: minPrice, lte: maxPrice };
    }
  
    if (rating > 0) {
      where.advice = {
        some: {
          rating: { gte: parseInt(rating as any, 10) }
        }
      };
    }
  
    console.log('Search Parameters:', params);
    console.log('Constructed Where Clause:', where);
  
    try {
      const [products, totalCount] = await Promise.all([
        this.prisma.product.findMany({
          where,
          include: { 
            category: true,
            advice: true
          },
          skip,
          take: parseInt(limit as any, 10),
          orderBy,
        }),
        this.prisma.product.count({ where }),
      ]);
  
      const productsWithAvgRating = products.map(product => ({
        ...product,
        averageRating: product.advice.length > 0
          ? product.advice.reduce((sum, advice) => sum + advice.rating, 0) / product.advice.length
          : null
      }));
  
      return {
        products: productsWithAvgRating,
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        limit,
      };
    } catch (error) {
      console.error('Error in globalSearch:', error);
      throw new InternalServerErrorException('An error occurred while searching products');
    }
  }
  

  async createProduct(dto: CreateProductDto, user: User) {
    const category = await this.prisma.category.findFirst({
      where: {
        name: dto.category,
      }
    });
  
    if (!category) {
      throw new NotFoundException(`Category with name ${dto.category} not found`);
    }
  
    const newProduct = await this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        imagePath: dto.imagePath,
        category: {
          connect: { id: category.id }
        }
      },
      include: {
        category: true
      }
    });
  
    await this.productGateway.server.emit('newProduct', await this.getAllProducts());
    return newProduct;
  }

  async getProductById(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { 
        category: true,
        advice: true
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const averageRating = product.advice.length > 0
      ? product.advice.reduce((sum, advice) => sum + advice.rating, 0) / product.advice.length
      : null;

    return {
      ...product,
      averageRating
    };
  }

  async updateProduct(id: number, dto: UpdateProductDto) {
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new NotFoundException('Produit non trouvé');
    }

    let category = null;
    if (dto.category) {
      category = await this.prisma.category.findFirst({
        where: {
          name: dto.category,
        }
      });
      if (!category) {
        throw new NotFoundException(`Category with name ${dto.category} not found`);
      }
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        imagePath: dto.imagePath,
        category: category ? {
          connect: { id: category.id }
        } : undefined
      },
      include: {
        category: true,
        advice: true
      }
    });

    const averageRating = updatedProduct.advice.length > 0
      ? updatedProduct.advice.reduce((sum, advice) => sum + advice.rating, 0) / updatedProduct.advice.length
      : null;

    const products = await this.getAllProducts();
    this.productGateway.server.emit('newProduct', products);
    
    return {
      ...updatedProduct,
      averageRating
    };
  }

  async deleteProduct(id: number) {
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new NotFoundException("Le produit n'existe pas");
    }

    await this.prisma.product.delete({
      where: { id },
    });

    const products = await this.getAllProducts();
    await this.productGateway.server.emit('newProduct', products);
    return { message: 'Produit supprimé avec succès' };
  }

  async getProductsByCategory(categoryId: number) {
    try {
      const products = await this.prisma.product.findMany({
        where: {
          categoryId: categoryId
        },
        include: {
          category: true,
          advice: true
        }
      });

      if (products.length === 0) {
        throw new NotFoundException(`No products found for category with ID ${categoryId}`);
      }

      const productsWithAvgRating = products.map(product => ({
        ...product,
        averageRating: product.advice.length > 0
          ? product.advice.reduce((sum, advice) => sum + advice.rating, 0) / product.advice.length
          : null
      }));

      return productsWithAvgRating;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error in getProductsByCategory:', error);
      throw new InternalServerErrorException('An error occurred while fetching products by category');
    }
  }
}

