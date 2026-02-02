package route

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"reverse-http/Controller"

	"reverse-http/Middleware"
)

func UserRouter(app *fiber.App) {
	UserRouter := app.Group("/user")

	UserRouter.Get("/", func(c *fiber.Ctx) error {
		fmt.Println("some one called user route")
		return c.Status(200).JSON(map[string]any{
			"message": "user route is up and running",
			"age":     5,
		})
	})

	UserRouter.Post("/register", controller.RegisterUser)

	UserRouter.Get("/login", controller.LoginUser)

	UserRouter.Get("/logout", controller.LogoutUser)

	UserRouter.Get("/profile", middleware.AuthUser, controller.GetProfile)
}
