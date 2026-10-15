-- Run once in phpMyAdmin (database -> SQL tab): counts website visitors for the admin page.
CREATE TABLE IF NOT EXISTS `SiteVisit` (
  `id` VARCHAR(191) NOT NULL,
  `day` VARCHAR(10) NOT NULL,
  `visitorKey` VARCHAR(40) NOT NULL,
  `userId` VARCHAR(191) NULL,
  `platform` VARCHAR(12) NOT NULL,
  `views` INT NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `SiteVisit_day_visitorKey_key`(`day`, `visitorKey`),
  INDEX `SiteVisit_day_idx`(`day`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
