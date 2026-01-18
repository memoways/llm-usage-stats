# Deployment Guide - LLM Cost Tracker

This guide walks you through deploying the LLM Cost Tracker to Vercel.

## Prerequisites

- OpenAI API keys for each workspace (Edugami, Memoways, Storygami)
- GitHub account
- Vercel account (free tier is sufficient)

## Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and create a new repository
2. Name it `llm-cost-tracker` (or your preferred name)
3. Keep it private for security
4. Don't initialize with README (we already have one)

## Step 2: Push Code to GitHub

```bash
# Add GitHub remote (replace with your repository URL)
git remote add origin https://github.com/YOUR_USERNAME/llm-cost-tracker.git

# Push to GitHub
git push -u origin main
```

## Step 3: Deploy to Vercel

### 3.1: Connect Repository

1. Go to [Vercel](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository `llm-cost-tracker`
4. Vercel will automatically detect Next.js

### 3.2: Configure Environment Variables

In the Vercel project settings, add these environment variables:

**IMPORTANT: Mark all API keys as "Secret" in Vercel**

```
OPENAI_API_KEY_EDUGAMI=sk-proj-your-actual-edugami-key
OPENAI_API_KEY_MEMOWAYS=sk-proj-your-actual-memoways-key
OPENAI_API_KEY_STORYGAMI=sk-proj-your-actual-storygami-key
```

### 3.3: Deploy

1. Click "Deploy"
2. Vercel will build and deploy your application
3. You'll get a production URL like `https://llm-cost-tracker.vercel.app`

## Step 4: Verify Deployment

1. Visit your production URL
2. Test the following flow:
   - Select "OpenAI" provider
   - Select a workspace (Edugami, Memoways, or Storygami)
   - Select a project
   - Choose a date range (e.g., "Last Month")
   - Click "Refresh Data"
   - Verify costs are displayed

## Step 5: Configure Custom Domain (Optional)

If you have a custom domain:

1. Go to Project Settings → Domains in Vercel
2. Add your domain
3. Follow Vercel's DNS configuration instructions

## Troubleshooting

### Error: "API key not found for workspace"

**Solution:** Check that environment variables are correctly set in Vercel:
- Go to Settings → Environment Variables
- Verify all 3 OpenAI keys are present
- Redeploy after adding/updating variables

### Error: "Failed to fetch providers"

**Solution:** Check browser console for CORS or network errors. Ensure API routes are accessible.

### Error: "Failed to fetch projects"

**Solution:**
- Verify the API key has admin permissions in OpenAI
- Check the workspace ID is correct
- Ensure the API key matches the selected workspace

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY_EDUGAMI` | Yes | OpenAI admin API key for Edugami workspace |
| `OPENAI_API_KEY_MEMOWAYS` | Yes | OpenAI admin API key for Memoways workspace |
| `OPENAI_API_KEY_STORYGAMI` | Yes | OpenAI admin API key for Storygami workspace |

## Automatic Deployments

After initial setup, Vercel automatically deploys on every push to `main`:

```bash
# Make changes, commit, and push
git add .
git commit -m "Your commit message"
git push origin main
```

Vercel will automatically build and deploy the new version.

## Rollback

If you need to rollback to a previous version:

1. Go to Vercel Dashboard → Deployments
2. Find the previous deployment
3. Click "..." → "Promote to Production"

## Security Best Practices

- Never commit `.env.local` or `.env` files
- Always mark API keys as "Secret" in Vercel
- Use GitHub private repository for sensitive projects
- Regularly rotate API keys
- Monitor usage in OpenAI dashboard

## Support

For issues:
- Check [Vercel Docs](https://vercel.com/docs)
- Check [Next.js Docs](https://nextjs.org/docs)
- Review OpenAI API status at [status.openai.com](https://status.openai.com)
