-- Run once in phpMyAdmin (database -> SQL tab): API keys for posting software.
CREATE TABLE IF NOT EXISTS `ApiKey` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(60) NOT NULL,
  `prefix` VARCHAR(12) NOT NULL,
  `keyHash` VARCHAR(64) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastUsedAt` DATETIME(3) NULL,
  `revokedAt` DATETIME(3) NULL,
  UNIQUE INDEX `ApiKey_keyHash_key`(`keyHash`),
  INDEX `ApiKey_userId_idx`(`userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
