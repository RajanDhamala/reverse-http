package db

import (
	"log"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"reverse-http/Models"
)

var DB *gorm.DB

func InitDatabase() {
	var err error
	DB, err = gorm.Open(sqlite.Open("app.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	DB.AutoMigrate(&models.User{}, &models.AppConfig{}, &models.OauthConfig{})
	log.Println("Database connection established")
}
