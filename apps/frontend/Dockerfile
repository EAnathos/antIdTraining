FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL=/api
ARG VITE_BACKEND_ORIGIN=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_BACKEND_ORIGIN=$VITE_BACKEND_ORIGIN

RUN npm run build

FROM alpine:3.21
WORKDIR /app
COPY --from=builder /app/dist ./dist
CMD ["sh", "-c", "cp -r /app/dist/. /dist/"]
