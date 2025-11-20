# Tools (Function Calling)

Tools, also known as function calling, allow LLMs to execute code and interact with external systems. Instead of just generating text, LLMs can trigger specific functions with validated parameters - enabling them to query databases, call APIs, send emails, or perform any custom operation you define.

This is where AI transforms from a chatbot into a production utility that can **actually do things**.

## Overview

### What Are Tools?

Tools extend an LLM's capabilities beyond text generation by allowing it to:

-   **Execute code** based on natural language understanding
-   **Interact with external systems** (databases, APIs, filesystems)
-   **Perform calculations** and data transformations
-   **Make decisions** and take actions
-   **Chain operations** together for complex workflows

### How Function Calling Works

1. **Define tools** with names, descriptions, and parameters
2. **Send tools to LLM** along with your prompt
3. **LLM analyzes** the prompt and decides which tool(s) to call
4. **LLM returns** structured function call requests with arguments
5. **Execute the tool** in your application code
6. **Return results** to the LLM for further processing

```php
// 1. Define a tool
$weatherTool = new class implements Tool {
    public function name(): string { return 'get_weather'; }
    public function description(): string { return 'Get current weather for a location'; }
    public function run($input): string { return "Sunny, 22°C"; }
};

// 2. LLM sees user asks "What's the weather in Oslo?"
// 3. LLM decides to call get_weather("Oslo")
// 4. Your code executes the tool
$result = $weatherTool->run('Oslo');

// 5. Return result to LLM
// LLM responds: "The weather in Oslo is currently sunny with a temperature of 22°C"
```

### When to Use Tools

**Use tools when you need to:**

-   Query your database based on natural language
-   Fetch data from external APIs
-   Perform calculations or data transformations
-   Send emails or notifications
-   Read/write files
-   Execute business logic
-   Take actions based on LLM understanding

**Don't use tools when:**

-   Simple text generation suffices
-   The LLM already has the knowledge
-   You just need classification (use structured output instead)

## Basic Tool Usage

### The Tool Interface

All tools in Mindwave implement the `Tool` interface:

```php
namespace Mindwave\Mindwave\Contracts;

interface Tool
{
    public function name(): string;
    public function description(): string;
    public function run($input): string;
}
```

Three simple methods:

-   `name()` - Unique identifier for the tool
-   `description()` - What the tool does (helps LLM decide when to use it)
-   `run($input)` - Execute the tool logic and return results

### Simple Tool Example

```php
use Mindwave\Mindwave\Contracts\Tool;

class CalculatorTool implements Tool
{
    public function name(): string
    {
        return 'calculator';
    }

    public function description(): string
    {
        return 'Performs mathematical calculations. Input should be a math expression like "2 + 2" or "sqrt(16)"';
    }

    public function run($input): string
    {
        try {
            // Using PHP's built-in eval for simple math (be careful with this!)
            $result = eval("return $input;");
            return "Result: " . $result;
        } catch (\Throwable $e) {
            return "Error calculating: " . $e->getMessage();
        }
    }
}
```

### Using Tools with Function Calling

Mindwave uses OpenAI-style function calling via the `FunctionBuilder`:

```php
use Mindwave\Mindwave\Facades\LLM;
use Mindwave\Mindwave\LLM\FunctionCalling\FunctionBuilder;

// Build function definitions
$functions = FunctionBuilder::make()
    ->addFunction(
        name: 'get_user_by_email',
        description: 'Finds a user in the database by their email address',
        closure: function (string $email) {
            $user = User::where('email', $email)->first();
            return $user ? $user->toJson() : 'User not found';
        }
    );

// Call LLM with function calling
$response = LLM::driver('openai')
    ->functionCall('Find the user with email john@example.com', $functions);

// Check if LLM called a function
if ($response instanceof \Mindwave\Mindwave\LLM\FunctionCalling\FunctionCall) {
    echo "Function: " . $response->name;
    echo "Arguments: " . json_encode($response->arguments);

    // Arguments are already parsed:
    // ['email' => 'john@example.com']
}
```

## Creating Tools

Mindwave supports three approaches to creating tools:

### Method 1: Tool Classes (Recommended)

Create dedicated tool classes implementing the `Tool` interface.

**Generate with Artisan:**

```bash
php artisan mindwave:tool GetWeather --description="Fetches weather data for a location"
```

This creates `app/Mindwave/Tools/GetWeather.php`:

```php
<?php

namespace App\Mindwave\Tools;

use Mindwave\Mindwave\Contracts\Tool;

class GetWeather implements Tool
{
    public function name(): string
    {
        return "GetWeather";
    }

    public function description(): string
    {
        return "Fetches weather data for a location";
    }

    public function run($input): string
    {
        // TODO: implement
        return "";
    }
}
```

**Complete implementation:**

```php
<?php

namespace App\Mindwave\Tools;

use Illuminate\Support\Facades\Http;
use Mindwave\Mindwave\Contracts\Tool;

class GetWeather implements Tool
{
    public function name(): string
    {
        return 'get_weather';
    }

    public function description(): string
    {
        return 'Fetches current weather data for a given location. Input should be a city name.';
    }

    public function run($input): string
    {
        $apiKey = config('services.openweather.key');

        try {
            $response = Http::get('https://api.openweathermap.org/data/2.5/weather', [
                'q' => $input,
                'appid' => $apiKey,
                'units' => 'metric',
            ]);

            if ($response->failed()) {
                return "Could not fetch weather for {$input}";
            }

            $data = $response->json();

            return json_encode([
                'location' => $data['name'],
                'temperature' => $data['main']['temp'],
                'description' => $data['weather'][0]['description'],
                'humidity' => $data['main']['humidity'],
            ]);
        } catch (\Exception $e) {
            return "Error: " . $e->getMessage();
        }
    }
}
```

**Usage:**

```php
$tool = new GetWeather();
$result = $tool->run('Oslo');
```

### Method 2: SimpleTool (Quick & Easy)

For simple tools, use the built-in `SimpleTool` class:

```php
use Mindwave\Mindwave\Tools\SimpleTool;

$currencyTool = new SimpleTool(
    name: 'convert_currency',
    description: 'Converts amount from one currency to another',
    callback: function ($input) {
        // Input would be something like "100 USD to EUR"
        // Parse and call currency API
        return "100 USD = 92.50 EUR";
    }
);

$result = $currencyTool->run('100 USD to EUR');
```

### Method 3: Closure-Based Functions

For use with `FunctionBuilder` and function calling:

```php
use Mindwave\Mindwave\LLM\FunctionCalling\FunctionBuilder;
use Mindwave\Mindwave\LLM\FunctionCalling\Attributes\Description;

$functions = FunctionBuilder::make();

// Method 1: Inline closure with Description attributes
$functions->addFunction(
    name: 'get_user',
    description: 'Retrieves user information by ID',
    closure: function (
        #[Description('The user ID to look up')]
        int $userId
    ) {
        $user = User::find($userId);
        return $user ? $user->toJson() : 'User not found';
    }
);

// Method 2: Manual parameter definition
$functions->addFunction('create_order')
    ->setDescription('Creates a new order in the system')
    ->addParameter('customer_id', 'integer', 'The customer ID', true)
    ->addParameter('product_id', 'integer', 'The product ID', true)
    ->addParameter('quantity', 'integer', 'Quantity to order', true)
    ->addParameter('notes', 'string', 'Optional notes', false);
```

## Tool Parameters

### Defining Parameters with Closures

Use PHP's type hints and the `#[Description]` attribute:

```php
use Mindwave\Mindwave\LLM\FunctionCalling\Attributes\Description;

$functions->addFunction(
    name: 'search_products',
    description: 'Searches for products in the database',
    closure: function (
        #[Description('Search query for product name')]
        string $query,

        #[Description('Category to filter by')]
        string $category = 'all',

        #[Description('Maximum number of results')]
        int $limit = 10,

        #[Description('Minimum price filter')]
        float $minPrice = 0.0,

        #[Description('Include out of stock items')]
        bool $includeOutOfStock = false
    ) {
        $products = Product::query()
            ->where('name', 'like', "%{$query}%")
            ->when($category !== 'all', fn($q) => $q->where('category', $category))
            ->where('price', '>=', $minPrice)
            ->when(!$includeOutOfStock, fn($q) => $q->where('stock', '>', 0))
            ->limit($limit)
            ->get();

        return $products->toJson();
    }
);
```

**How parameters work:**

-   **Type hints** (`string`, `int`, `float`, `bool`) become the parameter types
-   **`#[Description]` attributes** provide descriptions to the LLM
-   **Default values** make parameters optional
-   **No default value** = required parameter

### Manual Parameter Definition

For more control, define parameters explicitly:

```php
$functions->addFunction('update_user_status')
    ->setDescription('Updates a user\'s account status')
    ->addParameter(
        name: 'user_id',
        type: 'integer',
        description: 'The ID of the user to update',
        isRequired: true
    )
    ->addParameter(
        name: 'status',
        type: 'string',
        description: 'The new status for the user',
        isRequired: true,
        enum: ['active', 'suspended', 'banned', 'pending']
    );
```

**Parameter options:**

-   `name` - Parameter name
-   `type` - JSON schema type: `string`, `integer`, `number`, `boolean`, `array`, `object`
-   `description` - What the parameter is for
-   `isRequired` - Whether parameter is required (default: false)
-   `enum` - Array of allowed values (optional)

### Parameter Types

```php
// String parameter
->addParameter('name', 'string', 'User name', true)

// Integer parameter
->addParameter('age', 'integer', 'User age in years', true)

// Float/Number parameter
->addParameter('price', 'number', 'Product price', true)

// Boolean parameter
->addParameter('is_active', 'boolean', 'Whether user is active', false)

// Enum (restricted values)
->addParameter('role', 'string', 'User role', true, ['admin', 'user', 'guest'])

// Array parameter (advanced)
->addParameter('tags', 'array', 'List of tags', false)

// Object parameter (advanced)
->addParameter('metadata', 'object', 'Additional metadata', false)
```

## Executing Tools

### Function Call Response

When using `functionCall()`, you get back a `FunctionCall` object:

```php
use Mindwave\Mindwave\LLM\FunctionCalling\FunctionCall;

$response = LLM::driver('openai')
    ->functionCall('What products are in the electronics category?', $functions);

if ($response instanceof FunctionCall) {
    // Function name the LLM wants to call
    echo $response->name; // 'search_products'

    // Parsed arguments as associative array
    var_dump($response->arguments);
    // ['query' => 'electronics', 'category' => 'electronics', 'limit' => 10]

    // Raw JSON string of arguments
    echo $response->rawArguments;
    // '{"query":"electronics","category":"electronics","limit":10}'
}
```

### Executing the Function

You need to execute the function yourself and return results:

```php
$response = LLM::driver('openai')
    ->functionCall($userPrompt, $functions);

if ($response instanceof FunctionCall) {
    // Execute the function
    $result = match($response->name) {
        'search_products' => searchProducts(
            $response->arguments['query'],
            $response->arguments['category'] ?? 'all',
            $response->arguments['limit'] ?? 10
        ),
        'get_user' => getUser($response->arguments['user_id']),
        default => 'Unknown function'
    };

    // Return result to LLM for formatting/explanation
    $finalResponse = LLM::driver('openai')->generateText(
        "The function {$response->name} returned: {$result}. " .
        "Explain this to the user in a friendly way."
    );

    echo $finalResponse;
}

function searchProducts(string $query, string $category, int $limit): string
{
    return Product::where('name', 'like', "%{$query}%")
        ->where('category', $category)
        ->limit($limit)
        ->get()
        ->toJson();
}
```

### Multi-Turn Function Execution

For complex tasks, you may need multiple function calls:

```php
$messages = [
    ['role' => 'user', 'content' => 'Send an email to all users who ordered product 123 in the last week']
];

$maxIterations = 5;
$iteration = 0;

while ($iteration < $maxIterations) {
    $response = LLM::driver('openai')
        ->functionCall(json_encode($messages), $functions);

    if (is_string($response)) {
        // LLM finished and returned text
        echo $response;
        break;
    }

    if ($response instanceof FunctionCall) {
        // Execute the function
        $result = executeTool($response->name, $response->arguments);

        // Add function result to message history
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

    $iteration++;
}
```

## Built-in Tools

Mindwave includes several pre-built tools you can use or learn from:

### ReadFile Tool

Reads file contents from the filesystem:

```php
use Mindwave\Mindwave\Tools\ReadFile;

$tool = new ReadFile();
$content = $tool->run('/path/to/file.txt');
// Returns: "File contents: [content here]"
```

**Implementation:**

```php
public function run($input): string
{
    if (! file_exists($input)) {
        return "There is no file at the given path {$input}";
    }

    $content = file_get_contents($input);
    return "File contents: $content";
}
```

### WriteFile Tool

Writes content to a file:

```php
use Mindwave\Mindwave\Tools\WriteFile;

$tool = new WriteFile('/path/to/output.txt');
$result = $tool->run('This is the content to write');
// Returns: "Successfully wrote to file /path/to/output.txt"
```

**Implementation:**

```php
public function __construct(protected string $path) {}

public function run($input): string
{
    try {
        if (! file_exists($this->path)) {
            touch($this->path);
        }

        file_put_contents($this->path, $input);
        return "Successfully wrote to file {$this->path}";
    } catch (Throwable $th) {
        return "Failed to write to file due to error: {$th->getMessage()}";
    }
}
```

### BraveSearch Tool

Performs web searches using Brave Search API:

```php
use Mindwave\Mindwave\Tools\BraveSearch;

$tool = new BraveSearch();
$results = $tool->run('Laravel best practices');
// Returns JSON with search results
```

**Implementation:**

```php
public function run($input): string
{
    return Http::withHeader('X-Subscription-Token', env('BRAVE_SEARCH_API_KEY'))
        ->acceptJson()
        ->asJson()
        ->get('https://api.search.brave.com/res/v1/web/search', [
            'q' => $input,
            'count' => 5,
        ])
        ->collect('web.results')
        ->map(fn ($result) => [
            'title' => $result['title'],
            'url' => $result['url'],
            'description' => strip_tags($result['description']),
        ])
        ->toJson();
}
```

## Real-World Tool Examples

### Example 1: Database Query Tool

Execute natural language database queries:

```php
<?php

namespace App\Mindwave\Tools;

use App\Models\Order;
use Carbon\Carbon;
use Mindwave\Mindwave\Contracts\Tool;

class QueryOrders implements Tool
{
    public function name(): string
    {
        return 'query_orders';
    }

    public function description(): string
    {
        return 'Queries the orders database. Accepts filters like date range, status, customer email, minimum amount.';
    }

    public function run($input): string
    {
        // Parse input (in real implementation, use structured parameters)
        $params = json_decode($input, true);

        try {
            $query = Order::query()->with(['customer', 'items']);

            // Date range filter
            if (isset($params['start_date'])) {
                $query->where('created_at', '>=', Carbon::parse($params['start_date']));
            }

            if (isset($params['end_date'])) {
                $query->where('created_at', '<=', Carbon::parse($params['end_date']));
            }

            // Status filter
            if (isset($params['status'])) {
                $query->where('status', $params['status']);
            }

            // Customer filter
            if (isset($params['customer_email'])) {
                $query->whereHas('customer', function ($q) use ($params) {
                    $q->where('email', $params['customer_email']);
                });
            }

            // Minimum amount
            if (isset($params['min_amount'])) {
                $query->where('total', '>=', $params['min_amount']);
            }

            // Limit results
            $limit = $params['limit'] ?? 50;
            $orders = $query->limit($limit)->get();

            return json_encode([
                'count' => $orders->count(),
                'orders' => $orders->map(fn($order) => [
                    'id' => $order->id,
                    'customer' => $order->customer->email,
                    'total' => $order->total,
                    'status' => $order->status,
                    'created_at' => $order->created_at->toDateTimeString(),
                ]),
            ]);
        } catch (\Exception $e) {
            return json_encode([
                'error' => 'Query failed: ' . $e->getMessage()
            ]);
        }
    }
}
```

**Usage:**

```php
$functions = FunctionBuilder::make()
    ->addFunction(
        name: 'query_orders',
        description: 'Query the orders database',
        closure: function (
            #[Description('Start date for order range (Y-m-d format)')]
            ?string $startDate = null,

            #[Description('End date for order range (Y-m-d format)')]
            ?string $endDate = null,

            #[Description('Order status to filter by')]
            ?string $status = null,

            #[Description('Customer email to filter by')]
            ?string $customerEmail = null,

            #[Description('Minimum order amount')]
            ?float $minAmount = null,

            #[Description('Maximum number of results')]
            int $limit = 50
        ) {
            $tool = new QueryOrders();
            return $tool->run(json_encode(compact(
                'startDate', 'endDate', 'status',
                'customerEmail', 'minAmount', 'limit'
            )));
        }
    );

$response = LLM::driver('openai')->functionCall(
    'Show me all pending orders from the last 7 days over $100',
    $functions
);
```

### Example 2: Email Sender Tool

Send emails via Laravel's mail system:

```php
<?php

namespace App\Mindwave\Tools;

use App\Mail\AIGeneratedEmail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Mindwave\Mindwave\Contracts\Tool;

class SendEmail implements Tool
{
    public function name(): string
    {
        return 'send_email';
    }

    public function description(): string
    {
        return 'Sends an email to a recipient. Requires recipient email, subject, and message body.';
    }

    public function run($input): string
    {
        $params = json_decode($input, true);

        // Validate input
        $validator = Validator::make($params, [
            'to' => 'required|email',
            'subject' => 'required|string|max:255',
            'body' => 'required|string',
            'cc' => 'sometimes|array',
            'cc.*' => 'email',
        ]);

        if ($validator->fails()) {
            return json_encode([
                'success' => false,
                'error' => 'Validation failed: ' . $validator->errors()->first(),
            ]);
        }

        try {
            Mail::to($params['to'])
                ->cc($params['cc'] ?? [])
                ->send(new AIGeneratedEmail(
                    subject: $params['subject'],
                    body: $params['body']
                ));

            return json_encode([
                'success' => true,
                'message' => "Email sent successfully to {$params['to']}",
            ]);
        } catch (\Exception $e) {
            return json_encode([
                'success' => false,
                'error' => 'Failed to send email: ' . $e->getMessage(),
            ]);
        }
    }
}
```

**With Queue Integration:**

```php
<?php

namespace App\Mindwave\Tools;

use App\Jobs\SendAIEmail;
use Mindwave\Mindwave\Contracts\Tool;

class QueueEmail implements Tool
{
    public function name(): string
    {
        return 'queue_email';
    }

    public function description(): string
    {
        return 'Queues an email to be sent asynchronously';
    }

    public function run($input): string
    {
        $params = json_decode($input, true);

        try {
            SendAIEmail::dispatch(
                to: $params['to'],
                subject: $params['subject'],
                body: $params['body']
            );

            return json_encode([
                'success' => true,
                'message' => 'Email queued for delivery',
            ]);
        } catch (\Exception $e) {
            return json_encode([
                'success' => false,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
```

### Example 3: Weather API Tool

Fetch and format weather data:

```php
<?php

namespace App\Mindwave\Tools;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Mindwave\Mindwave\Contracts\Tool;

class GetWeatherData implements Tool
{
    public function name(): string
    {
        return 'get_weather';
    }

    public function description(): string
    {
        return 'Fetches current weather data and 5-day forecast for a given city';
    }

    public function run($input): string
    {
        $city = trim($input);
        $cacheKey = "weather:{$city}";

        // Cache for 30 minutes
        return Cache::remember($cacheKey, 1800, function () use ($city) {
            try {
                $apiKey = config('services.openweather.key');

                // Get current weather
                $current = Http::get('https://api.openweathermap.org/data/2.5/weather', [
                    'q' => $city,
                    'appid' => $apiKey,
                    'units' => 'metric',
                ])->throw()->json();

                // Get forecast
                $forecast = Http::get('https://api.openweathermap.org/data/2.5/forecast', [
                    'q' => $city,
                    'appid' => $apiKey,
                    'units' => 'metric',
                    'cnt' => 8, // Next 24 hours (3-hour intervals)
                ])->throw()->json();

                return json_encode([
                    'location' => $current['name'] . ', ' . $current['sys']['country'],
                    'current' => [
                        'temperature' => $current['main']['temp'],
                        'feels_like' => $current['main']['feels_like'],
                        'description' => $current['weather'][0]['description'],
                        'humidity' => $current['main']['humidity'],
                        'wind_speed' => $current['wind']['speed'],
                    ],
                    'forecast' => collect($forecast['list'])->map(fn($item) => [
                        'time' => $item['dt_txt'],
                        'temp' => $item['main']['temp'],
                        'description' => $item['weather'][0]['description'],
                    ]),
                ]);
            } catch (\Exception $e) {
                return json_encode([
                    'error' => "Could not fetch weather for {$city}: " . $e->getMessage()
                ]);
            }
        });
    }
}
```

### Example 4: File Search Tool

Search filesystem with safety checks:

```php
<?php

namespace App\Mindwave\Tools;

use Illuminate\Support\Facades\Storage;
use Mindwave\Mindwave\Contracts\Tool;

class SearchFiles implements Tool
{
    protected array $allowedPaths = [
        'documents',
        'reports',
        'uploads',
    ];

    public function name(): string
    {
        return 'search_files';
    }

    public function description(): string
    {
        return 'Searches for files in allowed directories. Accepts a search pattern and optional path.';
    }

    public function run($input): string
    {
        $params = json_decode($input, true);
        $pattern = $params['pattern'] ?? '';
        $path = $params['path'] ?? 'documents';

        // Security: Only allow searching in specific directories
        if (!in_array($path, $this->allowedPaths)) {
            return json_encode([
                'error' => 'Access denied: Path not in allowed directories',
                'allowed' => $this->allowedPaths,
            ]);
        }

        try {
            $disk = Storage::disk('local');
            $files = $disk->allFiles($path);

            // Filter by pattern
            $matches = collect($files)
                ->filter(fn($file) => str_contains(strtolower($file), strtolower($pattern)))
                ->map(fn($file) => [
                    'path' => $file,
                    'size' => $disk->size($file),
                    'last_modified' => date('Y-m-d H:i:s', $disk->lastModified($file)),
                    'extension' => pathinfo($file, PATHINFO_EXTENSION),
                ])
                ->values();

            return json_encode([
                'total' => $matches->count(),
                'files' => $matches,
            ]);
        } catch (\Exception $e) {
            return json_encode([
                'error' => 'Search failed: ' . $e->getMessage()
            ]);
        }
    }
}
```

## Advanced Patterns

### Tool Chaining

Use output from one tool as input to another:

```php
$functions = FunctionBuilder::make()
    ->addFunction(
        name: 'get_user_email',
        description: 'Gets email for a user ID',
        closure: fn(int $userId) => User::find($userId)?->email ?? 'not found'
    )
    ->addFunction(
        name: 'send_notification',
        description: 'Sends a notification to an email',
        closure: function(string $email, string $message) {
            Mail::to($email)->send(new Notification($message));
            return "Sent to {$email}";
        }
    );

// LLM can chain these:
// "Send a welcome message to user 123"
// 1. Calls get_user_email(123) -> "john@example.com"
// 2. Calls send_notification("john@example.com", "Welcome!") -> "Sent"
```

### Conditional Tool Execution

Tools that decide whether to proceed:

```php
class ApproveRefund implements Tool
{
    public function run($input): string
    {
        $params = json_decode($input, true);
        $order = Order::find($params['order_id']);

        // Business logic decides if refund is allowed
        if (!$order || $order->created_at->diffInDays(now()) > 30) {
            return json_encode([
                'approved' => false,
                'reason' => 'Order too old for refund (>30 days)',
            ]);
        }

        if ($order->status === 'refunded') {
            return json_encode([
                'approved' => false,
                'reason' => 'Order already refunded',
            ]);
        }

        // Process refund
        $order->update(['status' => 'refunded']);

        return json_encode([
            'approved' => true,
            'amount' => $order->total,
            'order_id' => $order->id,
        ]);
    }
}
```

### Parallel Tool Support

Some LLMs can request multiple tools at once:

```php
$response = LLM::driver('openai')->functionCall(
    'Check weather in Oslo and London',
    $functions
);

// Response might include multiple function calls
// Handle them in sequence or parallel depending on your needs
```

### Stateful Tools

Tools that maintain state across calls:

```php
class ShoppingCart implements Tool
{
    protected array $cart = [];

    public function run($input): string
    {
        $params = json_decode($input, true);
        $action = $params['action'];

        return match($action) {
            'add' => $this->addItem($params['product_id'], $params['quantity']),
            'remove' => $this->removeItem($params['product_id']),
            'view' => $this->viewCart(),
            'clear' => $this->clearCart(),
        };
    }

    protected function addItem(int $productId, int $quantity): string
    {
        $this->cart[$productId] = ($this->cart[$productId] ?? 0) + $quantity;
        return json_encode(['cart' => $this->cart]);
    }

    protected function viewCart(): string
    {
        return json_encode(['cart' => $this->cart]);
    }
}
```

## Testing Tools

### Unit Testing Tool Logic

Test tools independently of LLMs:

```php
use Tests\TestCase;
use App\Mindwave\Tools\GetWeatherData;

class GetWeatherDataTest extends TestCase
{
    public function test_fetches_weather_data()
    {
        Http::fake([
            'api.openweathermap.org/*' => Http::response([
                'name' => 'Oslo',
                'sys' => ['country' => 'NO'],
                'main' => [
                    'temp' => 22.5,
                    'feels_like' => 21.0,
                    'humidity' => 60,
                ],
                'weather' => [
                    ['description' => 'clear sky']
                ],
                'wind' => ['speed' => 3.5],
            ], 200),
        ]);

        $tool = new GetWeatherData();
        $result = $tool->run('Oslo');
        $data = json_decode($result, true);

        $this->assertEquals('Oslo, NO', $data['location']);
        $this->assertEquals(22.5, $data['current']['temperature']);
        $this->assertEquals('clear sky', $data['current']['description']);
    }

    public function test_handles_api_errors()
    {
        Http::fake([
            'api.openweathermap.org/*' => Http::response([], 404),
        ]);

        $tool = new GetWeatherData();
        $result = $tool->run('InvalidCity');
        $data = json_decode($result, true);

        $this->assertArrayHasKey('error', $data);
    }
}
```

### Mocking Tool Execution

Test function calling without hitting real APIs:

```php
public function test_llm_calls_correct_tool()
{
    $client = new ClientFake([
        CreateResponse::fake(override: [
            'choices' => [
                [
                    'message' => [
                        'role' => 'assistant',
                        'tool_calls' => [
                            [
                                'id' => 'call_123',
                                'type' => 'function',
                                'function' => [
                                    'name' => 'get_weather',
                                    'arguments' => '{"location":"Oslo"}',
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ]),
    ]);

    $functions = FunctionBuilder::make()
        ->addFunction('get_weather', 'Get weather', fn($location) => "Sunny");

    $response = LLM::createOpenAIDriver($client)
        ->functionCall('What is the weather in Oslo?', $functions);

    $this->assertEquals('get_weather', $response->name);
    $this->assertEquals('Oslo', $response->arguments['location']);
}
```

### Testing Tool Integration

Test the full flow with a real LLM (integration test):

```php
public function test_weather_tool_integration()
{
    $functions = FunctionBuilder::make()
        ->addFunction(
            name: 'get_weather',
            description: 'Gets weather for a location',
            closure: function(string $location) {
                Http::fake([
                    'api.openweathermap.org/*' => Http::response([
                        'name' => $location,
                        'main' => ['temp' => 15],
                        'weather' => [['description' => 'cloudy']],
                    ]),
                ]);

                $tool = new GetWeatherData();
                return $tool->run($location);
            }
        );

    $response = LLM::driver('openai')
        ->functionCall('What is the weather like in Bergen?', $functions);

    $this->assertInstanceOf(FunctionCall::class, $response);
    $this->assertEquals('get_weather', $response->name);

    // Execute the function
    $closure = $functions->build()[0]['function'];
    $result = ($closure)($response->arguments['location']);
    $data = json_decode($result, true);

    $this->assertEquals(15, $data['current']['temperature']);
}
```

## Best Practices

### 1. Clear Tool Descriptions

The LLM uses descriptions to decide which tool to call. Be specific:

**Bad:**

```php
public function description(): string
{
    return 'Gets data';
}
```

**Good:**

```php
public function description(): string
{
    return 'Queries the customer database to find customers by email, name, or ID. Returns customer details including order history.';
}
```

### 2. Validate All Inputs

Never trust LLM-generated parameters:

```php
public function run($input): string
{
    $params = json_decode($input, true);

    // Validate
    $validator = Validator::make($params, [
        'email' => 'required|email',
        'amount' => 'required|numeric|min:0|max:10000',
    ]);

    if ($validator->fails()) {
        return json_encode([
            'error' => 'Invalid input: ' . $validator->errors()->first()
        ]);
    }

    // Safe to proceed
}
```

### 3. Handle Errors Gracefully

Return error information that helps the LLM understand what went wrong:

```php
try {
    // Tool logic
    return json_encode(['success' => true, 'data' => $result]);
} catch (\Exception $e) {
    return json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'hint' => 'Try a different search term or check the format',
    ]);
}
```

### 4. Security Considerations

**Sanitize file paths:**

```php
public function run($input): string
{
    $path = $input;

    // Prevent directory traversal
    if (str_contains($path, '..')) {
        return 'Invalid path: directory traversal not allowed';
    }

    // Restrict to allowed directories
    $allowedBase = storage_path('app/documents');
    $realPath = realpath($allowedBase . '/' . $path);

    if (!$realPath || !str_starts_with($realPath, $allowedBase)) {
        return 'Access denied';
    }

    // Safe to read
}
```

**Rate limiting:**

```php
use Illuminate\Support\Facades\RateLimiter;

public function run($input): string
{
    $key = 'tool:api_call:' . request()->ip();

    if (RateLimiter::tooManyAttempts($key, 10)) {
        return json_encode([
            'error' => 'Rate limit exceeded. Try again later.',
        ]);
    }

    RateLimiter::hit($key, 60); // 10 per minute

    // Execute tool
}
```

**SQL injection protection:**

```php
// Always use Eloquent or query builder - never raw SQL from LLM input
public function run($input): string
{
    // GOOD: Using Eloquent
    $users = User::where('email', $input)->get();

    // BAD: Never do this!
    // $users = DB::select("SELECT * FROM users WHERE email = '{$input}'");
}
```

### 5. Performance Optimization

**Cache expensive operations:**

```php
public function run($input): string
{
    return Cache::remember(
        key: "tool:weather:{$input}",
        ttl: 1800, // 30 minutes
        callback: fn() => $this->fetchWeather($input)
    );
}
```

**Use queues for slow operations:**

```php
public function run($input): string
{
    $jobId = Str::uuid();

    ProcessLargeDataset::dispatch($input, $jobId);

    return json_encode([
        'job_id' => $jobId,
        'status' => 'processing',
        'message' => 'Job queued. Check status with job_id.',
    ]);
}
```

### 6. Return Structured Data

Return JSON for easy LLM parsing:

```php
public function run($input): string
{
    $products = Product::where('name', 'like', "%{$input}%")->get();

    return json_encode([
        'total' => $products->count(),
        'products' => $products->map(fn($p) => [
            'id' => $p->id,
            'name' => $p->name,
            'price' => $p->price,
            'stock' => $p->stock,
        ]),
    ]);
}
```

### 7. Tool Naming Conventions

Use clear, action-oriented names:

-   `get_user` (not `user`)
-   `send_email` (not `email`)
-   `search_products` (not `products`)
-   `create_order` (not `order`)

### 8. When to Create Tools vs Prompts

**Create a tool when:**

-   You need to query a database
-   You need to call external APIs
-   You need to modify data
-   The operation has side effects
-   The data changes frequently

**Use a prompt when:**

-   The information is static
-   You're doing pure text processing
-   You need creative generation
-   No external calls are needed

## Integration with Mindwave

### Using Tools with PromptComposer

You can't directly pass tools to PromptComposer, but you can use them in the execution chain:

```php
use Mindwave\Mindwave\Facades\Mindwave;

// First, compose your prompt
$prompt = Mindwave::prompt()
    ->section('system', 'You are a customer service assistant')
    ->section('user', $userQuestion)
    ->fit()
    ->toString();

// Then use function calling with the composed prompt
$response = Mindwave::llm()
    ->functionCall($prompt, $functions);

if ($response instanceof FunctionCall) {
    // Execute tool
    $result = executeTool($response->name, $response->arguments);

    // Continue conversation with result
    $finalResponse = Mindwave::llm()->generateText(
        "The tool returned: {$result}. Respond to the user."
    );
}
```

### Tools with Context Discovery

Combine tools with context sources:

```php
use Mindwave\Mindwave\Context\Sources\TntSearchSource;

$functions = FunctionBuilder::make()
    ->addFunction(
        name: 'search_knowledge_base',
        description: 'Searches the company knowledge base',
        closure: function(string $query) {
            $source = TntSearchSource::fromEloquent(
                KnowledgeArticle::query(),
                fn($article) => $article->title . "\n" . $article->content
            );

            $results = $source->search($query, limit: 5);
            return $results->toJson();
        }
    );

$response = Mindwave::llm()
    ->functionCall('How do I reset my password?', $functions);
```

### Tracing Tool Execution

Tool execution is automatically traced when using instrumented drivers:

```php
use Mindwave\Mindwave\Models\MindwaveTrace;

// Enable tracing in config/mindwave.php
'tracing' => [
    'enabled' => true,
],

// Tool calls are logged
$response = Mindwave::llm()->functionCall($prompt, $functions);

// View traces
$traces = MindwaveTrace::with('spans')
    ->whereHas('spans', function($query) {
        $query->where('name', 'like', '%function_call%');
    })
    ->get();

foreach ($traces as $trace) {
    echo "Trace: {$trace->id}\n";
    echo "Cost: \${$trace->total_cost}\n";
    echo "Tokens: {$trace->total_tokens}\n";

    foreach ($trace->spans as $span) {
        if ($span->attributes['gen_ai.operation.name'] ?? null === 'chat') {
            echo "Tool called: {$span->attributes['tool_name']}\n";
        }
    }
}
```

### Cost Tracking for Tools

Track costs per tool execution:

```php
use Mindwave\Mindwave\Models\MindwaveTrace;

$trace = MindwaveTrace::latest()->first();

echo "Total cost: \$" . $trace->total_cost . "\n";
echo "Input tokens: " . $trace->input_tokens . "\n";
echo "Output tokens: " . $trace->output_tokens . "\n";

// Calculate cost per tool call
$toolCalls = $trace->spans->where('name', 'like', '%tool%')->count();
$costPerTool = $trace->total_cost / max($toolCalls, 1);

echo "Cost per tool call: \$" . number_format($costPerTool, 4);
```

## Troubleshooting

### Tool Not Being Called

**Problem:** LLM doesn't call your tool when expected.

**Solutions:**

1. **Improve the description:**

```php
// Too vague
'description' => 'Gets data'

// Better
'description' => 'Queries the products database by name, category, or SKU. Returns product details including price and stock.'
```

2. **Add examples in the prompt:**

```php
$prompt = "You have access to a get_product tool. Use it to find products.

User: Show me red shirts
You should call: get_product(query='red shirts', category='clothing')
";
```

3. **Check parameter requirements:**

```php
// Make sure required parameters are clearly defined
->addParameter('query', 'string', 'Search query (required)', isRequired: true)
```

### Execution Errors

**Problem:** Tool execution fails.

**Solutions:**

1. **Add comprehensive error handling:**

```php
public function run($input): string
{
    try {
        // Validate input
        if (empty($input)) {
            throw new \InvalidArgumentException('Input cannot be empty');
        }

        // Execute logic
        $result = $this->doWork($input);

        return json_encode(['success' => true, 'data' => $result]);
    } catch (\InvalidArgumentException $e) {
        return json_encode(['success' => false, 'error' => 'Invalid input: ' . $e->getMessage()]);
    } catch (\Exception $e) {
        Log::error('Tool execution failed', [
            'tool' => $this->name(),
            'input' => $input,
            'error' => $e->getMessage(),
        ]);

        return json_encode(['success' => false, 'error' => 'Internal error']);
    }
}
```

2. **Log for debugging:**

```php
public function run($input): string
{
    Log::debug('Tool execution started', [
        'tool' => $this->name(),
        'input' => $input,
    ]);

    $result = // ... execute

    Log::debug('Tool execution completed', [
        'tool' => $this->name(),
        'result' => $result,
    ]);

    return $result;
}
```

### Parameter Validation Failures

**Problem:** LLM sends incorrect parameter types or values.

**Solutions:**

1. **Validate and coerce types:**

```php
public function run($input): string
{
    $params = json_decode($input, true);

    // Coerce types
    $userId = (int) ($params['user_id'] ?? 0);
    $limit = min(100, max(1, (int) ($params['limit'] ?? 10)));

    // Validate
    if ($userId <= 0) {
        return json_encode(['error' => 'user_id must be a positive integer']);
    }

    // Proceed
}
```

2. **Use enums for restricted values:**

```php
->addParameter('status', 'string', 'Order status', true, [
    'pending',
    'processing',
    'completed',
    'cancelled'
])
```

### LLM Hallucinating Tool Calls

**Problem:** LLM invents tools that don't exist.

**Solutions:**

1. **Be explicit about available tools:**

```php
$prompt = "You have access to ONLY these tools:
- get_weather(location): Gets weather for a location
- send_email(to, subject, body): Sends an email

Do not invent or assume other tools exist.

User query: {$userQuery}";
```

2. **Check function name before executing:**

```php
$allowedTools = ['get_weather', 'send_email', 'search_products'];

if (!in_array($response->name, $allowedTools)) {
    echo "Error: Unknown tool '{$response->name}'";
    // Optionally ask LLM to try again with correct tool
}
```

### Tool Response Not Used

**Problem:** Tool executes but LLM ignores the result.

**Solutions:**

1. **Return the result to the LLM:**

```php
if ($response instanceof FunctionCall) {
    // Execute tool
    $result = executeTool($response->name, $response->arguments);

    // IMPORTANT: Send result back to LLM
    $finalResponse = Mindwave::llm()->generateText(
        "The {$response->name} function returned this result:\n\n{$result}\n\n" .
        "Use this information to answer the user's question: {$originalQuery}"
    );

    echo $finalResponse;
}
```

2. **Use multi-turn conversation:**

```php
$messages = [
    ['role' => 'user', 'content' => $userQuery],
];

// First turn: LLM calls function
$response = LLM::driver('openai')->functionCall(json_encode($messages), $functions);

if ($response instanceof FunctionCall) {
    $result = executeTool($response->name, $response->arguments);

    // Add function call and result to conversation
    $messages[] = ['role' => 'assistant', 'function_call' => [
        'name' => $response->name,
        'arguments' => $response->rawArguments,
    ]];
    $messages[] = ['role' => 'function', 'name' => $response->name, 'content' => $result];

    // Second turn: LLM uses result to answer
    $finalResponse = LLM::driver('openai')->generateText(json_encode($messages));
    echo $finalResponse;
}
```

## Summary

Tools extend LLMs from text generators to action-taking systems. With Mindwave's clean `Tool` interface and Laravel integration, you can:

-   **Create tools easily** - Implement 3 methods, you're done
-   **Execute safely** - Validate inputs, handle errors, restrict access
-   **Integrate deeply** - Use Eloquent, HTTP, Mail, Queue, Cache
-   **Trace everything** - Built-in observability for costs and performance
-   **Test thoroughly** - Unit test tools independently of LLMs

**Key takeaways:**

1. Tools let LLMs execute code and interact with systems
2. Define clear descriptions and parameters
3. Always validate and sanitize inputs
4. Return structured JSON responses
5. Handle errors gracefully
6. Test tools independently
7. Integrate with Laravel's ecosystem

Now go build some powerful AI tools that actually get work done.
