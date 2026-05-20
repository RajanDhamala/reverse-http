package main

import (
	"log"
	"os"

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
		log.Fatal("Error loading .env file:", err)
	}

	host := os.Getenv("HOST")
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

	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3000,http://localhost:5173",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowCredentials: true,
	}))

	ctrl := controller.NewController(sqlc.New(dbPool), dbPool)

	route.UserRouter(app, ctrl)
	route.OauthRouter(app, ctrl)
	route.AppConfigRouter(app, ctrl)
	route.ReverseHttpRouter(app, ctrl)

	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendString("Hello, Reverse Http is Ready 2 Serve!")
	})

	log.Fatal(app.Listen(addr))
}
