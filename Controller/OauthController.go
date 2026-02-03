package controller

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"github.com/gofiber/fiber/v2"

	utils "reverse-http/Utils"
)

type OAuthUserData struct {
	Provider  string `json:"provider"`
	ID        string `json:"id"`
	Email     string `json:"email"`
	FullName  string `json:"full_name"`
	AvatarURL string `json:"avatar_url"`
}

type GitHubUser struct {
	ID        int    `json:"id"`
	Login     string `json:"login"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatar_url"`
}

type GoogleUser struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
	VerifiedEmail bool   `json:"verified_email"`
}

func GithubLogin(c *fiber.Ctx) error {
	githubConfig := utils.GithubConfig()
	url := githubConfig.AuthCodeURL("randomstate")
	fmt.Println("authurl:", url)
	return c.Redirect(url, fiber.StatusSeeOther)
}

func GithubCallback(c *fiber.Ctx) error {
	state := c.Query("state")
	if state != "randomstate" {
		return redirectWithError(c, "States don't match")
	}

	code := c.Query("code")
	if code == "" {
		return redirectWithError(c, "No code provided")
	}

	githubcon := utils.GithubConfig()
	token, err := githubcon.Exchange(context.Background(), code)
	if err != nil {
		return redirectWithError(c, "Code-Token Exchange Failed")
	}

	req, _ := http.NewRequest("GET", "https://api.github.com/user", nil)
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return redirectWithError(c, "User Data Fetch Failed")
	}
	defer resp.Body.Close()

	userData, err := io.ReadAll(resp.Body)
	if err != nil {
		return redirectWithError(c, "JSON Parsing Failed")
	}

	var githubUser GitHubUser
	if err := json.Unmarshal(userData, &githubUser); err != nil {
		return redirectWithError(c, "Failed to parse GitHub user data")
	}

	if githubUser.Email == "" {
		emailReq, _ := http.NewRequest("GET", "https://api.github.com/user/emails", nil)
		emailReq.Header.Set("Authorization", "Bearer "+token.AccessToken)
		emailReq.Header.Set("Accept", "application/vnd.github.v3+json")

		emailResp, err := http.DefaultClient.Do(emailReq)
		if err == nil {
			defer emailResp.Body.Close()
			var emails []struct {
				Email   string `json:"email"`
				Primary bool   `json:"primary"`
			}
			emailData, _ := io.ReadAll(emailResp.Body)
			json.Unmarshal(emailData, &emails)
			for _, e := range emails {
				if e.Primary {
					githubUser.Email = e.Email
					break
				}
			}
		}
	}

	oauthData := OAuthUserData{
		Provider:  "github",
		ID:        fmt.Sprintf("%d", githubUser.ID),
		Email:     githubUser.Email,
		FullName:  githubUser.Name,
		AvatarURL: githubUser.AvatarURL,
	}

	return redirectWithUserData(c, oauthData)
}

func GoogleLogin(c *fiber.Ctx) error {
	googleConfig := utils.GoogleConfig()
	url := googleConfig.AuthCodeURL("randomstate")
	return c.Redirect(url, fiber.StatusSeeOther)
}

func GoogleCallback(c *fiber.Ctx) error {
	state := c.Query("state")
	if state != "randomstate" {
		return redirectWithError(c, "States don't match")
	}

	code := c.Query("code")
	if code == "" {
		return redirectWithError(c, "No code provided")
	}

	googleConfig := utils.GoogleConfig()
	token, err := googleConfig.Exchange(context.Background(), code)
	if err != nil {
		return redirectWithError(c, "Code-token exchange failed")
	}

	req, _ := http.NewRequest("GET", "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return redirectWithError(c, "Failed to fetch user data")
	}
	defer resp.Body.Close()

	userData, err := io.ReadAll(resp.Body)
	if err != nil {
		return redirectWithError(c, "Failed to read user data")
	}

	var googleUser GoogleUser
	if err := json.Unmarshal(userData, &googleUser); err != nil {
		return redirectWithError(c, "Failed to parse Google user data")
	}

	oauthData := OAuthUserData{
		Provider:  "google",
		ID:        googleUser.ID,
		Email:     googleUser.Email,
		FullName:  googleUser.Name,
		AvatarURL: googleUser.Picture,
	}

	return redirectWithUserData(c, oauthData)
}

func redirectWithUserData(c *fiber.Ctx, data OAuthUserData) error {
	jsonData, _ := json.Marshal(data)
	encodedData := url.QueryEscape(string(jsonData))
	redirectURL := fmt.Sprintf("http://localhost:5173/oauth/callback?data=%s", encodedData)
	return c.Redirect(redirectURL, fiber.StatusSeeOther)
}

func redirectWithError(c *fiber.Ctx, errMsg string) error {
	encodedError := url.QueryEscape(errMsg)
	redirectURL := fmt.Sprintf("http://localhost:5173/oauth/callback?error=%s", encodedError)
	return c.Redirect(redirectURL, fiber.StatusSeeOther)
}
