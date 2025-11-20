# Observability Overview

Comprehensive monitoring, tracing, and debugging capabilities for production LLM applications. Mindwave provides production-grade observability with automatic instrumentation, cost tracking, and performance monitoring.

## What is Observability?

Observability gives you deep insights into what's happening inside your AI application by combining:

-   **Traces** - Detailed records of every LLM operation and its lifecycle
-   **Events** - Real-time notifications about requests, completions, and errors
-   **Metrics** - Token usage, costs, performance, and error rates
-   **Context** - Full distributed tracing across services and components

For LLM applications, observability is critical for understanding costs, debugging production issues, optimizing performance, and ensuring quality.

## Why Observability Matters for LLM Apps

### Production Challenges

LLM applications have unique challenges that traditional monitoring doesn't address:

-   **Unpredictable Costs** - Token usage varies wildly, making budgeting difficult
-   **Variable Performance** - Response times range from milliseconds to minutes
-   **Black Box Behavior** - Hard to understand why an LLM produced a specific response
-   **Distributed Operations** - LLM calls span multiple services and providers
-   **Quality Issues** - Difficult to detect degraded output quality

### How Mindwave Helps

Mindwave's observability features solve these challenges:

-   **Automatic Cost Tracking** - Real-time cost estimates for every LLM call
-   **Performance Monitoring** - Track latency, identify slow operations
-   **Full Traceability** - See exactly what happened during each request
-   **Provider Flexibility** - Works with OpenAI, Anthropic, Ollama, and more
-   **Production-Ready** - OpenTelemetry standard, battle-tested architecture

## Key Features

### OpenTelemetry Tracing

Mindwave uses OpenTelemetry, the industry-standard observability framework:

-   **Automatic Instrumentation** - Zero-code tracing for all LLM operations
-   **Distributed Tracing** - Track requests across services
-   **Vendor-Neutral** - Works with any OTLP-compatible backend
-   **GenAI Conventions** - Follows OpenTelemetry GenAI semantic conventions

**Learn more:** [OpenTelemetry Tracing](/docs/observability/tracing)

### Cost Tracking

Track and analyze LLM spending in real-time:

-   **Automatic Calculation** - Costs computed for every request
-   **Per-User Attribution** - Track spending by user, tenant, or feature
-   **Budget Alerts** - Get notified when costs exceed thresholds
-   **Cost Optimization** - Identify expensive operations to optimize

**Learn more:** [Cost Tracking](/docs/observability/cost-tracking)

### Event System

React to LLM operations with Laravel events:

-   **LlmRequestStarted** - Before calling the LLM provider
-   **LlmResponseCompleted** - When a request finishes successfully
-   **LlmErrorOccurred** - When an error happens
-   **LlmTokenStreamed** - For each token in streaming responses

**Learn more:** [Events](/docs/observability/events)

### Database Storage

Query traces directly from your database:

-   **Eloquent Models** - Query traces with Laravel's ORM
-   **Powerful Queries** - Find expensive calls, slow operations, errors
-   **Local Analysis** - No external dependencies required
-   **Data Retention** - Configurable retention policies

**Learn more:** [Querying Traces](/docs/observability/querying)

### OTLP Exporters

Send traces to production observability platforms:

-   **Jaeger** - Open-source distributed tracing
-   **Grafana Tempo** - High-scale tracing backend
-   **Honeycomb** - Modern observability platform
-   **Datadog** - Full-stack monitoring
-   **Any OTLP-compatible backend**

**Learn more:** [OTLP & Exporters](/docs/observability/otlp)

## Quick Start

### Installation

Mindwave's observability is included in the package. Publish configuration and migrations:

```bash
# Publish configuration
php artisan vendor:publish --tag=mindwave-config

# Publish and run migrations
php artisan vendor:publish --tag=mindwave-migrations
php artisan migrate
```

### Enable Tracing

Configure tracing in your `.env` file:

```dotenv
# Enable tracing
MINDWAVE_TRACING_ENABLED=true

# Service name (appears in tracing UI)
MINDWAVE_SERVICE_NAME=my-ai-app

# Database storage
MINDWAVE_TRACE_DATABASE=true

# Optional: OTLP export to Jaeger, Tempo, etc.
MINDWAVE_TRACE_OTLP_ENABLED=false
```

### Make an LLM Call

That's it! Every LLM call is now automatically traced:

```php
use Mindwave\Mindwave\Facades\Mindwave;

// This is automatically traced
$response = Mindwave::llm()
    ->generateText('What is Laravel?');

// Behind the scenes, Mindwave:
// 1. Creates a trace with unique trace_id
// 2. Creates a span for the LLM call
// 3. Records request parameters
// 4. Tracks token usage
// 5. Estimates cost
// 6. Stores in database
```

### Query Your Traces

Query traces using Eloquent:

```php
use Mindwave\Mindwave\Observability\Models\Trace;

// Get recent traces
$traces = Trace::with('spans')
    ->orderBy('created_at', 'desc')
    ->limit(10)
    ->get();

foreach ($traces as $trace) {
    echo "Cost: \${$trace->estimated_cost}\n";
    echo "Duration: {$trace->getDurationInMilliseconds()}ms\n";
    echo "Tokens: {$trace->getTotalTokens()}\n";
}
```

## Architecture

### Trace Structure

A **trace** represents a complete operation (like handling an API request) and contains multiple **spans**:

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
└── Span: execute_tool web_search [internal] (450ms)
    ├── operation: execute_tool
    ├── tool_name: web_search
    └── status: ok
```

### Storage Options

Mindwave supports multiple storage backends:

**Database (Eloquent)**

-   Store traces in your application database
-   Query with Laravel's ORM
-   Fast local analysis
-   No external dependencies

**OTLP Export**

-   Send to Jaeger, Tempo, Honeycomb, Datadog
-   Distributed tracing across services
-   Production observability platforms
-   Advanced querying and visualization

**Both**

-   Use database for local queries
-   Export to OTLP for distributed tracing
-   Best of both worlds

## Use Cases

### Cost Monitoring

Track LLM spending in real-time:

```php
use Mindwave\Mindwave\Observability\Models\Trace;

// Today's total cost
$cost = Trace::whereDate('created_at', today())
    ->sum('estimated_cost');

echo "Today's spend: \$" . number_format($cost, 2);
```

### Performance Analysis

Find slow operations:

```php
use Mindwave\Mindwave\Observability\Models\Span;

// Find operations slower than 5 seconds
$slow = Span::slow(5000)
    ->orderBy('duration', 'desc')
    ->get();

foreach ($slow as $span) {
    echo "{$span->name}: {$span->getDurationInMilliseconds()}ms\n";
}
```

### Error Debugging

Track down production issues:

```php
// Find recent errors
$errors = Trace::where('status', 'error')
    ->with('spans')
    ->orderBy('created_at', 'desc')
    ->get();

foreach ($errors as $trace) {
    $errorSpan = $trace->spans
        ->firstWhere('status_code', 'error');

    echo "Error: {$errorSpan->status_description}\n";
    echo "Trace: {$trace->trace_id}\n";
}
```

### Real-Time Monitoring

React to LLM operations with events:

```php
use Mindwave\Mindwave\Observability\Events\LlmResponseCompleted;
use Illuminate\Support\Facades\Event;

Event::listen(LlmResponseCompleted::class, function ($event) {
    // Alert on expensive calls
    if ($event->costEstimate > 0.50) {
        Slack::send("Expensive LLM call: \${$event->costEstimate}");
    }
});
```

## Configuration

### Basic Setup

Configure observability in `config/mindwave-tracing.php`:

```php
return [
    // Enable/disable tracing
    'enabled' => env('MINDWAVE_TRACING_ENABLED', true),

    // Service name
    'service_name' => env('MINDWAVE_SERVICE_NAME', 'laravel-app'),

    // Database storage
    'database' => [
        'enabled' => env('MINDWAVE_TRACE_DATABASE', true),
    ],

    // OTLP export
    'otlp' => [
        'enabled' => env('MINDWAVE_TRACE_OTLP_ENABLED', false),
        'endpoint' => env('OTEL_EXPORTER_OTLP_ENDPOINT'),
    ],

    // Privacy
    'capture_messages' => env('MINDWAVE_TRACE_CAPTURE_MESSAGES', false),

    // Cost estimation
    'cost_estimation' => [
        'enabled' => true,
    ],
];
```

**Learn more:** [Configuration](/docs/observability/configuration)

### Environment-Specific Settings

**Development:**

```dotenv
MINDWAVE_TRACING_ENABLED=true
MINDWAVE_TRACE_DATABASE=true
MINDWAVE_TRACE_CAPTURE_MESSAGES=true  # Debug with full context
MINDWAVE_TRACE_SAMPLER=always_on
```

**Production:**

```dotenv
MINDWAVE_TRACING_ENABLED=true
MINDWAVE_TRACE_DATABASE=false  # Use OTLP only
MINDWAVE_TRACE_OTLP_ENABLED=true
MINDWAVE_TRACE_CAPTURE_MESSAGES=false  # Privacy
MINDWAVE_TRACE_SAMPLER=traceidratio
MINDWAVE_TRACE_SAMPLE_RATIO=0.1  # Sample 10%
```

## Best Practices

### 1. Always Track Costs in Production

Enable cost tracking to avoid billing surprises:

```dotenv
MINDWAVE_COST_ESTIMATION_ENABLED=true
```

Update pricing regularly as providers change rates.

### 2. Protect User Privacy

Never capture prompts/responses in production:

```dotenv
MINDWAVE_TRACE_CAPTURE_MESSAGES=false
```

### 3. Use Sampling in High-Volume Apps

Sample traces to reduce overhead:

```dotenv
MINDWAVE_TRACE_SAMPLER=traceidratio
MINDWAVE_TRACE_SAMPLE_RATIO=0.1  # 10% of traces
```

### 4. Set Up Data Retention

Automatically prune old traces:

```php
// config/mindwave-tracing.php
'retention_days' => 30,
```

Schedule the prune command:

```php
// app/Console/Kernel.php
$schedule->command('mindwave:prune-traces --days=30')
    ->daily();
```

### 5. Monitor Your Monitoring

Use events to alert on issues:

```php
Event::listen(LlmErrorOccurred::class, function ($event) {
    Log::error('LLM error', [
        'model' => $event->model,
        'error' => $event->getMessage(),
    ]);
});
```

### 6. Use OTLP for Production

For production deployments, export to a dedicated observability platform:

```dotenv
MINDWAVE_TRACE_DATABASE=false
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318
```

## Common Scenarios

### Scenario 1: Startup (Local Development)

**Goal:** Debug locally, minimal setup

**Configuration:**

```dotenv
MINDWAVE_TRACE_DATABASE=true
MINDWAVE_TRACE_OTLP_ENABLED=false
MINDWAVE_TRACE_CAPTURE_MESSAGES=true
```

**Why:** Database storage is simplest, no external dependencies.

### Scenario 2: Growing Team (Staging + Production)

**Goal:** Visualize traces, track costs

**Configuration:**

```dotenv
# Staging
MINDWAVE_TRACE_DATABASE=true
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318

# Production
MINDWAVE_TRACE_DATABASE=false
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318
MINDWAVE_TRACE_SAMPLE_RATIO=0.1
```

**Why:** Jaeger for staging visualization, Tempo for production scale.

### Scenario 3: Enterprise (Multi-Region, High Volume)

**Goal:** Scale, compliance, cost optimization

**Configuration:**

```dotenv
MINDWAVE_TRACE_DATABASE=false
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
MINDWAVE_TRACE_SAMPLE_RATIO=0.01  # 1% sampling
MINDWAVE_TRACE_CAPTURE_MESSAGES=false
```

**Why:** OpenTelemetry Collector for advanced processing, low sampling for scale.

## Troubleshooting

### Traces Not Appearing

**Check configuration:**

```php
php artisan tinker
>>> config('mindwave-tracing.enabled')
=> true
```

**Check migrations:**

```bash
php artisan migrate:status | grep mindwave
```

**Check logs:**

```bash
tail -f storage/logs/laravel.log | grep -i trace
```

### High Memory Usage

**Reduce sampling:**

```dotenv
MINDWAVE_TRACE_SAMPLE_RATIO=0.1
```

**Disable message capture:**

```dotenv
MINDWAVE_TRACE_CAPTURE_MESSAGES=false
```

### Slow Performance

**Use OTLP instead of database:**

```dotenv
MINDWAVE_TRACE_DATABASE=false
MINDWAVE_TRACE_OTLP_ENABLED=true
```

**Increase batch delay:**

```php
'batch' => [
    'scheduled_delay_ms' => 10000,  // 10 seconds
],
```

## Next Steps

**Getting Started:**

-   [Tracing](/docs/observability/tracing) - Complete tracing guide
-   [Configuration](/docs/observability/configuration) - All configuration options
-   [Cost Tracking](/docs/observability/cost-tracking) - Monitor LLM costs

**Advanced:**

-   [Backends](/docs/observability/backends) - Set up Jaeger, Tempo, Honeycomb
-   [Querying](/docs/observability/querying) - Query traces effectively
-   [Events](/docs/observability/events) - React to LLM operations

**Production:**

-   [OTLP & Exporters](/docs/observability/otlp) - Production deployments
-   [Production Guide](/docs/production) - Best practices for production
