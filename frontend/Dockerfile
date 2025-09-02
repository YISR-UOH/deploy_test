# syntax=docker/dockerfile:1
FROM node:22-alpine AS build

ENV NODE_ENV=development
ENV VITE_API_URL=/api

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM alpine:latest

WORKDIR /dist

COPY --from=build /app/dist .

CMD sh -c "cp -r * /usr/share/nginx/html/ 2>/dev/null || true; ls -la /usr/share/nginx/html/; sleep 10"
