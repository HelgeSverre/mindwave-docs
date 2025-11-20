# Advanced Function Calling

Function calling unlocks AI agents that don't just respond with text but take real actions in your application. This guide explores advanced patterns, error handling strategies, and complex orchestration techniques for building production-ready function calling systems.

## Overview

### What You'll Learn

This guide covers advanced function calling patterns beyond basic tool usage:

- **Multi-turn Conversations** - Chain multiple function calls together
- **Parallel Execution** - Execute multiple tools simultaneously
- **Error Handling** - Gracefully handle failures and retry strategies
- **Conditional Logic** - Dynamic tool selection based on context
- **State Management** - Maintain state across function calls
- **Agent Orchestration** - Build complex multi-step workflows
- **Security Patterns** - Safely execute untrusted function calls
- **Performance Optimization** - Cache, batch, and optimize tool execution

### Prerequisites

This guide assumes you understand:
- [Basic function calling and tools](/docs/advanced/tools)
- [FunctionBuilder API](/docs/advanced/tools#using-tools-with-function-calling)
- PHP closures and callables
- Laravel's service container and facades

## Multi-Turn Function Calling

Most real-world tasks require multiple function calls. The LLM calls functions, processes results, and decides what to do next.

### Basic Multi-Turn Pattern

```php
use Mindwave\Mindwave\Facades\LLM;
use Mindwave\Mindwave\LLM\FunctionCalling\FunctionBuilder;
use Mindwave\Mindwave\LLM\FunctionCalling\FunctionCall;

$functions = FunctionBuilder::make()
    ->addFunction(
        name: 'get_user',
        description: 'Retrieves user by email',
        closure: fn(string $email) => User::where('email', $email)->first()?->toJson() ?? 'User not found'
    )
    ->addFunction(
        name: 'get_orders',
        description: 'Retrieves orders for a user ID',
        closure: fn(int $userId) => Order::where('user_id', $userId)->get()->toJson()
    )
    ->addFunction(
        name: 'calculate_total',
        description: 'Calculates total amount from orders JSON',
        closure: function(string $ordersJson) {
            $orders = json_decode($ordersJson, true);
            return array_sum(array_column($orders, 'total'));
        }
    );

// Multi-turn execution
$messages = [
    ['role' => 'user', 'content' => 'What is the total order value for user john@example.com?']
];

$maxTurns = 10;
$turn = 0;

while ($turn < $maxTurns) {
    $response = LLM::driver('openai')->functionCall(
        json_encode($messages),
        $functions
    );

    // Check if we got a final text response
    if (is_string($response)) {
        echo "Final answer: {$response}";
        break;
    }

    // Execute the function
    if ($response instanceof FunctionCall) {
        Log::info("Turn {$turn}: Calling {$response->name}", $response->arguments);

        // Execute based on function name
        $result = match($response->name) {
            'get_user' => (fn() => User::where('email', $response->arguments['email'])->first()?->toJson() ?? 'User not found')(),
            'get_orders' => (fn() => Order::where('user_id', $response->arguments['userId'])->get()->toJson())(),
            'calculate_total' => (fn() => json_decode($response->arguments['ordersJson'], true) |> array_sum(array_column($_, 'total')))(),
            default => json_encode(['error' => 'Unknown function'])
        };

        // Add function call and result to conversation history
        $messages[] = [
            'role' => 'assistant',
            'function_call' => [
                'name' => $response->name,
                'arguments' => $response->rawArguments
            ]
        ];
        $messages[] = [
            'role' => 'function',
            'name' => $response->name,
            'content' => $result
        ];
    }

    $turn++;
}

if ($turn >= $maxTurns) {
    Log::warning('Max turns reached without completion');
}
```

**How it works:**
1. User asks a complex question requiring multiple steps
2. LLM calls `get_user('john@example.com')` → Gets user ID
3. LLM calls `get_orders(userId: 123)` → Gets order data
4. LLM calls `calculate_total(ordersJson)` → Computes total
5. LLM returns final formatted answer to user

### Conversation State Management

Track conversation state for complex interactions:

```php
class ConversationManager
{
    protected array $messages = [];
    protected array $executedFunctions = [];
    protected int $totalCost = 0;

    public function __construct(
        protected FunctionBuilder $functions,
        protected string $driver = 'openai'
    ) {}

    public function execute(string $userMessage, int $maxTurns = 10): string
    {
        $this->messages[] = ['role' => 'user', 'content' => $userMessage];

        for ($turn = 0; $turn < $maxTurns; $turn++) {
            $response = LLM::driver($this->driver)
                ->functionCall(json_encode($this->messages), $this->functions);

            // Track costs (if tracing enabled)
            $this->totalCost += $this->estimateTokenCost($response);

            if (is_string($response)) {
                return $response; // Final answer
            }

            if ($response instanceof FunctionCall) {
                $result = $this->executeFunction($response);

                $this->executedFunctions[] = [
                    'name' => $response->name,
                    'arguments' => $response->arguments,
                    'result' => $result,
                    'turn' => $turn,
                ];

                $this->messages[] = [
                    'role' => 'assistant',
                    'function_call' => [
                        'name' => $response->name,
                        'arguments' => $response->rawArguments,
                    ],
                ];

                $this->messages[] = [
                    'role' => 'function',
                    'name' => $response->name,
                    'content' => $result,
                ];
            }
        }

        throw new \RuntimeException('Maximum turns exceeded without completion');
    }

    protected function executeFunction(FunctionCall $call): string
    {
        // Execute function through function builder
        $functions = $this->functions->build();

        foreach ($functions as $func) {
            if ($func['name'] === $call->name) {
                return ($func['function'])(...array_values($call->arguments));
            }
        }

        return json_encode(['error' => 'Function not found']);
    }

    public function getExecutionTrace(): array
    {
        return [
            'turns' => count($this->executedFunctions),
            'functions_called' => array_column($this->executedFunctions, 'name'),
            'estimated_cost' => $this->totalCost,
            'full_trace' => $this->executedFunctions,
        ];
    }

    protected function estimateTokenCost($response): int
    {
        // Implement token cost estimation
        return 0; // Placeholder
    }
}

// Usage
$manager = new ConversationManager($functions);
$answer = $manager->execute('What are the top 3 orders for john@example.com?');

echo $answer;
print_r($manager->getExecutionTrace());
```

## Parallel Function Execution

Some LLMs can request multiple function calls simultaneously. Handle them efficiently:

### Detecting Parallel Calls

```php
$response = LLM::driver('openai')->functionCall($prompt, $functions);

// OpenAI may return multiple tool calls
if (is_array($response)) {
    // Parallel execution requested
    $results = [];

    foreach ($response as $call) {
        if ($call instanceof FunctionCall) {
            $results[] = $this->executeFunction($call);
        }
    }

    // Return all results to LLM
    return $results;
}
```

### Concurrent Execution with Laravel

Execute multiple functions concurrently for better performance:

```php
use Illuminate\Support\Facades\ParallelTesting;
use Illuminate\Support\Arr;

class ParallelFunctionExecutor
{
    public function executeConcurrent(array $functionCalls): array
    {
        // Group by execution speed (fast vs slow)
        $fast = [];
        $slow = [];

        foreach ($functionCalls as $call) {
            if ($this->isFastFunction($call->name)) {
                $fast[] = $call;
            } else {
                $slow[] = $call;
            }
        }

        // Execute fast functions synchronously
        $fastResults = array_map(fn($call) => $this->execute($call), $fast);

        // Execute slow functions concurrently using queues
        $slowResults = $this->executeConcurrentlyWithQueues($slow);

        return array_merge($fastResults, $slowResults);
    }

    protected function executeConcurrentlyWithQueues(array $calls): array
    {
        if (empty($calls)) {
            return [];
        }

        $jobIds = [];

        foreach ($calls as $call) {
            $jobId = Str::uuid()->toString();
            $jobIds[] = $jobId;

            ExecuteFunctionJob::dispatch($call, $jobId);
        }

        // Poll for results (or use Redis pub/sub)
        return $this->waitForResults($jobIds);
    }

    protected function isFastFunction(string $name): bool
    {
        // Define which functions are fast (in-memory operations)
        return in_array($name, ['calculate_total', 'format_date', 'validate_input']);
    }
}
```

### Promise-Based Parallel Execution

For truly parallel execution within a single request:

```php
use React\Promise\Promise;
use React\Promise\PromiseInterface;

class PromiseBasedExecutor
{
    public function executeParallel(array $functionCalls): array
    {
        $promises = [];

        foreach ($functionCalls as $call) {
            $promises[] = $this->executeAsync($call);
        }

        // Wait for all promises to resolve
        return \React\Promise\all($promises)->then(function ($results) {
            return $results;
        })->wait();
    }

    protected function executeAsync(FunctionCall $call): PromiseInterface
    {
        return new Promise(function ($resolve, $reject) use ($call) {
            try {
                $result = $this->execute($call);
                $resolve($result);
            } catch (\Exception $e) {
                $reject($e);
            }
        });
    }
}
```

## Error Handling and Recovery

Production systems need robust error handling for function calls.

### Graceful Error Handling

```php
class ResilientFunctionExecutor
{
    public function execute(FunctionCall $call): string
    {
        try {
            // Validate arguments before execution
            $this->validateArguments($call);

            // Execute with timeout
            $result = $this->executeWithTimeout($call, timeout: 30);

            // Validate result format
            $this->validateResult($result);

            return $result;

        } catch (ValidationException $e) {
            // Return validation error to LLM
            return json_encode([
                'error' => 'validation_failed',
                'message' => $e->getMessage(),
                'hint' => 'Please check the parameter format and try again'
            ]);

        } catch (TimeoutException $e) {
            // Function took too long
            return json_encode([
                'error' => 'timeout',
                'message' => 'Function execution exceeded time limit',
                'hint' => 'Try breaking the request into smaller parts'
            ]);

        } catch (\Exception $e) {
            // Log unexpected errors
            Log::error('Function execution failed', [
                'function' => $call->name,
                'arguments' => $call->arguments,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return json_encode([
                'error' => 'execution_failed',
                'message' => 'An unexpected error occurred',
                'function' => $call->name,
            ]);
        }
    }

    protected function validateArguments(FunctionCall $call): void
    {
        // Implement argument validation based on function schema
        $schema = $this->getFunctionSchema($call->name);

        foreach ($schema['required'] ?? [] as $param) {
            if (!isset($call->arguments[$param])) {
                throw new ValidationException("Missing required parameter: {$param}");
            }
        }
    }

    protected function executeWithTimeout(FunctionCall $call, int $timeout): string
    {
        // Use pcntl or process timeout for long-running operations
        $start = time();
        $result = $this->doExecute($call);

        if (time() - $start > $timeout) {
            throw new TimeoutException('Execution time exceeded');
        }

        return $result;
    }

    protected function validateResult(string $result): void
    {
        // Ensure result is valid JSON
        $decoded = json_decode($result, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new ValidationException('Result is not valid JSON');
        }
    }
}
```

### Retry Strategies

Implement intelligent retry logic for transient failures:

```php
class RetryableFunctionExecutor
{
    protected int $maxRetries = 3;
    protected int $baseDelay = 1000; // milliseconds

    public function executeWithRetry(FunctionCall $call): string
    {
        $attempt = 0;
        $lastException = null;

        while ($attempt < $this->maxRetries) {
            try {
                return $this->execute($call);

            } catch (TransientException $e) {
                // Retry on transient errors (network, rate limits, etc.)
                $lastException = $e;
                $attempt++;

                if ($attempt < $this->maxRetries) {
                    $delay = $this->calculateBackoff($attempt);
                    Log::warning("Function call failed, retrying in {$delay}ms", [
                        'function' => $call->name,
                        'attempt' => $attempt,
                        'error' => $e->getMessage(),
                    ]);

                    usleep($delay * 1000);
                }

            } catch (\Exception $e) {
                // Don't retry on permanent errors
                throw $e;
            }
        }

        // All retries exhausted
        throw new \RuntimeException(
            "Function execution failed after {$this->maxRetries} attempts",
            0,
            $lastException
        );
    }

    protected function calculateBackoff(int $attempt): int
    {
        // Exponential backoff with jitter
        $exponential = $this->baseDelay * (2 ** ($attempt - 1));
        $jitter = rand(0, (int)($exponential * 0.1));

        return $exponential + $jitter;
    }

    protected function isTransientError(\Exception $e): bool
    {
        // Determine if error is retryable
        return $e instanceof NetworkException
            || $e instanceof RateLimitException
            || $e instanceof TimeoutException
            || str_contains($e->getMessage(), 'temporary');
    }
}
```

### Circuit Breaker Pattern

Prevent cascading failures when a function repeatedly fails:

```php
use Illuminate\Support\Facades\Cache;

class CircuitBreaker
{
    protected int $failureThreshold = 5;
    protected int $recoveryTimeout = 60; // seconds

    public function execute(string $functionName, callable $callable): mixed
    {
        $key = "circuit_breaker:{$functionName}";

        // Check if circuit is open
        if (Cache::has("{$key}:open")) {
            throw new CircuitBreakerOpenException(
                "Circuit breaker is open for function: {$functionName}"
            );
        }

        try {
            $result = $callable();

            // Reset failure count on success
            Cache::forget("{$key}:failures");

            return $result;

        } catch (\Exception $e) {
            // Increment failure count
            $failures = Cache::increment("{$key}:failures", 1, now()->addMinutes(5));

            if ($failures >= $this->failureThreshold) {
                // Open circuit
                Cache::put("{$key}:open", true, $this->recoveryTimeout);

                Log::error("Circuit breaker opened for function: {$functionName}", [
                    'failures' => $failures,
                    'recovery_timeout' => $this->recoveryTimeout,
                ]);
            }

            throw $e;
        }
    }
}

// Usage
$breaker = new CircuitBreaker();

try {
    $result = $breaker->execute('external_api_call', function() use ($call) {
        return $this->executeFunction($call);
    });
} catch (CircuitBreakerOpenException $e) {
    // Provide fallback response
    return json_encode([
        'error' => 'service_unavailable',
        'message' => 'This function is temporarily unavailable',
        'retry_after' => 60,
    ]);
}
```

## Conditional Logic and Dynamic Tool Selection

Build agents that adapt tool usage based on context and state.

### Context-Aware Function Selection

```php
class ContextAwareFunctionBuilder
{
    public function buildForUser(User $user): FunctionBuilder
    {
        $functions = FunctionBuilder::make();

        // Base functions available to all users
        $functions->addFunction(
            name: 'get_profile',
            description: 'Get user profile information',
            closure: fn() => $user->toJson()
        );

        // Admin-only functions
        if ($user->isAdmin()) {
            $functions->addFunction(
                name: 'delete_user',
                description: 'Delete a user account',
                closure: fn(int $userId) => User::destroy($userId)
            );

            $functions->addFunction(
                name: 'view_all_orders',
                description: 'View all orders in the system',
                closure: fn() => Order::all()->toJson()
            );
        }

        // Premium user functions
        if ($user->isPremium()) {
            $functions->addFunction(
                name: 'export_data',
                description: 'Export user data in various formats',
                closure: fn(string $format) => $this->exportData($user, $format)
            );
        }

        // Rate-limited functions
        if ($this->checkRateLimit($user)) {
            $functions->addFunction(
                name: 'generate_report',
                description: 'Generate detailed analytics report',
                closure: fn(array $params) => $this->generateReport($user, $params)
            );
        }

        return $functions;
    }
}
```

### State-Based Tool Availability

```php
class StatefulAgent
{
    protected array $state = [];
    protected array $availableTools = [];

    public function __construct(protected FunctionBuilder $baseFunctions)
    {
        $this->availableTools = $this->baseFunctions->build();
    }

    public function execute(string $message): string
    {
        // Update available tools based on current state
        $this->updateAvailableTools();

        $functions = $this->getCurrentFunctions();

        $response = LLM::driver('openai')->functionCall($message, $functions);

        if ($response instanceof FunctionCall) {
            $result = $this->executeAndUpdateState($response);
            return $result;
        }

        return $response;
    }

    protected function updateAvailableTools(): void
    {
        // Example: Only allow checkout after cart has items
        if (!empty($this->state['cart'])) {
            $this->availableTools[] = [
                'name' => 'checkout',
                'description' => 'Process order and payment',
                'function' => fn() => $this->checkout(),
            ];
        }

        // Example: Only allow refund after purchase
        if (isset($this->state['order_id'])) {
            $this->availableTools[] = [
                'name' => 'request_refund',
                'description' => 'Request refund for order',
                'function' => fn() => $this->requestRefund($this->state['order_id']),
            ];
        }
    }

    protected function executeAndUpdateState(FunctionCall $call): string
    {
        $result = $this->execute($call);

        // Update state based on function execution
        match($call->name) {
            'add_to_cart' => $this->state['cart'][] = $call->arguments['product_id'],
            'checkout' => $this->state['order_id'] = json_decode($result, true)['order_id'],
            'clear_cart' => $this->state['cart'] = [],
            default => null,
        };

        return $result;
    }
}
```

## Advanced Patterns

### Function Call Chaining with Pipelines

Create reusable function call pipelines:

```php
class FunctionPipeline
{
    protected array $stages = [];

    public function add(string $name, callable $function): self
    {
        $this->stages[] = compact('name', 'function');
        return $this;
    }

    public function execute($input): mixed
    {
        $output = $input;

        foreach ($this->stages as $stage) {
            Log::info("Pipeline stage: {$stage['name']}");

            $output = ($stage['function'])($output);

            if ($output instanceof PipelineBreak) {
                return $output->value;
            }
        }

        return $output;
    }
}

// Usage: Data enrichment pipeline
$pipeline = (new FunctionPipeline())
    ->add('fetch_user', fn($email) => User::where('email', $email)->first())
    ->add('fetch_orders', fn($user) => Order::where('user_id', $user->id)->get())
    ->add('calculate_lifetime_value', fn($orders) => $orders->sum('total'))
    ->add('format_currency', fn($value) => '$' . number_format($value, 2));

$ltv = $pipeline->execute('john@example.com');
// Output: "$1,234.56"
```

### Function Call Memoization

Cache expensive function results:

```php
class MemoizedFunctionExecutor
{
    public function execute(FunctionCall $call): string
    {
        $cacheKey = $this->getCacheKey($call);
        $ttl = $this->getTtl($call->name);

        return Cache::remember($cacheKey, $ttl, function() use ($call) {
            return $this->doExecute($call);
        });
    }

    protected function getCacheKey(FunctionCall $call): string
    {
        return sprintf(
            'func:%s:%s',
            $call->name,
            md5(json_encode($call->arguments))
        );
    }

    protected function getTtl(string $functionName): int
    {
        // Different TTLs for different functions
        return match($functionName) {
            'get_weather' => 1800,      // 30 minutes
            'get_stock_price' => 60,    // 1 minute
            'get_user' => 300,          // 5 minutes
            default => 600,             // 10 minutes
        };
    }
}
```

### Hierarchical Function Calling

Organize functions into hierarchies for complex domains:

```php
class HierarchicalFunctionExecutor
{
    protected array $namespaces = [];

    public function registerNamespace(string $namespace, array $functions): void
    {
        $this->namespaces[$namespace] = $functions;
    }

    public function execute(string $qualifiedName, array $arguments): string
    {
        [$namespace, $function] = explode('.', $qualifiedName, 2);

        if (!isset($this->namespaces[$namespace][$function])) {
            throw new \RuntimeException("Function not found: {$qualifiedName}");
        }

        return ($this->namespaces[$namespace][$function])(...$arguments);
    }
}

// Usage
$executor = new HierarchicalFunctionExecutor();

$executor->registerNamespace('user', [
    'get' => fn($id) => User::find($id)->toJson(),
    'create' => fn($data) => User::create($data)->toJson(),
    'delete' => fn($id) => User::destroy($id),
]);

$executor->registerNamespace('order', [
    'get' => fn($id) => Order::find($id)->toJson(),
    'create' => fn($data) => Order::create($data)->toJson(),
    'cancel' => fn($id) => Order::find($id)->update(['status' => 'cancelled']),
]);

// Call: user.get(123) or order.create({...})
$result = $executor->execute('user.get', [123]);
```

## Security Considerations

Secure your function calling implementations against abuse and attacks.

### Input Validation and Sanitization

```php
class SecureFunctionExecutor
{
    protected array $allowedFunctions = [];

    public function execute(FunctionCall $call): string
    {
        // 1. Whitelist validation
        if (!$this->isAllowedFunction($call->name)) {
            throw new SecurityException("Function not allowed: {$call->name}");
        }

        // 2. Sanitize inputs
        $sanitized = $this->sanitizeArguments($call->arguments);

        // 3. Validate argument types
        $this->validateArgumentTypes($call->name, $sanitized);

        // 4. Check permissions
        $this->checkPermissions($call->name);

        // 5. Rate limiting
        $this->enforceRateLimit($call->name);

        // 6. Execute safely
        return $this->executeInSandbox($call->name, $sanitized);
    }

    protected function sanitizeArguments(array $arguments): array
    {
        return array_map(function ($value) {
            if (is_string($value)) {
                // Prevent SQL injection
                $value = strip_tags($value);

                // Prevent path traversal
                $value = str_replace(['../', '..\\'], '', $value);

                // Prevent command injection
                $value = escapeshellarg($value);
            }

            return $value;
        }, $arguments);
    }

    protected function enforceRateLimit(string $functionName): void
    {
        $key = 'rate_limit:' . request()->ip() . ':' . $functionName;

        if (RateLimiter::tooManyAttempts($key, 10)) {
            throw new RateLimitException('Too many requests for function: ' . $functionName);
        }

        RateLimiter::hit($key, 60);
    }
}
```

### Sandboxed Execution

Execute untrusted functions in isolated environments:

```php
class SandboxedExecutor
{
    public function execute(FunctionCall $call): string
    {
        // Execute in separate process with timeout
        $process = new Process([
            'php',
            base_path('scripts/execute_function.php'),
            $call->name,
            json_encode($call->arguments)
        ], timeout: 30);

        $process->run();

        if (!$process->isSuccessful()) {
            throw new \RuntimeException('Sandboxed execution failed: ' . $process->getErrorOutput());
        }

        return $process->getOutput();
    }
}
```

### Audit Logging

Track all function executions for security and compliance:

```php
class AuditedFunctionExecutor
{
    public function execute(FunctionCall $call): string
    {
        $auditId = Str::uuid();

        // Log before execution
        Log::info('Function execution started', [
            'audit_id' => $auditId,
            'function' => $call->name,
            'arguments' => $this->sanitizeForLogging($call->arguments),
            'user_id' => auth()->id(),
            'ip' => request()->ip(),
            'timestamp' => now()->toIso8601String(),
        ]);

        try {
            $result = $this->doExecute($call);

            // Log success
            Log::info('Function execution completed', [
                'audit_id' => $auditId,
                'function' => $call->name,
                'success' => true,
            ]);

            return $result;

        } catch (\Exception $e) {
            // Log failure
            Log::error('Function execution failed', [
                'audit_id' => $auditId,
                'function' => $call->name,
                'error' => $e->getMessage(),
                'success' => false,
            ]);

            throw $e;
        }
    }

    protected function sanitizeForLogging(array $arguments): array
    {
        // Remove sensitive data from logs
        $sensitive = ['password', 'token', 'api_key', 'secret'];

        return array_map(function ($key, $value) use ($sensitive) {
            if (in_array($key, $sensitive)) {
                return '[REDACTED]';
            }
            return $value;
        }, array_keys($arguments), $arguments);
    }
}
```

## Performance Optimization

Optimize function calling for production workloads.

### Function Result Caching

```php
class CachingFunctionExecutor
{
    protected array $cacheConfig = [];

    public function setCacheConfig(string $functionName, int $ttl, ?callable $keyGenerator = null): void
    {
        $this->cacheConfig[$functionName] = compact('ttl', 'keyGenerator');
    }

    public function execute(FunctionCall $call): string
    {
        if (!isset($this->cacheConfig[$call->name])) {
            return $this->doExecute($call);
        }

        $config = $this->cacheConfig[$call->name];
        $key = $config['keyGenerator']
            ? ($config['keyGenerator'])($call)
            : $this->defaultCacheKey($call);

        return Cache::remember($key, $config['ttl'], function() use ($call) {
            return $this->doExecute($call);
        });
    }

    protected function defaultCacheKey(FunctionCall $call): string
    {
        return sprintf(
            'func_cache:%s:%s',
            $call->name,
            md5(json_encode($call->arguments))
        );
    }
}

// Configuration
$executor = new CachingFunctionExecutor();

$executor->setCacheConfig(
    'get_weather',
    ttl: 1800,
    keyGenerator: fn($call) => "weather:{$call->arguments['city']}"
);

$executor->setCacheConfig('get_stock_price', ttl: 60);
```

### Batch Function Execution

Execute multiple independent functions in batches:

```php
class BatchFunctionExecutor
{
    public function executeBatch(array $functionCalls): array
    {
        // Group by function name for potential optimization
        $grouped = collect($functionCalls)->groupBy(fn($call) => $call->name);

        $results = [];

        foreach ($grouped as $functionName => $calls) {
            if ($this->supportsBatchExecution($functionName)) {
                // Execute all at once
                $batchResults = $this->executeBatchOptimized($functionName, $calls);
                $results = array_merge($results, $batchResults);
            } else {
                // Execute individually
                foreach ($calls as $call) {
                    $results[] = $this->execute($call);
                }
            }
        }

        return $results;
    }

    protected function executeBatchOptimized(string $functionName, $calls): array
    {
        // Example: Batch database queries
        if ($functionName === 'get_user') {
            $ids = collect($calls)->pluck('arguments.id')->toArray();
            $users = User::whereIn('id', $ids)->get()->keyBy('id');

            return collect($calls)->map(function($call) use ($users) {
                $user = $users->get($call->arguments['id']);
                return $user ? $user->toJson() : json_encode(['error' => 'User not found']);
            })->toArray();
        }

        // Fallback to individual execution
        return array_map(fn($call) => $this->execute($call), $calls);
    }
}
```

### Lazy Function Evaluation

Defer expensive function execution until results are needed:

```php
class LazyFunctionCall
{
    protected ?string $result = null;

    public function __construct(
        protected FunctionCall $call,
        protected FunctionExecutor $executor
    ) {}

    public function get(): string
    {
        if ($this->result === null) {
            $this->result = $this->executor->execute($this->call);
        }

        return $this->result;
    }

    public function isEvaluated(): bool
    {
        return $this->result !== null;
    }
}

// Usage
$lazyCall = new LazyFunctionCall($functionCall, $executor);

// Result not computed yet
if (some_condition()) {
    // Only evaluate if needed
    $result = $lazyCall->get();
}
```

## Best Practices

### 1. Clear Function Boundaries

Design functions with single, well-defined purposes:

```php
// Bad: Function does too much
$functions->addFunction(
    name: 'manage_user',
    description: 'Creates, updates, or deletes users',
    closure: fn($action, $data) => match($action) {
        'create' => User::create($data),
        'update' => User::find($data['id'])->update($data),
        'delete' => User::destroy($data['id']),
    }
);

// Good: Separate functions for each action
$functions->addFunction(
    name: 'create_user',
    description: 'Creates a new user account',
    closure: fn(array $data) => User::create($data)->toJson()
);

$functions->addFunction(
    name: 'update_user',
    description: 'Updates an existing user account',
    closure: fn(int $id, array $data) => User::find($id)->update($data)
);

$functions->addFunction(
    name: 'delete_user',
    description: 'Deletes a user account',
    closure: fn(int $id) => User::destroy($id)
);
```

### 2. Idempotent Functions

Design functions to be safely retryable:

```php
// Bad: Non-idempotent
$functions->addFunction(
    name: 'increment_counter',
    closure: fn() => Counter::increment()
);

// Good: Idempotent with unique key
$functions->addFunction(
    name: 'increment_counter',
    closure: function(string $requestId) {
        if (Cache::has("counter_increment:{$requestId}")) {
            return Cache::get("counter_increment:{$requestId}");
        }

        $newValue = Counter::increment();
        Cache::put("counter_increment:{$requestId}", $newValue, 3600);

        return $newValue;
    }
);
```

### 3. Comprehensive Error Messages

Provide helpful error messages for the LLM:

```php
try {
    $user = User::where('email', $email)->firstOrFail();
} catch (ModelNotFoundException $e) {
    return json_encode([
        'success' => false,
        'error' => 'user_not_found',
        'message' => "No user found with email: {$email}",
        'suggestion' => 'Try checking the email address for typos or use the search_users function to find similar emails',
        'available_actions' => ['search_users', 'list_all_users']
    ]);
}
```

### 4. Function Documentation

Document functions thoroughly for better LLM understanding:

```php
$functions->addFunction(
    name: 'search_products',
    description: 'Searches for products in the catalog.

        Parameters:
        - query: Search term (required)
        - category: Filter by category (optional)
        - minPrice: Minimum price filter (optional)
        - maxPrice: Maximum price filter (optional)
        - inStock: Only show in-stock items (optional, default: false)

        Returns: JSON array of matching products with id, name, price, and stock.

        Examples:
        - search_products(query="laptop", category="electronics")
        - search_products(query="shirt", minPrice=20, maxPrice=50, inStock=true)',
    closure: function(string $query, ?string $category = null, ?float $minPrice = null, ?float $maxPrice = null, bool $inStock = false) {
        return Product::search($query, compact('category', 'minPrice', 'maxPrice', 'inStock'));
    }
);
```

### 5. Monitor and Alert

Track function execution metrics:

```php
class MonitoredFunctionExecutor
{
    public function execute(FunctionCall $call): string
    {
        $start = microtime(true);
        $success = false;

        try {
            $result = $this->doExecute($call);
            $success = true;
            return $result;

        } catch (\Exception $e) {
            throw $e;

        } finally {
            $duration = microtime(true) - $start;

            // Record metrics
            Metrics::record('function.execution.duration', $duration, [
                'function' => $call->name,
                'success' => $success,
            ]);

            // Alert on slow executions
            if ($duration > 5.0) {
                Alert::send("Slow function execution: {$call->name} took {$duration}s");
            }

            // Alert on high failure rates
            $failureRate = $this->getRecentFailureRate($call->name);
            if ($failureRate > 0.2) {
                Alert::send("High failure rate for {$call->name}: {$failureRate}%");
            }
        }
    }
}
```

## Common Pitfalls

### 1. Unbounded Recursion

Prevent infinite loops in multi-turn conversations:

```php
// Bad: No turn limit
while (true) {
    $response = LLM::functionCall($prompt, $functions);
    if (is_string($response)) break;
    // Could loop forever
}

// Good: Bounded with max turns
$maxTurns = 10;
for ($i = 0; $i < $maxTurns; $i++) {
    $response = LLM::functionCall($prompt, $functions);
    if (is_string($response)) break;
}

if ($i >= $maxTurns) {
    Log::warning('Max turns reached without completion');
}
```

### 2. Missing Error Handling

Always handle function execution failures:

```php
// Bad: Unhandled exceptions
$result = $function($arguments);

// Good: Comprehensive error handling
try {
    $result = $function($arguments);
} catch (ValidationException $e) {
    return json_encode(['error' => 'validation_failed', 'details' => $e->errors()]);
} catch (\Exception $e) {
    Log::error('Function failed', ['error' => $e->getMessage()]);
    return json_encode(['error' => 'execution_failed']);
}
```

### 3. Exposing Sensitive Data

Never return sensitive information in function results:

```php
// Bad: Exposes passwords
fn($email) => User::where('email', $email)->first()->toJson()

// Good: Filters sensitive fields
fn($email) => User::where('email', $email)->first()->only(['id', 'name', 'email'])->toJson()
```

### 4. Not Validating LLM Inputs

Never trust LLM-generated parameters:

```php
// Bad: Direct usage
$userId = $arguments['user_id'];
User::find($userId)->delete();

// Good: Validation and authorization
$userId = (int) $arguments['user_id'];

if ($userId <= 0) {
    throw new ValidationException('Invalid user ID');
}

$user = User::findOrFail($userId);

if (!auth()->user()->can('delete', $user)) {
    throw new AuthorizationException('Not authorized to delete this user');
}

$user->delete();
```

### 5. Ignoring Rate Limits

Implement rate limiting to prevent abuse:

```php
use Illuminate\Support\Facades\RateLimiter;

function executeFunction(FunctionCall $call): string
{
    $key = 'func:' . auth()->id() . ':' . $call->name;

    if (RateLimiter::tooManyAttempts($key, 10)) {
        throw new RateLimitException('Too many function calls');
    }

    RateLimiter::hit($key, 60);

    return $this->doExecute($call);
}
```

## Related Documentation

- [Tools (Function Calling Basics)](/docs/advanced/tools)
- [Brain (Agent Framework)](/docs/core/brain)
- [Testing AI Applications](/docs/advanced/testing)
- [Observability](/docs/observability/overview)
