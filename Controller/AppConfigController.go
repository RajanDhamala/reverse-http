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

	usrData := c.Locals("user").(*utils.UserJWT)
	userId, err := utils.StrToPgUUID(usrData.Id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid user id"})
	}

	data, err := ctrl.queries.GetAppConfigByID(c.Context(), db.GetAppConfigByIDParams{
		ID:     appId,
		UserID: userId,
	})
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "no appConfig found"})
	}

	return c.Status(200).JSON(fiber.Map{"data": data})
}

func (ctrl *Controller) GetOwnerConfigs(c *fiber.Ctx) error {
	usrData := c.Locals("user").(*utils.UserJWT)

	uId, _ := utils.StrToPgUUID(usrData.Id)

	data, err := ctrl.queries.GetAppConfigs(c.Context(), uId)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "no app config set ",
		})
	}

	return c.Status(200).JSON(fiber.Map{
		"message": "succfully retrived app config",
		"data":    data,
	})
}

type EditConfigReq struct {
	AppName  string         `json:"app_name"`
	Endpoint string         `json:"endpoint"`
	Configs  datatypes.JSON `json:"configs"`
}

func (ctrl *Controller) EditOwnerConfig(c *fiber.Ctx) error {
	usrData := c.Locals("user").(*utils.UserJWT)
	userId, err := utils.StrToPgUUID(usrData.Id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid user id"})
	}

	cfgId, err := utils.StrToPgUUID(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid config id"})
	}

	var req EditConfigReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request body"})
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
