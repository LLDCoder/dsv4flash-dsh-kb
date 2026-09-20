FROM public.ecr.aws/docker/library/nginx:latest
COPY index.html app.js audit-app.js styles.css audit-styles.css favicon.svg /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets/
COPY sessions /usr/share/nginx/html/sessions/
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Source archives from macOS can preserve owner-only executable bits. Nginx
# runs as the unprivileged `nginx` user, so normalize static asset readability
# during image build rather than depending on host filesystem modes.
RUN chmod -R a+rX /usr/share/nginx/html
