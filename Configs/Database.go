package db

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDatabase() {
	dsn := os.Getenv("DATABASE_URL")
	fmt.Println("os data:", string(dsn))
	envirnment:=os.Getenv("ENVIRONMENT")
	if envirnment == "development" {
		dsn = "host=localhost user=postgres dbname=appdb port=5432 sslmode=disable"
		log.Println("Using local database")
	} else {
		log.Println("Using production database")
	}

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to Postgres database:", err)
	}

	// Auto-migrate models
	// err = DB.AutoMigrate(
	// 	&models.User{},
	// 	&models.AppConfig{},
	// 	&models.OauthConfig{},
	// )
	if err != nil {
		log.Fatal("Migration failed:", err)
	}

	log.Println("Postgres database connection established")
}
