package controller

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	// "github.com/gofiber/fiber/v2/middleware/proxy"
	"github.com/google/uuid"
	"reverse-http/Utils"
	"reverse-http/db/sqlc"

	"github.com/jackc/pgx/v5/pgtype"
)

type ReverseHttpReq struct {
	Name         string `json:"name"`
	Endpoint     string `json:"endpoint"`
	ClientSecret string `json:"client_secret"`
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

	payload, err := ctrl.queries.CreteOauthConfig(c.Context(), db.CreteOauthConfigParams{
		ID: pgtype.UUID{
			Bytes: paramId,
			Valid: true,
		},
		Key:          data.Name,
		Endpoint:     data.Endpoint,
		UserID:       userId,
		ClientSecret: data.ClientSecret,
	})
	if err != nil {
		fmt.Println("error while calling db", err)
		return c.Status(500).JSON(fiber.Map{
			"error": "failed to create the endpoint",
			"err":   err,
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
	// return proxy.Do(c, data.Endpoint)
	return c.Redirect(data.Endpoint, fiber.StatusTemporaryRedirect)
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

func (ctrl *Controller) OauthCallbackSash(c *fiber.Ctx) error {
	return c.Status(200).JSON(fiber.Map{
		"message": "oauth callback hit",
	})
}

func (ctrl *Controller) GetConfigSecret(c *fiber.Ctx) error {
	appId, err := utils.StrToPgUUID(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	usrData := c.Locals("user").(*utils.UserJWT)

	usrId, err := utils.StrToPgUUID(usrData.Id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid user id"})
	}

	data, err := ctrl.queries.GetOauthClientSecret(c.Context(), db.GetOauthClientSecretParams{
		ID:     appId,
		UserID: usrId,
	})
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "failed to fetch the client secret"})
	}

	return c.Status(200).JSON(fiber.Map{
		"message": "get config secret hit",
		"data":    data,
	})
}

func (ctrl *Controller) DeleteOauthConfig(c *fiber.Ctx) error {
	configID, err := utils.StrToPgUUID(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid id"})
	}

	usrData := c.Locals("user").(*utils.UserJWT)

	usrId, err := utils.StrToPgUUID(usrData.Id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid user id"})
	}

	errs := ctrl.queries.DeleteOauthConfig(c.Context(), db.DeleteOauthConfigParams{
		ID:     configID,
		UserID: usrId,
	})

	if errs != nil {
		return c.Status(400).JSON(fiber.Map{
			"message": "failed to delete oauth config",
		})
	}

	return c.Status(200).JSON(fiber.Map{
		"message": "successfully deleted oauth config",
	})
}
