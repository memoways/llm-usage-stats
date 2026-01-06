# Déploiement sur Vercel

Ce guide explique comment déployer l'application LLM Cost Tracker sur Vercel.

## Pourquoi Vercel ?

- **Gratuit** : Le plan Hobby est suffisant pour cette application
- **Automatique** : Déploiement automatique à chaque push sur GitHub
- **Serverless** : Les API routes fonctionnent parfaitement
- **Edge** : Distribution globale pour des temps de réponse rapides

## Prérequis

1. Un compte Vercel (https://vercel.com)
2. Le projet sur GitHub/GitLab/Bitbucket
3. Toutes les clés API configurées (voir NOTION_SETUP.md)

## Étape 1 : Importer le Projet

1. Connectez-vous à Vercel
2. Cliquez sur **"Add New..." → "Project"**
3. Sélectionnez votre repository
4. Framework: **Next.js** (détecté automatiquement)
5. Root Directory: `.` (racine)

## Étape 2 : Configurer les Variables d'Environnement

Dans l'onglet **"Environment Variables"**, ajoutez toutes les variables :

### Variables requises

| Variable | Description | Exemple |
|----------|-------------|---------|
| `NOTION_API_KEY` | Clé API Notion | `secret_xxx...` |
| `NOTION_SNAPSHOTS_DB_ID` | ID de la base Provider Snapshots | `abc123...` |
| `NOTION_SUMMARIES_DB_ID` | ID de la base Monthly Summaries | `def456...` |
| `COLLECT_SECRET_TOKEN` | Token pour déclencher la collecte | (généré aléatoirement) |
| `REPORT_SECRET_TOKEN` | Token pour accéder aux rapports | (généré aléatoirement) |
| `NEXT_PUBLIC_APP_URL` | URL de votre app Vercel | `https://votre-app.vercel.app` |

### Variables optionnelles (email)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `RESEND_API_KEY` | Clé API Resend | `re_xxx...` |
| `REPORT_EMAIL_TO` | Email destinataire | `vous@email.com` |

### Variables providers (selon utilisation)

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY_MAIN` | OpenAI (workspace "main") |
| `OPENAI_API_KEY_PRODUCTION` | OpenAI (workspace "production") |
| `ANTHROPIC_API_KEY` | Anthropic |
| `ELEVENLABS_API_KEY` | ElevenLabs |
| `DEEPGRAM_API_KEY` | Deepgram |
| `OPENROUTER_API_KEY` | OpenRouter |

## Étape 3 : Déployer

Cliquez sur **"Deploy"**. Vercel va :
1. Cloner le repository
2. Installer les dépendances
3. Builder l'application Next.js
4. Déployer sur leur infrastructure

Le premier déploiement prend 2-3 minutes.

## Étape 4 : Mettre à jour NEXT_PUBLIC_APP_URL

Après le premier déploiement, vous obtenez votre URL (ex: `https://llm-cost-tracker.vercel.app`).

1. Allez dans **Settings → Environment Variables**
2. Modifiez `NEXT_PUBLIC_APP_URL` avec l'URL finale
3. Redéployez (Settings → Deployments → Redeploy)

## Utilisation

### Page principale
```
https://votre-app.vercel.app/
```

### Page de rapport (protégée)
```
https://votre-app.vercel.app/report?token=VOTRE_REPORT_SECRET_TOKEN&month=2026-01
```

### Déclencher une collecte (API)
```bash
curl -X POST "https://votre-app.vercel.app/api/collect?token=VOTRE_COLLECT_SECRET_TOKEN&month=2026-01&send_email=true"
```

## Automatisation Future

### Option 1 : Vercel Cron (Plan Pro - $20/mois)

Ajoutez dans `vercel.json` :
```json
{
  "crons": [
    {
      "path": "/api/collect?token=xxx&send_email=true",
      "schedule": "0 9 1 * *"
    }
  ]
}
```
Cela déclenche la collecte le 1er de chaque mois à 9h UTC.

### Option 2 : GitHub Actions (Gratuit)

Créez `.github/workflows/monthly-collect.yml` :
```yaml
name: Monthly Collection

on:
  schedule:
    - cron: '0 9 1 * *'  # 1er du mois à 9h UTC
  workflow_dispatch:     # Déclenchement manuel

jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger collection
        run: |
          curl -X POST "${{ secrets.APP_URL }}/api/collect?token=${{ secrets.COLLECT_TOKEN }}&send_email=true"
```

Ajoutez les secrets dans GitHub (Settings → Secrets → Actions) :
- `APP_URL` : URL de votre app Vercel
- `COLLECT_TOKEN` : Votre COLLECT_SECRET_TOKEN

### Option 3 : Service externe (cron-job.org)

1. Créez un compte sur https://cron-job.org
2. Créez un nouveau job avec :
   - URL: `https://votre-app.vercel.app/api/collect?token=xxx&send_email=true`
   - Méthode: POST
   - Schedule: Mensuel (1er du mois)

## Monitoring

### Logs
- Vercel Dashboard → Functions → Logs
- Voir les logs en temps réel de vos API routes

### Analytics (optionnel)
- Vercel Analytics (gratuit) pour les métriques de performance

## Troubleshooting

### Erreur 500 sur /api/collect
- Vérifiez que `NOTION_API_KEY` est correct
- Vérifiez que les IDs de bases Notion sont corrects
- Regardez les logs dans Vercel

### Email non envoyé
- Vérifiez `RESEND_API_KEY` et `REPORT_EMAIL_TO`
- Vérifiez les logs Resend (dashboard Resend)

### Timeout sur la collecte
- Les API routes Vercel ont un timeout de 10s (plan gratuit) ou 60s (plan Pro)
- Si vous avez beaucoup de providers/data, envisagez le plan Pro



