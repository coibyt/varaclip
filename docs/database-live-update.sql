-- Run this ONLY if you already ran the first version of database-live-chat.sql (the one with Cloudflare columns).
-- It turns the LiveStream table into the "paste a YouTube / Facebook / TikTok live link" version.
ALTER TABLE `LiveStream`
  DROP COLUMN `cfInputId`,
  DROP COLUMN `whipUrl`,
  DROP COLUMN `lastBeat`,
  ADD COLUMN `platform` VARCHAR(12) NOT NULL DEFAULT 'youtube',
  ADD COLUMN `sourceUrl` VARCHAR(600) NOT NULL DEFAULT '',
  ADD COLUMN `embedId` VARCHAR(200) NOT NULL DEFAULT '';
