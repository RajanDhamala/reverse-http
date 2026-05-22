package route

import (
	"github.com/gofiber/fiber/v2"

	"reverse-http/Controller"
)

func OauthRouter(app *fiber.App, ctrl *controller.Controller) {
	OauthRouter := app.Group("/oauth")

	OauthRouter.Get("/github/login", func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"message": "Redirecting to GitHub for authentication",
		})
	})

	OauthRouter.Get("/github", ctrl.GithubLoginSas)
	OauthRouter.Get("/github/callback", ctrl.GithubLoginSasCallback)

	OauthRouter.Get("/google", ctrl.GoogleLoginSas)
	OauthRouter.Get("/google/callback", ctrl.GoogleLoginCallbackSas)
}
