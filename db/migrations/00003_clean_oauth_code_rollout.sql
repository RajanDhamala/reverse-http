-- +goose Up
TRUNCATE TABLE oauth_configs;

ALTER TABLE oauth_configs
DROP CONSTRAINT IF EXISTS oauth_configs_handoff_mode_check;

ALTER TABLE oauth_configs
DROP COLUMN IF EXISTS handoff_mode;

ALTER TABLE oauth_configs
ADD CONSTRAINT oauth_configs_client_secret_length_check
CHECK (octet_length(client_secret) >= 32);

-- +goose Down
ALTER TABLE oauth_configs
DROP CONSTRAINT IF EXISTS oauth_configs_client_secret_length_check;

ALTER TABLE oauth_configs
ADD COLUMN handoff_mode TEXT NOT NULL DEFAULT 'authorization_code';

ALTER TABLE oauth_configs
ADD CONSTRAINT oauth_configs_handoff_mode_check
CHECK (handoff_mode = 'authorization_code');
