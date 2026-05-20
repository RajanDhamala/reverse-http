package route

import (
	"github.com/gofiber/fiber/v2"

	"reverse-http/Controller"
)

func OauthRouter(app *fiber.App, ctrl *controller.Controller) {
	OauthRouter := app.Group("/oauth")

	OauthRouter.Get("/github", ctrl.GithubLogin)
	OauthRouter.Get("/github/callback", ctrl.GithubCallback)

	OauthRouter.Get("/google", ctrl.GoogleLogin)
	OauthRouter.Get("/google/callback", ctrl.GoogleCallback)
}
