-- ==========================================================
-- Queens & Ko.nl - TransIP MySQL Database Schema
-- Tabellen: agenda, sessions, daily_summaries, newsletter
-- ==========================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS `agenda` (
  `id` VARCHAR(128) NOT NULL,
  `date` VARCHAR(64) NOT NULL,
  `locationName` VARCHAR(255) NOT NULL DEFAULT '',
  `locationCity` VARCHAR(255) NOT NULL DEFAULT '',
  `infoLink` TEXT NULL,
  `ticketPrice` VARCHAR(64) NULL DEFAULT '',
  `displayFrom` VARCHAR(64) NULL DEFAULT '',
  `displayUntil` VARCHAR(64) NULL DEFAULT '',
  `isVisible` TINYINT(1) NOT NULL DEFAULT 1,
  `ticketLink` TEXT NULL,
  `isSoldOut` TINYINT(1) NOT NULL DEFAULT 0,
  `comments` TEXT NULL,
  `address` VARCHAR(255) NULL DEFAULT '',
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_agenda_date` (`date`),
  INDEX `idx_agenda_visible` (`isVisible`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id` VARCHAR(128) NOT NULL,
  `startedAt` VARCHAR(64) NOT NULL,
  `lastActiveAt` VARCHAR(64) NOT NULL DEFAULT '',
  `duration` INT NOT NULL DEFAULT 0,
  `referrer` TEXT NULL,
  `city` VARCHAR(128) NULL DEFAULT '',
  `country` VARCHAR(128) NULL DEFAULT '',
  `latitude` DOUBLE NULL DEFAULT 0,
  `longitude` DOUBLE NULL DEFAULT 0,
  `device` VARCHAR(64) NULL DEFAULT '',
  `os` VARCHAR(64) NULL DEFAULT '',
  `userAgent` TEXT NULL,
  `views` LONGTEXT NULL,
  `clicks` LONGTEXT NULL,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_sessions_started` (`startedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `daily_summaries` (
  `id` VARCHAR(32) NOT NULL,
  `date` VARCHAR(32) NOT NULL,
  `totalVisitors` INT NOT NULL DEFAULT 0,
  `avgDuration` DOUBLE NOT NULL DEFAULT 0,
  `cities` LONGTEXT NULL,
  `devices` LONGTEXT NULL,
  `os` LONGTEXT NULL,
  `referrers` LONGTEXT NULL,
  `clicks` LONGTEXT NULL,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_daily_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `newsletter` (
  `id` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `subscribedAt` VARCHAR(64) NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_newsletter_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
