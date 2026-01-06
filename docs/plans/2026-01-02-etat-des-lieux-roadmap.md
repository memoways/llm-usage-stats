# État des Lieux et Roadmap - LLM Cost Tracker

**Date:** 2 janvier 2026  
**Dernière mise à jour:** 2 janvier 2026 à 21:45  
**Version:** 0.1.0  
**Auteur:** Ulrich Fischer

> ✅ **Mise à jour :** La configuration Notion est terminée et la première collecte a été effectuée avec succès !

---

## 1. État des Lieux - Ce qui est Développé

### 1.1 Architecture Générale

| Composant | Status | Description |
|-----------|--------|-------------|
| Next.js 15 App Router | ✅ Complet | Framework principal avec React 19 |
| TypeScript strict mode | ✅ Complet | Typage complet de l'application |
| Tailwind CSS | ✅ Complet | Styling de l'interface |
| Pattern Provider | ✅ Complet | Interface `ILLMProvider` extensible |

### 1.2 Providers LLM Implémentés

| Provider | Workspaces | Projets | Coûts | Notes |
|----------|------------|---------|-------|-------|
| **OpenAI** | ✅ Multi | ✅ Oui | ✅ Calculés | Pagination complète, pricing par modèle |
| **Anthropic** | ✅ Multi | ✅ API Keys | ⚠️ Non dispo | API ne fournit pas les données de coût |
| **ElevenLabs** | ❌ Non | ❌ Non | ✅ Estimés | Usage caractères, quota mensuel |
| **Deepgram** | ✅ Projets | ❌ Non | ✅ Estimés | Usage audio en heures/minutes |
| **OpenRouter** | ❌ Non | ❌ Non | ✅ Oui | Multi-modèles, crédits prépayés |

### 1.3 Fonctionnalités Core

| Fonctionnalité | Status | Fichiers |
|----------------|--------|----------|
| Sélection provider | ✅ Complet | `ProviderSelector.tsx` |
| Sélection workspace | ✅ Complet | `WorkspaceSelector.tsx` |
| Sélection projet | ✅ Complet | `ProjectSelector.tsx` |
| Sélection dates | ✅ Complet | `DateRangePicker.tsx` |
| Affichage coûts | ✅ Complet | `CostDisplay.tsx` |
| Breakdown modèles | ✅ Complet | `ModelBreakdown.tsx` |
| Workspace Total | ✅ Complet | Intégré dans `page.tsx` |
| Cache API (5 min) | ✅ Complet | `utils/cache.ts` |

### 1.4 Rapport Mensuel Automatisé

| Fonctionnalité | Status | Fichiers |
|----------------|--------|----------|
| Intégration Notion | ✅ Complet | `lib/notion.ts` |
| Base Services (relationnelle) | ✅ Complet | Structure avec rollups |
| Base Usages (relationnelle) | ✅ Complet | Entrées détaillées par collecte |
| API de collecte | ✅ Complet | `api/collect/route.ts` |
| Page de rapport | ✅ Complet | `app/report/page.tsx` |
| Intégration Resend | ✅ Complet | `lib/email.ts` |
| API envoi email | ✅ Complet | `api/send-report/route.ts` |
| Panneau collecte manuelle | ✅ Complet | `MonthlyCollectionPanel.tsx` |
| Champs debug/validation | ✅ Complet | Log Status, Statut Collecte |

### 1.5 Documentation

| Document | Status | Chemin |
|----------|--------|--------|
| README principal | ✅ Complet | `README.md` |
| Setup OpenAI API | ✅ Complet | `docs/OPENAI_API_SETUP.md` |
| Setup Notion | ✅ Complet | `docs/NOTION_SETUP.md` |
| Déploiement Vercel | ✅ Complet | `docs/VERCEL_DEPLOYMENT.md` |

### 1.6 API Routes

| Route | Méthode | Status | Description |
|-------|---------|--------|-------------|
| `/api/providers` | GET | ✅ | Liste des providers disponibles |
| `/api/workspaces` | GET | ✅ | Workspaces d'un provider |
| `/api/projects` | GET | ✅ | Projets d'un workspace |
| `/api/costs` | GET | ✅ | Coûts pour une période |
| `/api/collect` | GET/POST | ✅ | Collecte mensuelle |
| `/api/report` | GET | ✅ | Données de rapport |
| `/api/send-report` | POST | ✅ | Envoi email rapport |

---

## 2. Ce qui Reste à Faire

### 2.1 Configuration Utilisateur (Priorité Haute)

#### ✅ Terminé le 2 janvier 2026 :

- [x] **Bases Notion créées et configurées**
  - [x] Base "Services LLM" : `2e1b592d249045329c514796618d8622`
  - [x] Base "Usages LLM" : `0b758b582dcf4f60b53197bc128a5a0c`
  - [x] Relation bidirectionnelle configurée
  - [x] Propriétés avec accents : `Modèles`, `Coût USD`, `Requêtes`
  - [x] Intégration Notion partagée avec les bases

- [x] **Variables d'environnement configurées**
  - [x] `NOTION_API_KEY` : `ntn_217668771232...`
  - [x] `NOTION_SERVICES_DB_ID` : ✅
  - [x] `NOTION_USAGES_DB_ID` : ✅
  - [x] `COLLECT_SECRET_TOKEN` : ✅
  - [x] `REPORT_SECRET_TOKEN` : ✅

- [x] **Première collecte réussie (janvier 2026)**
  - Coût total : **$14.82**
  - OpenAI : $3.02 (28 requêtes)
  - ElevenLabs : $9.89 (32 960 caractères)
  - OpenRouter : $1.91 (crédits)
  - Deepgram : $0.01 (4 requêtes)
  - Anthropic : $0.00

#### ⏳ À faire :

- [ ] **Configurer Resend** (optionnel - pour emails automatiques)
  - [ ] `RESEND_API_KEY`
  - [ ] `REPORT_EMAIL_TO`

- [ ] **Déployer sur Vercel** selon `docs/VERCEL_DEPLOYMENT.md`
  - [ ] Importer le projet
  - [ ] Configurer les variables d'environnement
  - [ ] Mettre à jour `NEXT_PUBLIC_APP_URL`

### 2.2 Automatisation Cron (Priorité Moyenne)

La collecte mensuelle est actuellement **manuelle**. Pour l'automatiser :

#### Option A : Vercel Cron (Plan Pro requis - $20/mois)
- [ ] Ajouter `vercel.json` avec configuration cron
- [ ] Tester le déclenchement automatique

#### Option B : GitHub Actions (Gratuit)
- [ ] Créer `.github/workflows/monthly-collect.yml`
- [ ] Configurer les secrets GitHub
- [ ] Tester le workflow

#### Option C : Service externe (cron-job.org)
- [ ] Créer un compte sur cron-job.org
- [ ] Configurer le job mensuel

### 2.3 Améliorations Fonctionnelles (Priorité Basse)

| Fonctionnalité | Priorité | Complexité | Description |
|----------------|----------|------------|-------------|
| Support Mistral | Basse | Moyenne | Nouveau provider |
| Export CSV | Basse | Faible | Export des données |
| Export PDF | Basse | Moyenne | Rapport PDF téléchargeable |
| Graphiques avancés | Basse | Moyenne | Visualisations Chart.js/Recharts |
| Alertes de coûts | Basse | Moyenne | Notification si seuil dépassé |
| Historique graphique | Basse | Moyenne | Évolution sur plusieurs mois |
| Comparaison providers | Basse | Faible | Vue comparative |
| Mode sombre | Basse | Faible | Toggle dark/light |

### 2.4 Améliorations Techniques (Priorité Basse)

| Amélioration | Priorité | Complexité | Description |
|--------------|----------|------------|-------------|
| Tests unitaires | Basse | Moyenne | Jest + Testing Library |
| Tests E2E | Basse | Haute | Playwright/Cypress |
| CI/CD complet | Basse | Moyenne | GitHub Actions pipeline |
| Monitoring | Basse | Faible | Sentry ou similaire |
| Rate limiting | Basse | Faible | Protéger les API routes |
| Authentification complète | Basse | Haute | NextAuth si multi-utilisateur |

---

## 3. Roadmap Détaillée

### Phase 1 : Mise en Production (En cours)

**Objectif :** Application fonctionnelle déployée sur Vercel

| # | Tâche | Estimation | Status |
|---|-------|------------|--------|
| 1.1 | Créer bases Notion (Services + Usages) | 30 min | ✅ Fait |
| 1.2 | Configurer les rollups | 15 min | ✅ Fait |
| 1.3 | Créer intégration Notion et récupérer clé | 10 min | ✅ Fait |
| 1.4 | Générer tokens secrets | 5 min | ✅ Fait |
| 1.5 | Créer compte Resend et récupérer clé | 10 min | ⏳ Optionnel |
| 1.6 | Configurer `.env.local` complet | 10 min | ✅ Fait |
| 1.7 | Tester collecte en local | 15 min | ✅ Fait |
| 1.8 | Créer projet Vercel | 10 min | ⏳ À faire |
| 1.9 | Configurer variables Vercel | 15 min | ⏳ À faire |
| 1.10 | Déployer et tester | 15 min | ⏳ À faire |
| 1.11 | Mettre à jour `NEXT_PUBLIC_APP_URL` | 5 min | ⏳ À faire |
| **Progression Phase 1** | | **70% complété** | |

### Phase 2 : Automatisation (Optionnel)

**Objectif :** Collecte mensuelle automatique sans intervention

| # | Tâche | Estimation | Option |
|---|-------|------------|--------|
| 2.1a | Configurer Vercel Cron | 30 min | Plan Pro |
| 2.1b | Créer workflow GitHub Actions | 45 min | Gratuit |
| 2.1c | Configurer cron-job.org | 20 min | Gratuit |
| 2.2 | Tester premier déclenchement auto | 15 min | - |
| 2.3 | Vérifier email reçu | 5 min | - |
| **Total Phase 2** | | **~1h** | |

### Phase 3 : Améliorations (Futur)

**Objectif :** Fonctionnalités supplémentaires selon besoins

| # | Tâche | Estimation | Priorité |
|---|-------|------------|----------|
| 3.1 | Ajouter provider Mistral | 2-4h | Basse |
| 3.2 | Export CSV des données | 2h | Basse |
| 3.3 | Graphiques avec Recharts | 4-6h | Basse |
| 3.4 | Alertes de seuil de coûts | 3-4h | Basse |
| 3.5 | Tests unitaires (base) | 4-6h | Basse |

---

## 4. Structure du Projet

```
llm-cost-tracker/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── collect/route.ts      # Collecte mensuelle
│   │   │   ├── costs/route.ts        # Données de coûts
│   │   │   ├── projects/route.ts     # Liste projets
│   │   │   ├── providers/route.ts    # Liste providers
│   │   │   ├── report/route.ts       # API rapport
│   │   │   ├── send-report/route.ts  # Envoi email
│   │   │   └── workspaces/route.ts   # Liste workspaces
│   │   ├── report/page.tsx           # Page rapport mensuel
│   │   ├── page.tsx                  # Page principale
│   │   ├── layout.tsx                # Layout global
│   │   └── globals.css               # Styles globaux
│   ├── components/
│   │   ├── CostDisplay.tsx           # Affichage coût total
│   │   ├── DateRangePicker.tsx       # Sélection dates
│   │   ├── ModelBreakdown.tsx        # Tableau modèles
│   │   ├── MonthlyCollectionPanel.tsx # Panneau collecte
│   │   ├── ProjectSelector.tsx       # Dropdown projets
│   │   ├── ProviderSelector.tsx      # Dropdown providers
│   │   └── WorkspaceSelector.tsx     # Dropdown workspaces
│   ├── lib/
│   │   ├── email.ts                  # Intégration Resend
│   │   ├── notion.ts                 # Client Notion
│   │   ├── types.ts                  # Types TypeScript
│   │   └── providers/
│   │       ├── interface.ts          # Interface ILLMProvider
│   │       ├── factory.ts            # Factory pattern
│   │       ├── openai.ts             # Provider OpenAI
│   │       ├── anthropic.ts          # Provider Anthropic
│   │       ├── elevenlabs.ts         # Provider ElevenLabs
│   │       ├── deepgram.ts           # Provider Deepgram
│   │       └── openrouter.ts         # Provider OpenRouter
│   └── utils/
│       └── cache.ts                  # Cache en mémoire
├── docs/
│   ├── NOTION_SETUP.md               # Guide config Notion
│   ├── OPENAI_API_SETUP.md           # Guide API OpenAI
│   ├── VERCEL_DEPLOYMENT.md          # Guide déploiement
│   └── plans/                        # Plans et roadmaps
├── .env.local                        # Variables locales (gitignored)
├── package.json                      # Dépendances
├── tailwind.config.ts                # Config Tailwind
├── tsconfig.json                     # Config TypeScript
└── README.md                         # Documentation principale
```

---

## 5. Variables d'Environnement Requises

| Variable | Status | Description |
|----------|--------|-------------|
| `NOTION_API_KEY` | ✅ Configuré | Clé API Notion |
| `NOTION_SERVICES_DB_ID` | ✅ Configuré | `2e1b592d249045329c514796618d8622` |
| `NOTION_USAGES_DB_ID` | ✅ Configuré | `0b758b582dcf4f60b53197bc128a5a0c` |
| `COLLECT_SECRET_TOKEN` | ✅ Configuré | Token sécurité collecte |
| `REPORT_SECRET_TOKEN` | ✅ Configuré | Token sécurité rapport |
| `RESEND_API_KEY` | ⏳ À configurer | Clé API Resend (optionnel) |
| `REPORT_EMAIL_TO` | ⏳ À configurer | Email destinataire (optionnel) |
| `OPENAI_API_KEY_*` | ✅ Configuré | Clés API OpenAI (multi-workspace) |
| `ANTHROPIC_API_KEY` | ✅ Configuré | Clé API Anthropic |
| `ELEVENLABS_API_KEY` | ✅ Configuré | Clé API ElevenLabs |
| `DEEPGRAM_API_KEY` | ✅ Configuré | Clé API Deepgram |
| `OPENROUTER_API_KEY` | ✅ Configuré | Clé API OpenRouter |
| `NEXT_PUBLIC_APP_URL` | ⏳ À mettre à jour | URL Vercel après déploiement |

```env
# Exemple de configuration (voir .env pour les vraies valeurs)
NOTION_API_KEY=ntn_xxx
NOTION_SERVICES_DB_ID=2e1b592d249045329c514796618d8622
NOTION_USAGES_DB_ID=0b758b582dcf4f60b53197bc128a5a0c
COLLECT_SECRET_TOKEN=a1b2c3d4...
REPORT_SECRET_TOKEN=z6y5x4w3...
```

---

## 6. Commandes Utiles

```bash
# Développement
npm run dev           # Serveur dev (http://localhost:3000)

# Production
npm run build         # Build production
npm run start         # Serveur production

# Qualité
npm run lint          # Vérifier le code

# Collecte manuelle (via curl)
curl -X POST "https://votre-app.vercel.app/api/collect?token=XXX&month=2026-01&send_email=true"

# Générer token secret
openssl rand -hex 32
```

---

## 7. Prochaines Actions Immédiates

### ✅ Fait :
1. ~~**Créer les bases Notion** en suivant `docs/NOTION_SETUP.md`~~ ✅
2. ~~**Configurer `.env.local`** avec toutes les variables~~ ✅
3. ~~**Tester la collecte** via le panneau sur la page principale~~ ✅ (janvier 2026 collecté)

### ⏳ À faire :
4. **Obtenir une clé Resend** sur https://resend.com (optionnel pour emails)
5. **Déployer sur Vercel** en suivant `docs/VERCEL_DEPLOYMENT.md`
6. **Configurer l'automatisation** (cron mensuel)

---

## 8. Notes de Mise à Jour

### 2 janvier 2026 - Configuration Notion

- Correction des noms de propriétés pour utiliser les accents français :
  - `Modeles` → `Modèles`
  - `Cout USD` → `Coût USD`
  - `Requetes` → `Requêtes`
- Première collecte réussie avec données de 5 providers
- Page de rapport fonctionnelle avec design dark mode
- Les données sont maintenant visibles dans Notion

---

*Document généré le 2 janvier 2026*  
*Dernière mise à jour : 2 janvier 2026 à 21:45*

