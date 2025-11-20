# Events

Mindwave fires Laravel events throughout the LLM lifecycle, providing powerful hooks for custom behavior, monitoring, analytics, and integrations. Events enable you to react to LLM operations without modifying core Mindwave code.

## Overview

Mindwave leverages Laravel's native event system to dispatch events at critical points during LLM interactions. This allows you to:

-   **Track Usage**: Log all LLM calls to your database or analytics platform
-   **Monitor Performance**: Alert on slow requests or high costs
-   **Implement Business Logic**: Deduct user credits, update quotas, enforce rate limits
-   **Debug & Troubleshoot**: Capture detailed information about failures
-   **Build Real-Time UIs**: Stream token deltas to frontend applications
-   **Integrate External Tools**: Send data to Slack, monitoring systems, or data warehouses

All events integrate seamlessly with Laravel's event system, supporting synchronous listeners, queued listeners for async processing, and Event::fake() for testing.

## Available Events

Mindwave fires four core events during the LLM lifecycle:

### LlmRequestStarted

Fired when an LLM request begins, before calling the provider API.

**Event Class:** `Mindwave\Mindwave\Observability\Events\LlmRequestStarted`

**Properties:**

```php
public readonly string $provider;        // 'openai', 'anthropic', 'ollama', etc.
public readonly string $model;           // 'gpt-4', 'claude-3-opus', etc.
public readonly string $operation;       // 'chat', 'text_completion', 'embeddings'
public readonly ?array $messages;        // Input messages (null if capture disabled)
public readonly array $parameters;       // Request parameters (temperature, max_tokens, etc.)
public readonly string $spanId;          // OpenTelemetry span ID
public readonly string $traceId;         // OpenTelemetry trace ID
public readonly int $timestamp;          // Request start time (nanoseconds)
```

**Helper Methods:**

```php
$event->getParameter('temperature');      // Get specific parameter
$event->hasMessages();                    // Check if messages captured
$event->getTimestampInSeconds();          // Get timestamp in seconds
$event->getTimestampInMilliseconds();     // Get timestamp in milliseconds
$event->toArray();                        // Convert to array
```

**Use Cases:**

-   Log request start times
-   Increment request counters
-   Start performance timers
-   Validate request parameters
-   Implement pre-request hooks

---

### LlmResponseCompleted

Fired when an LLM request completes successfully.

**Event Class:** `Mindwave\Mindwave\Observability\Events\LlmResponseCompleted`

**Properties:**

```php
public readonly string $provider;        // Provider name
public readonly string $model;           // Model used
public readonly string $operation;       // Operation type
public readonly array $response;         // Full response data
public readonly array $tokenUsage;       // Token usage breakdown
public readonly int $duration;           // Request duration (nanoseconds)
public readonly ?float $costEstimate;    // Estimated cost in USD
public readonly string $spanId;          // OpenTelemetry span ID
public readonly string $traceId;         // OpenTelemetry trace ID
public readonly int $timestamp;          // Completion timestamp (nanoseconds)
public readonly array $metadata;         // Additional metadata
```

**Helper Methods:**

```php
// Response Information
$event->getResponseId();                  // Get response ID
$event->getFinishReason();                // Get finish reason
$event->getFinishReasons();               // Get all finish reasons (multiple choices)

// Token Usage
$event->getInputTokens();                 // Input token count
$event->getOutputTokens();                // Output token count
$event->getTotalTokens();                 // Total tokens
$event->getCacheReadTokens();             // Cache read tokens
$event->getCacheCreationTokens();         // Cache creation tokens
$event->usedCache();                      // Check if cache was used

// Performance Metrics
$event->getDurationInSeconds();           // Duration in seconds
$event->getDurationInMilliseconds();      // Duration in milliseconds
$event->getTokensPerSecond();             // Tokens generated per second

// Cost Information
$event->hasCostEstimate();                // Check if cost available
$event->getFormattedCost(4);              // Get formatted cost (e.g., "$0.0042")

// Metadata & Timestamps
$event->getMetadata('key', 'default');    // Get metadata value
$event->getTimestampInSeconds();          // Timestamp in seconds
$event->toArray();                        // Convert to array
```

**Use Cases:**

-   Log successful completions
-   Track token usage and costs
-   Calculate user charges
-   Monitor performance metrics
-   Update analytics dashboards
-   Trigger downstream workflows

---

### LlmErrorOccurred

Fired when an LLM request fails with an error.

**Event Class:** `Mindwave\Mindwave\Observability\Events\LlmErrorOccurred`

**Properties:**

```php
public readonly Throwable $exception;    // The exception that occurred
public readonly string $provider;        // Provider name
public readonly string $model;           // Model being used
public readonly string $operation;       // Operation type
public readonly string $spanId;          // OpenTelemetry span ID
public readonly string $traceId;         // OpenTelemetry trace ID
public readonly int $timestamp;          // Error timestamp (nanoseconds)
public readonly array $context;          // Additional error context
```

**Helper Methods:**

```php
// Exception Information
$event->getMessage();                     // Exception message
$event->getCode();                        // Exception code
$event->getExceptionClass();              // Exception class name
$event->getFile();                        // File where exception occurred
$event->getLine();                        // Line number
$event->getTrace();                       // Stack trace as string

// Previous Exceptions
$event->getPrevious();                    // Get previous exception
$event->hasPrevious();                    // Check if has previous exception

// Context & Error Info
$event->getContext('key', 'default');     // Get context value
$event->getErrorInfo();                   // Get error info array
$event->getTimestampInSeconds();          // Timestamp in seconds
$event->toArray();                        // Convert to array
```

**Use Cases:**

-   Alert on critical failures
-   Log errors to monitoring systems
-   Send Slack notifications
-   Implement retry logic
-   Track error rates
-   Debug production issues

---

### LlmTokenStreamed

Fired for each token delta during streaming responses.

**Event Class:** `Mindwave\Mindwave\Observability\Events\LlmTokenStreamed`

**Properties:**

```php
public readonly string $delta;           // New content chunk
public readonly int $cumulativeTokens;   // Total tokens streamed so far
public readonly string $spanId;          // OpenTelemetry span ID
public readonly string $traceId;         // OpenTelemetry trace ID
public readonly int $timestamp;          // Token received timestamp (nanoseconds)
public readonly array $metadata;         // Additional metadata
```

**Helper Methods:**

```php
$event->getDeltaLength();                 // Length of delta in characters
$event->getMetadata('key', 'default');    // Get metadata value
$event->isFinal();                        // Check if this is the final token
$event->getFinishReason();                // Get finish reason (if final)
$event->getTimestampInSeconds();          // Timestamp in seconds
$event->toArray();                        // Convert to array
```

**Use Cases:**

-   Build real-time streaming UIs
-   Track streaming progress
-   Calculate tokens per second
-   Update progress bars
-   Send Server-Sent Events (SSE)
-   Debug streaming issues

## Listening to Events

### Creating Event Listeners

Create a listener class for any Mindwave event:

```php
<?php

namespace App\Listeners;

use Mindwave\Mindwave\Observability\Events\LlmResponseCompleted;
use Illuminate\Support\Facades\Log;

class LogLlmCompletion
{
    public function handle(LlmResponseCompleted $event): void
    {
        Log::info('LLM request completed', [
            'model' => $event->model,
            'tokens' => $event->getTotalTokens(),
            'duration' => $event->getDurationInMilliseconds() . 'ms',
            'cost' => $event->getFormattedCost(),
        ]);
    }
}
```

### Registering Listeners

Register your listener in `app/Providers/EventServiceProvider.php`:

```php
use Mindwave\Mindwave\Observability\Events\LlmResponseCompleted;
use App\Listeners\LogLlmCompletion;

protected $listen = [
    LlmResponseCompleted::class => [
        LogLlmCompletion::class,
    ],
];
```

### Closure-Based Listeners

For simple use cases, register closure listeners in a service provider:

```php
use Illuminate\Support\Facades\Event;
use Mindwave\Mindwave\Observability\Events\LlmRequestStarted;

Event::listen(LlmRequestStarted::class, function (LlmRequestStarted $event) {
    logger()->debug("LLM request started: {$event->model}");
});
```

### Queued Listeners

Process events asynchronously for better performance:

```php
<?php

namespace App\Listeners;

use Illuminate\Contracts\Queue\ShouldQueue;
use Mindwave\Mindwave\Observability\Events\LlmResponseCompleted;

class StoreAnalytics implements ShouldQueue
{
    public $queue = 'analytics';

    public function handle(LlmResponseCompleted $event): void
    {
        // Heavy processing happens async on queue
        Analytics::track('llm_completion', [
            'model' => $event->model,
            'tokens' => $event->getTotalTokens(),
            'cost' => $event->costEstimate,
        ]);
    }
}
```

### Event Subscribers

Group multiple event handlers in a single class:

```php
<?php

namespace App\Listeners;

use Illuminate\Events\Dispatcher;
use Mindwave\Mindwave\Observability\Events\LlmRequestStarted;
use Mindwave\Mindwave\Observability\Events\LlmResponseCompleted;
use Mindwave\Mindwave\Observability\Events\LlmErrorOccurred;

class LlmEventSubscriber
{
    public function handleRequestStarted(LlmRequestStarted $event): void
    {
        // Handle request start
    }

    public function handleResponseCompleted(LlmResponseCompleted $event): void
    {
        // Handle completion
    }

    public function handleError(LlmErrorOccurred $event): void
    {
        // Handle errors
    }

    public function subscribe(Dispatcher $events): array
    {
        return [
            LlmRequestStarted::class => 'handleRequestStarted',
            LlmResponseCompleted::class => 'handleResponseCompleted',
            LlmErrorOccurred::class => 'handleError',
        ];
    }
}
```

Register the subscriber:

```php
// In EventServiceProvider
protected $subscribe = [
    \App\Listeners\LlmEventSubscriber::class,
];
```

## Common Use Cases

### Database Logging

Store all LLM calls in your database for analytics and auditing:

**Migration:**

```php
Schema::create('llm_logs', function (Blueprint $table) {
    $table->id();
    $table->string('trace_id')->index();
    $table->string('provider');
    $table->string('model');
    $table->string('operation');
    $table->integer('input_tokens');
    $table->integer('output_tokens');
    $table->integer('total_tokens');
    $table->float('duration_ms');
    $table->decimal('cost', 10, 6)->nullable();
    $table->string('status'); // 'success' or 'error'
    $table->text('error_message')->nullable();
    $table->timestamps();
});
```

**Listener:**

```php
<?php

namespace App\Listeners;

use App\Models\LlmLog;
use Illuminate\Contracts\Queue\ShouldQueue;
use Mindwave\Mindwave\Observability\Events\LlmResponseCompleted;
use Mindwave\Mindwave\Observability\Events\LlmErrorOccurred;

class StoreLlmLog implements ShouldQueue
{
    public function handleSuccess(LlmResponseCompleted $event): void
    {
        LlmLog::create([
            'trace_id' => $event->traceId,
            'provider' => $event->provider,
            'model' => $event->model,
            'operation' => $event->operation,
            'input_tokens' => $event->getInputTokens(),
            'output_tokens' => $event->getOutputTokens(),
            'total_tokens' => $event->getTotalTokens(),
            'duration_ms' => $event->getDurationInMilliseconds(),
            'cost' => $event->costEstimate,
            'status' => 'success',
        ]);
    }

    public function handleError(LlmErrorOccurred $event): void
    {
        LlmLog::create([
            'trace_id' => $event->traceId,
            'provider' => $event->provider,
            'model' => $event->model,
            'operation' => $event->operation,
            'status' => 'error',
            'error_message' => $event->getMessage(),
        ]);
    }

    public function subscribe($events): array
    {
        return [
            LlmResponseCompleted::class => 'handleSuccess',
            LlmErrorOccurred::class => 'handleError',
        ];
    }
}
```

### Slack Notifications

Send alerts to Slack when LLM errors occur or costs are high:

```php
<?php

namespace App\Listeners;

use Illuminate\Support\Facades\Http;
use Mindwave\Mindwave\Observability\Events\LlmErrorOccurred;
use Mindwave\Mindwave\Observability\Events\LlmResponseCompleted;

class SlackNotifier
{
    private string $webhookUrl;

    public function __construct()
    {
        $this->webhookUrl = config('services.slack.webhook_url');
    }

    public function handleError(LlmErrorOccurred $event): void
    {
        Http::post($this->webhookUrl, [
            'text' => ':rotating_light: LLM Error Occurred',
            'blocks' => [
                [
                    'type' => 'section',
                    'text' => [
                        'type' => 'mrkdwn',
                        'text' => "*LLM Request Failed*\n" .
                                  "*Model:* {$event->model}\n" .
                                  "*Provider:* {$event->provider}\n" .
                                  "*Error:* {$event->getMessage()}\n" .
                                  "*Trace ID:* `{$event->traceId}`",
                    ],
                ],
            ],
        ]);
    }

    public function handleHighCost(LlmResponseCompleted $event): void
    {
        // Alert if single request costs more than $0.10
        if ($event->costEstimate && $event->costEstimate > 0.10) {
            Http::post($this->webhookUrl, [
                'text' => ':money_with_wings: High-cost LLM request detected',
                'blocks' => [
                    [
                        'type' => 'section',
                        'text' => [
                            'type' => 'mrkdwn',
                            'text' => "*High-Cost Request*\n" .
                                      "*Model:* {$event->model}\n" .
                                      "*Cost:* {$event->getFormattedCost()}\n" .
                                      "*Tokens:* {$event->getTotalTokens()}\n" .
                                      "*Trace ID:* `{$event->traceId}`",
                        ],
                    ],
                ],
            ]);
        }
    }

    public function subscribe($events): array
    {
        return [
            LlmErrorOccurred::class => 'handleError',
            LlmResponseCompleted::class => 'handleHighCost',
        ];
    }
}
```

### User Credits System

Deduct credits from user accounts after successful LLM calls:

```php
<?php

namespace App\Listeners;

use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Mindwave\Mindwave\Observability\Events\LlmResponseCompleted;

class DeductUserCredits implements ShouldQueue
{
    public function handle(LlmResponseCompleted $event): void
    {
        // Get user from trace context (you'd add this to metadata)
        $userId = $event->getMetadata('user_id');

        if (!$userId) {
            return;
        }

        $user = User::find($userId);

        if (!$user) {
            return;
        }

        // Deduct credits based on token usage
        // Example: 1 credit per 1000 tokens
        $creditsToDeduct = ceil($event->getTotalTokens() / 1000);

        $user->decrement('credits', $creditsToDeduct);

        // Log the transaction
        $user->creditTransactions()->create([
            'amount' => -$creditsToDeduct,
            'description' => "LLM usage: {$event->model}",
            'trace_id' => $event->traceId,
            'tokens' => $event->getTotalTokens(),
        ]);
    }
}
```

### Custom Metrics

Send metrics to Prometheus, StatsD, or other monitoring systems:

```php
<?php

namespace App\Listeners;

use Prometheus\CollectorRegistry;
use Mindwave\Mindwave\Observability\Events\LlmResponseCompleted;

class RecordPrometheusMetrics
{
    private CollectorRegistry $registry;

    public function __construct(CollectorRegistry $registry)
    {
        $this->registry = $registry;
    }

    public function handle(LlmResponseCompleted $event): void
    {
        // Counter: Total LLM requests
        $counter = $this->registry->getOrRegisterCounter(
            'llm',
            'requests_total',
            'Total LLM requests',
            ['provider', 'model', 'operation']
        );
        $counter->inc([
            $event->provider,
            $event->model,
            $event->operation
        ]);

        // Histogram: Request duration
        $histogram = $this->registry->getOrRegisterHistogram(
            'llm',
            'request_duration_seconds',
            'LLM request duration',
            ['provider', 'model']
        );
        $histogram->observe(
            $event->getDurationInSeconds(),
            [$event->provider, $event->model]
        );

        // Histogram: Token usage
        $tokenHistogram = $this->registry->getOrRegisterHistogram(
            'llm',
            'tokens_total',
            'Total tokens used',
            ['provider', 'model', 'type']
        );
        $tokenHistogram->observe(
            $event->getInputTokens(),
            [$event->provider, $event->model, 'input']
        );
        $tokenHistogram->observe(
            $event->getOutputTokens(),
            [$event->provider, $event->model, 'output']
        );

        // Gauge: Estimated cost
        if ($event->hasCostEstimate()) {
            $gauge = $this->registry->getOrRegisterGauge(
                'llm',
                'cost_estimate_usd',
                'Estimated cost in USD',
                ['provider', 'model']
            );
            $gauge->set(
                $event->costEstimate,
                [$event->provider, $event->model]
            );
        }
    }
}
```

### Rate Limiting

Implement custom rate limiting based on LLM usage:

```php
<?php

namespace App\Listeners;

use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Cache;
use Mindwave\Mindwave\Observability\Events\LlmRequestStarted;
use Mindwave\Mindwave\Observability\Events\LlmResponseCompleted;

class EnforceLlmRateLimits
{
    public function handleStart(LlmRequestStarted $event): void
    {
        $userId = $event->parameters['user_id'] ?? null;

        if (!$userId) {
            return;
        }

        // Allow 100 requests per hour
        $key = "llm-requests:{$userId}";

        if (RateLimiter::tooManyAttempts($key, 100)) {
            throw new \Exception('Too many LLM requests. Please try again later.');
        }

        RateLimiter::hit($key, 3600); // 1 hour
    }

    public function handleCompletion(LlmResponseCompleted $event): void
    {
        $userId = $event->getMetadata('user_id');

        if (!$userId) {
            return;
        }

        // Track token usage per day
        $date = now()->format('Y-m-d');
        $key = "llm-tokens:{$userId}:{$date}";

        $currentTokens = Cache::get($key, 0);
        $newTokens = $currentTokens + $event->getTotalTokens();

        Cache::put($key, $newTokens, now()->endOfDay());

        // Alert if user exceeds daily quota (e.g., 100k tokens)
        if ($newTokens > 100_000) {
            // Send notification or throttle future requests
            event(new \App\Events\UserExceededTokenQuota($userId, $newTokens));
        }
    }

    public function subscribe($events): array
    {
        return [
            LlmRequestStarted::class => 'handleStart',
            LlmResponseCompleted::class => 'handleCompletion',
        ];
    }
}
```

### Real-Time Streaming UI

Build a real-time streaming interface using Server-Sent Events:

**Controller:**

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Event;
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\Observability\Events\LlmTokenStreamed;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ChatController extends Controller
{
    public function stream(Request $request)
    {
        $prompt = $request->input('prompt');

        return response()->stream(function () use ($prompt) {
            // Set up SSE headers
            header('Content-Type: text/event-stream');
            header('Cache-Control: no-cache');
            header('Connection: keep-alive');

            // Listen for token events
            $tokens = [];
            Event::listen(LlmTokenStreamed::class, function ($event) use (&$tokens) {
                $tokens[] = $event->delta;

                // Send SSE event to frontend
                echo "data: " . json_encode([
                    'delta' => $event->delta,
                    'cumulative_tokens' => $event->cumulativeTokens,
                    'is_final' => $event->isFinal(),
                ]) . "\n\n";

                ob_flush();
                flush();
            });

            // Generate streaming response
            $stream = Mindwave::streamText($prompt);

            // Consume the stream (events fire automatically)
            foreach ($stream as $delta) {
                // Tokens are sent via event listener above
            }

            // Send final event
            echo "data: " . json_encode(['done' => true]) . "\n\n";
            ob_flush();
            flush();
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}
```

**Frontend (JavaScript):**

```javascript
const eventSource = new EventSource(
    '/api/chat/stream?prompt=' + encodeURIComponent(prompt)
);

eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.done) {
        eventSource.close();
        return;
    }

    // Append delta to UI
    appendToChat(data.delta);

    // Update token counter
    updateTokenCount(data.cumulative_tokens);
};

eventSource.onerror = (error) => {
    console.error('Stream error:', error);
    eventSource.close();
};
```

### Analytics Integration

Send events to analytics platforms like Mixpanel or Segment:

```php
<?php

namespace App\Listeners;

use Illuminate\Contracts\Queue\ShouldQueue;
use Mindwave\Mindwave\Observability\Events\LlmResponseCompleted;
use Segment;

class TrackLlmAnalytics implements ShouldQueue
{
    public function handle(LlmResponseCompleted $event): void
    {
        $userId = $event->getMetadata('user_id');

        if (!$userId) {
            return;
        }

        Segment::track([
            'userId' => $userId,
            'event' => 'LLM Completion',
            'properties' => [
                'provider' => $event->provider,
                'model' => $event->model,
                'operation' => $event->operation,
                'input_tokens' => $event->getInputTokens(),
                'output_tokens' => $event->getOutputTokens(),
                'total_tokens' => $event->getTotalTokens(),
                'duration_ms' => $event->getDurationInMilliseconds(),
                'cost_usd' => $event->costEstimate,
                'used_cache' => $event->usedCache(),
                'tokens_per_second' => round($event->getTokensPerSecond(), 2),
            ],
        ]);
    }
}
```

## Testing with Events

Mindwave events integrate seamlessly with Laravel's event testing utilities:

### Basic Event Testing

```php
use Illuminate\Support\Facades\Event;
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\Observability\Events\LlmResponseCompleted;

test('fires LlmResponseCompleted event on success', function () {
    Event::fake([LlmResponseCompleted::class]);

    Mindwave::generateText('Hello, world!');

    Event::assertDispatched(LlmResponseCompleted::class);
});
```

### Testing Event Data

```php
test('event contains correct token usage data', function () {
    Event::fake();

    Mindwave::generateText('Test prompt');

    Event::assertDispatched(LlmResponseCompleted::class, function ($event) {
        return $event->model === 'gpt-4' &&
               $event->getTotalTokens() > 0 &&
               $event->hasCostEstimate();
    });
});
```

### Testing Event Listeners

```php
use App\Listeners\LogLlmCompletion;

test('LogLlmCompletion listener logs correctly', function () {
    Log::spy();

    $event = new LlmResponseCompleted(
        provider: 'openai',
        model: 'gpt-4',
        operation: 'chat',
        response: ['id' => 'test'],
        tokenUsage: ['input_tokens' => 10, 'output_tokens' => 20],
        duration: 1000000000,
        costEstimate: 0.0042,
        spanId: 'span-123',
        traceId: 'trace-456',
        timestamp: hrtime(true)
    );

    $listener = new LogLlmCompletion();
    $listener->handle($event);

    Log::shouldHaveReceived('info')
        ->once()
        ->with('LLM request completed', Mockery::any());
});
```

### Testing Streaming Events

```php
test('fires LlmTokenStreamed events during streaming', function () {
    Event::fake([LlmTokenStreamed::class]);

    $stream = Mindwave::streamText('Test prompt');

    // Consume the stream
    foreach ($stream as $delta) {
        // Events fire as stream is consumed
    }

    Event::assertDispatched(LlmTokenStreamed::class);

    // Verify multiple events were fired
    Event::assertDispatchedTimes(LlmTokenStreamed::class, function ($times) {
        return $times > 1;
    });
});
```

### Testing Error Events

```php
use Mindwave\Mindwave\Observability\Events\LlmErrorOccurred;

test('fires LlmErrorOccurred on API failure', function () {
    Event::fake([LlmErrorOccurred::class]);

    // Mock an API failure
    Http::fake([
        'api.openai.com/*' => Http::response([], 500),
    ]);

    expect(fn () => Mindwave::generateText('Test'))
        ->toThrow(Exception::class);

    Event::assertDispatched(LlmErrorOccurred::class, function ($event) {
        return str_contains($event->getMessage(), 'API error');
    });
});
```

## Streaming Events

Streaming responses fire events differently than standard requests:

### Event Flow for Streaming

1. **LlmRequestStarted** - Fired once when stream begins
2. **LlmTokenStreamed** - Fired for each token/chunk received
3. **LlmResponseCompleted** - Fired once when stream completes (or **LlmErrorOccurred** on failure)

### Tracking Progress

```php
use Mindwave\Mindwave\Observability\Events\LlmTokenStreamed;
use Illuminate\Support\Facades\Event;

Event::listen(LlmTokenStreamed::class, function ($event) {
    // Track streaming progress
    cache()->put(
        "stream-progress:{$event->traceId}",
        [
            'tokens' => $event->cumulativeTokens,
            'latest_delta' => $event->delta,
            'is_complete' => $event->isFinal(),
        ],
        now()->addMinutes(5)
    );
});
```

### Calculating Tokens Per Second

```php
Event::listen(LlmTokenStreamed::class, function ($event) {
    $startTime = cache()->get("stream-start:{$event->traceId}");

    if (!$startTime) {
        // First token - store start time
        cache()->put("stream-start:{$event->traceId}", $event->timestamp);
        return;
    }

    $elapsed = ($event->timestamp - $startTime) / 1_000_000_000; // nanoseconds to seconds
    $tokensPerSecond = $event->cumulativeTokens / $elapsed;

    logger()->debug("Streaming performance: {$tokensPerSecond} tokens/sec");
});
```

### Building Progress Bars

```php
use Mindwave\Mindwave\Observability\Events\LlmTokenStreamed;

$maxTokens = 1000; // Expected max tokens
$progressBar = null;

Event::listen(LlmTokenStreamed::class, function ($event) use (&$progressBar, $maxTokens) {
    if (!$progressBar) {
        $progressBar = new ProgressBar($maxTokens);
    }

    $progressBar->setProgress($event->cumulativeTokens);

    if ($event->isFinal()) {
        $progressBar->finish();
    }
});
```

## Performance Considerations

### Use Queued Listeners for Heavy Processing

Always use `ShouldQueue` for listeners that perform heavy operations:

```php
use Illuminate\Contracts\Queue\ShouldQueue;

class HeavyAnalyticsProcessor implements ShouldQueue
{
    public $queue = 'analytics'; // Use dedicated queue
    public $connection = 'redis';
    public $tries = 3;
    public $timeout = 120;

    public function handle(LlmResponseCompleted $event): void
    {
        // Heavy database queries, API calls, etc.
    }
}
```

### Batch Processing

For high-volume applications, batch process events:

```php
use Illuminate\Contracts\Queue\ShouldQueue;

class BatchLlmLogger implements ShouldQueue
{
    private const BATCH_SIZE = 100;

    public function handle(LlmResponseCompleted $event): void
    {
        // Add to batch
        $batch = cache()->get('llm-log-batch', []);
        $batch[] = $event->toArray();

        // Insert when batch is full
        if (count($batch) >= self::BATCH_SIZE) {
            DB::table('llm_logs')->insert($batch);
            cache()->forget('llm-log-batch');
        } else {
            cache()->put('llm-log-batch', $batch, now()->addMinutes(5));
        }
    }
}
```

### Selective Event Listening

Only listen to events you need:

```php
// ❌ Bad: Listen to all events even if not needed
Event::listen(LlmTokenStreamed::class, function ($event) {
    // Do nothing for most tokens
    if ($event->isFinal()) {
        // Only care about final token
    }
});

// ✅ Good: Filter in listener or use conditions
Event::listen(LlmTokenStreamed::class, function ($event) {
    // Early return for non-final tokens
    if (!$event->isFinal()) {
        return;
    }

    // Process final token
});
```

### Disable Events When Not Needed

For testing or batch operations where you don't need events:

```php
use Illuminate\Support\Facades\Event;

Event::fake(); // Disable all events

// or selectively fake specific events
Event::fake([
    LlmResponseCompleted::class,
]);

// Events won't be dispatched
Mindwave::generateText('Test');
```

### Memory Management for Streaming

Be cautious with memory when listening to streaming events:

```php
// ❌ Bad: Storing all deltas in memory
$allDeltas = [];
Event::listen(LlmTokenStreamed::class, function ($event) use (&$allDeltas) {
    $allDeltas[] = $event->delta; // Memory grows with each token
});

// ✅ Good: Process deltas immediately
Event::listen(LlmTokenStreamed::class, function ($event) {
    // Send to frontend immediately
    broadcast(new TokenReceived($event->delta));

    // Or write to stream
    fwrite($stream, $event->delta);
});
```

## Best Practices

### 1. Keep Listeners Focused

Each listener should have a single responsibility:

```php
// ❌ Bad: One listener doing too much
class LlmEventHandler
{
    public function handle(LlmResponseCompleted $event)
    {
        $this->logToDatabase($event);
        $this->sendToAnalytics($event);
        $this->updateUserCredits($event);
        $this->sendSlackNotification($event);
        // Too many responsibilities!
    }
}

// ✅ Good: Separate listeners for each concern
class LogLlmToDatabase { /* ... */ }
class SendLlmToAnalytics implements ShouldQueue { /* ... */ }
class UpdateUserCredits implements ShouldQueue { /* ... */ }
class NotifySlackOnHighCost implements ShouldQueue { /* ... */ }
```

### 2. Handle Errors Gracefully

Never let listener errors crash your application:

```php
class SafeLlmLogger
{
    public function handle(LlmResponseCompleted $event): void
    {
        try {
            // Logging logic
            DB::table('llm_logs')->insert($event->toArray());
        } catch (\Throwable $e) {
            // Log the error but don't crash
            report($e);

            // Optionally retry with exponential backoff
            if ($this->attempts() < 3) {
                $this->release(60 * $this->attempts());
            }
        }
    }
}
```

### 3. Use Type Hints

Always type hint event parameters for better IDE support:

```php
use Mindwave\Mindwave\Observability\Events\LlmResponseCompleted;

Event::listen(LlmResponseCompleted::class, function (LlmResponseCompleted $event) {
    // Full IDE autocomplete for $event->
    $tokens = $event->getTotalTokens();
});
```

### 4. Document Event Dependencies

Make event dependencies explicit in listener constructors:

```php
class StoreLlmAnalytics implements ShouldQueue
{
    private AnalyticsService $analytics;

    public function __construct(AnalyticsService $analytics)
    {
        $this->analytics = $analytics;
    }

    public function handle(LlmResponseCompleted $event): void
    {
        $this->analytics->track('llm_completion', $event->toArray());
    }
}
```

### 5. Consider Privacy

Be mindful of sensitive data in events:

```php
public function handle(LlmRequestStarted $event): void
{
    // Messages might contain PII
    if ($event->hasMessages()) {
        // Only log if explicitly configured
        if (config('app.log_llm_messages')) {
            Log::debug('Messages', $event->messages);
        }
    }

    // Safe to log metadata
    Log::info('Request started', [
        'model' => $event->model,
        'trace_id' => $event->traceId,
    ]);
}
```

### 6. Test Event Listeners

Write tests for all custom listeners:

```php
test('StoreLlmLog creates database record', function () {
    $event = new LlmResponseCompleted(/* ... */);

    $listener = new StoreLlmLog();
    $listener->handle($event);

    expect(DB::table('llm_logs')->count())->toBe(1);

    $log = DB::table('llm_logs')->first();
    expect($log->model)->toBe($event->model);
    expect($log->total_tokens)->toBe($event->getTotalTokens());
});
```

### 7. Use Events for Cross-Cutting Concerns

Events are perfect for cross-cutting concerns that shouldn't be in core business logic:

-   Logging and monitoring
-   Analytics and metrics
-   Notifications and alerts
-   Quota and rate limiting
-   Audit trails
-   External integrations

### 8. Avoid Circular Dependencies

Be careful not to trigger LLM calls inside LLM event listeners:

```php
// ❌ Dangerous: Could cause infinite loop
Event::listen(LlmResponseCompleted::class, function ($event) {
    // This triggers another LLM call, which fires another event...
    Mindwave::generateText('Analyze this: ' . $event->response);
});

// ✅ Safe: Process data without triggering new LLM calls
Event::listen(LlmResponseCompleted::class, function ($event) {
    // Safe operations: database, logging, HTTP calls
    DB::table('analytics')->insert($event->toArray());
});
```

## Event Configuration

The built-in `TraceEventSubscriber` respects configuration options:

```php
// config/mindwave-llm.php
return [
    'tracing' => [
        // Enable/disable event logging
        'log_events' => env('MINDWAVE_LOG_EVENTS', false),

        // Slow request threshold (milliseconds)
        'slow_threshold_ms' => env('MINDWAVE_SLOW_THRESHOLD_MS', 5000),

        // High cost threshold (USD)
        'cost_threshold' => env('MINDWAVE_COST_THRESHOLD', 0.1),
    ],
];
```

When `log_events` is enabled, Mindwave automatically logs:

-   All request starts (debug level)
-   All completions with token/cost data (info level)
-   Slow requests exceeding threshold (warning level)
-   High-cost requests exceeding threshold (warning level)
-   All errors (error level)

## Summary

Mindwave's event system provides powerful hooks into the LLM lifecycle:

-   **Four core events**: LlmRequestStarted, LlmResponseCompleted, LlmErrorOccurred, LlmTokenStreamed
-   **Rich event data**: Tokens, costs, performance metrics, trace context
-   **Laravel integration**: Standard event listeners, queued processing, Event::fake()
-   **Real-world use cases**: Logging, monitoring, analytics, credits, rate limiting, streaming UIs
-   **Production-ready**: Async processing, error handling, batching, memory management

Use events to build robust, observable LLM-powered applications without coupling your monitoring and business logic to core Mindwave functionality.

## Related Documentation

-   [Tracing](/docs/observability/tracing) - OpenTelemetry distributed tracing
-   [Cost Tracking](/docs/observability/cost-tracking) - Track and analyze LLM costs
-   [Testing](/docs/advanced/testing) - Testing with Event::fake()
