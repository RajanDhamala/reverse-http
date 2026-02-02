package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"reverse-http/Configs"
	"reverse-http/Route"
)

func main() {
	host := os.Getenv("HOST")
	db.InitDatabase()
	if host == "" {
		host = "0.0.0.0"
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	addr := host + ":" + port
	log.Println("Listening on", addr)

	app := fiber.New()

	app.Use(recover.New())
	route.UserRouter(app)

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
