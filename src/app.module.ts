import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { MailerModule } from './email/email.module';
import { ImageModule } from './image/image.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ProductModule } from './product/product.module';
import { CategoryModule } from './category/category.module';
import { AdviceModule } from './advice/advice.module';
import { CartModule } from './cart/cart.module';
import { PaymentModule } from './payment/payment.module';
import { SearchController } from './search/search.controller';
import { StripeService } from './stripe/stripe.service';
import { CheckoutController } from './checkout/checkout.controller';
import { CheckoutModule } from './checkout/checkout.module';
import { OrdersModule } from './order/order.module';
import { InventoryModule } from './inventory/inventory.module';
@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',

    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    UserModule,
    AuthModule,
    MailerModule,
    ImageModule,
    ProductModule,
    CategoryModule,
    AdviceModule,
    CartModule,
    OrdersModule,
    PaymentModule,
    CheckoutModule,
    InventoryModule

  ],
  controllers: [SearchController, CheckoutController],
  providers: [StripeService],
})
export class AppModule {}
