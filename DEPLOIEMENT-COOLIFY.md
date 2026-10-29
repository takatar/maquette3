# Déploiement sur Coolify — maquette3.immed-ia.com

Site statique (4 pages) servi par Nginx dans un conteneur Docker, construit automatiquement à partir de ce dépôt GitHub.

## 1. Ce que contient le dépôt pour le déploiement

| Fichier | Rôle |
| --- | --- |
| `Dockerfile` | Étape 1 : Node 24 construit `out/` et vérifie tous les liens. Étape 2 : Nginx 1.29 ne sert que les fichiers statiques (port 80). |
| `deploy/nginx.conf` | Compression gzip, cache (HTML sans cache, assets 1 h, photos 30 j), en-têtes de sécurité, redirections relatives, sonde `/healthz`, page 404. |
| `deploy/404.html` | Page « page introuvable » autonome. |
| `.dockerignore` | Contexte de build minimal : les PNG d'origine (≈ 110 Mo) ne sont pas envoyés au démon Docker. |
| `.gitignore` | `out/` (reconstruit à chaque build) et les PNG d'origine ne sont pas versionnés. |

Les 9 photos utilisées par le site sont dans `images/optimized/` et **sont** versionnées : sans elles, le build échoue volontairement.

## 2. Vérifier le déploiement Docker en local (facultatif mais recommandé)

```powershell
cd "c:\Users\arno\Documents\Mondrian\Site web GPT6.1Sol"
docker build -t le-mondrian:local .
docker run --rm -p 8099:80 le-mondrian:local
```

Ouvrir <http://localhost:8099> : l'accueil, `/presentation/`, `/services/`, `/contact/` et les photos doivent s'afficher. `http://localhost:8099/healthz` doit répondre `ok`.

Contrôles déjà effectués sur cette configuration : build sans erreur, 4 pages en HTTP 200, redirections `/presentation` → `/presentation/`, 404 personnalisée, gzip actif, conteneur `healthy`.

## 3. DNS chez Hostinger

1. Relever l'adresse IPv4 du VPS (Coolify l'affiche dans **Servers**, ou via `ssh root@VOTRE_IP` puis `curl -4 ifconfig.me`).
2. hPanel Hostinger → **Domaines** → `immed-ia.com` → **DNS / Zone DNS**.
3. Ajouter un enregistrement :

   | Type | Nom | Valeur | TTL |
   | --- | --- | --- | --- |
   | `A` | `maquette3` | `IP_DU_VPS` | 300 (ou 3600) |

4. Vérifier la propagation avant de déployer :

   ```powershell
   Resolve-DnsName maquette3.immed-ia.com -Server 1.1.1.1
   ```

   La réponse doit contenir l'IP du VPS. Si Cloudflare gère la zone, mettre l'enregistrement en **DNS only** (nuage gris) le temps que Let's Encrypt délivre le certificat.
5. S'assurer que les ports **80** et **443** du VPS sont ouverts (Coolify en a besoin pour le proxy et le certificat).

## 4. Envoyer les fichiers sur GitHub

Le dépôt <https://github.com/takatar/maquette3.git> existe et est vide : le premier `push` crée la branche `main`.

```powershell
cd "c:\Users\arno\Documents\Mondrian\Site web GPT6.1Sol"

# Identité Git (une seule fois par machine)
git config --global user.name "Votre Nom"
git config --global user.email "votre-email@exemple.com"

git init -b main
git add .
git status          # vérifier la liste : Dockerfile, deploy/, assets/, images/optimized/, etc.
git commit -m "Site Le Mondrian : maquette statique et déploiement Docker/Nginx"

git remote add origin https://github.com/takatar/maquette3.git
git push -u origin main
```

**Authentification GitHub** : au `push`, Git Credential Manager ouvre une fenêtre de connexion GitHub (ou demande un mot de passe). Le mot de passe du compte ne fonctionne plus : utiliser un **Personal Access Token** (GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → scope `repo`) comme mot de passe, ou passer par GitHub Desktop.

Pour un dépôt privé, le même token suffit. Vérifier ensuite que les fichiers sont visibles sur la page GitHub du dépôt.

## 5. Créer la ressource dans Coolify

1. Se connecter à Coolify (`http://IP_DU_VPS:8000`).
2. **Projects** → ouvrir (ou créer) un projet, environnement **Production**.
3. **+ New** → **Public Repository** (ou *Private Repository (with GitHub App)* si le dépôt est privé).
4. Renseigner :
   - **Repository URL** : `https://github.com/takatar/maquette3.git`
   - **Branch** : `main`
   - **Build Pack** : `Dockerfile`
   - **Base Directory** : `/`
   - **Dockerfile Location** : `/Dockerfile`
   - **Ports Exposes** : `80`
   - **Domains** : `https://maquette3.immed-ia.com`
5. **Deploy** puis suivre **Deployment Logs** : le build doit afficher `Export statique créé dans /app/out (4 pages, 9 photos)`, puis le conteneur passer au vert.

Coolify route `maquette3.immed-ia.com` vers le port 80 du conteneur via son proxy Traefik et génère le certificat Let's Encrypt (nécessite le DNS de l'étape 3 et les ports 80/443).

## 6. Activer le redéploiement automatique

Dans la ressource Coolify → **Webhooks** → copier l'URL GitHub. Puis GitHub → dépôt → **Settings** → **Webhooks** → **Add webhook** : coller l'URL, *Content type* `application/json`, événement *Just the push event*. Chaque `git push` sur `main` reconstruit alors le site ; on peut aussi cliquer sur **Redeploy** dans Coolify.

## 7. Mettre à jour le site

```powershell
git add -A
git commit -m "Description de la modification"
git push
```

Les pages HTML ne sont pas mises en cache par nginx : la nouvelle version est visible immédiatement après le redéploiement.

## 8. Dépannage rapide

| Symptôme | Cause probable / solution |
| --- | --- |
| `502 Bad Gateway` | Conteneur arrêté ou port erroné : **Ports Exposes** doit valoir `80`. Consulter les logs du conteneur. |
| Le build ne trouve pas le Dockerfile | **Dockerfile Location** doit être `/Dockerfile` et **Base Directory** `/`. |
| Certificat impossible | DNS non propagé, port 80 fermé, ou proxy Cloudflare actif (nuage orange). |
| Page sans style | Accès par un sous-chemin ; le site doit être servi à la racine du domaine (c'est le cas ici). |
| Ancienne version affichée | Redéploiement non terminé, ou cache navigateur sur `assets/` (1 h) : forcer le rechargement. |
| Échec `Photographie introuvable` | Un fichier `images/optimized/*.jpg` manque dans le dépôt. |

## 9. À faire avant une mise en production réelle

- Remplacer le numéro WhatsApp et les coordonnées fictives dans `assets/site.js`.
- Compléter les mentions légales et la politique de confidentialité.
- Vérifier les tarifs, horaires et conditions annoncés.
