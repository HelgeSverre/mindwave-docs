# Tracing & Observability

Mindwave provides production-grade observability for your AI applications through OpenTelemetry tracing with GenAI semantic conventions. Every LLM operation is automatically traced with detailed metrics, cost tracking, and performance monitoring.

## Overview

Tracing gives you deep visibility into your AI application's behavior in production. Understand what's happening inside your LLM calls, track costs, debug errors, and optimize performance—all without writing instrumentation code.

### What is Tracing?

Tracing records the complete lifecycle of operations as they flow through your system. Each operation (like an LLM call) creates a **span** with detailed metadata. Related spans are grouped into **traces** that represent complete workflows.

**A trace for an LLM call includes:**

-   Request parameters (model, temperature, max tokens)
-   Token usage (input, output, cached tokens)
-   Cost estimation (automatic, based on provider pricing)
-   Duration and latency
-   Success/failure status
-   Prompt and completion content (opt-in)

### Why Use Tracing?

**Production Debugging**

-   Identify slow or failing LLM calls
-   Track down errors with full context
-   Understand agent behavior in production

**Cost Management**

-   Monitor spending by user, feature, or time
-   Track token usage across models
-   Set alerts for expensive operations

**Performance Optimization**

-   Find bottlenecks in your AI workflows
-   Optimize token usage and prompts
-   Compare performance across models

**Quality Assurance**

-   Detect errors and failures
-   Analyze finish reasons
-   Monitor completion quality

## Quick Start

### Enable Tracing

Tracing is enabled by default in Mindwave. Configure in your `.env`:

```dotenv
# Enable/disable tracing
MINDWAVE_TRACING_ENABLED=true

# Service name (appears in tracing UI)
MINDWAVE_SERVICE_NAME=my-ai-app

# Store traces in database (enabled by default)
MINDWAVE_TRACE_DATABASE=true

# Capture prompts/completions (disabled for privacy)
MINDWAVE_TRACE_CAPTURE_MESSAGES=false
```

### Run Migrations

```bash
php artisan vendor:publish --tag=mindwave-migrations
php artisan migrate
```

This creates two tables:

-   `mindwave_traces` - One row per trace (complete workflow)
-   `mindwave_spans` - Individual operations (LLM calls, tool executions)

### Automatic Tracing

Every LLM call is automatically traced:

```php
use Mindwave\Mindwave\Facades\Mindwave;

// This call is automatically traced
$response = Mindwave::llm()
    ->generateText('What is Laravel?');

// Behind the scenes, Mindwave:
// 1. Creates a trace with unique trace_id
// 2. Records request (model, temperature, etc.)
// 3. Tracks token usage (input/output/total)
// 4. Estimates cost based on provider pricing
// 5. Stores everything in the database
```

## Querying Traces

Use Eloquent to query trace data:

### Recent LLM Calls

```php
use Mindwave\Mindwave\Observability\Models\Trace;

// Get last 10 LLM calls
$traces = Trace::with('spans')
    ->orderBy('start_time', 'desc')
    ->limit(10)
    ->get();

foreach ($traces as $trace) {
    echo "Trace: {$trace->trace_id}\n";
    echo "Duration: {$trace->getDurationInMilliseconds()}ms\n";
    echo "Cost: \${$trace->estimated_cost}\n";
    echo "Spans: {$trace->spans->count()}\n\n";
}
```

### Find Expensive Calls

```php
use Mindwave\Mindwave\Observability\Models\Span;

// Calls with > 10k tokens
$expensive = Span::whereRaw('(input_tokens + output_tokens) > 10000')
    ->with('trace')
    ->orderByDesc('input_tokens')
    ->limit(20)
    ->get();

foreach ($expensive as $span) {
    echo "Model: {$span->request_model}\n";
    echo "Tokens: " . ($span->input_tokens + $span->output_tokens) . "\n";
    echo "Duration: {$span->getDurationInMilliseconds()}ms\n\n";
}
```

### Find Slow Requests

```php
// Calls that took > 5 seconds
$slow = Span::slow(5000)->get();

foreach ($slow as $span) {
    echo "Model: {$span->request_model}\n";
    echo "Duration: {$span->getDurationInMilliseconds()}ms\n";
    echo "Provider: {$span->provider_name}\n\n";
}
```

### Group by Provider

```php
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
$usageByModel = Span::selectRaw('
        request_model,
        COUNT(*) as usage_count,
        SUM(input_tokens) as total_input,
        SUM(output_tokens) as total_output
    ')
    ->whereNotNull('request_model')
    ->groupBy('request_model')
    ->orderByDesc('usage_count')
    ->get();

foreach ($usageByModel as $model) {
    $totalTokens = $model->total_input + $model->total_output;

    echo "{$model->request_model}:\n";
    echo "  Uses: {$model->usage_count}\n";
    echo "  Tokens: " . number_format($totalTokens) . "\n\n";
}
```

## Cost Analysis

Track and analyze LLM spending:

### Daily Spending

```php
use Mindwave\Mindwave\Observability\Models\Trace;
use Carbon\Carbon;

$today = Carbon::today();

// Calculate today's cost
$todayCost = Trace::whereDate('created_at', $today)
    ->sum('estimated_cost');

echo "Today's LLM spend: \$" . number_format($todayCost, 4) . "\n";

// Breakdown by provider
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

### Budget Alerting

```php
use Mindwave\Mindwave\Observability\Events\LlmResponseCompleted;
use Illuminate\Support\Facades\Event;

Event::listen(LlmResponseCompleted::class, function ($event) {
    $span = $event->span;
    $totalTokens = $span->input_tokens + $span->output_tokens;

    // Alert on expensive calls (>10k tokens)
    if ($totalTokens > 10000) {
        Log::warning('Expensive LLM call detected', [
            'model' => $span->request_model,
            'tokens' => $totalTokens,
            'duration_ms' => $span->getDurationInMilliseconds(),
        ]);

        // Send notification
        // Mail::to('admin@example.com')->send(new ExpensiveCallAlert($span));
    }
});
```

## Scopes and Helpers

The `Span` model provides convenient query scopes:

```php
// Find by operation type
$chatSpans = Span::operation('chat')->get();
$embeddingsSpans = Span::operation('embeddings')->get();

// Find by provider
$openaiSpans = Span::provider('openai')->get();
$anthropicSpans = Span::provider('anthropic')->get();

// Find by model
$gpt4Spans = Span::model('gpt-4')->get();

// Find slow spans
$slowSpans = Span::slow()->get();  // > 5000ms by default
$verySlow = Span::slow(10000)->get();  // > 10 seconds

// Find errors
$errors = Span::withErrors()->get();

// Combine scopes
$slowOpenAI = Span::provider('openai')
    ->slow(3000)
    ->orderBy('duration', 'desc')
    ->get();
```

## Artisan Commands

### View Trace Statistics

```bash
# Overall statistics
php artisan mindwave:trace-stats

# Filter by date
php artisan mindwave:trace-stats --since=yesterday

# Filter by provider
php artisan mindwave:trace-stats --provider=openai
```

### Export Traces

```bash
# Export to JSON
php artisan mindwave:export-traces --format=json --output=traces.json

# Export to CSV
php artisan mindwave:export-traces --format=csv --output=traces.csv

# With filters
php artisan mindwave:export-traces \
    --provider=openai \
    --since="2025-01-01" \
    --until="2025-01-31" \
    --format=json
```

### Prune Old Traces

```bash
# Delete traces older than 30 days
php artisan mindwave:prune-traces --older-than=30

# Dry run (see what would be deleted)
php artisan mindwave:prune-traces --older-than=30 --dry-run

# Schedule automatic pruning
// In app/Console/Kernel.php
$schedule->command('mindwave:prune-traces --older-than=30 --force')
    ->dailyAt('02:00');
```

## Privacy & Security

By default, Mindwave **does not capture** prompts and completions to protect sensitive data.

### Enable Message Capture (Development Only)

```dotenv
# Safe by default - messages NOT captured
MINDWAVE_TRACE_CAPTURE_MESSAGES=false  # Default

# Enable in development only
MINDWAVE_TRACE_CAPTURE_MESSAGES=true  # Development only!
```

### Custom PII Redaction

Add attributes to redact in `config/mindwave-tracing.php`:

```php
'pii_redact' => [
    'gen_ai.input.messages',
    'gen_ai.output.messages',
    'gen_ai.system_instructions',
    'gen_ai.tool.call.arguments',
    'gen_ai.tool.call.result',
    'custom.user.email',  // Add custom attributes
],
```

### Data Retention

Configure retention policy:

```php
// config/mindwave-tracing.php
'retention_days' => 30,  // Delete traces older than 30 days
```

## OTLP Exporters

Export traces to production observability platforms:

### Jaeger Setup

```bash
# Run Jaeger locally
docker run -d --name jaeger \
  -p 4317:4317 \
  -p 16686:16686 \
  jaegertracing/all-in-one:latest
```

```dotenv
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

View at: http://localhost:16686

### Honeycomb Setup

```dotenv
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io:443
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_HEADERS='{"x-honeycomb-team":"YOUR_API_KEY"}'
```

### Multi-Exporter (Database + OTLP)

Use both simultaneously:

```php
// config/mindwave-tracing.php

'database' => [
    'enabled' => true,  // Fast local queries
],

'otlp' => [
    'enabled' => true,  // Production monitoring
],
```

## Best Practices

### Development Environment

```dotenv
# Full tracing, capture everything
MINDWAVE_TRACING_ENABLED=true
MINDWAVE_TRACE_DATABASE=true
MINDWAVE_TRACE_OTLP_ENABLED=false
MINDWAVE_TRACE_CAPTURE_MESSAGES=true
MINDWAVE_TRACE_SAMPLER=always_on
```

### Production Environment

```dotenv
# Sampled tracing, no PII, OTLP only
MINDWAVE_TRACING_ENABLED=true
MINDWAVE_TRACE_DATABASE=false
MINDWAVE_TRACE_OTLP_ENABLED=true
MINDWAVE_TRACE_CAPTURE_MESSAGES=false  # Protect privacy
MINDWAVE_TRACE_SAMPLER=traceidratio
MINDWAVE_TRACE_SAMPLE_RATIO=0.1  # Sample 10%
```

### Performance Optimization

**Use Sampling:**

```dotenv
MINDWAVE_TRACE_SAMPLE_RATIO=0.1  # Only trace 10% of requests
```

**Disable Message Capture:**

```dotenv
MINDWAVE_TRACE_CAPTURE_MESSAGES=false  # Reduces data volume
```

**Use OTLP Instead of Database:**

```dotenv
MINDWAVE_TRACE_DATABASE=false  # DB writes slow down requests
MINDWAVE_TRACE_OTLP_ENABLED=true  # OTLP optimized for throughput
```

## Troubleshooting

### Traces Not Appearing

**Check configuration:**

```bash
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

**Check for errors:**

```bash
tail -f storage/logs/laravel.log | grep -i trace
```

### High Memory Usage

**Reduce sampling:**

```dotenv
MINDWAVE_TRACE_SAMPLE_RATIO=0.1  # Sample only 10%
```

**Disable message capture:**

```dotenv
MINDWAVE_TRACE_CAPTURE_MESSAGES=false
```

**Use OTLP instead of database:**

```dotenv
MINDWAVE_TRACE_DATABASE=false
MINDWAVE_TRACE_OTLP_ENABLED=true
```

## Related Documentation

-   **[OpenTelemetry Tracing](/docs/observability/tracing)** - Complete tracing guide
-   **[Production Deployment](/docs/production)** - Production configuration
-   **[Cost Tracking](/docs/observability/cost-tracking)** - Monitor and reduce LLM costs
-   **[Troubleshooting](/docs/troubleshooting)** - Debug common issues
