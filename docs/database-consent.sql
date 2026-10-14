-- Run once in phpMyAdmin (database -> SQL tab): records marketing consent and terms acceptance at sign-up.
CREATE TABLE IF NOT EXISTS `UserConsent` (
  `userId` VARCHAR(191) NOT NULL,
  `marketingEmail` BOOLEAN NOT NULL DEFAULT false,
  `marketingSms` BOOLEAN NOT NULL DEFAULT false,
  `termsAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
