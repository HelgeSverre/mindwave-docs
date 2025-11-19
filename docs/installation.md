# Installation

Get up and running with Mindwave in under 5 minutes. This guide covers everything you need to install Mindwave and make your first LLM call.

## Requirements

Before installing Mindwave, ensure your environment meets these requirements:

### PHP & Laravel

- **PHP**: 8.2, 8.3, or 8.4
- **Laravel**: 11.x (recommended) or 10.x
- **Composer**: 2.x or higher

### Required PHP Extensions

Mindwave requires the following PHP extensions:

- `ext-zip` - For document processing and file handling
- `ext-json` - For JSON operations (usually enabled by default)
- `ext-mbstring` - For multi-byte string handling (usually enabled by default)

Check your PHP extensions:

```bash
php -m | grep -E "zip|json|mbstring"
```

### Database Support

Mindwave uses database storage for OpenTelemetry tracing. Supported databases:

- **MySQL**: 5.7+ or 8.0+
- **PostgreSQL**: 10+
- **SQLite**: 3.8.8+
- **MariaDB**: 10.3+

::: tip
Any database supported by Laravel will work with Mindwave. The tracing tables use standard Laravel migrations.
:::

### LLM Provider API Keys

You'll need an API key from at least one LLM provider:

- **OpenAI** - For GPT-4, GPT-3.5, and other OpenAI models ([Get API key](https://platform.openai.com/api-keys))
- **Anthropic** - For Claude 3.5 Sonnet, Haiku, and other Claude models ([Get API key](https://console.anthropic.com/))
- **Mistral AI** - For Mistral Large, Medium, Small models ([Get API key](https://console.mistral.ai/))

::: warning
Keep your API keys secure! Never commit them to version control. Always use environment variables.
:::

## Installation Steps

### Step 1: Install via Composer

Install Mindwave using Composer:

```bash
composer require mindwave/mindwave
```

This will install Mindwave and all its dependencies.

::: details What gets installed?
Mindwave includes these key dependencies:
- `openai-php/client` - OpenAI PHP client
- `mozex/anthropic-php` - Anthropic Claude PHP client
- `helgesverre/mistral` - Mistral AI PHP client
- `teamtnt/tntsearch` - Full-text search for context discovery
- `open-telemetry/sdk` - OpenTelemetry tracing SDK
- `yethee/tiktoken` - Token counting for prompt management
- `smalot/pdfparser` - PDF document processing
:::

### Step 2: Publish Configuration Files

Publish Mindwave's configuration files:

```bash
php artisan vendor:publish --tag="mindwave-config"
```

This creates five configuration files in your `config/` directory:

| File | Purpose |
|------|---------|
| `mindwave-llm.php` | LLM provider settings (OpenAI, Anthropic, Mistral) |
| `mindwave-tracing.php` | OpenTelemetry tracing configuration |
| `mindwave-context.php` | TNTSearch context discovery settings |
| `mindwave-embeddings.php` | Embedding model configuration |
| `mindwave-vectorstore.php` | Vector database settings (Pinecone, Qdrant, Weaviate) |

::: tip Laravel 11+ Auto-Discovery
Laravel 11 automatically discovers the service provider. No manual registration needed!
:::

### Step 3: Run Migrations

Run the database migrations to create tracing tables:

```bash
php artisan migrate
```

This creates three tables for OpenTelemetry tracing:

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `mindwave_traces` | Top-level trace records | `trace_id`, `estimated_cost`, `total_input_tokens`, `total_output_tokens` |
| `mindwave_spans` | Individual operations within traces | `span_id`, `operation_name`, `provider_name`, `request_model`, `input_tokens`, `output_tokens` |
| `mindwave_span_messages` | LLM messages (optional, PII-protected) | `role`, `content` |

::: details What if I don't want tracing?
Tracing is optional but highly recommended for production use. You can disable it later by setting `MINDWAVE_TRACING_ENABLED=false` in your `.env` file. However, we recommend running the migrations anyway - the tables are lightweight and having them ready makes enabling tracing trivial.
:::

### Step 4: Configure Environment Variables

Add your API keys and configuration to `.env`:

#### Required: LLM Provider API Key

Add at least one LLM provider API key:

```env
# OpenAI (recommended for getting started)
MINDWAVE_OPENAI_API_KEY=sk-your-openai-api-key-here
MINDWAVE_OPENAI_MODEL=gpt-4-turbo

# OR Anthropic Claude
MINDWAVE_ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
MINDWAVE_ANTHROPIC_MODEL=claude-sonnet-4-5-20250929

# OR Mistral AI
MINDWAVE_MISTRAL_API_KEY=your-mistral-api-key-here
MINDWAVE_MISTRAL_MODEL=mistral-large-latest
```

#### Optional: Tracing Configuration

Tracing is enabled by default. Customize if needed:

```env
# Enable/disable tracing (default: true)
MINDWAVE_TRACING_ENABLED=true

# Capture LLM messages in traces (default: false for PII protection)
MINDWAVE_CAPTURE_MESSAGES=false

# Service name in tracing UI (default: your APP_NAME)
MINDWAVE_SERVICE_NAME=my-laravel-app
```

#### Optional: Context Discovery

Configure TNTSearch storage path (uses sensible defaults):

```env
# Where to store temporary search indexes (default: storage/mindwave/tnt-indexes)
MINDWAVE_TNTSEARCH_STORAGE_PATH=storage/mindwave/tnt-indexes

# How long to keep indexes before cleanup (default: 24 hours)
MINDWAVE_TNT_INDEX_TTL=24
```

::: details Full Environment Variable Reference
See [Configuration Guide](/docs/configuration) for all available environment variables and their defaults.
:::

## Verify Installation

Verify Mindwave is installed correctly:

### 1. Check Artisan Commands

Verify Mindwave commands are available:

```bash
php artisan list mindwave
```

You should see these commands:

```
mindwave:clear-indexes   Clear old TNTSearch indexes
mindwave:export-traces   Export traces to CSV or JSON
mindwave:index-stats     View TNTSearch index statistics
mindwave:prune-traces    Delete old traces from database
mindwave:trace-stats     View trace statistics and costs
```

### 2. Check Configuration Files

Verify config files were published:

```bash
ls -la config/mindwave-*.php
```

You should see:
```
config/mindwave-context.php
config/mindwave-embeddings.php
config/mindwave-llm.php
config/mindwave-tracing.php
config/mindwave-vectorstore.php
```

### 3. Check Database Tables

Verify migrations ran successfully:

```bash
php artisan migrate:status | grep mindwave
```

You should see three migration entries:
```
Ran  create_mindwave_traces_table
Ran  create_mindwave_spans_table
Ran  create_mindwave_span_messages_table
```

### 4. Make Your First LLM Call

Test Mindwave with a simple LLM call:

```php
use Mindwave\Mindwave\Facades\Mindwave;

$response = Mindwave::llm()->chat([
    ['role' => 'user', 'content' => 'Say hello!']
]);

echo $response->choices[0]->message->content;
// Output: Hello! How can I assist you today?
```

If this works, congratulations! Mindwave is installed and working.

## Quick Start Example

Now that Mindwave is installed, here's a complete working example you can copy-paste:

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Simple chat completion
$response = Mindwave::llm()->chat([
    ['role' => 'system', 'content' => 'You are a helpful Laravel expert.'],
    ['role' => 'user', 'content' => 'Explain Laravel middleware in one sentence.'],
]);

echo $response->choices[0]->message->content;

// Stream a response (backend)
Route::get('/stream', function () {
    return Mindwave::stream('Explain Laravel in simple terms')
        ->model('gpt-4-turbo')
        ->respond();
});

// Auto-fit a long prompt with sections
Mindwave::prompt()
    ->section('system', 'You are a technical writer.', priority: 100)
    ->section('context', $longDocument, priority: 50, shrinker: 'summarize')
    ->section('user', 'Summarize the key points', priority: 100)
    ->fit()  // Automatically fits to model's context window
    ->run();

// View trace costs
use Mindwave\Mindwave\Observability\Models\Trace;

$expensive = Trace::where('estimated_cost', '>', 0.10)
    ->with('spans')
    ->orderByDesc('estimated_cost')
    ->get();

foreach ($expensive as $trace) {
    echo "Cost: $" . $trace->estimated_cost . "\n";
    echo "Tokens: {$trace->total_input_tokens} + {$trace->total_output_tokens}\n";
}
```

## Laravel Version Support

### Laravel 11.x (Recommended)

Laravel 11 has **automatic package discovery**. Mindwave's service provider is registered automatically - no manual configuration needed.

**Installation:**
```bash
composer require mindwave/mindwave
php artisan vendor:publish --tag="mindwave-config"
php artisan migrate
```

### Laravel 10.x

Laravel 10 also supports automatic discovery. Installation is identical to Laravel 11:

```bash
composer require mindwave/mindwave
php artisan vendor:publish --tag="mindwave-config"
php artisan migrate
```

::: tip
Both Laravel 10 and 11 automatically register the `MindwaveServiceProvider`. You should never need to manually register it in `config/app.php`.
:::

### Manual Service Provider Registration (Not Recommended)

If auto-discovery is disabled in your `composer.json`, manually register the provider:

```php
// config/app.php
'providers' => [
    // Other providers...
    Mindwave\Mindwave\MindwaveServiceProvider::class,
],
```

::: warning
Only do this if you've explicitly disabled Laravel's package auto-discovery. For 99% of users, auto-discovery works out of the box.
:::

## Optional Features Setup

### OpenTelemetry OTLP Export

Send traces to external observability platforms like Jaeger, Grafana Tempo, or Honeycomb:

#### 1. Enable OTLP Export

Add to your `.env`:

```env
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

#### 2. Platform-Specific Configuration

**Jaeger (Local Development):**
```bash
# Run Jaeger with Docker
docker run -d --name jaeger \
  -p 4318:4318 \
  -p 16686:16686 \
  jaegertracing/all-in-one:latest

# Configure Mindwave
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

**Honeycomb (Production):**
```env
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io:443
OTEL_EXPORTER_OTLP_HEADERS='{"x-honeycomb-team":"YOUR_API_KEY","x-honeycomb-dataset":"mindwave"}'
```

**Grafana Tempo:**
```env
OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318
OTEL_EXPORTER_OTLP_HEADERS='{"X-Scope-OrgID":"tenant1"}'
```

**Datadog:**
```env
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
DD_OTLP_CONFIG_RECEIVER_ENABLED=true
```

::: tip
You can enable both database storage AND OTLP export simultaneously. This gives you local query access plus integration with your observability stack.
:::

### Context Discovery with TNTSearch

TNTSearch is enabled by default for ad-hoc context discovery. No additional setup required!

**Verify it works:**

```php
use Mindwave\Mindwave\Context\Sources\TntSearchSource;
use App\Models\User;

// Search your database on-the-fly
$source = TntSearchSource::fromEloquent(
    User::where('active', true),
    fn($u) => "Name: {$u->name}, Email: {$u->email}"
);

// Use in a prompt
Mindwave::prompt()
    ->context($source, limit: 5)
    ->ask('Who are the Laravel developers?');
```

**Configure storage path (optional):**

```env
MINDWAVE_TNTSEARCH_STORAGE_PATH=storage/mindwave/tnt-indexes
MINDWAVE_TNT_INDEX_TTL=24  # Hours before cleanup
```

**Manage indexes:**

```bash
# View index statistics
php artisan mindwave:index-stats

# Clear old indexes (older than 24 hours)
php artisan mindwave:clear-indexes --ttl=24 --force
```

### Vector Store Integration

If you're using embeddings and vector databases, configure your provider:

#### Pinecone

```env
MINDWAVE_PINECONE_API_KEY=your-pinecone-api-key
MINDWAVE_PINECONE_ENVIRONMENT=us-west1-gcp
MINDWAVE_PINECONE_INDEX=mindwave
```

#### Qdrant (Open Source)

```bash
# Run Qdrant with Docker
docker run -d -p 6333:6333 qdrant/qdrant
```

```env
MINDWAVE_QDRANT_HOST=localhost
MINDWAVE_QDRANT_PORT=6333
MINDWAVE_QDRANT_COLLECTION=mindwave
```

#### Weaviate (Open Source)

```bash
# Run Weaviate with Docker
docker run -d -p 8080:8080 semitechnologies/weaviate:latest
```

```env
MINDWAVE_WEAVIATE_URL=http://localhost:8080/v1
MINDWAVE_WEAVIATE_API_TOKEN=password
MINDWAVE_WEAVIATE_INDEX=items
```

::: info
Vector stores are optional. You don't need them for basic LLM operations or TNTSearch context discovery.
:::

### Multiple LLM Providers

Configure multiple providers and switch between them:

```env
# OpenAI
MINDWAVE_OPENAI_API_KEY=sk-...
MINDWAVE_OPENAI_MODEL=gpt-4-turbo

# Mistral
MINDWAVE_MISTRAL_API_KEY=...
MINDWAVE_MISTRAL_MODEL=mistral-large-latest

# Set default provider
MINDWAVE_LLM_DRIVER=openai
```

**Switch providers in code:**

```php
// Use OpenAI
$response = Mindwave::llm('openai')->chat($messages);

// Use Mistral
$response = Mindwave::llm('mistral')->chat($messages);

// Use default (from config)
$response = Mindwave::llm()->chat($messages);
```

## Troubleshooting

### Common Installation Issues

#### Issue: "Class 'Mindwave' not found"

**Solution:** Clear your config cache and rebuild autoload files:

```bash
php artisan config:clear
php artisan cache:clear
composer dump-autoload
```

#### Issue: Migration fails with "Unknown database type"

**Solution:** Ensure your database driver is installed and configured. For PostgreSQL:

```bash
# Install PostgreSQL PDO extension
sudo apt-get install php8.2-pgsql

# Restart PHP-FPM
sudo systemctl restart php8.2-fpm
```

#### Issue: "Mindwave configuration file not found"

**Solution:** Publish configuration files again:

```bash
php artisan vendor:publish --tag="mindwave-config" --force
```

#### Issue: API calls return "Invalid API key"

**Solution:** Verify your API key is set correctly:

```bash
# Check if variable is set
php artisan tinker
>>> config('mindwave-llm.llms.openai.api_key')

# Should return your API key, not null or empty string
```

If it returns `null`, ensure:
1. Variable is in `.env` file
2. No typos in variable name (`MINDWAVE_OPENAI_API_KEY`)
3. `.env` file is in project root
4. Clear config cache: `php artisan config:clear`

#### Issue: Traces not appearing in database

**Solution:** Verify tracing is enabled and migrations ran:

```bash
# Check tracing is enabled
php artisan tinker
>>> config('mindwave-tracing.enabled')
// Should return: true

# Check migrations
php artisan migrate:status | grep mindwave

# Check database connection
php artisan tinker
>>> DB::connection()->getDatabaseName()
```

#### Issue: "ext-zip" extension not found

**Solution:** Install the ZIP extension:

```bash
# Ubuntu/Debian
sudo apt-get install php8.2-zip

# macOS (Homebrew)
brew install php@8.2
# ZIP is usually included

# Then restart your web server
sudo systemctl restart apache2  # or nginx, php-fpm
```

#### Issue: TNTSearch indexes fill up disk space

**Solution:** Run the cleanup command regularly (or schedule it):

```bash
# Clear indexes older than 24 hours
php artisan mindwave:clear-indexes --ttl=24 --force

# Add to Laravel scheduler (app/Console/Kernel.php)
$schedule->command('mindwave:clear-indexes --ttl=24 --force')->daily();
```

#### Issue: Timeout on slow LLM responses

**Solution:** Increase PHP execution time and timeout settings:

```php
// config/mindwave-llm.php
'llms' => [
    'openai' => [
        'timeout' => 120,  // 2 minutes
        // ... other settings
    ],
],
```

```bash
# Or set in .env
MINDWAVE_OPENAI_TIMEOUT=120
```

### Performance Tips

#### 1. Enable OPcache in Production

```ini
; php.ini
opcache.enable=1
opcache.memory_consumption=256
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=20000
```

#### 2. Use Database Indexes Wisely

Mindwave migrations include optimized indexes. If querying traces heavily, add application-specific indexes:

```php
Schema::table('mindwave_traces', function (Blueprint $table) {
    $table->index(['service_name', 'estimated_cost']);
});
```

#### 3. Configure Trace Sampling for High-Volume Apps

Reduce tracing overhead by sampling:

```env
MINDWAVE_TRACE_SAMPLER=traceidratio
MINDWAVE_TRACE_SAMPLE_RATIO=0.1  # Sample 10% of traces
```

#### 4. Schedule Trace Pruning

Keep your database lean by pruning old traces:

```php
// app/Console/Kernel.php
protected function schedule(Schedule $schedule)
{
    // Prune traces older than 30 days, keep traces over $0.10
    $schedule->command('mindwave:prune-traces --days=30')->daily();
}
```

#### 5. Disable Message Capture in Production

Protect PII and reduce storage:

```env
MINDWAVE_CAPTURE_MESSAGES=false
```

## Next Steps

Now that Mindwave is installed, explore its core features:

### Core Features
- **[Prompt Composer](/docs/core/prompt-composer)** - Auto-fit long prompts with smart section management
- **[Streaming Responses](/docs/core/streaming)** - Server-Sent Events streaming in 3 lines
- **[OpenTelemetry Tracing](/docs/core/tracing)** - Cost tracking, token usage, and performance monitoring
- **[Context Discovery](/docs/core/context-discovery)** - Ad-hoc full-text search over your data

### Configuration
- **[Configuration Guide](/docs/configuration)** - Deep dive into all configuration options
- **[Environment Variables](/docs/configuration#environment-variables)** - Complete reference

### Advanced Topics
- **[Cost Tracking](/docs/cost-tracking)** - Monitor and analyze LLM costs
- **[Production Deployment](/docs/deployment)** - Best practices for production
- **[Custom Shrinkers](/docs/custom-shrinkers)** - Build custom prompt compression strategies

### Examples
- **[Common Patterns](/examples/common-patterns)** - Copy-paste solutions for common use cases
- **[Integration Examples](/examples/integrations)** - Integrate with existing Laravel apps

## Getting Help

Need help with installation?

- **[GitHub Issues](https://github.com/helgesverre/mindwave/issues)** - Report bugs or request features
- **[GitHub Discussions](https://github.com/helgesverre/mindwave/discussions)** - Ask questions and share ideas
- **[Email Support](mailto:helge.sverre@gmail.com)** - Direct support from the creator

## What's Next?

After installation, most developers start with one of these paths:

**Path 1: Build a Chatbot** → Start with [Streaming Responses](/docs/core/streaming)

**Path 2: RAG/Q&A System** → Start with [Context Discovery](/docs/core/context-discovery)

**Path 3: Long-Form Content** → Start with [Prompt Composer](/docs/core/prompt-composer)

**Path 4: Production Monitoring** → Start with [OpenTelemetry Tracing](/docs/core/tracing)

Pick a path and dive in! Each guide includes working examples you can copy-paste and adapt.
