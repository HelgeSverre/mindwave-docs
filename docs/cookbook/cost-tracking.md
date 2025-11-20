# Cost-Aware Application

Build a production-ready SaaS application with comprehensive LLM cost tracking, per-user budgets, alerts, and analytics dashboards.

## What We're Building

A complete cost management system for a multi-tenant SaaS application that uses LLMs. This cookbook demonstrates real-world patterns for:

-   **Per-user budget management** - Set and enforce spending limits
-   **Real-time cost tracking** - Monitor spending as it happens
-   **Proactive alerts** - Notify users before limits are reached
-   **Analytics dashboards** - Visualize usage and optimize costs
-   **Budget enforcement** - Automatically block requests when budgets are exceeded
-   **Cost attribution** - Track spending by user, feature, or any dimension

Perfect for SaaS applications, API platforms, or any service where you need to control and monitor LLM costs.

## Prerequisites

-   Laravel 10+ with Mindwave installed
-   Basic understanding of [Cost Tracking](/docs/observability/cost-tracking)
-   Database configured (MySQL, PostgreSQL, or SQLite)
-   Familiarity with Laravel events and middleware

## What You'll Learn

-   Design a cost-aware application architecture
-   Implement budget management services
-   Create cost tracking middleware
-   Build analytics dashboards
-   Set up proactive alerts
-   Handle budget enforcement gracefully
-   Optimize for cost efficiency

## Architecture Overview

### Cost Tracking Flow

```
┌─────────────┐
│ User Request│
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Budget Middleware   │──── Check budget ────► Block if exceeded
└──────┬──────────────┘
       │ ✓ Within budget
       ▼
┌─────────────────────┐
│ LLM Call (Mindwave) │──── Automatic tracing
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ LLmResponseCompleted│──── Event fired with cost
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Budget Service      │──── Record usage
└──────┬──────────────┘      Update totals
       │                     Check thresholds
       ▼
┌─────────────────────┐
│ Alert if needed     │──── Email/Slack notifications
└─────────────────────┘
```

### Database Schema

```
users
├── id
├── name
├── email
└── llm_enabled

user_budgets
├── id
├── user_id
├── monthly_limit (decimal)
├── alert_threshold (decimal 0-1)
└── created_at

user_llm_usage
├── id
├── user_id
├── trace_id
├── cost_usd (decimal)
├── tokens (integer)
├── provider
├── model
├── feature (nullable)
└── created_at

mindwave_traces (built-in)
└── estimated_cost
```

## Step 1: Database Setup

Create migrations for user budgets and usage tracking.

### Migration: User Budgets

```bash
php artisan make:migration create_user_budgets_table
```

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('user_budgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->decimal('monthly_limit', 10, 4)->default(10.00); // $10/month default
            $table->decimal('alert_threshold', 3, 2)->default(0.80); // Alert at 80%
            $table->boolean('enabled')->default(true);
            $table->timestamps();

            $table->unique('user_id');
            $table->index('enabled');
        });
    }

    public function down()
    {
        Schema::dropIfExists('user_budgets');
    }
};
```

### Migration: User LLM Usage

```bash
php artisan make:migration create_user_llm_usage_table
```

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('user_llm_usage', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('trace_id', 32)->nullable();
            $table->decimal('cost_usd', 10, 6);
            $table->integer('tokens')->unsigned();
            $table->string('provider', 50);
            $table->string('model', 100);
            $table->string('feature', 100)->nullable();
            $table->timestamp('created_at');

            // Indexes for fast queries
            $table->index('user_id');
            $table->index(['user_id', 'created_at']);
            $table->index('feature');
            $table->index('trace_id');
        });
    }

    public function down()
    {
        Schema::dropIfExists('user_llm_usage');
    }
};
```

Run migrations:

```bash
php artisan migrate
```

### Eloquent Models

**app/Models/UserBudget.php:**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserBudget extends Model
{
    protected $fillable = [
        'user_id',
        'monthly_limit',
        'alert_threshold',
        'enabled',
    ];

    protected $casts = [
        'monthly_limit' => 'decimal:4',
        'alert_threshold' => 'decimal:2',
        'enabled' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the alert threshold in dollars
     */
    public function getAlertAmountAttribute(): float
    {
        return $this->monthly_limit * $this->alert_threshold;
    }
}
```

**app/Models/UserLlmUsage.php:**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserLlmUsage extends Model
{
    public $timestamps = false;

    protected $table = 'user_llm_usage';

    protected $fillable = [
        'user_id',
        'trace_id',
        'cost_usd',
        'tokens',
        'provider',
        'model',
        'feature',
        'created_at',
    ];

    protected $casts = [
        'cost_usd' => 'decimal:6',
        'tokens' => 'integer',
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope to current month
     */
    public function scopeCurrentMonth($query)
    {
        return $query->whereMonth('created_at', now()->month)
                    ->whereYear('created_at', now()->year);
    }

    /**
     * Scope to date range
     */
    public function scopeDateRange($query, $start, $end)
    {
        return $query->whereBetween('created_at', [$start, $end]);
    }
}
```

**Update User Model (app/Models/User.php):**

```php
<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable
{
    // ... existing code ...

    public function budget(): HasOne
    {
        return $this->hasOne(UserBudget::class);
    }

    public function llmUsage(): HasMany
    {
        return $this->hasMany(UserLlmUsage::class);
    }

    /**
     * Get monthly LLM spending
     */
    public function getMonthlyLlmSpending(): float
    {
        return (float) $this->llmUsage()
            ->currentMonth()
            ->sum('cost_usd');
    }

    /**
     * Check if user has exceeded budget
     */
    public function hasExceededBudget(): bool
    {
        if (!$this->budget || !$this->budget->enabled) {
            return false;
        }

        return $this->getMonthlyLlmSpending() >= $this->budget->monthly_limit;
    }

    /**
     * Get remaining budget for the month
     */
    public function getRemainingBudget(): float
    {
        if (!$this->budget) {
            return 0.0;
        }

        $spent = $this->getMonthlyLlmSpending();
        $remaining = $this->budget->monthly_limit - $spent;

        return max(0, $remaining);
    }
}
```

## Step 2: Budget Management Service

Create a centralized service for managing budgets and tracking usage.

**app/Services/BudgetManager.php:**

```php
<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserBudget;
use App\Models\UserLlmUsage;
use App\Notifications\BudgetExceeded;
use App\Notifications\BudgetThresholdReached;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Mindwave\Mindwave\Observability\Events\LlmResponseCompleted;

class BudgetManager
{
    /**
     * Check if user can make an LLM request
     */
    public function canMakeRequest(User $user): bool
    {
        // No budget set = unlimited access
        if (!$user->budget || !$user->budget->enabled) {
            return true;
        }

        // Check cached budget status first
        $cacheKey = "user:{$user->id}:budget_exceeded";

        if (Cache::has($cacheKey)) {
            return !Cache::get($cacheKey);
        }

        // Calculate current month spending
        $spent = $user->getMonthlyLlmSpending();
        $exceeded = $spent >= $user->budget->monthly_limit;

        // Cache the result for 5 minutes
        Cache::put($cacheKey, $exceeded, now()->addMinutes(5));

        return !$exceeded;
    }

    /**
     * Record LLM usage from event
     */
    public function recordUsage(LlmResponseCompleted $event, User $user, ?string $feature = null): void
    {
        if (!$event->hasCostEstimate()) {
            Log::warning('LLM response has no cost estimate', [
                'trace_id' => $event->traceId,
                'user_id' => $user->id,
            ]);
            return;
        }

        // Record the usage
        $usage = UserLlmUsage::create([
            'user_id' => $user->id,
            'trace_id' => $event->traceId,
            'cost_usd' => $event->costEstimate,
            'tokens' => $event->getTotalTokens(),
            'provider' => $event->provider,
            'model' => $event->model,
            'feature' => $feature,
            'created_at' => now(),
        ]);

        // Clear budget cache
        Cache::forget("user:{$user->id}:budget_exceeded");

        // Check thresholds and send alerts
        $this->checkThresholds($user, $event->costEstimate);
    }

    /**
     * Check budget thresholds and send alerts
     */
    protected function checkThresholds(User $user, float $newCost): void
    {
        if (!$user->budget || !$user->budget->enabled) {
            return;
        }

        $monthlySpent = $user->getMonthlyLlmSpending();
        $budget = $user->budget->monthly_limit;
        $threshold = $user->budget->alert_amount;

        // Budget exceeded
        if ($monthlySpent >= $budget) {
            $this->handleBudgetExceeded($user, $monthlySpent, $budget);
            return;
        }

        // Alert threshold reached
        if ($monthlySpent >= $threshold) {
            $this->handleThresholdReached($user, $monthlySpent, $budget, $threshold);
        }
    }

    /**
     * Handle budget exceeded
     */
    protected function handleBudgetExceeded(User $user, float $spent, float $budget): void
    {
        $cacheKey = "user:{$user->id}:budget_exceeded_notified";

        // Only send notification once per month
        if (Cache::has($cacheKey)) {
            return;
        }

        $user->notify(new BudgetExceeded($spent, $budget));

        Cache::put($cacheKey, true, now()->endOfMonth());

        Log::warning('User exceeded LLM budget', [
            'user_id' => $user->id,
            'spent' => $spent,
            'budget' => $budget,
        ]);
    }

    /**
     * Handle threshold reached
     */
    protected function handleThresholdReached(User $user, float $spent, float $budget, float $threshold): void
    {
        $cacheKey = "user:{$user->id}:threshold_notified";

        // Only send notification once per month
        if (Cache::has($cacheKey)) {
            return;
        }

        $percentUsed = ($spent / $budget) * 100;

        $user->notify(new BudgetThresholdReached($spent, $budget, $percentUsed));

        Cache::put($cacheKey, true, now()->endOfMonth());

        Log::info('User reached LLM budget threshold', [
            'user_id' => $user->id,
            'spent' => $spent,
            'budget' => $budget,
            'threshold' => $threshold,
            'percent_used' => $percentUsed,
        ]);
    }

    /**
     * Get user's budget status
     */
    public function getBudgetStatus(User $user): array
    {
        $budget = $user->budget;

        if (!$budget) {
            return [
                'has_budget' => false,
                'limit' => 0,
                'spent' => 0,
                'remaining' => 0,
                'percent_used' => 0,
                'can_make_request' => true,
            ];
        }

        $spent = $user->getMonthlyLlmSpending();
        $remaining = max(0, $budget->monthly_limit - $spent);
        $percentUsed = ($spent / $budget->monthly_limit) * 100;

        return [
            'has_budget' => true,
            'enabled' => $budget->enabled,
            'limit' => $budget->monthly_limit,
            'spent' => $spent,
            'remaining' => $remaining,
            'percent_used' => round($percentUsed, 2),
            'alert_threshold' => $budget->alert_amount,
            'can_make_request' => $this->canMakeRequest($user),
        ];
    }

    /**
     * Set or update user budget
     */
    public function setBudget(User $user, float $monthlyLimit, float $alertThreshold = 0.80): UserBudget
    {
        return UserBudget::updateOrCreate(
            ['user_id' => $user->id],
            [
                'monthly_limit' => $monthlyLimit,
                'alert_threshold' => $alertThreshold,
                'enabled' => true,
            ]
        );
    }

    /**
     * Disable user budget (unlimited access)
     */
    public function disableBudget(User $user): void
    {
        if ($user->budget) {
            $user->budget->update(['enabled' => false]);
            Cache::forget("user:{$user->id}:budget_exceeded");
        }
    }

    /**
     * Get usage breakdown by feature
     */
    public function getUsageByFeature(User $user, int $days = 30): array
    {
        return UserLlmUsage::where('user_id', $user->id)
            ->where('created_at', '>=', now()->subDays($days))
            ->select('feature')
            ->selectRaw('SUM(cost_usd) as total_cost')
            ->selectRaw('SUM(tokens) as total_tokens')
            ->selectRaw('COUNT(*) as call_count')
            ->groupBy('feature')
            ->orderByDesc('total_cost')
            ->get()
            ->toArray();
    }

    /**
     * Get usage breakdown by model
     */
    public function getUsageByModel(User $user, int $days = 30): array
    {
        return UserLlmUsage::where('user_id', $user->id)
            ->where('created_at', '>=', now()->subDays($days))
            ->select('provider', 'model')
            ->selectRaw('SUM(cost_usd) as total_cost')
            ->selectRaw('SUM(tokens) as total_tokens')
            ->selectRaw('COUNT(*) as call_count')
            ->groupBy('provider', 'model')
            ->orderByDesc('total_cost')
            ->get()
            ->toArray();
    }
}
```

## Step 3: Budget Enforcement Middleware

Create HTTP middleware to enforce budget limits before processing requests.

**app/Http/Middleware/CheckLlmBudget.php:**

```bash
php artisan make:middleware CheckLlmBudget
```

```php
<?php

namespace App\Http\Middleware;

use App\Services\BudgetManager;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckLlmBudget
{
    public function __construct(
        protected BudgetManager $budgetManager
    ) {}

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return $next($request);
        }

        // Check if user can make LLM requests
        if (!$this->budgetManager->canMakeRequest($user)) {
            return response()->json([
                'error' => 'Budget exceeded',
                'message' => 'You have exceeded your monthly LLM budget. Please upgrade your plan or wait until next month.',
                'budget_status' => $this->budgetManager->getBudgetStatus($user),
            ], 429); // 429 Too Many Requests
        }

        return $next($request);
    }
}
```

**Register middleware (app/Http/Kernel.php or bootstrap/app.php for Laravel 11+):**

```php
// In app/Http/Kernel.php
protected $middlewareAliases = [
    // ... other middleware
    'llm.budget' => \App\Http\Middleware\CheckLlmBudget::class,
];

// Or in bootstrap/app.php (Laravel 11+)
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'llm.budget' => \App\Http\Middleware\CheckLlmBudget::class,
    ]);
})
```

**Usage in routes:**

```php
// Apply to specific routes
Route::middleware(['auth', 'llm.budget'])->group(function () {
    Route::post('/api/chat', [ChatController::class, 'chat']);
    Route::post('/api/generate', [GenerateController::class, 'generate']);
    Route::post('/api/analyze', [AnalyzeController::class, 'analyze']);
});

// Or apply in controller constructor
class ChatController extends Controller
{
    public function __construct()
    {
        $this->middleware(['auth', 'llm.budget']);
    }
}
```

## Step 4: LLM Integration with Cost Tracking

Integrate budget tracking into your LLM operations.

**app/Services/LlmService.php:**

```php
<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Event;
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\Observability\Events\LlmResponseCompleted;
use Mindwave\Mindwave\Observability\Tracing\TracerManager;

class LlmService
{
    public function __construct(
        protected BudgetManager $budgetManager,
        protected TracerManager $tracerManager
    ) {}

    /**
     * Generate text with automatic budget tracking
     */
    public function generate(string $prompt, User $user, ?string $feature = null): string
    {
        // Check budget before making the call
        if (!$this->budgetManager->canMakeRequest($user)) {
            throw new \Exception('Budget exceeded');
        }

        // Tag the trace with user and feature info
        $span = $this->tracerManager->getCurrentSpan();
        $span?->setAttribute('app.user_id', $user->id);
        $span?->setAttribute('app.user_email', $user->email);

        if ($feature) {
            $span?->setAttribute('app.feature', $feature);
        }

        // Set up one-time event listener for this specific trace
        $traceId = $span?->getTraceId();

        $listener = function (LlmResponseCompleted $event) use ($user, $feature, $traceId) {
            // Only handle events for this trace
            if ($event->traceId === $traceId) {
                $this->budgetManager->recordUsage($event, $user, $feature);
            }
        };

        Event::listen(LlmResponseCompleted::class, $listener);

        try {
            // Make the LLM call
            $response = Mindwave::llm()
                ->withModel('gpt-4-turbo')
                ->generateText($prompt);

            return $response;
        } finally {
            // Clean up listener
            Event::forget(LlmResponseCompleted::class);
        }
    }

    /**
     * Generate text with streaming and budget tracking
     */
    public function generateStream(string $prompt, User $user, ?string $feature = null): \Generator
    {
        if (!$this->budgetManager->canMakeRequest($user)) {
            throw new \Exception('Budget exceeded');
        }

        $span = $this->tracerManager->getCurrentSpan();
        $span?->setAttribute('app.user_id', $user->id);
        $span?->setAttribute('app.feature', $feature);

        $traceId = $span?->getTraceId();

        // Listen for completion event
        Event::listen(LlmResponseCompleted::class, function ($event) use ($user, $feature, $traceId) {
            if ($event->traceId === $traceId) {
                $this->budgetManager->recordUsage($event, $user, $feature);
            }
        });

        // Stream the response
        yield from Mindwave::llm()
            ->withModel('gpt-4-turbo')
            ->stream($prompt);
    }

    /**
     * Chat completion with budget tracking
     */
    public function chat(array $messages, User $user, ?string $feature = null): array
    {
        if (!$this->budgetManager->canMakeRequest($user)) {
            throw new \Exception('Budget exceeded');
        }

        $span = $this->tracerManager->getCurrentSpan();
        $span?->setAttribute('app.user_id', $user->id);
        $span?->setAttribute('app.feature', $feature);

        $traceId = $span?->getTraceId();

        Event::listen(LlmResponseCompleted::class, function ($event) use ($user, $feature, $traceId) {
            if ($event->traceId === $traceId) {
                $this->budgetManager->recordUsage($event, $user, $feature);
            }
        });

        return Mindwave::llm()
            ->withModel('gpt-4-turbo')
            ->chat($messages);
    }
}
```

**Usage in controllers:**

```php
<?php

namespace App\Http\Controllers;

use App\Services\LlmService;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function __construct(
        protected LlmService $llmService
    ) {
        $this->middleware(['auth', 'llm.budget']);
    }

    public function chat(Request $request)
    {
        $request->validate([
            'message' => 'required|string|max:4000',
        ]);

        try {
            $response = $this->llmService->generate(
                prompt: $request->input('message'),
                user: $request->user(),
                feature: 'chat'
            );

            return response()->json([
                'response' => $response,
                'budget_status' => app(BudgetManager::class)
                    ->getBudgetStatus($request->user()),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to generate response',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    public function stream(Request $request)
    {
        $request->validate([
            'message' => 'required|string|max:4000',
        ]);

        return response()->stream(function () use ($request) {
            foreach ($this->llmService->generateStream(
                prompt: $request->input('message'),
                user: $request->user(),
                feature: 'chat-stream'
            ) as $delta) {
                echo "data: " . json_encode(['delta' => $delta]) . "\n\n";
                ob_flush();
                flush();
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}
```

## Step 5: Analytics Dashboard

Build comprehensive analytics for cost monitoring.

**app/Http/Controllers/LlmAnalyticsController.php:**

```php
<?php

namespace App\Http\Controllers;

use App\Models\UserLlmUsage;
use App\Services\BudgetManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LlmAnalyticsController extends Controller
{
    public function __construct(
        protected BudgetManager $budgetManager
    ) {
        $this->middleware('auth');
    }

    /**
     * User's personal analytics dashboard
     */
    public function index(Request $request)
    {
        $user = $request->user();

        return view('llm.analytics', [
            'budget_status' => $this->budgetManager->getBudgetStatus($user),
            'daily_usage' => $this->getDailyUsage($user),
            'feature_breakdown' => $this->budgetManager->getUsageByFeature($user, 30),
            'model_breakdown' => $this->budgetManager->getUsageByModel($user, 30),
            'hourly_pattern' => $this->getHourlyPattern($user),
            'cost_trend' => $this->getCostTrend($user),
        ]);
    }

    /**
     * Get daily usage for the current month
     */
    protected function getDailyUsage($user): array
    {
        return UserLlmUsage::where('user_id', $user->id)
            ->currentMonth()
            ->select(DB::raw('DATE(created_at) as date'))
            ->selectRaw('SUM(cost_usd) as cost')
            ->selectRaw('SUM(tokens) as tokens')
            ->selectRaw('COUNT(*) as calls')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->toArray();
    }

    /**
     * Get hourly usage pattern
     */
    protected function getHourlyPattern($user): array
    {
        return UserLlmUsage::where('user_id', $user->id)
            ->where('created_at', '>=', now()->subDays(7))
            ->select(DB::raw('HOUR(created_at) as hour'))
            ->selectRaw('SUM(cost_usd) as cost')
            ->selectRaw('COUNT(*) as calls')
            ->groupBy('hour')
            ->orderBy('hour')
            ->get()
            ->toArray();
    }

    /**
     * Get 30-day cost trend
     */
    protected function getCostTrend($user): array
    {
        return UserLlmUsage::where('user_id', $user->id)
            ->where('created_at', '>=', now()->subDays(30))
            ->select(DB::raw('DATE(created_at) as date'))
            ->selectRaw('SUM(cost_usd) as cost')
            ->selectRaw('AVG(cost_usd) as avg_cost_per_call')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => $item->date,
                    'cost' => round($item->cost, 4),
                    'avg_cost_per_call' => round($item->avg_cost_per_call, 4),
                ];
            })
            ->toArray();
    }

    /**
     * API endpoint for budget status
     */
    public function budgetStatus(Request $request)
    {
        return response()->json(
            $this->budgetManager->getBudgetStatus($request->user())
        );
    }

    /**
     * API endpoint for usage data
     */
    public function usage(Request $request)
    {
        $user = $request->user();
        $days = $request->integer('days', 30);

        return response()->json([
            'daily_usage' => $this->getDailyUsage($user),
            'by_feature' => $this->budgetManager->getUsageByFeature($user, $days),
            'by_model' => $this->budgetManager->getUsageByModel($user, $days),
            'hourly_pattern' => $this->getHourlyPattern($user),
        ]);
    }
}
```

**View: resources/views/llm/analytics.blade.php:**

```blade
@extends('layouts.app')

@section('content')
<div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-8">LLM Usage Analytics</h1>

    <!-- Budget Status Card -->
    <div class="bg-white rounded-lg shadow p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4">Monthly Budget</h2>

        @if($budget_status['has_budget'])
            <div class="mb-4">
                <div class="flex justify-between mb-2">
                    <span class="text-gray-600">Used</span>
                    <span class="font-semibold">
                        ${{ number_format($budget_status['spent'], 2) }} /
                        ${{ number_format($budget_status['limit'], 2) }}
                    </span>
                </div>

                <!-- Progress Bar -->
                <div class="w-full bg-gray-200 rounded-full h-4">
                    <div class="bg-blue-600 h-4 rounded-full"
                         style="width: {{ min(100, $budget_status['percent_used']) }}%">
                    </div>
                </div>

                <div class="mt-2 text-sm text-gray-600">
                    {{ $budget_status['percent_used'] }}% used
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <div class="text-sm text-gray-600">Remaining</div>
                    <div class="text-2xl font-bold text-green-600">
                        ${{ number_format($budget_status['remaining'], 2) }}
                    </div>
                </div>
                <div>
                    <div class="text-sm text-gray-600">Status</div>
                    <div class="text-2xl font-bold {{ $budget_status['can_make_request'] ? 'text-green-600' : 'text-red-600' }}">
                        {{ $budget_status['can_make_request'] ? 'Active' : 'Exceeded' }}
                    </div>
                </div>
            </div>
        @else
            <p class="text-gray-600">No budget limit set. You have unlimited access.</p>
        @endif
    </div>

    <!-- Daily Usage Chart -->
    <div class="bg-white rounded-lg shadow p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4">Daily Usage (This Month)</h2>
        <canvas id="dailyUsageChart"></canvas>
    </div>

    <!-- Feature Breakdown -->
    <div class="bg-white rounded-lg shadow p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4">Usage by Feature</h2>
        <table class="w-full">
            <thead>
                <tr class="border-b">
                    <th class="text-left py-2">Feature</th>
                    <th class="text-right py-2">Cost</th>
                    <th class="text-right py-2">Calls</th>
                    <th class="text-right py-2">Tokens</th>
                </tr>
            </thead>
            <tbody>
                @foreach($feature_breakdown as $feature)
                <tr class="border-b">
                    <td class="py-2">{{ $feature['feature'] ?? 'Unknown' }}</td>
                    <td class="text-right">${{ number_format($feature['total_cost'], 4) }}</td>
                    <td class="text-right">{{ number_format($feature['call_count']) }}</td>
                    <td class="text-right">{{ number_format($feature['total_tokens']) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <!-- Model Breakdown -->
    <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-4">Usage by Model</h2>
        <table class="w-full">
            <thead>
                <tr class="border-b">
                    <th class="text-left py-2">Provider</th>
                    <th class="text-left py-2">Model</th>
                    <th class="text-right py-2">Cost</th>
                    <th class="text-right py-2">Calls</th>
                </tr>
            </thead>
            <tbody>
                @foreach($model_breakdown as $model)
                <tr class="border-b">
                    <td class="py-2">{{ $model['provider'] }}</td>
                    <td class="py-2">{{ $model['model'] }}</td>
                    <td class="text-right">${{ number_format($model['total_cost'], 4) }}</td>
                    <td class="text-right">{{ number_format($model['call_count']) }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
</div>

@push('scripts')
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
const ctx = document.getElementById('dailyUsageChart');
new Chart(ctx, {
    type: 'line',
    data: {
        labels: @json(array_column($daily_usage, 'date')),
        datasets: [{
            label: 'Daily Cost ($)',
            data: @json(array_column($daily_usage, 'cost')),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.1
        }]
    },
    options: {
        responsive: true,
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function(value) {
                        return '$' + value.toFixed(4);
                    }
                }
            }
        }
    }
});
</script>
@endpush
@endsection
```

## Step 6: Budget Alerts

Create notification system for budget alerts.

**app/Notifications/BudgetThresholdReached.php:**

```bash
php artisan make:notification BudgetThresholdReached
```

```php
<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Messages\SlackMessage;
use Illuminate\Notifications\Notification;

class BudgetThresholdReached extends Notification
{
    use Queueable;

    public function __construct(
        protected float $spent,
        protected float $budget,
        protected float $percentUsed
    ) {}

    public function via($notifiable): array
    {
        return ['mail', 'slack', 'database'];
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('LLM Budget Alert: ' . round($this->percentUsed) . '% Used')
            ->line('You have used ' . round($this->percentUsed) . '% of your monthly LLM budget.')
            ->line('Spent: $' . number_format($this->spent, 2))
            ->line('Budget: $' . number_format($this->budget, 2))
            ->line('Remaining: $' . number_format($this->budget - $this->spent, 2))
            ->action('View Usage Details', url('/llm/analytics'))
            ->line('Consider optimizing your prompts or upgrading your plan if you need more capacity.');
    }

    public function toSlack($notifiable): SlackMessage
    {
        return (new SlackMessage)
            ->warning()
            ->content('LLM Budget Alert: ' . round($this->percentUsed) . '% used')
            ->attachment(function ($attachment) {
                $attachment->title('Budget Status')
                    ->fields([
                        'Spent' => '$' . number_format($this->spent, 2),
                        'Budget' => '$' . number_format($this->budget, 2),
                        'Remaining' => '$' . number_format($this->budget - $this->spent, 2),
                        'Percent Used' => round($this->percentUsed) . '%',
                    ]);
            });
    }

    public function toArray($notifiable): array
    {
        return [
            'type' => 'budget_threshold',
            'spent' => $this->spent,
            'budget' => $this->budget,
            'percent_used' => $this->percentUsed,
        ];
    }
}
```

**app/Notifications/BudgetExceeded.php:**

```bash
php artisan make:notification BudgetExceeded
```

```php
<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Messages\SlackMessage;
use Illuminate\Notifications\Notification;

class BudgetExceeded extends Notification
{
    use Queueable;

    public function __construct(
        protected float $spent,
        protected float $budget
    ) {}

    public function via($notifiable): array
    {
        return ['mail', 'slack', 'database'];
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('LLM Budget Exceeded')
            ->error()
            ->line('You have exceeded your monthly LLM budget.')
            ->line('Budget: $' . number_format($this->budget, 2))
            ->line('Spent: $' . number_format($this->spent, 2))
            ->line('Overage: $' . number_format($this->spent - $this->budget, 2))
            ->line('Your LLM features have been temporarily disabled to prevent additional charges.')
            ->action('Upgrade Your Plan', url('/billing/upgrade'))
            ->line('Upgrade your plan to restore access immediately, or wait until next month when your budget resets.');
    }

    public function toSlack($notifiable): SlackMessage
    {
        return (new SlackMessage)
            ->error()
            ->content('LLM Budget Exceeded!')
            ->attachment(function ($attachment) {
                $attachment->title('Budget Details')
                    ->fields([
                        'Budget' => '$' . number_format($this->budget, 2),
                        'Spent' => '$' . number_format($this->spent, 2),
                        'Overage' => '$' . number_format($this->spent - $this->budget, 2),
                        'Status' => 'LLM features disabled',
                    ])
                    ->color('danger');
            });
    }

    public function toArray($notifiable): array
    {
        return [
            'type' => 'budget_exceeded',
            'spent' => $this->spent,
            'budget' => $this->budget,
            'overage' => $this->spent - $this->budget,
        ];
    }
}
```

## Step 7: Admin Panel

Create admin functionality to manage user budgets.

**app/Http/Controllers/Admin/UserBudgetController.php:**

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserLlmUsage;
use App\Services\BudgetManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserBudgetController extends Controller
{
    public function __construct(
        protected BudgetManager $budgetManager
    ) {
        $this->middleware(['auth', 'admin']);
    }

    /**
     * Display all users with budget information
     */
    public function index()
    {
        $users = User::with('budget')
            ->withCount('llmUsage')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'budget' => $user->budget?->monthly_limit,
                    'spent' => $user->getMonthlyLlmSpending(),
                    'usage_count' => $user->llm_usage_count,
                    'exceeded' => $user->hasExceededBudget(),
                ];
            });

        return view('admin.budgets.index', ['users' => $users]);
    }

    /**
     * Show user budget details
     */
    public function show(User $user)
    {
        return view('admin.budgets.show', [
            'user' => $user,
            'budget_status' => $this->budgetManager->getBudgetStatus($user),
            'usage_by_feature' => $this->budgetManager->getUsageByFeature($user, 30),
            'usage_by_model' => $this->budgetManager->getUsageByModel($user, 30),
            'recent_usage' => $this->getRecentUsage($user),
        ]);
    }

    /**
     * Update user budget
     */
    public function update(Request $request, User $user)
    {
        $request->validate([
            'monthly_limit' => 'required|numeric|min:0|max:10000',
            'alert_threshold' => 'required|numeric|min:0|max:1',
        ]);

        $this->budgetManager->setBudget(
            $user,
            $request->input('monthly_limit'),
            $request->input('alert_threshold')
        );

        return redirect()
            ->route('admin.budgets.show', $user)
            ->with('success', 'Budget updated successfully');
    }

    /**
     * Disable user budget
     */
    public function disable(User $user)
    {
        $this->budgetManager->disableBudget($user);

        return redirect()
            ->route('admin.budgets.show', $user)
            ->with('success', 'Budget disabled - user has unlimited access');
    }

    /**
     * Global cost report
     */
    public function report(Request $request)
    {
        $days = $request->integer('days', 30);

        $stats = [
            'total_users' => User::whereHas('llmUsage')->count(),
            'total_cost' => UserLlmUsage::where('created_at', '>=', now()->subDays($days))
                ->sum('cost_usd'),
            'total_calls' => UserLlmUsage::where('created_at', '>=', now()->subDays($days))
                ->count(),
            'total_tokens' => UserLlmUsage::where('created_at', '>=', now()->subDays($days))
                ->sum('tokens'),
            'avg_cost_per_call' => UserLlmUsage::where('created_at', '>=', now()->subDays($days))
                ->avg('cost_usd'),
            'top_spenders' => $this->getTopSpenders($days),
            'cost_by_provider' => $this->getCostByProvider($days),
            'daily_costs' => $this->getDailyCosts($days),
        ];

        return view('admin.budgets.report', $stats);
    }

    protected function getRecentUsage(User $user, int $limit = 50): array
    {
        return UserLlmUsage::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->toArray();
    }

    protected function getTopSpenders(int $days): array
    {
        return User::select('users.*')
            ->join('user_llm_usage', 'users.id', '=', 'user_llm_usage.user_id')
            ->where('user_llm_usage.created_at', '>=', now()->subDays($days))
            ->selectRaw('SUM(user_llm_usage.cost_usd) as total_cost')
            ->selectRaw('COUNT(user_llm_usage.id) as call_count')
            ->groupBy('users.id')
            ->orderByDesc('total_cost')
            ->limit(10)
            ->get()
            ->toArray();
    }

    protected function getCostByProvider(int $days): array
    {
        return UserLlmUsage::where('created_at', '>=', now()->subDays($days))
            ->select('provider', 'model')
            ->selectRaw('SUM(cost_usd) as total_cost')
            ->selectRaw('COUNT(*) as call_count')
            ->groupBy('provider', 'model')
            ->orderByDesc('total_cost')
            ->get()
            ->toArray();
    }

    protected function getDailyCosts(int $days): array
    {
        return UserLlmUsage::where('created_at', '>=', now()->subDays($days))
            ->select(DB::raw('DATE(created_at) as date'))
            ->selectRaw('SUM(cost_usd) as cost')
            ->selectRaw('COUNT(*) as calls')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->toArray();
    }
}
```

**Routes (routes/web.php):**

```php
// Admin routes
Route::middleware(['auth', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/budgets', [UserBudgetController::class, 'index'])->name('budgets.index');
    Route::get('/budgets/{user}', [UserBudgetController::class, 'show'])->name('budgets.show');
    Route::put('/budgets/{user}', [UserBudgetController::class, 'update'])->name('budgets.update');
    Route::delete('/budgets/{user}', [UserBudgetController::class, 'disable'])->name('budgets.disable');
    Route::get('/budgets/report', [UserBudgetController::class, 'report'])->name('budgets.report');
});

// User routes
Route::middleware('auth')->group(function () {
    Route::get('/llm/analytics', [LlmAnalyticsController::class, 'index'])->name('llm.analytics');
    Route::get('/api/llm/budget', [LlmAnalyticsController::class, 'budgetStatus']);
    Route::get('/api/llm/usage', [LlmAnalyticsController::class, 'usage']);
});
```

## Testing

### Unit Tests

**tests/Unit/BudgetManagerTest.php:**

```php
<?php

namespace Tests\Unit;

use App\Models\User;
use App\Models\UserBudget;
use App\Services\BudgetManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetManagerTest extends TestCase
{
    use RefreshDatabase;

    protected BudgetManager $budgetManager;

    protected function setUp(): void
    {
        parent::setUp();
        $this->budgetManager = app(BudgetManager::class);
    }

    public function test_user_without_budget_can_make_requests()
    {
        $user = User::factory()->create();

        $this->assertTrue($this->budgetManager->canMakeRequest($user));
    }

    public function test_user_within_budget_can_make_requests()
    {
        $user = User::factory()->create();
        $this->budgetManager->setBudget($user, 10.00);

        $this->assertTrue($this->budgetManager->canMakeRequest($user));
    }

    public function test_user_exceeded_budget_cannot_make_requests()
    {
        $user = User::factory()->create();
        $budget = $this->budgetManager->setBudget($user, 1.00);

        // Simulate $2 in spending
        UserLlmUsage::create([
            'user_id' => $user->id,
            'cost_usd' => 2.00,
            'tokens' => 1000,
            'provider' => 'openai',
            'model' => 'gpt-4',
            'created_at' => now(),
        ]);

        $this->assertFalse($this->budgetManager->canMakeRequest($user));
    }

    public function test_budget_status_calculation()
    {
        $user = User::factory()->create();
        $this->budgetManager->setBudget($user, 10.00, 0.80);

        // Add $5 in usage
        UserLlmUsage::create([
            'user_id' => $user->id,
            'cost_usd' => 5.00,
            'tokens' => 1000,
            'provider' => 'openai',
            'model' => 'gpt-4',
            'created_at' => now(),
        ]);

        $status = $this->budgetManager->getBudgetStatus($user);

        $this->assertEquals(10.00, $status['limit']);
        $this->assertEquals(5.00, $status['spent']);
        $this->assertEquals(5.00, $status['remaining']);
        $this->assertEquals(50.0, $status['percent_used']);
        $this->assertTrue($status['can_make_request']);
    }

    public function test_disable_budget_allows_unlimited_access()
    {
        $user = User::factory()->create();
        $this->budgetManager->setBudget($user, 1.00);

        // Exceed budget
        UserLlmUsage::create([
            'user_id' => $user->id,
            'cost_usd' => 2.00,
            'tokens' => 1000,
            'provider' => 'openai',
            'model' => 'gpt-4',
            'created_at' => now(),
        ]);

        $this->assertFalse($this->budgetManager->canMakeRequest($user));

        // Disable budget
        $this->budgetManager->disableBudget($user);

        $this->assertTrue($this->budgetManager->canMakeRequest($user));
    }
}
```

### Feature Tests

**tests/Feature/BudgetEnforcementTest.php:**

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\UserLlmUsage;
use App\Services\BudgetManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetEnforcementTest extends TestCase
{
    use RefreshDatabase;

    public function test_request_blocked_when_budget_exceeded()
    {
        $user = User::factory()->create();
        app(BudgetManager::class)->setBudget($user, 1.00);

        // Exceed budget
        UserLlmUsage::create([
            'user_id' => $user->id,
            'cost_usd' => 2.00,
            'tokens' => 1000,
            'provider' => 'openai',
            'model' => 'gpt-4',
            'created_at' => now(),
        ]);

        $response = $this->actingAs($user)
            ->postJson('/api/chat', [
                'message' => 'Hello',
            ]);

        $response->assertStatus(429)
            ->assertJson([
                'error' => 'Budget exceeded',
            ]);
    }

    public function test_request_allowed_when_within_budget()
    {
        $user = User::factory()->create();
        app(BudgetManager::class)->setBudget($user, 10.00);

        // This would need actual LLM mocking for full test
        $response = $this->actingAs($user)
            ->postJson('/api/chat', [
                'message' => 'Hello',
            ]);

        $response->assertSuccessful();
    }
}
```

## Enhancements

### Credit System (Prepaid)

**Migration:**

```php
Schema::create('user_credits', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->onDelete('cascade');
    $table->decimal('balance', 10, 4)->default(0);
    $table->decimal('total_purchased', 10, 4)->default(0);
    $table->decimal('total_spent', 10, 4)->default(0);
    $table->timestamps();
});

Schema::create('credit_transactions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->onDelete('cascade');
    $table->enum('type', ['purchase', 'usage', 'refund', 'bonus']);
    $table->decimal('amount', 10, 6);
    $table->decimal('balance_after', 10, 4);
    $table->string('description')->nullable();
    $table->json('metadata')->nullable();
    $table->timestamp('created_at');
});
```

**Credit Manager:**

```php
class CreditManager
{
    public function deductCredits(User $user, float $amount, string $description): void
    {
        $credit = $user->credits;

        if ($credit->balance < $amount) {
            throw new InsufficientCreditsException();
        }

        DB::transaction(function () use ($user, $credit, $amount, $description) {
            $newBalance = $credit->balance - $amount;

            $credit->update([
                'balance' => $newBalance,
                'total_spent' => $credit->total_spent + $amount,
            ]);

            CreditTransaction::create([
                'user_id' => $user->id,
                'type' => 'usage',
                'amount' => -$amount,
                'balance_after' => $newBalance,
                'description' => $description,
                'created_at' => now(),
            ]);
        });
    }

    public function addCredits(User $user, float $amount, string $type = 'purchase'): void
    {
        // Implementation for adding credits
    }
}
```

### Model-Based Pricing Tiers

```php
class PricingTierManager
{
    protected array $tiers = [
        'economy' => ['gpt-3.5-turbo', 'claude-3-haiku'],
        'standard' => ['gpt-4-turbo', 'claude-3-sonnet'],
        'premium' => ['gpt-4', 'claude-3-opus'],
    ];

    public function getAvailableModels(User $user): array
    {
        return $this->tiers[$user->subscription_tier] ?? $this->tiers['economy'];
    }

    public function canUseModel(User $user, string $model): bool
    {
        return in_array($model, $this->getAvailableModels($user));
    }
}
```

### Cost Optimization Suggestions

```php
class CostOptimizer
{
    public function getSuggestions(User $user): array
    {
        $suggestions = [];
        $usage = $this->analyzeUsage($user);

        // Suggest cheaper models
        if ($usage['gpt-4_percent'] > 80) {
            $suggestions[] = [
                'type' => 'model_switch',
                'message' => 'Consider using GPT-4-turbo for 70% cost reduction',
                'potential_savings' => $this->calculateSavings($user, 'gpt-4', 'gpt-4-turbo'),
            ];
        }

        // Suggest prompt optimization
        if ($usage['avg_tokens_per_call'] > 2000) {
            $suggestions[] = [
                'type' => 'prompt_optimization',
                'message' => 'Your prompts are longer than average. Consider using PromptComposer.',
                'potential_savings' => $usage['avg_cost_per_call'] * 0.3,
            ];
        }

        // Suggest caching
        if ($usage['repeated_prompts_percent'] > 30) {
            $suggestions[] = [
                'type' => 'caching',
                'message' => '30% of your prompts are repeated. Implement caching.',
                'potential_savings' => $usage['monthly_cost'] * 0.3,
            ];
        }

        return $suggestions;
    }
}
```

## Production Considerations

### Real-time vs Batch Tracking

**Real-time (immediate):**

-   Use for budget enforcement
-   Event listeners update database immediately
-   Slightly higher overhead per request

**Batch (queued):**

-   Queue usage recording for high-traffic scenarios
-   Process in batches via scheduled job
-   Lower overhead, eventual consistency

```php
// Queue usage recording
Event::listen(LlmResponseCompleted::class, function ($event) {
    RecordLlmUsageJob::dispatch($event, auth()->id())->onQueue('usage');
});
```

### Database Optimization

**Indexes:**

```sql
CREATE INDEX idx_user_date ON user_llm_usage(user_id, created_at);
CREATE INDEX idx_feature ON user_llm_usage(feature);
CREATE INDEX idx_provider_model ON user_llm_usage(provider, model);
```

**Partitioning (for high volume):**

```sql
-- Partition by month for easier archival
ALTER TABLE user_llm_usage
PARTITION BY RANGE (YEAR(created_at) * 100 + MONTH(created_at));
```

### Caching Strategies

```php
// Cache monthly spending
$monthlySpent = Cache::remember(
    "user:{$userId}:monthly_spent",
    now()->addMinutes(5),
    fn() => $user->getMonthlyLlmSpending()
);

// Cache budget status
$status = Cache::remember(
    "user:{$userId}:budget_status",
    now()->addMinutes(5),
    fn() => $budgetManager->getBudgetStatus($user)
);
```

### Monitoring and Alerts

**Set up application monitoring:**

```php
// Monitor high-cost traces
Event::listen(LlmResponseCompleted::class, function ($event) {
    if ($event->costEstimate > 0.50) {
        Log::warning('High-cost LLM call detected', [
            'cost' => $event->costEstimate,
            'trace_id' => $event->traceId,
            'user_id' => auth()->id(),
            'model' => $event->model,
        ]);
    }
});

// Daily cost summary
Schedule::call(function () {
    $dailyCost = UserLlmUsage::whereDate('created_at', today())
        ->sum('cost_usd');

    if ($dailyCost > 100) {
        Notification::route('slack', config('slack.admin_webhook'))
            ->notify(new HighDailyCostAlert($dailyCost));
    }
})->daily();
```

## Summary

You've built a complete cost-aware application with:

-   **Budget Management** - Per-user limits with enforcement
-   **Real-time Tracking** - Automatic cost recording on every LLM call
-   **Proactive Alerts** - Email and Slack notifications at thresholds
-   **Analytics Dashboard** - Comprehensive usage visualization
-   **Admin Tools** - Manage budgets and monitor costs
-   **Production Ready** - Caching, optimization, and monitoring

**Key Takeaways:**

1. Use middleware for budget enforcement before LLM calls
2. Listen to `LlmResponseCompleted` events for automatic tracking
3. Cache budget status to reduce database queries
4. Implement tiered alerts (warning → critical)
5. Build analytics for cost optimization insights
6. Monitor high-cost operations proactively

**Next Steps:**

-   [Tracing](/docs/observability/tracing) - Deep dive into observability
-   [Cost Tracking](/docs/observability/cost-tracking) - Built-in cost features
-   [Production Deployment](/docs/production) - Deploy with confidence
