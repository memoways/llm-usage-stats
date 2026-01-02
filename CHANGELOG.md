# Changelog

Toutes les modifications notables du projet LLM Cost Tracker seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [Non publié]

### Ajout ElevenLabs Provider - 2026-01-02

#### Ajouté
- **Support ElevenLabs comme provider Text-to-Speech:**
  - Nouveau provider pour le service ElevenLabs (TTS)
  - Affichage de l'usage en **caractères** (différent des tokens LLM)
  - Quota mensuel avec pourcentage d'utilisation
  - Coût estimé basé sur le tier d'abonnement (free, starter, creator, pro, scale)

- **Endpoints API ElevenLabs utilisés:**
  - `GET /v1/user` - Informations utilisateur et abonnement
  - `GET /v1/user/subscription` - Détails du quota et usage
  - `GET /v1/usage/character-stats` - Stats détaillées par période (optionnel)

- **Affichage adapté:**
  - "Characters Used (starter)" avec nombre de caractères
  - "Quota: 26,283 / 74,010 (35.5%)" pour visualiser l'usage
  - Coût estimé basé sur le pricing du plan (~$0.30/1000 chars pour starter)

- **Documentation mise à jour:**
  - README avec section ElevenLabs et configuration
  - Structure du projet mise à jour avec `elevenlabs.ts`

### Ajout Anthropic Provider - 2025-12-28

#### Ajouté
- **Support Anthropic comme LLM Provider:**
  - Utilisation d'une **seule Admin API key** pour accéder à tous les workspaces
  - Récupération dynamique des workspaces via l'API Admin Anthropic
  - Récupération dynamique des API keys par workspace (affichées comme "Projects")
  - Pricing pour tous les modèles Claude (3.5 Sonnet, 3.5 Haiku, 3 Opus, etc.)

- **Distinction entre providers documentée:**
  - **OpenAI:** Workspace → Projects → API Keys (projets = unité de facturation)
  - **Anthropic:** Workspace → API Keys (workspace = unité de facturation, pas de concept de projet)
  - Le bloc "Workspace Total" calcule différemment selon le provider

- **Limitation Anthropic identifiée et documentée:**
  - Anthropic ne fournit PAS de données d'usage/facturation via leur API
  - L'Admin API permet uniquement: workspaces, API keys, members, invites
  - Message clair affiché dans l'interface avec lien vers la console Anthropic
  - L'utilisateur doit vérifier manuellement: https://console.anthropic.com/settings/billing

- **Mise à jour du bloc Workspace Total:**
  - Affiche "(All Projects)" pour OpenAI
  - Affiche "(All API Keys)" pour Anthropic
  - Message explicatif adapté au provider sélectionné

### Améliorations Majeures - 2025-12-22

#### Ajouté
- **Workspace Total:**
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
  - OpenAIProvider avec support multi-workspaces (`src/lib/providers/openai.ts`)
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

### Phase de Design - 2025-12-22

#### Contexte du Projet
Cette application a été créée pour pallier les limitations de la console OpenAI :
- La console OpenAI ne permet de voir les coûts que **mois par mois**
- Impossible de sélectionner des dates personnalisées
- Pas de vue sur plusieurs mois ou une année entière
- Pas de comparaison entre périodes

**Solution:** Application web permettant de suivre les usages et coûts sur n'importe quelle période, avec support multi-providers.

#### Décisions Techniques
- **Architecture:** Pattern Provider avec interface `ILLMProvider` commune
- **Multi-services:** Support extensible pour OpenAI, Anthropic, Mistral, etc.
- **Navigation conditionnelle:** Workspace selector visible selon le provider
- **Frontend:** Next.js 14+ avec App Router
- **Styling:** Tailwind CSS
- **Sécurité:** Variables d'environnement, clés API server-side uniquement
- **Cache:** En mémoire avec TTL 5 minutes

---

## Roadmap

### Implémenté
- [x] Architecture multi-provider extensible
- [x] Support OpenAI avec pagination complète
- [x] Workspace Total (tous projets combinés)
- [x] Model-level breakdown avec pricing
- [x] Support Anthropic (workspaces dynamiques) - ⚠️ En attente API usage
- [x] Support ElevenLabs (caractères / quota mensuel)

### À Venir
- [ ] Support Mistral
- [ ] Export des données (CSV, PDF)
- [ ] Graphiques et visualisations
- [ ] Alertes de coûts

---

## Notes de Version

### Conventions
- **[Non publié]** - Changements pas encore déployés
- **[X.Y.Z]** - Version déployée

### Catégories
- **Ajouté** - Nouvelles fonctionnalités
- **Modifié** - Changements aux fonctionnalités existantes
- **Corrigé** - Corrections de bugs
- **Sécurité** - Corrections de vulnérabilités
