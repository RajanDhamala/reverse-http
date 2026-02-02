package controller

import (
	"context"
	"fmt"
	"io"
	"net/http"

	"github.com/gofiber/fiber/v2"

	"reverse-http/Utils"
)

func GithubLogin(c *fiber.Ctx) error {
	url := utils.AppConfig.GitHubLoginConfig.AuthCodeURL("randomstate")

	c.Status(fiber.StatusSeeOther)
	c.Redirect(url)
	return c.JSON(url)
}

func GithubCallback(c *fiber.Ctx) error {
	state := c.Query("state")
	if state != "randomstate" {
		return c.SendString("States don't Match!!")
	}

	code := c.Query("code")

	githubcon := utils.GithubConfig()
	fmt.Println(code)

	token, err := githubcon.Exchange(context.Background(), code)
	if err != nil {
		return c.SendString("Code-Token Exchange Failed")
	}
	fmt.Println(token)

	resp, err := http.Get("https://api.github.com/user/repo?access_token=" + token.AccessToken)
	// resp, err := http.Get('Authorization: token my_access_token' https://api.github.com/user/repos)
	if err != nil {
		return c.SendString("User Data Fetch Failed")
	}
	fmt.Println(resp)

	userData, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.SendString("JSON Parsing Failed")
	}
	fmt.Println(userData)

	return c.SendString(string(userData))
}
