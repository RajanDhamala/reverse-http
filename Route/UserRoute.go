package route

import (
	"github.com/gofiber/fiber/v2"

	"reverse-http/Controller"
	"reverse-http/Middleware"
)

func UserRouter(app *fiber.App, ctrl *controller.Controller) {
	UserRouter := app.Group("/user")

	UserRouter.Get("/", ctrl.TestRoute)

	UserRouter.Post("/register", ctrl.RegisterUser)
	UserRouter.Post("/login", ctrl.LoginUser)
	UserRouter.Get("/profile", middleware.AuthUser, ctrl.GetProfile)
	UserRouter.Get("/logout", middleware.AuthUser, ctrl.LogoutUser)
	UserRouter.Get("/me", middleware.AuthMe)
}
