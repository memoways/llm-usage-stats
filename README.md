# LLM Cost Tracker

Application web multi-services pour suivre et analyser les coûts de différents fournisseurs LLM (OpenAI, Anthropic, Mistral, etc.) par projet et par période.

## 🎯 Pourquoi cette application ?

**Le problème:** La console d'administration d'OpenAI ne permet pas de sélectionner des dates spécifiques pour visualiser les coûts. On ne peut voir que les données **mois par mois**, sans possibilité de consulter facilement :
- Les coûts sur une période personnalisée (ex: du 15 janvier au 28 février)
- Le total sur plusieurs mois
- Les coûts sur une année entière
- Une comparaison entre différentes périodes

**La solution:** Cette application a été développée par **Ulrich Fischer** pour pallier ces limitations et offrir :
- ✅ Sélection de dates personnalisées (n'importe quelle période)
- ✅ Vue des coûts sur plusieurs mois/années
- ✅ Support de plusieurs providers LLM (OpenAI, Anthropic, etc.)
- ✅ Breakdown détaillé par modèle avec calcul des coûts réels

## Features

- 🌐 **Multi-services:** Architecture extensible supportant plusieurs providers LLM
- 🏢 **Multi-workspaces:** Support des workspaces multiples par provider
- 📊 **Workspace Total:** Vue des coûts globaux pour tous les projets d'un workspace
- 💰 **Project Costs:** Coûts détaillés par projet avec breakdown par modèle
- 🔍 **Model Breakdown:** Affichage des coûts par modèle (gpt-4o, gpt-4o-mini, claude-3-5-sonnet, etc.)
- 📅 **Périodes flexibles:** Semaine, mois, année ou sélection custom
- 🔄 **Pagination complète:** Récupération de toutes les données même pour de longues périodes
- 🔒 **Sécurité:** Clés API stockées côté serveur uniquement (.env gitignored)
- 🔌 **Extensible:** Architecture provider permettant d'ajouter facilement de nouveaux services

## Services Supportés

### Fonctionnel
- ✅ **OpenAI** - Support multi-workspaces avec projets, données d'usage complètes
- ✅ **ElevenLabs** - Usage de caractères et quota mensuel (text-to-speech)

### Implémenté mais en attente
- ⚠️ **Anthropic** - Provider implémenté (workspaces, API keys), mais **l'API Anthropic ne fournit pas les données d'usage/coûts** (décembre 2024). En attente qu'Anthropic ouvre leur API. Les workspaces et API keys sont listés, mais les coûts affichent "non disponible".

### À Venir
- ⏳ **Mistral** - Platform API
- ⏳ **Autres services LLM**

## ⚠️ Important: Différences entre Providers

### OpenAI
```
Organization
└── Workspace
    └── Projects
        └── API Keys (multiple per project)
```
- **Projects** = unité de facturation
- Les données d'usage sont disponibles via l'API ✅
- **Workspace Total** = somme des coûts de tous les projets

### Anthropic
```
Organization
└── Workspaces
    └── API Keys (affichées comme "Projects" dans cette app)
```
- **Workspaces** = unité de facturation (pas de concept de projet)
- Les **API Keys** sont listées dans le dropdown "Project"

⚠️ **LIMITATION MAJEURE (décembre 2024):**  
Anthropic **ne fournit PAS de données d'usage/facturation via leur API**. 

L'Admin API permet uniquement :
- ✅ Lister les workspaces
- ✅ Lister les API keys
- ✅ Gérer les membres et invitations
- ❌ **Pas d'accès aux données d'usage**
- ❌ **Pas d'accès aux coûts**

**Conséquence:** Le provider Anthropic est implémenté mais affiche "Usage non disponible". Les données doivent être consultées manuellement sur : https://console.anthropic.com/settings/billing

Nous attendons qu'Anthropic ouvre leur API pour ajouter cette fonctionnalité.

### ElevenLabs
```
Account
└── Subscription (tier: free, starter, creator, pro, scale, etc.)
    └── Character Usage
```
- **Facturation par caractères** (pas par tokens comme les LLM)
- L'API fournit l'usage mensuel courant et le quota
- **Coût estimé** basé sur le tarif du plan (starter: ~$0.30/1000 chars)
- Affiche : caractères utilisés / limite mensuelle (%)

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
│   │       ├── workspaces/     # Liste des workspaces
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
│   │   │   ├── anthropic.ts   # AnthropicProvider
│   │   │   ├── elevenlabs.ts  # ElevenLabsProvider
│   │   │   └── factory.ts     # Provider factory
│   │   └── types.ts           # Types TypeScript communs
│   └── utils/                  # Utilitaires
│       └── cache.ts           # Système de cache
├── .env.local                 # Variables d'environnement (local, gitignored)
├── .env.example              # Template des variables
└── README.md
```

## Installation et Développement Local

### Prérequis

- Node.js 18+
- npm ou yarn
- Clés API pour les services LLM que vous souhaitez utiliser

### Setup Initial

1. **Cloner le repository:**
   ```bash
   git clone <repository-url>
   cd llm-cost-tracker
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
   # OpenAI - Une clé Admin API par workspace
   # Créer des clés avec permissions "Usage" sur: https://platform.openai.com/api-keys
   OPENAI_API_KEY_WORKSPACE1=sk-admin-your-key-here
   OPENAI_API_KEY_WORKSPACE2=sk-admin-your-key-here

   # Anthropic - Une seule Admin API key pour tous les workspaces
   # Créer une clé Admin sur: https://console.anthropic.com/settings/admin-keys
   ANTHROPIC_ADMIN_KEY=sk-ant-admin-your-key-here

   # ElevenLabs - API key pour l'usage text-to-speech
   # Créer une clé sur: https://elevenlabs.io/app/settings/api-keys
   ELEVENLABS_API_KEY=sk_your-key-here

   # Autres services (optionnel)
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

## Configuration des Workspaces OpenAI

Pour chaque workspace OpenAI que vous souhaitez suivre :

1. Aller sur https://platform.openai.com/api-keys
2. Créer une clé API avec les permissions **Admin** (pour accéder aux données d'usage)
3. Ajouter la clé dans `.env.local` avec le pattern : `OPENAI_API_KEY_<WORKSPACE_NAME>`

Exemple pour 2 workspaces :
```env
OPENAI_API_KEY_PRODUCTION=sk-admin-xxx...
OPENAI_API_KEY_DEVELOPMENT=sk-admin-xxx...
```

## Déploiement sur Vercel

1. **Pousser le code sur GitHub**

2. **Connecter à Vercel:**
   - Aller sur [vercel.com](https://vercel.com)
   - Importer le repository GitHub

3. **Configurer les variables d'environnement:**
   - Dans Vercel: Project Settings → Environment Variables
   - Ajouter toutes les clés API
   - Marquer comme "Secret"

4. **Déployer:**
   - Push sur `main` déclenche un déploiement automatique

## Sécurité

⚠️ **Important:**
- Ne jamais commiter `.env.local` dans Git
- Les clés API sont accessibles uniquement côté serveur (API routes)
- Utiliser les variables d'environnement Vercel pour la production
- Les clés ne transitent jamais vers le client

## API Endpoints

### GET /api/providers
Liste des providers LLM disponibles.

### GET /api/workspaces?provider=openai
Liste des workspaces pour un provider.

### GET /api/projects?provider=openai&workspace=xxx
Liste des projets pour un workspace.

### GET /api/costs
Récupère les coûts pour un projet et une période.

**Query params:**
- `provider`: ID du provider
- `workspace`: ID du workspace
- `project_id`: ID du projet (optionnel pour le total workspace)
- `start_date`: Date début (ISO 8601)
- `end_date`: Date fin (ISO 8601)

## Architecture Provider

L'application utilise un pattern Provider pour supporter différents services LLM :

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
3. Enregistrer le provider dans `factory.ts`
4. Ajouter les variables d'environnement nécessaires

## Cache

- **Durée:** 5 minutes par défaut
- **Clé:** `${provider}_${workspace}_${project}_${dateRange}`
- **Invalidation:** Bouton refresh manuel dans l'UI

## Scripts disponibles

```bash
npm run dev          # Serveur de développement
npm run build        # Build production
npm run start        # Serveur production
npm run lint         # Linter
```

## Roadmap

- [x] Architecture multi-provider extensible
- [x] Support OpenAI avec pagination complète
- [x] Workspace Total (tous projets combinés)
- [x] Model-level breakdown avec pricing
- [x] Support Anthropic (workspaces dynamiques) - ⚠️ En attente API usage Anthropic
- [x] Support ElevenLabs (caractères / quota mensuel)
- [ ] Support Mistral
- [ ] Export des données (CSV, PDF)
- [ ] Graphiques et visualisations avancées
- [ ] Alertes de coûts

## Auteur

Développé par **Ulrich Fischer** - Décembre 2024

## License

MIT
