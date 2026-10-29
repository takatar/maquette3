# Le Mondrian — maquette de site vitrine

Site de démonstration en français pour une résidence hôtelière de 17 chambres à Saly Portudal. Quatre pages : `/`, `/presentation`, `/services`, `/contact`.

## Démarrage

Node.js requis. Depuis ce dossier, exécuter `npm run dev`, puis ouvrir `http://localhost:4173`. Aucun téléchargement de dépendances n'est nécessaire. Vérifications : `npm run check`. Test de rendu et de navigation à 320, 390, 768 et 1440 px : `npm run check:browser` (nécessite Microsoft Edge ; définir `BROWSER_PATH` pour un autre navigateur Chromium compatible).

## Version statique

Exécuter `npm run build` pour produire `out/`, puis `npm run check:static` pour vérifier tous les liens et ressources. Publier **le contenu** de `out/` sur un hébergeur de fichiers statiques (à la racine ou dans un sous-répertoire). Les quatre pages possèdent chacune leur propre `index.html` ; un hébergeur configuré pour servir automatiquement les index de répertoire permet les URLs `/presentation/`, `/services/` et `/contact/`. Aucune réécriture d'URL ni serveur Node ne sont requis en production. Les fichiers générés n'ont pas besoin de charger les images d'origine : seules les photos optimisées utilisées sont copiées dans `out/images/optimized/`. Ne pas ouvrir les fichiers HTML via `file://` : servir le dossier via HTTP pour que les icônes SVG et les liens fonctionnent normalement. La police facultative dépend de Google Fonts ; si elle est indisponible, des polices de remplacement sont prévues.
Pour contrôler également le rendu de l'export statique dans Edge en simulant un déploiement sous `/demo/`, exécuter `npm run check:static:browser`.

## Déploiement Docker / Coolify

Le site est publié à l'adresse <https://maquette3.immed-ia.com> via Coolify à partir du dépôt `takatar/maquette3`. Le `Dockerfile` construit `out/` avec Node puis le sert avec Nginx (port 80). Pour tester l'image en local :

```powershell
docker build -t le-mondrian:local .
docker run --rm -p 8099:80 le-mondrian:local
```

Guide complet (DNS, envoi GitHub, ressource Coolify, webhook, dépannage) : [`DEPLOIEMENT-COOLIFY.md`](DEPLOIEMENT-COOLIFY.md).

## Avant publication

- Remplacer le numéro WhatsApp fictif `WHATSAPP_NUMBER` dans `assets/site.js` et vérifier qu'il correspond bien à l'établissement. Tous les liens de réservation sont générés à partir de cette constante et ouvrent une **demande** par WhatsApp, jamais une réservation confirmée.
- Remplacer et vérifier l'adresse, le téléphone et l'e-mail fictifs centralisés dans `assets/site.js`. L'adresse `.example` est volontairement non opérationnelle.
- Confirmer les horaires, conditions d'annulation, moyens de paiement, règles de séjour et équipements avant d'annoncer quoi que ce soit. Les états en attente se trouvent dans `services/index.html`.
- Compléter les mentions légales et la politique de confidentialité avec les informations réelles de l'exploitant.
- Les photos et leurs copies JPEG optimisées sont exclusivement issues de `images/`. Aucune image externe n'est utilisée. Les typographies facultatives proviennent de Google Fonts ; les polices système de remplacement restent disponibles si ce service est bloqué.
- Aucun formulaire de contact n'est affiché faute de service d'envoi opérationnel : WhatsApp est le seul canal de contact fonctionnel dans la maquette. Le numéro utilisé étant fictif, le remplacer avant ouverture au public.