package middleware

import (
	"time"

	"reverse-http/Utils"

	"github.com/gofiber/fiber/v2"
)

func AuthUser(c *fiber.Ctx) error {
	accessToken := c.Cookies("accessToken")
	if accessToken != "" {
		data, err := utils.VerifyAccessToken(accessToken)
		if err == nil {
			c.Locals("user", data)
			return c.Next()
		}
	}

	refreshToken := c.Cookies("refreshToken")
	if refreshToken != "" {
		data, err := utils.VerifyRefreshToken(refreshToken)
		if err == nil {
			usrJwt := utils.UserJWT{
				Username: data.Username,
				Id:       data.Id,
			}
			NewAccessToken, err := utils.CreateAccessToken(&usrJwt)
			if err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "failed to generate new access token",
				})
			}

			c.Cookie(&fiber.Cookie{
				Name:     "accessToken",
				Value:    NewAccessToken,
				HTTPOnly: true,
				Secure:   false, // true in production env
				Expires:  time.Now().Add(15 * time.Minute),
			})

			c.Locals("user", data)
			return c.Next()
		}
	}

	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
		"error": "invalid access and refresh token",
	})
}
