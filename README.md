# LLM Cost Tracker

Application web multi-services pour suivre et analyser les coûts de différents fournisseurs LLM (OpenAI, Anthropic, Mistral, etc.) par projet et par période.

## Features

- 🌐 **Multi-services:** Architecture extensible supportant plusieurs providers LLM
- 🏢 **Multi-workspaces:** Support des workspaces multiples (OpenAI: Edugami, Memoways, Storygami)
- 📊 **Workspace Total:** Vue des coûts globaux pour tous les projets d'un workspace
- 💰 **Project Costs:** Coûts détaillés par projet avec breakdown par modèle
- 🔍 **Model Breakdown:** Affichage des coûts par modèle (gpt-4o, gpt-4o-mini, etc.)
- 📅 **Périodes flexibles:** Semaine, mois, année ou sélection custom
- 🔄 **Pagination complète:** Récupération de toutes les données même pour de longues périodes
- 🔒 **Sécurité:** Clés API stockées côté serveur uniquement (.env gitignored)
- 🔌 **Extensible:** Architecture provider permettant d'ajouter facilement de nouveaux services

## Services Supportés

### Actuellement Implémentés
- ✅ **OpenAI** - 3 workspaces séparés (Edugami, Memoways, Storygami)

### À Venir
- ⏳ **Anthropic** - Console API
- ⏳ **Mistral** - Platform API
- ⏳ **Autres services LLM**

## Stack Technique

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **Déploiement:** Vercel
- **Architecture:** Provider pattern avec interface commune

## Structure du Projet

```
llm-cost-tracker/
├── src/
│   ├── app/                     # Pages et API routes Next.js
│   │   ├── page.tsx            # Page principale
│   │   ├── layout.tsx          # Layout global
│   │   └── api/                # API endpoints
│   │       ├── providers/      # Liste des providers
│   │       ├── workspaces/     # Liste des workspaces (conditionnel)
│   │       ├── projects/       # Liste des projets
│   │       └── costs/          # Données de coûts
│   ├── components/             # Composants React
│   │   ├── ProviderSelector.tsx
│   │   ├── WorkspaceSelector.tsx
│   │   ├── ProjectSelector.tsx
│   │   ├── DateRangePicker.tsx
│   │   ├── CostDisplay.tsx
│   │   └── ModelBreakdown.tsx
│   ├── lib/                    # Logique métier
│   │   ├── providers/         # Providers LLM
│   │   │   ├── interface.ts   # Interface ILLMProvider
│   │   │   ├── openai.ts      # OpenAIProvider
│   │   │   ├── anthropic.ts   # AnthropicProvider (future)
│   │   │   ├── mistral.ts     # MistralProvider (future)
│   │   │   └── factory.ts     # Provider factory
│   │   └── types.ts           # Types TypeScript communs
│   └── utils/                  # Utilitaires
│       └── cache.ts           # Système de cache
├── docs/                       # Documentation
│   └── plans/                 # Documents de design
├── .env.local                 # Variables d'environnement (local)
├── .env.example              # Template des variables
└── README.md
```

## Installation et Développement Local

### Prérequis

- Node.js 18+
- npm ou yarn
- Clés API pour les services LLM que vous souhaitez utiliser

### Setup Initial

1. **Cloner ou initialiser le projet:**
   ```bash
   cd "/Users/ulrich/Code projects/OpenAI Cost"
   ```

2. **Installer les dépendances:**
   ```bash
   npm install
   ```

3. **Configurer les variables d'environnement:**
   ```bash
   cp .env.example .env.local
   ```

   Éditer `.env.local` et ajouter vos clés API:
   ```env
   # OpenAI (3 workspaces séparés)
   OPENAI_API_KEY_EDUGAMI=sk-proj-your-key-here
   OPENAI_API_KEY_MEMOWAYS=sk-proj-your-key-here
   OPENAI_API_KEY_STORYGAMI=sk-proj-your-key-here

   # Autres services (optionnel pour l'instant)
   # ANTHROPIC_API_KEY=sk-ant-your-key-here
   # MISTRAL_API_KEY=your-key-here
   ```

4. **Lancer le serveur de développement:**
   ```bash
   npm run dev
   ```

5. **Ouvrir dans le navigateur:**
   ```
   http://localhost:3000
   ```

## Déploiement sur Vercel

### Étapes

1. **Initialiser Git (si pas déjà fait):**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Créer un repo GitHub:**
   - Créer un nouveau repository sur GitHub
   - Suivre les instructions pour pusher le code

3. **Connecter à Vercel:**
   - Aller sur [vercel.com](https://vercel.com)
   - Importer le repository GitHub
   - Vercel détecte automatiquement Next.js

4. **Configurer les variables d'environnement:**
   - Dans Vercel: Project Settings → Environment Variables
   - Ajouter les clés API pour OpenAI:
     - `OPENAI_API_KEY_EDUGAMI`
     - `OPENAI_API_KEY_MEMOWAYS`
     - `OPENAI_API_KEY_STORYGAMI`
   - (Optionnel) Ajouter les clés pour d'autres services:
     - `ANTHROPIC_API_KEY`
     - `MISTRAL_API_KEY`
   - Marquer toutes les clés comme "Secret"

5. **Déployer:**
   - Push sur `main` déclenche un déploiement automatique
   - L'URL de production est fournie par Vercel

## Sécurité

⚠️ **Important:**
- Ne jamais commiter `.env.local` dans Git
- Les clés API sont accessibles uniquement côté serveur (API routes)
- Utiliser les variables d'environnement Vercel pour la production
- Les clés ne transitent jamais vers le client

## API Endpoints

### GET /api/providers

Récupère la liste des providers LLM disponibles.

**Response:**
```json
{
  "providers": [
    {
      "id": "openai",
      "name": "OpenAI",
      "supportsWorkspaces": true
    }
  ]
}
```

### GET /api/workspaces

Récupère la liste des workspaces pour un provider (si supporté).

**Query params:**
- `provider`: ID du provider (ex: `openai`)

**Response:**
```json
{
  "workspaces": [
    { "id": "edugami", "name": "Edugami" },
    { "id": "memoways", "name": "Memoways" },
    { "id": "storygami", "name": "Storygami" }
  ]
}
```

### GET /api/projects

Récupère la liste des projets.

**Query params:**
- `provider`: ID du provider
- `workspace`: ID du workspace (optionnel, requis si provider supporte workspaces)

**Response:**
```json
{
  "projects": [
    { "id": "proj_123", "name": "Project A" },
    { "id": "proj_456", "name": "Project B" }
  ]
}
```

### GET /api/costs

Récupère les coûts pour un projet et une période.

**Query params:**
- `provider`: ID du provider
- `workspace`: ID du workspace (optionnel)
- `project_id`: ID du projet
- `start_date`: Date début (ISO 8601)
- `end_date`: Date fin (ISO 8601)

**Response:**
```json
{
  "total_cost_usd": 53.68,
  "last_updated": "2025-12-22T10:30:00Z",
  "breakdown": [
    {
      "model": "gpt-4-turbo",
      "cost_usd": 45.23,
      "requests": 150
    },
    {
      "model": "gpt-3.5-turbo",
      "cost_usd": 8.45,
      "requests": 890
    }
  ]
}
```

## Architecture Provider

L'application utilise un pattern Provider pour supporter différents services LLM. Chaque provider implémente l'interface `ILLMProvider`:

```typescript
interface ILLMProvider {
  id: string;
  name: string;
  supportsWorkspaces: boolean;
  getWorkspaces(): Promise<Workspace[]>;
  getProjects(workspace?: string): Promise<Project[]>;
  getCosts(params: CostParams): Promise<CostData>;
}
```

### Ajouter un Nouveau Provider

1. Créer un nouveau fichier dans `src/lib/providers/`
2. Implémenter l'interface `ILLMProvider`
3. Ajouter le provider dans la factory (`src/lib/providers/factory.ts`)
4. Ajouter les variables d'environnement nécessaires

Voir la [documentation de design](docs/plans/2025-12-22-openai-cost-tracker-design.md) pour plus de détails.

## Cache

- **Durée:** 5 minutes par défaut
- **Clé:** `${provider}_${workspace}_${project}_${dateRange}`
- **Invalidation:** Bouton refresh manuel dans l'UI
- **Stockage:** En mémoire (Map côté serveur)

## Développement

### Scripts disponibles

```bash
npm run dev          # Serveur de développement
npm run build        # Build production
npm run start        # Serveur production
npm run lint         # Linter
```

### Technologies

- **Next.js:** Framework React avec SSR/SSG
- **TypeScript:** Typage statique
- **Tailwind CSS:** Utility-first CSS
- **React:** Library UI

## Support

Pour toute question ou problème, consulter:
- [Documentation du design](docs/plans/2025-12-22-openai-cost-tracker-design.md)
- [Changelog](CHANGELOG.md)
- Documentation des APIs:
  - [OpenAI API](https://platform.openai.com/docs/api-reference)
  - [Anthropic API](https://docs.anthropic.com/en/api)
  - [Mistral API](https://docs.mistral.ai/)

## Roadmap

- [x] Architecture multi-provider extensible
- [x] Support OpenAI (3 workspaces)
- [x] Implémentation complète OpenAI avec pagination
- [x] Workspace Total (tous projets combinés)
- [x] Model-level breakdown avec pricing
- [ ] Support Anthropic
- [ ] Support Mistral
- [ ] Export des données (CSV, PDF)
- [ ] Graphiques et visualisations avancées
- [ ] Alertes de coûts

## License

Privé - Usage interne uniquement
