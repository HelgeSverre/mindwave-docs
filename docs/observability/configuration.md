# Observability Configuration

Complete configuration reference for Mindwave's observability features, including tracing, cost estimation, sampling, privacy, and backend integrations.

## Configuration File

Mindwave's observability settings are defined in `config/mindwave-tracing.php`. Publish the configuration file:

```bash
php artisan vendor:publish --tag=mindwave-config
```

## Complete Configuration Reference

```php
<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Tracing Enabled
    |--------------------------------------------------------------------------
    |
    | Enable or disable OpenTelemetry tracing for all LLM operations.
    | When disabled, no traces, spans, or events will be generated.
    |
    */
    'enabled' => env('MINDWAVE_TRACING_ENABLED', true),

    /*
    |--------------------------------------------------------------------------
    | Service Name
    |--------------------------------------------------------------------------
    |
    | The service name that appears in tracing UIs (Jaeger, Tempo, etc.).
    | This helps identify traces from your application in distributed systems.
    |
    */
    'service_name' => env('MINDWAVE_SERVICE_NAME', env('APP_NAME', 'laravel-app')),

    /*
    |--------------------------------------------------------------------------
    | Database Storage
    |--------------------------------------------------------------------------
    |
    | Store traces in your application database for local querying with Eloquent.
    | This enables fast, flexible queries without external dependencies.
    |
    */
    'database' => [
        'enabled' => env('MINDWAVE_TRACE_DATABASE', true),
        'connection' => env('MINDWAVE_TRACE_DB_CONNECTION', null),
    ],

    /*
    |--------------------------------------------------------------------------
    | OTLP Exporter
    |--------------------------------------------------------------------------
    |
    | Export traces to OTLP-compatible backends (Jaeger, Tempo, Honeycomb, etc.)
    | for distributed tracing and production observability.
    |
    */
    'otlp' => [
        'enabled' => env('MINDWAVE_TRACE_OTLP_ENABLED', false),
        'endpoint' => env('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://localhost:4318'),
        'protocol' => env('OTEL_EXPORTER_OTLP_PROTOCOL', 'http/protobuf'),
        'headers' => [],
        'timeout_ms' => 10000,
    ],

    /*
    |--------------------------------------------------------------------------
    | Sampling Configuration
    |--------------------------------------------------------------------------
    |
    | Control which traces are recorded to reduce overhead in high-volume apps.
    |
    | Supported samplers:
    | - always_on: Record all traces (development)
    | - always_off: Record no traces (disable tracing)
    | - traceidratio: Sample a percentage of traces (production)
    | - parentbased: Follow parent span's sampling decision
    |
    */
    'sampler' => [
        'type' => env('MINDWAVE_TRACE_SAMPLER', 'always_on'),
        'ratio' => (float) env('MINDWAVE_TRACE_SAMPLE_RATIO', 1.0),
    ],

    /*
    |--------------------------------------------------------------------------
    | Batch Processing
    |--------------------------------------------------------------------------
    |
    | Configure how spans are batched before export to reduce overhead.
    |
    */
    'batch' => [
        'max_queue_size' => 2048,
        'scheduled_delay_ms' => 5000,
        'export_timeout_ms' => 512,
        'max_export_batch_size' => 256,
    ],

    /*
    |--------------------------------------------------------------------------
    | Message Capture
    |--------------------------------------------------------------------------
    |
    | Capture LLM prompts and completions in traces.
    | WARNING: Disable in production to protect user privacy and reduce data volume.
    |
    */
    'capture_messages' => env('MINDWAVE_TRACE_CAPTURE_MESSAGES', false),

    /*
    |--------------------------------------------------------------------------
    | PII Redaction
    |--------------------------------------------------------------------------
    |
    | Attributes to redact from traces when capture_messages is false.
    | These contain potentially sensitive user data.
    |
    */
    'pii_redact' => [
        'gen_ai.input.messages',
        'gen_ai.output.messages',
        'gen_ai.system_instructions',
        'gen_ai.tool.call.arguments',
        'gen_ai.tool.call.result',
        'gen_ai.embeddings.input',
    ],

    /*
    |--------------------------------------------------------------------------
    | Data Retention
    |--------------------------------------------------------------------------
    |
    | Number of days to retain traces in the database before automatic pruning.
    | Set to null to disable automatic pruning.
    |
    */
    'retention_days' => env('MINDWAVE_TRACE_RETENTION_DAYS', 30),

    /*
    |--------------------------------------------------------------------------
    | Cost Estimation
    |--------------------------------------------------------------------------
    |
    | Automatically calculate estimated costs for LLM operations based on
    | token usage and provider pricing.
    |
    */
    'cost_estimation' => [
        'enabled' => env('MINDWAVE_COST_ESTIMATION_ENABLED', true),

        'pricing' => [
            // OpenAI Pricing (per 1000 tokens, USD)
            'openai' => [
                'gpt-4' => [
                    'input' => 0.03,
                    'output' => 0.06,
                ],
                'gpt-4-turbo' => [
                    'input' => 0.01,
                    'output' => 0.03,
                ],
                'gpt-4-turbo-preview' => [
                    'input' => 0.01,
                    'output' => 0.03,
                ],
                'gpt-3.5-turbo' => [
                    'input' => 0.0005,
                    'output' => 0.0015,
                ],
                'text-embedding-ada-002' => [
                    'input' => 0.0001,
                    'output' => 0.0,
                ],
                'text-embedding-3-small' => [
                    'input' => 0.00002,
                    'output' => 0.0,
                ],
                'text-embedding-3-large' => [
                    'input' => 0.00013,
                    'output' => 0.0,
                ],
            ],

            // Anthropic Claude Pricing (per 1000 tokens, USD)
            'anthropic' => [
                'claude-3-opus' => [
                    'input' => 0.015,
                    'output' => 0.075,
                ],
                'claude-3-sonnet' => [
                    'input' => 0.003,
                    'output' => 0.015,
                ],
                'claude-3-haiku' => [
                    'input' => 0.00025,
                    'output' => 0.00125,
                ],
                'claude-2.1' => [
                    'input' => 0.008,
                    'output' => 0.024,
                ],
                'claude-2.0' => [
                    'input' => 0.008,
                    'output' => 0.024,
                ],
            ],

            // Mistral AI Pricing (per 1000 tokens, USD)
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
                'open-mistral-7b' => [
                    'input' => 0.00025,
                    'output' => 0.00025,
                ],
                'open-mixtral-8x7b' => [
                    'input' => 0.0007,
                    'output' => 0.0007,
                ],
            ],

            // Google Gemini Pricing (per 1000 tokens, USD)
            'google' => [
                'gemini-pro' => [
                    'input' => 0.00025,
                    'output' => 0.0005,
                ],
                'gemini-pro-vision' => [
                    'input' => 0.00025,
                    'output' => 0.0005,
                ],
            ],

            // Ollama (self-hosted, no cost)
            'ollama' => [
                'llama2' => ['input' => 0.0, 'output' => 0.0],
                'mistral' => ['input' => 0.0, 'output' => 0.0],
                'codellama' => ['input' => 0.0, 'output' => 0.0],
            ],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Resource Attributes
    |--------------------------------------------------------------------------
    |
    | Additional attributes to attach to all traces and spans.
    | These help categorize and filter traces in observability platforms.
    |
    */
    'resource_attributes' => [
        'deployment.environment' => env('APP_ENV', 'production'),
        'service.version' => env('APP_VERSION', '1.0.0'),
        'service.namespace' => env('MINDWAVE_SERVICE_NAMESPACE', 'default'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Instrumentation Toggles
    |--------------------------------------------------------------------------
    |
    | Selectively enable/disable tracing for different operation types.
    |
    */
    'instrumentation' => [
        'llm' => true,
        'tools' => true,
        'vectorstore' => true,
        'embeddings' => true,
        'memory' => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | Event Logging
    |--------------------------------------------------------------------------
    |
    | Automatically log events to Laravel's logging system.
    |
    */
    'log_events' => env('MINDWAVE_LOG_EVENTS', false),
    'slow_threshold_ms' => env('MINDWAVE_SLOW_THRESHOLD_MS', 5000),
    'cost_threshold' => env('MINDWAVE_COST_THRESHOLD', 0.1),
];
```

## Environment Variables

### Core Settings

```dotenv
# Enable/disable tracing
MINDWAVE_TRACING_ENABLED=true

# Service name for distributed tracing
MINDWAVE_SERVICE_NAME=my-ai-app

# App environment (dev, staging, production)
APP_ENV=production
```

### Storage Configuration

```dotenv
# Database storage
MINDWAVE_TRACE_DATABASE=true
MINDWAVE_TRACE_DB_CONNECTION=mysql

# Data retention (days)
MINDWAVE_TRACE_RETENTION_DAYS=30
```

### OTLP Export

```dotenv
# Enable OTLP export
MINDWAVE_TRACE_OTLP_ENABLED=true

# OTLP endpoint
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Protocol (http/protobuf or grpc)
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf

# Authentication headers (comma-separated)
OTEL_EXPORTER_OTLP_HEADERS=x-api-key=secret,x-tenant-id=acme
```

### Sampling

```dotenv
# Sampling strategy
MINDWAVE_TRACE_SAMPLER=traceidratio

# Sample ratio (0.0 to 1.0)
MINDWAVE_TRACE_SAMPLE_RATIO=0.1
```

### Privacy

```dotenv
# Capture LLM messages (prompts/completions)
MINDWAVE_TRACE_CAPTURE_MESSAGES=false
```

### Cost Estimation

```dotenv
# Enable cost calculation
MINDWAVE_COST_ESTIMATION_ENABLED=true
```

### Event Logging

```dotenv
# Log events to Laravel logs
MINDWAVE_LOG_EVENTS=false

# Slow request threshold (milliseconds)
MINDWAVE_SLOW_THRESHOLD_MS=5000

# High cost threshold (USD)
MINDWAVE_COST_THRESHOLD=0.1
```

## Configuration by Environment

### Development

Optimized for debugging and visibility:

```dotenv
MINDWAVE_TRACING_ENABLED=true
MINDWAVE_TRACE_DATABASE=true
MINDWAVE_TRACE_OTLP_ENABLED=false
MINDWAVE_TRACE_CAPTURE_MESSAGES=true
MINDWAVE_TRACE_SAMPLER=always_on
MINDWAVE_TRACE_SAMPLE_RATIO=1.0
MINDWAVE_LOG_EVENTS=true
```

**Why:**

-   Database storage for easy querying
-   Full message capture for debugging
-   100% sampling (trace everything)
-   Event logging for visibility

### Staging

Balanced between debugging and production simulation:

```dotenv
MINDWAVE_TRACING_ENABLED=true
MINDWAVE_TRACE_DATABASE=true
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318
MINDWAVE_TRACE_CAPTURE_MESSAGES=false
MINDWAVE_TRACE_SAMPLER=always_on
MINDWAVE_TRACE_SAMPLE_RATIO=1.0
MINDWAVE_LOG_EVENTS=false
```

**Why:**

-   Both database and OTLP for flexibility
-   No message capture (privacy)
-    100% sampling (catch all issues)
-   Jaeger for visualization

### Production

Optimized for performance and privacy:

```dotenv
MINDWAVE_TRACING_ENABLED=true
MINDWAVE_TRACE_DATABASE=false
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
MINDWAVE_TRACE_CAPTURE_MESSAGES=false
MINDWAVE_TRACE_SAMPLER=traceidratio
MINDWAVE_TRACE_SAMPLE_RATIO=0.1
MINDWAVE_LOG_EVENTS=false
MINDWAVE_TRACE_RETENTION_DAYS=30
```

**Why:**

-   OTLP only (no database overhead)
-   No message capture (privacy)
-    10% sampling (reduce volume)
-   OpenTelemetry Collector for advanced processing
-   30-day retention

## Database Configuration

### Connection

Use a specific database connection for traces:

```php
'database' => [
    'enabled' => true,
    'connection' => 'tracing', // Custom connection
],
```

Define the connection in `config/database.php`:

```php
'connections' => [
    'tracing' => [
        'driver' => 'mysql',
        'host' => env('TRACE_DB_HOST', '127.0.0.1'),
        'database' => env('TRACE_DB_DATABASE', 'traces'),
        'username' => env('TRACE_DB_USERNAME', 'root'),
        'password' => env('TRACE_DB_PASSWORD', ''),
    ],
],
```

### Migrations

Run migrations to create trace tables:

```bash
php artisan vendor:publish --tag=mindwave-migrations
php artisan migrate
```

Tables created:

-   `mindwave_traces` - One row per trace
-   `mindwave_spans` - Individual operations

## OTLP Configuration

### HTTP/Protobuf (Recommended)

```php
'otlp' => [
    'enabled' => true,
    'endpoint' => 'http://localhost:4318',
    'protocol' => 'http/protobuf',
    'headers' => [],
    'timeout_ms' => 10000,
],
```

### gRPC

Requires PHP gRPC extension:

```bash
pecl install grpc
```

Configuration:

```php
'otlp' => [
    'enabled' => true,
    'endpoint' => 'localhost:4317',
    'protocol' => 'grpc',
],
```

### Authentication Headers

Add API keys or tokens:

```php
'otlp' => [
    'headers' => [
        'x-api-key' => env('OTLP_API_KEY'),
        'Authorization' => 'Bearer ' . env('OTLP_TOKEN'),
    ],
],
```

Or via environment variable:

```dotenv
OTEL_EXPORTER_OTLP_HEADERS=x-api-key=secret,Authorization=Bearer token123
```

### Multi-Tenant Setup

Add tenant ID header:

```php
'otlp' => [
    'headers' => [
        'X-Scope-OrgID' => env('TRACE_TENANT_ID', 'default'),
    ],
],
```

## Sampling Configuration

### Always On

Record all traces (development):

```php
'sampler' => [
    'type' => 'always_on',
],
```

### Always Off

Disable tracing:

```php
'sampler' => [
    'type' => 'always_off',
],
```

### Trace ID Ratio

Sample a percentage of traces (production):

```php
'sampler' => [
    'type' => 'traceidratio',
    'ratio' => 0.1, // 10% of traces
],
```

### Parent Based

Follow parent span's sampling decision:

```php
'sampler' => [
    'type' => 'parentbased',
],
```

## Cost Estimation Configuration

### Enable/Disable

```php
'cost_estimation' => [
    'enabled' => env('MINDWAVE_COST_ESTIMATION_ENABLED', true),
],
```

### Update Pricing

Update provider pricing as rates change:

```php
'pricing' => [
    'openai' => [
        'gpt-4' => [
            'input' => 0.03,  // $30 per 1M input tokens
            'output' => 0.06, // $60 per 1M output tokens
        ],
    ],
],
```

### Custom Provider Pricing

Add pricing for custom or self-hosted models:

```php
'pricing' => [
    'custom-provider' => [
        'my-model' => [
            'input' => 0.002,
            'output' => 0.004,
        ],
    ],
],
```

## Privacy Configuration

### Message Capture

Disable in production:

```dotenv
MINDWAVE_TRACE_CAPTURE_MESSAGES=false
```

### PII Redaction

Configure attributes to redact:

```php
'pii_redact' => [
    'gen_ai.input.messages',
    'gen_ai.output.messages',
    'gen_ai.system_instructions',
    'custom.user.email',  // Add custom attributes
],
```

## Batch Processing

Tune for your application's load:

```php
'batch' => [
    'max_queue_size' => 2048,          // Buffer size
    'scheduled_delay_ms' => 5000,      // Export interval
    'export_timeout_ms' => 512,        // Export timeout
    'max_export_batch_size' => 256,    // Batch size
],
```

**Recommendations:**

| Environment  | Queue Size | Delay (ms) | Batch Size |
| ------------ | ---------- | ---------- | ---------- |
| Development  | 256        | 1000       | 64         |
| Staging      | 1024       | 3000       | 128        |
| Production   | 2048       | 5000       | 256        |
| High-Volume  | 4096       | 10000      | 512        |

## Resource Attributes

Add metadata to all traces:

```php
'resource_attributes' => [
    'deployment.environment' => env('APP_ENV'),
    'service.version' => env('APP_VERSION'),
    'service.namespace' => env('MINDWAVE_SERVICE_NAMESPACE'),
    'cloud.provider' => 'aws',
    'cloud.region' => 'us-east-1',
],
```

## Instrumentation Toggles

Selectively disable tracing for specific operations:

```php
'instrumentation' => [
    'llm' => true,           // LLM calls
    'tools' => true,         // Tool executions
    'vectorstore' => true,   // Vector searches
    'embeddings' => true,    // Embedding generation
    'memory' => true,        // Memory operations
],
```

## Troubleshooting

### Configuration Not Loading

Clear config cache:

```bash
php artisan config:clear
php artisan config:cache
```

### Verify Configuration

Check current configuration:

```php
php artisan tinker
>>> config('mindwave-tracing.enabled')
=> true
>>> config('mindwave-tracing.database.enabled')
=> true
```

### Debug Mode

Enable debug logging:

```dotenv
LOG_LEVEL=debug
MINDWAVE_LOG_EVENTS=true
```

## Related Documentation

-   [Observability Overview](/docs/observability/overview) - Introduction to observability
-   [Tracing](/docs/observability/tracing) - OpenTelemetry tracing guide
-   [Backends](/docs/observability/backends) - Supported observability platforms
-   [Cost Tracking](/docs/observability/cost-tracking) - Monitor LLM costs
