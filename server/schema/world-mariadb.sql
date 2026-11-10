CREATE DATABASE IF NOT EXISTS rookland CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS rookland.world_saves (
  world_id VARCHAR(64) NOT NULL,
  owner_account_id BIGINT UNSIGNED NULL,
  snapshot LONGTEXT NOT NULL CHECK (JSON_VALID(snapshot)),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (world_id),
  KEY world_saves_owner (owner_account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
