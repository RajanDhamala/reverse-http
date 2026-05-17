package db

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	// "reverse-http/Models"
)

var DB *gorm.DB

func InitDatabase() {
	dsn := os.Getenv("DATABASE_URL")

	if dsn == "" {
		log.Fatal("DATABASE_URL is not set")
	}

	fmt.Println("Using database:", dsn)
	log.Println("Using Neon production database")

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to Postgres database:", err)
	}

	// err = DB.AutoMigrate(
	// 	&models.User{},
	// 	&models.AppConfig{},
	// 	&models.OauthConfig{},
	// 	&models.KeyValueStore{},
	// )
	// if err != nil {
	// 	log.Fatal("Migration failed:", err)
	// }

	log.Println("Postgres database connection established")
}
