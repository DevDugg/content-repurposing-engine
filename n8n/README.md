# n8n Workflows

This directory contains the n8n workflow definitions for the Content Repurpose Engine.

## Workflows

### 1. Master Orchestrator (`master-orchestrator.json`)
Entry point workflow that receives content from the dashboard and routes it to platform-specific processors.

**Webhook URL:** `http://n8n:5678/webhook/content-process`

**Input:**
```json
{
  "content_id": "uuid",
  "brand_id": "uuid",
  "profile_id": "uuid",
  "title": "Blog Post Title",
  "body": "Full blog post content...",
  "image_urls": ["https://..."],
  "target_platforms": ["instagram", "linkedin", "twitter"],
  "callback_url": "http://dashboard:3000/api/n8n/callback"
}
```

### 2. Platform Processors
Each platform has its own processor workflow that:
1. Fetches platform-specific configuration
2. Resizes images via Cloudinary
3. Generates copy via Claude AI
4. Generates hashtags via Claude AI
5. Sends results back to dashboard

**Available:**
- `processor-instagram.json` - Reference implementation
- `processor-linkedin.json` - Clone and adapt from Instagram
- `processor-twitter.json` - Clone and adapt from Instagram
- `processor-facebook.json` - Clone and adapt from Instagram
- `processor-pinterest.json` - Clone and adapt from Instagram
- `processor-tiktok.json` - Clone and adapt from Instagram

### 3. Scheduler (`scheduler.json`)
Handles scheduling posts to Buffer.

**Webhook URL:** `http://n8n:5678/webhook/scheduler`

## Setup Instructions

### 1. Import Workflows

```bash
# Using n8n CLI
n8n import:workflow --input=./n8n/workflows/master-orchestrator.json
n8n import:workflow --input=./n8n/workflows/processor-instagram.json
n8n import:workflow --input=./n8n/workflows/scheduler.json
```

Or import via n8n UI:
1. Open n8n at http://localhost:5678
2. Go to Workflows > Import from File
3. Select each JSON file

### 2. Configure Credentials

In n8n, create the following credentials:

1. **Anthropic API**
   - Type: HTTP Header Auth
   - Header Name: `x-api-key`
   - Header Value: Your Anthropic API key

2. **Cloudinary**
   - Type: HTTP Basic Auth
   - Username: Your Cloudinary API Key
   - Password: Your Cloudinary API Secret

3. **Dashboard Auth** (for internal API calls)
   - Type: HTTP Header Auth
   - Header Name: `x-n8n-secret`
   - Header Value: Same as `N8N_CALLBACK_SECRET` env var

### 3. Set Environment Variables

In n8n settings or docker-compose, ensure these are set:
- `DASHBOARD_URL` - e.g., `http://dashboard:3000`
- `N8N_CALLBACK_SECRET` - Shared secret for callbacks
- `CLOUDINARY_CLOUD_NAME`
- `BUFFER_ACCESS_TOKEN`
- `BUFFER_INSTAGRAM_PROFILE_ID` (and other platforms)

### 4. Activate Workflows

After importing, activate each workflow in n8n UI.

## Creating Platform Processors

The Instagram processor is the reference implementation. To create processors for other platforms:

1. Duplicate `processor-instagram.json`
2. Rename to `processor-{platform}.json`
3. Update:
   - Workflow name
   - Platform name in API calls
   - Platform-specific prompts (char limits, tone, etc.)
   - Tags

## Testing

Test the master orchestrator webhook:

```bash
curl -X POST http://localhost:5678/webhook/content-process \
  -H "Content-Type: application/json" \
  -d '{
    "content_id": "test-123",
    "brand_id": "brand-456",
    "profile_id": "profile-789",
    "title": "Test Blog Post",
    "body": "This is a test blog post about productivity tips...",
    "image_urls": ["https://example.com/image.jpg"],
    "target_platforms": ["instagram"],
    "callback_url": "http://localhost:3000/api/n8n/callback"
  }'
```

## Troubleshooting

### Workflow not triggering
- Ensure workflow is activated
- Check webhook URL is correct
- Verify n8n container is running and healthy

### Claude API errors
- Verify `ANTHROPIC_API_KEY` is set correctly
- Check API key has sufficient credits
- Review rate limits

### Callback failures
- Ensure `N8N_CALLBACK_SECRET` matches in both n8n and dashboard
- Verify dashboard container is reachable from n8n container
- Check dashboard health endpoint
