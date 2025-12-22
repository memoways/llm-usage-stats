# OpenAI API Key Setup Guide

This guide explains how to properly configure OpenAI API keys for the LLM Cost Tracker.

## Error: "Missing scopes: api.read"

If you're seeing this error:
```
OpenAI API error (403): You have insufficient permissions for this operation.
Missing scopes: api.read
```

This means your API key doesn't have the required permissions to read project and usage data.

## Solution: Create API Keys with Correct Permissions

**IMPORTANT**: For usage/statistics endpoints, you need **Admin Keys**, not regular Project API Keys!

### Option 1: Admin Keys (Required for Usage Endpoint)

1. **Go to OpenAI Platform**:
   - Visit https://platform.openai.com/

2. **Select Your Organization**:
   - Switch to the organization/workspace (Edugami, Memoways, or Storygami)

3. **Go to Admin Keys** (NOT regular API Keys):
   - Click on **Settings** (gear icon) → **Organization** → **Admin keys**
   - Or go directly to: https://platform.openai.com/org-settings/admin-keys

4. **Create New Admin Key**:
   - Click **"+ Create new admin key"** (or edit existing one)
   - Give it a descriptive name (e.g., "Cost Tracker - Memoways")

5. **Configure Permissions**:
   - Under **Permissions**, select:
     - ✅ **All** (for full access including usage/statistics)
   - **IMPORTANT**: Admin keys with "All" permissions include the `api.read` scope needed for usage endpoints

6. **Copy the Key**:
   - Copy the Admin API key (starts with `sk-...`)
   - **IMPORTANT**: Save it immediately - you won't be able to see it again!

7. **Update `.env.local`**:
   ```env
   OPENAI_API_KEY_MEMOWAYS=sk-your-admin-key-here
   ```

8. **Repeat for Other Workspaces**:
   - Create separate Admin keys for Edugami, Memoways, and Storygami
   - Each workspace/organization needs its own Admin key

9. **Restart Dev Server**:
    ```bash
    npm run dev
    ```

### Option 2: Project API Keys (For Projects Only)

If you need organization-wide access:

1. **Go to Service Accounts**:
   - Visit https://platform.openai.com/settings/organization/service-accounts

2. **Create Service Account**:
   - Click **"Create service account"**
   - Give it a name (e.g., "Cost Tracker Service")
   - Set role to **Reader** or **Owner**

3. **Generate API Key**:
   - Click on the service account
   - Click **"Create new secret key"**
   - Copy the key

4. **Use in `.env.local`**:
   ```env
   OPENAI_API_KEY_EDUGAMI=sk-your-service-account-key
   ```

## Verifying Your API Key

To verify your API key has the correct permissions:

1. **Check in OpenAI Dashboard**:
   - Go to https://platform.openai.com/api-keys
   - Find your key in the list
   - Check the **Permissions** column
   - Should show "All" or include model/API access

2. **Test with curl**:
   ```bash
   curl https://api.openai.com/v1/organization/projects \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

   Should return a JSON response with your projects, not a 403 error.

## Common Issues

### Issue: "You have insufficient permissions"

**Cause**: API key doesn't have the required scopes.

**Solution**:
- Create a new API key with "All" permissions
- OR add specific scopes: Model capabilities + API access

### Issue: "Invalid API key"

**Cause**:
- Key was copied incorrectly
- Key was revoked
- Wrong workspace/organization

**Solution**:
- Double-check the key in `.env.local` (no extra spaces)
- Verify you're using the key from the correct organization
- Create a new key if the old one was revoked

### Issue: "Cannot read property 'data' of undefined"

**Cause**: API response format doesn't match expected structure.

**Solution**:
- Check terminal logs for the actual API response
- The app logs the full response for debugging

## Security Best Practices

1. **Never commit API keys** to Git
   - `.env.local` is in `.gitignore`
   - Use `.env.example` as a template only

2. **Use separate keys per workspace**
   - Don't reuse the same key across organizations
   - Makes it easier to track usage and revoke access

3. **Rotate keys regularly**
   - Generate new keys periodically
   - Delete old keys from OpenAI dashboard

4. **Use minimal permissions**
   - If you only need to read data, use "Reader" role
   - Avoid "Owner" unless necessary

5. **Monitor usage**
   - Check OpenAI usage dashboard regularly
   - Set up billing alerts

## Next Steps

After setting up your API keys:

1. Update all three keys in `.env.local`
2. Restart the dev server
3. Refresh the browser
4. Select a provider and workspace
5. Projects should now load successfully

## Support

If you're still having issues:

- Check the terminal logs for detailed error messages
- Verify your organization membership in OpenAI dashboard
- Try creating a new API key with "All" permissions
- Contact OpenAI support if the issue persists
