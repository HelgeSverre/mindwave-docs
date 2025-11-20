# LLM Integration

Mindwave provides a unified, production-ready interface for interacting with multiple Large Language Model (LLM) providers including OpenAI, Mistral AI, and others. The LLM integration layer abstracts provider-specific APIs behind a consistent interface, enabling you to write provider-agnostic code with built-in error handling, retry logic, and observability.

## Why Use Mindwave's LLM Abstraction?

**Unified Interface**

-   Write once, run on any provider
-   Switch between providers without changing code
-   Consistent API across OpenAI, Mistral AI, and future providers

**Production Reliability**

-   Built-in OpenTelemetry tracing for all LLM calls
-   Automatic error handling and retry logic
-   Token usage tracking and monitoring
-   Model context window awareness

**Developer Experience**

-   Fluent API with method chaining
-   Type-safe function calling
-   Streaming response support
-   Integration with PromptComposer for token management

**Cost Optimization**

-   Track token usage automatically
-   Prevent context window overflows
-   Monitor and optimize LLM expenses

## Configuration

### Publishing Configuration

Publish the LLM configuration file:

```bash
php artisan vendor:publish --tag=mindwave-llm-config
```

This creates `config/mindwave-llm.php` with your LLM provider settings.

### Configuration File Structure

```php
<?php

use Mindwave\Mindwave\LLM\Drivers\OpenAI\Model;

return [
    // Default LLM provider
    'default' => env('MINDWAVE_LLM', 'openai'),

    // Provider configurations
    'llms' => [
        'openai' => [
            'api_key' => env('MINDWAVE_OPENAI_API_KEY'),
            'org_id' => env('MINDWAVE_OPENAI_ORG_ID'),
            'model' => env('MINDWAVE_OPENAI_MODEL', 'gpt-4-1106-preview'),
            'max_tokens' => env('MINDWAVE_OPENAI_MAX_TOKENS', 1000),
            'temperature' => env('MINDWAVE_OPENAI_TEMPERATURE', 0.4),
        ],

        'mistral' => [
            'api_key' => env('MINDWAVE_MISTRAL_API_KEY'),
            'base_url' => env('MINDWAVE_MISTRAL_BASE_URL'),
            'model' => env('MINDWAVE_MISTRAL_MODEL', 'mistral-medium'),
            'system_message' => env('MINDWAVE_MISTRAL_SYSTEM_MESSAGE'),
            'max_tokens' => env('MINDWAVE_MISTRAL_MAX_TOKENS', 1000),
            'temperature' => env('MINDWAVE_MISTRAL_TEMPERATURE', 0.4),
            'safe_mode' => env('MINDWAVE_MISTRAL_SAFE_MODE', false),
            'random_seed' => env('MINDWAVE_MISTRAL_RANDOM_SEED'),
        ],
    ],
];
```

### Environment Variables

Add your provider credentials to `.env`:

```bash
# OpenAI Configuration
MINDWAVE_LLM=openai
MINDWAVE_OPENAI_API_KEY=sk-...
MINDWAVE_OPENAI_ORG_ID=org-...
MINDWAVE_OPENAI_MODEL=gpt-4-turbo
MINDWAVE_OPENAI_MAX_TOKENS=2000
MINDWAVE_OPENAI_TEMPERATURE=0.7

# Mistral AI Configuration
MINDWAVE_MISTRAL_API_KEY=...
MINDWAVE_MISTRAL_MODEL=mistral-large
MINDWAVE_MISTRAL_MAX_TOKENS=1500
MINDWAVE_MISTRAL_TEMPERATURE=0.5
```

## Basic Usage

### Simple Text Generation

Generate text with the default LLM provider:

```php
use Mindwave\Mindwave\Facades\LLM;

// Using the default provider (configured in config/mindwave-llm.php)
$response = LLM::generateText('Explain quantum computing in simple terms');

echo $response;
// "Quantum computing is a type of computing that uses quantum mechanics..."
```

### Using the Mindwave Facade

The Mindwave facade provides convenient access to LLM functionality:

```php
use Mindwave\Mindwave\Facades\Mindwave;

$response = Mindwave::llm()->generateText('Write a haiku about Laravel');

echo $response;
// "Code flows like water
// Eloquent queries dancing
// PHP at peace"
```

### Setting System Messages

Configure the LLM behavior with system messages:

```php
use Mindwave\Mindwave\Facades\LLM;

$response = LLM::setSystemMessage('You are a helpful assistant that speaks like a pirate.')
    ->generateText('How do I install Laravel?');

echo $response;
// "Ahoy, matey! To install Laravel, ye need to run..."
```

### Switching Providers

Switch between configured providers at runtime:

```php
use Mindwave\Mindwave\Facades\LLM;

// Use OpenAI
$openaiResponse = LLM::driver('openai')->generateText('Hello!');

// Use Mistral AI
$mistralResponse = LLM::driver('mistral')->generateText('Hello!');
```

### Customizing Parameters

Override default parameters per request:

```php
use Mindwave\Mindwave\Facades\LLM;

$response = LLM::driver('openai')
    ->model('gpt-4-turbo')
    ->maxTokens(500)
    ->temperature(0.9)
    ->generateText('Write a creative story about AI');
```

## Supported Providers

### OpenAI

Full support for OpenAI's GPT models including GPT-4, GPT-4 Turbo, GPT-3.5, and O1 models.

**Supported Models:**

-   `gpt-4-turbo` - Latest GPT-4 Turbo (128k context)
-   `gpt-4o` - GPT-4 Omni (128k context)
-   `gpt-4-1106-preview` - GPT-4 Turbo Preview
-   `gpt-4` - Original GPT-4 (8k context)
-   `gpt-4-32k` - GPT-4 with 32k context
-   `gpt-3.5-turbo` - Fast and cost-effective (16k context)
-   `o1-preview` - OpenAI O1 Preview (128k context)
-   `o1-mini` - OpenAI O1 Mini (128k context)

**Features:**

-   Function/tool calling
-   Streaming responses
-   Chat and completion modes
-   Image inputs (GPT-4 Vision)

**Example:**

```php
use Mindwave\Mindwave\Facades\LLM;

$response = LLM::driver('openai')
    ->model('gpt-4-turbo')
    ->generateText('Explain the differences between GPT-4 and GPT-3.5');
```

### Mistral AI

Full support for Mistral AI's models including Mistral Large, Medium, and Small.

**Supported Models:**

-   `mistral-large` - Most capable model (128k context)
-   `mistral-medium` - Balanced performance (32k context)
-   `mistral-small` - Fast and efficient (32k context)
-   `mixtral-8x7b` - Mixture of experts (32k context)
-   `mixtral-8x22b` - Larger mixture model (64k context)

**Features:**

-   Safe mode for content filtering
-   Configurable random seed for reproducibility
-   Custom base URL support

**Example:**

```php
use Mindwave\Mindwave\Facades\LLM;

$response = LLM::driver('mistral')
    ->model('mistral-large')
    ->setOptions(['safe_mode' => true])
    ->generateText('Generate a product description for an e-commerce site');
```

**Limitations:**

-   Streaming is not currently supported for Mistral AI
-   Function calling support varies by model

### Provider Comparison

| Feature          | OpenAI     | Mistral AI |
| ---------------- | ---------- | ---------- |
| Text Generation  | ✅         | ✅         |
| Streaming        | ✅         | ❌         |
| Function Calling | ✅         | ⚠️ Limited |
| Chat Mode        | ✅         | ✅         |
| Image Inputs     | ✅ GPT-4V  | ❌         |
| Context Windows  | Up to 128k | Up to 128k |
| Safe Mode        | ❌         | ✅         |

## Message Formatting

### Simple Prompts

For basic use cases, pass a string prompt:

```php
use Mindwave\Mindwave\Facades\LLM;

$response = LLM::generateText('What is Laravel?');
```

### System and User Messages

Configure system behavior separately from user input:

```php
use Mindwave\Mindwave\Facades\LLM;

$llm = LLM::setSystemMessage('You are an expert Laravel developer.');

$response = $llm->generateText('How do I implement middleware?');
```

### Multi-turn Conversations (OpenAI)

For complex conversations, use the chat method with message arrays:

```php
use Mindwave\Mindwave\Facades\LLM;

$messages = [
    ['role' => 'system', 'content' => 'You are a helpful assistant.'],
    ['role' => 'user', 'content' => 'What is PHP?'],
    ['role' => 'assistant', 'content' => 'PHP is a server-side scripting language.'],
    ['role' => 'user', 'content' => 'How does it compare to Python?'],
];

$response = LLM::driver('openai')->chat($messages);
```

## Function/Tool Calling

Function calling allows LLMs to request execution of predefined functions with structured parameters. This enables building dynamic applications where the LLM decides which functions to call based on user input.

### Defining Functions from Closures

Use PHP closures with type hints and attributes to define functions:

```php
use Mindwave\Mindwave\Facades\LLM;
use Mindwave\Mindwave\LLM\FunctionCalling\FunctionBuilder;
use Mindwave\Mindwave\LLM\FunctionCalling\Attributes\Description;

$functions = FunctionBuilder::make()
    ->addFunction(
        name: 'get_current_weather',
        description: 'Get the current weather for a location',
        closure: function (
            #[Description('The city and state, e.g. San Francisco, CA')]
            string $location,
            #[Description('The temperature unit to use')]
            string $unit = 'celsius'
        ) {
            // Your implementation here
            return "The weather in {$location} is 22°{$unit}";
        }
    );

$result = LLM::driver('openai')->functionCall(
    prompt: 'What is the weather in Paris?',
    functions: $functions
);

// Result contains the function call details
if ($result instanceof \Mindwave\Mindwave\LLM\FunctionCalling\FunctionCall) {
    echo "Function called: {$result->name}\n";
    print_r($result->arguments);
    // Output:
    // Function called: get_current_weather
    // Array ( [location] => Paris, France [unit] => celsius )
}
```

### Manual Function Definition

Define functions manually with full control over parameters:

```php
use Mindwave\Mindwave\LLM\FunctionCalling\FunctionBuilder;

$functions = FunctionBuilder::make();

$functions->addFunction('get_current_weather')
    ->setDescription('Get the current weather')
    ->addParameter(
        name: 'location',
        type: 'string',
        description: 'The city and state, e.g. San Francisco, CA',
        isRequired: true
    )
    ->addParameter(
        name: 'unit',
        type: 'string',
        description: 'Temperature unit',
        isRequired: true,
        enum: ['celsius', 'fahrenheit']
    );

$functions->addFunction('get_forecast')
    ->setDescription('Get an N-day weather forecast')
    ->addParameter('location', 'string', 'The city and state', true)
    ->addParameter('days', 'integer', 'Number of days to forecast', true);
```

### Handling Function Call Responses

Process function call results and continue the conversation:

```php
use Mindwave\Mindwave\Facades\LLM;
use Mindwave\Mindwave\LLM\FunctionCalling\FunctionBuilder;
use Mindwave\Mindwave\LLM\FunctionCalling\FunctionCall;

$functions = FunctionBuilder::make()
    ->addFunction(
        name: 'search_database',
        description: 'Search for products in the database',
        closure: function (
            #[Description('Search query')]
            string $query,
            #[Description('Maximum results to return')]
            int $limit = 10
        ) {
            // Simulate database search
            return [
                ['id' => 1, 'name' => 'Product A', 'price' => 29.99],
                ['id' => 2, 'name' => 'Product B', 'price' => 49.99],
            ];
        }
    );

$result = LLM::driver('openai')->functionCall(
    prompt: 'Find me the top 5 products related to Laravel',
    functions: $functions
);

if ($result instanceof FunctionCall) {
    // Execute the function
    $functionName = $result->name;
    $arguments = $result->arguments;

    // Get the closure from the builder and execute it
    $searchResults = call_user_func_array(
        $functions->toArray()[0]['function']['closure'] ?? fn() => [],
        $arguments
    );

    // Format results for display
    echo "Found " . count($searchResults) . " products\n";
    foreach ($searchResults as $product) {
        echo "- {$product['name']}: \${$product['price']}\n";
    }
}
```

### Required Function Calls

Force the LLM to call a specific function:

```php
use Mindwave\Mindwave\Facades\LLM;
use Mindwave\Mindwave\LLM\FunctionCalling\FunctionBuilder;

$functions = FunctionBuilder::make()
    ->addFunction(
        name: 'extract_entities',
        description: 'Extract named entities from text',
        closure: function (
            #[Description('List of person names found')]
            array $persons,
            #[Description('List of locations found')]
            array $locations,
            #[Description('List of organizations found')]
            array $organizations
        ) {
            return compact('persons', 'locations', 'organizations');
        }
    );

// Require the LLM to call 'extract_entities'
$result = LLM::driver('openai')->functionCall(
    prompt: 'Extract entities from: "Elon Musk founded SpaceX in California"',
    functions: $functions,
    requiredFunction: 'extract_entities'  // Force this function
);

// The LLM must call extract_entities and provide structured output
print_r($result->arguments);
// Array (
//     [persons] => Array ( [0] => Elon Musk )
//     [locations] => Array ( [0] => California )
//     [organizations] => Array ( [0] => SpaceX )
// )
```

### Provider Compatibility

| Provider   | Function Calling Support     |
| ---------- | ---------------------------- |
| OpenAI     | ✅ Full support              |
| Mistral AI | ⚠️ Limited (model dependent) |

## Streaming Responses

Streaming allows you to receive LLM responses in real-time as they're generated, providing better user experience for long-form content.

### Basic Streaming

Stream text chunks as they arrive:

```php
use Mindwave\Mindwave\Facades\LLM;

$stream = LLM::driver('openai')->streamText('Write a long essay about Laravel');

foreach ($stream as $chunk) {
    echo $chunk;  // Output: "Laravel ", "is ", "a ", "web ", "framework..."
    flush();      // Flush output buffer to display immediately
}
```

### Server-Sent Events (SSE)

Use the StreamedTextResponse helper for easy SSE integration:

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\LLM\Streaming\StreamedTextResponse;
use Illuminate\Http\Request;

Route::get('/api/chat', function (Request $request) {
    $prompt = $request->input('prompt');

    // Generate streaming response
    $stream = Mindwave::llm()->streamText($prompt);

    // Wrap in StreamedTextResponse
    $response = new StreamedTextResponse($stream);

    // Return as SSE-formatted HTTP response
    return $response->toStreamedResponse();
});
```

### Client-Side Consumption

Consume streaming responses with JavaScript EventSource:

```javascript
const eventSource = new EventSource('/api/chat?prompt=Tell me a story');

eventSource.addEventListener('message', (event) => {
    console.log('Received chunk:', event.data);
    document.getElementById('output').textContent += event.data;
});

eventSource.addEventListener('done', () => {
    console.log('Stream completed');
    eventSource.close();
});

eventSource.onerror = (error) => {
    console.error('Stream error:', error);
    eventSource.close();
};
```

### Processing Stream Chunks

Execute callbacks on each streamed chunk:

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\LLM\Streaming\StreamedTextResponse;

$stream = Mindwave::llm()->streamText('Write a blog post about PHP 8.3');

$response = new StreamedTextResponse($stream);

// Process each chunk before streaming to client
$response->onChunk(function (string $chunk) {
    // Log chunks for monitoring
    Log::info('Streamed chunk', ['content' => $chunk]);

    // Track token usage
    app('metrics')->increment('llm.tokens.streamed');
});

return $response->toStreamedResponse();
```

### Plain Text Streaming

For non-browser clients, use plain text streaming:

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\LLM\Streaming\StreamedTextResponse;

Route::get('/api/stream-plain', function () {
    $stream = Mindwave::llm()->streamText('Generate API documentation');

    $response = new StreamedTextResponse($stream);

    // Return plain text stream (no SSE formatting)
    return $response->toPlainStreamedResponse();
});
```

### Converting Streams to Strings

For testing or debugging, collect the entire stream:

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\LLM\Streaming\StreamedTextResponse;

$stream = Mindwave::llm()->streamText('Short response');

$response = new StreamedTextResponse($stream);

// Consume entire stream and return as string
$fullText = $response->toString();

echo $fullText;  // Complete response as a single string
```

**Note:** Converting to string defeats the purpose of streaming. Only use for testing or when you need the complete response.

### Provider Support

| Provider   | Streaming Support |
| ---------- | ----------------- |
| OpenAI     | ✅ Full support   |
| Mistral AI | ❌ Not supported  |

For complete streaming examples with Vue.js, Alpine.js, and Livewire, see the [Streaming Reference](/docs/core/streaming).

## Integration with Other Features

### Using with PromptComposer

Combine LLM with PromptComposer for structured prompts and output parsing:

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\Prompts\PromptTemplate;
use Mindwave\Mindwave\Prompts\OutputParsers\StructuredOutputParser;

// Define output structure
class Recipe
{
    public string $dishName;
    public ?string $description;
    public ?int $portions;
    public ?array $steps;
}

// Create prompt template with structured output
$template = PromptTemplate::create(
    template: 'Generate a recipe for {dish}',
    outputParser: new StructuredOutputParser(Recipe::class)
);

// Generate structured output
$recipe = Mindwave::llm()->generate($template, [
    'dish' => 'pasta carbonara'
]);

// $recipe is now a Recipe object
echo $recipe->dishName;        // "Pasta Carbonara"
echo $recipe->portions;        // 4
print_r($recipe->steps);       // Array of cooking steps
```

### Using with Context Discovery

Integrate LLM with Context Discovery for context-aware responses:

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Discover relevant context from your codebase
$context = Mindwave::discover('How does authentication work?')
    ->inDirectory('app/Http/Middleware')
    ->maxTokens(8000)
    ->get();

// Build a prompt with discovered context
$prompt = "Based on this code:\n\n";
$prompt .= $context->format();
$prompt .= "\n\nAnswer: How does authentication middleware work?";

// Generate response with context
$response = Mindwave::llm()
    ->setSystemMessage('You are a Laravel expert analyzing code.')
    ->generateText($prompt);

echo $response;
```

### Using with PromptComposer Token Management

Ensure prompts fit within model context windows:

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\PromptComposer\PromptComposer;

// Create a large prompt
$documents = loadLargeDocuments();  // Hypothetical helper

$composer = PromptComposer::make()
    ->model('gpt-4-turbo')                    // 128k context window
    ->reserveTokensForCompletion(2000);      // Reserve for response

// Add documents until we hit the limit
foreach ($documents as $doc) {
    $section = "## {$doc['title']}\n{$doc['content']}\n\n";

    if (!$composer->canFit($section)) {
        break;  // Stop before exceeding context window
    }

    $composer->addText($section);
}

// Add the final question
$composer->addText("Based on the above documents, summarize the key findings.");

// Generate with confidence it fits
$response = Mindwave::llm()->generateText($composer->toString());
```

### Using with OpenTelemetry Tracing

All LLM calls are automatically traced when OpenTelemetry is enabled:

```php
use Mindwave\Mindwave\Facades\Mindwave;

// LLM calls are automatically instrumented
$response = Mindwave::llm()
    ->model('gpt-4-turbo')
    ->generateText('Explain dependency injection');

// Traces include:
// - Provider and model used
// - Prompt content (if capture_messages is enabled)
// - Token usage (input and output)
// - Request duration
// - Error information (if failed)
```

View traces in your OpenTelemetry backend (Jaeger, Zipkin, etc.) to analyze:

-   LLM call performance
-   Token usage patterns
-   Error rates by provider/model
-   Request latency distributions

For more details, see [OpenTelemetry Tracing](/docs/core/tracing).

### Complete Integration Example

Combine all features for production-ready LLM usage:

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\Prompts\PromptTemplate;
use Mindwave\Mindwave\Prompts\OutputParsers\JsonOutputParser;
use Illuminate\Support\Facades\Cache;

class CodeAnalyzer
{
    public function analyzeFile(string $filePath): array
    {
        // 1. Discover relevant context
        $context = Mindwave::discover("Analyze {$filePath}")
            ->inPaths([$filePath])
            ->maxTokens(4000)
            ->get();

        // 2. Create structured prompt with output parser
        $template = PromptTemplate::create(
            template: <<<'PROMPT'
            Analyze this code and provide:
            1. Purpose and functionality
            2. Potential issues or improvements
            3. Security concerns

            Code:
            {code}

            Respond in JSON format.
            PROMPT,
            outputParser: new JsonOutputParser()
        );

        // 3. Cache results to avoid duplicate LLM calls
        $cacheKey = "code_analysis:" . md5($filePath . filemtime($filePath));

        return Cache::remember($cacheKey, 3600, function () use ($template, $context) {
            // 4. Generate with automatic tracing
            return Mindwave::llm()
                ->model('gpt-4-turbo')
                ->setSystemMessage('You are an expert code reviewer.')
                ->generate($template, [
                    'code' => $context->format()
                ]);
        });
    }
}

// Usage
$analyzer = new CodeAnalyzer();
$analysis = $analyzer->analyzeFile('app/Models/User.php');

print_r($analysis);
// Array (
//     [purpose] => "Represents application users..."
//     [issues] => Array ( ... )
//     [security] => Array ( ... )
// )
```

## Advanced Topics

### Custom Providers

Create custom LLM drivers for unsupported providers:

```php
use Mindwave\Mindwave\Contracts\LLM;
use Mindwave\Mindwave\LLM\Drivers\BaseDriver;

class CustomLLMDriver extends BaseDriver implements LLM
{
    public function __construct(
        protected string $apiKey,
        protected string $model = 'default-model'
    ) {}

    public function generateText(string $prompt): ?string
    {
        // Implement your provider's API call
        $response = Http::withToken($this->apiKey)
            ->post('https://api.custom-llm.com/generate', [
                'model' => $this->model,
                'prompt' => $prompt,
            ]);

        return $response->json('text');
    }
}
```

Register the custom driver in a service provider:

```php
use Mindwave\Mindwave\LLM\LLMManager;

class AppServiceProvider extends ServiceProvider
{
    public function boot()
    {
        $this->app->extend('mindwave.llm.manager', function (LLMManager $manager) {
            $manager->extend('custom', function ($app) {
                return new CustomLLMDriver(
                    apiKey: config('services.custom_llm.key'),
                    model: config('services.custom_llm.model')
                );
            });

            return $manager;
        });
    }
}
```

Use your custom driver:

```php
use Mindwave\Mindwave\Facades\LLM;

$response = LLM::driver('custom')->generateText('Hello!');
```

### Model Context Windows

Mindwave automatically tracks context window limits for all supported models:

```php
use Mindwave\Mindwave\Facades\LLM;
use Mindwave\Mindwave\PromptComposer\Tokenizer\ModelTokenLimits;

// Get context window for a model
$contextWindow = ModelTokenLimits::getContextWindow('gpt-4-turbo');
echo $contextWindow;  // 128000

// Check limits programmatically
$llm = LLM::driver('openai')->model('gpt-4-turbo');
$maxTokens = $llm->maxContextTokens();
echo $maxTokens;  // 128000
```

**Supported Model Context Windows:**

| Model             | Context Window   |
| ----------------- | ---------------- |
| GPT-5             | 400,000 tokens   |
| GPT-4.1           | 1,000,000 tokens |
| GPT-4 Turbo       | 128,000 tokens   |
| GPT-4o            | 128,000 tokens   |
| GPT-4             | 8,192 tokens     |
| GPT-4-32k         | 32,768 tokens    |
| GPT-3.5 Turbo     | 16,385 tokens    |
| O1 Preview        | 128,000 tokens   |
| Claude 3.5 Sonnet | 200,000 tokens   |
| Claude 3 Opus     | 200,000 tokens   |
| Mistral Large     | 128,000 tokens   |
| Mixtral 8x7B      | 32,000 tokens    |
| Gemini 1.5 Pro    | 2,000,000 tokens |

### Testing with Fake Driver

Use the Fake driver for testing without making real API calls:

```php
use Mindwave\Mindwave\Facades\LLM;

// In tests
class FeatureTest extends TestCase
{
    public function test_llm_response()
    {
        $fake = LLM::driver('fake');
        $fake->respondsWith('This is a test response');

        $response = $fake->generateText('Any prompt');

        $this->assertEquals('This is a test response', $response);
    }
}
```

Configure the fake driver for function calling tests:

```php
use Mindwave\Mindwave\Facades\LLM;
use Mindwave\Mindwave\LLM\FunctionCalling\FunctionBuilder;

$fake = LLM::driver('fake');

$functions = FunctionBuilder::make()
    ->addFunction('test_function', 'A test function');

$result = $fake->functionCall('Call a function', $functions);

// Fake driver returns a mock FunctionCall
$this->assertEquals('fake_function', $result->name);
```

### Error Handling

Implement robust error handling for production applications:

```php
use Mindwave\Mindwave\Facades\LLM;
use Illuminate\Support\Facades\Log;

try {
    $response = LLM::driver('openai')->generateText($prompt);
} catch (\OpenAI\Exceptions\RateLimitException $e) {
    // Handle rate limits
    Log::warning('OpenAI rate limit exceeded', [
        'error' => $e->getMessage(),
    ]);

    // Implement exponential backoff
    sleep(5);
    $response = LLM::driver('openai')->generateText($prompt);

} catch (\OpenAI\Exceptions\InvalidRequestException $e) {
    // Handle invalid requests (token limits, etc.)
    Log::error('Invalid LLM request', [
        'error' => $e->getMessage(),
        'prompt' => $prompt,
    ]);

    throw $e;

} catch (\Exception $e) {
    // Handle general errors
    Log::error('LLM request failed', [
        'error' => $e->getMessage(),
        'provider' => 'openai',
    ]);

    // Fallback to cached response or default
    $response = Cache::get('fallback_response', 'Sorry, I encountered an error.');
}
```

### Graceful Degradation

Implement fallbacks when primary providers fail:

```php
use Mindwave\Mindwave\Facades\LLM;

function generateWithFallback(string $prompt): string
{
    $providers = ['openai', 'mistral'];

    foreach ($providers as $provider) {
        try {
            return LLM::driver($provider)->generateText($prompt);
        } catch (\Exception $e) {
            Log::warning("Provider {$provider} failed", [
                'error' => $e->getMessage()
            ]);
            continue;
        }
    }

    // All providers failed
    throw new \RuntimeException('All LLM providers failed');
}

$response = generateWithFallback('Generate a response');
```

### Token Limit Handling

Detect and handle token limit errors:

```php
use Mindwave\Mindwave\Facades\LLM;
use Mindwave\Mindwave\PromptComposer\PromptComposer;

function generateSafely(string $prompt, string $model = 'gpt-4-turbo'): string
{
    $composer = PromptComposer::make()
        ->model($model)
        ->reserveTokensForCompletion(1000);

    // Check if prompt fits
    if (!$composer->canFit($prompt)) {
        // Truncate or summarize
        $composer->addText($prompt);
        $prompt = $composer->truncate($prompt);

        Log::info('Prompt truncated to fit context window');
    }

    try {
        return LLM::driver('openai')
            ->model($model)
            ->generateText($prompt);
    } catch (\OpenAI\Exceptions\InvalidRequestException $e) {
        if (str_contains($e->getMessage(), 'maximum context length')) {
            // Retry with smaller prompt
            $shorterPrompt = substr($prompt, 0, strlen($prompt) / 2);
            return generateSafely($shorterPrompt, $model);
        }

        throw $e;
    }
}
```

## Best Practices

### 1. Use Environment-Based Configuration

Keep API keys in environment variables, never in code:

```php
// Good
$apiKey = env('MINDWAVE_OPENAI_API_KEY');

// Bad - Never do this
$apiKey = 'sk-proj-...';
```

### 2. Cache Expensive LLM Calls

Cache responses to reduce costs and latency:

```php
use Illuminate\Support\Facades\Cache;

$cacheKey = 'llm_response:' . md5($prompt);

$response = Cache::remember($cacheKey, 3600, function () use ($prompt) {
    return LLM::generateText($prompt);
});
```

### 3. Monitor Token Usage

Track token consumption for cost optimization:

```php
use Mindwave\Mindwave\Facades\Mindwave;

$response = Mindwave::llm()->generateText($prompt);

// OpenTelemetry automatically tracks token usage
// Access via your observability platform
```

### 4. Set Appropriate Timeouts

Configure HTTP client timeouts for long-running requests:

```php
use OpenAI;

$client = OpenAI::client(
    apiKey: config('mindwave-llm.llms.openai.api_key'),
    timeout: 120  // 2 minutes timeout
);

$llm = LLM::createOpenAIDriver($client);
```

### 5. Use Streaming for Long Responses

Improve user experience with streaming for lengthy content:

```php
// Good for long content
$stream = LLM::streamText('Write a comprehensive guide...');

// Bad for long content (user waits for complete response)
$response = LLM::generateText('Write a comprehensive guide...');
```

### 6. Validate Function Call Arguments

Always validate LLM-generated function arguments:

```php
use Mindwave\Mindwave\LLM\FunctionCalling\FunctionCall;

$result = LLM::functionCall($prompt, $functions);

if ($result instanceof FunctionCall) {
    // Validate before using
    $validated = validator($result->arguments, [
        'location' => 'required|string|max:255',
        'unit' => 'required|in:celsius,fahrenheit',
    ])->validate();

    // Safe to use
    $weather = getWeather($validated['location'], $validated['unit']);
}
```

### 7. Use System Messages for Consistent Behavior

Set system messages for predictable responses:

```php
// Good - Consistent behavior
$llm = LLM::setSystemMessage('You are a professional technical writer. Be concise and accurate.');

// Less predictable
$llm = LLM::generateText('Write documentation...');
```

### 8. Handle Errors Gracefully

Always implement error handling:

```php
try {
    $response = LLM::generateText($prompt);
} catch (\Exception $e) {
    Log::error('LLM request failed', ['error' => $e->getMessage()]);
    return response()->json(['error' => 'Failed to generate response'], 500);
}
```

## API Reference

### LLM Interface

```php
interface LLM
{
    // Set system message for the LLM
    public function setSystemMessage(string $systemMessage): static;

    // Set custom options
    public function setOptions(array $options): static;

    // Generate text from a prompt
    public function generateText(string $prompt): ?string;

    // Generate using a PromptTemplate
    public function generate(PromptTemplate $promptTemplate, array $inputs = []): mixed;

    // Generate text with streaming
    public function streamText(string $prompt): Generator;

    // Get maximum context window size
    public function maxContextTokens(): int;
}
```

### OpenAI Driver Methods

```php
// Set model
$llm->model(string $model): self;

// Set max tokens for completion
$llm->maxTokens(int $maxTokens): self;

// Set temperature (0.0 to 2.0)
$llm->temperature(float $temperature): self;

// Function calling
$llm->functionCall(
    string $prompt,
    array|FunctionBuilder $functions,
    ?string $requiredFunction = 'auto'
): FunctionCall|string|null;

// Chat completion
$llm->chat(string|array $prompt): ChatResponse;

// Text completion
$llm->completion(string $prompt): CompletionResponse;
```

### FunctionBuilder Methods

```php
// Create new builder
FunctionBuilder::make(): self;

// Add function from closure
$builder->add(string $name, Closure $param): self;

// Add function with manual parameters
$builder->addFunction(string $name, ?string $description = null, ?Closure $closure = null): PendingFunction;

// Build function schemas
$builder->build(): array;

// Convert to array
$builder->toArray(): array;

// Convert to JSON
$builder->toJson(): string;
```

### StreamedTextResponse Methods

```php
// Create from generator
new StreamedTextResponse(Generator $stream);

// Convert to SSE response
$response->toStreamedResponse(int $status = 200, array $headers = []): StreamedResponse;

// Convert to plain text response
$response->toPlainStreamedResponse(): StreamedResponse;

// Convert entire stream to string (for testing)
$response->toString(): string;

// Get raw iterator
$response->getIterator(): Generator;

// Process chunks with callback
$response->onChunk(callable $callback): self;
```

## Next Steps

-   Learn about [Streaming](/docs/core/streaming) for real-time LLM responses
-   Explore [PromptComposer](/docs/core/prompt-composer) for advanced prompt management
-   Discover [Context Discovery](/docs/core/context-discovery) for retrieving relevant code
-   Set up [OpenTelemetry Tracing](/docs/core/tracing) to monitor LLM performance
-   Review [Function Calling Examples](/docs/core/function-calling) for advanced patterns
