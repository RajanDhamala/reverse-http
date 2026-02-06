package utils

import (
	"fmt"
	"log"
	"os"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/github"
	"golang.org/x/oauth2/google"
)

type Config struct {
	GoogleLoginConfig oauth2.Config
	GitHubLoginConfig oauth2.Config
}

var AppConfig Config

func GoogleConfig() oauth2.Config {
	clientId := os.Getenv("GOOGLE_CLIENT_ID")
	clientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	redirectURL := os.Getenv("GOOGLE_REDIRECT_URI")

	if redirectURL == "" {
		redirectURL = "http://localhost:3000/oauth/google/callback"
	}

	if clientId == "" || clientSecret == "" {
		log.Println("Warning: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set")
	}

	AppConfig.GoogleLoginConfig = oauth2.Config{
		RedirectURL:  redirectURL,
		ClientID:     clientId,
		ClientSecret: clientSecret,
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
		},
		Endpoint: google.Endpoint,
	}

	return AppConfig.GoogleLoginConfig
}

func GithubConfig() oauth2.Config {
	clientId := os.Getenv("GITHUB_CLIENT_ID")
	clientSecret := os.Getenv("GITHUB_CLIENT_SECRET")
	redirectURL := os.Getenv("GITHUB_REDIRECT_URI")

	fmt.Println("redirectURL:", redirectURL)

	if redirectURL == "" {
		redirectURL = "http://192.168.18.26:3000/oauth/github/callback"
	}

	if clientId == "" || clientSecret == "" {
		log.Println("Warning: GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET not set")
	}

	AppConfig.GitHubLoginConfig = oauth2.Config{
		RedirectURL:  redirectURL,
		ClientID:     clientId,
		ClientSecret: clientSecret,
		Scopes:       []string{"user:email", "read:user"},
		Endpoint:     github.Endpoint,
	}

	return AppConfig.GitHubLoginConfig
}
