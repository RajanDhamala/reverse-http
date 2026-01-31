
# Reverse HTTP Config Service

A lightweight **Go-based reverse HTTP server** that acts as a **reverse proxy for OAuth** and provides basic **app configuration** to clients when the app starts.

## Purpose

- Serve basic configuration to apps on startup
- Act as a reverse proxy in OAuth flows

## Tech Stack

- **Go 1.25**
- [Fiber v2](https://github.com/gofiber/fiber)
- Docker (multi-stage build)
- Alpine Linux base for lightweight production images
