package route

import (
	"github.com/gofiber/fiber/v2"

	"reverse-http/Controller"
	"reverse-http/Middleware"
)

func AppConfigRouter(app *fiber.App, ctrl *controller.Controller) {
	AppConfigRouter := app.Group("/oauth")

	AppConfigRouter.Get("/", func(c *fiber.Ctx) error {
		data := make(map[string]string)
		data["data"] = "app config route is up and running"
		return c.Status(200).JSON(data)
	})

	AppConfigRouter.Post("/init", middleware.AuthUser, ctrl.AddAppConfig)

	AppConfigRouter.Get("/allConfigs", middleware.AuthUser, ctrl.GetOwnerConfigs)

	AppConfigRouter.Get("/config/:id", middleware.AuthUser, ctrl.GetAppConfig)

	AppConfigRouter.Patch("/update", middleware.AuthUser, ctrl.EditOwnerConfig)
}
