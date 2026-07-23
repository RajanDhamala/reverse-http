package route

import (
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/gofiber/fiber/v2/middleware/limiter"

	"reverse-http/Controller"
	"reverse-http/Middleware"
)

func OauthRouter(app *fiber.App, ctrl *controller.Controller) {
	OauthRouter := app.Group("/oauth")

	normalLimit := limiter.New(limiter.Config{
		Max:        15,
		Expiration: 5 * time.Minute,
	})
	exchangeLimit := limiter.New(limiter.Config{
		Max:        60,
		Expiration: time.Minute,
	})

	OauthRouter.Get("/github/login", normalLimit, func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"message": "Redirecting to GitHub for authentication",
		})
	})

	OauthRouter.Get("/error", ctrl.OAuthErrorPage)

	OauthRouter.Get("/github", normalLimit, ctrl.BeginGithubOAuth)
	OauthRouter.Get("/github/callback", normalLimit, ctrl.CompleteGithubOAuth)

	OauthRouter.Get("/google", normalLimit, ctrl.BeginGoogleOAuth)
	OauthRouter.Get("/google/callback", normalLimit, ctrl.CompleteGoogleOAuth)
	OauthRouter.Post("/exchange", exchangeLimit, ctrl.ExchangeOAuthCode)

	OauthRouter.Get("/listen/:flowID", middleware.AuthUser, ctrl.ListenForOAuth)
}
