# Querying Traces

Once traces are collected, querying and analyzing them becomes essential for debugging production issues, optimizing performance, monitoring costs, and understanding LLM usage patterns across your application.

## Overview

### Why Query Traces?

Traces provide a detailed record of every LLM operation in your application. By querying traces effectively, you can:

-   **Debug Production Issues** - Find failed requests, trace errors back to their source, and understand what went wrong
-   **Optimize Performance** - Identify slow operations, bottlenecks, and opportunities for caching
-   **Monitor Costs** - Track spending by model, user, feature, or time period
-   **Understand Usage** - Analyze token consumption, popular models, and user behavior patterns
-   **Improve Quality** - Review actual LLM interactions to optimize prompts and configurations

### Query Capabilities

Mindwave stores traces in multiple backends, each with different querying capabilities:

-   **Database (Eloquent)** - Powerful SQL queries with Laravel's query builder
-   **Jaeger** - Time-range searches, tag filtering, TraceQL support
-   **Honeycomb** - Advanced aggregations, custom visualizations, and query builder
-   **Zipkin** - Basic search by service, operation, and tags

This guide covers querying across all backends, organized by common use cases.

---

## Trace Structure in Mindwave

Understanding the structure of traces helps you write effective queries.

### Span Hierarchy

Traces are composed of **spans** arranged in a parent-child hierarchy:

-   **Trace** - The top-level container for a complete operation
-   **Root Span** - The first span in a trace (no parent)
-   **Child Spans** - Nested spans that belong to a parent

Example hierarchy:

```
Trace (trace_id: abc123)
└── Root Span: "llm.chat" (span_id: def456)
    ├── Child Span: "context.discover" (span_id: ghi789)
    │   ├── "vectorstore.search" (span_id: jkl012)
    │   └── "database.query" (span_id: mno345)
    └── Child Span: "llm.stream" (span_id: pqr678)
```

### Attributes Added by Mindwave

Mindwave automatically adds rich attributes to every span following OpenTelemetry GenAI semantic conventions:

#### LLM Operation Attributes

| Attribute               | Description           | Example                                 |
| ----------------------- | --------------------- | --------------------------------------- |
| `gen_ai.operation.name` | Type of operation     | `chat`, `text_completion`, `embeddings` |
| `gen_ai.provider.name`  | LLM provider          | `openai`, `anthropic`, `mistral`        |
| `gen_ai.request.model`  | Requested model       | `gpt-4-turbo`, `claude-3-opus`          |
| `gen_ai.response.model` | Actual response model | `gpt-4-turbo-2024-04-09`                |

#### Token Usage Attributes

| Attribute                            | Description                       | Example |
| ------------------------------------ | --------------------------------- | ------- |
| `gen_ai.usage.input_tokens`          | Input/prompt tokens               | `150`   |
| `gen_ai.usage.output_tokens`         | Output/completion tokens          | `300`   |
| `gen_ai.usage.total_tokens`          | Total tokens used                 | `450`   |
| `gen_ai.usage.cache_read_tokens`     | Cache read tokens (Anthropic)     | `100`   |
| `gen_ai.usage.cache_creation_tokens` | Cache creation tokens (Anthropic) | `50`    |

#### Request Parameters

| Attribute                          | Description                | Example |
| ---------------------------------- | -------------------------- | ------- |
| `gen_ai.request.temperature`       | Sampling temperature       | `0.7`   |
| `gen_ai.request.max_tokens`        | Maximum output tokens      | `1000`  |
| `gen_ai.request.top_p`             | Nucleus sampling parameter | `0.9`   |
| `gen_ai.request.frequency_penalty` | Frequency penalty          | `0.5`   |
| `gen_ai.request.presence_penalty`  | Presence penalty           | `0.5`   |

#### Response Metadata

| Attribute                        | Description            | Example                                    |
| -------------------------------- | ---------------------- | ------------------------------------------ |
| `gen_ai.response.id`             | Provider response ID   | `chatcmpl-abc123`                          |
| `gen_ai.response.finish_reasons` | Why generation stopped | `["stop"]`, `["length"]`, `["tool_calls"]` |

#### Span Metadata

| Field         | Description             | Example                        |
| ------------- | ----------------------- | ------------------------------ |
| `name`        | Span name               | `openai.chat`                  |
| `kind`        | Span kind               | `client`, `server`, `internal` |
| `status_code` | Status                  | `ok`, `error`                  |
| `duration`    | Duration in nanoseconds | `1500000000` (1.5s)            |
| `start_time`  | Start timestamp (ns)    | `1732045200000000000`          |
| `end_time`    | End timestamp (ns)      | `1732045201500000000`          |

### Events Recorded

Spans can contain **events** - timestamped occurrences during execution:

-   **Token streaming events** - Individual token deliveries during streaming
-   **Exception events** - Detailed error information
-   **Custom events** - Application-specific markers

### Span Naming Conventions

Mindwave follows these naming patterns:

-   **LLM calls**: `{provider}.{operation}` (e.g., `openai.chat`, `anthropic.chat`)
-   **Context discovery**: `context.discover`
-   **Vector searches**: `vectorstore.{operation}` (e.g., `vectorstore.search`)
-   **Tool executions**: `tool.{tool_name}`
-   **Custom operations**: User-defined names

---

## Querying with Eloquent (Database)

The most powerful way to query Mindwave traces is through Laravel's Eloquent ORM and the database backend.

### Basic Queries

#### Find Recent LLM Calls

```php
use Mindwave\Mindwave\Observability\Models\Trace;

// Get the last 10 traces
$traces = Trace::with('spans')
    ->orderBy('created_at', 'desc')
    ->limit(10)
    ->get();

foreach ($traces as $trace) {
    echo "Trace: {$trace->trace_id}\n";
    echo "Duration: {$trace->getDurationInMilliseconds()}ms\n";
    echo "Cost: \${$trace->estimated_cost}\n";
    echo "Spans: {$trace->spans->count()}\n\n";
}
```

#### Find Traces by Time Range

```php
use Carbon\Carbon;

// Traces from the last hour
$recentTraces = Trace::where('created_at', '>=', Carbon::now()->subHour())
    ->orderBy('created_at', 'desc')
    ->get();

// Traces from yesterday
$yesterday = Trace::whereDate('created_at', Carbon::yesterday())
    ->get();

// Traces between specific dates
$traces = Trace::whereBetween('created_at', [
    Carbon::parse('2025-01-01'),
    Carbon::parse('2025-01-31'),
])->get();
```

#### Query Specific Spans

```php
use Mindwave\Mindwave\Observability\Models\Span;

// Find all GPT-4 calls
$gpt4Spans = Span::where('request_model', 'like', 'gpt-4%')
    ->with('trace')
    ->get();

// Find spans by provider
$openaiSpans = Span::provider('openai')
    ->orderBy('created_at', 'desc')
    ->get();

// Find spans by operation
$chatSpans = Span::operation('chat')
    ->get();
```

### Performance Analysis

#### Find Slow Operations

```php
// Spans that took longer than 5 seconds
$slowSpans = Span::slow(5000) // 5000ms
    ->with('trace')
    ->orderBy('duration', 'desc')
    ->get();

foreach ($slowSpans as $span) {
    echo "Slow operation: {$span->name}\n";
    echo "Model: {$span->request_model}\n";
    echo "Duration: {$span->getDurationInMilliseconds()}ms\n";
    echo "Tokens: {$span->getTotalTokens()}\n\n";
}
```

#### Calculate P95 and P99 Latency

```php
use Illuminate\Support\Facades\DB;

// Get percentile latencies for a specific model
$stats = Span::where('request_model', 'gpt-4-turbo')
    ->whereNotNull('duration')
    ->selectRaw('
        MIN(duration) / 1000000 as min_ms,
        AVG(duration) / 1000000 as avg_ms,
        MAX(duration) / 1000000 as max_ms
    ')
    ->first();

// For P95/P99, you may need raw SQL depending on your database
// MySQL 8.0+ / PostgreSQL example:
$percentiles = DB::table('mindwave_spans')
    ->where('request_model', 'gpt-4-turbo')
    ->whereNotNull('duration')
    ->selectRaw('
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY duration) / 1000000 as p50_ms,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration) / 1000000 as p95_ms,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration) / 1000000 as p99_ms
    ')
    ->first();
```

#### Find Slowest Models

```php
$slowestModels = Span::whereNotNull('request_model')
    ->whereNotNull('duration')
    ->selectRaw('
        request_model,
        AVG(duration) / 1000000 as avg_duration_ms,
        COUNT(*) as total_calls
    ')
    ->groupBy('request_model')
    ->orderByDesc('avg_duration_ms')
    ->limit(10)
    ->get();

foreach ($slowestModels as $model) {
    echo "{$model->request_model}: {$model->avg_duration_ms}ms avg ({$model->total_calls} calls)\n";
}
```

#### Identify Context Discovery Bottlenecks

```php
// Find slow context discovery operations
$slowDiscovery = Span::where('name', 'like', 'context.%')
    ->slow(1000) // Over 1 second
    ->with('trace', 'children')
    ->get();

foreach ($slowDiscovery as $span) {
    echo "Slow context discovery: {$span->getDurationInMilliseconds()}ms\n";

    // Check which child operations were slow
    foreach ($span->children as $child) {
        echo "  - {$child->name}: {$child->getDurationInMilliseconds()}ms\n";
    }
}
```

### Cost Analysis

#### Find Expensive LLM Calls

```php
// Find individual calls costing more than $0.10
$expensive = Span::whereNotNull('input_tokens')
    ->whereNotNull('output_tokens')
    ->get()
    ->filter(function ($span) {
        // Calculate cost per span
        return $this->estimateSpanCost($span) > 0.10;
    });

// Or find expensive traces
$expensiveTraces = Trace::expensive(0.10)
    ->orderBy('estimated_cost', 'desc')
    ->get();

foreach ($expensiveTraces as $trace) {
    echo "Expensive trace: {$trace->trace_id}\n";
    echo "Cost: \${$trace->estimated_cost}\n";
    echo "Tokens: {$trace->getTotalTokens()}\n\n";
}
```

#### Daily Cost Report

```php
use Carbon\Carbon;

$dailyCosts = Trace::whereDate('created_at', '>=', Carbon::now()->subDays(30))
    ->selectRaw('
        DATE(created_at) as date,
        SUM(estimated_cost) as total_cost,
        COUNT(*) as total_calls,
        SUM(total_input_tokens + total_output_tokens) as total_tokens
    ')
    ->groupBy('date')
    ->orderBy('date')
    ->get();

foreach ($dailyCosts as $day) {
    echo "{$day->date}: \${$day->total_cost} ({$day->total_calls} calls, {$day->total_tokens} tokens)\n";
}
```

#### Cost by Provider

```php
$costByProvider = DB::table('mindwave_spans')
    ->join('mindwave_traces', 'mindwave_spans.trace_id', '=', 'mindwave_traces.trace_id')
    ->whereNotNull('provider_name')
    ->selectRaw('
        provider_name,
        COUNT(DISTINCT mindwave_traces.id) as trace_count,
        COUNT(mindwave_spans.id) as span_count,
        SUM(mindwave_traces.estimated_cost) as total_cost,
        AVG(mindwave_traces.estimated_cost) as avg_cost
    ')
    ->groupBy('provider_name')
    ->orderByDesc('total_cost')
    ->get();

foreach ($costByProvider as $provider) {
    echo "{$provider->provider_name}:\n";
    echo "  Total Cost: \${$provider->total_cost}\n";
    echo "  Traces: {$provider->trace_count}\n";
    echo "  Avg Cost/Trace: \${$provider->avg_cost}\n\n";
}
```

#### Cost by Model

```php
$costByModel = Span::whereNotNull('request_model')
    ->selectRaw('
        request_model,
        COUNT(*) as calls,
        SUM(input_tokens) as total_input,
        SUM(output_tokens) as total_output,
        SUM(input_tokens + output_tokens) as total_tokens
    ')
    ->groupBy('request_model')
    ->orderByDesc('total_tokens')
    ->get();

// You'll need to calculate cost based on your pricing config
foreach ($costByModel as $model) {
    echo "{$model->request_model}:\n";
    echo "  Calls: {$model->calls}\n";
    echo "  Input Tokens: {$model->total_input}\n";
    echo "  Output Tokens: {$model->total_output}\n";
    echo "  Total Tokens: {$model->total_tokens}\n\n";
}
```

#### Monthly Budget Tracking

```php
use Carbon\Carbon;

$monthlyBudget = 100.00; // $100 budget

$currentMonth = Trace::whereMonth('created_at', Carbon::now()->month)
    ->whereYear('created_at', Carbon::now()->year)
    ->selectRaw('SUM(estimated_cost) as total_cost')
    ->first();

$spent = $currentMonth->total_cost ?? 0;
$remaining = $monthlyBudget - $spent;
$percentUsed = ($spent / $monthlyBudget) * 100;

echo "Monthly Budget: \${$monthlyBudget}\n";
echo "Spent: \${$spent} ({$percentUsed}%)\n";
echo "Remaining: \${$remaining}\n";

if ($percentUsed > 80) {
    echo "WARNING: 80% of budget used!\n";
}
```

### Debugging

#### Find Failed LLM Calls

```php
// Find traces with errors
$failedTraces = Trace::where('status', 'error')
    ->with('spans')
    ->orderBy('created_at', 'desc')
    ->get();

foreach ($failedTraces as $trace) {
    echo "Failed trace: {$trace->trace_id}\n";
    echo "Time: {$trace->created_at}\n";

    // Find which span failed
    $errorSpan = $trace->spans->first(fn($s) => $s->status_code === 'error');
    if ($errorSpan) {
        echo "Failed span: {$errorSpan->name}\n";
        echo "Error: {$errorSpan->status_description}\n";
    }
    echo "\n";
}

// Find spans with errors
$errorSpans = Span::withErrors()
    ->with('trace')
    ->orderBy('created_at', 'desc')
    ->get();
```

#### Trace by Request ID

```php
// Find a specific trace by ID
$trace = Trace::where('trace_id', 'your-trace-id-here')
    ->with('spans.children')
    ->first();

if ($trace) {
    echo "Trace: {$trace->trace_id}\n";
    echo "Status: {$trace->status}\n";
    echo "Duration: {$trace->getDurationInMilliseconds()}ms\n";
    echo "Cost: \${$trace->estimated_cost}\n\n";

    echo "Span tree:\n";
    foreach ($trace->spans as $span) {
        $indent = $span->parent_span_id ? "  " : "";
        echo "{$indent}{$span->name} ({$span->getDurationInMilliseconds()}ms)\n";
    }
}
```

#### Find Error Patterns

```php
// Group errors by model
$errorsByModel = Span::withErrors()
    ->selectRaw('
        request_model,
        COUNT(*) as error_count,
        status_description
    ')
    ->groupBy('request_model', 'status_description')
    ->orderByDesc('error_count')
    ->get();

foreach ($errorsByModel as $error) {
    echo "{$error->request_model}: {$error->error_count} errors\n";
    echo "  Message: {$error->status_description}\n\n";
}
```

#### Find Timeout Issues

```php
// Assuming timeouts result in specific error messages
$timeouts = Span::withErrors()
    ->where('status_description', 'like', '%timeout%')
    ->orWhere('status_description', 'like', '%timed out%')
    ->with('trace')
    ->get();

foreach ($timeouts as $span) {
    echo "Timeout in: {$span->name}\n";
    echo "Model: {$span->request_model}\n";
    echo "Duration: {$span->getDurationInMilliseconds()}ms\n";
    echo "Error: {$span->status_description}\n\n";
}
```

### Usage Analytics

#### Token Usage Trends

```php
use Carbon\Carbon;

// Daily token usage for the last 30 days
$tokenTrends = Trace::whereDate('created_at', '>=', Carbon::now()->subDays(30))
    ->selectRaw('
        DATE(created_at) as date,
        SUM(total_input_tokens) as input_tokens,
        SUM(total_output_tokens) as output_tokens,
        SUM(total_input_tokens + total_output_tokens) as total_tokens
    ')
    ->groupBy('date')
    ->orderBy('date')
    ->get();

foreach ($tokenTrends as $day) {
    echo "{$day->date}: {$day->total_tokens} tokens ";
    echo "(in: {$day->input_tokens}, out: {$day->output_tokens})\n";
}
```

#### Model Usage Distribution

```php
$modelDistribution = Span::whereNotNull('request_model')
    ->selectRaw('
        request_model,
        COUNT(*) as usage_count,
        SUM(input_tokens + output_tokens) as total_tokens
    ')
    ->groupBy('request_model')
    ->orderByDesc('usage_count')
    ->get();

$totalCalls = $modelDistribution->sum('usage_count');

foreach ($modelDistribution as $model) {
    $percentage = ($model->usage_count / $totalCalls) * 100;
    echo "{$model->request_model}: {$model->usage_count} calls ({$percentage}%)\n";
    echo "  Tokens: {$model->total_tokens}\n";
}
```

#### Peak Usage Times

```php
$hourlyUsage = Trace::selectRaw('
        HOUR(created_at) as hour,
        COUNT(*) as call_count,
        AVG(estimated_cost) as avg_cost
    ')
    ->groupBy('hour')
    ->orderBy('hour')
    ->get();

foreach ($hourlyUsage as $hour) {
    echo "Hour {$hour->hour}:00 - {$hour->call_count} calls, \${$hour->avg_cost} avg cost\n";
}
```

#### User Activity Patterns

```php
// Assuming you add user_id as metadata or custom attribute
$userActivity = DB::table('mindwave_traces')
    ->whereNotNull('metadata->user_id')
    ->selectRaw("
        JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.user_id')) as user_id,
        COUNT(*) as call_count,
        SUM(estimated_cost) as total_cost,
        SUM(total_input_tokens + total_output_tokens) as total_tokens
    ")
    ->groupBy('user_id')
    ->orderByDesc('call_count')
    ->limit(20)
    ->get();

foreach ($userActivity as $user) {
    echo "User {$user->user_id}: {$user->call_count} calls, ";
    echo "\${$user->total_cost}, {$user->total_tokens} tokens\n";
}
```

---

## Querying in Jaeger

Jaeger provides a powerful web UI for trace visualization and search.

### UI Overview

Access Jaeger at `http://localhost:16686` (default) or your configured endpoint.

Key sections:

-   **Search** - Find traces by service, operation, tags, and time
-   **Trace View** - Visualize span hierarchy and timing
-   **Compare** - Side-by-side trace comparison

### Basic Search

#### Search by Service

1. Select **Service**: `mindwave-app` (or your configured service name)
2. Select **Operation**: `openai.chat` or `All`
3. Set **Lookback**: Last hour, 2 hours, custom range
4. Click **Find Traces**

#### Search by Tags

Filter traces using tags (attributes):

-   `gen_ai.provider.name=openai` - Only OpenAI calls
-   `gen_ai.request.model=gpt-4-turbo` - Specific model
-   `gen_ai.operation.name=chat` - Chat operations only
-   `error=true` - Failed traces

Example multi-tag search:

```
gen_ai.provider.name=anthropic
gen_ai.request.model=claude-3-opus
```

#### Time Range Selection

-   **Lookback**: Quick presets (last hour, 6 hours, 12 hours, etc.)
-   **Custom**: Specify exact start and end times

### Advanced Filtering

#### Find Expensive Operations

Jaeger doesn't natively support cost filtering, but you can:

1. Search for specific high-cost models:
    - Tag: `gen_ai.request.model=gpt-4` (expensive models)
2. Filter by token count (if you add custom tags):
    - Tag: `gen_ai.usage.total_tokens>10000`

#### Find Slow Requests

1. Set **Min Duration**: e.g., `5s` (5 seconds)
2. Set **Max Duration**: optional upper limit
3. Click **Find Traces**

This shows only traces slower than the minimum duration.

#### Filter by Status

Find errors:

1. Tag: `error=true`
2. Or: `status.code=error`

### TraceQL Queries (Jaeger v1.35+)

If your Jaeger supports TraceQL:

```traceql
# Find traces with high token usage
{ span.gen_ai.usage.total_tokens > 5000 }

# Find expensive Claude calls
{
  span.gen_ai.provider.name = "anthropic" &&
  span.gen_ai.request.model =~ "claude-3-opus.*"
}

# Find slow chat operations
{
  span.gen_ai.operation.name = "chat" &&
  duration > 5s
}

# Find errors in specific model
{
  span.gen_ai.request.model = "gpt-4-turbo" &&
  status = error
}
```

---

## Querying in Honeycomb

Honeycomb provides the most powerful query and visualization capabilities.

### UI Overview

Access Honeycomb at `https://ui.honeycomb.io` and select your dataset.

Key features:

-   **Query Builder** - Visual query construction
-   **Visualizations** - Heatmaps, histograms, time series
-   **Boards** - Custom dashboards
-   **Triggers** - Automated alerts

### Query Builder

#### Basic Query Structure

1. **Visualize**: Choose metric (COUNT, AVG, P95, etc.)
2. **WHERE**: Filter conditions
3. **GROUP BY**: Dimension to group by
4. **Time Range**: Select period

#### Example: Find All LLM Calls Over $0.10

1. **WHERE**: Add filter
    - Field: `gen_ai.usage.total_tokens`
    - Operator: `>`
    - Value: Calculate tokens for $0.10 (varies by model, e.g., ~3000 for GPT-4)
2. **GROUP BY**: `gen_ai.request.model`
3. **VISUALIZE**: `COUNT`

Better approach if you add cost as custom attribute:

1. **WHERE**: `span.cost_usd > 0.10`
2. **GROUP BY**: `gen_ai.request.model`
3. **VISUALIZE**: `SUM(span.cost_usd)`

#### Example: Slowest Context Discovery Operations

1. **WHERE**:
    - `name` contains `context.`
    - `duration_ms` > `1000`
2. **GROUP BY**: `name`
3. **VISUALIZE**: `P95(duration_ms)`
4. **ORDER BY**: `P95(duration_ms)` DESC

#### Example: Token Usage by User

1. **WHERE**: None (or filter by date range)
2. **GROUP BY**: `user_id` (requires custom attribute)
3. **VISUALIZE**: `SUM(gen_ai.usage.total_tokens)`
4. **Time Series**: Check for trend over time

#### Example: Error Rate by Model

1. **VISUALIZE**:
    - `COUNT` where `status.code = error` as `errors`
    - `COUNT` as `total`
    - Calculate rate: `errors / total * 100`
2. **GROUP BY**: `gen_ai.request.model`
3. **ORDER BY**: Error rate DESC

### Creating Boards

Boards are custom dashboards with multiple visualizations.

#### Cost Monitoring Board

Create a board with these queries:

**1. Total Daily Spend**

-   Visualize: `SUM(cost_usd)` (custom attribute)
-   Group by: None
-   Time Series: Daily
-   Graph: Line chart

**2. Cost by Provider**

-   Visualize: `SUM(cost_usd)`
-   Group by: `gen_ai.provider.name`
-   Graph: Bar chart

**3. Cost by Model**

-   Visualize: `SUM(cost_usd)`
-   Group by: `gen_ai.request.model`
-   Graph: Pie chart

**4. Top 10 Expensive Traces**

-   Visualize: `MAX(cost_usd)`
-   Group by: `trace.trace_id`
-   Order by: `MAX(cost_usd)` DESC
-   Limit: 10

#### Performance Dashboard

**1. P95 Latency by Model**

-   Visualize: `P95(duration_ms)`
-   Group by: `gen_ai.request.model`
-   Graph: Bar chart

**2. Request Rate**

-   Visualize: `COUNT`
-   Time Series: 1-hour buckets
-   Graph: Area chart

**3. Error Rate**

-   Visualize: `COUNT` where `status.code = error` / `COUNT` \* 100
-   Time Series: 1-hour buckets
-   Graph: Line chart with threshold alert

**4. Latency Heatmap**

-   Visualize: `HEATMAP(duration_ms)`
-   Group by: `gen_ai.request.model`
-   Time range: Last 24 hours

### Alert Configuration

Set up triggers for automated alerts:

#### High Cost Alert

-   **Query**: `SUM(cost_usd)` over 1 hour
-   **Threshold**: > $10
-   **Alert**: Slack, email, PagerDuty

#### Error Rate Alert

-   **Query**: `COUNT where status.code = error` / `COUNT` \* 100
-   **Threshold**: > 5% (more than 5% error rate)
-   **Alert**: Immediate notification

#### Slow Request Alert

-   **Query**: `P95(duration_ms)`
-   **Threshold**: > 10000 (10 seconds)
-   **Alert**: Warning notification

---

## Querying in Zipkin

Zipkin provides basic but effective trace querying.

### UI Overview

Access Zipkin at `http://localhost:9411` (default).

### Search Capabilities

#### Basic Search

1. **Service Name**: Select `mindwave-app`
2. **Span Name**: Optional filter (e.g., `openai.chat`)
3. **Lookback**: Time range to search
4. **Min Duration**: Filter slow traces
5. Click **Search**

#### Tag-based Filtering

Click **+** next to tags to add filters:

-   `gen_ai.provider.name`: Filter by provider
-   `gen_ai.request.model`: Filter by model
-   `gen_ai.operation.name`: Filter by operation type
-   `error`: Show only errors

#### Annotation Search

Search by span annotations (events):

-   `error` - Traces with errors
-   Custom annotations you've added

### Example Queries

**Find all OpenAI GPT-4 calls:**

-   Service: `mindwave-app`
-   Tags: `gen_ai.provider.name=openai`, `gen_ai.request.model=gpt-4-turbo`

**Find slow traces:**

-   Service: `mindwave-app`
-   Min Duration: `5000000` (5000ms in microseconds)

**Find errors:**

-   Service: `mindwave-app`
-   Tags: `error=true`

---

## Programmatic Querying

### Using Artisan Commands

Mindwave provides Artisan commands for querying and exporting traces.

#### View Trace Statistics

```bash
# Overall statistics
php artisan mindwave:trace-stats

# Filter by provider
php artisan mindwave:trace-stats --provider=openai

# Filter by model
php artisan mindwave:trace-stats --model=gpt-4-turbo

# Filter by date range
php artisan mindwave:trace-stats --since=yesterday
php artisan mindwave:trace-stats --since="2025-01-01"
```

Output includes:

-   Total traces and spans
-   Token usage (input, output, total)
-   Cost analysis (total, average, min, max)
-   Performance metrics (avg, min, max duration)
-   Top models by usage and cost
-   Error analysis

#### Export Traces

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
    --min-cost=0.05 \
    --slow=5000 \
    --since="2025-01-01" \
    --format=json \
    --output=expensive-slow-traces.json
```

Export options:

-   `--since` - Export from date (e.g., "yesterday", "2025-01-01")
-   `--until` - Export until date
-   `--provider` - Filter by provider
-   `--min-cost` - Minimum cost in USD
-   `--slow` - Minimum duration in milliseconds
-   `--format` - Output format (csv, json, ndjson)
-   `--output` - Output file (default: stdout)

### Building Custom Queries in Code

#### Create a Cost Report Service

```php
namespace App\Services;

use Mindwave\Mindwave\Observability\Models\Trace;
use Mindwave\Mindwave\Observability\Models\Span;
use Carbon\Carbon;

class TraceAnalytics
{
    public function getDailyCostReport(Carbon $date): array
    {
        $traces = Trace::whereDate('created_at', $date)->get();

        return [
            'date' => $date->toDateString(),
            'total_cost' => $traces->sum('estimated_cost'),
            'total_calls' => $traces->count(),
            'total_tokens' => $traces->sum('total_input_tokens') +
                             $traces->sum('total_output_tokens'),
            'by_provider' => $this->groupByProvider($traces),
            'by_model' => $this->groupByModel($traces),
        ];
    }

    private function groupByProvider($traces): array
    {
        return $traces->load('spans')
            ->flatMap->spans
            ->groupBy('provider_name')
            ->map(function ($spans, $provider) {
                return [
                    'provider' => $provider,
                    'calls' => $spans->count(),
                    'tokens' => $spans->sum('input_tokens') +
                               $spans->sum('output_tokens'),
                ];
            })
            ->values()
            ->toArray();
    }

    private function groupByModel($traces): array
    {
        return $traces->load('spans')
            ->flatMap->spans
            ->whereNotNull('request_model')
            ->groupBy('request_model')
            ->map(function ($spans, $model) {
                return [
                    'model' => $model,
                    'calls' => $spans->count(),
                    'tokens' => $spans->sum('input_tokens') +
                               $spans->sum('output_tokens'),
                ];
            })
            ->values()
            ->toArray();
    }

    public function getSlowOperations(int $thresholdMs = 5000): array
    {
        return Span::slow($thresholdMs)
            ->with('trace')
            ->get()
            ->map(function ($span) {
                return [
                    'trace_id' => $span->trace_id,
                    'span_id' => $span->span_id,
                    'name' => $span->name,
                    'model' => $span->request_model,
                    'duration_ms' => $span->getDurationInMilliseconds(),
                    'tokens' => $span->getTotalTokens(),
                    'timestamp' => $span->created_at,
                ];
            })
            ->toArray();
    }

    public function getErrorAnalysis(Carbon $startDate, Carbon $endDate): array
    {
        $total = Trace::whereBetween('created_at', [$startDate, $endDate])->count();
        $errors = Trace::where('status', 'error')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get();

        return [
            'total_traces' => $total,
            'error_count' => $errors->count(),
            'error_rate' => $total > 0 ? ($errors->count() / $total) * 100 : 0,
            'errors_by_model' => $this->groupErrorsByModel($errors),
        ];
    }

    private function groupErrorsByModel($errors): array
    {
        return $errors->load('spans')
            ->flatMap->spans
            ->where('status_code', 'error')
            ->groupBy('request_model')
            ->map(function ($spans, $model) {
                return [
                    'model' => $model,
                    'count' => $spans->count(),
                    'common_errors' => $spans->pluck('status_description')
                        ->countBy()
                        ->sortDesc()
                        ->take(3)
                        ->toArray(),
                ];
            })
            ->values()
            ->toArray();
    }
}
```

#### Use in Controller

```php
namespace App\Http\Controllers;

use App\Services\TraceAnalytics;
use Carbon\Carbon;

class AnalyticsController extends Controller
{
    public function __construct(
        private TraceAnalytics $analytics
    ) {}

    public function dailyReport()
    {
        $report = $this->analytics->getDailyCostReport(Carbon::today());

        return view('analytics.daily', compact('report'));
    }

    public function performance()
    {
        $slowOps = $this->analytics->getSlowOperations(5000);

        return view('analytics.performance', compact('slowOps'));
    }

    public function errors()
    {
        $analysis = $this->analytics->getErrorAnalysis(
            Carbon::now()->subWeek(),
            Carbon::now()
        );

        return view('analytics.errors', compact('analysis'));
    }
}
```

### Exporting to External Systems

#### Export to CSV for Analysis

```php
use Mindwave\Mindwave\Observability\Models\Trace;
use League\Csv\Writer;

$csv = Writer::createFromPath('traces.csv', 'w+');
$csv->insertOne(['trace_id', 'date', 'duration_ms', 'cost', 'tokens', 'model']);

Trace::with('spans')
    ->chunk(100, function ($traces) use ($csv) {
        foreach ($traces as $trace) {
            $rootSpan = $trace->spans->firstWhere('parent_span_id', null);

            $csv->insertOne([
                $trace->trace_id,
                $trace->created_at->toDateString(),
                $trace->getDurationInMilliseconds(),
                $trace->estimated_cost,
                $trace->getTotalTokens(),
                $rootSpan?->request_model ?? 'N/A',
            ]);
        }
    });
```

#### Send to Analytics Platform

```php
use Mindwave\Mindwave\Observability\Events\LlmResponseCompleted;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;

Event::listen(LlmResponseCompleted::class, function ($event) {
    // Send to your analytics platform
    Http::post('https://analytics.example.com/events', [
        'event' => 'llm_call_completed',
        'trace_id' => $event->span->trace_id,
        'model' => $event->span->request_model,
        'tokens' => $event->span->getTotalTokens(),
        'duration_ms' => $event->span->getDurationInMilliseconds(),
        'cost' => $event->calculateCost(), // You'd implement this
        'timestamp' => now(),
    ]);
});
```

---

## Best Practices

### What to Query For

**Regular Monitoring:**

-   Daily cost and token usage
-   Error rates by model
-   P95/P99 latency trends
-   Peak usage times

**Performance Optimization:**

-   Slowest operations by type
-   Models with highest latency variance
-   Context discovery bottlenecks
-   Cache hit rates (if using prompt caching)

**Cost Optimization:**

-   Most expensive models or features
-   Users or features driving costs
-   Opportunities to switch to cheaper models
-   Identify prompt inefficiencies (high token usage)

**Debugging:**

-   Recent errors and failure patterns
-   Specific trace IDs from logs
-   Timeout occurrences
-   Unusual token usage

### Query Performance Optimization

#### Use Indexes

Ensure your database has proper indexes:

```php
// In migration
Schema::table('mindwave_spans', function (Blueprint $table) {
    $table->index(['provider_name', 'request_model']);
    $table->index('created_at');
    $table->index(['status_code', 'created_at']);
});

Schema::table('mindwave_traces', function (Blueprint $table) {
    $table->index(['status', 'created_at']);
    $table->index('estimated_cost');
});
```

#### Use Chunking for Large Datasets

```php
// Good - processes in chunks
Trace::where('created_at', '>=', $date)
    ->chunk(100, function ($traces) {
        foreach ($traces as $trace) {
            // Process each trace
        }
    });

// Bad - loads all into memory
$traces = Trace::where('created_at', '>=', $date)->get();
```

#### Eager Load Relationships

```php
// Good - one query for traces, one for spans
$traces = Trace::with('spans')->get();

// Bad - N+1 query problem
$traces = Trace::all();
foreach ($traces as $trace) {
    $spans = $trace->spans; // Separate query for each trace
}
```

#### Use selectRaw for Aggregations

```php
// Good - database does aggregation
$stats = Span::selectRaw('
    AVG(duration) as avg,
    COUNT(*) as count
')->first();

// Bad - loads all rows, does aggregation in PHP
$spans = Span::all();
$avg = $spans->avg('duration');
```

### Data Retention Considerations

#### Automated Pruning

Use the prune command in a scheduled task:

```php
// app/Console/Kernel.php
protected function schedule(Schedule $schedule)
{
    // Prune traces older than 30 days daily
    $schedule->command('mindwave:prune-traces --days=30')
        ->daily()
        ->at('02:00');
}
```

#### Archive Before Pruning

```bash
# Export traces before pruning
php artisan mindwave:export-traces \
    --since="3 months ago" \
    --until="1 month ago" \
    --format=ndjson \
    --output=archive-$(date +%Y%m).ndjson

# Then prune
php artisan mindwave:prune-traces --days=30
```

#### Selective Retention

Keep important traces longer:

```php
// Custom pruning logic
$cutoffDate = Carbon::now()->subDays(30);

// Delete cheap, successful traces
Trace::where('created_at', '<', $cutoffDate)
    ->where('status', 'ok')
    ->where('estimated_cost', '<', 0.01)
    ->delete();

// Keep expensive or failed traces longer
Trace::where('created_at', '<', Carbon::now()->subDays(90))
    ->where(function ($q) {
        $q->where('estimated_cost', '>=', 0.01)
          ->orWhere('status', 'error');
    })
    ->delete();
```

### Privacy and Security in Queries

#### Redact Sensitive Data

```php
// Don't include message content in exports
$traces = Trace::with(['spans' => function ($query) {
    $query->select([
        'id', 'trace_id', 'span_id', 'name',
        'duration', 'status_code',
        'request_model', 'input_tokens', 'output_tokens'
    ]); // Exclude 'attributes' field with messages
}])->get();
```

#### Role-Based Access

```php
// Only admins can view cost data
if (!auth()->user()->isAdmin()) {
    $traces = Trace::select([
        'trace_id', 'created_at', 'duration', 'status'
    ])->get(); // Exclude estimated_cost
} else {
    $traces = Trace::all();
}
```

#### Audit Query Access

```php
// Log who queries traces
Event::listen('eloquent.retrieved: Mindwave\Mindwave\Observability\Models\Trace', function ($model) {
    if (auth()->check()) {
        Log::info('Trace accessed', [
            'user_id' => auth()->id(),
            'trace_id' => $model->trace_id,
        ]);
    }
});
```

---

## Advanced Techniques

### Correlating Traces with Logs

Add trace context to your Laravel logs:

```php
use Mindwave\Mindwave\Observability\Tracing\TracerManager;
use Illuminate\Support\Facades\Log;

$tracer = app(TracerManager::class);
$span = $tracer->getCurrentSpan();

if ($span) {
    $context = $span->getContext();

    Log::info('Processing user request', [
        'trace_id' => $context->getTraceId(),
        'span_id' => $context->getSpanId(),
        'user_id' => auth()->id(),
    ]);
}
```

Then query logs by trace ID:

```bash
# Find all logs for a trace
grep "trace_id.*abc123" storage/logs/laravel.log
```

Or in your log aggregation platform:

```
trace_id:"abc123"
```

### Trace Sampling Strategies

#### Sample Based on Cost

```php
// In your service provider
use Mindwave\Mindwave\Observability\Events\LlmRequestStarted;

Event::listen(LlmRequestStarted::class, function ($event) {
    // Don't trace cheap models in production
    if (app()->environment('production')) {
        $cheapModels = ['gpt-3.5-turbo', 'claude-3-haiku'];

        if (in_array($event->model, $cheapModels)) {
            // Reduce sampling for cheap models
            config(['mindwave-tracing.sampler.ratio' => 0.1]); // 10%
        }
    }
});
```

#### Sample Based on User

```php
// Always trace for specific users (VIPs, testing)
$vipUsers = [1, 2, 3];

if (in_array(auth()->id(), $vipUsers)) {
    config(['mindwave-tracing.sampler.type' => 'always_on']);
} else {
    config(['mindwave-tracing.sampler.ratio' => 0.1]); // 10% for others
}
```

### Custom Attribute Strategies

Add domain-specific attributes for better querying:

```php
use Mindwave\Mindwave\Observability\Tracing\TracerManager;

$tracer = app(TracerManager::class);
$span = $tracer->getCurrentSpan();

if ($span) {
    $span->setAttribute('app.user_id', auth()->id());
    $span->setAttribute('app.feature', 'chat_bot');
    $span->setAttribute('app.customer_tier', auth()->user()->tier);
    $span->setAttribute('app.session_id', session()->getId());
}
```

Then query by these attributes:

```php
// Find traces for a specific user
$userTraces = Trace::whereJsonContains('metadata->user_id', $userId)->get();

// In Jaeger, search by tag:
// app.user_id=123
// app.feature=chat_bot
// app.customer_tier=premium
```

---

## Summary

Querying traces effectively requires understanding:

1. **Trace Structure** - Spans, attributes, events, and relationships
2. **Query Tools** - Eloquent, Jaeger, Honeycomb, Zipkin
3. **Use Cases** - Performance, cost, debugging, analytics
4. **Best Practices** - Indexing, retention, privacy, sampling

**Key Takeaways:**

-   **Database queries** provide the most flexibility for custom analytics
-   **Jaeger** excels at trace visualization and distributed tracing
-   **Honeycomb** offers powerful aggregations and real-time monitoring
-   **Artisan commands** simplify common operations
-   **Custom attributes** make traces more queryable for your domain

With these tools and techniques, you can gain deep insights into your LLM operations, optimize costs, improve performance, and maintain production quality.

---

**Related Documentation:**

-   [Tracing Overview](/docs/observability/tracing)
-   [Configuration](/docs/observability/configuration)
-   [Backends](/docs/observability/backends)
-   [Cost Estimation](/docs/observability/cost-estimation)

**External Resources:**

-   [OpenTelemetry GenAI Conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
-   [Jaeger Query Documentation](https://www.jaegertracing.io/docs/latest/frontend-ui/)
-   [Honeycomb Query Documentation](https://docs.honeycomb.io/working-with-your-data/queries/)
-   [Zipkin API Documentation](https://zipkin.io/zipkin-api/)
