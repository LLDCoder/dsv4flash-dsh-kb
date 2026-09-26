FROM public.ecr.aws/docker/library/nginx:latest
COPY index.html app.js model-service-error.js audit-app.js styles.css audit-styles.css favicon.svg /usr/share/nginx/html/
RUN chmod 644 /usr/share/nginx/html/model-service-error.js
COPY assets /usr/share/nginx/html/assets/
COPY nginx.conf /etc/nginx/conf.d/default.conf
