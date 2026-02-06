package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type User struct {
	Id               uuid.UUID `gorm:"type:uuid; primaryKey"`
	Username         string    `gorm:"not null"`
	Email            string    `gorm:" unique ;not null"`
	Password         string    `gorm:"default: null"`
	GithubProviderId string    `gorm:"unique; default: null "`
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

	AppName       string          `json:"app_name"`
	Endpoint      string          `json:"endpoint"`
	Configs       datatypes.JSON  `json:"configs"`
	UserId        uuid.UUID       `gorm:"not null;index"`
	KeyValueStore []KeyValueStore `gorm:"foreignKey:AppConfigId; constraint:OnDelete:CASCADE"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
	DeletedAt     gorm.DeletedAt
}

type KeyValueStore struct {
	Id          uuid.UUID `gorm:"type:uuid; primaryKey"`
	Key         string    `gorm:"not null"`
	Value       string    `gorm:"not null"`
	AppConfigId uuid.UUID `gorm:"not null;index"`

	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt
}

type OauthConfig struct {
	Id uuid.UUID `gorm:"type:uuid; primaryKey"`

	Key       string    `json:"key" gorm:"uniqueIndex"`
	Endpoint  string    `json:"endpoint"`
	UserId    uuid.UUID `gorm:"not null;index"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt
}
