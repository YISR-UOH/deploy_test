#syntax=docker/dockerfile:1
FROM nginx:1.27-alpine
RUN apk add --no-cache curl
ARG NGINX_CONF=default.conf.http
COPY ${NGINX_CONF} /etc/nginx/conf.d/default.conf
