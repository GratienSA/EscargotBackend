/*
  Warnings:

  - The primary key for the `Account` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `Account` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - Added the required column `itemsPrice` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentMethod` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingPrice` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `taxPrice` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Account` DROP PRIMARY KEY,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `Order` ADD COLUMN `deliveredAt` DATETIME(3) NULL,
    ADD COLUMN `isDelivered` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `isPaid` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `itemsPrice` DECIMAL(12, 2) NOT NULL,
    ADD COLUMN `paidAt` DATETIME(3) NULL,
    ADD COLUMN `paymentMethod` VARCHAR(191) NOT NULL,
    ADD COLUMN `paymentResult` JSON NULL,
    ADD COLUMN `shippingAddress` JSON NOT NULL,
    ADD COLUMN `shippingPrice` DECIMAL(12, 2) NOT NULL,
    ADD COLUMN `taxPrice` DECIMAL(12, 2) NOT NULL;

-- AlterTable
ALTER TABLE `Product` ADD COLUMN `rating` DOUBLE NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `paymentMethod` VARCHAR(191) NULL;
