-- Créer la table Role
CREATE TABLE `Role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(65) NOT NULL,
    `description` TEXT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Role_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insérer le rôle par défaut
INSERT INTO `Role` (name, description, updatedAt) VALUES ('USER', 'Default user role', CURRENT_TIMESTAMP(3));

-- Ajouter la colonne roleId à la table User
ALTER TABLE `User` ADD COLUMN `roleId` INTEGER;

-- Mettre à jour les utilisateurs existants avec le rôle par défaut
UPDATE `User` SET `roleId` = (SELECT id FROM `Role` WHERE name = 'USER');

-- Rendre la colonne roleId non nullable
ALTER TABLE `User` MODIFY COLUMN `roleId` INTEGER NOT NULL;

-- Ajouter la contrainte de clé étrangère
ALTER TABLE `User` ADD CONSTRAINT `User_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;