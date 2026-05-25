package controller

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	redis "github.com/redis/go-redis/v9"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"reverse-http/Utils"

	"github.com/jackc/pgx/v5/pgtype"
	db "reverse-http/db/sqlc"
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

	redisKey := "ownerConfig:" + uId.String()
	ctrl.redisClient.Del(c.Context(), redisKey)
	return c.JSON(result)
}

type AppConfigResponse struct {
	ID        string         `json:"id"`
	AppName   string         `json:"app_name"`
	Endpoint  string         `json:"endpoint"`
	UpdatedAt time.Time      `json:"updated_at"`
	Config    map[string]any `json:"config"`
}

func (ctrl *Controller) GetAppConfig(c *fiber.Ctx) error {
	appId, err := utils.StrToPgUUID(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	var realdata AppConfigResponse
	redisKey := "AppConfig:" + appId.String()

	response, rediserr := ctrl.redisClient.Get(c.Context(), redisKey).Result()

	if rediserr == redis.Nil {
		fmt.Println("cache miss")

		result, err, shared := ctrl.sfGroup.Do(redisKey, func() (interface{}, error) {
			data, err := ctrl.queries.GetAppConfigByID(context.Background(), appId)
			if err != nil {
				return nil, err
			}

			var configs map[string]any
			if err = json.Unmarshal(data.Configs, &configs); err != nil {
				return nil, err
			}

			res := AppConfigResponse{
				ID:        data.ID.String(),
				AppName:   data.AppName,
				Endpoint:  data.Endpoint,
				UpdatedAt: data.UpdatedAt.Time,
				Config:    configs,
			}

			marshalled, _ := json.Marshal(res)
			ctrl.redisClient.Set(context.Background(), redisKey, marshalled, 10*time.Minute)

			return res, nil
		})

		fmt.Println("shared:", shared)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "no appConfig found"})
		}
		realdata = result.(AppConfigResponse)

	} else if rediserr != nil {
		fmt.Println("err during call timeout etc")
	} else {
		fmt.Println("cache hit")
		json.Unmarshal([]byte(response), &realdata)
	}

	return c.Status(200).JSON(fiber.Map{
		"data":    realdata,
		"message": "successfully fetched data from db",
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

	var responses []AppResponse
	redisKey := "ownerConfig:" + uId.String()
	response, errs := ctrl.redisClient.Get(c.Context(), redisKey).Result()

	if errs == redis.Nil {
		fmt.Println("cache miss")
		data, err := ctrl.queries.GetAppConfigs(c.Context(), uId)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "no app config set"})
		}
		for _, d := range data {
			var configs map[string]any
			json.Unmarshal(d.Configs, &configs)
			responses = append(responses, AppResponse{
				ID:       d.ID.String(),
				AppName:  d.AppName,
				Endpoint: d.Endpoint,
				Configs:  configs,
			})
		}
		marshalled, err := json.Marshal(responses)
		if err == nil {
			ctrl.redisClient.Set(c.Context(), redisKey, marshalled, 10*time.Minute)
		}

	} else if errs != nil {
		fmt.Println("timeout etc stuff")
	} else {
		fmt.Println("cache hit")
		json.Unmarshal([]byte(response), &responses)
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

	redisKey := "AppConfig:" + cfgId.String()
	ownKey := "ownerConfig:" + userId.String()
	ctrl.redisClient.Del(c.Context(), redisKey, ownKey).Err()
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

	errs := ctrl.queries.DeleteAppConfig(c.Context(), db.DeleteAppConfigParams{
		ID:     cfgId,
		UserID: userId,
	})
	if errs != nil {
		return c.Status(400).JSON(fiber.Map{"error": "failed to delete config"})
	}
	redisKey := "AppConfig:" + cfgId.String()
	ownKey := "ownerConfig:" + userId.String()
	ctrl.redisClient.Del(c.Context(), redisKey, ownKey).Err()

	return c.Status(200).JSON(fiber.Map{"message": "successfully deleted app config"})
}
