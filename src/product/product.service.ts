import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma/prisma.service';
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
  ) {}

  async getAllProducts(params: {
    query?: string;
    category?: string;
    page?: number;
    limit?: number;
    sort?: string;
  }) {
    const { query, category, page = 1, limit = 10 } = params;

    try {
      const products = await this.prisma.product.findMany({
        where: {
          ...(query && {
            name: {
              contains: query,
            },
          }),
          ...(category && {
            category: {
              name: category, 
            },
          }),
        },
        orderBy: {
          name: 'asc', 
        },
        skip: (page - 1) * limit,
        take: Number(limit),
        include: {
          category: true,
          advice: true,
          inventory: true,
        },
      });

      const totalResults = await this.prisma.product.count({
        where: {
          ...(query && {
            name: {
              contains: query,
            },
          }),
          ...(category && {
            category: {
              name: category,
            },
          }),
        },
      });

      return {
        data: products.map(product => ({
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          imagePath: product.imagePath,
          category: product.category.name, 
          inventory: product.inventory?.quantity || 0,
          averageRating:
            product.advice.length > 0
              ? product.advice.reduce((sum, advice) => sum + advice.rating, 0) / product.advice.length
              : null,
        })),
        totalPages: Math.ceil(totalResults / limit),
      };
    } catch (error) {
      console.error('Erreur dans getAllProducts:', error);
      throw new InternalServerErrorException('Une erreur est survenue lors de la récupération des produits');
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
  
  async createProduct(dto: CreateProductDto) { // Retrait du paramètre user
    // Validation simple
    if (!dto.name || !dto.price || !dto.categoryId) {
        throw new BadRequestException('Invalid product data');
    }

    // Recherche de la catégorie par son ID
    const category = await this.prisma.category.findFirst({
        where: {
            id: dto.categoryId,
        }
    });

    // Vérification si la catégorie existe
    if (!category) {
        throw new NotFoundException(`Category with ID ${dto.categoryId} not found`);
    }

    // Création du nouveau produit
    const newProduct = await this.prisma.product.create({
        data: {
            name: dto.name,
            description: dto.description,
            price: dto.price,
            imagePath: dto.imagePath,
            category: {
                connect: { id: category.id } // Connexion à la catégorie existante
            }
        },
        include: {
            category: true // Inclure les détails de la catégorie dans la réponse
        }
    });

    // Émission d'un événement pour notifier les clients de la création du produit
    await this.productGateway.server.emit('newProduct', newProduct);

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
    // Validation simple
    if (!dto.name || !dto.price) {
      throw new InternalServerErrorException('Invalid product data');
    }

    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new NotFoundException('Produit non trouvé');
    }

    let category = null;
    if (dto.categoryId) {
      category = await this.prisma.category.findFirst({
        where: {
          id: dto.categoryId,
        }
      });
      if (!category) {
        throw new NotFoundException(`Category with name ${dto.categoryId} not found`);
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

    const products = await this.getAllProducts({
      query: '', // Ajustez ces paramètres selon vos besoins
      category: '',
      page: 1,
      limit: 10,
    });
    
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

    try {
      await this.prisma.product.delete({
        where: { id },
      });

      const products = await this.getAllProducts({
        query: '', 
        category: '',
        page: 1,
        limit: 10,
      });
      
      await this.productGateway.server.emit('newProduct', products);
      
      return { message: 'Produit supprimé avec succès' };
    } catch (error) {
      console.error('Erreur lors de la suppression du produit:', error);
      throw new InternalServerErrorException('Une erreur est survenue lors de la suppression du produit');
    }
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

