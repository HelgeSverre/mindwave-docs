# Cost Estimation

Automatically estimate and track LLM costs in real-time with Mindwave's built-in cost estimation. Monitor spending, set budgets, and optimize costs based on actual usage data.

## Overview

LLM costs can quickly add up in production. Mindwave automatically calculates the estimated cost of every LLM operation based on token usage and provider pricing, giving you real-time visibility into spending.

### Why Cost Estimation?

**Without cost tracking:**

-   Surprise billing at month-end
-   No visibility into expensive operations
-   Difficult to attribute costs to features or users
-   Hard to optimize spending

**With Mindwave cost estimation:**

-   Real-time cost tracking for every LLM call
-   Automatic cost calculation based on token usage
-   Cost data stored with traces for analysis
-   Budget alerts and monitoring
-   Data-driven optimization decisions

### How It Works

Mindwave automatically:

1. **Captures token usage** from LLM API responses
2. **Looks up pricing** from configuration based on provider and model
3. **Calculates cost** using the formula: `(input_tokens / 1000) × input_price + (output_tokens / 1000) × output_price`
4. **Stores cost** with the trace in database or OTLP backend
5. **Fires events** with cost data for real-time monitoring

## Quick Start

### Enable Cost Estimation

Cost estimation is enabled by default:

```dotenv
MINDWAVE_COST_ESTIMATION_ENABLED=true
```

### Make an LLM Call

Costs are calculated automatically:

```php
use Mindwave\Mindwave\Facades\Mindwave;

$response = Mindwave::llm()
    ->generateText('What is Laravel?');

// Cost is automatically calculated and stored
```

### Query Costs

Access cost data from traces:

```php
use Mindwave\Mindwave\Observability\Models\Trace;

$cost = Trace::whereDate('created_at', today())
    ->sum('estimated_cost');

echo "Today's spend: \$" . number_format($cost, 2);
```

## Cost Calculation

### Pricing Formula

```
Input Cost  = (Input Tokens / 1000) × Price per 1000 Input Tokens
Output Cost = (Output Tokens / 1000) × Price per 1000 Output Tokens
Total Cost  = Input Cost + Output Cost
```

### Example Calculation

For GPT-4:

```
Pricing (per 1000 tokens):
  Input:  $0.03
  Output: $0.06

Usage:
  Input tokens:  1,500
  Output tokens: 800

Calculation:
  Input cost:  (1,500 / 1000) × $0.03 = $0.045
  Output cost: (800 / 1000) × $0.06   = $0.048
  Total cost:  $0.045 + $0.048        = $0.093
```

### Supported Providers

Mindwave includes pricing for:

-   **OpenAI** - GPT-4, GPT-3.5, embeddings
-   **Anthropic** - Claude 3 (Opus, Sonnet, Haiku)
-   **Mistral AI** - All models
-   **Google** - Gemini Pro
-   **Ollama** - Self-hosted (zero cost)

## Configuration

### Default Pricing

Mindwave ships with current pricing for major providers:

```php
// config/mindwave-tracing.php

'cost_estimation' => [
    'enabled' => true,

    'pricing' => [
        'openai' => [
            'gpt-4' => [
                'input' => 0.03,
                'output' => 0.06,
            ],
            'gpt-3.5-turbo' => [
                'input' => 0.0005,
                'output' => 0.0015,
            ],
        ],

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
    ],
],
```

**Learn more:** [Configuration](/docs/observability/configuration)

### Update Pricing

Providers change pricing occasionally. Update your configuration:

```php
'pricing' => [
    'openai' => [
        'gpt-4' => [
            'input' => 0.03,   // Updated price
            'output' => 0.06,  // Updated price
        ],
    ],
],
```

### Custom Provider Pricing

Add pricing for custom or self-hosted models:

```php
'pricing' => [
    'custom-provider' => [
        'my-model-v1' => [
            'input' => 0.002,
            'output' => 0.004,
        ],
    ],
],
```

### Model Version Handling

Mindwave automatically handles versioned model names:

```php
// API returns: "gpt-4-0613"
// Mindwave looks up: "gpt-4-0613" → not found
// Falls back to: "gpt-4" → found ✓

// API returns: "claude-3-opus-20240229"
// Mindwave looks up: "claude-3-opus-20240229" → not found
// Falls back to: "claude-3-opus" → found ✓
```

You don't need to configure every model version.

## Accessing Cost Data

### From Events

Listen to `LlmResponseCompleted` events:

```php
use Mindwave\Mindwave\Observability\Events\LlmResponseCompleted;
use Illuminate\Support\Facades\Event;

Event::listen(LlmResponseCompleted::class, function ($event) {
    if ($event->hasCostEstimate()) {
        echo "Cost: {$event->getFormattedCost()}\n";
        echo "Tokens: {$event->getTotalTokens()}\n";
    }
});
```

### From Database

Query the `mindwave_traces` table:

```php
use Mindwave\Mindwave\Observability\Models\Trace;

// Get today's cost
$todayCost = Trace::whereDate('created_at', today())
    ->sum('estimated_cost');

// Get expensive traces
$expensive = Trace::where('estimated_cost', '>', 0.10)
    ->orderBy('estimated_cost', 'desc')
    ->get();
```

### Cost Attribution

Track costs by user, feature, or any dimension:

```php
// In your LLM call
$tracer = app(TracerManager::class);
$span = $tracer->getCurrentSpan();

$span?->setAttribute('app.user_id', auth()->id());
$span?->setAttribute('app.feature', 'chat');

// Query costs by user
$userCost = DB::table('mindwave_traces')
    ->whereJsonContains('metadata->user_id', $userId)
    ->sum('estimated_cost');
```

## Cost Monitoring

### Daily Cost Report

```php
use Mindwave\Mindwave\Observability\Models\Trace;
use Carbon\Carbon;

$dailyCosts = Trace::whereDate('created_at', '>=', now()->subDays(30))
    ->selectRaw('DATE(created_at) as date')
    ->selectRaw('SUM(estimated_cost) as cost')
    ->selectRaw('COUNT(*) as calls')
    ->groupBy('date')
    ->orderBy('date')
    ->get();

foreach ($dailyCosts as $day) {
    echo "{$day->date}: \${$day->cost} ({$day->calls} calls)\n";
}
```

### Monthly Budget Tracking

```php
$monthlyBudget = 100.00; // $100/month

$spent = Trace::whereMonth('created_at', now()->month)
    ->sum('estimated_cost');

$percentUsed = ($spent / $monthlyBudget) * 100;

echo "Budget: \${$monthlyBudget}\n";
echo "Spent: \${$spent} ({$percentUsed}%)\n";

if ($percentUsed > 80) {
    echo "WARNING: 80% of budget used!\n";
}
```

### Budget Alerts

Set up real-time alerts:

```php
use Mindwave\Mindwave\Observability\Events\LlmResponseCompleted;

Event::listen(LlmResponseCompleted::class, function ($event) {
    // Alert on expensive single calls
    if ($event->costEstimate > 0.50) {
        Slack::send("Expensive LLM call: \${$event->costEstimate}");
    }

    // Check daily budget
    $dailySpend = Trace::whereDate('created_at', today())
        ->sum('estimated_cost');

    if ($dailySpend > 10.00) {
        Mail::to('admin@example.com')
            ->send(new DailyBudgetExceeded($dailySpend));
    }
});
```

## Cost Optimization

### Identify Expensive Operations

Find operations that consume the most budget:

```php
use Mindwave\Mindwave\Observability\Models\Span;

// Most expensive models
$expensiveModels = Span::selectRaw('request_model')
    ->selectRaw('COUNT(*) as call_count')
    ->selectRaw('SUM(input_tokens + output_tokens) as total_tokens')
    ->whereNotNull('request_model')
    ->groupBy('request_model')
    ->orderByDesc('total_tokens')
    ->get();

foreach ($expensiveModels as $model) {
    echo "{$model->request_model}: {$model->total_tokens} tokens\n";
}
```

### Compare Provider Costs

```php
$providerCosts = Span::selectRaw('provider_name')
    ->selectRaw('COUNT(*) as calls')
    ->selectRaw('SUM(input_tokens + output_tokens) as tokens')
    ->whereNotNull('provider_name')
    ->groupBy('provider_name')
    ->get();

// Calculate estimated costs
foreach ($providerCosts as $provider) {
    echo "{$provider->provider_name}:\n";
    echo "  Calls: {$provider->calls}\n";
    echo "  Tokens: {$provider->tokens}\n\n";
}
```

### Optimize Model Selection

Test cheaper models for comparable quality:

```php
// Test GPT-3.5 vs GPT-4 for your use case
$gpt35Cost = Span::where('request_model', 'like', 'gpt-3.5%')
    ->whereDate('created_at', today())
    ->sum(\DB::raw('input_tokens + output_tokens'));

$gpt4Cost = Span::where('request_model', 'like', 'gpt-4%')
    ->whereDate('created_at', today())
    ->sum(\DB::raw('input_tokens + output_tokens'));

echo "GPT-3.5 tokens: {$gpt35Cost}\n";
echo "GPT-4 tokens: {$gpt4Cost}\n";

// If quality is similar, GPT-3.5 is ~30x cheaper
```

## Best Practices

### 1. Update Pricing Regularly

Providers change pricing. Set a reminder to review quarterly:

```php
// config/mindwave-tracing.php

'cost_estimation' => [
    // Document last update
    'pricing_last_updated' => '2025-01-15',
    'pricing' => [
        // ... pricing data
    ],
],
```

### 2. Validate Against Invoices

Compare estimated costs to actual invoices:

```php
// Get January costs
$estimated = Trace::whereMonth('created_at', 1)
    ->whereYear('created_at', 2025)
    ->sum('estimated_cost');

echo "Estimated: \${$estimated}\n";
echo "Invoice: \$X.XX (from OpenAI)\n";
echo "Difference: " . (($invoice - $estimated) / $invoice * 100) . "%\n";
```

### 3. Set Budget Limits

Implement hard limits to prevent overspending:

```php
class BudgetManager
{
    public function checkBudget(): bool
    {
        $dailyLimit = 10.00;
        $spent = Trace::whereDate('created_at', today())
            ->sum('estimated_cost');

        if ($spent >= $dailyLimit) {
            Cache::put('llm:disabled', true, now()->endOfDay());
            return false;
        }

        return true;
    }
}

// Before making LLM call
if (!app(BudgetManager::class)->checkBudget()) {
    throw new Exception('Daily LLM budget exceeded');
}
```

### 4. Track Costs by Feature

Attribute costs to understand which features are expensive:

```php
// When calling LLM
$tracer = app(TracerManager::class);
$span = $tracer->getCurrentSpan();
$span?->setAttribute('app.feature', 'document-summarization');

// Query feature costs
$featureCosts = DB::table('mindwave_traces')
    ->whereNotNull('metadata->feature')
    ->selectRaw("JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.feature')) as feature")
    ->selectRaw('SUM(estimated_cost) as cost')
    ->groupBy('feature')
    ->get();
```

### 5. Use Caching to Reduce Costs

Cache LLM responses to avoid repeated calls:

```php
use Illuminate\Support\Facades\Cache;

function generateWithCache(string $prompt): string
{
    $key = 'llm:' . md5($prompt);

    return Cache::remember($key, 3600, function () use ($prompt) {
        return Mindwave::llm()->generateText($prompt);
    });
}

// Track cache savings
$cacheHits = Cache::get('llm:cache:hits', 0);
$avgCost = 0.05; // Average cost per call
$savings = $cacheHits * $avgCost;

echo "Cache saved: \${$savings}\n";
```

## Per-User Cost Tracking

Track and bill users based on their LLM usage:

```php
<?php

namespace App\Listeners;

use Mindwave\Mindwave\Observability\Events\LlmResponseCompleted;
use Illuminate\Contracts\Queue\ShouldQueue;

class TrackUserCost implements ShouldQueue
{
    public function handle(LlmResponseCompleted $event): void
    {
        if (!$event->hasCostEstimate()) {
            return;
        }

        $userId = $event->getMetadata('user_id');

        if (!$userId) {
            return;
        }

        // Store cost for billing
        DB::table('user_llm_usage')->insert([
            'user_id' => $userId,
            'cost_usd' => $event->costEstimate,
            'tokens' => $event->getTotalTokens(),
            'model' => $event->model,
            'created_at' => now(),
        ]);

        // Update user balance
        User::find($userId)
            ->decrement('llm_credits', $event->getTotalTokens() / 1000);
    }
}
```

## Cost Dashboards

Build custom cost dashboards:

```php
class CostDashboardController extends Controller
{
    public function index()
    {
        $summary = [
            'today' => Trace::whereDate('created_at', today())
                ->sum('estimated_cost'),

            'this_month' => Trace::whereMonth('created_at', now()->month)
                ->sum('estimated_cost'),

            'this_year' => Trace::whereYear('created_at', now()->year)
                ->sum('estimated_cost'),
        ];

        $daily = Trace::selectRaw('DATE(created_at) as date')
            ->selectRaw('SUM(estimated_cost) as cost')
            ->where('created_at', '>=', now()->subDays(30))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $byModel = Span::selectRaw('request_model')
            ->selectRaw('COUNT(*) as calls')
            ->selectRaw('SUM(input_tokens + output_tokens) as tokens')
            ->whereNotNull('request_model')
            ->groupBy('request_model')
            ->orderByDesc('tokens')
            ->get();

        return view('admin.costs', [
            'summary' => $summary,
            'daily' => $daily,
            'byModel' => $byModel,
        ]);
    }
}
```

## Troubleshooting

### Costs Not Calculated

**Check if cost estimation is enabled:**

```php
php artisan tinker
>>> config('mindwave-tracing.cost_estimation.enabled')
=> true
```

**Verify pricing exists for your model:**

```php
>>> config('mindwave-tracing.cost_estimation.pricing.openai.gpt-4')
=> ["input" => 0.03, "output" => 0.06]
```

### Inaccurate Costs

**Compare to actual invoice:**

```php
$estimated = Trace::whereMonth('created_at', 10)->sum('estimated_cost');
$invoice = 1234.56; // From provider

$diff = abs($invoice - $estimated);
$percentOff = ($diff / $invoice) * 100;

echo "Difference: {$percentOff}%\n";

if ($percentOff > 5) {
    echo "Check if pricing is up to date\n";
}
```

**Update pricing if consistently off:**

Check provider pricing pages:

-   [OpenAI Pricing](https://openai.com/pricing)
-   [Anthropic Pricing](https://anthropic.com/pricing)
-   [Mistral Pricing](https://mistral.ai/pricing)

### Missing Pricing for New Models

Add pricing for newly released models:

```php
'pricing' => [
    'openai' => [
        'gpt-4o' => [  // New model
            'input' => 0.005,
            'output' => 0.015,
        ],
    ],
],
```

## Related Documentation

-   [Cost Tracking](/docs/observability/cost-tracking) - Comprehensive cost tracking guide
-   [Configuration](/docs/observability/configuration) - Full configuration reference
-   [Events](/docs/observability/events) - React to cost events
-   [Production](/docs/production) - Production best practices
