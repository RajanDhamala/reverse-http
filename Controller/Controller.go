package controller

import (
	"github.com/jackc/pgx/v5/pgxpool"
	redis "github.com/redis/go-redis/v9"
	sqlc "reverse-http/db/sqlc"
)

type Controller struct {
	queries     *sqlc.Queries
	pool        *pgxpool.Pool
	redisClient *redis.Client
}

func NewController(queries *sqlc.Queries, pool *pgxpool.Pool, redisClient *redis.Client) *Controller {
	return &Controller{
		queries:     queries,
		pool:        pool,
		redisClient: redisClient,
	}
}
