ARG NGINX_BASE_IMAGE=public.ecr.aws/docker/library/nginx:latest
FROM ${NGINX_BASE_IMAGE}
COPY index.html app.js audit-app.js styles.css audit-styles.css favicon.svg /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets/
RUN chmod -R a+rX /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
