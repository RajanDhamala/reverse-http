package route

import (
	"github.com/gofiber/fiber/v2"
	"reverse-http/Controller"
)

func OauthRouter(app *fiber.App) {
	OauthRouter := app.Group("/oauth")

	OauthRouter.Get("/", func(c *fiber.Ctx) error {
		return c.Status(200).JSON(fiber.Map{
			"message": "oauth route is up",
		})
	})

	OauthRouter.Get("/github/login", controller.GithubLogin)
	OauthRouter.Get("/github/callback", controller.GithubCallback)

	OauthRouter.Get("/google/login", controller.GoogleLogin)
	OauthRouter.Get("/google/callback", controller.GoogleCallback)
}
