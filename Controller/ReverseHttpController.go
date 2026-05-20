package controller

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/proxy"
	"github.com/google/uuid"
	"reverse-http/Utils"
	"reverse-http/db/sqlc"

	"github.com/jackc/pgx/v5/pgtype"
)

type ReverseHttpReq struct {
	Name     string `json:"name"`
	Endpoint string `json:"endpoint"`
}

type UpdateConfigReq struct {
	Id       uuid.UUID `json:"id"`
	Key      string    `json:"key"`
	Endpoint string    `json:"endpoint"`
}

func (ctrl *Controller) CreateReverseRoute(c *fiber.Ctx) error {
	data := ReverseHttpReq{}

	if err := c.BodyParser(&data); err != nil {
		fmt.Println("error while parsing body")
		return c.Status(500).JSON(fiber.Map{
			"error": "failed to pasrse the body",
		})
	}

	paramId := uuid.New()

	usrData := c.Locals("user").(*utils.UserJWT)
	userId, err := utils.StrToPgUUID(usrData.Id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid user id"})
	}

	_, errs := ctrl.queries.ChekidConfigExist(c.Context(), db.ChekidConfigExistParams{
		Key:    data.Name,
		UserID: userId,
	})

	if errs == nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "key already exist for u",
		})
	}

	payload, err := ctrl.queries.CreateAppConfig(c.Context(), db.CreateAppConfigParams{
		ID: pgtype.UUID{
			Bytes: paramId,
			Valid: true,
		},
		Endpoint: data.Name,
		AppName:  data.Name,
		UserID:   userId,
	})
	if err != nil {
		fmt.Println("error while calling db", err)
		return c.Status(500).JSON(fiber.Map{
			"error":    "failed to create the endpoint",
	{
    "appname": "test",
    "endpoint": "10",
    "err": {
        "Severity": "ERROR",
        "SeverityUnlocalized": "ERROR",
        "Code": "23502",
        "Message": "null value in column \"configs\" of relation \"app_configs\" violates not-null constraint",
        "Detail": "Failing row contains (64e059aa-2ff6-4ea8-96af-f33f8ef02e98, test, test, null, 84103caf-f4ac-4522-95be-14a4902d360b, 2026-05-20 15:55:43.751242+00, 2026-05-20 15:55:43.751242+00).",
        "Hint": "",
        "Position": 0,
        "InternalPosition": 0,
        "InternalQuery": "",
        "Where": "",
        "SchemaName": "public",
        "TableName": "app_configs",
        "ColumnName": "configs",
        "DataTypeName": "",
        "ConstraintName": "",
        "File": "execMain.c",
        "Line": 2067,
        "Routine": "ExecConstraints"
    },
    "error": "failed to create the endpoint",
    "id": "64e059aa-2ff6-4ea8-96af-f33f8ef02e98",
    "userid": "84103caf-f4ac-4522-95be-14a4902d360b"
}		"err":      err,
			"id":       paramId,
			"endpoint": data.Endpoint,
			"appname":  data.Name,
			"userid":   userId,
		})
	}

	return c.Status(200).JSON(fiber.Map{
		"message": "endpoint created succesfully",
		"data":    payload,
	})
}

func (ctrl *Controller) RedirectRequest(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(400).JSON(fiber.Map{"error": "include routeId"})
	}

	uId, err := utils.StrToPgUUID(id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	data, err := ctrl.queries.GetOauthConfigData(c.Context(), uId)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "invalid key"})
	}
	return proxy.Do(c, data.Endpoint)
}

func (ctrl *Controller) GetRedirectList(c *fiber.Ctx) error {
	usrData := c.Locals("user").(*utils.UserJWT)
	userId, err := utils.StrToPgUUID(usrData.Id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "invalid user id",
		})
	}

	type OauthConfigLite struct {
		Id       uuid.UUID
		Key      string
		Endpoint string
	}

	data, errr := ctrl.queries.GetOauthList(c.Context(), userId)

	if errr != nil {
		fmt.Println("error while calling db")
		return c.Status(400).JSON(fiber.Map{
			"error": "no reverse endpoint set",
		})
	}

	return c.Status(200).JSON(fiber.Map{
		"data":    data,
		"message": "succesfully fetched reverse-http list",
	})
}

func (ctrl *Controller) UpdateConfig(c *fiber.Ctx) error {
	usrData := c.Locals("user").(*utils.UserJWT)

	var req UpdateConfigReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "failed to parse the body"})
	}

	userId, err := utils.StrToPgUUID(usrData.Id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid user id"})
	}

	cfgId := pgtype.UUID{Bytes: req.Id, Valid: true}

	_, err = ctrl.queries.UpdateOauthConfig(c.Context(), db.UpdateOauthConfigParams{
		ID:       cfgId,
		UserID:   userId,
		Endpoint: req.Endpoint,
		Key:      req.Key,
	})
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "failed to update config"})
	}

	return c.Status(200).JSON(fiber.Map{"message": "successfully updated the config"})
}
