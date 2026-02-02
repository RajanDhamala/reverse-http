package utils

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"golang.org/x/crypto/bcrypt"
)

// Hardcoded for dev/testing
var (
	RefreshSecret = []byte("refresh-key")
	AccessSecret  = []byte("access-key")
)

type UserJWT struct {
	Username string
	Id       string
}

func CreateAccessToken(data *UserJWT) (string, error) {
	claims := jwt.MapClaims{
		"username": data.Username,
		"id":       data.Id,
		"exp":      time.Now().Add(15 * time.Minute).Unix(),
		"iat":      time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(AccessSecret)
}

func CreateRefreshToken(data *UserJWT) (string, error) {
	claims := jwt.MapClaims{
		"username": data.Username,
		"id":       data.Id,
		"exp":      time.Now().Add(7 * 24 * time.Hour).Unix(),
		"iat":      time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(RefreshSecret)
}

func VerifyAccessToken(tokenString string) (*UserJWT, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return AccessSecret, nil
	})
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("invalid access token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}
	username, _ := claims["username"].(string)
	id, _ := claims["id"].(string)

	return &UserJWT{
		Username: username,
		Id:       id,
	}, nil
}

func VerifyRefreshToken(tokenString string) (*UserJWT, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return RefreshSecret, nil
	})
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("invalid refresh token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}

	username, _ := claims["username"].(string)
	id, _ := claims["id"].(string)

	return &UserJWT{
		Username: username,
		Id:       id,
	}, nil
}

func HashPassword(passwrod string) (string, error) {
	paswdByte := []byte(passwrod)
	data, err := bcrypt.GenerateFromPassword(paswdByte, 10)
	if err != nil {
		fmt.Println("failed to hash the passwrod")
		return "", err
	}
	return string(data), nil
}

func ComaprePasswrod(Password string, HashedPassword string) error {
	bytePassword := []byte(Password)
	byteHashPassword := []byte(HashedPassword)
	err := bcrypt.CompareHashAndPassword(byteHashPassword, bytePassword)
	if err != nil {
		return errors.New("password not matched")
	}
	return nil
}
