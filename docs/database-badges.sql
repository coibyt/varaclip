-- Run once in phpMyAdmin (database -> SQL tab): lets admins set video badges by hand.
CREATE TABLE IF NOT EXISTS `VideoBadge` (
  `videoId` VARCHAR(191) NOT NULL,
  `badge` VARCHAR(8) NOT NULL,
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`videoId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
