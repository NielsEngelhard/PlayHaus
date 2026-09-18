FROM golang:1.26-alpine AS builder

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/ph-api ./cmd/api
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/ph-migrate ./cmd/migrate

FROM alpine:3.20

WORKDIR /app

COPY --from=builder /out/ph-api ./ph-api
# Run by deploy.sh with --entrypoint, before ph-api is started, and never by the API.
COPY --from=builder /out/ph-migrate ./ph-migrate

EXPOSE 8080

ENTRYPOINT ["/app/ph-api"]
