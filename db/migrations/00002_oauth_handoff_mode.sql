-- +goose Up
ALTER TABLE oauth_configs
ADD COLUMN handoff_mode TEXT;

UPDATE oauth_configs
SET handoff_mode = 'legacy_jwt'
WHERE handoff_mode IS NULL;

ALTER TABLE oauth_configs
ALTER COLUMN handoff_mode SET NOT NULL,
ALTER COLUMN handoff_mode SET DEFAULT 'authorization_code';

ALTER TABLE oauth_configs
ADD CONSTRAINT oauth_configs_handoff_mode_check
CHECK (handoff_mode IN ('legacy_jwt', 'authorization_code'));

-- +goose Down
ALTER TABLE oauth_configs
DROP CONSTRAINT IF EXISTS oauth_configs_handoff_mode_check;

ALTER TABLE oauth_configs
DROP COLUMN IF EXISTS handoff_mode;
