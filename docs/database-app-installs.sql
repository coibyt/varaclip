-- Run once in phpMyAdmin (database -> SQL tab): counts app installs for the admin page.
CREATE TABLE IF NOT EXISTS `AppInstall` (
  `id` VARCHAR(191) NOT NULL,
  `deviceKey` VARCHAR(40) NOT NULL,
  `kind` VARCHAR(12) NOT NULL,
  `platform` VARCHAR(12) NOT NULL,
  `userId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `AppInstall_createdAt_idx`(`createdAt`),
  INDEX `AppInstall_deviceKey_kind_idx`(`deviceKey`, `kind`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
