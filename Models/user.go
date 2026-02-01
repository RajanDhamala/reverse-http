package models

import "gorm.io/gorm"

type User struct {
	gorm.Model
	Name  string `json:"name"`
	Email string `json:"email" gorm:"unique"`
}

type AppConfig struct {
	gorm.Model
	AppName  string `json:"app_name"`
	Endpoint string `json:"endpoint"`
	Key      string `json:"key" gorm:"uniqueIndex"`
}

type OauthConfig struct {
	gorm.Model
	Key      string `json:"key" gorm:"uniqueIndex"`
	Endpoint string `json:"endpoint"`
}
