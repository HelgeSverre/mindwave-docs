# Tracing

OpenTelemetry-based observability for production LLM applications.

## Overview

This page provides a quick introduction. For complete documentation, see [Observability Tracing](/docs/observability/tracing).

## What is Tracing?

Mindwave's tracing system provides:

- **Automatic instrumentation** - Zero-code tracing for all LLM operations
- **Cost tracking** - Automatic token counting and cost estimation
- **Performance monitoring** - Latency, errors, and bottleneck detection
- **Database storage** - Query traces with Eloquent
- **OTLP export** - Send to Jaeger, Grafana Tempo, Honeycomb, Datadog
- **Privacy-first** - PII redaction by default

## Quick Start

### Enable Tracing

```bash
# .env
MINDWAVE_TRACING_ENABLED=true
MINDWAVE_SERVICE_NAME=my-app
```

### Run Migrations

```bash
php artisan migrate
```

### Make LLM Calls

```php
use Mindwave\Mindwave\Facades\Mindwave;

// This is automatically traced!
$response = Mindwave::llm()->generateText('What is Laravel?');

// Behind the scenes:
// - Trace created with unique ID
// - Span created for LLM call
// - Token usage tracked
// - Cost estimated
// - Everything stored in database
```

## View Traces

### Recent LLM Calls

```php
use Mindwave\Mindwave\Observability\Models\Trace;

$traces = Trace::with('spans')
    ->orderBy('start_time', 'desc')
    ->limit(10)
    ->get();

foreach ($traces as $trace) {
    echo "Trace: {$trace->trace_id}\n";
    echo "Duration: {$trace->getDurationInMilliseconds()}ms\n";
    echo "Cost: \${$trace->estimated_cost}\n";
    echo "Tokens: {$trace->total_input_tokens} + {$trace->total_output_tokens}\n\n";
}
```

### Cost Analysis

```php
use Carbon\Carbon;

// Today's spending
$todayCost = Trace::whereDate('created_at', Carbon::today())
    ->sum('estimated_cost');

echo "Today's LLM spend: $" . number_format($todayCost, 4);

// This month's spending
$monthCost = Trace::whereMonth('created_at', now()->month)
    ->sum('estimated_cost');

echo "This month: $" . number_format($monthCost, 2);
```

### Find Expensive Calls

```php
use Mindwave\Mindwave\Observability\Models\Span;

// Find calls over $0.10
$expensive = Span::whereNotNull('provider_name')
    ->orderByRaw('(input_tokens + output_tokens) DESC')
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
// Requests over 5 seconds
$slow = Span::slow(5000)->get();

foreach ($slow as $span) {
    echo "Model: {$span->request_model}\n";
    echo "Duration: {$span->getDurationInMilliseconds()}ms\n";
    echo "Provider: {$span->provider_name}\n\n";
}
```

### Usage by Provider

```php
$breakdown = Span::whereDate('created_at', today())
    ->whereNotNull('provider_name')
    ->selectRaw('
        provider_name,
        COUNT(*) as call_count,
        SUM(input_tokens + output_tokens) as total_tokens,
        AVG(duration) as avg_duration_ns
    ')
    ->groupBy('provider_name')
    ->get();

foreach ($breakdown as $provider) {
    $avgMs = round($provider->avg_duration_ns / 1_000_000, 2);

    echo "{$provider->provider_name}:\n";
    echo "  Calls: {$provider->call_count}\n";
    echo "  Tokens: " . number_format($provider->total_tokens) . "\n";
    echo "  Avg Duration: {$avgMs}ms\n\n";
}
```

## Real-Time Alerts

### Budget Alerts

```php
use Mindwave\Mindwave\Observability\Events\LlmResponseCompleted;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;

Event::listen(LlmResponseCompleted::class, function ($event) {
    $span = $event->span;
    $totalTokens = $span->input_tokens + $span->output_tokens;

    // Alert on expensive calls
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

### Performance Alerts

```php
Event::listen(LlmResponseCompleted::class, function ($event) {
    $span = $event->span;
    $durationMs = $span->getDurationInMilliseconds();

    // Alert on slow calls
    if ($durationMs > 10000) {  // 10 seconds
        Log::warning('Slow LLM call detected', [
            'model' => $span->request_model,
            'duration_ms' => $durationMs,
            'span_id' => $span->span_id,
        ]);
    }
});
```

## OTLP Export

Send traces to production observability platforms:

### Jaeger

```bash
# Run Jaeger
docker run -d --name jaeger \
  -p 4318:4318 \
  -p 16686:16686 \
  jaegertracing/all-in-one:latest

# Configure Mindwave
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

Open http://localhost:16686 to view traces.

### Honeycomb

```bash
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io:443
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_HEADERS='{"x-honeycomb-team":"YOUR_API_KEY"}'
```

### Grafana Tempo

```bash
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

## Artisan Commands

### View Statistics

```bash
php artisan mindwave:trace-stats

# Filter by provider
php artisan mindwave:trace-stats --provider=openai

# Filter by model
php artisan mindwave:trace-stats --model=gpt-4

# Filter by date
php artisan mindwave:trace-stats --since=yesterday
```

### Export Traces

```bash
# Export to JSON
php artisan mindwave:export-traces --format=json --output=traces.json

# Export to CSV
php artisan mindwave:export-traces --format=csv --output=traces.csv

# Filter by provider
php artisan mindwave:export-traces --provider=openai --format=json

# Filter by date
php artisan mindwave:export-traces --since="2025-01-01" --format=json
```

### Prune Old Traces

```bash
# Delete traces older than 30 days
php artisan mindwave:prune-traces --older-than=30

# Dry run
php artisan mindwave:prune-traces --older-than=30 --dry-run

# Keep traces with errors
php artisan mindwave:prune-traces --older-than=30 --keep-errors
```

## Privacy & Security

### PII Redaction (Default)

By default, prompts and completions are **not captured**:

```bash
MINDWAVE_TRACE_CAPTURE_MESSAGES=false  # Default
```

Only metadata is stored:
- Token counts
- Model names
- Durations
- Cost estimates
- Status codes

### Enable Message Capture (Dev Only)

```bash
# Development only!
MINDWAVE_TRACE_CAPTURE_MESSAGES=true
```

### Sampling

Reduce storage and costs in production:

```bash
# Production: Sample 10% of traces
MINDWAVE_TRACE_SAMPLER=traceidratio
MINDWAVE_TRACE_SAMPLE_RATIO=0.1

# Development: Trace everything
MINDWAVE_TRACE_SAMPLER=always_on
MINDWAVE_TRACE_SAMPLE_RATIO=1.0
```

## Configuration Examples

### Development

```bash
MINDWAVE_TRACING_ENABLED=true
MINDWAVE_TRACE_DATABASE=true
MINDWAVE_TRACE_OTLP_ENABLED=false
MINDWAVE_TRACE_CAPTURE_MESSAGES=true  # OK for local
MINDWAVE_TRACE_SAMPLER=always_on
```

### Production

```bash
MINDWAVE_TRACING_ENABLED=true
MINDWAVE_TRACE_DATABASE=false  # Use OTLP only
MINDWAVE_TRACE_OTLP_ENABLED=true
MINDWAVE_TRACE_CAPTURE_MESSAGES=false  # Protect privacy
MINDWAVE_TRACE_SAMPLER=traceidratio
MINDWAVE_TRACE_SAMPLE_RATIO=0.1  # 10% sampling
```

## Complete Documentation

For detailed information including:
- Manual instrumentation
- Custom spans and attributes
- Context propagation
- Cost estimation configuration
- Advanced querying
- Performance optimization
- Troubleshooting

See the **[Observability Tracing Documentation](/docs/observability/tracing)**.

## Related Documentation

- [Configuration Guide](/docs/configuration.md) - Tracing configuration
- [API Reference](/docs/reference/api.md) - Trace and Span models
- [Production Guide](/docs/production.md) - Production deployment
