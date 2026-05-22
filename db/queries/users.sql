-- internal/db/queries/users.sql

-- name: CreateUser :one
INSERT INTO users (
    id,
    username,
    email,
    password,
    github_provider_id,
    google_provider_id,
    avatar
)
VALUES (
    $1, $2, $3, $4, $5,$6,$7
)
RETURNING *;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1;

-- name: GetUserByGithubProviderID :one
SELECT * FROM users WHERE github_provider_id = $1;

-- name: GetUserByGoogleProviderID :one
SELECT * FROM users WHERE google_provider_id = $1;

-- name: ListUsers :many
SELECT *
FROM users
ORDER BY created_at DESC;

-- name: GetUserByGithubProviderIDAndEmail :one
SELECT * from users where github_provider_id = $1 AND email = $2;

-- name: GetUserbyGoogleProviderIDAndEmail :one
SELECT * from users where google_provider_id = $1 AND email = $2;

-- name: CreateAppConfig :one
INSERT INTO app_configs (id,app_name ,endpoint,configs,user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *;

-- name: GetAppConfigs :many
SELECT * FROM app_configs WHERE user_id = $1 ORDER BY created_at DESC;

-- name: GetAppConfigByID :one
SELECT id,app_name,endpoint,configs,updated_at FROM app_configs WHERE id = $1;

-- name: UpdateAppConfig :one
UPDATE app_configs SET
    app_name = COALESCE($3, app_name),
    endpoint  = COALESCE($4, endpoint),
    configs   = COALESCE($5, configs)
WHERE id = $1 AND user_id = $2
RETURNING *;

-- name: CreteOauthConfig :one
INSERT INTO oauth_configs (id,key,endpoint,user_id,client_secret ) VALUES($1,$2,$3,$4,$5) RETURNING *;

-- name: GetOauthConfigData :one
SELECT * from oauth_configs WHERE id=$1 ;

-- name: GetOauthClientSecret :one
SELECT client_secret ,id from oauth_configs where id=$1 AND user_id=$2;

-- name: GetOauthList :many
SELECT id,key,endpoint,created_at,updated_at from oauth_configs where user_id=$1;

-- name: ChekidConfigExist :one
SELECT id from oauth_configs WHERE key=$1 and user_id=$2;

-- name: UpdateOauthConfig :one
UPDATE oauth_configs SET 
    endpoint = COALESCE($3, endpoint),
    key = COALESCE($4, key)
WHERE id=$1 AND user_id=$2 
RETURNING *;


-- name: DeleteOauthConfig :exec
DELETE FROM oauth_configs WHERE id=$1 AND user_id=$2;


