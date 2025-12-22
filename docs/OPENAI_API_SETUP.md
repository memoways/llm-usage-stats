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

### Option 1: Project API Keys (Recommended)

1. **Go to OpenAI Platform**:
   - Visit https://platform.openai.com/

2. **Select Your Organization**:
   - Switch to the organization/workspace (Edugami, Memoways, or Storygami)

3. **Go to API Keys**:
   - Click on **Settings** (gear icon) → **API Keys**
   - Or go directly to: https://platform.openai.com/api-keys

4. **Create New Secret Key**:
   - Click **"+ Create new secret key"**
   - Give it a descriptive name (e.g., "Cost Tracker - Edugami")

5. **Configure Permissions**:
   - Under **Permissions**, select:
     - ✅ **All** (for full access)
     - OR select specific scopes:
       - ✅ **Model capabilities** (to read usage)
       - ✅ **API access** (api.read scope)

6. **Set Resource Access**:
   - **Recommended**: Select **All projects** for easier access
   - **Alternative**: Select specific projects you want to track

7. **Copy the Key**:
   - Copy the API key (starts with `sk-proj-...`)
   - **IMPORTANT**: Save it immediately - you won't be able to see it again!

8. **Update `.env.local`**:
   ```env
   OPENAI_API_KEY_EDUGAMI=sk-proj-your-new-key-here
   ```

9. **Repeat for Other Workspaces**:
   - Create separate keys for Memoways and Storygami
   - Each workspace/organization needs its own key

10. **Restart Dev Server**:
    ```bash
    npm run dev
    ```

### Option 2: Service Account Keys

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
