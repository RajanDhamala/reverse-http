package db

import (
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	models "reverse-http/Models"
)

var DB *gorm.DB

func InitDatabase() {
	dsn := "host=localhost user=postgres dbname=appdb port=5432 sslmode=disable"

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to Postgres database:", err)
	}

	err = DB.AutoMigrate(
		&models.User{},
		&models.AppConfig{},
		&models.OauthConfig{},
	)
	if err != nil {
		log.Fatal("Migration failed:", err)
	}

	log.Println("Postgres database connection established")
}
