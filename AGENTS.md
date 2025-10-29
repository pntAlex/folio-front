# Repository Guidelines

## Structure du projet
Le site est une application statique. Les pages principales (`index.html`, `about.html`, `contact.html`, `realisations.html`) restent à la racine et sont servies sans suffixe `.html` grâce au serveur Bun (`/about`, `/realisations`, etc.). Les styles globaux sont dans `style.css`; les feuilles spécifiques et dépendances tierces vivent dans `css/`. Rangez les icônes et SVG dans `assets/`, les visuels dans `images/`, les polices dans `webfonts/`, et centralisez le JavaScript dans `js/`. Les fichiers SEO (`robots.txt`, `sitemap.xml`) sont à la racine — mettez le sitemap à jour dès qu’une nouvelle page publique est ajoutée.

## Commandes de développement
Pas de build system supplémentaire. Pour un aperçu local rapide, lancez `bun server.ts`.  
En mode watch (hot reload sur le serveur et cache HTTP désactivé), positionnez `NODE_ENV=development` puis lancez `bun --watch server.ts` ou `NODE_ENV=development bun --watch server.ts`.

Sous Docker, renseignez `HOST_PORT`, `PORT`, `STATIC_ROOT`, `FALLBACK_HTML`, `CONTAINER_NAME`, `NODE_ENV` dans l’`env` approprié (`.env` par défaut pour le dev) puis exécutez `docker compose up --build`. Le profil `development` monte automatiquement le projet hôte dans le conteneur et utilise `bun --watch`, ce qui évite de reconstruire l’image à chaque modification. Par défaut, le site est exposé sur `http://localhost:8080`.

## Configuration
Les variables Bun sont centralisées dans `.env*`. Utilisez :

- `.env` / `.env.local` : développement (`NODE_ENV=development`, cache désactivé, watch actif)
- `.env.prod` : production (`NODE_ENV=production`, cache activé)

Lancez `docker compose --env-file <fichier> up` pour cibler une configuration donnée. Ces fichiers restent hors image grâce à `.dockerignore`. Pensez à mettre à jour `sitemap.xml` — et le lien dans `robots.txt` — si le domaine évolue.

## Style et conventions
Respectez l’indentation à deux espaces observée dans les HTML, CSS et JavaScript existants. Les classes CSS sont descriptives et en anglais (`.hero-title`, `.skills-grid`), les états utilisent `is-` / `has-`. Limitez les IDs aux ancres et centralisez couleurs et variables dans `style.css`. Groupez les sections CSS avec des commentaires courts (`/* Hero */`) pour garder une vue d’ensemble.

## Tests et qualité
Pas encore de suite de tests. Avant de pousser : vérifier rendu desktop/mobile, navigation complète et lancer un audit Lighthouse (Chrome) pour accessibilité/performance. Si vous ajoutez des tests, rangez-les dans `tests/` et documentez la procédure (`pa11y`, `playwright`) dans `README.md`.

## Commits et Pull Requests
Suivez un format de message `type: résumé` (ex. `feat: ajouter la galerie photos`). Dans le corps du commit, décrivez le périmètre et les vérifications manuelles. Les PR doivent apporter : un résumé concis, captures d’écran (desktop + mobile), lien vers la page modifiée et limites connues. Évitez les fichiers parasites (`.DS_Store`, caches) et pinguez les relecteurs pertinents (UI, contenu, accessibilité).

## Sécurité et déploiement
Ne versionnez aucun secret : conservez-les dans des `.env` ignorés. Déployez en HTTPS avec HSTS + CSP restrictive et optimisez les images (`npx imagemin`) avant commit pour préserver les performances.
