/*
  Warnings:

  - You are about to drop the column `shippingAddress` on the `Order` table. All the data in the column will be lost.
  - The values [CREDIT_CARD] on the enum `Payment_paymentMethod` will be removed. If these variants are still used in the database, this will fail.
  - The values [CREDIT_CARD] on the enum `Payment_paymentMethod` will be removed. If these variants are still used in the database, this will fail.
  - The values [CREDIT_CARD] on the enum `Payment_paymentMethod` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `shippingCity` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingStreet` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingZip` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Order` DROP COLUMN `shippingAddress`,
    ADD COLUMN `shippingCity` VARCHAR(191) NOT NULL,
    ADD COLUMN `shippingStreet` VARCHAR(191) NOT NULL,
    ADD COLUMN `shippingZip` VARCHAR(191) NOT NULL,
    MODIFY `totalAmount` DECIMAL(12, 2) NOT NULL,
    MODIFY `paymentMethod` ENUM('CASH', 'stripe') NOT NULL;

-- AlterTable
ALTER TABLE `OrderItem` MODIFY `price` DECIMAL(12, 2) NOT NULL;

-- AlterTable
ALTER TABLE `Payment` MODIFY `amount` DECIMAL(12, 2) NOT NULL,
    MODIFY `paymentMethod` ENUM('CASH', 'stripe') NOT NULL;

-- AlterTable
ALTER TABLE `Product` MODIFY `price` DECIMAL(12, 2) NOT NULL;

-- AlterTable
ALTER TABLE `User` MODIFY `paymentMethod` ENUM('CASH', 'stripe') NULL;
