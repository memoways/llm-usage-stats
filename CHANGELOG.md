# Changelog

Toutes les modifications notables du projet LLM Cost Tracker seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [Non publié]

### Ajout Anthropic Provider - 2025-12-28

#### Ajouté
- **Support Anthropic comme LLM Provider:**
  - Utilisation d'une **seule Admin API key** pour accéder à tous les workspaces
  - Récupération dynamique des workspaces via l'API Admin Anthropic
  - Récupération dynamique des API keys par workspace (affichées comme "Projects")
  - Pricing pour tous les modèles Claude (3.5 Sonnet, 3.5 Haiku, 3 Opus, etc.)

- **Distinction importante entre providers:**
  - **OpenAI:** Workspace → Projects → API Keys (projets = unité de facturation)
  - **Anthropic:** Workspace → API Keys (workspace = unité de facturation, pas de concept de projet)
  - Le bloc "Workspace Total" calcule différemment selon le provider

- **Mise à jour du bloc Workspace Total:**
  - Affiche "(All Projects)" pour OpenAI
  - Affiche "(All API Keys)" pour Anthropic
  - Message explicatif adapté au provider sélectionné

#### Documentation
- README mis à jour avec la distinction entre les structures OpenAI et Anthropic
- Variables d'environnement: `ANTHROPIC_ADMIN_KEY` (une seule clé pour tout)

### Améliorations Majeures - 2025-12-22

#### Ajouté
- **Workspace Total (All Projects):**
  - Nouvelle section pour voir les coûts de TOUS les projets d'un workspace
  - Boutons rapides: Last Week, Last Month, Last Year
  - Date picker custom avec style amélioré
  - Breakdown par modèle pour le workspace entier

- **Model-Level Breakdown:**
  - Utilisation du paramètre `group_by=model` de l'API OpenAI
  - Affichage des vrais noms de modèles (gpt-4o, gpt-4o-mini, etc.)
  - Pricing spécifique par modèle pour calcul précis des coûts

- **Pagination Complète:**
  - Gestion de la pagination au sein de chaque chunk temporel
  - Récupération de TOUTES les données même pour de longues périodes
  - Requêtes séquentielles pour éviter les timeouts API

- **Chunking pour Longues Périodes:**
  - L'API OpenAI limite à 31 jours par requête
  - Découpage automatique en chunks de 30 jours
  - Agrégation correcte des résultats de tous les chunks

#### Corrigé
- Calculs incorrects pour "Last Year" (données manquantes dues à pagination incomplète)
- Couleur du texte dans les date pickers (maintenant noir sur fond blanc)
- Gestion des erreurs 503/timeout avec retry automatique

### Phase d'Implémentation Complète - 2025-12-22

#### Ajouté
- **Backend complet:**
  - Types et interfaces TypeScript (`src/lib/types.ts`, `src/lib/providers/interface.ts`)
  - OpenAIProvider avec support 3 workspaces (`src/lib/providers/openai.ts`)
  - Provider factory avec pattern registry (`src/lib/providers/factory.ts`)
  - Cache utility avec TTL 5 minutes (`src/utils/cache.ts`)
  - API routes: `/api/providers`, `/api/workspaces`, `/api/projects`, `/api/costs`

- **Frontend complet:**
  - ProviderSelector component
  - WorkspaceSelector component (conditionnel)
  - ProjectSelector component (dynamique)
  - DateRangePicker component (presets + custom)
  - CostDisplay component (total avec gradient)
  - ModelBreakdown component (tableau détaillé)
  - Main page avec orchestration complète des états

- **Fonctionnalités:**
  - Sélection multi-niveaux provider → workspace → project → dates
  - Auto-fetch des coûts quand tous les champs sont remplis
  - Bouton refresh manuel
  - États loading avec spinners
  - Gestion d'erreurs complète
  - Responsive design (mobile/tablet/desktop)

#### Testé
- Build production réussi (`npm run build`)
- TypeScript compilation sans erreurs
- Toutes les routes API fonctionnelles
- Tous les composants UI implémentés

### Phase de Design - 2025-12-22

#### Ajouté
- Document de design complet (`docs/plans/2025-12-22-openai-cost-tracker-design.md`)
- README.md avec documentation complète du projet
- CHANGELOG.md pour suivre les phases de développement
- Structure du projet définie:
  - **Architecture 4 couches** (Présentation / API / Providers / Services LLM)
  - **Pattern Provider** pour extensibilité multi-services
  - Stack technique: Next.js 14+ / TypeScript / Tailwind CSS
  - Organisation des fichiers avec `/lib/providers/`
  - Système de cache côté serveur (5 minutes) avec clés composées

#### Décisions Techniques Majeures
- **Architecture:** Pattern Provider avec interface `ILLMProvider` commune
- **Multi-services:** Support extensible pour OpenAI, Anthropic, Mistral, etc.
- **Navigation conditionnelle:** Workspace selector visible uniquement pour OpenAI
- **Normalisation hybride:** Devises et dates normalisées, noms de modèles natifs
- **Frontend:** Next.js avec App Router (pas Pages Router)
- **Styling:** Tailwind CSS pour rapidité et modernité
- **Sécurité:** Variables d'environnement Vercel, clés API server-side uniquement
- **Cache:** En mémoire avec clés composées `${provider}_${workspace}_${project}_${dateRange}`

#### Architecture Provider
- Interface `ILLMProvider` définissant le contrat commun:
  - `id`, `name`, `supportsWorkspaces`
  - `getWorkspaces()`, `getProjects()`, `getCosts()`
- Factory pattern pour instancier les providers
- OpenAI comme premier provider (3 workspaces: Edugami, Memoways, Storygami)
- Providers futurs: Anthropic, Mistral (architecture prête)

#### Fonctionnalités Planifiées
- **Sélection multi-niveaux:**
  - Provider LLM (OpenAI, Anthropic, etc.)
  - Workspace (conditionnel - uniquement OpenAI)
  - Projet (dynamique selon provider/workspace)
  - Période (boutons rapides + custom)
- **Affichage des coûts:**
  - Montant total en dollars (prominent)
  - Breakdown détaillé par modèle avec noms natifs
  - Cache indicator avec timestamp
- **Système de refresh manuel** pour mise à jour des données

---

## Phases de Développement Prévues

### [Phase 1] - Setup Initial & Architecture Providers (À venir)
- [ ] Initialisation du projet Next.js avec TypeScript
- [ ] Configuration Tailwind CSS
- [ ] Création de la structure des dossiers avec `/lib/providers/`
- [ ] Création de l'interface `ILLMProvider`
- [ ] Implémentation du provider factory pattern
- [ ] Configuration Git et .gitignore
- [ ] Setup des variables d'environnement (.env.example)

### [Phase 2] - OpenAI Provider & API Routes (À venir)
- [ ] Implémentation complète `OpenAIProvider`
  - [ ] Support des 3 workspaces (Edugami, Memoways, Storygami)
  - [ ] Méthodes `getWorkspaces()`, `getProjects()`, `getCosts()`
- [ ] Endpoint `/api/providers` (liste des providers disponibles)
- [ ] Endpoint `/api/workspaces` (conditionnel par provider)
- [ ] Endpoint `/api/projects` (avec support provider + workspace)
- [ ] Endpoint `/api/costs` (avec support provider + workspace)
- [ ] Système de cache avec clés composées
- [ ] Gestion des erreurs et rate limiting
- [ ] Tests des endpoints avec vraies clés API

### [Phase 3] - Interface Utilisateur Multi-Provider (À venir)
- [ ] Création du layout global et page principale
- [ ] Composant `ProviderSelector`
- [ ] Composant `WorkspaceSelector` (conditionnel)
- [ ] Composant `ProjectSelector` avec états loading
- [ ] Composant `DateRangePicker` (boutons + custom)
- [ ] Composant `CostDisplay` (montant total)
- [ ] Composant `ModelBreakdown` (tableau avec noms natifs)
- [ ] Logique conditionnelle pour affichage workspace selector
- [ ] Gestion des états: loading, erreurs, données vides
- [ ] Bouton refresh et indicateur de cache

### [Phase 4] - Tests et Déploiement (À venir)
- [ ] Tests complets en local avec les 3 workspaces OpenAI
- [ ] Validation de l'architecture extensible
- [ ] Validation des calculs de coûts
- [ ] Configuration du repository GitHub
- [ ] Configuration Vercel et variables d'environnement
- [ ] Premier déploiement en production
- [ ] Vérification finale sur l'URL de production

### [Phase 5] - Providers Additionnels (Future)
- [x] Implémentation `AnthropicProvider`
  - [x] Intégration Admin API Anthropic
  - [x] Support workspaces dynamiques
  - [x] API keys comme "Projects" dans l'interface
- [ ] Implémentation `MistralProvider`
  - [ ] Intégration Platform API Mistral
- [ ] Tests avec les nouveaux providers
- [ ] Documentation pour ajouter de nouveaux providers
- [ ] Guide de contribution

---

## Notes de Version

### Conventions de Nommage
- **[Non publié]** - Changements pas encore déployés
- **[Phase N]** - Phase de développement en cours ou planifiée
- **[X.Y.Z]** - Version déployée (après mise en production)

### Catégories de Changements
- **Ajouté** - Nouvelles fonctionnalités
- **Modifié** - Changements aux fonctionnalités existantes
- **Déprécié** - Fonctionnalités bientôt retirées
- **Retiré** - Fonctionnalités retirées
- **Corrigé** - Corrections de bugs
- **Sécurité** - Corrections de vulnérabilités

---

## Historique (sera rempli au fur et à mesure)

<!-- Les versions déployées seront ajoutées ici -->
