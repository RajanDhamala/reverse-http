package controller

import (
	"encoding/json"
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"reverse-http/Configs"
	"reverse-http/Models"
	"reverse-http/Utils"
)

type AppConfigReq struct {
	AppName  string          `json:"appConfig"`
	Endpoint string          `json:"endpoint"`
	Configs  json.RawMessage `json:"configs"`
}

func AddAppConfig(c *fiber.Ctx) error {
	usrData := c.Locals("user").(*utils.UserJWT)

	uId, err := uuid.Parse(usrData.Id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "invalid user id",
		})
	}

	data := AppConfigReq{}
	if err := c.BodyParser(&data); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "failed to parse the body",
		})
	}
	dbModel := models.AppConfig{
		Id:       uuid.New(),
		AppName:  data.AppName,
		Endpoint: data.Endpoint,
		Configs:  datatypes.JSON(data.Configs),
		UserId:   uId,
	}

	error := db.DB.Create(&dbModel).Error

	if error != nil {
		fmt.Println("failed to create item")
		return c.Status(400).JSON(fiber.Map{
			"error": "failed to create item",
		})
	}

	return c.Status(200).JSON(fiber.Map{
		"message": "succfully added app config",
	})
}

func GetAppConfig(c *fiber.Ctx) error {
	appId := c.Params("id")
	if appId == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "invalid id",
		})
	}

	appData := models.AppConfig{}
	err := db.DB.Where("id=?", appId).First(&appData).Error
	if err != nil {
		fmt.Println("no reocord found")
		return c.Status(400).JSON(fiber.Map{
			"error": "no appConfig found",
		})
	}

	return c.Status(200).JSON(fiber.Map{
		"message": "succfully added app config",
		"data":    appData,
	})
}

func GetOwnerConfigs(c *fiber.Ctx) error {
	usrData := c.Locals("user").(*utils.UserJWT)

	uId, err := uuid.Parse(usrData.Id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "invalid user id",
		})
	}

	itemData := []models.AppConfig{}
	errse := db.DB.Where("user_id=?", uId).Find(&itemData).Error
	if errse != nil {
		fmt.Println("user record not found")
		return c.Status(400).JSON(fiber.Map{
			"error": "no app config set ",
		})
	}

	return c.Status(200).JSON(fiber.Map{
		"message": "succfully added app config",
		"data":    itemData,
	})
}

type EditConfigReq struct {
	AppName  string         `json:"app_name"`
	Endpoint string         `json:"endpoint"`
	Configs  datatypes.JSON `json:"configs"`
}

func EditOwnerConfig(c *fiber.Ctx) error {
	usrData := c.Locals("user").(*utils.UserJWT)

	uId, err := uuid.Parse(usrData.Id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "invalid user id",
		})
	}

	configId := c.Params("id")
	cfgId, err := uuid.Parse(configId)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "invalid config id",
		})
	}

	var req EditConfigReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	updates := map[string]interface{}{}

	if req.AppName != "" {
		updates["app_name"] = req.AppName
	}
	if req.Endpoint != "" {
		updates["endpoint"] = req.Endpoint
	}
	if req.Configs != nil {
		updates["configs"] = req.Configs
	}

	if len(updates) == 0 {
		return c.Status(400).JSON(fiber.Map{
			"error": "nothing to update",
		})
	}

	err = db.DB.
		Model(&models.AppConfig{}).
		Where("id = ? AND user_id = ?", cfgId, uId).
		Updates(updates).
		Error
	if err != nil {
		fmt.Println("update error:", err)
		return c.Status(400).JSON(fiber.Map{
			"error": "failed to update config",
		})
	}

	return c.Status(200).JSON(fiber.Map{
		"message": "successfully updated app config",
	})
}
