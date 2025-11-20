# Configuration Reference

Complete reference for all Mindwave configuration options, environment variables, and best practices.

## Overview

Mindwave uses five configuration files to control different aspects of the package:

-   **`mindwave-llm.php`** - LLM provider settings, models, and parameters
-   **`mindwave-tracing.php`** - OpenTelemetry tracing, cost tracking, and observability
-   **`mindwave-embeddings.php`** - Embedding provider configuration
-   **`mindwave-vectorstore.php`** - Vector database settings
-   **`mindwave-context.php`** - Context discovery and TNTSearch settings

### Publishing Configuration

To publish all configuration files to your application:

```bash
php artisan vendor:publish --tag="mindwave-config"
```

This copies all config files to your `config/` directory where you can customize them.

### Configuration Priority

Mindwave follows Laravel's standard configuration priority:

1. **Environment Variables** (`.env` file) - Highest priority
2. **Config Files** (`config/mindwave-*.php`) - Default values
3. **Package Defaults** - Fallback values

**Best Practice:** Use `.env` for environment-specific values (API keys, endpoints) and config files for structural configuration (pricing tables, feature toggles).

---

## LLM Configuration

**File:** `config/mindwave-llm.php`

Controls LLM provider selection, API credentials, model settings, and generation parameters.

### Default Provider

| Option    | Type     | Default    | Description                                            |
| --------- | -------- | ---------- | ------------------------------------------------------ |
| `default` | `string` | `'openai'` | Default LLM provider to use throughout the application |

**Environment Variable:** `MINDWAVE_LLM`

**Available Providers:**

-   `openai` - OpenAI GPT models
-   `anthropic` - Anthropic Claude models
-   `mistral` - Mistral AI models
-   `fake` - Testing mock (no API calls)

**Example:**

```php
'default' => env('MINDWAVE_LLM', 'openai'),
```

**When to Change:**

-   Switch providers based on model requirements
-   Use different providers in different environments
-   Testing with the `fake` driver

---

### OpenAI Provider Configuration

**Config Path:** `llms.openai`

Complete configuration for OpenAI's GPT models.

| Option        | Type           | Default                | Description                                |
| ------------- | -------------- | ---------------------- | ------------------------------------------ |
| `api_key`     | `string`       | `null`                 | OpenAI API key (required)                  |
| `org_id`      | `string\|null` | `null`                 | Organization ID for team accounts          |
| `model`       | `string`       | `'gpt-4-1106-preview'` | Default model to use                       |
| `max_tokens`  | `int`          | `1000`                 | Maximum tokens in response                 |
| `temperature` | `float`        | `0.4`                  | Randomness (0.0-2.0), lower = more focused |

#### Environment Variables

```bash
# Required
MINDWAVE_OPENAI_API_KEY=sk-proj-...

# Optional
MINDWAVE_OPENAI_ORG_ID=org-...
MINDWAVE_OPENAI_MODEL=gpt-4-turbo
MINDWAVE_OPENAI_MAX_TOKENS=2000
MINDWAVE_OPENAI_TEMPERATURE=0.7
```

#### Available Models

**GPT-4 Models:**

-   `gpt-4` - Most capable, highest cost
-   `gpt-4-turbo` - Fast, high quality
-   `gpt-4-turbo-preview` - Latest preview
-   `gpt-4-1106-preview` - November 2023 version
-   `gpt-4-0125-preview` - January 2024 version

**GPT-3.5 Models:**

-   `gpt-3.5-turbo` - Fast, cost-effective
-   `gpt-3.5-turbo-1106` - November 2023 version
-   `gpt-3.5-turbo-0125` - January 2024 version

#### Configuration Example

```php
'openai' => [
    'api_key' => env('MINDWAVE_OPENAI_API_KEY'),
    'org_id' => env('MINDWAVE_OPENAI_ORG_ID'),
    'model' => env('MINDWAVE_OPENAI_MODEL', 'gpt-4-turbo'),
    'max_tokens' => env('MINDWAVE_OPENAI_MAX_TOKENS', 2000),
    'temperature' => env('MINDWAVE_OPENAI_TEMPERATURE', 0.7),
],
```

#### Parameter Guidelines

**`max_tokens`:**

-   Controls response length, not input limit
-   Higher values = longer responses
-   Impacts cost (output tokens typically cost more)
-   Typical values: 500-4000

**`temperature`:**

-   `0.0-0.3` - Deterministic, factual responses
-   `0.4-0.7` - Balanced creativity and consistency
-   `0.8-1.0` - Creative, varied responses
-   `1.0+` - Highly random (rarely used in production)

---

### Mistral Provider Configuration

**Config Path:** `llms.mistral`

Configuration for Mistral AI models, including support for self-hosted deployments.

| Option           | Type           | Default            | Description                           |
| ---------------- | -------------- | ------------------ | ------------------------------------- |
| `api_key`        | `string`       | `null`             | Mistral API key                       |
| `base_url`       | `string\|null` | `null`             | Custom API endpoint (for self-hosted) |
| `model`          | `string`       | `'mistral-medium'` | Default model                         |
| `system_message` | `string\|null` | `null`             | Default system message                |
| `max_tokens`     | `int`          | `1000`             | Maximum response tokens               |
| `temperature`    | `float`        | `0.4`              | Randomness (0.0-1.0)                  |
| `safe_mode`      | `bool`         | `false`            | Enable content moderation             |
| `random_seed`    | `int\|null`    | `null`             | Seed for reproducible responses       |

#### Environment Variables

```bash
# Required
MINDWAVE_MISTRAL_API_KEY=...

# Optional
MINDWAVE_MISTRAL_BASE_URL=https://api.mistral.ai
MINDWAVE_MISTRAL_MODEL=mistral-large-latest
MINDWAVE_MISTRAL_SYSTEM_MESSAGE="You are a helpful assistant."
MINDWAVE_MISTRAL_MAX_TOKENS=2000
MINDWAVE_MISTRAL_TEMPERATURE=0.5
MINDWAVE_MISTRAL_SAFE_MODE=true
MINDWAVE_MISTRAL_RANDOM_SEED=42
```

#### Available Models

-   `mistral-large-latest` - Most capable model
-   `mistral-medium-latest` - Balanced performance/cost
-   `mistral-small-latest` - Fast, cost-effective
-   `mistral-tiny` - Smallest, cheapest model

#### Configuration Example

```php
'mistral' => [
    'api_key' => env('MINDWAVE_MISTRAL_API_KEY'),
    'base_url' => env('MINDWAVE_MISTRAL_BASE_URL'),
    'model' => env('MINDWAVE_MISTRAL_MODEL', 'mistral-large-latest'),
    'system_message' => env('MINDWAVE_MISTRAL_SYSTEM_MESSAGE'),
    'max_tokens' => env('MINDWAVE_MISTRAL_MAX_TOKENS', 1000),
    'temperature' => env('MINDWAVE_MISTRAL_TEMPERATURE', 0.4),
    'safe_mode' => env('MINDWAVE_MISTRAL_SAFE_MODE', false),
    'random_seed' => env('MINDWAVE_MISTRAL_RANDOM_SEED'),
],
```

#### Parameter Guidelines

**`base_url`:**

-   Leave null for Mistral's hosted API
-   Set for self-hosted deployments
-   Example: `https://your-mistral-instance.com/v1`

**`safe_mode`:**

-   Enables content moderation filtering
-   May reject some legitimate prompts
-   Recommended for user-facing applications

**`random_seed`:**

-   Makes responses reproducible
-   Useful for testing and debugging
-   Use `null` for production variety

---

### Anthropic Provider Configuration

**Config Path:** `llms.anthropic`

Configuration for Anthropic's Claude models with extended context windows and reasoning capabilities.

| Option           | Type           | Default                        | Description                               |
| ---------------- | -------------- | ------------------------------ | ----------------------------------------- |
| `api_key`        | `string`       | `null`                         | Anthropic API key (required)              |
| `model`          | `string`       | `'claude-3-5-sonnet-20241022'` | Default model                             |
| `system_message` | `string\|null` | `null`                         | Default system message                    |
| `max_tokens`     | `int`          | `4096`                         | Maximum response tokens (required by API) |
| `temperature`    | `float`        | `1.0`                          | Randomness (0.0-1.0)                      |

#### Environment Variables

```bash
# Required
MINDWAVE_ANTHROPIC_API_KEY=sk-ant-...

# Optional
MINDWAVE_ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
MINDWAVE_ANTHROPIC_SYSTEM_MESSAGE="You are a helpful assistant."
MINDWAVE_ANTHROPIC_MAX_TOKENS=4096
MINDWAVE_ANTHROPIC_TEMPERATURE=1.0
```

#### Available Models

**Claude 4.5 Models (Latest - Recommended):**

-   `claude-sonnet-4-5-20250929` - Smartest for complex tasks
-   `claude-sonnet-4-5` - Auto-updates to latest Sonnet
-   `claude-haiku-4-5-20251001` - Fastest, most cost-effective
-   `claude-haiku-4-5` - Auto-updates to latest Haiku

**Claude 4.1 Models:**

-   `claude-opus-4-1-20250805` - Specialized reasoning
-   `claude-opus-4-1` - Auto-updates to latest Opus

**Legacy Models (Deprecated):**

-   `claude-3-5-sonnet-20241022` - Use 4.5 Sonnet instead
-   `claude-3-5-haiku-20241022` - Use 4.5 Haiku instead
-   `claude-3-opus-20240229`, `claude-3-sonnet-20240229`, `claude-3-haiku-20240307` - Upgrade to 4.x

#### Configuration Example

```php
'anthropic' => [
    'api_key' => env('MINDWAVE_ANTHROPIC_API_KEY'),
    'model' => env('MINDWAVE_ANTHROPIC_MODEL', 'claude-sonnet-4-5-20250929'),
    'system_message' => env('MINDWAVE_ANTHROPIC_SYSTEM_MESSAGE'),
    'max_tokens' => env('MINDWAVE_ANTHROPIC_MAX_TOKENS', 4096),
    'temperature' => env('MINDWAVE_ANTHROPIC_TEMPERATURE', 1.0),
],
```

#### Parameter Guidelines

**`max_tokens`:**

-   Required parameter (Anthropic API requirement)
-   Claude can generate long responses with 200K context
-   Default: 4096 tokens
-   Increase for longer outputs

**`temperature`:**

-   Anthropic default is 1.0 (vs OpenAI's 0.7)
-   Use 0.0 for deterministic outputs
-   Use 1.0 for creative tasks
-   Range: 0.0-1.0

**`system_message`:**

-   Separate top-level parameter in Anthropic API
-   Not part of messages array like OpenAI
-   Provides context and instructions
-   Recommended for production applications

#### Model Selection

**Use Claude Sonnet 4.5 when:**

-   Complex reasoning required
-   Code generation and analysis
-   Extended thinking needed
-   Long document processing (up to 1M tokens)
-   Multi-agent systems

**Use Claude Haiku 4.5 when:**

-   Speed is priority
-   High-volume processing
-   Cost optimization needed
-   Simple classification tasks
-   Real-time applications

---

## Tracing Configuration

**File:** `config/mindwave-tracing.php`

OpenTelemetry-based distributed tracing for LLM operations, cost tracking, and observability.

### Core Settings

| Option         | Type     | Default    | Description                  |
| -------------- | -------- | ---------- | ---------------------------- |
| `enabled`      | `bool`   | `true`     | Enable/disable all tracing   |
| `service_name` | `string` | `APP_NAME` | Service identifier in traces |

```bash
MINDWAVE_TRACING_ENABLED=true
MINDWAVE_SERVICE_NAME=my-laravel-app
```

**When to Disable Tracing:**

-   Local development with no observability needs
-   Performance testing (minimal overhead, but measurable)
-   CI/CD environments where traces aren't needed

---

### Database Storage

**Config Path:** `database`

Store traces in your application database for querying, cost analysis, and building admin dashboards.

| Option       | Type           | Default | Description                          |
| ------------ | -------------- | ------- | ------------------------------------ |
| `enabled`    | `bool`         | `true`  | Store traces in database             |
| `connection` | `string\|null` | `null`  | Database connection (null = default) |

```bash
MINDWAVE_TRACE_DATABASE=true
MINDWAVE_TRACE_DB_CONNECTION=mysql
```

**Database Tables:**

-   `mindwave_traces` - Top-level trace information
-   `mindwave_spans` - Individual operations (LLM calls, tool use)
-   `mindwave_span_messages` - LLM messages (if capture enabled)

**Use Cases:**

-   Query expensive traces: `MindwaveTrace::expensive(0.10)->get()`
-   Build cost dashboards
-   Debug performance issues
-   Compliance and audit logging

**Performance Considerations:**

-   Database writes happen in batches
-   Minimal impact on request latency
-   Consider separate connection for high-volume apps
-   Use `retention_days` to auto-prune old data

---

### OTLP Exporter

**Config Path:** `otlp`

Export traces to external observability platforms (Jaeger, Grafana Tempo, Honeycomb, etc.).

| Option     | Type     | Default                   | Description             |
| ---------- | -------- | ------------------------- | ----------------------- |
| `enabled`  | `bool`   | `false`                   | Enable OTLP export      |
| `endpoint` | `string` | `'http://localhost:4318'` | OTLP endpoint URL       |
| `protocol` | `string` | `'http/protobuf'`         | Transport protocol      |
| `headers`  | `array`  | `[]`                      | Additional HTTP headers |

```bash
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_HEADERS='{"x-api-key":"secret"}'
```

#### Supported Protocols

-   `http/protobuf` - HTTP with Protocol Buffers (recommended)
-   `grpc` - gRPC transport

#### Common Platform Configurations

**Jaeger (Local):**

```bash
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

**Honeycomb:**

```bash
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io:443
OTEL_EXPORTER_OTLP_HEADERS='{"x-honeycomb-team":"YOUR_API_KEY","x-honeycomb-dataset":"mindwave"}'
```

**Grafana Tempo:**

```bash
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318
OTEL_EXPORTER_OTLP_HEADERS='{"X-Scope-OrgID":"tenant1"}'
```

**New Relic:**

```bash
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.nr-data.net:4318
OTEL_EXPORTER_OTLP_HEADERS='{"api-key":"YOUR_LICENSE_KEY"}'
```

---

### Sampling Configuration

**Config Path:** `sampler`

Control which traces are recorded to manage data volume and costs.

| Option  | Type     | Default       | Description                 |
| ------- | -------- | ------------- | --------------------------- |
| `type`  | `string` | `'always_on'` | Sampling strategy           |
| `ratio` | `float`  | `1.0`         | Sample percentage (0.0-1.0) |

```bash
MINDWAVE_TRACE_SAMPLER=always_on
MINDWAVE_TRACE_SAMPLE_RATIO=1.0
```

#### Sampling Strategies

**`always_on`** (Default)

-   Records 100% of traces
-   Best for: Development, staging, low-volume production

**`always_off`**

-   Disables all tracing
-   Best for: Performance testing, tracing disabled environments

**`traceidratio`**

-   Samples percentage of traces based on `ratio`
-   Best for: High-volume production (reduce costs)
-   Example: `ratio: 0.1` = 10% of traces recorded

#### Production Sampling Example

```php
'sampler' => [
    'type' => env('MINDWAVE_TRACE_SAMPLER', 'traceidratio'),
    'ratio' => (float) env('MINDWAVE_TRACE_SAMPLE_RATIO', 0.1), // 10%
],
```

**Sampling Best Practices:**

-   Start with `always_on` in development
-   Use 10-25% sampling in production initially
-   Monitor data volume and adjust ratio
-   Use higher ratios for critical applications

---

### Batch Processing

**Config Path:** `batch`

Configure how spans are batched before export to optimize performance.

| Option                  | Type  | Default | Description                          |
| ----------------------- | ----- | ------- | ------------------------------------ |
| `max_queue_size`        | `int` | `2048`  | Maximum spans in queue               |
| `scheduled_delay_ms`    | `int` | `5000`  | Delay between exports (milliseconds) |
| `export_timeout_ms`     | `int` | `512`   | Timeout for export operations        |
| `max_export_batch_size` | `int` | `256`   | Maximum spans per export             |

```bash
MINDWAVE_TRACE_BATCH_MAX_QUEUE=2048
MINDWAVE_TRACE_BATCH_DELAY=5000
MINDWAVE_TRACE_BATCH_TIMEOUT=512
MINDWAVE_TRACE_BATCH_SIZE=256
```

#### Configuration Guidelines

**`max_queue_size`:**

-   Buffer size before blocking
-   Increase for high-volume applications
-   Typical values: 1024-4096

**`scheduled_delay_ms`:**

-   How often to export batches
-   Lower = more real-time, higher overhead
-   Typical values: 1000-10000ms

**`export_timeout_ms`:**

-   Timeout for single export attempt
-   Increase for slow networks
-   Typical values: 256-2000ms

**`max_export_batch_size`:**

-   Spans sent per export call
-   Larger batches = fewer API calls
-   Typical values: 128-512

#### Performance Tuning

**Low Latency (Real-time Monitoring):**

```php
'batch' => [
    'max_queue_size' => 1024,
    'scheduled_delay_ms' => 1000,  // Export every second
    'export_timeout_ms' => 500,
    'max_export_batch_size' => 128,
],
```

**High Throughput (Batch Processing):**

```php
'batch' => [
    'max_queue_size' => 4096,
    'scheduled_delay_ms' => 10000, // Export every 10 seconds
    'export_timeout_ms' => 1000,
    'max_export_batch_size' => 512,
],
```

---

### Privacy & Security

**Config Path:** `capture_messages`, `pii_redact`

Control sensitive data captured in traces.

| Option             | Type    | Default   | Description                       |
| ------------------ | ------- | --------- | --------------------------------- |
| `capture_messages` | `bool`  | `false`   | Capture LLM prompts and responses |
| `pii_redact`       | `array` | See below | Attributes to redact              |

```bash
MINDWAVE_TRACE_CAPTURE_MESSAGES=false
```

#### Default PII Redaction

By default, these OpenTelemetry attributes are redacted:

```php
'pii_redact' => [
    'gen_ai.input.messages',
    'gen_ai.output.messages',
    'gen_ai.system_instructions',
    'gen_ai.tool.call.arguments',
    'gen_ai.tool.call.result',
],
```

#### Security Guidelines

**NEVER enable message capture in production without:**

1. Data governance review
2. PII detection/redaction
3. Compliance approval (GDPR, HIPAA, etc.)
4. Secure trace storage

**Safe for Production:**

-   Token counts, costs, latency: ✅ Safe
-   Model names, provider info: ✅ Safe
-   Error messages (without PII): ✅ Safe

**Dangerous in Production:**

-   User prompts: ⚠️ May contain PII
-   LLM responses: ⚠️ May contain sensitive data
-   Tool call arguments: ⚠️ May contain credentials

**Development Setup:**

```bash
# Development - capture everything for debugging
MINDWAVE_TRACE_CAPTURE_MESSAGES=true

# Staging - capture selectively
MINDWAVE_TRACE_CAPTURE_MESSAGES=false

# Production - never capture messages
MINDWAVE_TRACE_CAPTURE_MESSAGES=false
```

---

### Data Retention

**Config Path:** `retention_days`

| Option           | Type  | Default | Description             |
| ---------------- | ----- | ------- | ----------------------- |
| `retention_days` | `int` | `30`    | Days to keep trace data |

```bash
MINDWAVE_TRACE_RETENTION_DAYS=30
```

Automatically prune old traces using:

```bash
php artisan mindwave:trace-prune
```

**Recommended Retention Periods:**

-   Development: 7 days
-   Staging: 14-30 days
-   Production: 30-90 days (depending on compliance)

Add to `App\Console\Kernel`:

```php
$schedule->command('mindwave:trace-prune')->daily();
```

---

### Cost Estimation

**Config Path:** `cost_estimation`

Automatic cost calculation based on token usage and provider pricing.

| Option    | Type    | Default   | Description             |
| --------- | ------- | --------- | ----------------------- |
| `enabled` | `bool`  | `true`    | Enable cost tracking    |
| `pricing` | `array` | See below | Pricing per 1000 tokens |

```bash
MINDWAVE_COST_ESTIMATION_ENABLED=true
```

#### Default Pricing Table

Prices in USD per 1,000 tokens (as of January 2025):

**OpenAI:**

```php
'openai' => [
    'gpt-4' => [
        'input' => 0.03,
        'output' => 0.06,
    ],
    'gpt-4-turbo' => [
        'input' => 0.01,
        'output' => 0.03,
    ],
    'gpt-3.5-turbo' => [
        'input' => 0.0005,
        'output' => 0.0015,
    ],
],
```

**Anthropic Claude:**

```php
'anthropic' => [
    'claude-3-opus-20240229' => [
        'input' => 0.015,
        'output' => 0.075,
    ],
    'claude-3-sonnet-20240229' => [
        'input' => 0.003,
        'output' => 0.015,
    ],
    'claude-3-haiku-20240307' => [
        'input' => 0.00025,
        'output' => 0.00125,
    ],
],
```

**Mistral AI:**

```php
'mistral' => [
    'mistral-large-latest' => [
        'input' => 0.004,
        'output' => 0.012,
    ],
    'mistral-medium-latest' => [
        'input' => 0.0027,
        'output' => 0.0081,
    ],
    'mistral-small-latest' => [
        'input' => 0.001,
        'output' => 0.003,
    ],
],
```

**Google Gemini:**

```php
'google' => [
    'gemini-pro' => [
        'input' => 0.00025,
        'output' => 0.0005,
    ],
],
```

#### Custom Pricing

Add pricing for custom/self-hosted models:

```php
'cost_estimation' => [
    'enabled' => true,
    'pricing' => [
        'custom' => [
            'llama-2-70b' => [
                'input' => 0.0008,  // Your actual cost
                'output' => 0.0008,
            ],
        ],
    ],
],
```

#### Query Costs

```php
use Mindwave\Mindwave\Models\MindwaveTrace;

// Find expensive traces
$expensive = MindwaveTrace::expensive(0.10)->get();

// Total costs by day
$costs = MindwaveTrace::query()
    ->selectRaw('DATE(created_at) as date, SUM(total_cost) as cost')
    ->groupBy('date')
    ->get();
```

---

### Resource Attributes

**Config Path:** `resource_attributes`

Additional metadata included in all traces.

| Option                   | Type     | Default   | Description         |
| ------------------------ | -------- | --------- | ------------------- |
| `deployment.environment` | `string` | `APP_ENV` | Environment name    |
| `service.version`        | `string` | `'1.0.0'` | Application version |

```php
'resource_attributes' => [
    'deployment.environment' => env('APP_ENV', 'production'),
    'service.version' => env('APP_VERSION', '1.0.0'),
    'cloud.provider' => env('CLOUD_PROVIDER', 'aws'),
    'cloud.region' => env('AWS_REGION', 'us-east-1'),
],
```

**Use Cases:**

-   Filter traces by environment
-   Track deployment versions
-   Multi-tenant applications
-   Cloud infrastructure tracking

---

### Instrumentation

**Config Path:** `instrumentation`

Enable/disable tracing for specific components.

| Option        | Type   | Default | Description                |
| ------------- | ------ | ------- | -------------------------- |
| `llm`         | `bool` | `true`  | Trace LLM calls            |
| `tools`       | `bool` | `true`  | Trace tool executions      |
| `vectorstore` | `bool` | `true`  | Trace vector operations    |
| `embeddings`  | `bool` | `true`  | Trace embedding generation |
| `memory`      | `bool` | `true`  | Trace memory operations    |

```bash
MINDWAVE_TRACE_LLM=true
MINDWAVE_TRACE_TOOLS=true
MINDWAVE_TRACE_VECTORSTORE=true
MINDWAVE_TRACE_EMBEDDINGS=true
MINDWAVE_TRACE_MEMORY=true
```

**Selective Instrumentation:**

```php
'instrumentation' => [
    'llm' => true,           // Always trace LLM calls
    'tools' => true,         // Trace tool usage
    'vectorstore' => false,  // Skip vector store tracing
    'embeddings' => false,   // Skip embedding tracing
    'memory' => true,        // Trace memory operations
],
```

---

## Embeddings Configuration

**File:** `config/mindwave-embeddings.php`

Configure embedding providers for vector generation.

### Default Provider

| Option    | Type     | Default    | Description                |
| --------- | -------- | ---------- | -------------------------- |
| `default` | `string` | `'openai'` | Default embedding provider |

```bash
MINDWAVE_EMBEDDINGS=openai
```

### OpenAI Embeddings

**Config Path:** `embeddings.openai`

| Option    | Type           | Default                    | Description     |
| --------- | -------------- | -------------------------- | --------------- |
| `api_key` | `string`       | `null`                     | OpenAI API key  |
| `org_id`  | `string\|null` | `null`                     | Organization ID |
| `model`   | `string`       | `'text-embedding-ada-002'` | Embedding model |

```bash
MINDWAVE_OPENAI_API_KEY=sk-proj-...
MINDWAVE_OPENAI_ORG_ID=org-...
```

**Available Models:**

-   `text-embedding-ada-002` - 1536 dimensions, $0.0001/1K tokens
-   `text-embedding-3-small` - 1536 dimensions, improved performance
-   `text-embedding-3-large` - 3072 dimensions, highest quality

**Configuration Example:**

```php
'embeddings' => [
    'openai' => [
        'api_key' => env('MINDWAVE_OPENAI_API_KEY'),
        'org_id' => env('MINDWAVE_OPENAI_ORG_ID'),
        'model' => 'text-embedding-ada-002',
    ],
],
```

---

## Vector Store Configuration

**File:** `config/mindwave-vectorstore.php`

Configure vector database providers for semantic search and retrieval.

### Default Provider

| Option    | Type     | Default      | Description          |
| --------- | -------- | ------------ | -------------------- |
| `default` | `string` | `'pinecone'` | Default vector store |

```bash
MINDWAVE_VECTORSTORE=pinecone
```

**Available Providers:**

-   `pinecone` - Managed vector database
-   `weaviate` - Open-source vector database
-   `qdrant` - High-performance vector database
-   `file` - JSON file storage (development only)
-   `array` - In-memory storage (testing only)

---

### Pinecone Configuration

**Config Path:** `vectorstores.pinecone`

| Option        | Type     | Default | Description          |
| ------------- | -------- | ------- | -------------------- |
| `api_key`     | `string` | `null`  | Pinecone API key     |
| `environment` | `string` | `null`  | Pinecone environment |
| `index`       | `string` | `null`  | Index name           |

```bash
MINDWAVE_PINECONE_API_KEY=your-api-key
MINDWAVE_PINECONE_ENVIRONMENT=us-east1-gcp
MINDWAVE_PINECONE_INDEX=my-index
```

**Setup:**

1. Create account at [pinecone.io](https://www.pinecone.io/)
2. Create index matching embedding dimensions (1536 for Ada-002)
3. Copy API key and environment from dashboard

---

### Weaviate Configuration

**Config Path:** `vectorstores.weaviate`

| Option               | Type     | Default                      | Description           |
| -------------------- | -------- | ---------------------------- | --------------------- |
| `api_url`            | `string` | `'http://localhost:8080/v1'` | Weaviate API URL      |
| `api_token`          | `string` | `'password'`                 | Authentication token  |
| `index`              | `string` | `'items'`                    | Class/collection name |
| `additional_headers` | `array`  | `[]`                         | Custom headers        |

```bash
MINDWAVE_WEAVIATE_URL=http://localhost:8080/v1
MINDWAVE_WEAVIATE_API_TOKEN=your-token
MINDWAVE_WEAVIATE_INDEX=documents
```

**Docker Setup:**

```bash
docker run -d \
  -p 8080:8080 \
  -e AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED=true \
  semitechnologies/weaviate:latest
```

---

### Qdrant Configuration

**Config Path:** `vectorstores.qdrant`

| Option       | Type     | Default       | Description        |
| ------------ | -------- | ------------- | ------------------ |
| `host`       | `string` | `'localhost'` | Qdrant host        |
| `port`       | `string` | `'6333'`      | Qdrant port        |
| `api_key`    | `string` | `''`          | API key (optional) |
| `collection` | `string` | `'items'`     | Collection name    |

```bash
MINDWAVE_QDRANT_HOST=localhost
MINDWAVE_QDRANT_PORT=6333
MINDWAVE_QDRANT_API_KEY=your-key
MINDWAVE_QDRANT_COLLECTION=documents
```

**Docker Setup:**

```bash
docker run -p 6333:6333 qdrant/qdrant
```

---

### File Storage (Development Only)

**Config Path:** `vectorstores.file`

| Option | Type     | Default                             | Description    |
| ------ | -------- | ----------------------------------- | -------------- |
| `path` | `string` | `storage/mindwave/vectorstore.json` | JSON file path |

```bash
MINDWAVE_VECTORSTORE_PATH=storage/app/vectors.json
```

**Warning:** File storage is NOT suitable for production. Use only for local development and testing.

---

## Context Configuration

**File:** `config/mindwave-context.php`

Configure context discovery and TNTSearch for ad-hoc retrieval.

### TNTSearch Settings

**Config Path:** `tntsearch`

| Option              | Type     | Default                        | Description             |
| ------------------- | -------- | ------------------------------ | ----------------------- |
| `storage_path`      | `string` | `storage/mindwave/tnt-indexes` | Index storage directory |
| `ttl_hours`         | `int`    | `24`                           | Index lifetime (hours)  |
| `max_index_size_mb` | `int`    | `100`                          | Maximum index size (MB) |

```bash
MINDWAVE_TNT_INDEX_TTL=24
MINDWAVE_TNT_MAX_INDEX_SIZE=100
```

**Index Lifecycle:**

-   Indexes are created on-demand
-   Automatically cleaned after TTL expires
-   Run `php artisan mindwave:clear-indexes` to clean manually

**Storage Requirements:**

-   Typical index size: 1-10MB per 10K documents
-   Indexes are ephemeral (recreated as needed)
-   Stored in `storage/mindwave/tnt-indexes/`

---

### Pipeline Settings

**Config Path:** `pipeline`

| Option          | Type     | Default      | Description                    |
| --------------- | -------- | ------------ | ------------------------------ |
| `default_limit` | `int`    | `10`         | Default context items returned |
| `deduplicate`   | `bool`   | `true`       | Remove duplicate results       |
| `format`        | `string` | `'numbered'` | Output format                  |

**Available Formats:**

-   `numbered` - Numbered list (1. Item one...)
-   `markdown` - Markdown formatting
-   `json` - JSON array

---

### Context Tracing

**Config Path:** `tracing`

| Option                 | Type   | Default | Description             |
| ---------------------- | ------ | ------- | ----------------------- |
| `enabled`              | `bool` | `true`  | Enable context tracing  |
| `trace_searches`       | `bool` | `true`  | Trace search operations |
| `trace_index_creation` | `bool` | `true`  | Trace index building    |

```bash
MINDWAVE_CONTEXT_TRACING=true
```

---

## Environment Variables Reference

Complete list of all environment variables used by Mindwave.

### LLM Configuration

| Variable                          | Type   | Default              | Description               |
| --------------------------------- | ------ | -------------------- | ------------------------- |
| `MINDWAVE_LLM`                    | string | `openai`             | Default LLM provider      |
| `MINDWAVE_OPENAI_API_KEY`         | string | -                    | OpenAI API key (required) |
| `MINDWAVE_OPENAI_ORG_ID`          | string | -                    | OpenAI organization ID    |
| `MINDWAVE_OPENAI_MODEL`           | string | `gpt-4-1106-preview` | Default OpenAI model      |
| `MINDWAVE_OPENAI_MAX_TOKENS`      | int    | `1000`               | Max tokens in response    |
| `MINDWAVE_OPENAI_TEMPERATURE`     | float  | `0.4`                | Temperature (0.0-2.0)     |
| `MINDWAVE_MISTRAL_API_KEY`        | string | -                    | Mistral API key           |
| `MINDWAVE_MISTRAL_BASE_URL`       | string | -                    | Mistral API endpoint      |
| `MINDWAVE_MISTRAL_MODEL`          | string | `mistral-medium`     | Default Mistral model     |
| `MINDWAVE_MISTRAL_SYSTEM_MESSAGE` | string | -                    | Default system message    |
| `MINDWAVE_MISTRAL_MAX_TOKENS`     | int    | `1000`               | Max tokens in response    |
| `MINDWAVE_MISTRAL_TEMPERATURE`    | float  | `0.4`                | Temperature (0.0-1.0)     |
| `MINDWAVE_MISTRAL_SAFE_MODE`      | bool   | `false`              | Enable content filtering  |
| `MINDWAVE_MISTRAL_RANDOM_SEED`    | int    | -                    | Seed for reproducibility  |

### Tracing Configuration

| Variable                           | Type   | Default                 | Description             |
| ---------------------------------- | ------ | ----------------------- | ----------------------- |
| `MINDWAVE_TRACING_ENABLED`         | bool   | `true`                  | Enable/disable tracing  |
| `MINDWAVE_SERVICE_NAME`            | string | `APP_NAME`              | Service identifier      |
| `MINDWAVE_TRACE_DATABASE`          | bool   | `true`                  | Enable database storage |
| `MINDWAVE_TRACE_DB_CONNECTION`     | string | `null`                  | Database connection     |
| `MINDWAVE_TRACE_OTLP_ENABLED`      | bool   | `false`                 | Enable OTLP export      |
| `OTEL_EXPORTER_OTLP_ENDPOINT`      | string | `http://localhost:4318` | OTLP endpoint           |
| `OTEL_EXPORTER_OTLP_PROTOCOL`      | string | `http/protobuf`         | OTLP protocol           |
| `OTEL_EXPORTER_OTLP_HEADERS`       | json   | `[]`                    | OTLP headers            |
| `MINDWAVE_TRACE_SAMPLER`           | string | `always_on`             | Sampling strategy       |
| `MINDWAVE_TRACE_SAMPLE_RATIO`      | float  | `1.0`                   | Sample ratio (0.0-1.0)  |
| `MINDWAVE_TRACE_BATCH_MAX_QUEUE`   | int    | `2048`                  | Batch queue size        |
| `MINDWAVE_TRACE_BATCH_DELAY`       | int    | `5000`                  | Batch delay (ms)        |
| `MINDWAVE_TRACE_BATCH_TIMEOUT`     | int    | `512`                   | Export timeout (ms)     |
| `MINDWAVE_TRACE_BATCH_SIZE`        | int    | `256`                   | Max batch size          |
| `MINDWAVE_TRACE_CAPTURE_MESSAGES`  | bool   | `false`                 | Capture LLM messages    |
| `MINDWAVE_TRACE_RETENTION_DAYS`    | int    | `30`                    | Trace retention period  |
| `MINDWAVE_COST_ESTIMATION_ENABLED` | bool   | `true`                  | Enable cost tracking    |
| `MINDWAVE_TRACE_LLM`               | bool   | `true`                  | Trace LLM operations    |
| `MINDWAVE_TRACE_TOOLS`             | bool   | `true`                  | Trace tool executions   |
| `MINDWAVE_TRACE_VECTORSTORE`       | bool   | `true`                  | Trace vector operations |
| `MINDWAVE_TRACE_EMBEDDINGS`        | bool   | `true`                  | Trace embeddings        |
| `MINDWAVE_TRACE_MEMORY`            | bool   | `true`                  | Trace memory operations |

### Embeddings Configuration

| Variable              | Type   | Default  | Description                 |
| --------------------- | ------ | -------- | --------------------------- |
| `MINDWAVE_EMBEDDINGS` | string | `openai` | Default embeddings provider |

### Vector Store Configuration

| Variable                        | Type   | Default                             | Description            |
| ------------------------------- | ------ | ----------------------------------- | ---------------------- |
| `MINDWAVE_VECTORSTORE`          | string | `pinecone`                          | Default vector store   |
| `MINDWAVE_PINECONE_API_KEY`     | string | -                                   | Pinecone API key       |
| `MINDWAVE_PINECONE_ENVIRONMENT` | string | -                                   | Pinecone environment   |
| `MINDWAVE_PINECONE_INDEX`       | string | -                                   | Pinecone index name    |
| `MINDWAVE_WEAVIATE_URL`         | string | `http://localhost:8080/v1`          | Weaviate API URL       |
| `MINDWAVE_WEAVIATE_API_TOKEN`   | string | `password`                          | Weaviate auth token    |
| `MINDWAVE_WEAVIATE_INDEX`       | string | `items`                             | Weaviate class name    |
| `MINDWAVE_QDRANT_HOST`          | string | `localhost`                         | Qdrant host            |
| `MINDWAVE_QDRANT_PORT`          | string | `6333`                              | Qdrant port            |
| `MINDWAVE_QDRANT_API_KEY`       | string | -                                   | Qdrant API key         |
| `MINDWAVE_QDRANT_COLLECTION`    | string | `items`                             | Qdrant collection name |
| `MINDWAVE_VECTORSTORE_PATH`     | string | `storage/mindwave/vectorstore.json` | File storage path      |

### Context Configuration

| Variable                      | Type | Default | Description            |
| ----------------------------- | ---- | ------- | ---------------------- |
| `MINDWAVE_TNT_INDEX_TTL`      | int  | `24`    | Index lifetime (hours) |
| `MINDWAVE_TNT_MAX_INDEX_SIZE` | int  | `100`   | Max index size (MB)    |
| `MINDWAVE_CONTEXT_TRACING`    | bool | `true`  | Enable context tracing |

---

## Configuration Examples

### Development Environment

Complete `.env` configuration for local development:

```bash
# ============================================
# LLM Configuration
# ============================================

# OpenAI (Primary)
MINDWAVE_LLM=openai
MINDWAVE_OPENAI_API_KEY=sk-proj-your-key-here
MINDWAVE_OPENAI_MODEL=gpt-4-turbo
MINDWAVE_OPENAI_MAX_TOKENS=2000
MINDWAVE_OPENAI_TEMPERATURE=0.7

# Mistral (Testing)
MINDWAVE_MISTRAL_API_KEY=your-mistral-key
MINDWAVE_MISTRAL_MODEL=mistral-large-latest

# ============================================
# Tracing - Full Observability
# ============================================

MINDWAVE_TRACING_ENABLED=true
MINDWAVE_SERVICE_NAME=my-app-dev

# Capture everything for debugging
MINDWAVE_TRACE_CAPTURE_MESSAGES=true

# Database storage
MINDWAVE_TRACE_DATABASE=true

# Local Jaeger
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# No sampling (capture all traces)
MINDWAVE_TRACE_SAMPLER=always_on
MINDWAVE_TRACE_SAMPLE_RATIO=1.0

# Short retention
MINDWAVE_TRACE_RETENTION_DAYS=7

# ============================================
# Vector Store - Local
# ============================================

MINDWAVE_VECTORSTORE=qdrant
MINDWAVE_QDRANT_HOST=localhost
MINDWAVE_QDRANT_PORT=6333
MINDWAVE_QDRANT_COLLECTION=dev-docs

# ============================================
# Context Discovery
# ============================================

MINDWAVE_TNT_INDEX_TTL=24
MINDWAVE_CONTEXT_TRACING=true
```

---

### Staging Environment

Production-like configuration for staging:

```bash
# ============================================
# LLM Configuration
# ============================================

MINDWAVE_LLM=openai
MINDWAVE_OPENAI_API_KEY=${OPENAI_API_KEY}  # From secrets manager
MINDWAVE_OPENAI_MODEL=gpt-4-turbo
MINDWAVE_OPENAI_MAX_TOKENS=1500
MINDWAVE_OPENAI_TEMPERATURE=0.5

# ============================================
# Tracing - Selective Capture
# ============================================

MINDWAVE_TRACING_ENABLED=true
MINDWAVE_SERVICE_NAME=my-app-staging

# NO message capture (even in staging)
MINDWAVE_TRACE_CAPTURE_MESSAGES=false

# Database storage
MINDWAVE_TRACE_DATABASE=true

# Export to Honeycomb
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io:443
OTEL_EXPORTER_OTLP_HEADERS='{"x-honeycomb-team":"${HONEYCOMB_KEY}","x-honeycomb-dataset":"mindwave-staging"}'

# 50% sampling
MINDWAVE_TRACE_SAMPLER=traceidratio
MINDWAVE_TRACE_SAMPLE_RATIO=0.5

# Medium retention
MINDWAVE_TRACE_RETENTION_DAYS=30

# ============================================
# Vector Store - Managed
# ============================================

MINDWAVE_VECTORSTORE=pinecone
MINDWAVE_PINECONE_API_KEY=${PINECONE_KEY}
MINDWAVE_PINECONE_ENVIRONMENT=us-east1-gcp
MINDWAVE_PINECONE_INDEX=staging-vectors

# ============================================
# Context Discovery
# ============================================

MINDWAVE_TNT_INDEX_TTL=48
MINDWAVE_CONTEXT_TRACING=true
```

---

### Production Environment

Secure, optimized production configuration:

```bash
# ============================================
# LLM Configuration
# ============================================

MINDWAVE_LLM=openai
MINDWAVE_OPENAI_API_KEY=${OPENAI_API_KEY}  # From AWS Secrets Manager
MINDWAVE_OPENAI_MODEL=gpt-4-turbo
MINDWAVE_OPENAI_MAX_TOKENS=1000
MINDWAVE_OPENAI_TEMPERATURE=0.4

# ============================================
# Tracing - Production Optimized
# ============================================

MINDWAVE_TRACING_ENABLED=true
MINDWAVE_SERVICE_NAME=my-app-production

# NEVER capture messages in production
MINDWAVE_TRACE_CAPTURE_MESSAGES=false

# Database storage (separate connection)
MINDWAVE_TRACE_DATABASE=true
MINDWAVE_TRACE_DB_CONNECTION=tracing

# Export to New Relic
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.nr-data.net:4318
OTEL_EXPORTER_OTLP_HEADERS='{"api-key":"${NEW_RELIC_LICENSE_KEY}"}'

# 10% sampling to reduce costs
MINDWAVE_TRACE_SAMPLER=traceidratio
MINDWAVE_TRACE_SAMPLE_RATIO=0.1

# Optimized batch settings
MINDWAVE_TRACE_BATCH_MAX_QUEUE=4096
MINDWAVE_TRACE_BATCH_DELAY=10000
MINDWAVE_TRACE_BATCH_SIZE=512

# Long retention for compliance
MINDWAVE_TRACE_RETENTION_DAYS=90

# Disable unnecessary instrumentation
MINDWAVE_TRACE_LLM=true
MINDWAVE_TRACE_TOOLS=true
MINDWAVE_TRACE_VECTORSTORE=false
MINDWAVE_TRACE_EMBEDDINGS=false

# ============================================
# Vector Store - Production
# ============================================

MINDWAVE_VECTORSTORE=pinecone
MINDWAVE_PINECONE_API_KEY=${PINECONE_KEY}
MINDWAVE_PINECONE_ENVIRONMENT=us-east1-gcp
MINDWAVE_PINECONE_INDEX=production-vectors

# ============================================
# Context Discovery
# ============================================

MINDWAVE_TNT_INDEX_TTL=72
MINDWAVE_TNT_MAX_INDEX_SIZE=200
MINDWAVE_CONTEXT_TRACING=false  # Reduce overhead
```

---

### Testing Environment

Configuration for automated tests:

```bash
# ============================================
# LLM Configuration - Fake Driver
# ============================================

MINDWAVE_LLM=fake  # No real API calls

# Still set keys for integration tests
MINDWAVE_OPENAI_API_KEY=sk-test-key
MINDWAVE_OPENAI_MODEL=gpt-4-turbo

# ============================================
# Tracing - Disabled for Speed
# ============================================

MINDWAVE_TRACING_ENABLED=false

# ============================================
# Vector Store - In-Memory
# ============================================

MINDWAVE_VECTORSTORE=array  # No persistence

# ============================================
# Context Discovery - Minimal
# ============================================

MINDWAVE_TNT_INDEX_TTL=1
MINDWAVE_CONTEXT_TRACING=false
```

**PHPUnit Configuration:**

```xml
<phpunit>
    <php>
        <env name="MINDWAVE_LLM" value="fake"/>
        <env name="MINDWAVE_TRACING_ENABLED" value="false"/>
        <env name="MINDWAVE_VECTORSTORE" value="array"/>
    </php>
</phpunit>
```

---

## Advanced Configuration

### Custom LLM Providers

While Mindwave includes OpenAI and Mistral drivers, you can extend it with custom providers:

```php
// In AppServiceProvider

use Mindwave\Mindwave\Facades\Mindwave;

Mindwave::llm()->extend('custom', function ($app, $config) {
    return new CustomLLMDriver(
        apiKey: $config['api_key'],
        model: $config['model']
    );
});
```

**Configuration:**

```php
// config/mindwave-llm.php

'llms' => [
    'custom' => [
        'api_key' => env('CUSTOM_LLM_API_KEY'),
        'model' => env('CUSTOM_LLM_MODEL', 'default'),
    ],
],
```

### Multiple Provider Configurations

Configure multiple instances of the same provider:

```php
'llms' => [
    'openai_fast' => [
        'driver' => 'openai',
        'api_key' => env('MINDWAVE_OPENAI_API_KEY'),
        'model' => 'gpt-3.5-turbo',
        'temperature' => 0.3,
    ],

    'openai_creative' => [
        'driver' => 'openai',
        'api_key' => env('MINDWAVE_OPENAI_API_KEY'),
        'model' => 'gpt-4',
        'temperature' => 0.9,
    ],
],
```

**Usage:**

```php
$fast = Mindwave::llm()->driver('openai_fast');
$creative = Mindwave::llm()->driver('openai_creative');
```

### Environment-Specific Overrides

Use Laravel's environment-specific config files:

**`config/mindwave-llm.php`** (Base):

```php
return [
    'default' => env('MINDWAVE_LLM', 'openai'),
    // ... base config
];
```

**`config/production/mindwave-llm.php`** (Override):

```php
return [
    'default' => 'openai',  // Force OpenAI in production

    'llms' => [
        'openai' => [
            'temperature' => 0.3,  // Lower temperature in production
        ],
    ],
];
```

### Runtime Configuration

Change configuration at runtime (use sparingly):

```php
// Temporarily change default provider
config(['mindwave-llm.default' => 'mistral']);

// Update model for current request
config(['mindwave-llm.llms.openai.model' => 'gpt-4-turbo']);

// Enable message capture for debugging
config(['mindwave-tracing.capture_messages' => true]);
```

**Warning:** Runtime changes don't persist and may not affect already-resolved singletons.

### Configuration Caching

In production, cache configuration for better performance:

```bash
# Cache all config
php artisan config:cache

# Clear config cache
php artisan config:clear
```

**Important:** After caching config, `env()` calls will always return `null`. Ensure all environment variables are accessed through config files.

---

## Best Practices

### Security

**1. Never Commit API Keys**

```bash
# ❌ WRONG - Never in config files
'api_key' => 'sk-proj-abc123...',

# ✅ CORRECT - Always from .env
'api_key' => env('MINDWAVE_OPENAI_API_KEY'),
```

**2. Use Secrets Management**

```bash
# Production - use secrets manager
MINDWAVE_OPENAI_API_KEY=${aws:ssm:parameter:/prod/mindwave/openai-key}
```

**3. Separate Database Connection for Traces**

```php
// config/database.php
'connections' => [
    'tracing' => [
        'driver' => 'mysql',
        'host' => env('TRACE_DB_HOST'),
        // ... separate database for traces
    ],
],
```

**4. Never Capture Messages in Production**

```bash
# Development only
MINDWAVE_TRACE_CAPTURE_MESSAGES=false
```

### Performance

**1. Use Config Caching**

```bash
php artisan config:cache
```

**2. Optimize Batch Settings**

```php
'batch' => [
    'max_queue_size' => 4096,      // Larger queue
    'scheduled_delay_ms' => 10000,  // Less frequent exports
    'max_export_batch_size' => 512, // Larger batches
],
```

**3. Sample Traces in High-Volume Apps**

```bash
MINDWAVE_TRACE_SAMPLER=traceidratio
MINDWAVE_TRACE_SAMPLE_RATIO=0.1  # 10% sampling
```

**4. Disable Unnecessary Instrumentation**

```bash
MINDWAVE_TRACE_VECTORSTORE=false
MINDWAVE_TRACE_EMBEDDINGS=false
```

### Cost Optimization

**1. Choose Cost-Effective Models**

```bash
# Development - use cheaper models
MINDWAVE_OPENAI_MODEL=gpt-3.5-turbo

# Production - balance cost vs quality
MINDWAVE_OPENAI_MODEL=gpt-4-turbo
```

**2. Lower max_tokens**

```bash
MINDWAVE_OPENAI_MAX_TOKENS=1000  # Reduce if possible
```

**3. Monitor Costs**

```php
// Set up cost alerts
$dailyCost = MindwaveTrace::whereDate('created_at', today())
    ->sum('total_cost');

if ($dailyCost > 100.00) {
    // Alert developers
}
```

**4. Update Pricing Regularly**

```php
// Review config/mindwave-tracing.php quarterly
'pricing' => [
    'openai' => [
        'gpt-4-turbo' => [
            'input' => 0.01,   // Check OpenAI pricing page
            'output' => 0.03,
        ],
    ],
],
```

### Reliability

**1. Set Reasonable Timeouts**

```php
'batch' => [
    'export_timeout_ms' => 1000,  // Fail fast
],
```

**2. Use Retry Logic**

```php
// LLM drivers include automatic retries
// Configure via provider-specific settings
```

**3. Handle Failures Gracefully**

```php
try {
    $response = Mindwave::llm()->chat($messages);
} catch (ApiException $e) {
    // Log and fallback
    Log::error('LLM API failed', ['error' => $e->getMessage()]);
    return $fallbackResponse;
}
```

**4. Monitor Trace Export Failures**

```php
// Check for export errors in logs
tail -f storage/logs/laravel.log | grep "trace export"
```

---

## Troubleshooting

### Configuration Cache Issues

**Symptom:** Changes to `.env` not reflected

**Solution:**

```bash
php artisan config:clear
php artisan cache:clear
```

**Prevention:** Never use `env()` directly in code, always in config files.

---

### Invalid Configuration Errors

**Symptom:** `InvalidArgumentException: Driver [xxx] not supported`

**Diagnosis:**

```bash
php artisan tinker
>>> config('mindwave-llm.default')
```

**Common Causes:**

-   Typo in `MINDWAVE_LLM` env variable
-   Provider not configured in `llms` array
-   Config cache outdated

**Solution:**

```bash
# Verify config
php artisan config:show mindwave-llm

# Clear cache
php artisan config:clear
```

---

### Missing API Keys

**Symptom:** `Authentication error` or `401 Unauthorized`

**Diagnosis:**

```bash
php artisan tinker
>>> config('mindwave-llm.llms.openai.api_key')
```

**Common Causes:**

-   Missing `MINDWAVE_OPENAI_API_KEY` in `.env`
-   Using cached config (returns null)
-   Wrong key format

**Solution:**

```bash
# Add to .env
MINDWAVE_OPENAI_API_KEY=sk-proj-your-key-here

# Clear config cache
php artisan config:clear

# Verify
php artisan tinker
>>> config('mindwave-llm.llms.openai.api_key')
```

---

### Provider Connection Issues

**Symptom:** Timeouts, connection refused, DNS errors

**OpenAI:**

```bash
# Test connection
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $MINDWAVE_OPENAI_API_KEY"
```

**Mistral:**

```bash
# Test connection
curl https://api.mistral.ai/v1/models \
  -H "Authorization: Bearer $MINDWAVE_MISTRAL_API_KEY"
```

**Common Causes:**

-   Firewall blocking HTTPS
-   Wrong `base_url` for self-hosted
-   DNS resolution issues
-   API service outage

**Solution:**

```bash
# Check network
ping api.openai.com

# Check firewall
curl -v https://api.openai.com

# Use custom endpoint
MINDWAVE_MISTRAL_BASE_URL=https://your-proxy.com/v1
```

---

### Trace Database Issues

**Symptom:** Traces not appearing in database

**Diagnosis:**

```bash
# Check migrations
php artisan migrate:status

# Check config
php artisan tinker
>>> config('mindwave-tracing.database.enabled')
```

**Common Causes:**

-   Migrations not run
-   Database storage disabled
-   Wrong database connection
-   Sampling ratio too low

**Solution:**

```bash
# Run migrations
php artisan migrate

# Verify config
MINDWAVE_TRACE_DATABASE=true
MINDWAVE_TRACE_SAMPLER=always_on

# Clear config
php artisan config:clear

# Check tables
php artisan db:table mindwave_traces
```

---

### OTLP Export Failures

**Symptom:** Traces not appearing in Jaeger/Honeycomb

**Diagnosis:**

```bash
# Check config
php artisan tinker
>>> config('mindwave-tracing.otlp')

# Check logs
tail -f storage/logs/laravel.log | grep OTLP
```

**Common Causes:**

-   OTLP exporter not enabled
-   Wrong endpoint URL
-   Missing authentication headers
-   Network/firewall issues

**Solution:**

```bash
# Enable OTLP
MINDWAVE_TRACE_OTLP_ENABLED=true

# Verify endpoint
curl -v http://localhost:4318/v1/traces

# Test with Jaeger
docker run -d --name jaeger \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest

# Clear config
php artisan config:clear
```

---

### High Memory Usage

**Symptom:** Application consuming excessive memory

**Common Causes:**

-   Large batch queue size
-   Message capture enabled
-   Too many traces in queue

**Solution:**

```bash
# Reduce batch queue
MINDWAVE_TRACE_BATCH_MAX_QUEUE=512

# Disable message capture
MINDWAVE_TRACE_CAPTURE_MESSAGES=false

# Increase export frequency
MINDWAVE_TRACE_BATCH_DELAY=1000

# Sample traces
MINDWAVE_TRACE_SAMPLER=traceidratio
MINDWAVE_TRACE_SAMPLE_RATIO=0.1
```

---

### Cost Estimation Not Working

**Symptom:** `total_cost` is null or 0.00

**Common Causes:**

-   Cost estimation disabled
-   Model not in pricing table
-   Custom model without pricing

**Solution:**

```bash
# Enable cost estimation
MINDWAVE_COST_ESTIMATION_ENABLED=true

# Add custom pricing in config/mindwave-tracing.php
'pricing' => [
    'openai' => [
        'your-model-name' => [
            'input' => 0.001,
            'output' => 0.002,
        ],
    ],
],

# Clear config
php artisan config:clear
```

---

## Additional Resources

-   **Installation Guide:** See [installation.md](/docs/installation)
-   **Quick Start:** See [quickstart.md](/docs/installation)
-   **Tracing Guide:** See [tracing.md](/docs/observability/tracing)
-   **Context Discovery:** See [context-discovery.md](/docs/core/context-discovery)
-   **API Reference:** See [api-reference.md](/docs/reference/api)

**Official Documentation:**

-   [OpenAI API Docs](https://platform.openai.com/docs)
-   [Mistral AI Docs](https://docs.mistral.ai)
-   [OpenTelemetry Docs](https://opentelemetry.io/docs)
-   [Pinecone Docs](https://docs.pinecone.io)

**Support:**

-   GitHub Issues: [mindwave/mindwave/issues](https://github.com/mindwave/mindwave/issues)
-   Discussions: [mindwave/mindwave/discussions](https://github.com/mindwave/mindwave/discussions)
