FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_API_URL=/api
ARG VITE_BACKEND_ORIGIN=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_BACKEND_ORIGIN=$VITE_BACKEND_ORIGIN

RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
