package controller

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	utils "reverse-http/Utils"
)

type OAuthUserData struct {
	Id         uuid.UUID `json:"id"`
	Provider   string    `json:"provider"`
	ProviderId string    `json:"roviderId"`
	Email      string    `json:"email"`
	FullName   string    `json:"full_name"`
	AvatarURL  string    `json:"avatar_url"`
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

func (ctrl *Controller) GoogleLoginSas(c *fiber.Ctx) error {
	callbackURL := c.Query("client_id")

	csrfToken := uuid.New().String()

	stateData := map[string]string{
		"nonce":        csrfToken,
		"callback_url": callbackURL,
	}

	if callbackURL != "" {
		fmt.Println("Received callback URL:", callbackURL)
		id, err := utils.StrToPgUUID(callbackURL)
		if err != nil {
			fmt.Println("Invalid callback URL:", callbackURL)
			return redirectWithError(c, "Invalid callback URL")
		}
		data, err := ctrl.queries.GetOauthConfigData(c.Context(), id)
		if err != nil {
			fmt.Println("data:", data)
			fmt.Println("Error fetching OAuth config data:", err)
			return redirectWithError(c, "Failed to fetch OAuth config")
		}
	} else {
		fmt.Println("No callback URL provided")
	}
	stateJSON, _ := json.Marshal(stateData)
	encodedState := base64.StdEncoding.EncodeToString(stateJSON)

	googleConfig := utils.GoogleConfig()
	url := googleConfig.AuthCodeURL(encodedState)
	return c.Redirect(url, fiber.StatusSeeOther)
}

func (ctrl *Controller) GithubLoginSas(c *fiber.Ctx) error {
	callbackURL := c.Query("client_id")

	csrfToken := uuid.New().String()

	stateData := map[string]string{
		"nonce":        csrfToken,
		"callback_url": callbackURL,
	}

	if callbackURL != "" {
		fmt.Println("Received callback URL:", callbackURL)
		id, err := utils.StrToPgUUID(callbackURL)
		if err != nil {
			fmt.Println("Invalid callback URL:", callbackURL)
			return redirectWithError(c, "Invalid callback URL")
		}
		data, err := ctrl.queries.GetOauthConfigData(c.Context(), id)
		if err != nil {
			fmt.Println("data:", data)
			fmt.Println("Error fetching OAuth config data:", err)
			return redirectWithError(c, "Failed to fetch OAuth config")
		}
	} else {
		fmt.Println("No callback URL provided")
	}

	stateJSON, _ := json.Marshal(stateData)
	encodedState := base64.StdEncoding.EncodeToString(stateJSON)
	githubConfig := utils.GithubConfig()
	url := githubConfig.AuthCodeURL(encodedState)
	fmt.Println("github login lets go rock and roll", url)
	return c.Redirect(url, fiber.StatusSeeOther)
}

func (ctrl *Controller) GoogleLoginCallbackSas(c *fiber.Ctx) error {
	fmt.Println("Received Google OAuth callback with query:",
		c.Query("state"), c.Query("code"))
	stateJSON, _ := base64.StdEncoding.DecodeString(c.Query("state"))
	var stateData map[string]string
	json.Unmarshal(stateJSON, &stateData)

	callbackURL := stateData["callback_url"]

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
		Provider:   "google",
		ProviderId: googleUser.ID,
		Email:      googleUser.Email,
		FullName:   googleUser.Name,
		AvatarURL:  googleUser.Picture,
	}

	if callbackURL != "" {

		uId, err := utils.StrToPgUUID(callbackURL)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
		}

		data, err := ctrl.queries.GetOauthConfigData(c.Context(), uId)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "invalid key"})
		}

		u, err := url.Parse(data.Endpoint)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "invalid endpoint"})
		}

		q := u.Query()

		style := utils.OauthJwt{
			Avatar:       oauthData.AvatarURL,
			ProviderId:   oauthData.ProviderId,
			Email:        oauthData.Email,
			Username:     oauthData.FullName,
			UUID:         uuid.New().String(),
			ProviderName: "google",
		}
		response, err := utils.CreateOauthToken(style, data.ClientSecret)
		if err != nil {
			fmt.Println("failed to create token", err)
			return c.Status(500).JSON(fiber.Map{"error": "failed to create token", "err": err})
		}
		q.Set("token", response)
		u.RawQuery = q.Encode()
		fmt.Println("FINAL URL:", u.String())

		return c.Redirect(u.String(), fiber.StatusTemporaryRedirect)
	}

	jwtPaylod, err := ctrl.OauthLogin(&oauthData, c)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	NewAccessToken, err := utils.CreateAccessToken(jwtPaylod)
	if err != nil {
		fmt.Println("issue while generating access token")
	}

	NewRefreshToken, err := utils.CreateRefreshToken(jwtPaylod)
	if err != nil {
		fmt.Println("issue while generating refresh token")
	}

	c.Cookie(&fiber.Cookie{
		Name:     "accessToken",
		Value:    NewAccessToken,
		HTTPOnly: true,
		Path:     "/",
		Secure:   false, // true in production env
		Expires:  time.Now().Add(15 * time.Minute),
	})

	c.Cookie(&fiber.Cookie{
		Name:     "refreshToken",
		Value:    NewRefreshToken,
		HTTPOnly: true,
		Path:     "/",
		Secure:   false,
		Expires:  time.Now().Add(7 * 24 * time.Hour),
	})

	return redirectWithUserData(c, oauthData)
}

func (ctrl *Controller) GithubLoginSasCallback(c *fiber.Ctx) error {
	fmt.Println("Received github OAuth callback with query:",
		c.Query("state"), c.Query("code"))
	stateJSON, _ := base64.StdEncoding.DecodeString(c.Query("state"))
	var stateData map[string]string
	json.Unmarshal(stateJSON, &stateData)

	callbackURL := stateData["callback_url"]

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
		Provider:   "github",
		ProviderId: fmt.Sprintf("%d", githubUser.ID),
		Email:      githubUser.Email,
		FullName: func() string {
			if githubUser.Name != "" {
				return githubUser.Name
			}
			return githubUser.Login
		}(),
		AvatarURL: githubUser.AvatarURL,
	}

	if callbackURL != "" {

		uId, err := utils.StrToPgUUID(callbackURL)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
		}

		data, err := ctrl.queries.GetOauthConfigData(c.Context(), uId)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "invalid key"})
		}

		u, err := url.Parse(data.Endpoint)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "invalid endpoint"})
		}

		q := u.Query()

		style := utils.OauthJwt{
			Avatar:       oauthData.AvatarURL,
			ProviderId:   oauthData.ProviderId,
			Email:        oauthData.Email,
			Username:     oauthData.FullName,
			UUID:         uuid.New().String(),
			ProviderName: "github",
		}
		response, err := utils.CreateOauthToken(style, data.ClientSecret)
		if err != nil {
			fmt.Println("failed to create token", err)
			return c.Status(500).JSON(fiber.Map{"error": "failed to create token", "err": err})
		}
		q.Set("token", response)
		u.RawQuery = q.Encode()
		fmt.Println("FINAL URL:", u.String())

		return c.Redirect(u.String(), fiber.StatusTemporaryRedirect)
	}

	jwtPaylod, err := ctrl.OauthLogin(&oauthData, c)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	fmt.Println("user id:", jwtPaylod)

	NewAccessToken, err := utils.CreateAccessToken(jwtPaylod)
	if err != nil {
		fmt.Println("issue while generating access token")
	}

	NewRefreshToken, err := utils.CreateRefreshToken(jwtPaylod)
	if err != nil {
		fmt.Println("issue while generating refresh token")
	}

	c.Cookie(&fiber.Cookie{
		Name:     "accessToken",
		Value:    NewAccessToken,
		HTTPOnly: true,
		Path:     "/",
		Secure:   false, // true in production env
		Expires:  time.Now().Add(15 * time.Minute),
	})

	c.Cookie(&fiber.Cookie{
		Name:     "refreshToken",
		Value:    NewRefreshToken,
		HTTPOnly: true,
		Path:     "/",
		Secure:   false,
		Expires:  time.Now().Add(7 * 24 * time.Hour),
	})

	return redirectWithUserData(c, oauthData)
}
