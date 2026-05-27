package route

import (
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/gofiber/fiber/v2/middleware/limiter"

	"reverse-http/Controller"
)

func OauthRouter(app *fiber.App, ctrl *controller.Controller) {
	OauthRouter := app.Group("/oauth")

	normalLimit := limiter.New(limiter.Config{
		Max:        15,
		Expiration: 5 * time.Minute,
	})

	OauthRouter.Get("/github/login", normalLimit, func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"message": "Redirecting to GitHub for authentication",
		})
	})

	OauthRouter.Get("/github", normalLimit, ctrl.GithubLoginSas)
	OauthRouter.Get("/github/callback", normalLimit, ctrl.GithubLoginSasCallback)

	OauthRouter.Get("/google", normalLimit, ctrl.GoogleLoginSas)
	OauthRouter.Get("/google/callback", normalLimit, ctrl.GoogleLoginCallbackSas)
}
