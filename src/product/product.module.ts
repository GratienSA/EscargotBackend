import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { EmailService } from 'src/email/email.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ProductGateway } from './product.gateway';

@Module({
  imports: [PrismaModule],
  controllers: [ProductController],
  providers: [ProductService, EmailService, ProductGateway],
  exports: [ProductService]
})
export class ProductModule {}
