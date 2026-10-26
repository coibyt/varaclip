-- Run once in phpMyAdmin (database -> SQL tab): video categories.
CREATE TABLE IF NOT EXISTS `VideoCategory` (
  `videoId` VARCHAR(191) NOT NULL,
  `category` VARCHAR(24) NOT NULL,
  INDEX `VideoCategory_category_idx`(`category`),
  PRIMARY KEY (`videoId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
