package controller

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"reverse-http/Utils"

	"github.com/jackc/pgx/v5/pgtype"
	db "reverse-http/db/sqlc"

	redis "github.com/redis/go-redis/v9"
)

type AppConfigReq struct {
	AppName  string          `json:"appConfig"`
	Endpoint string          `json:"endpoint"`
	Configs  json.RawMessage `json:"configs"`
}

func (ctrl *Controller) AddAppConfig(c *fiber.Ctx) error {
	req := AppConfigReq{}

	usrData := c.Locals("user").(*utils.UserJWT)

	uId, err := uuid.Parse(usrData.Id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "invalid user id",
		})
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "failed to parse body",
		})
	}

	result, err := ctrl.queries.CreateAppConfig(
		c.Context(),
		db.CreateAppConfigParams{
			ID: pgtype.UUID{
				Bytes: uuid.New(),
				Valid: true,
			},

			AppName:  req.AppName,
			Endpoint: req.Endpoint,
			Configs:  req.Configs,

			UserID: pgtype.UUID{
				Bytes: uId,
				Valid: true,
			},
		},
	)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "failed to create item",
		})
	}

	ctrl.redisClient.Del(c.Context(), "ownerConfigs:"+usrData.Id)
	return c.JSON(result)
}

func (ctrl *Controller) GetAppConfig(c *fiber.Ctx) error {
	appId, err := utils.StrToPgUUID(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "invalid id",
		})
	}

	cacheKey := "appConfig:" + appId.String()
	response, err := ctrl.redisClient.Get(c.Context(), cacheKey).Result()
	var data db.GetAppConfigByIDRow

	if err == redis.Nil {
		data, err = ctrl.queries.GetAppConfigByID(c.Context(), appId)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{
				"error": "no app config found",
			})
		}

		jsonData, _ := json.Marshal(data)
		ctrl.redisClient.Set(c.Context(), cacheKey, jsonData, 10*time.Minute)

	} else if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "redis error",
		})
	} else {

		err = json.Unmarshal([]byte(response), &data)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "failed to parse cache",
			})
		}
	}

	var responseData map[string]any

	err = json.Unmarshal(data.Configs, &responseData)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "failed to parse configs",
		})
	}

	return c.Status(200).JSON(fiber.Map{
		"id":         data.ID,
		"app_name":   data.AppName,
		"endpoint":   data.Endpoint,
		"updated_at": data.UpdatedAt,
		"config":     responseData,
	})
}

type AppResponse struct {
	ID       string         `json:"id"`
	AppName  string         `json:"app_name"`
	Endpoint string         `json:"endpoint"`
	Configs  map[string]any `json:"configs"`
}

func (ctrl *Controller) GetOwnerConfigs(c *fiber.Ctx) error {
	usrData := c.Locals("user").(*utils.UserJWT)

	uId, _ := utils.StrToPgUUID(usrData.Id)

	cacheKey := "ownerConfigs:" + uId.String()

	cachedData, err := ctrl.redisClient.Get(c.Context(), cacheKey).Result()

	var responses []AppResponse
	if err == redis.Nil {

		data, err := ctrl.queries.GetAppConfigs(c.Context(), uId)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": "no app config set",
			})
		}

		for _, app := range data {
			var config map[string]any
			err := json.Unmarshal(app.Configs, &config)
			if err != nil {
				return c.Status(500).JSON(fiber.Map{
					"error": "failed to parse configs",
				})
			}
			response := AppResponse{
				ID:       app.ID.String(),
				AppName:  app.AppName,
				Endpoint: app.Endpoint,
				Configs:  config,
			}
			responses = append(responses, response)
		}

		jsonData, err := json.Marshal(responses)
		if err == nil {
			ctrl.redisClient.Set(
				c.Context(),
				cacheKey,
				jsonData,
				time.Minute*10,
			)
		}

	} else if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"error": "redis error",
		})
	} else {

		err = json.Unmarshal([]byte(cachedData), &responses)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{
				"error": "failed to parse cached data",
			})
		}
	}

	return c.Status(200).JSON(fiber.Map{
		"message": "successfully retrieved app config",
		"data":    responses,
	})
}

type EditConfigReq struct {
	AppName  string         `json:"app_name"`
	Endpoint string         `json:"endpoint"`
	Configs  datatypes.JSON `json:"configs"`
	Id       string         `json:"id"`
}

func (ctrl *Controller) EditOwnerConfig(c *fiber.Ctx) error {
	usrData := c.Locals("user").(*utils.UserJWT)
	userId, err := utils.StrToPgUUID(usrData.Id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid user id"})
	}

	var req EditConfigReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request body"})
	}
	cfgId, err := utils.StrToPgUUID(req.Id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid config id"})
	}

	appName := pgtype.Text{}
	if req.AppName != "" {
		appName = pgtype.Text{String: req.AppName, Valid: true}
	}

	endpoint := pgtype.Text{}
	if req.Endpoint != "" {
		endpoint = pgtype.Text{String: req.Endpoint, Valid: true}
	}

	var configs []byte
	if req.Configs != nil {
		configs = req.Configs
	}

	_, err = ctrl.queries.UpdateAppConfig(c.Context(), db.UpdateAppConfigParams{
		ID:       cfgId,
		UserID:   userId,
		AppName:  appName.String,
		Endpoint: endpoint.String,
		Configs:  configs,
	})
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "failed to update config"})
	}

	cacheKey := "ownerConfigs:" + usrData.Id
	nextkey := "appConfig:" + usrData.Id

	errs := ctrl.redisClient.Del(c.Context(), cacheKey, nextkey).Err()
	if errs != nil {
		fmt.Printf("failed to delete cache: %v\n", err)
	}

	return c.Status(200).JSON(fiber.Map{"message": "successfully updated app config"})
}

func (ctrl *Controller) DeleteAppConfig(c *fiber.Ctx) error {
	usrData := c.Locals("user").(*utils.UserJWT)
	userId, err := utils.StrToPgUUID(usrData.Id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid user id"})
	}

	cfgId, err := utils.StrToPgUUID(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid config id"})
	}

	errs := ctrl.queries.DeleteOauthConfig(c.Context(), db.DeleteOauthConfigParams{
		ID:     cfgId,
		UserID: userId,
	})
	if errs != nil {
		return c.Status(400).JSON(fiber.Map{"error": "failed to delete config"})
	}
	cacheKey := "ownerConfigs:" + cfgId.String()
	nextkey := "appConfig:" + cfgId.String()

	erres := ctrl.redisClient.Del(c.Context(), cacheKey, nextkey).Err()
	if erres != nil {
		fmt.Printf("failed to delete cache: %v\n", err)
	}

	return c.Status(200).JSON(fiber.Map{"message": "successfully deleted app config"})
}
