/*
  Warnings:

  - You are about to alter the column `paymentMethod` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(2))`.
  - You are about to alter the column `paymentMethod` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `VarChar(50)` to `Enum(EnumId(2))`.
  - You are about to alter the column `paymentMethod` on the `User` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(2))`.

*/
-- AlterTable
ALTER TABLE `Order` MODIFY `paymentMethod` ENUM('CASH', 'CREDIT_CARD') NOT NULL;

-- AlterTable
ALTER TABLE `Payment` MODIFY `paymentMethod` ENUM('CASH', 'CREDIT_CARD') NOT NULL;

-- AlterTable
ALTER TABLE `User` MODIFY `paymentMethod` ENUM('CASH', 'CREDIT_CARD') NULL;
