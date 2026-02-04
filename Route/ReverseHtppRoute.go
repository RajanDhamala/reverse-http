package route

import (
	"github.com/gofiber/fiber/v2"
	"reverse-http/Controller"
	"reverse-http/Middleware"
)

func ReverseHttpRouter(app *fiber.App) {
	ReverseRoute := app.Group("/reverse-http")

	ReverseRoute.Get("/", func(c *fiber.Ctx) error {
		return c.Status(200).JSON(fiber.Map{
			"message": "reverse-http route is up",
		})
	})

	ReverseRoute.Post("/add", middleware.AuthUser, controller.CreateReverseRoute)
}
