package main

import (
	"context"
	"log"
	"os"
	"time"

	redis "github.com/redis/go-redis/v9"
	database "reverse-http/Configs"
	controller "reverse-http/Controller"
	route "reverse-http/Route"
	utils "reverse-http/Utils"
	sqlc "reverse-http/db/sqlc"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load("./.env")
	if err != nil {
		log.Println("No .env file loaded; using process environment")
	}

	host := os.Getenv("HOST")
	redisKey := os.Getenv("REDIS_URL")
	if redisKey == "" {
		log.Fatal("REDIS_URL is not set")
	}
	dbPool, err := database.ConnectDB()
	if err != nil {
		log.Fatal("Error connecting to the database:", err)
	}
	defer dbPool.Close()

	if host == "" {
		host = "0.0.0.0"
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	utils.GoogleConfig()
	utils.GithubConfig()

	addr := host + ":" + port

	app := fiber.New()

	app.Use(recover.New())

	allowOrigins := os.Getenv("CORS_ALLOWED_ORIGINS")
	if allowOrigins == "" {
		allowOrigins = utils.FrontendBaseURL()
	}

	app.Use(cors.New(cors.Config{
		AllowOrigins:     allowOrigins,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET,POST,PUT,DELETE,PATCH,OPTIONS",
		AllowCredentials: true,
	}))
	opt, err := redis.ParseURL(redisKey)
	if err != nil {
		log.Fatal("Error parsing REDIS_URL:", err)
	}
	redisClient := redis.NewClient(opt)

	ctrl := controller.NewController(sqlc.New(dbPool), dbPool, redisClient)

	route.UserRouter(app, ctrl)
	route.OauthRouter(app, ctrl)
	route.AppConfigRouter(app, ctrl)
	route.ReverseHttpRouter(app, ctrl)

	ctx := context.Background()

	app.Get("/set", func(c *fiber.Ctx) error {
		redisClient.Set(ctx, "foo", "bar", 30*time.Second)
		return c.Status(200).JSON(fiber.Map{
			"message": "Value set in Redis",
			"value":   "bar",
		})
	})

	app.Get("/get", func(c *fiber.Ctx) error {
		val, err := redisClient.Get(ctx, "foo").Result()
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "Failed to get value from Redis",
			})
		}
		return c.Status(200).JSON(fiber.Map{
			"message": "Value retrieved from Redis",
			"value":   val,
		})
	})

	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendString("Hello, Reverse Http is Ready 2 Serve!")
	})

	log.Fatal(app.Listen(addr))
}
