package controller

import (
	"encoding/json"

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

	return c.JSON(result)
}

func (ctrl *Controller) GetAppConfig(c *fiber.Ctx) error {
	appId, err := utils.StrToPgUUID(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	data, err := ctrl.queries.GetAppConfigByID(c.Context(), appId)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "no appConfig found"})
	}

	var reponseData map[string]any

	err = json.Unmarshal(data.Configs, &reponseData)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "failed to parse configs"})
	}

	return c.Status(200).JSON(fiber.Map{
		"id":         data.ID,
		"app_name":   data.AppName,
		"endpoint":   data.Endpoint,
		"updated_at": data.UpdatedAt,
		"config":     reponseData,
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

	data, err := ctrl.queries.GetAppConfigs(c.Context(), uId)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "no app config set",
		})
	}

	var responses []AppResponse

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

	return c.Status(200).JSON(fiber.Map{
		"message": "succfully retrived app config",
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

	return c.Status(200).JSON(fiber.Map{"message": "successfully deleted app config"})
}
