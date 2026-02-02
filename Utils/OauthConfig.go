package utils

import (
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
	RedirectURL := "http://localhost:3000/oauth/google/callback"
	GoogleClientId := os.Getenv("GOOGLE_CLIENT_ID")
	GoogleClientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")

	AppConfig.GoogleLoginConfig = oauth2.Config{
		RedirectURL:  RedirectURL,
		ClientID:     GoogleClientId,
		ClientSecret: GoogleClientSecret,
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
		},
		Endpoint: google.Endpoint,
	}

	return AppConfig.GoogleLoginConfig
}

func GithubConfig() oauth2.Config {
	RedirectURL := "http://localhost:3000/oauth/github/callback"
	GithubClientId := os.Getenv("GITHUB_CLIENT_ID")
	GithubClientSecret := os.Getenv("GITHUB_CLIENT_SECRET")

	AppConfig.GitHubLoginConfig = oauth2.Config{
		RedirectURL: RedirectURL,
		ClientID:    GithubClientId,
		// RedirectURL: fmt.Sprintf(
		//	"https://github.com/login/oauth/authorize?scope=user:repo&client_id=%s&redirect_uri=%s", os.Getenv("GITHUB_CLIENT_ID"), "http://localhost:8080/github_callback"),
		ClientSecret: GithubClientSecret,
		Scopes:       []string{"user", "repo"},
		Endpoint:     github.Endpoint,
	}

	return AppConfig.GitHubLoginConfig
}
