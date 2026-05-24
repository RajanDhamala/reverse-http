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

	test := limiter.New(limiter.Config{
		Max:        5,
		Expiration: 10 * time.Minute,
	})

	AppConfigRouter.Get("/", test, func(c *fiber.Ctx) error {
		data := make(map[string]string)
		data["data"] = "app config route is up and running"
		return c.Status(200).JSON(data)
	})

	AppConfigRouter.Post("/init", middleware.AuthUser, ctrl.AddAppConfig)

	AppConfigRouter.Get("/allConfigs", middleware.AuthUser, ctrl.GetOwnerConfigs)

	AppConfigRouter.Get("/config/:id", ctrl.GetAppConfig)

	AppConfigRouter.Patch("/update", middleware.AuthUser, ctrl.EditOwnerConfig)

	AppConfigRouter.Delete("/delete/:id", middleware.AuthUser, ctrl.DeleteAppConfig)
}
