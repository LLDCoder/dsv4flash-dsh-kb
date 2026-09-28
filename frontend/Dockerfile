FROM public.ecr.aws/docker/library/nginx:latest
COPY index.html app.js model-service-error.js styles.css /usr/share/nginx/html/
RUN chmod 644 /usr/share/nginx/html/model-service-error.js
COPY nginx.conf /etc/nginx/conf.d/default.conf
