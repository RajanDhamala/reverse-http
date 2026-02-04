package main

import (
	"fmt"
	"log"
	"os"

	db "reverse-http/Configs"
	route "reverse-http/Route"
	utils "reverse-http/Utils"

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
	fmt.Println("host:", host)
	githubSecret := os.Getenv("GITHUB_CLIENT_ID")
	fmt.Println("GitHub Client Secret:", githubSecret)
	db.InitDatabase()
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
	log.Println("Listening on", addr)

	app := fiber.New()

	app.Use(recover.New())

	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3000,http://localhost:5173",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowCredentials: true,
	}))

	route.UserRouter(app)
	route.OauthRouter(app)
	route.ReverseHttpRouter(app)

	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendString("Hello, World!")
	})

	app.Get("/appConfig", func(c *fiber.Ctx) error {
		return c.Status(200).JSON(fiber.Map{
			"appName":  "goPass",
			"endpoint": "192.168.18.26:8000",
		})
	})

	app.Get("/oauthNavigate/:id", func(c *fiber.Ctx) error {
		id := c.Params("id")

		if id == "" {
			return c.Status(400).JSON(fiber.Map{
				"error": "please include id in req",
			})
		}

		return c.Redirect("https://192.168.18.26:5173/")
	})

	log.Fatal(app.Listen(addr))
}
