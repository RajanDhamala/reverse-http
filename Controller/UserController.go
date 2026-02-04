package controller

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"reverse-http/Configs"
	"reverse-http/Models"
	"reverse-http/Utils"
)

type RegisterUserRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func RegisterUser(c *fiber.Ctx) error {
	data := RegisterUserRequest{}

	if err := c.BodyParser(&data); err != nil {
		c.Status(400).JSON(fiber.Map{
			"error": "failed to parse body",
		})
	}
	HashedPassword, err := utils.HashPassword(data.Password)
	if err != nil {
		fmt.Println("failed to hashedPassword")
		return c.Status(500).JSON(fiber.Map{"message": "internal server error"})
	}

	user := models.User{
		Id:       uuid.New(),
		Email:    data.Email,
		Password: HashedPassword,
		Username: data.Username,
	}

	errs := db.DB.Create(&user).Error
	if errs != nil {
		if pqErr, ok := errs.(*pq.Error); ok && pqErr.Code == "23505" {
			return c.Status(400).JSON(fiber.Map{"error": "User with this email already exists"})
		}
		return c.Status(500).JSON(fiber.Map{"error": "Database error"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "user created successfully",
		"data":    user,
	})
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func LoginUser(c *fiber.Ctx) error {
	loginData := LoginRequest{}

	if err := c.BodyParser(&loginData); err != nil {
		fmt.Println("failed to parse the body")
		return c.Status(500).JSON(fiber.Map{"error": "failed to parse body"})
	}

	user := models.User{}
	if error := db.DB.Where("email=?", loginData.Email).Select("password username").Find(&user).Error; error != nil {
		fmt.Println("user not found in db")
		return c.Status(500).JSON(fiber.Map{"error": "invalid credentials"})
	}

	err := utils.ComaprePasswrod(user.Password, loginData.Password)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "invalid credentials",
		})
	}

	data := utils.UserJWT{
		Username: user.Username,
		Id:       user.Id.String(),
	}

	NewAccessToken, err := utils.CreateAccessToken(&data)
	if err != nil {
		fmt.Println("issue while generating access token")
	}

	NewRefreshToken, err := utils.CreateRefreshToken(&data)
	if err != nil {
		fmt.Println("issue while generating refresh token")
	}

	c.Cookie(&fiber.Cookie{
		Name:     "accessToken",
		Value:    NewAccessToken,
		HTTPOnly: false,
		Path:     "/",
		Secure:   false, // true in production env
		Expires:  time.Now().Add(15 * time.Minute),
	})

	c.Cookie(&fiber.Cookie{
		Name:     "refreshToken",
		Value:    NewRefreshToken,
		HTTPOnly: false,
		Path:     "/",
		Secure:   false,
		Expires:  time.Now().Add(7 * 24 * time.Hour),
	})

	return c.Status(200).JSON(fiber.Map{
		"message": "server is working btw",
		"route":   c.Path(),
	})
}

func OauthLogin(oauthData *OAuthUserData) (*utils.UserJWT, error) {
	var user models.User
	var whereQuery string
	var whereArgs []any

	user.Email = oauthData.Email
	user.Username = oauthData.FullName
	user.Avatar = oauthData.AvatarURL

	if oauthData.Provider == "github" {
		user.GithubProviderId = oauthData.ProviderId
		whereQuery = "email = ? AND github_provider_id = ?"
		whereArgs = []any{oauthData.Email, oauthData.ProviderId}
	} else if oauthData.Provider == "google" {
		user.GoogleProviderId = oauthData.ProviderId
		whereQuery = "email = ? AND google_provider_id = ?"
		whereArgs = []any{oauthData.Email, oauthData.ProviderId}
	} else {
		return nil, fmt.Errorf("unsupported oauth provider")
	}

	err := db.DB.
		Where(whereQuery, whereArgs...).
		First(&user).Error

	if err == nil {
		return &utils.UserJWT{
			Id:       user.Id.String(),
			Username: user.Username,
		}, nil
	}

	user.Id = uuid.New()

	if err := db.DB.Create(&user).Error; err != nil {
		return nil, err
	}

	return &utils.UserJWT{
		Id:       user.Id.String(),
		Username: user.Username,
	}, nil
}

func LogoutUser(c *fiber.Ctx) error {
	fmt.Println("logout user called")

	// Clear accessToken
	c.Cookie(&fiber.Cookie{
		Name:     "accessToken",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HTTPOnly: false,
		Secure:   false,
		Expires:  time.Now().Add(-time.Hour), // Set to past time
	})

	// Clear refreshToken
	c.Cookie(&fiber.Cookie{
		Name:     "refreshToken",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HTTPOnly: false,
		Secure:   false,
		Expires:  time.Now().Add(-time.Hour), // Set to past time
	})

	return c.Status(200).JSON(fiber.Map{
		"message": "logout successfully",
	})
}

func GetProfile(c *fiber.Ctx) error {
	usrData := c.Locals("user").(*utils.UserJWT)
	fmt.Println("user data got:", usrData.Id)

	fmt.Println("user data got:", usrData.Username)

	return c.Status(200).JSON(fiber.Map{
		"message": "server is working btw",
	})
}
