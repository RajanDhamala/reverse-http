package controller

import (
	"fmt"
	"time"

	"reverse-http/Utils"
	db "reverse-http/db/sqlc"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/lib/pq"
)

type RegisterUserRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (ctrl *Controller) RegisterUser(c *fiber.Ctx) error {
	req := RegisterUserRequest{}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "failed to parse body",
		})
	}

	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		fmt.Println("failed to hash password")

		return c.Status(500).JSON(fiber.Map{
			"error": "internal server error",
		})
	}
	usrid := uuid.New()
	createdUser, err := ctrl.queries.CreateUser(
		c.Context(),
		db.CreateUserParams{
			ID: pgtype.UUID{
				Bytes: usrid,
				Valid: true,
			},
			Username: req.Username,
			Email:    req.Email,
			Password: pgtype.Text{
				String: hashedPassword,
				Valid:  true,
			},
			GithubProviderID: pgtype.Text{
				Valid: false,
			},
			GoogleProviderID: pgtype.Text{
				Valid: false,
			},
			Avatar: pgtype.Text{
				Valid: false,
			},
		},
	)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			return c.Status(400).JSON(fiber.Map{
				"error": "user with this email already exists",
			})
		}

		return c.Status(500).JSON(fiber.Map{
			"error": "database error",
		})
	}

	return c.Status(201).JSON(fiber.Map{
		"message": "user created successfully",
		"data":    createdUser,
	})
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (ctrl *Controller) LoginUser(c *fiber.Ctx) error {
	loginData := LoginRequest{}

	if err := c.BodyParser(&loginData); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "failed to parse body",
		})
	}

	user, err := ctrl.queries.GetUserByEmail(
		c.Context(),
		loginData.Email,
	)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "invalid credentials",
		})
	}

	err = utils.ComaprePasswrod(
		loginData.Password,
		user.Password.String,
	)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "invalid credentials",
		})
	}

	jwtData := utils.UserJWT{
		Username: user.Username,
		Id:       user.ID.String(),
	}

	accessToken, err := utils.CreateAccessToken(&jwtData)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "failed to generate access token",
		})
	}

	refreshToken, err := utils.CreateRefreshToken(&jwtData)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "failed to generate refresh token",
		})
	}

	c.Cookie(&fiber.Cookie{
		Name:     "accessToken",
		Value:    accessToken,
		HTTPOnly: true,
		Path:     "/",
		Secure:   utils.CookieSecure(),
		SameSite: utils.CookieSameSite(),
		Domain:   utils.CookieDomain(),
		Expires:  time.Now().Add(15 * time.Minute),
	})

	c.Cookie(&fiber.Cookie{
		Name:     "refreshToken",
		Value:    refreshToken,
		HTTPOnly: true,
		Path:     "/",
		Secure:   utils.CookieSecure(),
		SameSite: utils.CookieSameSite(),
		Domain:   utils.CookieDomain(),
		Expires:  time.Now().Add(7 * 24 * time.Hour),
	})

	return c.Status(200).JSON(fiber.Map{
		"message": "login successful",
	})
}

func (ctrl *Controller) OauthLogin(oauthData *OAuthUserData, c *fiber.Ctx) (*utils.UserJWT, error) {
	Email := oauthData.Email
	Username := oauthData.FullName
	Avatar := oauthData.AvatarURL

	if oauthData.Provider == "github" {
		data, err := ctrl.queries.GetUserByEmail(c.Context(), Email)

		if err != nil {
			fmt.Println("error fetching user by email:", err)
		} else {
			fmt.Println("user fetched by email:", data)
			return &utils.UserJWT{
				Id:       data.ID.String(),
				Username: Username,
			}, nil
		}
	} else if oauthData.Provider == "google" {
		data, err := ctrl.queries.GetUserByEmail(c.Context(), Email)

		if err != nil {
			fmt.Println("error fetching user by email:", err)
		} else {
			fmt.Println("user fetched by email:", data)
			return &utils.UserJWT{
				Id:       data.ID.String(),
				Username: Username,
			}, nil
		}
	} else {
		return nil, fmt.Errorf("unsupported oauth provider")
	}
	usrid := uuid.New()
	createdUser, err := ctrl.queries.CreateUser(
		c.Context(),
		db.CreateUserParams{
			ID: pgtype.UUID{
				Bytes: usrid,
				Valid: true,
			},
			Username: Username,
			Email:    Email,
			Password: pgtype.Text{
				Valid: false,
			},
			GithubProviderID: pgtype.Text{
				Valid: false,
			},
			GoogleProviderID: pgtype.Text{
				Valid: false,
			},
			Avatar: pgtype.Text{
				String: Avatar,
				Valid:  true,
			},
		},
	)

	fmt.Println("created user:", createdUser)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			fmt.Println("user with this email already exists")
		} else {
			fmt.Println("database error:", err)
		}
	} else {
		fmt.Println("created user:", createdUser)
	}

	fmt.Println("user id:", createdUser.ID.String())

	return &utils.UserJWT{
		Id:       createdUser.ID.String(),
		Username: Username,
	}, nil
}

func (ctrl *Controller) LogoutUser(c *fiber.Ctx) error {
	fmt.Println("logout user called")

	// Clear accessToken
	c.Cookie(&fiber.Cookie{
		Name:     "accessToken",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HTTPOnly: false,
		Secure:   utils.CookieSecure(),
		SameSite: utils.CookieSameSite(),
		Domain:   utils.CookieDomain(),
		Expires:  time.Now().Add(-time.Hour), // Set to past time
	})

	// Clear refreshToken
	c.Cookie(&fiber.Cookie{
		Name:     "refreshToken",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HTTPOnly: false,
		Secure:   utils.CookieSecure(),
		SameSite: utils.CookieSameSite(),
		Domain:   utils.CookieDomain(),
		Expires:  time.Now().Add(-time.Hour), // Set to past time
	})

	return c.Status(200).JSON(fiber.Map{
		"message": "logout successfully",
	})
}

func (ctrl *Controller) GetProfile(c *fiber.Ctx) error {
	usrData := c.Locals("user").(*utils.UserJWT)

	userID, err := uuid.Parse(usrData.Id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "invalid user id",
		})
	}

	data, err := ctrl.queries.GetUserByID(
		c.Context(),
		pgtype.UUID{
			Bytes: userID,
			Valid: true,
		},
	)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{
			"error": "user not found",
		})
	}

	return c.Status(200).JSON(fiber.Map{
		"message": "profile fetched successfully",
		"data":    data,
	})
}

func (ctrl *Controller) TestRoute(c *fiber.Ctx) error {
	return c.Status(200).JSON(fiber.Map{
		"message": "user profile fetched successfully",
		"data":    "ok",
	})
}
