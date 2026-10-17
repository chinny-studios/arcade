# syntax=docker/dockerfile:1
# Chinny's Arcade, fully offline: every game plus the fonts and libraries they would fetch, served by nginx.
#   docker build -t arcade . && docker run --rm -p 8080:8080 arcade    # then open http://localhost:8080/
# Built and published by .github/workflows/offline-image.yml. See "Play offline with Docker" in README.md.

# Copy the playable files and vendor external assets. Runs once on the build machine's own platform,
# since the output is plain files that work on any architecture.
FROM --platform=$BUILDPLATFORM python:3.14-alpine AS site
WORKDIR /src
COPY . .
# Behind a TLS-inspecting proxy, pass its CA with --secret id=ca,src=ca.pem (optional).
RUN --mount=type=secret,id=ca \
    if [ -f /run/secrets/ca ]; then export SSL_CERT_FILE=/run/secrets/ca; fi; \
    python3 -I tools/offline/vendor.py /src /site

# Runs as an unprivileged user on port 8080 and writes only to /tmp, so --read-only --tmpfs /tmp works.
FROM nginxinc/nginx-unprivileged:1.30-alpine
COPY tools/offline/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=site /site /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
