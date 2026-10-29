# syntax=docker/dockerfile:1

# --- Étape 1 : construction de l'export statique -----------------------------
# Le projet n'a aucune dépendance npm : seul Node est nécessaire pour lancer
# scripts/build-static.js, qui génère out/ (4 pages + assets + photos optimisées).
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json ./
COPY scripts ./scripts
COPY assets ./assets
COPY images ./images
COPY index.html ./
COPY presentation ./presentation
COPY services ./services
COPY contact ./contact

# Vérifie que l'export est complet et que tous les liens internes existent.
COPY tests/static.test.js ./tests/
RUN node scripts/build-static.js && node tests/static.test.js

# --- Étape 2 : service HTTP statique -----------------------------------------
FROM nginx:1.29-alpine AS runtime

# Configuration du serveur, page d'erreur, puis les fichiers publics.
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/404.html /usr/share/nginx/html/404.html
COPY --from=build /app/out/ /usr/share/nginx/html/

# Le manifeste d'export n'a pas à être public.
RUN rm -f /usr/share/nginx/html/.mondrian-static.json

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/healthz || exit 1

# L'image officielle démarre déjà nginx au premier plan.
