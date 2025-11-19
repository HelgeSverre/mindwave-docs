# Upgrade Guide

This guide covers upgrading to Mindwave v1.0 and staying current with future releases.

## Overview

Mindwave v1.0 represents a **strategic pivot** from an experimental agent/crew framework to production-grade AI utilities for Laravel. This guide will help you:

- Understand the architectural changes
- Migrate from pre-v1.0 alpha versions (if applicable)
- Upgrade Laravel versions alongside Mindwave
- Adopt new v1.0 features

**Estimated upgrade time:**
- **Fresh installation:** 10-15 minutes
- **From v0.0.x alpha (agent/crew):** 30-60 minutes (requires code migration)
- **Laravel 10 → 11 upgrade:** 20-30 minutes (see Laravel docs)

::: danger IMPORTANT
Always backup your database and codebase before upgrading. Test upgrades in a staging environment first.
:::

## What Changed in v1.0

### The Strategic Pivot

Mindwave v1.0 pivoted from being "yet another agent framework" to **production AI utilities**:

**Removed (v0.0.x alpha):**
- ❌ Agent orchestration framework
- ❌ Crew-based multi-agent systems
- ❌ Complex workflow engines
- ❌ Agent/Crew classes and interfaces

**Added (v1.0):**
- ✅ **PromptComposer** - Auto-fit long prompts to context windows
- ✅ **Streaming SSE** - Real-time LLM responses with Server-Sent Events
- ✅ **OpenTelemetry Tracing** - Observability with database storage and OTLP export
- ✅ **Context Discovery** - TNTSearch-powered ad-hoc RAG from DB/CSV

### Philosophy Change

```
v0.0.x: "Build autonomous agents and crews"
   ↓
v1.0:   "Production utilities for shipping AI features fast"
```

The new Mindwave focuses on practical tools Laravel developers actually need when building LLM-powered features, not abstract agent frameworks.

## Version Requirements

### Mindwave v1.0

| Requirement | Version |
|-------------|---------|
| PHP | `^8.2 \| ^8.3 \| ^8.4` |
| Laravel | `^11.0` |
| Extensions | `ext-zip` |

### Laravel Version Support

Mindwave v1.0 **requires Laravel 11.x**. If you're on Laravel 10, you must upgrade Laravel first.

See: [Laravel 11 Upgrade Guide](https://laravel.com/docs/11.x/upgrade)

## Upgrading to v1.0

### From v0.0.x Alpha (Agent/Crew Framework)

If you used Mindwave's experimental agent/crew features, follow this migration path.

#### Step 1: Backup Everything

```bash
# Backup database
php artisan db:backup  # or your preferred method

# Backup config files
cp -r config/mindwave* backups/

# Create git branch
git checkout -b upgrade-mindwave-v1
git add .
git commit -m "Backup before Mindwave v1.0 upgrade"
```

#### Step 2: Update Dependencies

Update your `composer.json`:

```json
{
    "require": {
        "mindwave/mindwave": "^1.0"
    }
}
```

Run Composer update:

```bash
composer update mindwave/mindwave
```

If you encounter dependency conflicts, try:

```bash
# Remove vendor and lock
rm -rf vendor composer.lock

# Reinstall
composer install
```

#### Step 3: Update Configuration

The agent/crew config files are no longer needed. Remove them:

```bash
# Remove old config files (if they exist)
rm config/mindwave-agent.php
rm config/mindwave-crew.php
```

Publish new v1.0 config files:

```bash
# Publish all Mindwave configs
php artisan vendor:publish --tag="mindwave-config"
```

This creates:
- `config/mindwave-llm.php` - LLM provider settings
- `config/mindwave-tracing.php` - OpenTelemetry tracing
- `config/mindwave-context.php` - Context discovery settings
- `config/mindwave-embeddings.php` - Embedding providers (optional)
- `config/mindwave-vectorstore.php` - Vector stores (optional)

#### Step 4: Run Migrations

Mindwave v1.0 adds database tables for tracing:

```bash
php artisan migrate
```

This creates:
- `mindwave_traces` - OpenTelemetry trace storage
- `mindwave_spans` - Span data for traces
- `mindwave_span_messages` - LLM message content (optional)

#### Step 5: Migrate Agent Code to New Patterns

The `Agent` and `Crew` classes have been removed. Here's how to migrate:

##### Old Pattern (v0.0.x): Agent-Based

```php
use Mindwave\Mindwave\Agents\Agent;
use Mindwave\Mindwave\Crew\Task;

// ❌ OLD: Agent-based architecture
$agent = new Agent(
    name: 'Support Agent',
    role: 'Customer support',
    goal: 'Answer customer questions',
    backstory: 'Expert in our product',
    tools: [$searchTool, $emailTool]
);

$task = new Task(
    description: 'Answer: ' . $question,
    agent: $agent
);

$result = $task->execute();
```

##### New Pattern (v1.0): PromptComposer + Direct LLM

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;

// ✅ NEW: Direct LLM with context discovery
$response = Mindwave::prompt()
    ->section('system', 'You are an expert customer support agent specializing in our product.')
    ->context(
        TntSearchSource::fromEloquent(
            FAQ::published(),
            fn($faq) => "Q: {$faq->question}\nA: {$faq->answer}"
        ),
        limit: 5
    )
    ->section('user', $question)
    ->fit()  // Auto-fits to model's context window
    ->run();

echo $response->choices[0]->message->content;
```

##### Migration Strategy

For each agent/crew implementation, ask:

1. **What was the agent's goal?** → Becomes your system prompt
2. **What tools did it use?** → Replace with context sources or direct API calls
3. **What was the workflow?** → Simplify to direct LLM calls with proper context

**Example transformations:**

| Old (Agent/Crew) | New (v1.0) | Notes |
|------------------|------------|-------|
| Agent with search tool | `TntSearchSource::fromEloquent()` | Replace tool with context source |
| Multi-agent crew | Sequential LLM calls | Chain prompts instead of agents |
| Agent memory | Context sections + database | Store conversation in DB, load via context |
| Agent tools | Direct API calls | Call APIs directly, no wrapper needed |

#### Step 6: Update LLM Calls

If you used low-level LLM drivers directly:

```php
// ❌ OLD (if this pattern existed in v0.0.x)
use Mindwave\Mindwave\LLM\LLMDriver;

$llm = new LLMDriver('openai');
$response = $llm->generate($prompt);

// ✅ NEW: Use Facade
use Mindwave\Mindwave\Facades\Mindwave;

$response = Mindwave::llm()->chat([
    ['role' => 'system', 'content' => 'You are a helpful assistant.'],
    ['role' => 'user', 'content' => $prompt]
]);
```

#### Step 7: Remove Obsolete Code

Search your codebase for removed classes:

```bash
# Find references to removed classes
grep -r "Agent" app/
grep -r "Crew" app/
grep -r "AgentExecutor" app/
grep -r "Task" app/ | grep "Mindwave"

# Remove imports
# Remove old agent/crew implementations
```

Classes removed in v1.0:
- `Mindwave\Mindwave\Agents\Agent`
- `Mindwave\Mindwave\Agents\AgentExecutor`
- `Mindwave\Mindwave\Agents\AgentInterface`
- `Mindwave\Mindwave\Agents\Actions\*`
- `Mindwave\Mindwave\Crew\Crew`
- `Mindwave\Mindwave\Crew\Agent`
- `Mindwave\Mindwave\Crew\Task`
- `Mindwave\Mindwave\Crew\AgentTools`

#### Step 8: Test Thoroughly

Create a test checklist:

```markdown
## Upgrade Test Checklist

- [ ] Application boots without errors
- [ ] LLM calls work (test with simple prompt)
- [ ] Config files load correctly
- [ ] Migrations ran successfully
- [ ] No references to Agent/Crew classes
- [ ] Existing features still work
- [ ] Unit tests pass
- [ ] Integration tests pass
```

Run your tests:

```bash
# Clear caches
php artisan config:clear
php artisan cache:clear
php artisan view:clear

# Run tests
php artisan test
```

#### Step 9: Adopt New Features (Optional)

Now that you've migrated, consider adopting v1.0 features:

**Enable Tracing (Recommended):**

```bash
# .env
MINDWAVE_TRACING_ENABLED=true
MINDWAVE_TRACE_DATABASE=true
```

**Monitor costs:**

```php
use Mindwave\Mindwave\Observability\Models\Trace;

// Find expensive LLM calls
$expensive = Trace::where('estimated_cost', '>', 0.10)
    ->orderBy('estimated_cost', 'desc')
    ->get();

// Daily cost summary
$costs = Trace::selectRaw('
    DATE(created_at) as date,
    SUM(estimated_cost) as total_cost
')
->groupBy('date')
->get();
```

**Add Streaming (Recommended):**

```php
// Backend
Route::get('/chat', function (Request $request) {
    return Mindwave::stream($request->input('message'))
        ->model('gpt-4')
        ->respond();
});

// Frontend
const stream = new EventSource('/chat?message=' + encodeURIComponent(question));
stream.onmessage = e => output.textContent += e.data;
stream.addEventListener('done', () => stream.close());
```

See: [Streaming Guide](/docs/streaming)

---

### Fresh Installation (No Previous Version)

If you're installing Mindwave for the first time, this is simple:

#### Step 1: Install Package

```bash
composer require mindwave/mindwave
```

#### Step 2: Publish Configuration

```bash
php artisan vendor:publish --tag="mindwave-config"
```

#### Step 3: Configure API Keys

Add to `.env`:

```bash
# OpenAI (required)
MINDWAVE_OPENAI_API_KEY=sk-...

# Mistral (optional)
MINDWAVE_MISTRAL_API_KEY=...

# Tracing (recommended)
MINDWAVE_TRACING_ENABLED=true
MINDWAVE_TRACE_DATABASE=true
```

#### Step 4: Run Migrations

```bash
php artisan migrate
```

#### Step 5: Test Installation

```bash
php artisan tinker
```

```php
use Mindwave\Mindwave\Facades\Mindwave;

$response = Mindwave::llm()->chat([
    ['role' => 'user', 'content' => 'Say hello!']
]);

echo $response->choices[0]->message->content;
// "Hello! How can I assist you today?"
```

You're ready to go! See: [Quick Start Guide](/docs/quick-start)

---

## New Features to Adopt

Once upgraded, explore these v1.0 features:

### 1. PromptComposer - Token Management

**Why adopt:** Automatically handle context window limits without manual token counting.

```php
use Mindwave\Mindwave\Facades\Mindwave;

Mindwave::prompt()
    ->reserveOutputTokens(500)
    ->section('system', $instructions, priority: 100)
    ->section('context', $largeDocument, priority: 50, shrinker: 'summarize')
    ->section('user', $question, priority: 100)
    ->fit()  // Auto-trims to model's context window
    ->run();
```

**Benefits:**
- No more context window errors
- Smart priority-based trimming
- Multiple shrinker strategies (summarize, truncate, compress)

See: [PromptComposer Guide](/docs/prompt-composer)

### 2. OpenTelemetry Tracing - Observability

**Why adopt:** Gain visibility into LLM costs, performance, and debugging.

```php
// Zero config - all LLM calls are automatically traced
$response = Mindwave::llm()->chat($messages);

// Query traces
use Mindwave\Mindwave\Observability\Models\Trace;
use Mindwave\Mindwave\Observability\Models\Span;

$expensive = Trace::where('estimated_cost', '>', 0.10)->get();
$slow = Span::where('duration', '>', 5_000_000_000)->get();
```

**Benefits:**
- Automatic cost tracking
- Performance monitoring
- Export to Jaeger/Grafana/Honeycomb
- PII protection with configurable message capture

**Artisan commands:**

```bash
# Export traces
php artisan mindwave:export-traces --since=yesterday --format=csv

# View statistics
php artisan mindwave:trace-stats

# Prune old traces
php artisan mindwave:prune-traces --older-than=30days
```

See: [Tracing Guide](/docs/tracing)

### 3. Streaming SSE - Real-Time Responses

**Why adopt:** Improve UX with real-time streaming LLM responses.

**Backend (3 lines):**

```php
use Mindwave\Mindwave\Facades\Mindwave;

Route::get('/chat', function (Request $request) {
    return Mindwave::stream($request->input('message'))
        ->model('gpt-4')
        ->respond();
});
```

**Frontend (3 lines):**

```javascript
const stream = new EventSource('/chat?message=' + encodeURIComponent(question));
stream.onmessage = e => output.textContent += e.data;
stream.addEventListener('done', () => stream.close());
```

**Benefits:**
- Production-ready SSE setup
- Proper headers for Nginx/Apache
- Connection monitoring
- Error handling and retry logic

See: [Streaming Guide](/docs/streaming)

### 4. Context Discovery - Ad-Hoc RAG

**Why adopt:** Pull relevant context from your database/CSV without complex RAG infrastructure.

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;

// Search your database on-the-fly
Mindwave::prompt()
    ->context(
        TntSearchSource::fromEloquent(
            Product::where('active', true),
            fn($p) => "Product: {$p->name}, Price: {$p->price}"
        ),
        limit: 5
    )
    ->ask('What products under $50 do you have?');
```

**Benefits:**
- No external services (pure PHP + SQLite)
- Fast ephemeral indexing
- Multiple sources (Eloquent, CSV, arrays, vector stores)
- BM25 ranking
- Auto-query extraction

**Artisan commands:**

```bash
# View index stats
php artisan mindwave:index-stats

# Clear old indexes
php artisan mindwave:clear-indexes --ttl=24 --force
```

See: [Context Discovery Guide](/docs/context-discovery)

---

## Laravel Version Compatibility

### Laravel 11.x Requirements

Mindwave v1.0 requires Laravel 11.x. Key Laravel 11 changes that affect Mindwave:

**1. Minimum PHP 8.2**

Ensure your environment meets PHP requirements:

```bash
php -v  # Should be 8.2+
```

**2. Configuration Changes**

Laravel 11 streamlined configuration. Mindwave configs are published separately:

```bash
php artisan vendor:publish --tag="mindwave-config"
```

**3. Database Schema**

No special considerations - Mindwave migrations work on Laravel 11's default database configuration.

**4. Service Provider Auto-Discovery**

Mindwave uses Laravel's package auto-discovery. No manual registration needed.

### Upgrading Laravel 10 → 11

If you're still on Laravel 10, upgrade Laravel first:

1. Follow [Laravel 11 Upgrade Guide](https://laravel.com/docs/11.x/upgrade)
2. Test your application thoroughly
3. Then upgrade Mindwave

**Common Laravel 11 upgrade issues:**

- **Config consolidation** - Many config files merged into `bootstrap/app.php`
- **Middleware changes** - Route middleware registration changed
- **Removed helpers** - Some deprecated helpers removed

Test everything before upgrading Mindwave.

---

## Configuration Changes

### New Config Files (v1.0)

Mindwave v1.0 introduces five configuration files:

#### 1. `config/mindwave-llm.php`

LLM provider settings (OpenAI, Mistral, etc.):

```php
return [
    'default' => env('MINDWAVE_LLM', 'openai'),

    'llms' => [
        'openai' => [
            'api_key' => env('MINDWAVE_OPENAI_API_KEY'),
            'model' => env('MINDWAVE_OPENAI_MODEL', 'gpt-4-1106-preview'),
            'max_tokens' => env('MINDWAVE_OPENAI_MAX_TOKENS', 1000),
            'temperature' => env('MINDWAVE_OPENAI_TEMPERATURE', 0.4),
        ],
    ],
];
```

**Environment variables:**

```bash
MINDWAVE_LLM=openai
MINDWAVE_OPENAI_API_KEY=sk-...
MINDWAVE_OPENAI_MODEL=gpt-4-turbo
MINDWAVE_OPENAI_MAX_TOKENS=1000
MINDWAVE_OPENAI_TEMPERATURE=0.7
```

#### 2. `config/mindwave-tracing.php`

OpenTelemetry tracing configuration:

```php
return [
    'enabled' => env('MINDWAVE_TRACING_ENABLED', true),

    'database' => [
        'enabled' => env('MINDWAVE_TRACE_DATABASE', true),
        'connection' => env('MINDWAVE_TRACE_DB_CONNECTION', null),
    ],

    'otlp' => [
        'enabled' => env('MINDWAVE_TRACE_OTLP_ENABLED', false),
        'endpoint' => env('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://localhost:4318'),
    ],

    'capture_messages' => env('MINDWAVE_TRACE_CAPTURE_MESSAGES', false),
    'retention_days' => (int) env('MINDWAVE_TRACE_RETENTION_DAYS', 30),
];
```

**Environment variables:**

```bash
# Basic tracing
MINDWAVE_TRACING_ENABLED=true
MINDWAVE_TRACE_DATABASE=true

# OTLP export (optional - for Jaeger/Grafana)
MINDWAVE_TRACE_OTLP_ENABLED=false
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Privacy
MINDWAVE_TRACE_CAPTURE_MESSAGES=false  # Don't capture message content by default

# Retention
MINDWAVE_TRACE_RETENTION_DAYS=30
```

#### 3. `config/mindwave-context.php`

Context discovery settings:

```php
return [
    'tntsearch' => [
        'storage_path' => storage_path('mindwave/tnt-indexes'),
        'ttl_hours' => env('MINDWAVE_TNT_INDEX_TTL', 24),
        'max_index_size_mb' => env('MINDWAVE_TNT_MAX_INDEX_SIZE', 100),
    ],

    'pipeline' => [
        'default_limit' => 10,
        'deduplicate' => true,
        'format' => 'numbered',
    ],

    'tracing' => [
        'enabled' => env('MINDWAVE_CONTEXT_TRACING', true),
    ],
];
```

**Environment variables:**

```bash
MINDWAVE_TNT_INDEX_TTL=24
MINDWAVE_TNT_MAX_INDEX_SIZE=100
MINDWAVE_CONTEXT_TRACING=true
```

#### 4. `config/mindwave-embeddings.php` (Optional)

Only needed if using embedding providers:

```php
return [
    'default' => env('MINDWAVE_EMBEDDING_DRIVER', 'openai'),

    'embeddings' => [
        'openai' => [
            'api_key' => env('MINDWAVE_OPENAI_API_KEY'),
            'model' => env('MINDWAVE_EMBEDDING_MODEL', 'text-embedding-3-small'),
        ],
    ],
];
```

#### 5. `config/mindwave-vectorstore.php` (Optional)

Only needed if using vector stores (Pinecone, Qdrant, Weaviate):

```php
return [
    'default' => env('MINDWAVE_VECTORSTORE_DRIVER', 'pinecone'),

    'vectorstores' => [
        'pinecone' => [
            'api_key' => env('PINECONE_API_KEY'),
            'environment' => env('PINECONE_ENVIRONMENT'),
            'index_name' => env('PINECONE_INDEX_NAME'),
        ],
    ],
];
```

### Removed Config Files

If you had these from v0.0.x alpha, remove them:

```bash
rm config/mindwave-agent.php      # ❌ Removed
rm config/mindwave-crew.php       # ❌ Removed
```

---

## Database Schema Changes

### New Tables (v1.0)

Mindwave v1.0 adds three tables for OpenTelemetry tracing:

#### `mindwave_traces`

Stores OpenTelemetry traces:

```sql
CREATE TABLE mindwave_traces (
    id UUID PRIMARY KEY,
    trace_id CHAR(32) UNIQUE,
    service_name VARCHAR,
    start_time BIGINT,        -- nanoseconds
    end_time BIGINT,          -- nanoseconds
    duration BIGINT,          -- nanoseconds
    status VARCHAR(20),       -- 'ok', 'error', 'unset'
    total_spans INT,
    total_input_tokens INT,
    total_output_tokens INT,
    estimated_cost DECIMAL(10,6),
    metadata JSON,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### `mindwave_spans`

Stores individual spans within traces:

```sql
CREATE TABLE mindwave_spans (
    id UUID PRIMARY KEY,
    trace_id CHAR(32),
    span_id CHAR(16),
    parent_span_id CHAR(16),
    operation_name VARCHAR,
    start_time BIGINT,
    end_time BIGINT,
    duration BIGINT,
    status VARCHAR(20),
    attributes JSON,
    events JSON,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,

    FOREIGN KEY (trace_id) REFERENCES mindwave_traces(trace_id)
);
```

#### `mindwave_span_messages`

Stores LLM message content (optional - only if `capture_messages` enabled):

```sql
CREATE TABLE mindwave_span_messages (
    id UUID PRIMARY KEY,
    span_id CHAR(16),
    message_type VARCHAR(20),  -- 'input', 'output', 'system'
    role VARCHAR(20),          -- 'user', 'assistant', 'system'
    content TEXT,
    metadata JSON,
    created_at TIMESTAMP,

    FOREIGN KEY (span_id) REFERENCES mindwave_spans(span_id)
);
```

### Running Migrations

```bash
# Run migrations
php artisan migrate

# If you need to rollback
php artisan migrate:rollback --step=3

# Check migration status
php artisan migrate:status
```

### No Breaking Schema Changes

If you're doing a fresh installation, there are no breaking changes. The tables are new additions.

---

## Deprecations

### Removed in v1.0

These classes/interfaces were **removed** (not deprecated):

| Removed | Replacement |
|---------|-------------|
| `Mindwave\Mindwave\Agents\Agent` | `Mindwave::prompt()` + `PromptComposer` |
| `Mindwave\Mindwave\Agents\AgentExecutor` | Direct LLM calls via `Mindwave::llm()` |
| `Mindwave\Mindwave\Agents\AgentInterface` | N/A - no longer needed |
| `Mindwave\Mindwave\Crew\Crew` | Sequential `Mindwave::prompt()` calls |
| `Mindwave\Mindwave\Crew\Agent` | `Mindwave::prompt()` with system prompts |
| `Mindwave\Mindwave\Crew\Task` | Direct LLM calls |
| `Mindwave\Mindwave\Crew\AgentTools` | Context sources or direct API calls |

### Current Deprecations (v1.0)

One deprecation in v1.0 codebase:

**File:** `src/Observability/Tracing/GenAI/GenAiAttributes.php`

```php
/**
 * @deprecated Use GEN_AI_USAGE_TOTAL_TOKENS instead
 */
const GEN_AI_USAGE_TOTAL_TOKEN = 'gen_ai.usage.total_tokens';
```

**Impact:** Internal only - does not affect public API.

**Action:** No action needed. This is an internal OpenTelemetry attribute name typo fix.

---

## Troubleshooting

### Common Upgrade Issues

#### Issue: "Class 'Mindwave\Mindwave\Agents\Agent' not found"

**Cause:** You're still using removed Agent classes.

**Solution:** Migrate to new patterns (see [Step 5](#step-5-migrate-agent-code-to-new-patterns)).

```php
// ❌ OLD
use Mindwave\Mindwave\Agents\Agent;

// ✅ NEW
use Mindwave\Mindwave\Facades\Mindwave;

$response = Mindwave::prompt()
    ->section('system', 'You are a helpful assistant')
    ->section('user', $question)
    ->run();
```

#### Issue: "Table 'mindwave_traces' doesn't exist"

**Cause:** Migrations not run.

**Solution:**

```bash
php artisan migrate
```

If migrations don't run, check:

```bash
php artisan migrate:status
```

#### Issue: "Config file not found"

**Cause:** Config files not published.

**Solution:**

```bash
php artisan vendor:publish --tag="mindwave-config"

# Clear config cache
php artisan config:clear
```

#### Issue: Composer dependency conflicts

**Cause:** Other packages conflict with Mindwave's dependencies.

**Solution:**

```bash
# Try updating all packages
composer update

# If that fails, check specific conflicts
composer why-not mindwave/mindwave 1.0

# Nuclear option: fresh install
rm -rf vendor composer.lock
composer install
```

#### Issue: "Call to undefined method Mindwave::prompt()"

**Cause:** Using old service provider or cache issues.

**Solution:**

```bash
# Clear all caches
php artisan config:clear
php artisan cache:clear
php artisan optimize:clear

# Dump autoload
composer dump-autoload

# Check Mindwave is registered
php artisan about
```

#### Issue: Tracing not working

**Cause:** Tracing disabled or configuration issues.

**Solution:**

Check `.env`:

```bash
MINDWAVE_TRACING_ENABLED=true
MINDWAVE_TRACE_DATABASE=true
```

Check migrations ran:

```bash
php artisan migrate:status | grep mindwave
```

Test manually:

```bash
php artisan tinker
```

```php
use Mindwave\Mindwave\Facades\Mindwave;

Mindwave::llm()->chat([['role' => 'user', 'content' => 'test']]);

// Check traces
\Mindwave\Mindwave\Observability\Models\Trace::count();
// Should be > 0
```

#### Issue: Context discovery not finding results

**Cause:** Index not created or query too specific.

**Solution:**

Check index stats:

```bash
php artisan mindwave:index-stats
```

Test with broader query:

```php
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;

$source = TntSearchSource::fromArray([
    ['content' => 'Test item 1'],
    ['content' => 'Test item 2'],
]);

$results = $source->search('test', limit: 5);
dd($results); // Should return results
```

Clear old indexes:

```bash
php artisan mindwave:clear-indexes --force
```

#### Issue: Streaming SSE not working

**Cause:** Headers not set or browser caching.

**Solution:**

Check route returns `StreamedResponse`:

```php
Route::get('/chat', function (Request $request) {
    return Mindwave::stream($request->input('message'))->respond();
    // Should return StreamedResponse with proper headers
});
```

Test with `curl`:

```bash
curl -N http://localhost:8000/chat?message=hello
```

Should see SSE output:

```
data: Hello

data: !

event: done
data:
```

Disable browser cache:

```javascript
const stream = new EventSource('/chat?message=' + msg + '&_=' + Date.now());
```

### Laravel 11 Upgrade Issues

If you're upgrading Laravel 10 → 11 alongside Mindwave:

**Issue: Service provider not registered**

Laravel 11 still supports auto-discovery. Check `composer.json`:

```json
"extra": {
    "laravel": {
        "providers": [
            "Mindwave\\Mindwave\\MindwaveServiceProvider"
        ]
    }
}
```

Run:

```bash
composer dump-autoload
php artisan package:discover
```

**Issue: Config not loading**

Laravel 11 changed config handling. Ensure you published configs:

```bash
php artisan vendor:publish --tag="mindwave-config"
```

**Issue: Middleware changes**

Laravel 11 changed middleware registration. If you have custom middleware for streaming/tracing:

```php
// Laravel 11 style
use Illuminate\Foundation\Application;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Register custom middleware here
    })
    ->create();
```

### Rollback Instructions

If upgrade fails and you need to rollback:

#### Step 1: Rollback Composer

```bash
# Checkout previous commit
git checkout <previous-commit>

# Or manually revert composer.json
# composer.json:
# "mindwave/mindwave": "^0.0.2-alpha"  # or your previous version

composer install
```

#### Step 2: Rollback Migrations

```bash
# Check how many migrations to rollback
php artisan migrate:status

# Rollback Mindwave migrations (3 migrations)
php artisan migrate:rollback --step=3
```

#### Step 3: Restore Config Files

```bash
# Restore old config files from backup
cp backups/mindwave-*.php config/

# Clear caches
php artisan config:clear
php artisan cache:clear
```

#### Step 4: Restore Code

```bash
# If you made code changes, restore from git
git checkout app/

# Or restore specific files
git checkout app/Services/AgentService.php
```

#### Step 5: Test

```bash
php artisan test
```

#### Report Issues

If you encounter issues:

1. Check [GitHub Issues](https://github.com/helgesverre/mindwave/issues)
2. Open new issue with:
   - Laravel version
   - PHP version
   - Mindwave version (old and new)
   - Error message
   - Stack trace

---

## Post-Upgrade Checklist

After upgrading, verify everything works:

### Functionality Checklist

```markdown
## Mindwave v1.0 Upgrade Verification

### Installation
- [ ] Composer update completed
- [ ] No dependency conflicts
- [ ] Service provider registered
- [ ] Configs published successfully

### Configuration
- [ ] API keys configured in .env
- [ ] LLM driver set (MINDWAVE_LLM)
- [ ] Tracing enabled (if desired)
- [ ] Config cache cleared

### Database
- [ ] Migrations ran successfully
- [ ] mindwave_traces table exists
- [ ] mindwave_spans table exists
- [ ] mindwave_span_messages table exists (if capture_messages enabled)

### Code Migration (if from v0.0.x)
- [ ] No references to Agent class
- [ ] No references to Crew class
- [ ] No references to Task class
- [ ] All agent code migrated to PromptComposer pattern
- [ ] Tests updated

### Feature Testing
- [ ] Basic LLM call works (Mindwave::llm()->chat())
- [ ] PromptComposer works (Mindwave::prompt()->fit()->run())
- [ ] Streaming works (if implemented)
- [ ] Tracing captures data (check database)
- [ ] Context discovery works (if implemented)

### Performance
- [ ] No significant performance regression
- [ ] LLM response times acceptable
- [ ] Database queries efficient
- [ ] Tracing overhead minimal

### Monitoring
- [ ] Tracing data visible in database
- [ ] OTLP export working (if enabled)
- [ ] Cost tracking accurate
- [ ] Artisan commands work (mindwave:trace-stats, etc.)

### Documentation
- [ ] Team aware of breaking changes
- [ ] New patterns documented in codebase
- [ ] README updated (if applicable)

### Production
- [ ] Tested in staging environment
- [ ] Deployment plan reviewed
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
- [ ] On-call engineer briefed
```

### Verification Commands

Run these commands to verify upgrade:

```bash
# Check version
composer show mindwave/mindwave

# Check config
php artisan config:show mindwave-llm
php artisan config:show mindwave-tracing

# Check migrations
php artisan migrate:status | grep mindwave

# Check service provider
php artisan about | grep -i mindwave

# Test basic functionality
php artisan tinker
```

```php
// In tinker
use Mindwave\Mindwave\Facades\Mindwave;

// Test LLM
$response = Mindwave::llm()->chat([
    ['role' => 'user', 'content' => 'Say "upgrade successful"']
]);
echo $response->choices[0]->message->content;

// Test PromptComposer
$response = Mindwave::prompt()
    ->section('user', 'What is 2+2?')
    ->run();
echo $response->choices[0]->message->content;

// Check tracing
\Mindwave\Mindwave\Observability\Models\Trace::count();
// Should be > 0 if tracing enabled

// Check spans
\Mindwave\Mindwave\Observability\Models\Span::count();
// Should be > 0

exit
```

### Performance Testing

Test performance hasn't regressed:

```php
// Test token counting performance
use Mindwave\Mindwave\PromptComposer\TokenCounter;

$start = microtime(true);
$count = TokenCounter::count(str_repeat('test ', 1000));
$elapsed = microtime(true) - $start;

echo "Token counting: {$elapsed}s\n"; // Should be < 0.1s

// Test LLM latency
$start = microtime(true);
$response = Mindwave::llm()->chat([
    ['role' => 'user', 'content' => 'Say hi']
]);
$elapsed = microtime(true) - $start;

echo "LLM call: {$elapsed}s\n"; // Depends on provider, typically 1-3s
```

---

## Staying Current

### Semantic Versioning

Mindwave follows [Semantic Versioning](https://semver.org/):

- **Major (x.0.0)** - Breaking changes
- **Minor (1.x.0)** - New features (backward compatible)
- **Patch (1.0.x)** - Bug fixes (backward compatible)

### Update Strategy

**Patch updates (1.0.x):**
- Safe to update anytime
- No breaking changes
- Update frequently

```bash
composer update mindwave/mindwave
```

**Minor updates (1.x.0):**
- New features added
- No breaking changes
- Review release notes
- Test in staging

```bash
composer require mindwave/mindwave:^1.1
```

**Major updates (x.0.0):**
- May contain breaking changes
- Read upgrade guide carefully
- Test thoroughly
- Plan deployment

```bash
composer require mindwave/mindwave:^2.0
```

### Monitoring for Updates

**Subscribe to releases:**

1. Watch [GitHub repository](https://github.com/helgesverre/mindwave)
2. Click "Watch" → "Custom" → "Releases"

**Check for outdated packages:**

```bash
composer outdated mindwave/mindwave
```

**Security updates:**

Enable GitHub security alerts for your repository.

### Best Practices

**1. Always test in staging first**

Never upgrade directly in production.

**2. Pin versions in production**

```json
{
    "require": {
        "mindwave/mindwave": "1.0.5"
    }
}
```

Not:

```json
{
    "require": {
        "mindwave/mindwave": "^1.0"  // Allows 1.x updates
    }
}
```

**3. Review changelogs**

Before upgrading, read:
- [CHANGELOG.md](https://github.com/helgesverre/mindwave/blob/main/CHANGELOG.md)
- [GitHub Releases](https://github.com/helgesverre/mindwave/releases)

**4. Keep Laravel current**

Mindwave tracks Laravel LTS releases. Keep your Laravel version current to get Mindwave updates.

**5. Monitor deprecations**

Watch for deprecation warnings in your logs. Future versions may remove deprecated features.

---

## Getting Help

### Resources

- **Documentation:** [https://mindwave.no](https://mindwave.no)
- **GitHub Issues:** [https://github.com/helgesverre/mindwave/issues](https://github.com/helgesverre/mindwave/issues)
- **GitHub Discussions:** [https://github.com/helgesverre/mindwave/discussions](https://github.com/helgesverre/mindwave/discussions)

### Reporting Issues

When reporting upgrade issues, include:

1. **Environment:**
   - Laravel version: `php artisan --version`
   - PHP version: `php -v`
   - Mindwave version: `composer show mindwave/mindwave`

2. **Error details:**
   - Full error message
   - Stack trace
   - Relevant logs (`storage/logs/laravel.log`)

3. **Steps to reproduce:**
   - What you were trying to do
   - Commands you ran
   - Expected vs actual behavior

4. **Configuration:**
   - Relevant `.env` entries (redact secrets!)
   - Config file snippets

### Community Support

Join the community:

- **GitHub Discussions** - Ask questions, share tips
- **Twitter** - Follow [@helgesverre](https://twitter.com/helgesverre) for updates

---

## Summary

### Key Takeaways

1. **Mindwave v1.0 is a major pivot** from agent frameworks to production utilities
2. **Breaking changes exist** if you used v0.0.x alpha (Agent/Crew classes removed)
3. **Fresh installations are straightforward** (10-15 minutes)
4. **Laravel 11 is required** (upgrade Laravel first if on Laravel 10)
5. **New features are additive** (PromptComposer, Streaming, Tracing, Context Discovery)
6. **Zero breaking changes** for v1.0 features themselves (stable API)

### Quick Upgrade Path

```bash
# 1. Backup
git checkout -b upgrade-mindwave-v1

# 2. Update composer
composer require mindwave/mindwave:^1.0

# 3. Publish configs
php artisan vendor:publish --tag="mindwave-config"

# 4. Run migrations
php artisan migrate

# 5. Update code (if from v0.0.x)
# Replace Agent/Crew with PromptComposer patterns

# 6. Clear caches
php artisan config:clear
php artisan cache:clear

# 7. Test
php artisan test

# 8. Deploy
git push origin upgrade-mindwave-v1
```

### Next Steps

After upgrading:

1. ✅ **Verify installation** - Run post-upgrade checklist
2. ✅ **Explore new features** - Try PromptComposer, Streaming, Tracing
3. ✅ **Enable monitoring** - Set up tracing and cost tracking
4. ✅ **Update documentation** - Document patterns in your team's codebase
5. ✅ **Plan deployment** - Test in staging, then production

**Welcome to Mindwave v1.0!** Start building production AI features with confidence.

---

*Last updated: November 2025*
