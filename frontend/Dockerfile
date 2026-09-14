FROM public.ecr.aws/docker/library/nginx:latest
COPY --chmod=644 index.html app.js styles.css /usr/share/nginx/html/
COPY --chmod=644 nginx.conf /etc/nginx/conf.d/default.conf
