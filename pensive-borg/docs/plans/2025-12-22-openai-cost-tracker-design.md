# OpenAI Cost Tracker - Design Document

**Date:** 2025-12-22
**Status:** Approved

## Overview

Application web multi-services pour suivre les coûts de différents fournisseurs LLM (OpenAI, Anthropic, Mistral, etc.) par projet et période. L'application permet de consulter les coûts totaux et le détail par modèle.

**Architecture extensible:** Système de providers permettant d'ajouter facilement de nouveaux services LLM. Implémentation initiale: OpenAI uniquement (3 workspaces: Edugami, Memoways, Storygami).

## Architecture Globale

### Stack Technique

- **Frontend:** Next.js 14+ (App Router) avec React, TypeScript
- **Styling:** Tailwind CSS
- **Déploiement:** Vercel
- **API:** Next.js API Routes (server-side)

### Architecture en 4 Couches

1. **Couche Présentation (Client)**
   - Sélection du service LLM (OpenAI, Anthropic, Mistral...)
   - Sélection workspace (conditionnelle - uniquement pour OpenAI)
   - Dropdown projets chargé dynamiquement
   - Boutons période (semaine/mois/année) + date picker custom
   - Affichage coût total + breakdown par modèle
   - Bouton refresh manuel

2. **Couche API (Server-side)**
   - `/api/providers` - Liste des providers disponibles
   - `/api/workspaces?provider=X` - Liste des workspaces (si applicable)
   - `/api/projects?provider=X&workspace=Y` - Liste les projets
   - `/api/costs` - Récupère les coûts (provider, workspace?, project, dateRange)
   - Gestion du cache côté serveur (5-10 minutes)
   - Accès sécurisé aux clés API via process.env

3. **Couche Providers (Abstraction)**
   - Interface TypeScript commune `ILLMProvider`
   - Implémentation par service: `OpenAIProvider`, `AnthropicProvider`, etc.
   - Méthodes: `getWorkspaces()`, `getProjects()`, `getCosts()`
   - Normalisation des données (devises USD, dates ISO)
   - Noms de modèles natifs (pas de mapping)

4. **Couche Services LLM**
   - APIs natives de chaque service
   - Authentification avec clés API spécifiques
   - Gestion des erreurs et rate limiting

### Sécurité

Les clés API ne transitent jamais vers le client. Elles restent uniquement côté serveur dans les variables d'environnement Vercel.

## Structure du Projet

```
llm-cost-tracker/
├── .env.local                    # Clés API (gitignored)
├── .env.example                  # Template des variables
├── .gitignore
├── next.config.js
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── README.md
├── CHANGELOG.md
├── src/
│   ├── app/
│   │   ├── page.tsx             # Page principale
│   │   ├── layout.tsx           # Layout global
│   │   ├── globals.css          # Styles Tailwind
│   │   └── api/
│   │       ├── providers/
│   │       │   └── route.ts     # GET /api/providers
│   │       ├── workspaces/
│   │       │   └── route.ts     # GET /api/workspaces
│   │       ├── projects/
│   │       │   └── route.ts     # GET /api/projects
│   │       └── costs/
│   │           └── route.ts     # GET /api/costs
│   ├── components/
│   │   ├── ProviderSelector.tsx
│   │   ├── WorkspaceSelector.tsx
│   │   ├── ProjectSelector.tsx
│   │   ├── DateRangePicker.tsx
│   │   ├── CostDisplay.tsx
│   │   └── ModelBreakdown.tsx
│   ├── lib/
│   │   ├── providers/
│   │   │   ├── interface.ts     # ILLMProvider interface
│   │   │   ├── openai.ts        # OpenAIProvider
│   │   │   ├── anthropic.ts     # AnthropicProvider (future)
│   │   │   ├── mistral.ts       # MistralProvider (future)
│   │   │   └── factory.ts       # Provider factory
│   │   └── types.ts             # Types TypeScript communs
│   └── utils/
│       └── cache.ts             # Système de cache simple
└── docs/
    └── plans/                   # Documentation design
```

### Variables d'Environnement

**OpenAI (3 workspaces séparés):**
```env
OPENAI_API_KEY_EDUGAMI=sk-proj-...
OPENAI_API_KEY_MEMOWAYS=sk-proj-...
OPENAI_API_KEY_STORYGAMI=sk-proj-...
```

**Autres services (1 clé par service, implémentation future):**
```env
ANTHROPIC_API_KEY=sk-ant-...
MISTRAL_API_KEY=...
```

## Flow de Données et Interface Utilisateur

### Flow Utilisateur

1. **Sélection provider** → Dropdown avec les services disponibles (OpenAI, Anthropic, etc.)
2. **Sélection workspace** → (Conditionnel) Si OpenAI, dropdown avec 3 options (Edugami, Memoways, Storygami). Sinon, passer à l'étape suivante.
3. **Chargement projets** → Appel API automatique pour récupérer la liste des projets
4. **Sélection projet** → Dropdown avec tous les projets disponibles
5. **Choix période** → Boutons rapides (semaine/mois/année) ou date picker custom
6. **Affichage résultats** → Coût total + tableau breakdown par modèle (noms natifs)
7. **Refresh manuel** → Bouton pour forcer la mise à jour des données

### Composants UI

- **ProviderSelector:** Dropdown avec les services LLM disponibles
- **WorkspaceSelector:** Dropdown conditionnel (visible uniquement pour OpenAI)
- **ProjectSelector:** Dropdown dynamique (loading state)
- **DateRangePicker:** 3 boutons période + 2 date inputs pour custom
- **CostDisplay:** Card avec montant total en dollars (prominent)
- **ModelBreakdown:** Tableau listant chaque modèle avec son coût (noms natifs du service)

### États de l'Interface

- Loading lors des appels API
- Messages d'erreur si échec API
- État vide si aucune donnée
- Cache indicator (timestamp "Dernière mise à jour")

## Architecture des Providers

### Interface ILLMProvider

Tous les providers implémentent cette interface TypeScript commune:

```typescript
interface ILLMProvider {
  // Identifiant unique du provider
  id: string;

  // Nom affiché dans l'UI
  name: string;

  // Le provider supporte-t-il les workspaces?
  supportsWorkspaces: boolean;

  // Liste des workspaces (retourne [] si non supporté)
  getWorkspaces(): Promise<Workspace[]>;

  // Liste des projets pour un workspace donné
  getProjects(workspace?: string): Promise<Project[]>;

  // Récupère les coûts pour un projet et une période
  getCosts(params: CostParams): Promise<CostData>;
}

interface CostParams {
  workspace?: string;
  projectId: string;
  startDate: string; // ISO 8601
  endDate: string;   // ISO 8601
}

interface CostData {
  total_cost_usd: number;
  last_updated: string;
  breakdown: ModelCost[];
}

interface ModelCost {
  model: string;        // Nom natif du modèle
  cost_usd: number;
  requests: number;
}
```

### OpenAIProvider (Implémentation Initiale)

**Spécificités:**
- `supportsWorkspaces: true`
- 3 workspaces: Edugami, Memoways, Storygami
- Chaque workspace a sa propre clé API

**Endpoints OpenAI:**

1. **Liste des projets:**
   ```
   GET https://api.openai.com/v1/organization/projects
   ```

2. **Données d'usage/coûts:**
   ```
   GET https://api.openai.com/v1/usage
   ```
   - Paramètres: `start_date`, `end_date`, `project_id`

### Providers Futurs

**AnthropicProvider:**
- `supportsWorkspaces: false`
- 1 seule clé API
- Endpoints: Console API Anthropic

**MistralProvider:**
- `supportsWorkspaces: false`
- 1 seule clé API
- Endpoints: Mistral Platform API

### Normalisation des Données

**Ce qui est normalisé:**
- Devises → toujours USD
- Dates → format ISO 8601
- Structure des réponses → interface commune

**Ce qui reste natif:**
- Noms des modèles (ex: "gpt-4-turbo", "claude-3-5-sonnet")
- Métadonnées spécifiques au service

### Gestion du Cache

- Cache côté serveur avec timestamp
- Durée: 5 minutes (configurable)
- Clé de cache: `${provider}_${workspace}_${project}_${dateRange}`
- Invalidation manuelle via bouton refresh

### Gestion des Erreurs

- Invalid API key → Message clair à l'utilisateur
- Rate limit → Retry avec backoff
- Network errors → Message d'erreur avec retry
- Provider non disponible → Afficher erreur, désactiver dans l'UI

## Déploiement et Configuration

### Développement Local

1. **Installation:**
   ```bash
   npm install
   cp .env.example .env.local
   # Ajouter les 3 clés API dans .env.local
   npm run dev
   ```

2. **Accès:** `http://localhost:3000`

3. **Hot reload:** Automatique avec Next.js

### Configuration Vercel

1. **Connexion GitHub:**
   - Initialiser git
   - Créer repo GitHub
   - Push du code

2. **Import dans Vercel:**
   - Connecter le repo
   - Détection automatique Next.js

3. **Variables d'environnement:**
   - Project Settings → Environment Variables
   - Ajouter les 3 clés API (marquer comme Secret)

4. **Déploiement:** Automatique sur push `main`

### Sécurité

- `.env.local` dans `.gitignore`
- `.env.example` avec placeholders
- Clés API server-side uniquement
- Vercel encrypts les variables

## Phases de Développement

### Phase 1 - Setup Initial & Architecture Providers
- Initialisation Next.js + TypeScript
- Configuration Tailwind
- Structure des dossiers avec `/lib/providers/`
- Création de l'interface `ILLMProvider`
- Provider factory pattern
- Git + .gitignore

### Phase 2 - OpenAI Provider & API Routes
- Implémentation complète `OpenAIProvider`
- `/api/providers` endpoint (liste des providers disponibles)
- `/api/workspaces` endpoint (conditionnel)
- `/api/projects` endpoint (avec support provider + workspace)
- `/api/costs` endpoint (avec support provider + workspace)
- Système de cache avec clés composées
- Gestion des erreurs

### Phase 3 - Interface Utilisateur Multi-Provider
- Layout et page principale
- `ProviderSelector` component
- `WorkspaceSelector` component (conditionnel)
- `ProjectSelector` component (dynamique)
- `DateRangePicker` component
- `CostDisplay` et `ModelBreakdown` components
- États loading/erreur
- Logique conditionnelle pour workspace selector

### Phase 4 - Tests et Déploiement
- Tests locaux avec les 3 workspaces OpenAI
- Validation de l'architecture extensible
- Configuration GitHub
- Configuration Vercel avec variables d'environnement
- Déploiement production
- Vérification finale

### Phase 5 - Providers Additionnels (Future)
- Implémentation `AnthropicProvider`
- Implémentation `MistralProvider`
- Tests avec les nouveaux providers
- Documentation pour ajouter de nouveaux providers

## Notes Techniques

- Next.js App Router (pas Pages Router)
- TypeScript strict mode avec interfaces rigoureuses
- Pattern Provider pour extensibilité
- Factory pattern pour instancier les providers
- Tailwind avec configuration par défaut
- Pas de base de données nécessaire
- Cache en mémoire (Map avec clés composées)
- Noms de modèles natifs (pas de mapping)
