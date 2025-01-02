/*
  Warnings:

  - You are about to alter the column `totalAmount` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Double`.
  - You are about to alter the column `itemsPrice` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Double`.
  - You are about to alter the column `shippingPrice` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Double`.
  - You are about to alter the column `taxPrice` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Double`.
  - You are about to alter the column `price` on the `OrderItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Double`.
  - You are about to alter the column `amount` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Double`.
  - You are about to alter the column `price` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Double`.

*/
-- DropForeignKey
ALTER TABLE `OrderItem` DROP FOREIGN KEY `OrderItem_orderId_fkey`;

-- AlterTable
ALTER TABLE `Order` MODIFY `totalAmount` DOUBLE NOT NULL,
    MODIFY `itemsPrice` DOUBLE NOT NULL,
    MODIFY `shippingPrice` DOUBLE NOT NULL,
    MODIFY `taxPrice` DOUBLE NOT NULL;

-- AlterTable
ALTER TABLE `OrderItem` MODIFY `price` DOUBLE NOT NULL;

-- AlterTable
ALTER TABLE `Payment` MODIFY `amount` DOUBLE NOT NULL;

-- AlterTable
ALTER TABLE `Product` MODIFY `price` DOUBLE NOT NULL;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
