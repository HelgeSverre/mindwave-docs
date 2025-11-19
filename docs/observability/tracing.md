# OpenTelemetry Tracing

Mindwave provides production-grade OpenTelemetry tracing for all LLM operations using GenAI semantic conventions. Get deep observability into your AI applications with automatic instrumentation, cost tracking, and performance monitoring.

## Overview

### What is OpenTelemetry Tracing?

OpenTelemetry is an open-source observability framework for cloud-native software. Tracing helps you understand what happens during a request's lifecycle by recording the path through your system as a series of spans organized in a trace.

For LLM applications, tracing is critical for:

-   **Production Debugging** - Identify slow or failing LLM calls in production
-   **Cost Analysis** - Track spending by user, feature, or time period
-   **Performance Optimization** - Find bottlenecks and optimize token usage
-   **Quality Monitoring** - Detect errors and analyze finish reasons
-   **Audit Trails** - Understand what prompts were sent and what responses were generated

### Why Use Mindwave's Tracing?

**Automatic Instrumentation**

-   Zero-code tracing for all LLM operations
-   Follows OpenTelemetry GenAI semantic conventions
-   Works with any OTLP-compatible backend

**LLM-Specific Features**

-   Token usage tracking (input, output, cache)
-   Automatic cost estimation with configurable pricing
-   Prompt and completion capture (opt-in, PII-aware)
-   Streaming support with real-time events
-   Multi-provider support (OpenAI, Anthropic, Mistral, Google)

**Flexible Storage**

-   Database storage for local querying with Eloquent
-   OTLP export to Jaeger, Grafana Tempo, Honeycomb, Datadog
-   Multi-exporter support (use both simultaneously)

**Privacy & Security**

-   PII redaction by default
-   Configurable message capture
-   Sampling strategies for high-volume applications

## Getting Started

### Installation

Mindwave's tracing is included in the package. Simply publish the configuration and migrations:

```bash
# Publish configuration
php artisan vendor:publish --tag=mindwave-config

# Publish and run migrations
php artisan vendor:publish --tag=mindwave-migrations
php artisan migrate
```

This creates two tables:

-   `mindwave_traces` - One row per trace (conversation/request)
-   `mindwave_spans` - Individual operations (LLM calls, tool executions)

### Basic Configuration

Configure tracing in your `.env` file:

```env
# Enable tracing
MINDWAVE_TRACING_ENABLED=true

# Service name (appears in tracing UI)
MINDWAVE_SERVICE_NAME=my-ai-app

# Database storage (enabled by default)
MINDWAVE_TRACE_DATABASE=true

# OTLP export (disabled by default)
MINDWAVE_TRACE_OTLP_ENABLED=false
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf

# Sampling (1.0 = 100% of traces)
MINDWAVE_TRACE_SAMPLER=always_on
MINDWAVE_TRACE_SAMPLE_RATIO=1.0

# Privacy
MINDWAVE_TRACE_CAPTURE_MESSAGES=false  # Don't capture prompts/completions by default
```

### Quick Start Example

```php
use Mindwave\Mindwave\Facades\Mindwave;

// This LLM call is automatically traced!
$response = Mindwave::llm()
    ->generateText('What is Laravel?');

// Behind the scenes, Mindwave automatically:
// 1. Creates a trace with unique trace_id
// 2. Creates a span for the LLM call
// 3. Records request parameters (model, temperature, etc.)
// 4. Tracks token usage (input, output, total)
// 5. Estimates cost based on provider pricing
// 6. Stores everything in the database
```

That's it! No additional code required. Every LLM call is now fully traced.

## Automatic Instrumentation

### What Gets Traced Automatically

Mindwave automatically instruments:

-   **Chat Completions** - OpenAI chat, Anthropic messages, etc.
-   **Text Completions** - Traditional completion endpoints
-   **Embeddings** - Vector generation for RAG
-   **Streaming Responses** - Real-time token streaming with events
-   **Tool Executions** - Function calling operations

Every LLM operation captures:

| Attribute          | Description                              | Example                                 |
| ------------------ | ---------------------------------------- | --------------------------------------- |
| **Trace ID**       | Unique identifier for the operation      | `3c8f4b9a2e1d6c7b8a9e0f1d2c3b4a5e`      |
| **Span ID**        | Unique identifier for this specific call | `7b8a9e0f1d2c3b4a`                      |
| **Provider**       | LLM provider name                        | `openai`, `anthropic`, `mistral`        |
| **Model**          | Model identifier                         | `gpt-4`, `claude-3-opus`                |
| **Operation**      | Type of operation                        | `chat`, `text_completion`, `embeddings` |
| **Start/End Time** | Timestamps in nanoseconds                | `1700000000000000000`                   |
| **Duration**       | Execution time in nanoseconds            | `1234567890`                            |
| **Token Usage**    | Input, output, cache tokens              | `150` input, `300` output               |
| **Cost**           | Estimated cost in USD                    | `$0.0045`                               |
| **Status**         | Success or error status                  | `ok`, `error`                           |
| **Temperature**    | Model temperature setting                | `0.7`                                   |
| **Max Tokens**     | Token limit                              | `1000`                                  |
| **Finish Reasons** | Why generation stopped                   | `["stop"]`, `["length"]`                |

### Trace Structure

A trace represents a complete operation (like handling an API request) and contains multiple spans:

```
Trace: 3c8f4b9a2e1d6c7b8a9e0f1d2c3b4a5e
├── Span: chat gpt-4 [client] (750ms, $0.0045)
│   ├── operation: chat
│   ├── provider: openai
│   ├── model: gpt-4
│   ├── input_tokens: 150
│   ├── output_tokens: 300
│   └── status: ok
│
├── Span: embeddings text-embedding-ada-002 [client] (120ms, $0.0001)
│   ├── operation: embeddings
│   ├── provider: openai
│   ├── model: text-embedding-ada-002
│   ├── input_tokens: 50
│   └── status: ok
│
└── Span: execute_tool web_search [internal] (450ms)
    ├── operation: execute_tool
    ├── tool_name: web_search
    └── status: ok
```

### Example: Viewing Automatic Traces

```php
use Mindwave\Mindwave\Observability\Models\Trace;
use Mindwave\Mindwave\Observability\Models\Span;

// Make some LLM calls
$response1 = Mindwave::llm('openai')->generateText('Hello');
$response2 = Mindwave::llm('anthropic')->generateText('World');

// Query recent traces
$traces = Trace::with('spans')
    ->orderBy('start_time', 'desc')
    ->limit(10)
    ->get();

foreach ($traces as $trace) {
    echo "Trace: {$trace->trace_id}\n";
    echo "Duration: {$trace->getDurationInMilliseconds()}ms\n";
    echo "Cost: \${$trace->estimated_cost}\n";
    echo "Spans: {$trace->spans->count()}\n\n";

    foreach ($trace->spans as $span) {
        echo "  → {$span->name} ({$span->provider_name})\n";
        echo "    Tokens: {$span->input_tokens} in, {$span->output_tokens} out\n";
        echo "    Duration: {$span->getDurationInMilliseconds()}ms\n";
    }
}
```

## Querying Traces

Mindwave provides Eloquent models for querying traces directly from your database.

### Find Recent LLM Calls

```php
use Mindwave\Mindwave\Observability\Models\Trace;

// Get the last 10 LLM calls
$traces = Trace::with('spans')
    ->orderBy('start_time', 'desc')
    ->limit(10)
    ->get();

foreach ($traces as $trace) {
    echo "Trace ID: {$trace->trace_id}\n";
    echo "Duration: {$trace->getDurationInMilliseconds()}ms\n";
    echo "Spans: {$trace->spans->count()}\n\n";
}
```

### Find Expensive Queries

```php
use Mindwave\Mindwave\Observability\Models\Span;

// Find LLM calls that cost more than $0.10
$expensive = Span::where('input_tokens', '>', 0)
    ->whereNotNull('provider_name')
    ->orderByRaw('(input_tokens + output_tokens) DESC')
    ->with('trace')
    ->limit(20)
    ->get();

foreach ($expensive as $span) {
    $totalTokens = $span->input_tokens + $span->output_tokens;

    echo "Model: {$span->request_model}\n";
    echo "Tokens: {$totalTokens}\n";
    echo "Duration: {$span->getDurationInMilliseconds()}ms\n\n";
}
```

### Find Slow Requests

```php
// Find requests that took longer than 5 seconds
$slow = Span::slow(5000)->get(); // 5000ms = 5 seconds

foreach ($slow as $span) {
    echo "Model: {$span->request_model}\n";
    echo "Duration: {$span->getDurationInMilliseconds()}ms\n";
    echo "Provider: {$span->provider_name}\n\n";
}
```

### Group by Provider

```php
// Get usage breakdown by provider
$costByProvider = Span::selectRaw('
        provider_name,
        COUNT(*) as call_count,
        SUM(input_tokens + output_tokens) as total_tokens,
        AVG(duration) as avg_duration_ns
    ')
    ->whereNotNull('provider_name')
    ->groupBy('provider_name')
    ->get();

foreach ($costByProvider as $provider) {
    $avgMs = round($provider->avg_duration_ns / 1_000_000, 2);

    echo "{$provider->provider_name}:\n";
    echo "  Calls: {$provider->call_count}\n";
    echo "  Tokens: " . number_format($provider->total_tokens) . "\n";
    echo "  Avg Duration: {$avgMs}ms\n\n";
}
```

### Group by Model

```php
// Get usage breakdown by model
$usageByModel = Span::selectRaw('
        request_model,
        COUNT(*) as usage_count,
        SUM(input_tokens) as total_input,
        SUM(output_tokens) as total_output,
        AVG(duration) as avg_duration
    ')
    ->whereNotNull('request_model')
    ->groupBy('request_model')
    ->orderByDesc('usage_count')
    ->get();

foreach ($usageByModel as $model) {
    $avgMs = round($model->avg_duration / 1_000_000, 2);
    $totalTokens = $model->total_input + $model->total_output;

    echo "{$model->request_model}:\n";
    echo "  Uses: {$model->usage_count}\n";
    echo "  Tokens: " . number_format($totalTokens) . "\n";
    echo "  Avg Duration: {$avgMs}ms\n\n";
}
```

### Filter by Date Range

```php
use Carbon\Carbon;

// Get traces from today
$today = Trace::whereDate('created_at', today())->get();

// Get traces from last 7 days
$lastWeek = Trace::where('created_at', '>=', now()->subDays(7))->get();

// Get traces from specific month
$january = Trace::whereMonth('created_at', 1)
    ->whereYear('created_at', 2025)
    ->get();
```

### Scope Queries

The `Span` model provides convenient query scopes:

```php
// Find spans by operation
$chatSpans = Span::operation('chat')->get();
$embeddingsSpans = Span::operation('embeddings')->get();

// Find spans by provider
$openaiSpans = Span::provider('openai')->get();
$anthropicSpans = Span::provider('anthropic')->get();

// Find spans by model
$gpt4Spans = Span::model('gpt-4')->get();

// Find slow spans (default: > 5000ms)
$slowSpans = Span::slow()->get();
$verySlow = Span::slow(10000)->get(); // > 10 seconds

// Find spans with errors
$errors = Span::withErrors()->get();

// Combine scopes
$slowOpenAI = Span::provider('openai')
    ->slow(3000)
    ->orderBy('duration', 'desc')
    ->get();
```

## Cost Analysis

Track and analyze your LLM spending with automatic cost estimation.

### Daily Spending Report

```php
use Mindwave\Mindwave\Observability\Models\Trace;
use Carbon\Carbon;

$today = Carbon::today();

// Calculate today's cost by summing trace costs
$todayCost = Trace::whereDate('created_at', $today)
    ->sum('estimated_cost');

echo "Today's LLM spend: \$" . number_format($todayCost, 4) . "\n";

// Get breakdown by provider
$breakdown = Span::whereDate('created_at', $today)
    ->whereNotNull('provider_name')
    ->selectRaw('provider_name, SUM(input_tokens) as input, SUM(output_tokens) as output')
    ->groupBy('provider_name')
    ->get();

foreach ($breakdown as $row) {
    echo "{$row->provider_name}: {$row->input} in, {$row->output} out\n";
}
```

### Monthly Cost Breakdown

```php
$thisMonth = Trace::whereMonth('created_at', now()->month)
    ->whereYear('created_at', now()->year)
    ->selectRaw('
        DATE(created_at) as date,
        SUM(estimated_cost) as daily_cost,
        SUM(total_input_tokens + total_output_tokens) as daily_tokens,
        COUNT(*) as daily_traces
    ')
    ->groupBy('date')
    ->orderBy('date')
    ->get();

foreach ($thisMonth as $day) {
    echo "{$day->date}: \${$day->daily_cost} ";
    echo "({$day->daily_traces} traces, ";
    echo number_format($day->daily_tokens) . " tokens)\n";
}
```

### Cost Comparison Between Providers

```php
$comparison = Span::selectRaw('
        provider_name,
        COUNT(*) as calls,
        SUM(input_tokens + output_tokens) as total_tokens
    ')
    ->whereIn('provider_name', ['openai', 'anthropic', 'mistral'])
    ->whereNotNull('provider_name')
    ->groupBy('provider_name')
    ->get();

foreach ($comparison as $provider) {
    echo "{$provider->provider_name}:\n";
    echo "  Calls: " . number_format($provider->calls) . "\n";
    echo "  Tokens: " . number_format($provider->total_tokens) . "\n\n";
}
```

### Budget Alerting

Set up real-time alerts for expensive LLM calls:

```php
use Mindwave\Mindwave\Observability\Events\LlmResponseCompleted;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

// Listen for expensive calls
Event::listen(LlmResponseCompleted::class, function ($event) {
    $span = $event->span;
    $totalTokens = $span->input_tokens + $span->output_tokens;

    // Alert on expensive calls (>10k tokens)
    if ($totalTokens > 10000) {
        Log::warning('Expensive LLM call detected', [
            'model' => $span->request_model,
            'tokens' => $totalTokens,
            'duration_ms' => $span->getDurationInMilliseconds(),
            'span_id' => $span->span_id,
        ]);

        // Send notification
        // Mail::to('admin@example.com')
        //     ->send(new ExpensiveCallAlert($span));
    }
});
```

### Cost Estimation Configuration

Mindwave includes pricing for major LLM providers. Update pricing in `config/mindwave-tracing.php`:

```php
'cost_estimation' => [
    'enabled' => env('MINDWAVE_COST_ESTIMATION_ENABLED', true),

    'pricing' => [
        // OpenAI Pricing (per 1000 tokens)
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

        // Anthropic Claude Pricing (per 1000 tokens)
        'anthropic' => [
            'claude-3-opus' => [
                'input' => 0.015,
                'output' => 0.075,
            ],
            'claude-3-sonnet' => [
                'input' => 0.003,
                'output' => 0.015,
            ],
        ],

        // Mistral AI Pricing (per 1000 tokens)
        'mistral' => [
            'mistral-large-latest' => [
                'input' => 0.004,
                'output' => 0.012,
            ],
        ],
    ],
],
```

## Manual Instrumentation

Create custom spans for non-LLM operations or add additional context.

### Basic Custom Span

```php
use Mindwave\Mindwave\Observability\Tracing\TracerManager;

$tracer = app(TracerManager::class);

$span = $tracer->spanBuilder('custom-operation')
    ->setAttribute('user_id', auth()->id())
    ->setAttribute('action', 'export_data')
    ->start();

try {
    // Your custom logic here
    $result = performExpensiveOperation();

    $span->setAttribute('result_count', count($result));
    $span->markAsOk();
} catch (\Exception $e) {
    $span->recordException($e);
    throw $e;
} finally {
    $span->end();
}
```

### Parent-Child Span Relationships

Create nested spans to represent hierarchical operations:

```php
$tracer = app(TracerManager::class);

// Parent span for batch processing
$parentSpan = $tracer->spanBuilder('batch-process')
    ->setAttribute('batch_size', count($items))
    ->start();

$context = $parentSpan->getContext();

// Process each item with a child span
foreach ($items as $item) {
    $childSpan = $tracer->spanBuilder('process-item')
        ->setParent($context) // Link to parent
        ->setAttribute('item_id', $item->id)
        ->start();

    try {
        processItem($item);
        $childSpan->markAsOk();
    } catch (\Exception $e) {
        $childSpan->recordException($e);
    } finally {
        $childSpan->end();
    }
}

$parentSpan->end();
```

### Wrapping Code in Spans

Use the `Span::wrap()` helper for quick instrumentation:

```php
use Mindwave\Mindwave\Observability\Tracing\Span;

// Wrap a database query
$users = Span::wrap('database-query', function () {
    return DB::table('users')
        ->where('active', true)
        ->get();
}, [
    'query_type' => 'select',
    'table' => 'users',
]);

// Wrap an API call
$response = Span::wrap('external-api', function () use ($url) {
    return Http::get($url);
}, [
    'url' => $url,
    'method' => 'GET',
]);
```

### GenAI Custom Spans

Create custom spans that follow GenAI semantic conventions:

```php
$tracer = app(TracerManager::class);

$span = $tracer->spanBuilder('chat custom-model')
    ->setAttribute('gen_ai.operation.name', 'chat')
    ->setAttribute('gen_ai.provider.name', 'custom-provider')
    ->setAttribute('gen_ai.request.model', 'my-model-v1')
    ->setAttribute('gen_ai.request.temperature', 0.7)
    ->setAttribute('gen_ai.request.max_tokens', 1000)
    ->start();

try {
    // Make custom LLM call
    $response = callCustomLLM();

    // Record usage
    $span->setAttribute('gen_ai.usage.input_tokens', 150);
    $span->setAttribute('gen_ai.usage.output_tokens', 300);
    $span->setAttribute('gen_ai.response.finish_reasons', ['stop']);

    $span->markAsOk();
} catch (\Exception $e) {
    $span->recordException($e);
    throw $e;
} finally {
    $span->end();
}
```

### Adding Events to Spans

Record point-in-time events within a span:

```php
$span = $tracer->spanBuilder('complex-operation')->start();

$span->addEvent('validation_started');

// ... validation logic ...

$span->addEvent('validation_completed', [
    'validated_items' => 42,
    'errors' => 0,
]);

// ... more processing ...

$span->addEvent('processing_completed', [
    'total_duration_ms' => 1234,
]);

$span->end();
```

## Streaming Traces

Mindwave automatically traces streaming LLM responses with real-time events.

### Automatic Streaming Instrumentation

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Stream a response (automatically traced)
$stream = Mindwave::llm()
    ->stream('Write a story about Laravel');

foreach ($stream as $delta) {
    echo $delta; // Output: "Once upon a time..."

    // Behind the scenes:
    // - Span remains open during streaming
    // - LlmTokenStreamed event fired for each delta
    // - Cumulative token count tracked
    // - Span closed when stream completes
}
```

### Listen to Streaming Events

```php
use Mindwave\Mindwave\Observability\Events\LlmTokenStreamed;
use Illuminate\Support\Facades\Event;

Event::listen(LlmTokenStreamed::class, function ($event) {
    echo "Token: {$event->delta}\n";
    echo "Cumulative: {$event->cumulativeTokens}\n";
    echo "Span: {$event->spanId}\n";
    echo "Trace: {$event->traceId}\n";
});
```

### Streaming Trace Structure

```
Trace: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
└── Span: text_completion gpt-4 [client] (5.2s)
    ├── operation: text_completion
    ├── provider: openai
    ├── model: gpt-4
    ├── output_tokens: 487 (cumulative)
    ├── events:
    │   ├── token_streamed (t=100ms, token=1)
    │   ├── token_streamed (t=110ms, token=2)
    │   ├── token_streamed (t=120ms, token=3)
    │   └── ... (484 more events)
    └── status: ok
```

## OTLP Exporters

Export traces to production observability platforms using OTLP (OpenTelemetry Protocol).

### Jaeger Setup

Jaeger is an open-source distributed tracing system.

**1. Run Jaeger locally:**

```bash
docker run -d --name jaeger \
  -p 4317:4317 \
  -p 4318:4318 \
  -p 16686:16686 \
  jaegertracing/all-in-one:latest
```

**2. Configure in `.env`:**

```env
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

**3. View traces:**

Open http://localhost:16686 and search for traces by service name.

### Grafana Tempo Setup

Tempo is Grafana's high-volume distributed tracing backend.

```env
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf

# If using multi-tenancy
OTEL_EXPORTER_OTLP_HEADERS='{"X-Scope-OrgID":"tenant1"}'
```

### Honeycomb Setup

Honeycomb is a powerful observability platform with excellent LLM tracing support.

```env
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io:443
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_HEADERS='{"x-honeycomb-team":"YOUR_API_KEY","x-honeycomb-dataset":"mindwave"}'
```

### Datadog Setup

Send traces to Datadog via the OpenTelemetry Collector.

**1. Run the OpenTelemetry Collector with Datadog exporter:**

```yaml
# otel-collector-config.yaml
receivers:
    otlp:
        protocols:
            http:
                endpoint: 0.0.0.0:4318

exporters:
    datadog:
        api:
            key: ${DD_API_KEY}
            site: datadoghq.com

service:
    pipelines:
        traces:
            receivers: [otlp]
            exporters: [datadog]
```

**2. Configure Mindwave:**

```env
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

### New Relic Setup

```env
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.nr-data.net:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_HEADERS='{"api-key":"YOUR_NEW_RELIC_LICENSE_KEY"}'
```

### Azure Monitor Setup

```env
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://YOUR_INSTANCE.applicationinsights.azure.com/v2.1/track
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_HEADERS='{"Authorization":"InstrumentationKey=YOUR_INSTRUMENTATION_KEY"}'
```

### Multi-Exporter Configuration

Use both database and OTLP exporters simultaneously:

```php
// config/mindwave-tracing.php

'database' => [
    'enabled' => true,
    'connection' => null, // Use default
],

'otlp' => [
    'enabled' => true,
    'endpoint' => env('OTEL_EXPORTER_OTLP_ENDPOINT'),
    'protocol' => env('OTEL_EXPORTER_OTLP_PROTOCOL', 'http/protobuf'),
    'headers' => [],
],
```

**Benefits:**

-   Database: Fast local queries with Eloquent
-   OTLP: Distributed tracing across services
-   Both: Local debugging + production monitoring

### gRPC Protocol

For better performance, use gRPC instead of HTTP:

```env
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_EXPORTER_OTLP_PROTOCOL=grpc
```

**Note:** Requires the PHP `grpc` extension:

```bash
pecl install grpc
```

## Configuration

### Complete Configuration Reference

```php
// config/mindwave-tracing.php

return [
    // Enable/disable tracing
    'enabled' => env('MINDWAVE_TRACING_ENABLED', true),

    // Service name (appears in tracing UI)
    'service_name' => env('MINDWAVE_SERVICE_NAME', env('APP_NAME', 'laravel-app')),

    // Database storage
    'database' => [
        'enabled' => env('MINDWAVE_TRACE_DATABASE', true),
        'connection' => env('MINDWAVE_TRACE_DB_CONNECTION', null),
    ],

    // OTLP exporter
    'otlp' => [
        'enabled' => env('MINDWAVE_TRACE_OTLP_ENABLED', false),
        'endpoint' => env('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://localhost:4318'),
        'protocol' => env('OTEL_EXPORTER_OTLP_PROTOCOL', 'http/protobuf'),
        'headers' => [],
    ],

    // Sampling strategy
    'sampler' => [
        'type' => env('MINDWAVE_TRACE_SAMPLER', 'always_on'),
        'ratio' => (float) env('MINDWAVE_TRACE_SAMPLE_RATIO', 1.0),
    ],

    // Batch processing
    'batch' => [
        'max_queue_size' => 2048,
        'scheduled_delay_ms' => 5000,
        'export_timeout_ms' => 512,
        'max_export_batch_size' => 256,
    ],

    // Privacy
    'capture_messages' => env('MINDWAVE_TRACE_CAPTURE_MESSAGES', false),
    'pii_redact' => [
        'gen_ai.input.messages',
        'gen_ai.output.messages',
        'gen_ai.system_instructions',
        'gen_ai.tool.call.arguments',
        'gen_ai.tool.call.result',
    ],

    // Data retention
    'retention_days' => 30,

    // Cost estimation
    'cost_estimation' => [
        'enabled' => true,
        'pricing' => [
            // See full pricing in config file
        ],
    ],

    // Resource attributes
    'resource_attributes' => [
        'deployment.environment' => env('APP_ENV', 'production'),
        'service.version' => env('APP_VERSION', '1.0.0'),
    ],

    // Instrumentation toggles
    'instrumentation' => [
        'llm' => true,
        'tools' => true,
        'vectorstore' => true,
        'embeddings' => true,
        'memory' => true,
    ],
];
```

### Sampling Strategies

Control which traces are recorded:

**Always On** (Default for development)

```env
MINDWAVE_TRACE_SAMPLER=always_on
```

**Always Off** (Disable tracing)

```env
MINDWAVE_TRACE_SAMPLER=always_off
```

**Trace ID Ratio** (Sample percentage)

```env
MINDWAVE_TRACE_SAMPLER=traceidratio
MINDWAVE_TRACE_SAMPLE_RATIO=0.1  # Sample 10% of traces
```

**Parent Based** (Follow parent span decision)

```env
MINDWAVE_TRACE_SAMPLER=parentbased
```

### Environment-Specific Configuration

**Development:**

```env
MINDWAVE_TRACING_ENABLED=true
MINDWAVE_TRACE_DATABASE=true
MINDWAVE_TRACE_OTLP_ENABLED=false
MINDWAVE_TRACE_CAPTURE_MESSAGES=true  # OK for local dev
MINDWAVE_TRACE_SAMPLER=always_on
MINDWAVE_TRACE_SAMPLE_RATIO=1.0  # 100%
```

**Production:**

```env
MINDWAVE_TRACING_ENABLED=true
MINDWAVE_TRACE_DATABASE=false  # Use OTLP only
MINDWAVE_TRACE_OTLP_ENABLED=true
MINDWAVE_TRACE_CAPTURE_MESSAGES=false  # Protect user privacy
MINDWAVE_TRACE_SAMPLER=traceidratio
MINDWAVE_TRACE_SAMPLE_RATIO=0.1  # Sample 10%
```

**Staging:**

```env
MINDWAVE_TRACING_ENABLED=true
MINDWAVE_TRACE_DATABASE=true  # Keep database for debugging
MINDWAVE_TRACE_OTLP_ENABLED=true  # Also send to observability platform
MINDWAVE_TRACE_CAPTURE_MESSAGES=false
MINDWAVE_TRACE_SAMPLER=always_on
MINDWAVE_TRACE_SAMPLE_RATIO=1.0  # 100%
```

## Privacy & Security

### PII Redaction

By default, Mindwave **does not capture** prompts and completions to protect sensitive user data.

**Safe by default:**

```env
MINDWAVE_TRACE_CAPTURE_MESSAGES=false  # Default
```

This redacts:

-   `gen_ai.input.messages` - User prompts
-   `gen_ai.output.messages` - AI responses
-   `gen_ai.system_instructions` - System prompts
-   `gen_ai.tool.call.arguments` - Function arguments
-   `gen_ai.tool.call.result` - Function results

**Enable message capture** only in development or when you have proper data governance:

```env
MINDWAVE_TRACE_CAPTURE_MESSAGES=true  # Development only!
```

### Custom PII Redaction

Add additional attributes to redact:

```php
// config/mindwave-tracing.php

'pii_redact' => [
    'gen_ai.input.messages',
    'gen_ai.output.messages',
    'gen_ai.system_instructions',
    'gen_ai.tool.call.arguments',
    'gen_ai.tool.call.result',
    'gen_ai.embeddings.input',
    'custom.user.email',  // Add custom attributes
    'custom.user.name',
],
```

### Conditional Message Capture

Capture messages only for specific users or environments:

```php
// In a service provider
use Mindwave\Mindwave\Observability\Tracing\GenAI\GenAiInstrumentor;

app()->singleton(GenAiInstrumentor::class, function ($app) {
    $tracerManager = $app->make(TracerManager::class);

    // Enable message capture only for admins in development
    $captureMessages = app()->environment('local')
        && auth()->check()
        && auth()->user()->isAdmin();

    return new GenAiInstrumentor(
        $tracerManager,
        captureMessages: $captureMessages,
        enabled: config('mindwave-tracing.enabled')
    );
});
```

### Data Retention

Automatically prune old traces to comply with data retention policies:

```php
// config/mindwave-tracing.php

'retention_days' => 30, // Delete traces older than 30 days
```

Run the prune command:

```bash
php artisan mindwave:prune-traces --older-than=30
```

## Artisan Commands

### Export Traces

Export traces to JSON, CSV, or NDJSON for analysis:

```bash
# Export to JSON
php artisan mindwave:export-traces --format=json --output=traces.json

# Export to CSV
php artisan mindwave:export-traces --format=csv --output=traces.csv

# Export to NDJSON (newline-delimited JSON)
php artisan mindwave:export-traces --format=ndjson --output=traces.ndjson

# Export with filters
php artisan mindwave:export-traces \
    --provider=openai \
    --since="2025-01-01" \
    --until="2025-01-31" \
    --format=json \
    --output=january-openai.json

# Filter by cost
php artisan mindwave:export-traces \
    --min-cost=0.10 \
    --format=csv

# Filter by duration
php artisan mindwave:export-traces \
    --slow=5000 \
    --format=json
```

### Prune Old Traces

Delete old traces to manage database size:

```bash
# Delete traces older than 30 days
php artisan mindwave:prune-traces --older-than=30

# Dry run (see what would be deleted)
php artisan mindwave:prune-traces --older-than=30 --dry-run

# Keep traces with errors
php artisan mindwave:prune-traces --older-than=30 --keep-errors

# Custom batch size
php artisan mindwave:prune-traces --older-than=30 --batch-size=1000

# Skip confirmation
php artisan mindwave:prune-traces --older-than=30 --force
```

### Trace Statistics

View comprehensive trace analytics:

```bash
# Overall statistics
php artisan mindwave:trace-stats

# Filter by date
php artisan mindwave:trace-stats --since=yesterday

# Filter by provider
php artisan mindwave:trace-stats --provider=openai

# Filter by model
php artisan mindwave:trace-stats --model=gpt-4
```

**Output example:**

```
Mindwave Trace Statistics

Overall Statistics
+---------------------+--------+
| Metric              | Value  |
+---------------------+--------+
| Total Traces        | 1,234  |
| Total Spans         | 2,456  |
| Completed Traces    | 1,230  |
| Avg Spans per Trace | 1.99   |
+---------------------+--------+

Token Usage
+---------------------+-----------+
| Metric              | Value     |
+---------------------+-----------+
| Total Input Tokens  | 150,000   |
| Total Output Tokens | 300,000   |
| Total Tokens        | 450,000   |
| Avg Input Tokens    | 121.65    |
| Avg Output Tokens   | 243.31    |
+---------------------+-----------+

Token Distribution:
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
Input: 33.3% | Output: 66.7%

Cost Analysis
+---------------+----------+
| Metric        | Value    |
+---------------+----------+
| Total Cost    | $45.6789 |
| Average Cost  | $0.0370  |
| Min Cost      | $0.0001  |
| Max Cost      | $1.2345  |
+---------------+----------+

Top Models by Usage
+----------------+-------+--------------+------+
| Model          | Uses  | Total Tokens | Chart|
+----------------+-------+--------------+------+
| gpt-4          | 500   | 250,000      | ▓▓▓▓▓|
| gpt-3.5-turbo  | 400   | 180,000      | ▓▓▓▓ |
| claude-3-opus  | 200   | 120,000      | ▓▓   |
+----------------+-------+--------------+------+
```

### Schedule Automatic Pruning

Add to `app/Console/Kernel.php`:

```php
protected function schedule(Schedule $schedule)
{
    // Prune traces older than 30 days, daily at 2am
    $schedule->command('mindwave:prune-traces --older-than=30 --force')
        ->dailyAt('02:00');
}
```

## Best Practices

### Development Environment

```env
# Development: Full tracing, capture everything
MINDWAVE_TRACING_ENABLED=true
MINDWAVE_TRACE_DATABASE=true
MINDWAVE_TRACE_OTLP_ENABLED=false
MINDWAVE_TRACE_CAPTURE_MESSAGES=true
MINDWAVE_TRACE_SAMPLER=always_on
MINDWAVE_TRACE_SAMPLE_RATIO=1.0
```

### Production Environment

```env
# Production: Sampled tracing, no PII, OTLP only
MINDWAVE_TRACING_ENABLED=true
MINDWAVE_TRACE_DATABASE=false
MINDWAVE_TRACE_OTLP_ENABLED=true
MINDWAVE_TRACE_CAPTURE_MESSAGES=false
MINDWAVE_TRACE_SAMPLER=traceidratio
MINDWAVE_TRACE_SAMPLE_RATIO=0.1  # 10% sampling
```

### Attribute Naming Conventions

Follow OpenTelemetry semantic conventions:

**Good:**

```php
$span->setAttribute('gen_ai.request.model', 'gpt-4');
$span->setAttribute('gen_ai.usage.input_tokens', 150);
$span->setAttribute('user.id', auth()->id());
$span->setAttribute('request.method', 'POST');
```

**Avoid:**

```php
$span->setAttribute('model', 'gpt-4'); // Too generic
$span->setAttribute('tokens_in', 150); // Non-standard
$span->setAttribute('userId', auth()->id()); // Inconsistent case
```

### Performance Considerations

**Use Sampling in Production:**

```env
MINDWAVE_TRACE_SAMPLE_RATIO=0.1  # Only trace 10% of requests
```

**Disable Message Capture:**

```env
MINDWAVE_TRACE_CAPTURE_MESSAGES=false  # Reduces data volume
```

**Use OTLP Instead of Database:**

```env
MINDWAVE_TRACE_DATABASE=false  # Database writes can slow down requests
MINDWAVE_TRACE_OTLP_ENABLED=true  # OTLP is optimized for high throughput
```

**Tune Batch Settings:**

```php
'batch' => [
    'max_queue_size' => 2048,           // Buffer more spans
    'scheduled_delay_ms' => 5000,       // Wait longer before exporting
    'max_export_batch_size' => 512,     // Export in larger batches
],
```

### Error Tracking

Always record exceptions in spans:

```php
$span = $tracer->spanBuilder('risky-operation')->start();

try {
    // Your code
} catch (\Exception $e) {
    // Record exception with full stack trace
    $span->recordException($e);

    // Optionally add context
    $span->setAttribute('error.type', get_class($e));
    $span->setAttribute('error.handled', true);

    throw $e;
} finally {
    $span->end();
}
```

### Context Propagation

When making HTTP requests to other services, propagate trace context:

```php
use Illuminate\Support\Facades\Http;
use Mindwave\Mindwave\Observability\Tracing\TracerManager;

$tracer = app(TracerManager::class);
$span = $tracer->spanBuilder('external-api-call')->start();

try {
    // Get traceparent header
    $context = $span->getContext();
    $traceparent = sprintf(
        '00-%s-%s-01',
        $context->getTraceId(),
        $context->getSpanId()
    );

    // Propagate to downstream service
    $response = Http::withHeaders([
        'traceparent' => $traceparent,
    ])->get('https://api.example.com/data');

    $span->markAsOk();
} finally {
    $span->end();
}
```

## Troubleshooting

### Traces Not Appearing in Database

**Check configuration:**

```php
php artisan tinker
>>> config('mindwave-tracing.enabled')
=> true
>>> config('mindwave-tracing.database.enabled')
=> true
```

**Check migrations:**

```bash
php artisan migrate:status | grep mindwave
```

**Check database connection:**

```bash
php artisan tinker
>>> \Mindwave\Mindwave\Observability\Models\Trace::count()
```

**Check for errors:**

```bash
tail -f storage/logs/laravel.log | grep -i trace
```

### OTLP Export Failing

**Check endpoint:**

```bash
curl http://localhost:4318/v1/traces
# Should return 405 Method Not Allowed (endpoint exists)
```

**Enable debug logging:**

```env
LOG_LEVEL=debug
```

**Check logs:**

```bash
tail -f storage/logs/laravel.log | grep -i otlp
```

**Test with simple HTTP request:**

```bash
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/x-protobuf" \
  --data-binary @/dev/null
```

### High Memory Usage

**Reduce sampling rate:**

```env
MINDWAVE_TRACE_SAMPLE_RATIO=0.1  # Sample only 10%
```

**Disable message capture:**

```env
MINDWAVE_TRACE_CAPTURE_MESSAGES=false
```

**Increase batch export frequency:**

```php
'batch' => [
    'scheduled_delay_ms' => 2000,  // Export more frequently (every 2s)
    'max_export_batch_size' => 256, // Smaller batches
],
```

**Use OTLP instead of database:**

```env
MINDWAVE_TRACE_DATABASE=false
MINDWAVE_TRACE_OTLP_ENABLED=true
```

### Slow Performance

**Disable tracing in critical paths:**

```php
'instrumentation' => [
    'llm' => true,
    'tools' => false,  // Disable tool tracing
    'vectorstore' => false,  // Disable vectorstore tracing
],
```

**Use asynchronous export:**

```php
'batch' => [
    'scheduled_delay_ms' => 5000,  // Batch longer
    'max_export_batch_size' => 1000,  // Larger batches
],
```

**Disable database writes:**

```env
MINDWAVE_TRACE_DATABASE=false
```

### Missing Span Data

**Check if span ended:**

```php
$span = $tracer->spanBuilder('test')->start();
// ... do work ...
$span->end();  // Must call end()!
```

**Check sampling:**

```php
>>> config('mindwave-tracing.sampler.ratio')
=> 1.0  // Should be 1.0 for 100%
```

**Force flush:**

```php
$tracer = app(TracerManager::class);
$tracer->forceFlush();
```

### Database Connection Issues

**Specify connection explicitly:**

```env
MINDWAVE_TRACE_DB_CONNECTION=mysql
```

**Check connection in config:**

```php
'database' => [
    'enabled' => true,
    'connection' => env('MINDWAVE_TRACE_DB_CONNECTION', 'mysql'),
],
```

## Advanced Examples

### Correlation with Laravel Logs

Add trace IDs to log messages for correlation:

```php
use Illuminate\Support\Facades\Log;
use Mindwave\Mindwave\Observability\Tracing\TracerManager;

$tracer = app(TracerManager::class);

// Get current span context
$span = $tracer->startSpan('api-request');
$context = $span->getContext();

Log::info('Processing user request', [
    'trace_id' => $context->getTraceId(),
    'span_id' => $context->getSpanId(),
    'user_id' => auth()->id(),
]);

// Later, search logs by trace_id to find related log entries
```

### Custom Metrics from Traces

Calculate SLIs and SLOs from trace data:

```php
use Mindwave\Mindwave\Observability\Models\Span;

// Calculate P50, P95, P99 latencies
$latencies = Span::whereDate('created_at', today())
    ->whereNotNull('duration')
    ->pluck('duration')
    ->map(fn($ns) => $ns / 1_000_000) // Convert to ms
    ->sort()
    ->values();

$p50 = $latencies->get((int)($latencies->count() * 0.50));
$p95 = $latencies->get((int)($latencies->count() * 0.95));
$p99 = $latencies->get((int)($latencies->count() * 0.99));

echo "Latency P50: {$p50}ms\n";
echo "Latency P95: {$p95}ms\n";
echo "Latency P99: {$p99}ms\n";

// Calculate error rate
$total = Span::whereDate('created_at', today())->count();
$errors = Span::whereDate('created_at', today())
    ->where('status_code', 'error')
    ->count();
$errorRate = $total > 0 ? ($errors / $total) * 100 : 0;

echo "Error Rate: " . round($errorRate, 2) . "%\n";
```

### Distributed Tracing Across Services

Propagate trace context when calling external services:

```php
// Service A: Create trace and call Service B
use Illuminate\Support\Facades\Http;
use Mindwave\Mindwave\Observability\Tracing\TracerManager;

$tracer = app(TracerManager::class);
$span = $tracer->spanBuilder('call-service-b')->start();

try {
    $context = $span->getContext();

    // Create W3C traceparent header
    $traceparent = sprintf(
        '00-%s-%s-01',
        $context->getTraceId(),
        $context->getSpanId()
    );

    // Call Service B with trace context
    $response = Http::withHeaders([
        'traceparent' => $traceparent,
    ])->post('https://service-b.com/api/process', [
        'data' => 'example',
    ]);

    $span->setAttribute('response.status', $response->status());
    $span->markAsOk();
} catch (\Exception $e) {
    $span->recordException($e);
    throw $e;
} finally {
    $span->end();
}

// Service B: Extract trace context and continue trace
// OpenTelemetry automatically propagates context from headers!
```

### Real-Time Monitoring Dashboard

Build a simple monitoring dashboard:

```php
use Mindwave\Mindwave\Observability\Models\Trace;
use Mindwave\Mindwave\Observability\Models\Span;

class TracingDashboardController extends Controller
{
    public function index()
    {
        // Last 24 hours stats
        $since = now()->subDay();

        $stats = [
            'total_traces' => Trace::where('created_at', '>=', $since)->count(),
            'total_cost' => Trace::where('created_at', '>=', $since)->sum('estimated_cost'),
            'total_tokens' => Trace::where('created_at', '>=', $since)
                ->sum(\DB::raw('total_input_tokens + total_output_tokens')),
            'error_rate' => $this->calculateErrorRate($since),
            'avg_latency' => $this->calculateAvgLatency($since),
        ];

        $recentTraces = Trace::with('spans')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        $topModels = Span::where('created_at', '>=', $since)
            ->whereNotNull('request_model')
            ->selectRaw('request_model, COUNT(*) as count')
            ->groupBy('request_model')
            ->orderByDesc('count')
            ->limit(5)
            ->get();

        return view('tracing.dashboard', compact('stats', 'recentTraces', 'topModels'));
    }

    private function calculateErrorRate($since)
    {
        $total = Trace::where('created_at', '>=', $since)->count();
        $errors = Trace::where('created_at', '>=', $since)
            ->where('status', 'error')
            ->count();

        return $total > 0 ? ($errors / $total) * 100 : 0;
    }

    private function calculateAvgLatency($since)
    {
        $avg = Trace::where('created_at', '>=', $since)
            ->whereNotNull('duration')
            ->avg('duration');

        return $avg ? round($avg / 1_000_000, 2) : 0; // Convert ns to ms
    }
}
```

## Resources

### Official Documentation

-   [OpenTelemetry Specification](https://opentelemetry.io/docs/specs/otel/)
-   [OpenTelemetry GenAI Conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
-   [OTLP Protocol Specification](https://opentelemetry.io/docs/specs/otlp/)

### Backend Documentation

-   [Jaeger Documentation](https://www.jaegertracing.io/docs/)
-   [Grafana Tempo Documentation](https://grafana.com/docs/tempo/)
-   [Honeycomb Documentation](https://docs.honeycomb.io/)
-   [Datadog APM](https://docs.datadoghq.com/tracing/)
-   [New Relic Distributed Tracing](https://docs.newrelic.com/docs/distributed-tracing/)

### Related Mindwave Documentation

-   [Context Discovery](/context/overview) - Trace context discovery pipelines
-   [Prompt Composition](/prompts/overview) - Trace prompt generation
-   [LLM Integration](/llm/overview) - LLM driver tracing details

### Community & Support

-   [GitHub Issues](https://github.com/helgesverre/mindwave/issues)
-   [GitHub Discussions](https://github.com/helgesverre/mindwave/discussions)
-   [Twitter @helgesverre](https://twitter.com/helgesverre)

---

**Next Steps:**

-   Set up [OTLP Export](#otlp-exporters) to your observability platform
-   Explore [Cost Analysis](#cost-analysis) to track spending
-   Learn about [Privacy & Security](#privacy--security) best practices
-   Build custom dashboards with [Querying Traces](#querying-traces)
