package route

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"reverse-http/Controller"
	"reverse-http/Middleware"

	"github.com/gofiber/fiber/v2/middleware/limiter"
)

func ReverseHttpRouter(app *fiber.App, ctrl *controller.Controller) {
	noStore := func(c *fiber.Ctx) error {
		c.Set(fiber.HeaderCacheControl, "no-store")
		return c.Next()
	}

	crudLimit := limiter.New(limiter.Config{
		Max:        25,
		Expiration: 10 * time.Minute,
	})

	normalLimit := limiter.New(limiter.Config{
		Max:        40,
		Expiration: 10 * time.Minute,
	})

	ReverseRoute := app.Group("/reverse-http")

	ReverseRoute.Get("/", normalLimit, func(c *fiber.Ctx) error {
		return c.Status(200).JSON(fiber.Map{
			"message": "reverse-http route is up",
		})
	})

	ReverseRoute.Post("/add", crudLimit, middleware.AuthUser, noStore, ctrl.CreateReverseRoute)

	ReverseRoute.All("/oauth/callback/:id", normalLimit, ctrl.RedirectRequest)

	ReverseRoute.Get("/list", normalLimit, middleware.AuthUser, ctrl.GetRedirectList)

	ReverseRoute.Post("/edit", crudLimit, middleware.AuthUser, ctrl.UpdateConfig)

	ReverseRoute.Get("/clientKey/:id", normalLimit, middleware.AuthUser, noStore, ctrl.GetConfigSecret)
	ReverseRoute.Post("/clientKey/:id/rotate", crudLimit, middleware.AuthUser, noStore, ctrl.RotateConfigSecret)

	ReverseRoute.Get("/remote/:id", normalLimit, ctrl.RedirectRequest)

	ReverseRoute.Delete("/truncate/:id", crudLimit, middleware.AuthUser, ctrl.DeleteOauthConfig)
}
