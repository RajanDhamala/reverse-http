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
