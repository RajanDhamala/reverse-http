package middleware

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"reverse-http/Utils"
)

func AuthMe(c *fiber.Ctx) error {
	accessToken := c.Cookies("accessToken")
	if accessToken != "" {
		fmt.Println("Found access token:", accessToken)
		data, err := utils.VerifyAccessToken(accessToken)
		if err == nil {
			fmt.Println("Access token valid for user:", data)
			return c.Status(200).JSON(fiber.Map{
				"message": "Access token valid",
				"user":    data,
			})
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
				Secure:   utils.CookieSecure(),
				SameSite: utils.CookieSameSite(),
				Domain:   utils.CookieDomain(),
				Expires:  time.Now().Add(15 * time.Minute),
			})

			return c.Status(200).JSON(fiber.Map{
				"message": "Refresh token valid, new access token issued",
				"user":    data,
			})
		}
	}

	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
		"error": "invalid access and refresh token",
	})
}
