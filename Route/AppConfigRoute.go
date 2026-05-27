package route

import (
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/gofiber/fiber/v2/middleware/limiter"
	"reverse-http/Controller"
	"reverse-http/Middleware"
)

func AppConfigRouter(app *fiber.App, ctrl *controller.Controller) {
	AppConfigRouter := app.Group("/app")

	crudLimit := limiter.New(limiter.Config{
		Max:        100,
		Expiration: 10 * time.Minute,
	})

	test := limiter.New(limiter.Config{
		Max:        15,
		Expiration: 10 * time.Minute,
	})

	AppConfigRouter.Get("/", test, func(c *fiber.Ctx) error {
		data := make(map[string]string)
		data["data"] = "app config route is up and running"
		return c.Status(200).JSON(data)
	})

	AppConfigRouter.Post("/init", crudLimit, middleware.AuthUser, ctrl.AddAppConfig)

	AppConfigRouter.Get("/allConfigs", middleware.AuthUser, ctrl.GetOwnerConfigs)

	AppConfigRouter.Get("/config/:id", limiter.New(limiter.Config{
		Max:        50,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.Params("id")
		},
		LimitReached: func(c *fiber.Ctx) error {
			data := make(map[string]string)
			data["error"] = "Too many requests for this app config, please try again later"
			return c.Status(429).JSON(data)
		},
	}),
		ctrl.GetAppConfig,
	)

	AppConfigRouter.Patch("/update", crudLimit, middleware.AuthUser, ctrl.EditOwnerConfig)

	AppConfigRouter.Delete("/delete/:id", crudLimit, middleware.AuthUser, ctrl.DeleteAppConfig)
}
