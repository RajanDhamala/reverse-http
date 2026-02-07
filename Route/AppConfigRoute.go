package route

import (
	"github.com/gofiber/fiber/v2"
	"reverse-http/Controller"
)

func AppRouter(app *fiber.App) {
	AppRouter := app.Group("/app")

	AppRouter.Get("/", func(c *fiber.Ctx) error {
		return c.Status(200).JSON(fiber.Map{
			"message": "app config is available rn",
		})
	})

	AppRouter.Post("/add", controller.AddAppConfig)
}
