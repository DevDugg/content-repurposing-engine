# Content Repurpose Engine - Technical Specification

**Version:** 1.0  
**Last Updated:** January 2025  
**Purpose:** Complete architectural specification for implementation  
**Target Audience:** Developers, AI coding assistants, technical implementers

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Overview](#architecture-overview)
3. [Database Schema](#database-schema)
4. [API Layer Specification](#api-layer-specification)
5. [Dashboard UI Specification](#dashboard-ui-specification)
6. [n8n Workflow Logic](#n8n-workflow-logic)
7. [Data Flow Patterns](#data-flow-patterns)
8. [Business Logic Rules](#business-logic-rules)
9. [Integration Requirements](#integration-requirements)
10. [Security & Authentication](#security--authentication)
11. [Configuration System](#configuration-system)
12. [Error Handling Strategy](#error-handling-strategy)
13. [Deployment Architecture](#deployment-architecture)
14. [Performance Requirements](#performance-requirements)
15. [Testing Requirements](#testing-requirements)

---

## System Overview

### Purpose
Transform one piece of long-form content (blog post, article) into six platform-optimized social media posts with:
- Platform-specific image sizing
- AI-rewritten copy tailored to each platform's tone
- Auto-generated hashtags
- Scheduling capabilities
- Full user customization of AI behavior per platform

### Core Value Proposition
- **Input:** 1 blog post with title, body, and image(s)
- **Output:** 6 ready-to-publish social media posts (Instagram, LinkedIn, Twitter, Facebook, Pinterest, TikTok)
- **Time:** 60 seconds processing time
- **Customization:** Users control AI behavior through custom instructions, examples, and prompts per platform

### Deployment Model
- **Self-hosted:** Users deploy via Docker Compose on their own infrastructure
- **Open-source:** Free distribution, no SaaS hosting by default
- **Zero-config ambition:** Works out-of-box with sensible defaults
- **Fully customizable:** Advanced users can edit everything

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        USER LAYER                            │
│                   (Browser Interface)                        │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                    DASHBOARD LAYER                           │
│              (Next.js Frontend + API Routes)                 │
│  - Content submission forms                                  │
│  - Configuration interfaces                                  │
│  - Preview & editing UI                                      │
│  - Scheduling interface                                      │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                     DATABASE LAYER                           │
│                   (PostgreSQL)                               │
│  - Brands & profiles                                         │
│  - Platform configurations                                   │
│  - Content queue                                             │
│  - Generated outputs                                         │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                   PROCESSING LAYER                           │
│                     (n8n Workflows)                          │
│  - Master orchestrator                                       │
│  - Platform-specific processors (6 workflows)                │
│  - Scheduler workflow                                        │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                          │
│  - Anthropic Claude API (AI generation)                     │
│  - Cloudinary API (image processing)                         │
│  - Buffer/Later API (social scheduling)                      │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack Requirements

**Frontend & API:**
- Next.js (App Router architecture)
- React for UI components
- Tailwind CSS for styling
- TypeScript for type safety

**Database:**
- PostgreSQL as primary database
- Prisma as ORM layer
- Database migrations via Prisma Migrate

**Processing Engine:**
- n8n for workflow orchestration
- n8n persists workflows to PostgreSQL

**Containerization:**
- Docker for all services
- Docker Compose for orchestration
- Multi-stage builds for optimization

**Authentication:**
- NextAuth.js for authentication layer
- Session-based authentication (no external auth providers required)

---

## Database Schema

### Design Principles
1. **Multi-tenant ready:** Support multiple brands per installation
2. **Configuration-driven:** All AI behavior stored in database, not code
3. **Audit trail:** Track what was generated, when, and with what settings
4. **Performance optimization:** Indexes on frequently queried columns
5. **Data integrity:** Foreign key constraints with appropriate cascade rules

### Entity Relationship Overview

```
brands (1) ──────< (N) brand_voice_profiles
                            │
                            │ (1)
                            │
                            ↓
                            < (N) platform_configs
                            
brands (1) ──────< (N) content_queue
                            │
                            │ (1)
                            │
                            ↓
                            < (N) platform_outputs
```

### Table: `brands`

**Purpose:** Top-level entity representing a client, company, or brand identity

**Columns:**
- `id` (UUID, Primary Key)
- `name` (Text, Required) - Display name for the brand
- `created_at` (Timestamp, Default: NOW())
- `updated_at` (Timestamp, Auto-update on modification)

**Business Rules:**
- Brand name must be unique per installation
- Deleting a brand cascades to all related entities
- Minimum 1 brand required for system to function

**Indexes:**
- Primary key on `id`
- Unique index on `name`

---

### Table: `brand_voice_profiles`

**Purpose:** Stores global brand voice guidelines that apply across all platforms

**Columns:**
- `id` (UUID, Primary Key)
- `brand_id` (UUID, Foreign Key → brands.id, ON DELETE CASCADE)
- `profile_name` (Text, Required) - e.g., "Professional", "Casual", "Technical"
- `global_tone` (Text, Nullable) - Overall tone description
- `global_dos` (Text Array, Nullable) - List of writing guidelines to follow
- `global_donts` (Text Array, Nullable) - List of writing guidelines to avoid
- `target_audience` (Text, Nullable) - Who the content is written for
- `brand_keywords` (Text Array, Nullable) - Keywords to emphasize
- `example_input_1` (Text, Nullable) - Few-shot example input
- `example_output_1` (Text, Nullable) - Few-shot example output
- `example_input_2` (Text, Nullable)
- `example_output_2` (Text, Nullable)
- `example_input_3` (Text, Nullable)
- `example_output_3` (Text, Nullable)
- `created_at` (Timestamp, Default: NOW())
- `updated_at` (Timestamp, Auto-update)

**Business Rules:**
- Each brand can have multiple voice profiles
- Profile name must be unique per brand
- At least one example (input + output pair) recommended but not required
- Global settings are inherited by all platforms unless overridden

**Indexes:**
- Primary key on `id`
- Foreign key index on `brand_id`
- Unique index on `(brand_id, profile_name)`

**Validation Rules:**
- `global_dos` and `global_donts` arrays: each item max 500 characters
- `target_audience`: max 1000 characters
- `example_input_*` and `example_output_*`: max 5000 characters each

---

### Table: `platform_configs`

**Purpose:** Per-platform customization including tone overrides, custom instructions, technical specs, and AI prompts

**Columns:**

**Relationships:**
- `id` (UUID, Primary Key)
- `brand_voice_profile_id` (UUID, Foreign Key → brand_voice_profiles.id, ON DELETE CASCADE)
- `platform` (Text, Required) - Values: 'instagram', 'linkedin', 'twitter', 'facebook', 'pinterest', 'tiktok'

**Platform-Specific Content:**
- `tone_override` (Text, Nullable) - Override global tone for this platform
- `custom_instructions` (Text, Nullable) - Free-form instructions for AI

**Technical Specifications:**
- `image_width` (Integer, Default varies by platform)
- `image_height` (Integer, Default varies by platform)
- `char_limit` (Integer, Default varies by platform)
- `hashtag_count_min` (Integer, Default varies by platform)
- `hashtag_count_max` (Integer, Default varies by platform)

**AI Prompt Templates:**
- `system_prompt` (Text, Nullable) - System-level AI prompt
- `user_prompt_template` (Text, Nullable) - User prompt with variable placeholders

**Few-Shot Examples (Platform-Specific):**
- `example_input_1` (Text, Nullable)
- `example_output_1` (Text, Nullable)
- `example_input_2` (Text, Nullable)
- `example_output_2` (Text, Nullable)

**Scheduling:**
- `best_posting_time` (Time, Nullable) - Optimal posting time for this platform
- `posting_frequency` (Text, Nullable) - e.g., "daily", "3x_per_week"

**Status:**
- `enabled` (Boolean, Default: TRUE) - Whether this platform is active
- `created_at` (Timestamp, Default: NOW())
- `updated_at` (Timestamp, Auto-update)

**Business Rules:**
- One configuration per (brand_voice_profile, platform) pair
- If `system_prompt` or `user_prompt_template` is NULL, use system defaults
- Platform must be one of the six supported values
- Image dimensions must be positive integers
- Char limit must be between 1 and 100,000
- Hashtag counts: min <= max, both non-negative

**Indexes:**
- Primary key on `id`
- Foreign key index on `brand_voice_profile_id`
- Unique index on `(brand_voice_profile_id, platform)`
- Index on `enabled` for quick filtering

**Default Values by Platform:**

| Platform | Image Size | Char Limit | Hashtag Range |
|----------|------------|------------|---------------|
| instagram | 1080x1080 | 2200 | 10-15 |
| linkedin | 1200x627 | 3000 | 3-5 |
| twitter | 1600x900 | 280 | 2-3 |
| facebook | 1200x630 | 63206 | 2-3 |
| pinterest | 1000x1500 | 500 | 5-10 |
| tiktok | 1080x1920 | 2200 | 3-5 |

---

### Table: `content_queue`

**Purpose:** Stores content submitted for processing and tracks processing status

**Columns:**

**Relationships:**
- `id` (UUID, Primary Key)
- `brand_id` (UUID, Foreign Key → brands.id, ON DELETE CASCADE)
- `brand_voice_profile_id` (UUID, Foreign Key → brand_voice_profiles.id, ON DELETE SET NULL)

**Input Content:**
- `title` (Text, Required) - Content title/headline
- `body` (Text, Required) - Full content body
- `image_urls` (Text Array, Nullable) - Array of image URLs

**Processing State:**
- `status` (Text, Default: 'pending') - Values: 'pending', 'processing', 'complete', 'failed', 'partial'
- `processing_started_at` (Timestamp, Nullable)
- `processing_completed_at` (Timestamp, Nullable)
- `error_message` (Text, Nullable) - Error details if status is 'failed'

**Platform Selection:**
- `target_platforms` (Text Array, Required) - Array of platform names user selected

**Timestamps:**
- `created_at` (Timestamp, Default: NOW())
- `updated_at` (Timestamp, Auto-update)

**Business Rules:**
- At least one target platform required
- Status transitions: pending → processing → complete/failed/partial
- `partial` status means some platforms succeeded, others failed
- Title and body cannot be empty
- Image URLs must be valid HTTP(S) URLs

**Indexes:**
- Primary key on `id`
- Foreign key index on `brand_id`
- Foreign key index on `brand_voice_profile_id`
- Index on `status` for queue filtering
- Index on `created_at` for chronological queries

**Status Definitions:**
- `pending`: Awaiting processing
- `processing`: Currently being processed by n8n
- `complete`: All target platforms successfully generated
- `failed`: Processing failed for all platforms
- `partial`: Some platforms succeeded, others failed

---

### Table: `platform_outputs`

**Purpose:** Stores generated content for each platform, including user edits and performance metrics

**Columns:**

**Relationships:**
- `id` (UUID, Primary Key)
- `content_id` (UUID, Foreign Key → content_queue.id, ON DELETE CASCADE)
- `platform` (Text, Required) - Platform name

**Generated Content:**
- `optimized_image_url` (Text, Nullable) - Cloudinary URL of optimized image
- `rewritten_copy` (Text, Nullable) - AI-generated copy
- `hashtags` (Text Array, Nullable) - AI-generated hashtags

**User Modifications:**
- `user_edited` (Boolean, Default: FALSE) - Whether user modified output
- `edited_copy` (Text, Nullable) - User's edited version of copy
- `edited_hashtags` (Text Array, Nullable) - User's edited hashtags

**Scheduling:**
- `scheduled_for` (Timestamp, Nullable) - When content will be published
- `published` (Boolean, Default: FALSE) - Publication status
- `published_at` (Timestamp, Nullable) - Actual publication time
- `buffer_post_id` (Text, Nullable) - External scheduling service post ID

**Performance Metrics:**
- `likes` (Integer, Default: 0)
- `comments` (Integer, Default: 0)
- `shares` (Integer, Default: 0)
- `impressions` (Integer, Default: 0)
- `engagement_rate` (Decimal, Nullable) - Calculated metric

**AI Metadata:**
- `model_used` (Text, Nullable) - e.g., "claude-sonnet-4-20250514"
- `tokens_used` (Integer, Nullable) - Total tokens consumed
- `processing_time_ms` (Integer, Nullable) - Processing duration
- `prompt_version` (Text, Nullable) - Hash or version of prompt used

**Timestamps:**
- `created_at` (Timestamp, Default: NOW())
- `updated_at` (Timestamp, Auto-update)

**Business Rules:**
- One output record per (content_id, platform) pair
- If `user_edited` is TRUE, use `edited_copy` and `edited_hashtags` for publication
- If FALSE, use `rewritten_copy` and `hashtags`
- Performance metrics can be updated post-publication via webhook/API

**Indexes:**
- Primary key on `id`
- Foreign key index on `content_id`
- Index on `platform` for platform-specific queries
- Composite index on `(content_id, platform)` for lookups
- Index on `published` for filtering published content
- Index on `scheduled_for` for scheduling queries

---

### Database Relationships Summary

**Cascade Behavior:**
- Delete brand → cascades to all voice profiles, content queue, and outputs
- Delete voice profile → cascades to platform configs, sets content_queue.brand_voice_profile_id to NULL
- Delete content → cascades to all platform outputs

**Referential Integrity:**
- All foreign keys enforced at database level
- Nullable foreign keys only where business logic requires (e.g., deleted voice profile shouldn't delete content)

---

## API Layer Specification

### Architecture Pattern
- **Framework:** Next.js API routes (App Router)
- **Location:** `app/api/` directory
- **Response Format:** JSON for all endpoints
- **Error Format:** Standardized error objects
- **Authentication:** Session-based via NextAuth

### Standard Response Structure

**Success Response:**
```json
{
  "success": true,
  "data": { /* endpoint-specific data */ },
  "meta": {
    "timestamp": "2025-01-18T10:30:00Z",
    "request_id": "uuid"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* additional context */ }
  },
  "meta": {
    "timestamp": "2025-01-18T10:30:00Z",
    "request_id": "uuid"
  }
}
```

---

### Endpoint: `POST /api/content/create`

**Purpose:** Submit new content for processing

**Request Body:**
```json
{
  "brand_id": "uuid",
  "brand_voice_profile_id": "uuid",
  "title": "string (required, max 500 chars)",
  "body": "string (required, max 50000 chars)",
  "image_urls": ["string (valid URL)"],
  "target_platforms": ["instagram", "linkedin", "twitter"]
}
```

**Validation Rules:**
- `brand_id` must exist in database
- `brand_voice_profile_id` must exist and belong to specified brand
- `title` cannot be empty
- `body` cannot be empty
- `image_urls` must be valid HTTP(S) URLs (validate format, not accessibility)
- `target_platforms` must contain at least one valid platform
- Each platform in `target_platforms` must have enabled config in database

**Process:**
1. Validate request body
2. Create record in `content_queue` table with status 'pending'
3. Trigger n8n master orchestrator webhook with content_id
4. Return content_id to client immediately (async processing)

**Response:**
```json
{
  "success": true,
  "data": {
    "content_id": "uuid",
    "status": "pending",
    "estimated_completion_seconds": 60
  }
}
```

**Error Codes:**
- `INVALID_BRAND`: Brand ID not found
- `INVALID_PROFILE`: Profile ID not found or doesn't belong to brand
- `VALIDATION_ERROR`: Request body validation failed
- `MISSING_PLATFORM_CONFIG`: One or more target platforms not configured
- `N8N_TRIGGER_FAILED`: Unable to trigger processing workflow

---

### Endpoint: `GET /api/content/:content_id/status`

**Purpose:** Check processing status of submitted content

**URL Parameters:**
- `content_id` (UUID, required)

**Response:**
```json
{
  "success": true,
  "data": {
    "content_id": "uuid",
    "status": "processing",
    "processing_started_at": "2025-01-18T10:30:00Z",
    "processing_completed_at": null,
    "platforms_complete": ["instagram", "linkedin"],
    "platforms_pending": ["twitter"],
    "platforms_failed": [],
    "error_message": null
  }
}
```

**Status Logic:**
- Query `content_queue` for overall status
- Query `platform_outputs` to determine per-platform status
- Calculate `platforms_complete`, `platforms_pending`, `platforms_failed` arrays

**Polling Recommendation:**
- Client should poll this endpoint every 3-5 seconds while status is 'processing'
- Stop polling when status is 'complete', 'failed', or 'partial'

---

### Endpoint: `GET /api/content/:content_id/outputs`

**Purpose:** Retrieve all generated platform outputs for preview/editing

**URL Parameters:**
- `content_id` (UUID, required)

**Query Parameters:**
- `include_metadata` (boolean, optional, default: false) - Include AI metadata

**Response:**
```json
{
  "success": true,
  "data": {
    "content": {
      "id": "uuid",
      "title": "Original title",
      "body": "Original body",
      "status": "complete"
    },
    "outputs": [
      {
        "id": "uuid",
        "platform": "instagram",
        "optimized_image_url": "https://cloudinary.../image.jpg",
        "rewritten_copy": "Generated caption",
        "hashtags": ["#marketing", "#AI"],
        "user_edited": false,
        "edited_copy": null,
        "edited_hashtags": null,
        "metadata": { /* if include_metadata=true */ }
      },
      /* ... more platforms */
    ]
  }
}
```

**Business Logic:**
- Return outputs for all target platforms
- If platform processing failed, include error in output object
- Sort outputs by platform in consistent order

---

### Endpoint: `PATCH /api/content/:content_id/outputs/:output_id`

**Purpose:** Update generated output with user edits

**URL Parameters:**
- `content_id` (UUID, required)
- `output_id` (UUID, required)

**Request Body:**
```json
{
  "edited_copy": "string (optional)",
  "edited_hashtags": ["string"] /* optional */
}
```

**Validation:**
- Verify `output_id` belongs to `content_id`
- Validate edited_copy length against platform char_limit
- Validate hashtag format (must start with #)

**Process:**
1. Update `platform_outputs` record
2. Set `user_edited` = TRUE
3. Update `edited_copy` and/or `edited_hashtags`
4. Return updated output

**Response:**
```json
{
  "success": true,
  "data": {
    "output_id": "uuid",
    "user_edited": true,
    "edited_copy": "Updated copy",
    "edited_hashtags": ["#updated"]
  }
}
```

---

### Endpoint: `POST /api/content/:content_id/regenerate`

**Purpose:** Regenerate specific platform output(s)

**URL Parameters:**
- `content_id` (UUID, required)

**Request Body:**
```json
{
  "platforms": ["instagram", "twitter"]
}
```

**Process:**
1. Validate platforms exist in original target_platforms
2. Delete existing `platform_outputs` for specified platforms
3. Trigger n8n platform-specific webhooks for regeneration
4. Return immediately with pending status

**Response:**
```json
{
  "success": true,
  "data": {
    "content_id": "uuid",
    "regenerating_platforms": ["instagram", "twitter"],
    "status": "processing"
  }
}
```

---

### Endpoint: `POST /api/content/:content_id/schedule`

**Purpose:** Schedule approved content for publication

**URL Parameters:**
- `content_id` (UUID, required)

**Request Body:**
```json
{
  "scheduling_mode": "best_times" | "custom",
  "custom_schedules": {
    "instagram": "2025-01-19T14:00:00Z",
    "linkedin": "2025-01-19T09:00:00Z"
  }
}
```

**Validation:**
- If mode is "best_times", use times from `platform_configs.best_posting_time`
- If mode is "custom", `custom_schedules` required for all target platforms
- All scheduled times must be in future

**Process:**
1. Update `platform_outputs.scheduled_for` for each platform
2. Trigger n8n scheduler workflow
3. Scheduler workflow will call Buffer/Later API at scheduled times
4. Return confirmation

**Response:**
```json
{
  "success": true,
  "data": {
    "content_id": "uuid",
    "scheduled_platforms": [
      {
        "platform": "instagram",
        "scheduled_for": "2025-01-19T14:00:00Z"
      }
    ]
  }
}
```

---

### Endpoint: `GET /api/brands`

**Purpose:** List all brands

**Query Parameters:**
- `limit` (integer, optional, default: 50, max: 100)
- `offset` (integer, optional, default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "brands": [
      {
        "id": "uuid",
        "name": "Brand Name",
        "created_at": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "total": 5,
      "limit": 50,
      "offset": 0
    }
  }
}
```

---

### Endpoint: `POST /api/brands`

**Purpose:** Create new brand

**Request Body:**
```json
{
  "name": "string (required, max 255 chars, unique)"
}
```

**Process:**
1. Validate name uniqueness
2. Create brand record
3. Optionally create default voice profile

**Response:**
```json
{
  "success": true,
  "data": {
    "brand_id": "uuid",
    "name": "Brand Name"
  }
}
```

---

### Endpoint: `GET /api/brands/:brand_id/profiles`

**Purpose:** List voice profiles for a brand

**Response:**
```json
{
  "success": true,
  "data": {
    "profiles": [
      {
        "id": "uuid",
        "profile_name": "Professional",
        "global_tone": "Professional but approachable",
        "created_at": "2025-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

### Endpoint: `POST /api/brands/:brand_id/profiles`

**Purpose:** Create new voice profile

**Request Body:**
```json
{
  "profile_name": "string (required)",
  "global_tone": "string (optional)",
  "global_dos": ["string"] /* optional */,
  "global_donts": ["string"] /* optional */,
  "target_audience": "string (optional)",
  "brand_keywords": ["string"] /* optional */,
  "examples": [
    {
      "input": "string",
      "output": "string"
    }
  ] /* optional, max 3 */
}
```

**Validation:**
- `profile_name` must be unique within brand
- Examples array max 3 items

**Response:**
```json
{
  "success": true,
  "data": {
    "profile_id": "uuid",
    "profile_name": "Professional"
  }
}
```

---

### Endpoint: `GET /api/profiles/:profile_id/platforms`

**Purpose:** Get all platform configurations for a voice profile

**Response:**
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "uuid",
      "profile_name": "Professional",
      "global_tone": "Professional but approachable"
    },
    "platforms": [
      {
        "id": "uuid",
        "platform": "instagram",
        "tone_override": "More casual",
        "custom_instructions": "Always start with question",
        "image_width": 1080,
        "image_height": 1080,
        "char_limit": 2200,
        "hashtag_count_min": 10,
        "hashtag_count_max": 15,
        "enabled": true
      }
    ]
  }
}
```

---

### Endpoint: `GET /api/profiles/:profile_id/platforms/:platform`

**Purpose:** Get specific platform configuration

**URL Parameters:**
- `profile_id` (UUID, required)
- `platform` (string, required) - One of: instagram, linkedin, twitter, facebook, pinterest, tiktok

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "platform": "instagram",
    "tone_override": "More casual",
    "custom_instructions": "Always start with question",
    "image_width": 1080,
    "image_height": 1080,
    "char_limit": 2200,
    "hashtag_count_min": 10,
    "hashtag_count_max": 15,
    "system_prompt": "You are a social media copywriter...",
    "user_prompt_template": "Rewrite the following...",
    "examples": [
      {
        "input": "Title: 5 AI Tools\nBody: ...",
        "output": "🤔 Still doing marketing manually?..."
      }
    ],
    "best_posting_time": "14:00:00",
    "posting_frequency": "daily",
    "enabled": true
  }
}
```

---

### Endpoint: `PUT /api/profiles/:profile_id/platforms/:platform`

**Purpose:** Update platform configuration

**Request Body:**
```json
{
  "tone_override": "string (optional)",
  "custom_instructions": "string (optional)",
  "image_width": "integer (optional)",
  "image_height": "integer (optional)",
  "char_limit": "integer (optional)",
  "hashtag_count_min": "integer (optional)",
  "hashtag_count_max": "integer (optional)",
  "system_prompt": "string (optional)",
  "user_prompt_template": "string (optional)",
  "examples": [
    {
      "input": "string",
      "output": "string"
    }
  ] /* optional, max 2 per platform */,
  "best_posting_time": "HH:MM:SS (optional)",
  "posting_frequency": "string (optional)",
  "enabled": "boolean (optional)"
}
```

**Validation:**
- Image dimensions must be positive integers
- Char limit between 1 and 100,000
- hashtag_count_min <= hashtag_count_max
- best_posting_time must be valid time format
- Examples max 2 items

**Process:**
1. Validate all fields
2. Update or create platform_configs record
3. Return updated configuration

**Response:**
```json
{
  "success": true,
  "data": {
    "platform": "instagram",
    "updated_fields": ["tone_override", "custom_instructions"]
  }
}
```

---

### Endpoint: `POST /api/profiles/:profile_id/platforms/:platform/test`

**Purpose:** Test platform configuration with sample content

**Request Body:**
```json
{
  "test_title": "string (required)",
  "test_body": "string (required)",
  "test_image_url": "string (optional)"
}
```

**Process:**
1. Load platform configuration
2. Call n8n test webhook (separate from production webhook)
3. Generate output using test content
4. Return preview WITHOUT saving to database

**Response:**
```json
{
  "success": true,
  "data": {
    "platform": "instagram",
    "test_output": {
      "optimized_image_url": "https://cloudinary.../test.jpg",
      "rewritten_copy": "Generated test caption",
      "hashtags": ["#test", "#marketing"],
      "tokens_used": 847,
      "processing_time_ms": 3421
    }
  }
}
```

**Use Case:**
- User configures platform settings
- Clicks "Test Configuration"
- Sees preview before saving
- Can iterate on settings

---

### Endpoint: `POST /api/n8n/webhook/trigger`

**Purpose:** Internal endpoint to trigger n8n workflows from API

**Authentication:** Internal only (not exposed to frontend directly)

**Request Body:**
```json
{
  "workflow_type": "master_orchestrator" | "platform_processor" | "scheduler",
  "payload": { /* workflow-specific data */ }
}
```

**Process:**
1. Construct n8n webhook URL from environment variables
2. Forward request to n8n
3. Handle n8n response/errors

**Response:**
```json
{
  "success": true,
  "data": {
    "n8n_execution_id": "string",
    "status": "triggered"
  }
}
```

---

### Endpoint: `POST /api/n8n/callback`

**Purpose:** Callback endpoint for n8n to report processing completion

**Authentication:** Verify request comes from n8n (shared secret in header)

**Request Body:**
```json
{
  "content_id": "uuid",
  "platform": "string",
  "status": "success" | "failed",
  "output": {
    "optimized_image_url": "string",
    "rewritten_copy": "string",
    "hashtags": ["string"],
    "tokens_used": "integer",
    "processing_time_ms": "integer"
  },
  "error_message": "string (if failed)"
}
```

**Process:**
1. Verify callback authenticity
2. Update `platform_outputs` table with results
3. Check if all target platforms complete
4. If all complete, update `content_queue.status` to 'complete'
5. Optionally trigger webhook/email notification to user

**Response:**
```json
{
  "success": true,
  "data": {
    "acknowledged": true
  }
}
```

---

## Dashboard UI Specification

### Technology Requirements
- **Framework:** Next.js with App Router
- **Styling:** Tailwind CSS
- **Component Library:** shadcn/ui (recommended) or custom components
- **State Management:** React Context API or Zustand for global state
- **Forms:** React Hook Form with Zod validation
- **Icons:** Lucide React or Heroicons

### Design Principles
1. **Zero-config first:** Works immediately with defaults
2. **Progressive disclosure:** Advanced settings hidden until needed
3. **Real-time feedback:** Show processing status with progress indicators
4. **Mobile responsive:** Usable on tablets (minimum), optimized for desktop
5. **Accessibility:** WCAG 2.1 AA compliance
6. **Error handling:** Clear, actionable error messages

---

### Page: Dashboard Home (`/dashboard`)

**Purpose:** Main landing page after authentication

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Header: Logo | Brand Selector | User Menu                  │
├─────────────────────────────────────────────────────────────┤
│  Sidebar:                      │  Main Content Area:         │
│  - Dashboard (active)          │                             │
│  - Create Content              │  ┌─────────────────────┐   │
│  - Content Library             │  │ Recent Content      │   │
│  - Configuration               │  │                     │   │
│  - Analytics                   │  │ [Cards showing      │   │
│                                │  │  recent submissions]│   │
│                                │  └─────────────────────┘   │
│                                │                             │
│                                │  ┌─────────────────────┐   │
│                                │  │ Quick Actions       │   │
│                                │  │ [+ Create Content]  │   │
│                                │  │ [⚙ Configure]      │   │
│                                │  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Components:**

**Recent Content Cards:**
- Show last 5 submitted content pieces
- Display: title, status badge, platforms, timestamp
- Status badges:
  - Pending (yellow)
  - Processing (blue, animated)
  - Complete (green)
  - Failed (red)
- Click card → navigate to content detail page

**Quick Stats:**
- Total content created
- Content in queue
- Content published this week
- Most-used platform

**Quick Actions:**
- Large "Create New Content" button
- Link to configuration
- Link to analytics

---

### Page: Create Content (`/dashboard/create`)

**Purpose:** Submit new content for processing

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Dashboard        CREATE NEW CONTENT              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Brand:           [Dropdown: Select Brand ▼]                │
│  Voice Profile:   [Dropdown: Select Profile ▼]              │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Title: *                                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 5 AI Tools Every Marketer Needs                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Body: *                                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ [Rich text editor or textarea]                       │   │
│  │                                                       │   │
│  │ AI is transforming marketing. Here are 5 tools...    │   │
│  │                                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Images:                                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  [Upload] or [Paste URL]                            │   │
│  │                                                       │   │
│  │  📷 hero-image.jpg ✓ [Remove]                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Target Platforms: *                                         │
│  ☑ Instagram   ☑ LinkedIn   ☑ Twitter                      │
│  ☑ Facebook    ☐ Pinterest  ☐ TikTok                       │
│                                                              │
│  [Cancel]                    [Generate Previews →]          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Form Validation:**
- Title required, max 500 characters
- Body required, max 50,000 characters
- At least one platform must be selected
- Image URL must be valid HTTP(S) format (client-side validation only)
- Brand and voice profile required

**Workflow:**
1. User fills form
2. Clicks "Generate Previews"
3. Form submits to `POST /api/content/create`
4. Redirect to content detail page with content_id
5. Show processing status in real-time

**Error Handling:**
- Display validation errors inline
- If API call fails, show error banner
- Allow user to retry without losing form data

---

### Page: Content Detail (`/dashboard/content/:content_id`)

**Purpose:** View processing status and preview generated outputs

**Layout (Processing State):**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Dashboard                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  5 AI Tools Every Marketer Needs                            │
│  Status: 🔵 Processing...                                    │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Platform Status:                                            │
│  ✅ Instagram    - Complete                                 │
│  ✅ LinkedIn     - Complete                                 │
│  🔵 Twitter      - Processing...                            │
│  ⏳ Facebook     - Pending                                  │
│                                                              │
│  [Refresh Status]                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Layout (Complete State):**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back                 GENERATED CONTENT - READY TO REVIEW │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  5 AI Tools Every Marketer Needs                            │
│  Status: ✅ Complete                                         │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  ┌──────────────────────┬──────────────────────┐            │
│  │   📱 INSTAGRAM       │   💼 LINKEDIN         │            │
│  ├──────────────────────┼──────────────────────┤            │
│  │ [Image Preview]      │ [Image Preview]      │            │
│  │ 1080x1080            │ 1200x627             │            │
│  │                      │                      │            │
│  │ 🤔 Still doing       │ Manual marketing is  │            │
│  │ marketing manually?  │ costing you growth.  │            │
│  │                      │                      │            │
│  │ We tested 50+ AI     │ We analyzed 50+ AI   │            │
│  │ tools. These 5...    │ tools and found...   │            │
│  │                      │                      │            │
│  │ #marketing #AI       │ #B2BMarketing        │            │
│  │ #contentcreation     │ #AItools             │            │
│  │ (+ 12 more)          │ #Marketing           │            │
│  │                      │                      │            │
│  │ [✏ Edit] [✓ Approve] │ [✏ Edit] [✓ Approve] │            │
│  └──────────────────────┴──────────────────────┘            │
│                                                              │
│  [Similar cards for Twitter, Facebook, etc.]                │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  [Regenerate Selected] [Edit Selected] [Approve All →]     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Auto-Refresh Logic:**
- If status is 'processing', poll `GET /api/content/:content_id/status` every 3 seconds
- Update UI with latest platform statuses
- Stop polling when status becomes 'complete', 'failed', or 'partial'
- Show progress bar or spinner during processing

**Preview Cards:**
- Each platform gets own card
- Show image preview (actual optimized image from Cloudinary)
- Display full copy
- Display hashtags
- Character count indicator (e.g., "1,847 / 2,200 chars")
- Two actions per card: Edit | Approve

**Edit Modal:**
When user clicks Edit button on a platform card:
```
┌─────────────────────────────────────────────────────────────┐
│  EDIT INSTAGRAM POST                                    [X] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Image Preview]                                             │
│                                                              │
│  Caption:                                     1,847 / 2,200 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🤔 Still doing marketing manually?                   │   │
│  │                                                       │   │
│  │ We tested 50+ AI tools. These 5 are game-changers... │   │
│  │                                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Hashtags:                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ #marketing #AI #contentcreation #automation          │   │
│  │ #productivity #business #entrepreneur #growth        │   │
│  │ #innovation #technology #digital #strategy           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  [Cancel]                                [Save Changes]     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Bulk Actions:**
- "Approve All" → marks all platforms as approved, proceed to scheduling
- "Edit Selected" → opens multi-edit interface
- "Regenerate Selected" → checkbox select platforms → regenerate only those

---

### Page: Schedule Content (`/dashboard/content/:content_id/schedule`)

**Purpose:** Schedule approved content for publication

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back                    SCHEDULE CONTENT                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  5 AI Tools Every Marketer Needs                            │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Scheduling Mode:                                            │
│  ◉ Use Best Times (from configuration)                      │
│  ○ Custom Schedule                                           │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  INSTAGRAM                                                   │
│  📅 Tuesday, Jan 21 at 2:00 PM EST                          │
│  [Preview card of content]                                   │
│                                                              │
│  LINKEDIN                                                    │
│  📅 Tuesday, Jan 21 at 9:00 AM EST                          │
│  [Preview card]                                              │
│                                                              │
│  TWITTER                                                     │
│  📅 Tuesday, Jan 21 at 11:00 AM EST                         │
│  [Preview card]                                              │
│                                                              │
│  [Additional platforms...]                                   │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  [Cancel]              [Save as Draft]  [Schedule All →]    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Scheduling Modes:**

**Best Times Mode:**
- Reads `platform_configs.best_posting_time` for each platform
- Automatically calculates next occurrence of that time
- If time has passed today, schedule for tomorrow
- Display calculated schedule times for user review

**Custom Schedule Mode:**
- Show date/time picker for each platform
- Validate all times are in future
- Allow different times for each platform

**Workflow:**
1. User reviews schedule
2. Clicks "Schedule All"
3. Call `POST /api/content/:content_id/schedule`
4. Show confirmation
5. Return to dashboard

**Save as Draft:**
- Option to save schedule without triggering
- Allows user to come back later and finalize

---

### Page: Configuration (`/dashboard/configure`)

**Purpose:** Configure brand voice and platform settings

**Navigation:**
```
Tabs:
[ Brand Profile ] [ Platform Settings ] [ Advanced ]
```

**Tab: Brand Profile**

```
┌─────────────────────────────────────────────────────────────┐
│  BRAND VOICE CONFIGURATION                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Current Profile: [Professional ▼]                          │
│  [+ Create New Profile]                                      │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  GLOBAL BRAND GUIDELINES                                     │
│  (Applied to all platforms unless overridden)                │
│                                                              │
│  Brand Tone:                                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Professional but approachable. Data-driven and       │   │
│  │ actionable.                                          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Target Audience:                                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ B2B marketing managers at 50-500 person companies    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Brand Keywords:                                             │
│  [AI automation] [efficiency] [ROI] [+ Add]                 │
│                                                              │
│  Do's:                                                       │
│  • Use data to back claims                                  │
│  • Include actionable tips                                  │
│  • Reference specific results                               │
│  [+ Add Do]                                                  │
│                                                              │
│  Don'ts:                                                     │
│  • Avoid hype language                                      │
│  • Don't use buzzwords without definition                   │
│  • Never promise overnight results                          │
│  [+ Add Don't]                                               │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  [Save Changes]                                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Tab: Platform Settings**

```
┌─────────────────────────────────────────────────────────────┐
│  PLATFORM-SPECIFIC SETTINGS                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Select Platform:                                            │
│  [Instagram ▼]                                               │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Platform Tone Override:                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ More casual than global tone. Emoji-friendly and     │   │
│  │ conversational.                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Custom Instructions:                                        │
│  • Always start with a question or hook                     │
│  • Use line breaks every 2 sentences                        │
│  • Include CTA in last paragraph                            │
│  • Reference "our community" not "followers"                │
│  [+ Add Instruction]                                         │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  TECHNICAL SETTINGS                                          │
│                                                              │
│  Image Size:    [1080] x [1080] px                          │
│  Char Limit:    [2200]                                       │
│  Hashtags:      [10] to [15]                                │
│  Best Time:     [2:00 PM] [EST]                             │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  FEW-SHOT EXAMPLES                                           │
│                                                              │
│  Example 1:                                                  │
│  Input:                                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Title: 5 AI Tools Every Marketer Needs              │   │
│  │ Body: AI is transforming marketing...               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Desired Output:                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🤔 Still doing marketing the manual way?            │   │
│  │                                                       │   │
│  │ We tested 50+ AI tools. These 5 are game-changers...│   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  [Edit] [Delete]                                             │
│                                                              │
│  [+ Add Example]                                             │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  [Test This Configuration]           [Save Changes]         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Test Configuration Feature:**
- Clicking "Test This Configuration" opens modal
- User enters sample title/body
- System generates preview using current (unsaved) settings
- Preview shows without saving to database
- Allows iterating on settings before committing

**Tab: Advanced**

```
┌─────────────────────────────────────────────────────────────┐
│  ADVANCED SETTINGS                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ⚠ Warning: Only modify these if you understand AI prompts │
│                                                              │
│  Platform: [Instagram ▼]                                     │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  System Prompt:                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ You are a social media copywriter specializing in   │   │
│  │ Instagram content for B2B brands. Your writing is   │   │
│  │ casual but professional, emoji-friendly, and        │   │
│  │ optimized for engagement.                            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  User Prompt Template:                                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Rewrite the following content for Instagram:        │   │
│  │                                                       │   │
│  │ TITLE: {{title}}                                     │   │
│  │ BODY: {{body}}                                       │   │
│  │                                                       │   │
│  │ BRAND VOICE: {{global_tone}}                         │   │
│  │ PLATFORM TONE: {{platform_tone}}                     │   │
│  │                                                       │   │
│  │ CUSTOM INSTRUCTIONS:                                 │   │
│  │ {{custom_instructions}}                              │   │
│  │                                                       │   │
│  │ REQUIREMENTS:                                        │   │
│  │ - Max {{char_limit}} characters                      │   │
│  │ - Use 2-3 emojis naturally                          │   │
│  │ - First line must hook the reader                   │   │
│  │ - End with engagement question                       │   │
│  │ - DO NOT include hashtags                           │   │
│  │                                                       │   │
│  │ TARGET AUDIENCE: {{target_audience}}                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Available Variables:                                        │
│  {{title}}, {{body}}, {{global_tone}}, {{platform_tone}},  │
│  {{custom_instructions}}, {{char_limit}}, {{target_audience}}│
│                                                              │
│  [Reset to Default]                      [Save Changes]     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### Component: Platform Preview Card

**Purpose:** Reusable component for displaying platform-specific content preview

**Props:**
- `platform` (string) - Platform name
- `imageUrl` (string) - Optimized image URL
- `copy` (string) - Generated or edited copy
- `hashtags` (string array) - Hashtags
- `charLimit` (number) - Platform character limit
- `onEdit` (function) - Callback when edit clicked
- `onApprove` (function) - Callback when approve clicked
- `approved` (boolean) - Whether user approved
- `userEdited` (boolean) - Whether user edited

**Visual States:**
- Default: White background, blue border
- Approved: Green border, checkmark badge
- Edited: Yellow badge "User Edited"
- Failed: Red border, error message

---

### Component: Status Badge

**Purpose:** Consistent status indicators

**Variants:**
- Pending: Yellow background, "Pending" text
- Processing: Blue background, spinning icon, "Processing..." text
- Complete: Green background, checkmark icon, "Complete" text
- Failed: Red background, X icon, "Failed" text
- Partial: Orange background, warning icon, "Partial" text

---

## n8n Workflow Logic

### Workflow Architecture Overview

**8 Total Workflows:**
1. Master Orchestrator (1)
2. Platform Processors (6) - Instagram, LinkedIn, Twitter, Facebook, Pinterest, TikTok
3. Scheduler (1)

**Communication Pattern:**
- Dashboard → Master Orchestrator (HTTP webhook)
- Master Orchestrator → Platform Processors (HTTP webhooks, parallel)
- Platform Processors → Dashboard API (HTTP callback)
- Scheduler → Buffer/Later API (scheduled HTTP)

---

### Workflow 1: Master Orchestrator

**Trigger:** Webhook from Dashboard API

**Input Payload:**
```json
{
  "content_id": "uuid",
  "brand_id": "uuid",
  "brand_voice_profile_id": "uuid"
}
```

**Node Sequence:**

**Node 1: Webhook Trigger**
- Type: Webhook
- Path: `/webhook/orchestrator`
- Method: POST
- Authentication: None (internal only)

**Node 2: Fetch Content**
- Type: PostgreSQL
- Query: `SELECT * FROM content_queue WHERE id = {{$json.content_id}}`
- Output: Content object (title, body, image_urls, target_platforms)

**Node 3: Fetch Brand Voice Profile**
- Type: PostgreSQL
- Query: `SELECT * FROM brand_voice_profiles WHERE id = {{$json.brand_voice_profile_id}}`
- Output: Profile object (global_tone, dos, donts, target_audience, examples)

**Node 4: Fetch Platform Configs**
- Type: PostgreSQL
- Query: `SELECT * FROM platform_configs WHERE brand_voice_profile_id = {{$json.brand_voice_profile_id}} AND platform = ANY({{$node["Fetch Content"].json.target_platforms}}) AND enabled = TRUE`
- Output: Array of platform config objects

**Node 5: Update Status to Processing**
- Type: PostgreSQL
- Query: `UPDATE content_queue SET status = 'processing', processing_started_at = NOW() WHERE id = {{$json.content_id}}`

**Node 6: Split By Platform**
- Type: Split In Batches
- Batch Size: 1
- Input: Array from "Fetch Platform Configs"
- Effect: Creates separate execution path for each platform

**Node 7: Call Platform Processor**
- Type: HTTP Request
- Method: POST
- URL: `http://n8n:5678/webhook/processor-{{$json.platform}}`
- Body: 
```json
{
  "content_id": "uuid",
  "content": {
    "title": "...",
    "body": "...",
    "image_urls": ["..."]
  },
  "brand_profile": {
    "global_tone": "...",
    "target_audience": "...",
    "examples": [...]
  },
  "platform_config": {
    "platform": "instagram",
    "tone_override": "...",
    "custom_instructions": "...",
    "image_width": 1080,
    "image_height": 1080,
    "char_limit": 2200,
    "hashtag_count_min": 10,
    "hashtag_count_max": 15,
    "system_prompt": "...",
    "user_prompt_template": "..."
  }
}
```
- Options: Execute once per item

**Node 8: Wait for All Platforms**
- Type: Wait
- Logic: Wait until all platform processor calls complete
- Timeout: 300 seconds (5 minutes)

**Node 9: Check Overall Status**
- Type: PostgreSQL
- Query: `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE rewritten_copy IS NOT NULL) as complete FROM platform_outputs WHERE content_id = {{$json.content_id}}`
- Logic: Determine if complete, partial, or failed

**Node 10: Update Final Status**
- Type: PostgreSQL
- Query: `UPDATE content_queue SET status = {{$json.final_status}}, processing_completed_at = NOW() WHERE id = {{$json.content_id}}`

**Node 11: Webhook Response**
- Type: Respond to Webhook
- Status Code: 200
- Body:
```json
{
  "content_id": "uuid",
  "status": "complete",
  "platforms_processed": ["instagram", "linkedin", "twitter"]
}
```

**Error Handling:**
- If any platform processor fails, continue with others
- Set status to 'partial' if some succeed
- Set status to 'failed' if all fail
- Log errors to separate table (optional)

---

### Workflow 2: Platform Processor (Instagram Example)

**Trigger:** Webhook from Master Orchestrator

**Input Payload:**
```json
{
  "content_id": "uuid",
  "content": { /* title, body, image_urls */ },
  "brand_profile": { /* global settings */ },
  "platform_config": { /* platform-specific settings */ }
}
```

**Node Sequence:**

**Node 1: Webhook Trigger**
- Type: Webhook
- Path: `/webhook/processor-instagram`
- Method: POST

**Node 2: Cloudinary - Resize Image**
- Type: HTTP Request
- Method: POST
- URL: `https://api.cloudinary.com/v1_1/{{$env.CLOUDINARY_CLOUD_NAME}}/image/upload`
- Body:
```json
{
  "file": "{{$json.content.image_urls[0]}}",
  "transformation": {
    "width": "{{$json.platform_config.image_width}}",
    "height": "{{$json.platform_config.image_height}}",
    "crop": "fill",
    "quality": "auto"
  }
}
```
- Authentication: API key in body
- Output: Optimized image URL

**Node 3: Build AI Prompt**
- Type: Function
- JavaScript Code:
```javascript
const content = $input.all()[0].json.content;
const brandProfile = $input.all()[0].json.brand_profile;
const platformConfig = $input.all()[0].json.platform_config;

// Build system prompt
const systemPrompt = platformConfig.system_prompt || "Default system prompt...";

// Build user prompt with variable substitution
let userPrompt = platformConfig.user_prompt_template;
userPrompt = userPrompt.replace('{{title}}', content.title);
userPrompt = userPrompt.replace('{{body}}', content.body);
userPrompt = userPrompt.replace('{{global_tone}}', brandProfile.global_tone);
userPrompt = userPrompt.replace('{{platform_tone}}', platformConfig.tone_override);
userPrompt = userPrompt.replace('{{custom_instructions}}', platformConfig.custom_instructions);
userPrompt = userPrompt.replace('{{char_limit}}', platformConfig.char_limit);
userPrompt = userPrompt.replace('{{target_audience}}', brandProfile.target_audience);

// Add few-shot examples
let fewShotPrompt = '';
if (brandProfile.example_input_1 && brandProfile.example_output_1) {
  fewShotPrompt += `Example 1:\nInput: ${brandProfile.example_input_1}\nOutput: ${brandProfile.example_output_1}\n\n`;
}
if (platformConfig.example_input_1 && platformConfig.example_output_1) {
  fewShotPrompt += `Platform Example:\nInput: ${platformConfig.example_input_1}\nOutput: ${platformConfig.example_output_1}\n\n`;
}

const finalPrompt = fewShotPrompt + userPrompt;

return {
  systemPrompt: systemPrompt,
  userPrompt: finalPrompt
};
```

**Node 4: Claude API - Generate Copy**
- Type: HTTP Request
- Method: POST
- URL: `https://api.anthropic.com/v1/messages`
- Headers:
  - `x-api-key`: `{{$env.ANTHROPIC_API_KEY}}`
  - `anthropic-version`: `2023-06-01`
  - `content-type`: `application/json`
- Body:
```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1000,
  "system": "{{$node["Build AI Prompt"].json.systemPrompt}}",
  "messages": [
    {
      "role": "user",
      "content": "{{$node["Build AI Prompt"].json.userPrompt}}"
    }
  ]
}
```
- Output: AI-generated copy

**Node 5: Extract Copy from Response**
- Type: Function
- JavaScript Code:
```javascript
const response = $input.all()[0].json;
const rewrittenCopy = response.content[0].text;
return { rewrittenCopy: rewrittenCopy };
```

**Node 6: Build Hashtag Prompt**
- Type: Function
- JavaScript Code:
```javascript
const content = $input.all()[0].json.content;
const platformConfig = $input.all()[0].json.platform_config;

const hashtagPrompt = `Generate ${platformConfig.hashtag_count_min}-${platformConfig.hashtag_count_max} Instagram hashtags for the following content:

TOPIC: ${content.title}
CONTENT SUMMARY: ${content.body.substring(0, 500)}

Requirements:
- Mix of popularity levels:
  * 2-3 highly popular (500k+ posts)
  * 4-5 medium (50k-500k posts)
  * 3-4 niche (5k-50k posts)
- Relevant to the topic
- No banned or spam hashtags
- Return ONLY the hashtags as a JSON array
- Format: ["#marketing", "#AItools", "#contentcreation"]

Return only valid JSON, no other text.`;

return { hashtagPrompt: hashtagPrompt };
```

**Node 7: Claude API - Generate Hashtags**
- Type: HTTP Request
- Method: POST
- URL: `https://api.anthropic.com/v1/messages`
- Body: (similar to copy generation, using hashtag prompt)
- Output: JSON array of hashtags

**Node 8: Parse Hashtags**
- Type: Function
- JavaScript Code:
```javascript
const response = $input.all()[0].json;
let hashtagsText = response.content[0].text;

// Remove markdown code fences if present
hashtagsText = hashtagsText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

// Parse JSON
const hashtags = JSON.parse(hashtagsText);

return { hashtags: hashtags };
```

**Node 9: Calculate Metadata**
- Type: Function
- JavaScript Code:
```javascript
const startTime = $input.all()[0].json.start_time; // Set in Node 1
const endTime = Date.now();
const processingTimeMs = endTime - startTime;

const copyTokens = $node["Claude API - Generate Copy"].json.usage.input_tokens + $node["Claude API - Generate Copy"].json.usage.output_tokens;
const hashtagTokens = $node["Claude API - Generate Hashtags"].json.usage.input_tokens + $node["Claude API - Generate Hashtags"].json.usage.output_tokens;
const totalTokens = copyTokens + hashtagTokens;

return {
  processing_time_ms: processingTimeMs,
  tokens_used: totalTokens,
  model_used: "claude-sonnet-4-20250514"
};
```

**Node 10: Save to Database**
- Type: PostgreSQL
- Query:
```sql
INSERT INTO platform_outputs 
  (content_id, platform, optimized_image_url, rewritten_copy, hashtags, 
   model_used, tokens_used, processing_time_ms)
VALUES 
  ({{$json.content_id}}, 'instagram', {{$node["Cloudinary - Resize Image"].json.secure_url}}, 
   {{$node["Extract Copy from Response"].json.rewrittenCopy}}, 
   {{$node["Parse Hashtags"].json.hashtags}}, 
   {{$node["Calculate Metadata"].json.model_used}}, 
   {{$node["Calculate Metadata"].json.tokens_used}}, 
   {{$node["Calculate Metadata"].json.processing_time_ms}})
RETURNING id;
```

**Node 11: Callback to Dashboard API**
- Type: HTTP Request
- Method: POST
- URL: `http://dashboard:3000/api/n8n/callback`
- Body:
```json
{
  "content_id": "uuid",
  "platform": "instagram",
  "status": "success",
  "output_id": "{{$node["Save to Database"].json.id}}"
}
```
- Headers:
  - `x-n8n-secret`: `{{$env.N8N_CALLBACK_SECRET}}`

**Node 12: Webhook Response**
- Type: Respond to Webhook
- Status Code: 200
- Body:
```json
{
  "platform": "instagram",
  "status": "success",
  "output_id": "uuid"
}
```

**Error Handling:**
- Wrap all nodes in Try-Catch
- If Cloudinary fails, return error to orchestrator
- If Claude API fails, retry up to 2 times with exponential backoff
- If database save fails, log error and alert
- Always respond to webhook even on failure

---

### Workflow 3-7: Other Platform Processors

**Structure:** Identical to Instagram processor with platform-specific variations

**Platform-Specific Differences:**

**LinkedIn:**
- Image size: 1200x627
- Longer char_limit: 3000
- Different system prompt (professional tone)
- Fewer hashtags: 3-5

**Twitter:**
- Image size: 1600x900
- Char_limit: 280 (strict enforcement)
- Very short copy
- Hashtags: 2-3

**Facebook:**
- Image size: 1200x630
- Long char_limit: 63,206
- Conversational tone
- Hashtags: 2-3

**Pinterest:**
- Image size: 1000x1500 (vertical)
- Medium char_limit: 500
- Keyword-rich descriptions
- Hashtags: 5-10

**TikTok:**
- Image size: 1080x1920 (9:16 ratio)
- Char_limit: 2200
- Fun, trend-aware tone
- Hashtags: 3-5

**Implementation Note:** All platform processors should be cloned from Instagram template and modified only where platform specs differ.

---

### Workflow 8: Scheduler

**Trigger:** Webhook from Dashboard API (scheduled content endpoint)

**Input Payload:**
```json
{
  "content_id": "uuid",
  "schedules": [
    {
      "output_id": "uuid",
      "platform": "instagram",
      "scheduled_for": "2025-01-19T14:00:00Z"
    }
  ]
}
```

**Node Sequence:**

**Node 1: Webhook Trigger**
- Path: `/webhook/scheduler`

**Node 2: Fetch Output Details**
- Type: PostgreSQL
- Query: `SELECT * FROM platform_outputs WHERE id = ANY({{$json.schedules.map(s => s.output_id)}})`

**Node 3: Split By Platform**
- Type: Split In Batches

**Node 4: Wait Until Scheduled Time**
- Type: Wait
- Resume At: `{{$json.scheduled_for}}`

**Node 5: Determine Copy to Use**
- Type: Function
- Logic: If user_edited is TRUE, use edited_copy, else use rewritten_copy

**Node 6: Buffer API - Create Post**
- Type: HTTP Request
- Method: POST
- URL: `https://api.buffer.com/1/updates/create.json`
- Body:
```json
{
  "profile_ids": ["{{$env.BUFFER_INSTAGRAM_PROFILE_ID}}"],
  "text": "{{$node["Determine Copy to Use"].json.finalCopy}}\n\n{{$node["Determine Copy to Use"].json.hashtags.join(' ')}}",
  "media": {
    "photo": "{{$json.optimized_image_url}}"
  },
  "scheduled_at": "{{$json.scheduled_for}}"
}
```
- Authentication: Access token in query params

**Node 7: Update Database**
- Type: PostgreSQL
- Query:
```sql
UPDATE platform_outputs 
SET buffer_post_id = {{$json.buffer_response.id}}, 
    published = TRUE, 
    published_at = NOW() 
WHERE id = {{$json.output_id}}
```

**Error Handling:**
- If Buffer API fails, retry 3 times
- If still fails, alert via email/Slack
- Update database with error status

---

## Data Flow Patterns

### Pattern 1: Content Creation Flow

```
User Submits Content (Dashboard)
  ↓
POST /api/content/create
  ↓
Create content_queue record (status: pending)
  ↓
Trigger n8n Master Orchestrator
  ↓
Update status → processing
  ↓
Orchestrator calls 6 platform processors in parallel
  ↓ (for each platform)
Processor: Fetch configs → Resize image → Generate copy → Generate hashtags
  ↓
Save to platform_outputs
  ↓
Callback to Dashboard API
  ↓
Dashboard updates status
  ↓
User polls status endpoint
  ↓
Status becomes 'complete'
  ↓
User views previews
```

### Pattern 2: Configuration Flow

```
User Opens Configuration Page
  ↓
GET /api/profiles/:profile_id/platforms
  ↓
Fetch all platform configs from database
  ↓
Display in UI
  ↓
User Edits Instagram Config
  ↓
User Clicks "Test Configuration"
  ↓
POST /api/profiles/:profile_id/platforms/instagram/test
  ↓
API calls n8n test endpoint (separate from production)
  ↓
Generate preview WITHOUT saving to database
  ↓
Return preview to user
  ↓
User Reviews Preview
  ↓
If Satisfied → Clicks "Save Changes"
  ↓
PUT /api/profiles/:profile_id/platforms/instagram
  ↓
Update platform_configs table
  ↓
Return success
```

### Pattern 3: Edit & Regenerate Flow

```
User Views Generated Content
  ↓
User Clicks Edit on Instagram Card
  ↓
Edit Modal Opens
  ↓
User Modifies Copy
  ↓
PATCH /api/content/:content_id/outputs/:output_id
  ↓
Update platform_outputs (set user_edited = TRUE)
  ↓
Return updated output
  ↓
UI Reflects Changes
  ↓
--- OR ---
User Clicks "Regenerate" on Instagram
  ↓
POST /api/content/:content_id/regenerate
  ↓
Delete existing platform_outputs record for Instagram
  ↓
Trigger n8n Instagram processor
  ↓
Generate new output
  ↓
Save to database
  ↓
User sees new version
```

### Pattern 4: Scheduling Flow

```
User Approves All Platforms
  ↓
Clicks "Schedule All"
  ↓
POST /api/content/:content_id/schedule
  ↓
Calculate schedule times (best times or custom)
  ↓
Update platform_outputs.scheduled_for for each platform
  ↓
Trigger n8n Scheduler workflow
  ↓
Scheduler waits until scheduled_for time
  ↓
At scheduled time: Call Buffer/Later API
  ↓
Buffer publishes to social platform
  ↓
Update platform_outputs.published = TRUE
  ↓
Optionally: Buffer webhook reports engagement metrics
  ↓
Update platform_outputs (likes, comments, shares)
```

---

## Business Logic Rules

### Rule 1: Platform Configuration Inheritance

**Hierarchy:**
1. Platform-specific settings (highest priority)
2. Global brand voice settings
3. System defaults (lowest priority)

**Examples:**
- If `platform_configs.tone_override` is NULL, use `brand_voice_profiles.global_tone`
- If `platform_configs.system_prompt` is NULL, use system default prompt
- Platform-specific examples take precedence over global examples

### Rule 2: User Edits vs. Generated Content

**Decision Logic:**
```
When publishing:
  IF platform_outputs.user_edited = TRUE:
    Use edited_copy and edited_hashtags
  ELSE:
    Use rewritten_copy and hashtags
```

**Tracking:**
- `user_edited` flag set to TRUE whenever user modifies output
- Original AI-generated content preserved for audit trail

### Rule 3: Status Determination

**content_queue.status:**
- `pending`: No processing started
- `processing`: At least one platform is being processed
- `complete`: ALL target platforms successfully generated
- `partial`: SOME platforms succeeded, SOME failed
- `failed`: ALL platforms failed

**Logic:**
```
total_platforms = LENGTH(target_platforms)
successful_platforms = COUNT(platform_outputs WHERE content_id = X AND rewritten_copy IS NOT NULL)

IF successful_platforms = 0:
  status = 'failed'
ELSE IF successful_platforms = total_platforms:
  status = 'complete'
ELSE:
  status = 'partial'
```

### Rule 4: Platform Enablement

**Filtering:**
- Only enabled platforms shown in UI
- Only enabled platforms processed
- Disabling platform mid-processing stops future requests but doesn't cancel in-flight

**Query Pattern:**
```sql
WHERE platform_configs.enabled = TRUE
```

### Rule 5: Image Handling

**Multiple Images:**
- If `content.image_urls` has multiple images, use first image for all platforms
- Future enhancement: Allow user to select different image per platform

**Image Validation:**
- Client-side: Validate URL format
- Server-side: No validation of image accessibility (rely on Cloudinary error handling)
- If Cloudinary fails, processor returns error

### Rule 6: Character Limit Enforcement

**Validation:**
- Dashboard: Show character count in real-time during editing
- Prevent user from exceeding platform char_limit
- If user pastes content exceeding limit, show warning but allow (they may edit down)

**AI Generation:**
- Claude prompted with char_limit in requirements
- If Claude exceeds limit, frontend truncates with ellipsis (edge case handling)

### Rule 7: Hashtag Management

**Generation:**
- Generated separately from copy
- Count determined by `hashtag_count_min` and `hashtag_count_max`
- AI prompted to provide range

**Display:**
- Copy and hashtags stored separately
- When displaying preview, show them separately
- When publishing, concatenate: `{copy}\n\n{hashtags.join(' ')}`

### Rule 8: Scheduling Time Calculation

**Best Times Mode:**
```
FOR each platform IN target_platforms:
  best_time = platform_configs.best_posting_time
  current_time = NOW()
  
  IF current_time.time > best_time:
    scheduled_time = TOMORROW at best_time
  ELSE:
    scheduled_time = TODAY at best_time
```

**Custom Mode:**
- User provides exact timestamp for each platform
- Validate all times are in future

### Rule 9: Retry Logic

**Claude API Failures:**
- Retry up to 2 times
- Exponential backoff: 2s, 4s
- If all retries fail, mark platform as failed

**Cloudinary Failures:**
- No retry (assume permanent failure)
- Return error immediately

**Database Failures:**
- No retry (indicates system issue)
- Log error and alert

### Rule 10: Concurrent Content Processing

**Parallelism:**
- Multiple users can submit content simultaneously
- Multiple content pieces from same user processed in parallel
- Within one content piece, platforms processed in parallel

**Queue Management:**
- No queue depth limit (database handles concurrency)
- n8n executes workflows independently

---

## Integration Requirements

### Integration 1: Anthropic Claude API

**Purpose:** AI-powered copy generation and hashtag generation

**API Version:** 2023-06-01 (use `anthropic-version` header)

**Authentication:**
- API key in `x-api-key` header
- Store in environment variable: `ANTHROPIC_API_KEY`

**Endpoints Used:**
- `POST /v1/messages` - Text generation

**Request Format:**
```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1000,
  "system": "System prompt here",
  "messages": [
    {
      "role": "user",
      "content": "User prompt here"
    }
  ]
}
```

**Response Format:**
```json
{
  "id": "msg_...",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "Generated content here"
    }
  ],
  "model": "claude-sonnet-4-20250514",
  "usage": {
    "input_tokens": 123,
    "output_tokens": 456
  }
}
```

**Error Handling:**
- 401: Invalid API key → Log error, alert admin
- 429: Rate limit → Retry with exponential backoff
- 500: Server error → Retry up to 2 times

**Rate Limits:**
- Track in application (optional)
- Respect Anthropic's rate limits (documented in their API)

**Cost Tracking:**
- Track `usage.input_tokens` and `usage.output_tokens`
- Store in `platform_outputs.tokens_used`
- Optionally: Calculate cost based on pricing

---

### Integration 2: Cloudinary API

**Purpose:** Image resizing and optimization

**Authentication:**
- API key, secret, and cloud name
- Store in environment variables: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

**Endpoints Used:**
- `POST /v1_1/:cloud_name/image/upload` - Upload and transform image

**Request Format:**
```json
{
  "file": "https://example.com/original-image.jpg",
  "transformation": {
    "width": 1080,
    "height": 1080,
    "crop": "fill",
    "quality": "auto",
    "fetch_format": "auto"
  },
  "api_key": "your_api_key",
  "timestamp": "unix_timestamp",
  "signature": "calculated_signature"
}
```

**Response Format:**
```json
{
  "public_id": "sample",
  "version": 1312461204,
  "signature": "...",
  "width": 1080,
  "height": 1080,
  "format": "jpg",
  "resource_type": "image",
  "created_at": "2025-01-18T10:30:00Z",
  "bytes": 120253,
  "type": "upload",
  "url": "http://res.cloudinary.com/.../image.jpg",
  "secure_url": "https://res.cloudinary.com/.../image.jpg"
}
```

**Error Handling:**
- 401: Invalid credentials → Log error, alert admin
- 400: Invalid image URL → Return error to user
- 500: Server error → Mark platform as failed

**Image Transformations:**
- `crop: fill` - Fills exact dimensions, crops excess
- `quality: auto` - Automatic quality optimization
- `fetch_format: auto` - Automatic format selection (WebP if supported)

---

### Integration 3: Buffer API

**Purpose:** Schedule and publish social media posts

**Authentication:**
- OAuth 2.0 access token
- Store in environment variable: `BUFFER_ACCESS_TOKEN`

**Profile IDs:**
- Each social platform has a profile ID
- Store in environment variables: `BUFFER_INSTAGRAM_PROFILE_ID`, `BUFFER_LINKEDIN_PROFILE_ID`, etc.

**Endpoints Used:**
- `POST /1/updates/create.json` - Create scheduled post

**Request Format:**
```json
{
  "profile_ids": ["instagram_profile_id"],
  "text": "Post content with hashtags",
  "media": {
    "photo": "https://cloudinary.com/.../image.jpg"
  },
  "scheduled_at": "2025-01-19T14:00:00Z",
  "access_token": "your_access_token"
}
```

**Response Format:**
```json
{
  "success": true,
  "message": "Update created.",
  "updates": [
    {
      "id": "buffer_post_id",
      "created_at": 1421156971,
      "due_at": 1421158771,
      "text": "Post content",
      "profile_id": "instagram_profile_id",
      "status": "pending"
    }
  ]
}
```

**Error Handling:**
- 401: Invalid token → Alert admin to refresh token
- 403: Profile not accessible → Check profile IDs
- 500: Server error → Retry up to 3 times

**Webhook Support:**
- Buffer can send webhooks when posts are published
- Configure webhook URL in Buffer settings
- Use to update `platform_outputs.published_at`

**Alternative:** Later API (similar structure)

---

### Integration 4: PostgreSQL Database

**Connection:**
- Use connection string from environment variable: `DATABASE_URL`
- Format: `postgresql://user:password@host:port/database`

**ORM:** Prisma

**Migrations:**
- Store in `prisma/migrations/` directory
- Run on container startup: `npx prisma migrate deploy`

**Connection Pooling:**
- Min: 2 connections
- Max: 10 connections
- Idle timeout: 10 seconds

**Query Guidelines:**
- Use prepared statements (Prisma handles this)
- Index all foreign keys
- Use transactions for multi-step operations

---

## Security & Authentication

### Authentication Strategy

**Method:** Session-based authentication via NextAuth.js

**No External Providers Required:**
- Users create local accounts
- Email + password authentication
- No Google/GitHub OAuth dependency (optional to add later)

**Session Storage:**
- Sessions stored in database
- Session table managed by NextAuth

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase, one lowercase, one number
- Hashed with bcrypt (handled by NextAuth)

---

### API Security

**Internal APIs:**
- Dashboard ↔ n8n communication uses internal network
- No external exposure

**External APIs:**
- n8n callback endpoint requires secret header
- Header: `x-n8n-secret: {shared_secret}`
- Shared secret stored in environment variable

**CSRF Protection:**
- NextAuth handles CSRF tokens automatically
- No additional implementation needed

---

### Data Security

**Sensitive Data:**
- API keys stored in environment variables
- Never stored in database
- Never exposed in API responses

**Database Access:**
- Prisma ORM prevents SQL injection
- Parameterized queries only

**Image URLs:**
- Public Cloudinary URLs (no sensitive data)
- Temporary signed URLs not required for this use case

---

### Network Security

**Docker Network:**
- All services on same bridge network
- Only expose necessary ports to host:
  - Dashboard: 3000
  - n8n: 5678
  - PostgreSQL: 5432 (optional, for external access)

**HTTPS:**
- Not implemented in Docker setup (assume reverse proxy handles)
- Production deployment should use nginx with SSL

---

### Input Validation

**Client-Side:**
- React Hook Form with Zod schemas
- Validate before API call

**Server-Side:**
- Validate ALL inputs in API routes
- Never trust client data
- Return 400 Bad Request with error details

**Validation Rules:**
- Title: Required, max 500 chars
- Body: Required, max 50,000 chars
- Image URLs: Valid URL format
- UUIDs: Valid UUID v4 format
- Platform names: Enum validation

---

## Configuration System

### Environment Variables

**Required Variables:**
```bash
# Database
DATABASE_URL=postgresql://user:password@postgres:5432/content_repurpose

# NextAuth
NEXTAUTH_SECRET=random_secret_key_here
NEXTAUTH_URL=http://localhost:3000

# n8n
N8N_CALLBACK_SECRET=shared_secret_for_callbacks

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Buffer (optional)
BUFFER_ACCESS_TOKEN=your_token
BUFFER_INSTAGRAM_PROFILE_ID=profile_id
BUFFER_LINKEDIN_PROFILE_ID=profile_id
BUFFER_TWITTER_PROFILE_ID=profile_id
BUFFER_FACEBOOK_PROFILE_ID=profile_id
BUFFER_PINTEREST_PROFILE_ID=profile_id
BUFFER_TIKTOK_PROFILE_ID=profile_id
```

**Optional Variables:**
```bash
# Ports (change if conflicting)
POSTGRES_PORT=5432
N8N_PORT=5678
DASHBOARD_PORT=3000

# n8n Settings
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=changeme

# Timezone
TIMEZONE=America/New_York
```

---

### Default Platform Configurations

**On First Run:**
- Seed database with default platform configs
- Users can override any setting

**Instagram Defaults:**
```json
{
  "platform": "instagram",
  "image_width": 1080,
  "image_height": 1080,
  "char_limit": 2200,
  "hashtag_count_min": 10,
  "hashtag_count_max": 15,
  "system_prompt": "You are a social media copywriter specializing in Instagram content for B2B brands. Your writing is casual but professional, emoji-friendly, and optimized for engagement.",
  "user_prompt_template": "Rewrite the following content for Instagram:\n\nTITLE: {{title}}\nBODY: {{body}}\n\nBRAND VOICE: {{global_tone}}\n\nREQUIREMENTS:\n- Max {{char_limit}} characters\n- Use 2-3 emojis naturally\n- First line must hook the reader\n- End with engagement question\n- DO NOT include hashtags\n\nTARGET AUDIENCE: {{target_audience}}",
  "best_posting_time": "14:00:00",
  "enabled": true
}
```

**(Repeat for all 6 platforms with appropriate defaults)**

---

### Prompt Template Variables

**Available Variables:**
- `{{title}}` - Content title
- `{{body}}` - Content body
- `{{global_tone}}` - Brand voice global tone
- `{{platform_tone}}` - Platform-specific tone override
- `{{custom_instructions}}` - Platform-specific custom instructions
- `{{char_limit}}` - Platform character limit
- `{{target_audience}}` - Brand voice target audience
- `{{brand_keywords}}` - Brand voice keywords (comma-separated)
- `{{global_dos}}` - Brand voice do's (newline-separated)
- `{{global_donts}}` - Brand voice don'ts (newline-separated)

**Variable Substitution:**
- Performed in n8n Function node
- Simple string replace
- Undefined variables replaced with empty string

---

## Error Handling Strategy

### Frontend Error Handling

**API Call Failures:**
- Show error banner at top of page
- Display human-readable error message
- Log full error to console
- Provide "Retry" button
- Don't lose user's form data

**Network Errors:**
- Detect offline status
- Show "No internet connection" message
- Automatically retry when connection restored

**Validation Errors:**
- Show inline error messages below fields
- Highlight invalid fields in red
- Prevent form submission until fixed

---

### Backend Error Handling

**API Route Errors:**
```javascript
try {
  // Business logic
} catch (error) {
  console.error('Error in API route:', error);
  return NextResponse.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }
  }, { status: 500 });
}
```

**Database Errors:**
- Catch Prisma errors
- Log full error
- Return generic error to client (don't expose database structure)

**External API Errors:**
- Log full error
- Retry if transient (rate limits, timeouts)
- Return specific error to client if permanent

---

### n8n Error Handling

**Workflow Level:**
- Wrap critical nodes in Error Trigger
- On error: Log to database error table (optional)
- Send error notification (email/Slack)
- Continue processing other platforms if possible

**Retry Logic:**
- Claude API: Retry 2 times, exponential backoff
- Cloudinary: No retry
- Buffer API: Retry 3 times

**Timeout Handling:**
- Set execution timeout to 300 seconds (5 minutes)
- If timeout, mark as failed and alert

---

### User-Facing Error Messages

**Good Error Messages:**
- ✅ "Unable to connect to AI service. Please try again in a moment."
- ✅ "This image URL couldn't be loaded. Please check the URL and try again."
- ✅ "Your API key is invalid. Please update it in Settings."

**Bad Error Messages:**
- ❌ "Error 500"
- ❌ "Prisma query failed"
- ❌ "Undefined is not a function"

**Error Code Mapping:**
```javascript
const errorMessages = {
  'INVALID_BRAND': 'Brand not found. Please select a valid brand.',
  'INVALID_PROFILE': 'Voice profile not found.',
  'VALIDATION_ERROR': 'Please check your input and try again.',
  'N8N_TRIGGER_FAILED': 'Unable to start processing. Please try again.',
  'ANTHROPIC_API_ERROR': 'AI service is temporarily unavailable.',
  'CLOUDINARY_ERROR': 'Image processing failed. Please check your image URL.',
  'BUFFER_ERROR': 'Unable to schedule post. Please check your Buffer connection.'
};
```

---

## Deployment Architecture

### Docker Compose Services

**Service: postgres**
- Image: `postgres:15-alpine`
- Purpose: Primary database
- Volumes: `postgres_data:/var/lib/postgresql/data`
- Ports: `5432:5432`
- Healthcheck: `pg_isready`

**Service: n8n**
- Image: `n8nio/n8n:latest`
- Purpose: Workflow automation
- Volumes: `n8n_data:/home/node/.n8n`
- Ports: `5678:5678`
- Depends on: postgres
- Environment: Database connection to postgres

**Service: dashboard**
- Build: `./dashboard/Dockerfile`
- Purpose: Frontend + API
- Ports: `3000:3000`
- Depends on: postgres, n8n
- Environment: Database + n8n URLs

**Service: nginx (optional)**
- Image: `nginx:alpine`
- Purpose: Reverse proxy
- Ports: `80:80`
- Config: Route `/` to dashboard, `/n8n` to n8n

---

### Volume Management

**Persistent Volumes:**
- `postgres_data` - Database files
- `n8n_data` - n8n workflows and credentials

**Backup Strategy:**
```bash
# Backup database
docker-compose exec postgres pg_dump -U admin content_repurpose > backup.sql

# Restore database
docker-compose exec -T postgres psql -U admin content_repurpose < backup.sql
```

---

### Container Networking

**Network: app-network**
- Type: bridge
- All services on same network
- Internal DNS: Service names (postgres, n8n, dashboard)

**Internal Communication:**
- Dashboard → PostgreSQL: `postgresql://admin:password@postgres:5432/content_repurpose`
- Dashboard → n8n: `http://n8n:5678/webhook/...`
- n8n → Dashboard: `http://dashboard:3000/api/n8n/callback`

---

### Startup Sequence

**Correct Order:**
1. PostgreSQL starts
2. Wait for PostgreSQL healthcheck
3. n8n starts (connects to PostgreSQL)
4. Dashboard starts (connects to PostgreSQL and n8n)
5. nginx starts (routes to dashboard and n8n)

**Healthchecks:**
- PostgreSQL: `pg_isready` command
- n8n: HTTP check on port 5678
- Dashboard: HTTP check on port 3000

---

### Environment File Structure

**File: `.env`**
- All configuration in one file
- Loaded by Docker Compose
- Example provided as `.env.example`

**Variable Interpolation:**
- Docker Compose interpolates `${VAR}` syntax
- Dashboard reads from `process.env`
- n8n reads from `process.env`

---

### First-Time Setup Script

**Script: `scripts/setup.sh`**

**Steps:**
1. Check if `.env` exists
2. Check if Docker is running
3. Start all services with `docker-compose up -d`
4. Wait for PostgreSQL healthcheck
5. Wait for n8n to be accessible
6. Import n8n workflows via API
7. Run database migrations via Prisma
8. Seed example data
9. Display access URLs and credentials

**User Experience:**
```bash
cd content-repurpose-engine
cp .env.example .env
nano .env  # Add API keys
./scripts/setup.sh

# Output:
# ✅ Setup complete!
# Dashboard: http://localhost:3000
# n8n: http://localhost:5678
```

---

## Performance Requirements

### Response Time Targets

**API Endpoints:**
- Simple queries (GET brand, GET profiles): < 200ms
- Complex queries (GET outputs with joins): < 500ms
- Content creation (POST /api/content/create): < 1s (just creates record + triggers webhook)

**Processing Time:**
- Single platform generation: 8-12 seconds
- All 6 platforms (parallel): 12-20 seconds
- Total user wait time: < 60 seconds

**Dashboard Loading:**
- Initial page load: < 2s
- Navigation between pages: < 500ms
- Preview card rendering: < 100ms

---

### Scalability Targets

**Concurrent Users:**
- Support 10 concurrent users without degradation
- Support 50 users with acceptable performance
- Vertical scaling (more CPU/RAM) for higher loads

**Content Volume:**
- Process 100 content pieces per day
- Store 10,000 historical content pieces
- Support 1,000 platform outputs per day

**Database:**
- Optimize queries with indexes
- Connection pooling (max 10 connections)
- Consider read replicas for large deployments (future)

---

### Resource Requirements

**Minimum System Requirements:**
- CPU: 2 cores
- RAM: 4 GB
- Disk: 20 GB
- OS: Linux (Ubuntu 20.04+)

**Recommended System Requirements:**
- CPU: 4 cores
- RAM: 8 GB
- Disk: 50 GB
- OS: Linux (Ubuntu 22.04+)

**Docker Resources:**
- PostgreSQL: 512 MB RAM
- n8n: 1 GB RAM
- Dashboard: 1 GB RAM
- Total: ~3 GB RAM minimum

---

### Optimization Strategies

**Database:**
- Index all foreign keys
- Index frequently queried columns (status, platform, published)
- Periodic VACUUM (PostgreSQL maintenance)

**Image Processing:**
- Cloudinary handles optimization
- Use `quality: auto` and `fetch_format: auto`
- Consider caching optimized images

**API Calls:**
- Batch database queries where possible
- Use Prisma's `include` for eager loading
- Avoid N+1 queries

**Frontend:**
- Code splitting for dashboard routes
- Lazy load heavy components
- Image optimization with Next.js Image component

---

## Testing Requirements

### Unit Testing

**Backend (API Routes):**
- Test each endpoint with valid inputs
- Test each endpoint with invalid inputs
- Test error handling
- Test authentication/authorization

**Frontend (Components):**
- Test form validation
- Test user interactions
- Test error states
- Test loading states

**Test Framework:** Jest + React Testing Library

---

### Integration Testing

**Database Operations:**
- Test Prisma queries
- Test transaction rollbacks
- Test constraint violations

**API Flows:**
- Test complete content creation flow
- Test configuration update flow
- Test edit and regenerate flow

**Test Framework:** Jest + Supertest

---

### End-to-End Testing

**User Flows:**
1. Create brand → Create profile → Submit content → View outputs → Schedule
2. Update configuration → Test configuration → Save → Create content
3. View content → Edit output → Approve → Schedule

**Test Framework:** Playwright or Cypress

---

### Manual Testing Checklist

**Before Release:**
- [ ] Create brand and profile
- [ ] Submit test content for all 6 platforms
- [ ] Verify outputs match platform specs (image size, char limit, hashtag count)
- [ ] Edit outputs and verify changes persist
- [ ] Regenerate single platform
- [ ] Schedule content and verify Buffer/Later integration
- [ ] Test configuration with custom prompts and examples
- [ ] Test error handling (invalid API key, network failure)
- [ ] Test responsive design on mobile
- [ ] Test Docker deployment on clean system

---

## Additional Specifications

### Logging Strategy

**Application Logs:**
- Log level: INFO in production, DEBUG in development
- Log format: JSON structured logs
- Log destination: stdout (Docker captures)

**What to Log:**
- API requests and responses (exclude sensitive data)
- Database queries (in development only)
- External API calls (status, duration)
- Errors with full stack traces

**What NOT to Log:**
- API keys
- User passwords
- Full request bodies with sensitive data

---

### Monitoring (Optional)

**Health Endpoints:**
- `GET /api/health` - Dashboard health
- `GET /health` (n8n built-in) - n8n health

**Metrics to Track:**
- Content creation rate (per day)
- Processing success rate (% complete vs failed)
- Average processing time per platform
- API error rates
- Database connection pool utilization

**Alerting:**
- Email/Slack notification on repeated failures
- Alert if processing time exceeds 120 seconds

---

### Backup & Recovery

**Database Backups:**
- Automated daily backups via cron
- Store in separate volume or external storage
- Retention: 7 daily, 4 weekly, 12 monthly

**Restore Process:**
- Stop services
- Restore database from backup
- Restart services
- Verify data integrity

**Disaster Recovery:**
- Document restoration process
- Test restore process quarterly

---

### Future Enhancements (Out of Scope)

**Not Required for v1.0:**
- Multi-user authentication (current: single user per installation)
- Team collaboration features
- Analytics dashboard with charts
- Webhook integrations beyond Buffer/Later
- Custom platform support (user-defined platforms)
- AI model selection (Claude vs GPT vs others)
- Bulk content import (CSV upload)
- Content calendar view
- A/B testing of copy variations
- Engagement analytics from social platforms

**These can be added later but are NOT required for initial release.**

---

## Implementation Priority

**Phase 1: Core Infrastructure (Week 1)**
1. Docker Compose setup
2. Database schema and migrations
3. Basic Next.js dashboard skeleton
4. Authentication setup

**Phase 2: Content Processing (Week 2)**
1. API endpoints for content creation
2. n8n Master Orchestrator workflow
3. Instagram processor (reference implementation)
4. Clone to other 5 platforms

**Phase 3: UI & UX (Week 3)**
1. Create content form
2. Content detail page with previews
3. Edit and regenerate functionality
4. Scheduling interface

**Phase 4: Configuration (Week 4)**
1. Configuration pages
2. Test configuration feature
3. Example management
4. Advanced prompt editing

**Phase 5: Polish & Testing (Week 5)**
1. Error handling
2. Loading states
3. Documentation
4. End-to-end testing
5. Docker setup script

---

## Success Criteria

**The system is complete when:**

1. ✅ User can deploy with single command: `./scripts/setup.sh`
2. ✅ User can create content and receive 6 platform outputs within 60 seconds
3. ✅ User can fully customize AI behavior per platform
4. ✅ User can edit outputs before scheduling
5. ✅ User can schedule to Buffer/Later
6. ✅ System handles errors gracefully (no crashes)
7. ✅ All data persists across container restarts
8. ✅ Documentation is complete and accurate
9. ✅ Zero external dependencies (besides API keys)
10. ✅ Mobile-responsive UI

---

## End of Specification

**Total Document Length:** ~25,000 words  
**Estimated Implementation Time:** 4-5 weeks (1 developer)  
**Estimated Lines of Code:** ~15,000 lines  

**This specification provides complete architectural guidance for building the Content Repurpose Engine without requiring code-level implementation details.**

---

**Questions for Implementation:**

If Claude Code needs clarification during implementation, refer back to these sections:
- Database schema → Section 3
- API endpoints → Section 4
- UI components → Section 5
- n8n workflows → Section 6
- Data flows → Section 7
- Business rules → Section 8

**No ambiguity should exist. If something is unclear, it's a specification bug and should be reported.**
