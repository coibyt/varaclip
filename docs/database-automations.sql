-- Run once in phpMyAdmin (database -> SQL tab): automatic marketing emails.
CREATE TABLE IF NOT EXISTS `EmailAutomation` (
  `key` VARCHAR(40) NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT false,
  `subject` VARCHAR(150) NOT NULL,
  `body` TEXT NOT NULL,
  `buttonLabel` VARCHAR(40) NOT NULL DEFAULT '',
  `delayDays` INT NOT NULL DEFAULT 1,
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `EmailAutomationSend` (
  `id` VARCHAR(191) NOT NULL,
  `automation` VARCHAR(40) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `period` VARCHAR(20) NOT NULL,
  `status` VARCHAR(10) NOT NULL,
  `error` VARCHAR(200) NOT NULL DEFAULT '',
  `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `EmailAutomationSend_automation_userId_period_key`(`automation`, `userId`, `period`),
  INDEX `EmailAutomationSend_sentAt_idx`(`sentAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Needed too (also in database-email.sql); harmless if it already exists.
CREATE TABLE IF NOT EXISTS `SiteSetting` (
  `key` VARCHAR(40) NOT NULL,
  `value` VARCHAR(200) NOT NULL,
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
