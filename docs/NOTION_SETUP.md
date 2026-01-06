# Configuration Notion pour le Rapport Mensuel

Ce guide explique comment configurer Notion avec une structure relationnelle pour stocker les données de coûts LLM.

## Architecture des Bases de Données

L'application utilise **2 bases de données liées** :

```
┌─────────────────────┐       ┌─────────────────────────────────────────┐
│   Services LLM      │       │            Usages LLM                   │
│   (5 entrées)       │       │   (1 entrée par projet/mois)            │
├─────────────────────┤       ├─────────────────────────────────────────┤
│ • OpenAI            │◄──────│ 2026-01 - OpenAI - Production           │
│ • Anthropic         │◄──────│ 2026-01 - OpenAI - Development          │
│ • ElevenLabs        │◄──────│ 2026-01 - Anthropic - Workspace1        │
│ • Deepgram          │       │ 2026-01 - ElevenLabs - Default          │
│ • OpenRouter        │       │ ...                                      │
├─────────────────────┤       └─────────────────────────────────────────┘
│ ROLLUPS:            │
│ • Total Coût USD    │ ◄─── Somme automatique de tous les usages
│ • Total Tokens      │
│ • Nb Collectes      │
│ • Dernière Collecte │
└─────────────────────┘
```

## Étape 1 : Créer une Intégration Notion

1. Allez sur https://www.notion.so/my-integrations
2. Cliquez sur **"+ New integration"**
3. Donnez un nom : `LLM Cost Tracker`
4. Sélectionnez le workspace approprié
5. Capabilities requises :
   - ✅ Read content
   - ✅ Insert content
   - ✅ Update content
6. Cliquez sur **"Submit"**
7. Copiez le **Internal Integration Secret** (commence par `secret_`)

## Étape 2 : Créer la Base "Services LLM"

Cette base contient une entrée par provider LLM.

### 2.1 Création
1. Créez une nouvelle page dans Notion
2. Tapez `/database` et choisissez **"Database - Full page"**
3. Nommez-la : `Services LLM`

### 2.2 Propriétés à configurer

| Nom | Type | Configuration |
|-----|------|---------------|
| **Nom** | Title | (par défaut) |
| **ID Provider** | Text | ID technique (openai, anthropic, etc.) |
| **Statut** | Select | Options: `Actif`, `Inactif`, `En attente API` |
| **URL Console** | URL | Lien vers la console du service |
| **Notes** | Text | Informations supplémentaires |

> ⚠️ Les propriétés Relation et Rollup seront ajoutées après la création de la base Usages.

### 2.3 Données initiales

Créez ces 5 entrées :

| Nom | ID Provider | Statut | URL Console |
|-----|-------------|--------|-------------|
| OpenAI | openai | Actif | https://platform.openai.com |
| Anthropic | anthropic | Actif | https://console.anthropic.com |
| ElevenLabs | elevenlabs | Actif | https://elevenlabs.io |
| Deepgram | deepgram | Actif | https://console.deepgram.com |
| OpenRouter | openrouter | Actif | https://openrouter.ai |

## Étape 3 : Créer la Base "Usages LLM"

Cette base stocke l'historique détaillé de chaque collecte.

### 3.1 Création
1. Créez une nouvelle page dans Notion
2. Tapez `/database` et choisissez **"Database - Full page"**
3. Nommez-la : `Usages LLM`

### 3.2 Propriétés à configurer

| Nom | Type | Configuration |
|-----|------|---------------|
| **Identifiant** | Title | Format auto: `2026-01 - OpenAI - ProjectName` |
| **Service** | Relation | → Sélectionner "Services LLM" |
| **Mois** | Text | Format: `2026-01` |
| **Projet/API Key** | Text | Nom du projet ou API key |
| **Workspace** | Text | ID du workspace (optionnel) |
| **Modèles** | Text | Liste des modèles utilisés (avec accent !) |
| **Tokens Input** | Number | Format: Number |
| **Tokens Output** | Number | Format: Number |
| **Tokens Total** | Formula | `prop("Tokens Input") + prop("Tokens Output")` |
| **Coût USD** | Number | Format: Dollar (avec accent !) |
| **Requêtes** | Number | Format: Number (avec accent !) |
| **Breakdown JSON** | Text | Détail complet en JSON |
| **Collecte Le** | Date | Include time: Yes |
| **Statut Collecte** | Select | Options: `Succes`, `Echec`, `Partiel`, `Donnees indisponibles` |
| **Log Status** | Text | Messages de debug et erreurs |

### 3.3 Configurer la Relation

1. Cliquez sur **"+ Add a property"**
2. Choisissez **"Relation"**
3. Nommez-la `Service`
4. Sélectionnez la base `Services LLM`
5. **Important** : Activez **"Show on Services LLM"** pour créer la relation bidirectionnelle
6. Le nom de la propriété inverse sera `Usages`

## Étape 4 : Configurer les Rollups dans Services LLM

Retournez dans la base `Services LLM` et ajoutez ces rollups :

### 4.1 Total Coût USD
1. Ajoutez une propriété **Rollup**
2. Nommez-la `Total Coût USD`
3. Relation: `Usages`
4. Property: `Coût USD`
5. Calculate: **Sum**

### 4.2 Total Tokens
1. Ajoutez une propriété **Rollup**
2. Nommez-la `Total Tokens`
3. Relation: `Usages`
4. Property: `Tokens Total`
5. Calculate: **Sum**

### 4.3 Nombre de Collectes
1. Ajoutez une propriété **Rollup**
2. Nommez-la `Nb Collectes`
3. Relation: `Usages`
4. Property: (any)
5. Calculate: **Count all**

### 4.4 Dernière Collecte
1. Ajoutez une propriété **Rollup**
2. Nommez-la `Derniere Collecte`
3. Relation: `Usages`
4. Property: `Collecte Le`
5. Calculate: **Latest date**

## Étape 5 : Partager avec l'Intégration

Pour **chaque base de données** :

1. Ouvrez la base de données
2. Cliquez sur **"..."** en haut à droite
3. Cliquez sur **"Add connections"**
4. Cherchez et sélectionnez `LLM Cost Tracker`
5. Confirmez le partage

## Étape 6 : Récupérer les IDs des Bases

Pour chaque base de données :

1. Ouvrez la base en pleine page
2. Copiez l'URL (ex: `https://notion.so/workspace/abc123def456...?v=...`)
3. L'ID est la partie après le dernier `/` et avant le `?`
4. Format: 32 caractères hexadécimaux (sans tirets)

**Astuce** : Vous pouvez aussi utiliser le format avec tirets `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

## Étape 7 : Configurer les Variables d'Environnement

Ajoutez ces variables à votre fichier `.env.local` :

```env
# =============================================================================
# NOTION INTEGRATION
# =============================================================================

# Clé API Notion (depuis https://www.notion.so/my-integrations)
NOTION_API_KEY=secret_xxx

# ID de la base Services LLM
NOTION_SERVICES_DB_ID=xxx

# ID de la base Usages LLM
NOTION_USAGES_DB_ID=xxx

# =============================================================================
# PROVIDER API KEYS
# =============================================================================

# OpenAI - Une clé par workspace
OPENAI_API_KEY_MAIN=sk-admin-xxx

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxx

# ElevenLabs
ELEVENLABS_API_KEY=xxx

# Deepgram
DEEPGRAM_API_KEY=xxx

# OpenRouter
OPENROUTER_API_KEY=sk-or-xxx

# =============================================================================
# EMAIL (RESEND)
# =============================================================================

# Clé API Resend (depuis https://resend.com/api-keys)
RESEND_API_KEY=re_xxx

# Email destinataire des rapports
REPORT_EMAIL_TO=votre@email.com

# =============================================================================
# SÉCURITÉ
# =============================================================================

# Token pour déclencher la collecte
COLLECT_SECRET_TOKEN=xxx

# Token pour accéder aux rapports
REPORT_SECRET_TOKEN=xxx

# =============================================================================
# APPLICATION
# =============================================================================

# URL publique de l'application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Génération des Tokens Secrets

```bash
# Sur Mac/Linux
openssl rand -hex 32

# Ou avec Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Vérification

1. Lancez l'application : `npm run dev`
2. Ouvrez la page principale
3. Dépliez le panneau "Collecte Mensuelle"
4. Entrez votre `COLLECT_SECRET_TOKEN`
5. Cliquez sur "Vérifier" - vous devriez voir :
   - ✓ Notion
   - ✓ Email (si configuré)
   - Liste des providers

## Exemple de Données dans Notion

### Base Services LLM

| Nom | ID Provider | Statut | Total Cout USD | Nb Collectes |
|-----|-------------|--------|----------------|--------------|
| OpenAI | openai | Actif | $145.50 | 3 |
| Anthropic | anthropic | Actif | $0.00 | 1 |
| ElevenLabs | elevenlabs | Actif | $12.00 | 2 |

### Base Usages LLM

| Identifiant | Service | Mois | Cout USD | Statut Collecte |
|-------------|---------|------|----------|-----------------|
| 2026-01 - OpenAI - Production | OpenAI | 2026-01 | $120.00 | Succes |
| 2026-01 - OpenAI - Development | OpenAI | 2026-01 | $25.50 | Succes |
| 2026-01 - Anthropic - Default | Anthropic | 2026-01 | $0.00 | Donnees indisponibles |

## Dataviz dans Notion

### Graphique des coûts par mois

1. Dans la base Usages LLM, cliquez sur **"+ Add a view"**
2. Sélectionnez **"Chart"**
3. Type: **Bar chart** ou **Line chart**
4. X-axis: `Mois`
5. Y-axis: `Cout USD` (Sum)
6. Group by: `Service` (optionnel pour voir par provider)

### Graphique des coûts par service

1. Dans la base Services LLM, cliquez sur **"+ Add a view"**
2. Sélectionnez **"Chart"**
3. Type: **Pie chart**
4. Values: `Total Cout USD`

## Troubleshooting

### Erreur "Notion is not configured"
- Vérifiez que `NOTION_API_KEY`, `NOTION_SERVICES_DB_ID` et `NOTION_USAGES_DB_ID` sont définis
- Vérifiez que les IDs de bases sont corrects (32 caractères)

### Erreur "Could not find database"
- Vérifiez que l'intégration a accès aux deux bases
- Cliquez sur "..." → "Add connections" dans chaque base

### Les rollups n'affichent rien
- Vérifiez que la relation bidirectionnelle est activée
- Vérifiez que les propriétés référencées existent dans la base Usages

### Erreur "validation failed"
- Vérifiez que les noms des propriétés dans Notion correspondent exactement à ceux du code
- Attention aux accents et espaces
