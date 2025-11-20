# Cost Tracking

Learn how to monitor, analyze, and optimize LLM spending in production with Mindwave's built-in cost tracking.

## Overview

LLM costs can quickly add up in production applications. A single high-traffic endpoint making ChatGPT calls can cost hundreds or thousands of dollars per month. Mindwave provides **automatic, real-time cost tracking** to help you:

-   **Monitor spending** as it happens, not days later on your invoice
-   **Attribute costs** by user, feature, endpoint, or any custom dimension
-   **Set budget alerts** to prevent unexpected spending spikes
-   **Optimize prompts** based on actual cost/performance data
-   **Compare providers** with real numbers from your application
-   **Build cost dashboards** using traces stored in your database

### Why Track Costs in Production?

**Traditional approach:**

-   Wait for monthly invoice
-   Guess which features drove costs
-   React to overspending after it happens

**Mindwave approach:**

-   Real-time cost visibility on every LLM call
-   Cost data attached to every trace
-   Proactive alerts and budgets
-   Data-driven optimization decisions

## How Cost Tracking Works

Mindwave automatically calculates costs for every LLM operation using a simple but accurate formula:

### Token Counting

Every LLM provider returns token usage in their API responses:

```php
{
  "usage": {
    "prompt_tokens": 150,      // Input tokens
    "completion_tokens": 300,   // Output tokens
    "total_tokens": 450
  }
}
```

Mindwave captures this data automatically through the `GenAiInstrumentor` and stores it in trace attributes:

-   `gen_ai.usage.input_tokens`
-   `gen_ai.usage.output_tokens`
-   `gen_ai.usage.total_tokens`
-   `gen_ai.usage.cache_read_tokens` (Anthropic Claude)
-   `gen_ai.usage.cache_creation_tokens` (Anthropic Claude)

### Cost Calculation Formula

Cost is calculated using provider pricing tables:

```
Input Cost  = (Input Tokens / 1000) × Price per 1000 Input Tokens
Output Cost = (Output Tokens / 1000) × Price per 1000 Output Tokens
Total Cost  = Input Cost + Output Cost
```

**Example calculation:**

```php
// GPT-4 pricing (as of 2025)
Input:  $0.03 per 1K tokens
Output: $0.06 per 1K tokens

// Your LLM call used:
Input tokens:  1,500
Output tokens: 800

// Cost calculation:
Input cost:  (1,500 / 1000) × $0.03 = $0.045
Output cost: (800 / 1000) × $0.06   = $0.048
Total cost:  $0.045 + $0.048        = $0.093
```

### Integration with Tracing

Costs are automatically attached to spans in the `estimated_cost` field. This means:

1. **Every LLM call** has its cost calculated automatically
2. **Stored in database** for querying and analysis
3. **Aggregated at trace level** for total request cost
4. **Available in real-time** through events and logs
5. **Exported to OTLP backends** for distributed analysis

## Configuration

### Model Pricing Tables

Mindwave ships with pricing for major LLM providers. Update these periodically as providers adjust their pricing:

```php
// config/mindwave-tracing.php

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
            'gpt-3.5-turbo' => [
                'input' => 0.0005,
                'output' => 0.0015,
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
        ],

        // Google Gemini Pricing (per 1000 tokens, USD)
        'google' => [
            'gemini-pro' => [
                'input' => 0.00025,
                'output' => 0.0005,
            ],
        ],
    ],
],
```

### Environment Variables

Enable/disable cost estimation:

```dotenv
# Enable automatic cost calculation (default: true)
MINDWAVE_COST_ESTIMATION_ENABLED=true
```

### Custom Pricing for Self-Hosted Models

If you're using self-hosted or custom models, add their pricing:

```php
// config/mindwave-tracing.php

'pricing' => [
    'custom-provider' => [
        'my-model-v1' => [
            'input' => 0.002,   // $2 per million input tokens
            'output' => 0.004,  // $4 per million output tokens
        ],
    ],

    // For self-hosted models with compute costs
    'ollama' => [
        'llama2' => [
            'input' => 0.0,     // Free inference
            'output' => 0.0,    // But track token usage anyway
        ],
    ],
],
```

### Model Version Handling

Mindwave automatically handles versioned model names:

```php
// API returns: "gpt-4-0613"
// Mindwave looks up: "gpt-4-0613" → not found
// Falls back to: "gpt-4" → found!

// API returns: "claude-3-opus-20240229"
// Mindwave looks up: "claude-3-opus-20240229" → not found
// Falls back to: "claude-3-opus" → found!
```

This means you don't need to configure every model version individually.

## Accessing Cost Data

### From LLM Response Events

Listen to the `LlmResponseCompleted` event to track costs in real-time:

```php
use Mindwave\Mindwave\Observability\Events\LlmResponseCompleted;
use Illuminate\Support\Facades\Event;

Event::listen(LlmResponseCompleted::class, function (LlmResponseCompleted $event) {
    // Check if cost estimate is available
    if ($event->hasCostEstimate()) {
        $cost = $event->costEstimate;  // e.g., 0.0123 (USD)
        $formatted = $event->getFormattedCost();  // e.g., "$0.0123"

        echo "LLM call cost: {$formatted}\n";
        echo "Input tokens: {$event->getInputTokens()}\n";
        echo "Output tokens: {$event->getOutputTokens()}\n";
        echo "Total tokens: {$event->getTotalTokens()}\n";

        // Store in your application
        UserLlmUsage::create([
            'user_id' => auth()->id(),
            'provider' => $event->provider,
            'model' => $event->model,
            'cost_usd' => $event->costEstimate,
            'tokens' => $event->getTotalTokens(),
        ]);
    }
});
```

### From Trace Database

Query costs directly from the `mindwave_traces` table:

```php
use Mindwave\Mindwave\Observability\Models\Trace;
use Mindwave\Mindwave\Observability\Models\Span;

// Get today's total cost
$todayCost = Trace::whereDate('created_at', today())
    ->sum('estimated_cost');

echo "Today's LLM spend: $" . number_format($todayCost, 4);

// Get expensive traces (> $0.10)
$expensiveTraces = Trace::expensive(0.10)
    ->with('spans')
    ->get();

foreach ($expensiveTraces as $trace) {
    echo "Trace: {$trace->trace_id}\n";
    echo "Cost: $" . number_format($trace->estimated_cost, 4) . "\n";
    echo "Duration: {$trace->getDurationInMilliseconds()}ms\n\n";
}
```

### From Individual Spans

Get per-operation cost details:

```php
use Mindwave\Mindwave\Observability\Models\Span;

// Find most expensive LLM operations
$expensiveOps = Span::select('request_model', 'provider_name')
    ->selectRaw('COUNT(*) as call_count')
    ->selectRaw('SUM(input_tokens + output_tokens) as total_tokens')
    ->whereNotNull('request_model')
    ->groupBy('request_model', 'provider_name')
    ->orderByDesc('total_tokens')
    ->get();

foreach ($expensiveOps as $op) {
    // Calculate cost manually from pricing config
    $pricing = config("mindwave-tracing.cost_estimation.pricing.{$op->provider_name}.{$op->request_model}");

    echo "Model: {$op->request_model}\n";
    echo "Calls: {$op->call_count}\n";
    echo "Total tokens: " . number_format($op->total_tokens) . "\n";
}
```

## Cost Attribution

Track costs by any dimension to understand where money is being spent.

### Per-User Cost Tracking

**Multi-tenant SaaS example:**

```php
use Mindwave\Mindwave\Observability\Events\LlmResponseCompleted;

Event::listen(LlmResponseCompleted::class, function (LlmResponseCompleted $event) {
    if (!$event->hasCostEstimate()) {
        return;
    }

    // Store per-user costs in your database
    DB::table('user_llm_costs')->insert([
        'user_id' => auth()->id(),
        'tenant_id' => auth()->user()->tenant_id,
        'cost_usd' => $event->costEstimate,
        'provider' => $event->provider,
        'model' => $event->model,
        'tokens' => $event->getTotalTokens(),
        'trace_id' => $event->traceId,
        'created_at' => now(),
    ]);
});
```

**Query per-user spending:**

```php
// Get top spenders this month
$topSpenders = DB::table('user_llm_costs')
    ->select('user_id')
    ->selectRaw('SUM(cost_usd) as total_cost')
    ->selectRaw('SUM(tokens) as total_tokens')
    ->selectRaw('COUNT(*) as call_count')
    ->whereMonth('created_at', now()->month)
    ->groupBy('user_id')
    ->orderByDesc('total_cost')
    ->limit(10)
    ->get();

foreach ($topSpenders as $spender) {
    $user = User::find($spender->user_id);
    echo "{$user->name}: $" . number_format($spender->total_cost, 2) . "\n";
}
```

### Per-Feature Cost Tracking

Track which features consume the most LLM budget:

```php
use Mindwave\Mindwave\Observability\Tracing\TracerManager;

class DocumentSummarizer
{
    public function summarize(Document $document)
    {
        $tracer = app(TracerManager::class);

        // Tag the trace with feature metadata
        $span = $tracer->getCurrentSpan();
        $span?->setAttribute('feature', 'document-summarization');
        $span?->setAttribute('document_id', $document->id);
        $span?->setAttribute('document_length', strlen($document->content));

        $summary = Mindwave::llm()
            ->generateText("Summarize: {$document->content}");

        return $summary;
    }
}

// Query costs by feature
$featureCosts = DB::table('mindwave_spans')
    ->join('mindwave_traces', 'mindwave_spans.trace_id', '=', 'mindwave_traces.trace_id')
    ->select(DB::raw('JSON_UNQUOTE(JSON_EXTRACT(attributes, "$.feature")) as feature'))
    ->selectRaw('SUM(mindwave_traces.estimated_cost) as total_cost')
    ->selectRaw('COUNT(DISTINCT mindwave_traces.trace_id) as usage_count')
    ->whereNotNull(DB::raw('JSON_EXTRACT(attributes, "$.feature")'))
    ->groupBy('feature')
    ->orderByDesc('total_cost')
    ->get();
```

### Per-Request Cost Tracking

Track costs for individual API requests:

```php
use Illuminate\Http\Request;
use Mindwave\Mindwave\Observability\Tracing\TracerManager;

class ApiController extends Controller
{
    public function generateReport(Request $request)
    {
        $tracer = app(TracerManager::class);

        // Create a root span for this API request
        $span = $tracer->startSpan('api.generate-report', [
            'http.method' => $request->method(),
            'http.route' => $request->route()->getName(),
            'api.version' => 'v1',
            'client.id' => $request->header('X-Client-ID'),
        ]);

        $scope = $span->activate();

        try {
            // Make multiple LLM calls (child spans)
            $analysis = $this->analyzeData($request->data);
            $summary = $this->generateSummary($analysis);
            $recommendations = $this->generateRecommendations($summary);

            $span->markAsOk();

            return response()->json([
                'analysis' => $analysis,
                'summary' => $summary,
                'recommendations' => $recommendations,
                'metadata' => [
                    'trace_id' => $span->getTraceId(),
                ],
            ]);
        } finally {
            $scope->detach();
            $span->end();
        }
    }
}

// Later, query total cost for this request
$trace = Trace::where('trace_id', $traceId)->first();
echo "Request cost: $" . number_format($trace->estimated_cost, 4);
```

### Cost Tagging with Metadata

Add custom metadata to traces for flexible cost analysis:

```php
use Mindwave\Mindwave\Observability\Tracing\TracerManager;

class ChatbotService
{
    public function handleMessage(string $message, User $user)
    {
        $tracer = app(TracerManager::class);
        $span = $tracer->getCurrentSpan();

        // Add rich metadata for cost analysis
        $span?->setAttribute('app.feature', 'chatbot');
        $span?->setAttribute('app.user_tier', $user->subscription_tier);
        $span?->setAttribute('app.conversation_id', $user->current_conversation_id);
        $span?->setAttribute('app.department', $user->department);
        $span?->setAttribute('app.message_length', strlen($message));

        $response = Mindwave::llm()->generateText($message);

        return $response;
    }
}

// Query: Which subscription tier costs the most?
$costByTier = DB::table('mindwave_spans')
    ->join('mindwave_traces', 'mindwave_spans.trace_id', '=', 'mindwave_traces.trace_id')
    ->select(DB::raw('JSON_UNQUOTE(JSON_EXTRACT(attributes, "$.app.user_tier")) as tier'))
    ->selectRaw('SUM(mindwave_traces.estimated_cost) as total_cost')
    ->whereNotNull(DB::raw('JSON_EXTRACT(attributes, "$.app.user_tier")'))
    ->groupBy('tier')
    ->get();
```

## Querying & Analysis

### Using Database Queries

**Daily cost report:**

```php
use Mindwave\Mindwave\Observability\Models\Trace;

$dailyCosts = Trace::selectRaw('DATE(created_at) as date')
    ->selectRaw('SUM(estimated_cost) as daily_cost')
    ->selectRaw('COUNT(*) as call_count')
    ->selectRaw('SUM(total_input_tokens) as input_tokens')
    ->selectRaw('SUM(total_output_tokens) as output_tokens')
    ->whereMonth('created_at', now()->month)
    ->groupBy('date')
    ->orderBy('date')
    ->get();

foreach ($dailyCosts as $day) {
    echo "{$day->date}: $" . number_format($day->daily_cost, 2);
    echo " ({$day->call_count} calls, " . number_format($day->input_tokens + $day->output_tokens) . " tokens)\n";
}
```

**Cost by provider comparison:**

```php
use Mindwave\Mindwave\Observability\Models\Span;

$providerComparison = Span::selectRaw('provider_name')
    ->selectRaw('COUNT(*) as call_count')
    ->selectRaw('SUM(input_tokens + output_tokens) as total_tokens')
    ->selectRaw('AVG(duration) as avg_duration')
    ->whereNotNull('provider_name')
    ->whereDate('created_at', '>=', now()->subDays(7))
    ->groupBy('provider_name')
    ->get();

// Calculate costs from tokens and pricing
foreach ($providerComparison as $provider) {
    echo "\n{$provider->provider_name}:\n";
    echo "  Calls: " . number_format($provider->call_count) . "\n";
    echo "  Tokens: " . number_format($provider->total_tokens) . "\n";
    echo "  Avg Duration: " . round($provider->avg_duration / 1_000_000) . "ms\n";
}
```

**Cost per model with rankings:**

```php
$modelStats = DB::table('mindwave_spans')
    ->join('mindwave_traces', 'mindwave_spans.trace_id', '=', 'mindwave_traces.trace_id')
    ->select('request_model', 'provider_name')
    ->selectRaw('COUNT(*) as usage_count')
    ->selectRaw('AVG(mindwave_traces.estimated_cost) as avg_cost')
    ->selectRaw('SUM(input_tokens + output_tokens) as total_tokens')
    ->whereNotNull('request_model')
    ->groupBy('request_model', 'provider_name')
    ->orderByDesc('usage_count')
    ->get();

echo "\n📊 Model Usage & Cost Report\n";
echo str_repeat('=', 80) . "\n";
printf("%-30s %-10s %10s %15s\n", "Model", "Provider", "Uses", "Avg Cost");
echo str_repeat('-', 80) . "\n";

foreach ($modelStats as $stat) {
    printf(
        "%-30s %-10s %10s $%13s\n",
        $stat->request_model,
        $stat->provider_name,
        number_format($stat->usage_count),
        number_format($stat->avg_cost, 4)
    );
}
```

### Using Artisan Commands

Mindwave includes a built-in command for cost analysis:

```bash
# View comprehensive statistics including costs
php artisan mindwave:trace-stats

# Filter by date range
php artisan mindwave:trace-stats --since=yesterday

# Filter by provider
php artisan mindwave:trace-stats --provider=openai

# Filter by model
php artisan mindwave:trace-stats --model=gpt-4
```

**Example output:**

```
Mindwave Trace Statistics

Overall Statistics
+-----------------------+--------+
| Metric                | Value  |
+-----------------------+--------+
| Total Traces          | 1,234  |
| Total Spans           | 2,456  |
| Completed Traces      | 1,230  |
| Avg Spans per Trace   | 1.99   |
+-----------------------+--------+

Token Usage
+-----------------------+---------------+
| Metric                | Value         |
+-----------------------+---------------+
| Total Input Tokens    | 1,234,567     |
| Total Output Tokens   | 890,123       |
| Total Tokens          | 2,124,690     |
| Avg Input Tokens      | 1,000.46      |
| Avg Output Tokens     | 721.33        |
+-----------------------+---------------+

Cost Analysis
+-----------------------+---------------+
| Metric                | Value         |
+-----------------------+---------------+
| Total Cost            | $45.6789      |
| Average Cost          | $0.0370       |
| Min Cost              | $0.0001       |
| Max Cost              | $2.3456       |
+-----------------------+---------------+
```

### Querying OpenTelemetry Backends

If you're exporting to Jaeger, Honeycomb, or Grafana:

**Jaeger query examples:**

```
# Find traces costing more than $0.50
service=my-app AND gen_ai.operation.name=chat

# Then filter by cost in the UI or programmatically
```

**Honeycomb query examples:**

```
# Group by model and calculate average cost
BREAKDOWN: gen_ai.request.model
CALCULATE: AVG(gen_ai.usage.input_tokens), AVG(gen_ai.usage.output_tokens)

# Find expensive outliers
WHERE gen_ai.usage.total_tokens > P95(gen_ai.usage.total_tokens)
```

**Grafana Tempo query:**

```txt
# Create a panel showing cost over time
{service.name="my-app"}
| gen_ai.operation.name="chat"
```

## Cost Optimization Strategies

Use cost data to make informed optimization decisions.

### 1. Model Selection Based on Cost/Performance

Compare models to find the best value:

```php
use Mindwave\Mindwave\Observability\Models\Span;

// Get performance and cost metrics for each model
$modelComparison = Span::selectRaw('request_model')
    ->selectRaw('COUNT(*) as call_count')
    ->selectRaw('AVG(duration) as avg_duration_ns')
    ->selectRaw('AVG(input_tokens + output_tokens) as avg_tokens')
    ->whereIn('request_model', ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'])
    ->whereDate('created_at', '>=', now()->subDays(7))
    ->groupBy('request_model')
    ->get();

foreach ($modelComparison as $model) {
    $avgDurationMs = $model->avg_duration_ns / 1_000_000;
    $pricing = config("mindwave-tracing.cost_estimation.pricing.openai.{$model->request_model}");

    // Estimate average cost per call
    $avgCost = ($model->avg_tokens / 2 / 1000 * $pricing['input']) +
               ($model->avg_tokens / 2 / 1000 * $pricing['output']);

    echo "\n{$model->request_model}:\n";
    echo "  Calls: {$model->call_count}\n";
    echo "  Avg Duration: " . round($avgDurationMs) . "ms\n";
    echo "  Avg Cost: $" . number_format($avgCost, 4) . "\n";
    echo "  Cost per second: $" . number_format($avgCost / ($avgDurationMs / 1000), 4) . "\n";
}

// Decision: GPT-3.5-turbo might be 90% as good for 10% of the cost
```

### 2. Prompt Engineering for Efficiency

Track how prompt changes affect costs:

```php
class PromptOptimizer
{
    public function testPromptVariants(array $prompts, string $testInput)
    {
        $results = [];

        foreach ($prompts as $name => $prompt) {
            $tracer = app(TracerManager::class);
            $span = $tracer->startSpan("prompt-test-{$name}", [
                'test.prompt_variant' => $name,
                'test.prompt_length' => strlen($prompt),
            ]);

            $startTime = microtime(true);

            $response = Mindwave::llm()
                ->withSystemMessage($prompt)
                ->generateText($testInput);

            $duration = microtime(true) - $startTime;

            $span->end();

            // Get cost from event
            $cost = $this->getLastTraceCost($span->getTraceId());

            $results[$name] = [
                'response' => $response,
                'cost' => $cost,
                'duration' => $duration,
                'prompt_length' => strlen($prompt),
            ];
        }

        return $results;
    }
}

// Usage
$optimizer = new PromptOptimizer();

$results = $optimizer->testPromptVariants([
    'verbose' => 'You are a helpful assistant. Please provide a detailed...',
    'concise' => 'Summarize briefly:',
    'structured' => 'Output format: JSON with keys: summary, key_points',
], $testDocument);

// Compare costs
foreach ($results as $name => $result) {
    echo "{$name}: $" . number_format($result['cost'], 4) . " ({$result['prompt_length']} chars)\n";
}

// Pick the cheapest effective prompt
```

### 3. Using PromptComposer to Reduce Token Usage

Mindwave's `PromptComposer` helps minimize input tokens:

```php
use Mindwave\Mindwave\Prompt\PromptComposer;

// Before: Sending entire document (expensive)
$response = Mindwave::llm()
    ->generateText("Analyze this document: " . $largeDocument);

// After: Using composer to optimize (cheaper)
$prompt = PromptComposer::create()
    ->text('Analyze the following document sections:')
    ->section('Introduction', $introduction)  // Only relevant sections
    ->section('Key Findings', $findings)
    ->maxTokens(2000)  // Respect token limits
    ->build();

$response = Mindwave::llm()
    ->generateText($prompt);

// Track savings
$beforeCost = estimateCost(strlen($largeDocument));
$afterCost = estimateCost(strlen($prompt));
$savings = $beforeCost - $afterCost;

echo "Cost savings: $" . number_format($savings, 4) . " per request\n";
```

### 4. Caching Strategies

Implement response caching to avoid repeated LLM calls:

```php
use Illuminate\Support\Facades\Cache;

class CachedLlmService
{
    public function generateWithCache(string $prompt, int $ttl = 3600)
    {
        $cacheKey = 'llm:' . md5($prompt);

        return Cache::remember($cacheKey, $ttl, function () use ($prompt) {
            // Track cache misses
            app(TracerManager::class)
                ->getCurrentSpan()
                ?->setAttribute('cache.hit', false);

            return Mindwave::llm()->generateText($prompt);
        });
    }
}

// Track cache effectiveness
$cacheHitRate = DB::table('mindwave_spans')
    ->whereNotNull(DB::raw('JSON_EXTRACT(attributes, "$.cache.hit")'))
    ->selectRaw('
        SUM(CASE WHEN JSON_EXTRACT(attributes, "$.cache.hit") = true THEN 1 ELSE 0 END) as hits,
        COUNT(*) as total
    ')
    ->first();

$hitRate = ($cacheHitRate->hits / $cacheHitRate->total) * 100;
echo "Cache hit rate: " . round($hitRate, 1) . "%\n";

// Calculate cost savings from caching
$avgCostPerCall = 0.05;  // From your data
$savedCalls = $cacheHitRate->hits;
$savings = $savedCalls * $avgCostPerCall;
echo "Cost saved by caching: $" . number_format($savings, 2) . "\n";
```

### 5. Batch Processing for Efficiency

Process multiple items in batches to reduce overhead:

```php
class BatchProcessor
{
    public function processBatch(array $items)
    {
        $tracer = app(TracerManager::class);
        $span = $tracer->startSpan('batch-process', [
            'batch.size' => count($items),
        ]);

        // Combine items into single LLM call
        $combinedPrompt = "Process these items:\n\n";
        foreach ($items as $i => $item) {
            $combinedPrompt .= ($i + 1) . ". {$item}\n";
        }
        $combinedPrompt .= "\nReturn results as numbered list.";

        $response = Mindwave::llm()->generateText($combinedPrompt);

        $span->end();

        // Compare costs
        $batchCost = $this->getTraceCost($span->getTraceId());
        $individualCost = $this->estimateIndividualCost(count($items));
        $savings = $individualCost - $batchCost;

        echo "Batch cost: $" . number_format($batchCost, 4) . "\n";
        echo "Individual cost would be: $" . number_format($individualCost, 4) . "\n";
        echo "Savings: $" . number_format($savings, 4) . " (" . round($savings/$individualCost*100) . "%)\n";

        return $this->parseResults($response);
    }
}
```

## Real-World Examples

### Multi-Tenant SaaS Cost Tracking

Complete example for tracking costs per tenant:

```php
<?php

namespace App\Services;

use App\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Mindwave\Mindwave\Observability\Events\LlmResponseCompleted;

class TenantCostTracker
{
    public function __construct()
    {
        // Listen to all LLM completions
        Event::listen(LlmResponseCompleted::class, [$this, 'recordCost']);
    }

    public function recordCost(LlmResponseCompleted $event)
    {
        if (!$event->hasCostEstimate() || !auth()->check()) {
            return;
        }

        $tenant = auth()->user()->tenant;

        // Record in tenant costs table
        DB::table('tenant_llm_costs')->insert([
            'tenant_id' => $tenant->id,
            'user_id' => auth()->id(),
            'trace_id' => $event->traceId,
            'span_id' => $event->spanId,
            'provider' => $event->provider,
            'model' => $event->model,
            'cost_usd' => $event->costEstimate,
            'input_tokens' => $event->getInputTokens(),
            'output_tokens' => $event->getOutputTokens(),
            'duration_ms' => $event->getDurationInMilliseconds(),
            'created_at' => now(),
        ]);

        // Update tenant running total
        $tenant->increment('llm_cost_total', $event->costEstimate);

        // Check budget limits
        $this->checkBudgetLimit($tenant, $event->costEstimate);
    }

    protected function checkBudgetLimit(Tenant $tenant, float $cost)
    {
        $monthlySpend = $this->getMonthlySpend($tenant->id);
        $budget = $tenant->llm_monthly_budget ?? 100.00;

        if ($monthlySpend >= $budget) {
            // Disable LLM features for this tenant
            $tenant->update(['llm_enabled' => false]);

            // Notify tenant admin
            $tenant->owner->notify(new BudgetExceededNotification($monthlySpend, $budget));

            \Log::warning("Tenant {$tenant->id} exceeded LLM budget", [
                'tenant_id' => $tenant->id,
                'monthly_spend' => $monthlySpend,
                'budget' => $budget,
            ]);
        } elseif ($monthlySpend >= $budget * 0.8) {
            // Warning at 80%
            $tenant->owner->notify(new BudgetWarningNotification($monthlySpend, $budget));
        }
    }

    public function getMonthlySpend(int $tenantId): float
    {
        return DB::table('tenant_llm_costs')
            ->where('tenant_id', $tenantId)
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->sum('cost_usd');
    }

    public function getTenantReport(int $tenantId, int $days = 30): array
    {
        $costs = DB::table('tenant_llm_costs')
            ->where('tenant_id', $tenantId)
            ->where('created_at', '>=', now()->subDays($days))
            ->selectRaw('
                DATE(created_at) as date,
                provider,
                model,
                SUM(cost_usd) as daily_cost,
                SUM(input_tokens + output_tokens) as daily_tokens,
                COUNT(*) as call_count
            ')
            ->groupBy('date', 'provider', 'model')
            ->orderBy('date')
            ->get();

        return [
            'total_cost' => $costs->sum('daily_cost'),
            'total_calls' => $costs->sum('call_count'),
            'total_tokens' => $costs->sum('daily_tokens'),
            'breakdown' => $costs,
        ];
    }
}
```

**Tenant dashboard controller:**

```php
class TenantDashboardController extends Controller
{
    public function llmCosts(TenantCostTracker $tracker)
    {
        $tenantId = auth()->user()->tenant_id;

        // Get 30-day report
        $report = $tracker->getTenantReport($tenantId, 30);

        return view('tenant.llm-costs', [
            'totalCost' => $report['total_cost'],
            'totalCalls' => $report['total_calls'],
            'totalTokens' => $report['total_tokens'],
            'dailyBreakdown' => $report['breakdown'],
            'monthlyBudget' => auth()->user()->tenant->llm_monthly_budget,
            'percentUsed' => ($report['total_cost'] / auth()->user()->tenant->llm_monthly_budget) * 100,
        ]);
    }
}
```

### Feature-Level Cost Allocation

Track costs by application feature:

```php
<?php

namespace App\Services;

use Mindwave\Mindwave\Observability\Tracing\TracerManager;

class FeatureCostAllocator
{
    protected array $features = [
        'document-summarization',
        'chatbot',
        'content-generation',
        'sentiment-analysis',
        'translation',
    ];

    public function trackFeature(string $feature, callable $callback)
    {
        if (!in_array($feature, $this->features)) {
            throw new \InvalidArgumentException("Unknown feature: {$feature}");
        }

        $tracer = app(TracerManager::class);
        $span = $tracer->startSpan("feature.{$feature}", [
            'app.feature' => $feature,
            'app.version' => config('app.version'),
        ]);

        $scope = $span->activate();

        try {
            $result = $callback();
            $span->markAsOk();
            return $result;
        } finally {
            $scope->detach();
            $span->end();
        }
    }

    public function getFeatureCosts(int $days = 30): array
    {
        $costs = DB::table('mindwave_spans')
            ->join('mindwave_traces', 'mindwave_spans.trace_id', '=', 'mindwave_traces.trace_id')
            ->select(DB::raw('JSON_UNQUOTE(JSON_EXTRACT(mindwave_spans.attributes, "$.app.feature")) as feature'))
            ->selectRaw('SUM(mindwave_traces.estimated_cost) as total_cost')
            ->selectRaw('COUNT(DISTINCT mindwave_traces.trace_id) as usage_count')
            ->selectRaw('AVG(mindwave_traces.estimated_cost) as avg_cost')
            ->where('mindwave_spans.created_at', '>=', now()->subDays($days))
            ->whereNotNull(DB::raw('JSON_EXTRACT(mindwave_spans.attributes, "$.app.feature")'))
            ->groupBy('feature')
            ->orderByDesc('total_cost')
            ->get();

        return $costs->mapWithKeys(fn($cost) => [
            $cost->feature => [
                'total' => $cost->total_cost,
                'count' => $cost->usage_count,
                'average' => $cost->avg_cost,
            ]
        ])->toArray();
    }
}

// Usage
$allocator = new FeatureCostAllocator();

// In your application code
$allocator->trackFeature('document-summarization', function () use ($document) {
    return Mindwave::llm()->generateText("Summarize: {$document->content}");
});

// Generate cost report
$featureCosts = $allocator->getFeatureCosts(30);

foreach ($featureCosts as $feature => $stats) {
    echo "\n{$feature}:\n";
    echo "  Total cost: $" . number_format($stats['total'], 2) . "\n";
    echo "  Usage: {$stats['count']} times\n";
    echo "  Avg cost: $" . number_format($stats['average'], 4) . "\n";
}
```

### Budget Alerts and Limits

Implement proactive budget management:

```php
<?php

namespace App\Services;

use App\Notifications\DailyBudgetExceeded;
use App\Notifications\WeeklyBudgetWarning;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Mindwave\Mindwave\Observability\Events\LlmResponseCompleted;

class BudgetManager
{
    protected array $limits = [
        'daily' => 10.00,    // $10/day
        'weekly' => 50.00,   // $50/week
        'monthly' => 200.00, // $200/month
    ];

    public function checkBudget(LlmResponseCompleted $event)
    {
        if (!$event->hasCostEstimate()) {
            return;
        }

        $this->checkDailyBudget($event->costEstimate);
        $this->checkWeeklyBudget($event->costEstimate);
        $this->checkMonthlyBudget($event->costEstimate);
    }

    protected function checkDailyBudget(float $cost)
    {
        $key = 'llm:budget:daily:' . now()->format('Y-m-d');
        $spent = Cache::get($key, 0.0);
        $newTotal = $spent + $cost;

        Cache::put($key, $newTotal, now()->endOfDay());

        if ($newTotal >= $this->limits['daily'] && $spent < $this->limits['daily']) {
            // Just exceeded daily limit
            Notification::route('slack', config('services.slack.webhook'))
                ->notify(new DailyBudgetExceeded($newTotal, $this->limits['daily']));

            \Log::warning('Daily LLM budget exceeded', [
                'spent' => $newTotal,
                'limit' => $this->limits['daily'],
            ]);
        }
    }

    protected function checkWeeklyBudget(float $cost)
    {
        $key = 'llm:budget:weekly:' . now()->format('Y-W');
        $spent = Cache::get($key, 0.0);
        $newTotal = $spent + $cost;

        Cache::put($key, $newTotal, now()->endOfWeek());

        // Warning at 80% of weekly budget
        $warningThreshold = $this->limits['weekly'] * 0.8;

        if ($newTotal >= $warningThreshold && $spent < $warningThreshold) {
            Notification::route('slack', config('services.slack.webhook'))
                ->notify(new WeeklyBudgetWarning($newTotal, $this->limits['weekly']));
        }
    }

    protected function checkMonthlyBudget(float $cost)
    {
        // Query actual database for accurate monthly total
        $monthlySpent = DB::table('mindwave_traces')
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->sum('estimated_cost');

        if ($monthlySpent >= $this->limits['monthly']) {
            // Emergency: Disable LLM features
            Cache::put('llm:disabled', true, now()->endOfMonth());

            \Log::critical('Monthly LLM budget exceeded - LLM features disabled', [
                'spent' => $monthlySpent,
                'limit' => $this->limits['monthly'],
            ]);

            // Send alert to admin
            app(\App\Models\User::class)
                ->where('role', 'admin')
                ->first()
                ->notify(new MonthlyBudgetExceeded($monthlySpent, $this->limits['monthly']));
        }
    }

    public function isLlmEnabled(): bool
    {
        return !Cache::get('llm:disabled', false);
    }

    public function getCurrentSpend(): array
    {
        return [
            'daily' => Cache::get('llm:budget:daily:' . now()->format('Y-m-d'), 0.0),
            'weekly' => Cache::get('llm:budget:weekly:' . now()->format('Y-W'), 0.0),
            'monthly' => DB::table('mindwave_traces')
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->sum('estimated_cost'),
        ];
    }
}

// Register in EventServiceProvider
Event::listen(LlmResponseCompleted::class, [BudgetManager::class, 'checkBudget']);
```

### Cost Reporting Dashboard

Build a comprehensive cost dashboard:

```php
<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Mindwave\Mindwave\Observability\Models\Trace;

class LlmCostDashboardController extends Controller
{
    public function index()
    {
        return view('admin.llm-costs', [
            'summary' => $this->getSummary(),
            'dailyTrend' => $this->getDailyTrend(),
            'modelBreakdown' => $this->getModelBreakdown(),
            'providerComparison' => $this->getProviderComparison(),
            'topExpensiveTraces' => $this->getTopExpensiveTraces(),
            'projections' => $this->getProjections(),
        ]);
    }

    protected function getSummary(): array
    {
        $today = Trace::whereDate('created_at', today())->sum('estimated_cost');
        $yesterday = Trace::whereDate('created_at', today()->subDay())->sum('estimated_cost');
        $thisMonth = Trace::whereMonth('created_at', now()->month)->sum('estimated_cost');
        $lastMonth = Trace::whereMonth('created_at', now()->subMonth()->month)->sum('estimated_cost');

        return [
            'today' => $today,
            'yesterday' => $yesterday,
            'change_daily' => $yesterday > 0 ? (($today - $yesterday) / $yesterday) * 100 : 0,
            'this_month' => $thisMonth,
            'last_month' => $lastMonth,
            'change_monthly' => $lastMonth > 0 ? (($thisMonth - $lastMonth) / $lastMonth) * 100 : 0,
        ];
    }

    protected function getDailyTrend(): array
    {
        return Trace::selectRaw('DATE(created_at) as date')
            ->selectRaw('SUM(estimated_cost) as cost')
            ->selectRaw('COUNT(*) as calls')
            ->where('created_at', '>=', now()->subDays(30))
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->toArray();
    }

    protected function getModelBreakdown(): array
    {
        return DB::table('mindwave_spans')
            ->join('mindwave_traces', 'mindwave_spans.trace_id', '=', 'mindwave_traces.trace_id')
            ->select('request_model', 'provider_name')
            ->selectRaw('COUNT(*) as call_count')
            ->selectRaw('SUM(mindwave_traces.estimated_cost) as total_cost')
            ->selectRaw('AVG(mindwave_traces.estimated_cost) as avg_cost')
            ->whereNotNull('request_model')
            ->where('mindwave_traces.created_at', '>=', now()->subDays(30))
            ->groupBy('request_model', 'provider_name')
            ->orderByDesc('total_cost')
            ->get()
            ->toArray();
    }

    protected function getProviderComparison(): array
    {
        return DB::table('mindwave_spans')
            ->join('mindwave_traces', 'mindwave_spans.trace_id', '=', 'mindwave_traces.trace_id')
            ->select('provider_name')
            ->selectRaw('COUNT(*) as call_count')
            ->selectRaw('SUM(mindwave_traces.estimated_cost) as total_cost')
            ->selectRaw('AVG(mindwave_traces.estimated_cost) as avg_cost')
            ->selectRaw('SUM(input_tokens + output_tokens) as total_tokens')
            ->whereNotNull('provider_name')
            ->where('mindwave_traces.created_at', '>=', now()->subDays(30))
            ->groupBy('provider_name')
            ->get()
            ->toArray();
    }

    protected function getTopExpensiveTraces(): array
    {
        return Trace::orderByDesc('estimated_cost')
            ->where('created_at', '>=', now()->subDays(7))
            ->limit(10)
            ->get()
            ->map(fn($trace) => [
                'trace_id' => $trace->trace_id,
                'cost' => $trace->estimated_cost,
                'duration_ms' => $trace->getDurationInMilliseconds(),
                'total_tokens' => $trace->getTotalTokens(),
                'created_at' => $trace->created_at,
            ])
            ->toArray();
    }

    protected function getProjections(): array
    {
        $dailyAvg = Trace::where('created_at', '>=', now()->subDays(7))
            ->selectRaw('AVG(daily_cost) as avg')
            ->fromSub(function ($query) {
                $query->selectRaw('DATE(created_at) as date, SUM(estimated_cost) as daily_cost')
                    ->from('mindwave_traces')
                    ->groupBy('date');
            }, 'daily_costs')
            ->value('avg');

        $daysLeftInMonth = now()->endOfMonth()->diffInDays(now());

        return [
            'daily_average' => $dailyAvg,
            'projected_month_end' => ($dailyAvg * $daysLeftInMonth) +
                Trace::whereMonth('created_at', now()->month)->sum('estimated_cost'),
        ];
    }
}
```

## Best Practices

### When to Track Costs

**Always track in production:**

-   Budget management is critical
-   Cost trends inform optimization
-   Real usage patterns drive decisions

**Optional in development:**

-   Useful for testing cost impact
-   But can use free models (Ollama)

### Granularity Considerations

**Too granular:**

```php
// Don't track every token separately
foreach ($tokens as $token) {
    recordCost($token);  // Too much overhead
}
```

**Just right:**

```php
// Track at request/operation level
$response = Mindwave::llm()->generateText($prompt);
// Cost automatically tracked per call
```

**Too coarse:**

```php
// Monthly invoice doesn't help daily optimization
// Use Mindwave's per-call tracking instead
```

### Storage and Retention

Configure data retention based on needs:

```php
// config/mindwave-tracing.php

'retention_days' => env('MINDWAVE_TRACE_RETENTION_DAYS', 30),
```

**Recommendations:**

-   **7 days**: Minimum for debugging and optimization
-   **30 days**: Good balance for monthly analysis
-   **90 days**: Quarterly trends and year-over-year comparison
-   **365+ days**: Long-term analytics (consider archiving)

**Prune old data regularly:**

```bash
# Schedule in app/Console/Kernel.php
$schedule->command('mindwave:prune-traces --days=30')->daily();
```

### Privacy Considerations

**Cost data is NOT sensitive:**

-   Token counts: Safe to store
-   Model names: Safe to store
-   Estimated costs: Safe to store
-   Timestamps: Safe to store

**But prompts/responses ARE sensitive:**

-   Disable by default: `capture_messages => false`
-   Only enable in development
-   Never log user input/output in production

**Aggregate reporting is safe:**

-   "Total spend today: $45.67" ✓
-   "GPT-4 cost $23.00 across 100 calls" ✓
-   "User X asked about..." ✗ (too specific)

## Troubleshooting

### Inaccurate Cost Calculations

**Problem:** Costs don't match provider invoices

**Causes:**

1. Outdated pricing in config
2. Special pricing agreements
3. Token counting differences
4. Model version mismatches

**Solutions:**

```php
// 1. Update pricing regularly
// Check OpenAI pricing: https://openai.com/pricing
// Check Anthropic pricing: https://anthropic.com/pricing

'pricing' => [
    'openai' => [
        'gpt-4' => [
            'input' => 0.03,   // Update these
            'output' => 0.06,  // from provider
        ],
    ],
],

// 2. Add special pricing for your account
'pricing' => [
    'openai' => [
        'gpt-4-custom' => [
            'input' => 0.025,   // Your negotiated rate
            'output' => 0.05,
        ],
    ],
],

// 3. Compare actual invoice to tracked costs
$trackedCost = Trace::whereMonth('created_at', 10)
    ->whereYear('created_at', 2024)
    ->sum('estimated_cost');

$actualInvoice = 1234.56;  // From OpenAI invoice
$difference = $actualInvoice - $trackedCost;
$percentOff = ($difference / $actualInvoice) * 100;

echo "Tracked: $" . number_format($trackedCost, 2) . "\n";
echo "Invoice: $" . number_format($actualInvoice, 2) . "\n";
echo "Difference: " . round($percentOff, 1) . "%\n";

// Adjust pricing if consistently off
```

### Missing Pricing Data

**Problem:** Some models show $0.00 cost

**Cause:** Model not in pricing config

**Solution:**

```php
// Add missing model pricing
'pricing' => [
    'openai' => [
        // Add new models as they're released
        'gpt-4o' => [
            'input' => 0.005,
            'output' => 0.015,
        ],
    ],
],

// Or check logs for unpriced models
php artisan mindwave:trace-stats --provider=openai
```

### Cost Drift Over Time

**Problem:** Costs gradually differ from invoices

**Cause:** Provider pricing changes

**Best Practice:**

```php
// Set reminder to review pricing quarterly
// config/mindwave-tracing.php

'cost_estimation' => [
    'enabled' => true,

    // Document last update date
    'pricing_last_updated' => '2025-01-15',

    'pricing' => [
        // ... pricing data
    ],
],
```

**Create monitoring:**

```php
// Check for significant cost discrepancies
$monthlyTracked = Trace::whereMonth('created_at', now()->month)
    ->sum('estimated_cost');

if ($monthlyTracked > 1000) {  // Only for significant volumes
    \Log::info('Monthly LLM cost checkpoint', [
        'tracked_cost' => $monthlyTracked,
        'note' => 'Compare to invoice at month end',
    ]);
}
```

## Summary

Mindwave's cost tracking provides:

-   ✅ **Automatic calculation** on every LLM call
-   ✅ **Real-time visibility** through events
-   ✅ **Database storage** for flexible querying
-   ✅ **Multi-dimensional attribution** (user, feature, model)
-   ✅ **Budget management** with alerts
-   ✅ **Optimization insights** from actual data
-   ✅ **Production-ready** architecture

**Key takeaways:**

1. Costs are tracked automatically - no extra code needed
2. Use events for real-time monitoring and alerts
3. Query database for historical analysis and dashboards
4. Implement per-user/per-tenant budgets for SaaS
5. Update pricing config quarterly as providers change rates
6. Use cost data to inform model selection and prompt optimization

**Next steps:**

-   [Distributed Tracing](./tracing) - Track costs across services
-   [Production](../production) - Best practices for production cost tracking
