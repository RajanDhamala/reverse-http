package controller

import (
	"github.com/jackc/pgx/v5/pgxpool"

	sqlc "reverse-http/db/sqlc"
)

type Controller struct {
	queries *sqlc.Queries
	pool    *pgxpool.Pool
}

func NewController(queries *sqlc.Queries, pool *pgxpool.Pool) *Controller {
	return &Controller{queries: queries, pool: pool}
}
