package controller

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"reverse-http/Configs"
	"reverse-http/Models"
	"reverse-http/Utils"
)

type ReverseHttpReq struct {
	Name     string `json:"name"`
	Endpoint string `json:"endpoint"`
}

func CreateReverseRoute(c *fiber.Ctx) error {
	data := ReverseHttpReq{}

	usrData := c.Locals("user").(*utils.UserJWT)

	if err := c.BodyParser(&data); err != nil {
		fmt.Println("error while parsing body")
		return c.Status(500).JSON(fiber.Map{
			"error": "failed to pasrse the body",
		})
	}

	paramId := uuid.New()

	userId, err := uuid.Parse(usrData.Id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "invalid user id",
		})
	}

	reverseData := models.OauthConfig{
		Id:       paramId,
		Key:      data.Name,
		Endpoint: data.Endpoint,
		UserId:   userId,
	}

	error := db.DB.
		Where("Id=? AND key=?", paramId, data.Name).
		Select("id key endpoint userId").
		Find(&reverseData).Error

	if error == nil {
		fmt.Println("endoint and config already exists")
		return c.Status(500).JSON(fiber.Map{
			"error": "the endpoint already exist",
		})
	}

	errs := db.DB.Create(&reverseData).Error
	if errs != nil {
		fmt.Println("failed to create endpoint")
		return c.Status(500).JSON(fiber.Map{
			"error": "failed to create endpoint",
		})
	}

	return c.Status(200).JSON(fiber.Map{
		"message": "endpoint created succesfully",
		"data":    reverseData,
	})
}

func RedirectRequest(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(400).JSON(fiber.Map{
			"error": "include roteId in req",
		})
	}

	uId, err := uuid.Parse(id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"error": "invalid id",
		})
	}

	fmt.Println("id:", id)

	data := models.OauthConfig{}

	error := db.DB.Where("id=?", uId).Find(&data).Error
	if error == nil {
		return c.Redirect(data.Endpoint)
	}

	fmt.Println("invalid key")
	return c.Status(404).JSON(fiber.Map{
		"error": "invalid key",
	})
}

func GetRedirectList(c *fiber.Ctx) error {
	usrData := c.Locals("user").(*utils.UserJWT)
	userId, err := uuid.Parse(usrData.Id)
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

	var data []OauthConfigLite

	error := db.DB.
		Table("oauth_configs").
		Where("user_id = ?", userId).
		Select("id, key, endpoint").
		Find(&data).Error

	if error != nil {
		fmt.Println("error while calling db")
		return c.Status(400).JSON(fiber.Map{
			"error": "no reverse endpoint set",
		})
	}

	return c.Status(200).JSON(fiber.Map{
		"data":    data,
		"message": "succesfully fetched reverse-http data",
	})
}
