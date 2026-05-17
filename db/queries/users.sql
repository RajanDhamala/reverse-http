-- internal/db/queries/users.sql

-- name: CreateUser :one
INSERT INTO users (
    username,
    email,
    password,
    github_provider_id,
    google_provider_id,
    type,
    avatar
)
VALUES (
    $1, $2, $3, $4, $5, COALESCE($6, 'free'), $7
)
RETURNING *;

-- name: GetUserByID :one
SELECT *
FROM users
WHERE id = $1
AND deleted_at IS NULL
LIMIT 1;

-- name: GetUserByEmail :one
SELECT *
FROM users
WHERE email = $1
AND deleted_at IS NULL
LIMIT 1;

-- name: GetUserByGithubProviderID :one
SELECT *
FROM users
WHERE github_provider_id = $1
AND deleted_at IS NULL
LIMIT 1;

-- name: GetUserByGoogleProviderID :one
SELECT *
FROM users
WHERE google_provider_id = $1
AND deleted_at IS NULL
LIMIT 1;

-- name: ListUsers :many
SELECT *
FROM users
WHERE deleted_at IS NULL
ORDER BY created_at DESC;

-- name: UpdateUser :one
UPDATE users
SET
    username = COALESCE($2, username),
    email = COALESCE($3, email),
    password = COALESCE($4, password),
    github_provider_id = COALESCE($5, github_provider_id),
    google_provider_id = COALESCE($6, google_provider_id),
    type = COALESCE($7, type),
    avatar = COALESCE($8, avatar),
    updated_at = now()
WHERE id = $1
AND deleted_at IS NULL
RETURNING *;

-- name: SoftDeleteUser :exec
UPDATE users
SET deleted_at = now()
WHERE id = $1
AND deleted_at IS NULL;
