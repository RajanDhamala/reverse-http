
FROM golang:1.25-alpine AS build
WORKDIR /app

COPY . .

RUN go mod tidy

RUN go build -o runtime ./main.go



FROM alpine:3.18
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/runtime .
RUN chmod +x runtime
USER appuser

USER appuser

EXPOSE 8080

CMD ["./runtime"]
