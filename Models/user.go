package models

import (
	"time"

	"gorm.io/gorm"

	"github.com/google/uuid"
)

type User struct {
	Id               uuid.UUID `gorm:"type:uuid; primaryKey"`
	Username         string    `gorm:"not null"`
	Email            string    `gorm:" unique ;not null"`
	Password         string    `gorm:"default: null"`
	GithubProviderId string    `gorm:"unique; default:null "`
	GoogleProviderId string    `gorm:"unique; default:null"`

	Type        string        `gorm:"default:'free'"`
	Avatar      string        `gorm:"default:null"`
	AppCofigs   []AppConfig   `gorm:"foreignKey:UserId; constraint:OnDelete:CASCADE"`
	OauthConfig []OauthConfig `gorm:"foreignKey:UserId; constraint:OnDelete:CASCADE"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
	DeletedAt   gorm.DeletedAt
}

type AppConfig struct {
	Id uuid.UUID `gorm:"type:uuid; primaryKey"`

	AppName   string `json:"app_name"`
	Endpoint  string `json:"endpoint"`
	Key       string `json:"key" gorm:"uniqueIndex"`
	UserId    uint   `gorm:"not null;index"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt
}

type OauthConfig struct {
	Id uuid.UUID `gorm:"type:uuid; primaryKey"`

	Key       string `json:"key" gorm:"uniqueIndex"`
	Endpoint  string `json:"endpoint"`
	UserId    uint   `gorm:"not null;index"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt
}
