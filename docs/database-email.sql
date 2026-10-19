-- Run once in phpMyAdmin (database -> SQL tab): email confirmation and password reset links.
CREATE TABLE IF NOT EXISTS `EmailToken` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `type` VARCHAR(10) NOT NULL,
  `tokenHash` VARCHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `usedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `EmailToken_tokenHash_idx`(`tokenHash`),
  INDEX `EmailToken_userId_type_idx`(`userId`, `type`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Admin switches (for example "confirm your email before the account is created").
CREATE TABLE IF NOT EXISTS `SiteSetting` (
  `key` VARCHAR(40) NOT NULL,
  `value` VARCHAR(200) NOT NULL,
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
