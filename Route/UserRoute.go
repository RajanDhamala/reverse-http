package route

import (
	"time"

	"github.com/gofiber/fiber/v2"

	"reverse-http/Controller"
	"reverse-http/Middleware"

	"github.com/gofiber/fiber/v2/middleware/limiter"
)

func UserRouter(app *fiber.App, ctrl *controller.Controller) {
	UserRouter := app.Group("/user")

	authLimit := limiter.New(limiter.Config{
		Max:        10,
		Expiration: 10 * time.Minute,
	})

	normalLimit := limiter.New(limiter.Config{
		Max:        60,
		Expiration: 10 * time.Minute,
	})

	UserRouter.Get("/", normalLimit, ctrl.TestRoute)

	UserRouter.Post("/register", authLimit, ctrl.RegisterUser)
	UserRouter.Post("/login", authLimit, ctrl.LoginUser)
	UserRouter.Get("/profile", normalLimit, middleware.AuthUser, ctrl.GetProfile)
	UserRouter.Get("/logout", authLimit, middleware.AuthUser, ctrl.LogoutUser)
	UserRouter.Get("/me", normalLimit, middleware.AuthMe)
}
