# Mistral AI Provider

## Overview

Mistral AI is a European AI company offering high-performance large language models with competitive pricing and strong GDPR compliance. Their models are particularly known for excellent performance-to-cost ratios and support for multiple languages, making them an attractive alternative to US-based providers.

### Why Use Mistral AI with Mindwave?

**European Data Sovereignty**

-   GDPR-compliant by design
-   Data processed in European data centers
-   Ideal for EU-based applications with strict data residency requirements
-   No data retention for API calls (unless explicitly configured)

**Competitive Pricing**

-   Significantly lower costs compared to GPT-4
-   Mistral Large offers comparable performance at ~60% of GPT-4 cost
-   Mistral Small is extremely cost-effective for simple tasks

**High Performance**

-   Mistral Large: Top-tier reasoning and instruction following
-   Mixtral models: Excellent cost-performance ratio using Mixture-of-Experts architecture
-   Strong multilingual capabilities (especially French, German, Spanish, Italian)

**Self-Hosting Option**

-   Open-source models available (Mistral 7B, Mixtral 8x7B)
-   Deploy on your own infrastructure
-   Full control over data and costs

### Key Capabilities

-   Chat completion with system messages
-   Function calling (tools)
-   JSON mode for structured outputs
-   Streaming responses (coming soon)
-   Reproducible outputs with random seed
-   Safe mode for content filtering
-   Context windows up to 128K tokens

## Setup & Configuration

### Getting Your API Key

1. Visit [console.mistral.ai](https://console.mistral.ai)
2. Create an account or sign in
3. Navigate to "API Keys" in the dashboard
4. Generate a new API key
5. Copy the key (you won't be able to see it again)

### Environment Configuration

Add your Mistral API key to your `.env` file:

```dotenv
# Required: Your Mistral API key
MINDWAVE_MISTRAL_API_KEY=your-mistral-api-key-here

# Optional: Choose your default model
MINDWAVE_MISTRAL_MODEL=mistral-large-latest

# Optional: Custom base URL for self-hosted deployments
MINDWAVE_MISTRAL_BASE_URL=https://api.mistral.ai

# Optional: Default system message
MINDWAVE_MISTRAL_SYSTEM_MESSAGE="You are a helpful AI assistant."

# Optional: Generation parameters
MINDWAVE_MISTRAL_MAX_TOKENS=1000
MINDWAVE_MISTRAL_TEMPERATURE=0.4

# Optional: Safety and reproducibility
MINDWAVE_MISTRAL_SAFE_MODE=false
MINDWAVE_MISTRAL_RANDOM_SEED=
```

### Configuration File

The Mistral provider is configured in `config/mindwave-llm.php`:

```php
'default' => env('MINDWAVE_LLM', 'mistral'),

'llms' => [
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
```

### Testing Your Connection

Verify your Mistral configuration is working:

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Test basic generation
$response = Mindwave::driver('mistral')->generateText('Say hello!');
echo $response; // "Hello! How can I help you today?"

// Check model configuration
$driver = Mindwave::driver('mistral');
echo $driver->maxContextTokens(); // e.g., 32000 for mistral-medium
```

## Available Models

### Mistral Large (Flagship Model)

**Model IDs:**

-   `mistral-large-latest` (recommended - always uses latest version)
-   `mistral-large-2407` (July 2024 version)
-   `mistral-large-2402` (February 2024 version)

**Specifications:**

-   **Context Window:** 128,000 tokens
-   **Pricing (per 1M tokens):**
    -   Input: $4.00
    -   Output: $12.00
-   **Parameters:** 123B (estimated)

**Best For:**

-   Complex reasoning tasks
-   Code generation and debugging
-   Multi-step problem solving
-   High-quality content creation
-   Function calling with multiple tools
-   Tasks requiring deep understanding

**Example:**

```php
use Mindwave\Mindwave\Facades\Mindwave;

$response = Mindwave::driver('mistral')
    ->model('mistral-large-latest')
    ->temperature(0.3)
    ->generateText('Explain quantum computing to a 10-year-old.');
```

### Mistral Medium

**Model ID:** `mistral-medium-latest`

**Specifications:**

-   **Context Window:** 32,000 tokens
-   **Pricing (per 1M tokens):**
    -   Input: $2.70
    -   Output: $8.10
-   **Parameters:** ~40B (estimated)

**Best For:**

-   General-purpose chat applications
-   Content generation
-   Summarization
-   Translation
-   Moderate complexity reasoning
-   Cost-sensitive production deployments

**Example:**

```php
$summary = Mindwave::driver('mistral')
    ->model('mistral-medium-latest')
    ->generateText("Summarize this article: {$articleText}");
```

### Mistral Small

**Model ID:** `mistral-small-latest`

**Specifications:**

-   **Context Window:** 32,000 tokens
-   **Pricing (per 1M tokens):**
    -   Input: $1.00
    -   Output: $3.00
-   **Parameters:** ~22B (estimated)

**Best For:**

-   Simple classification tasks
-   Basic Q&A
-   Simple content generation
-   High-volume, low-complexity tasks
-   Development and testing
-   Cost-critical applications

**Example:**

```php
$classification = Mindwave::driver('mistral')
    ->model('mistral-small-latest')
    ->generateText("Classify sentiment: {$customerReview}");
```

### Mistral Tiny

**Model ID:** `mistral-tiny`

**Specifications:**

-   **Context Window:** 32,000 tokens
-   **Pricing (per 1M tokens):**
    -   Input: $0.25
    -   Output: $0.25
-   **Parameters:** ~7B (Mistral 7B)

**Best For:**

-   Ultra-low-cost operations
-   Simple tasks at scale
-   Embeddings alternative
-   Prototyping
-   Testing and development

**Example:**

```php
$result = Mindwave::driver('mistral')
    ->model('mistral-tiny')
    ->generateText("Answer yes or no: Is Paris in France?");
```

### Mixtral 8x7B

**Model ID:** `mixtral-8x7b-instruct-v0.1`

**Specifications:**

-   **Context Window:** 32,000 tokens
-   **Architecture:** Mixture-of-Experts (8 experts, 2 active per token)
-   **Effective Parameters:** 12.9B (46.7B total)
-   **Pricing:** Similar to Mistral Medium

**Best For:**

-   High-throughput applications
-   Multilingual tasks
-   Cost-effective alternative to Mistral Large
-   Code generation
-   Tasks requiring broad knowledge

**Performance Notes:**

-   Faster inference than similar-sized dense models
-   Excellent multilingual performance
-   Strong code understanding

### Mixtral 8x22B

**Model ID:** `mixtral-8x22b-instruct-v0.1`

**Specifications:**

-   **Context Window:** 64,000 tokens
-   **Architecture:** Mixture-of-Experts (8 experts, 2 active per token)
-   **Effective Parameters:** ~39B (141B total)
-   **Pricing:** Competitive with Mistral Large

**Best For:**

-   Complex reasoning at lower cost than GPT-4
-   Large document analysis
-   Multi-lingual tasks requiring sophistication
-   Advanced code generation

## Basic Usage

### Simple Text Generation

Generate text from a prompt:

```php
use Mindwave\Mindwave\Facades\Mindwave;

$driver = Mindwave::driver('mistral');

$response = $driver->generateText('Write a haiku about Laravel.');

echo $response;
// Code flows like streams
// Eloquent queries whisper
// Artisan commands dance
```

### Setting the Model

Choose which Mistral model to use:

```php
// Via configuration (permanent)
config(['mindwave-llm.llms.mistral.model' => 'mistral-large-latest']);

// Via driver method (for single request)
$response = Mindwave::driver('mistral')
    ->model('mistral-small-latest')
    ->generateText($prompt);
```

### Adjusting Temperature

Control response creativity:

```php
// Conservative (factual, deterministic)
$factual = Mindwave::driver('mistral')
    ->temperature(0.1)
    ->generateText('What is the capital of France?');

// Balanced (default)
$balanced = Mindwave::driver('mistral')
    ->temperature(0.7)
    ->generateText('Write a creative story.');

// Creative (varied, imaginative)
$creative = Mindwave::driver('mistral')
    ->temperature(1.2)
    ->generateText('Generate unique business ideas.');
```

### System Messages

Set behavior and context:

```php
$driver = Mindwave::driver('mistral')
    ->systemMessage('You are a senior Laravel developer with 10 years of experience.');

$advice = $driver->generateText('How should I structure a large Laravel application?');
```

### Multi-Turn Conversations

Build conversational interactions:

```php
use Mindwave\Mindwave\Facades\Mindwave;

$messages = [
    ['role' => 'system', 'content' => 'You are a helpful coding assistant.'],
    ['role' => 'user', 'content' => 'How do I validate an email in Laravel?'],
    ['role' => 'assistant', 'content' => 'You can use the email validation rule...'],
    ['role' => 'user', 'content' => 'Can I also check if the domain exists?'],
];

$response = Mindwave::driver('mistral')->chat($messages);
```

## Mistral-Specific Features

### Safe Mode

Mistral's Safe Mode adds content moderation to responses:

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Enable safe mode for user-facing content
$response = Mindwave::driver('mistral')
    ->safeMode(true)
    ->generateText($userInput);
```

**What Safe Mode Does:**

-   Filters harmful, inappropriate, or unsafe content
-   Refuses to generate illegal or dangerous information
-   Adds extra moderation layer beyond model training
-   Slightly increases latency (~50-100ms)

**When to Use Safe Mode:**

-   User-facing chatbots
-   Content generation for public consumption
-   Applications serving minors
-   Compliance-sensitive environments

**When to Skip Safe Mode:**

-   Internal tools
-   Development environments
-   Performance-critical applications
-   Content analysis (where you need to process all content)

**Configuration:**

```php
// In config/mindwave-llm.php
'mistral' => [
    'safe_mode' => env('MINDWAVE_MISTRAL_SAFE_MODE', true),
],

// Or per request
$driver = Mindwave::driver('mistral')->safeMode(true);
```

### Random Seed

Generate reproducible outputs:

```php
use Mindwave\Mindwave\Facades\Mindwave;

// First generation
$response1 = Mindwave::driver('mistral')
    ->randomSeed(12345)
    ->temperature(0.7)
    ->generateText('Generate a random user story.');

// Second generation with same seed
$response2 = Mindwave::driver('mistral')
    ->randomSeed(12345)
    ->temperature(0.7)
    ->generateText('Generate a random user story.');

// $response1 === $response2 (identical outputs!)
```

**Use Cases:**

-   **Testing:** Ensure consistent test outputs
-   **Debugging:** Reproduce specific model behaviors
-   **A/B Testing:** Compare different prompts with controlled variation
-   **Demos:** Reliable demonstrations
-   **Research:** Reproducible experiments

**Important Notes:**

-   Same seed + same input + same parameters = same output
-   Works across API calls and sessions
-   Does NOT work with `temperature: 0` (deterministic anyway)
-   Use any integer value

**Example: Testing Framework**

```php
use Mindwave\Mindwave\Facades\Mindwave;

it('generates consistent summaries', function () {
    $driver = Mindwave::driver('mistral')
        ->model('mistral-small-latest')
        ->randomSeed(42);

    $summary1 = $driver->generateText("Summarize: {$longText}");
    $summary2 = $driver->generateText("Summarize: {$longText}");

    expect($summary1)->toBe($summary2);
});
```

### Max Tokens Control

Limit response length:

```php
// Short responses
$brief = Mindwave::driver('mistral')
    ->maxTokens(100)
    ->generateText('Explain what Laravel is.');

// Long-form content
$detailed = Mindwave::driver('mistral')
    ->maxTokens(2000)
    ->generateText('Write a comprehensive guide to Laravel validation.');

// Configuration default
config(['mindwave-llm.llms.mistral.max_tokens' => 500]);
```

**Token Estimations:**

-   ~4 characters = 1 token (English)
-   ~100 tokens = 75 words
-   ~1000 tokens = 750 words (about 1.5 pages)

## Function Calling

Mistral models support function calling (tools) for structured interactions with external systems.

### Defining Functions

```php
use Mindwave\Mindwave\Facades\Mindwave;

$functions = [
    [
        'name' => 'get_weather',
        'description' => 'Get current weather for a location',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'location' => [
                    'type' => 'string',
                    'description' => 'City name, e.g., Paris, London',
                ],
                'unit' => [
                    'type' => 'string',
                    'enum' => ['celsius', 'fahrenheit'],
                    'description' => 'Temperature unit',
                ],
            ],
            'required' => ['location'],
        ],
    ],
    [
        'name' => 'search_database',
        'description' => 'Search the product database',
        'parameters' => [
            'type' => 'object',
            'properties' => [
                'query' => [
                    'type' => 'string',
                    'description' => 'Search query',
                ],
                'category' => [
                    'type' => 'string',
                    'description' => 'Product category filter',
                ],
            ],
            'required' => ['query'],
        ],
    ],
];
```

### Basic Function Calling

```php
use Mindwave\Mindwave\Facades\Mindwave;

$driver = Mindwave::driver('mistral')
    ->model('mistral-large-latest');

$messages = [
    [
        'role' => 'user',
        'content' => 'What is the weather in Paris?',
    ],
];

$response = $driver->chatWithFunctions(
    messages: $messages,
    functions: $functions
);

// Check if model wants to call a function
if ($response->finish_reason === 'tool_calls') {
    $toolCall = $response->tool_calls[0];

    echo $toolCall->function->name; // "get_weather"
    echo $toolCall->function->arguments; // {"location": "Paris", "unit": "celsius"}

    // Execute your function
    $weatherData = getWeather(
        location: json_decode($toolCall->function->arguments)->location
    );

    // Send result back to model
    $messages[] = [
        'role' => 'tool',
        'name' => 'get_weather',
        'content' => json_encode($weatherData),
    ];

    // Get final response
    $finalResponse = $driver->chat($messages);
    echo $finalResponse->content;
    // "The current temperature in Paris is 18°C with partly cloudy skies."
}
```

### Complete Function Calling Example

```php
use Mindwave\Mindwave\Facades\Mindwave;
use App\Models\Product;

class ProductSearchAgent
{
    protected $driver;

    public function __construct()
    {
        $this->driver = Mindwave::driver('mistral')
            ->model('mistral-large-latest')
            ->temperature(0.3);
    }

    public function answer(string $question): string
    {
        $functions = $this->getFunctionDefinitions();
        $messages = [
            ['role' => 'system', 'content' => 'You are a helpful product assistant.'],
            ['role' => 'user', 'content' => $question],
        ];

        $maxIterations = 5;
        $iteration = 0;

        while ($iteration < $maxIterations) {
            $response = $this->driver->chatWithFunctions(
                messages: $messages,
                functions: $functions
            );

            // If no function call, return the response
            if ($response->finish_reason !== 'tool_calls') {
                return $response->content;
            }

            // Execute function calls
            foreach ($response->tool_calls as $toolCall) {
                $result = $this->executeFunction(
                    $toolCall->function->name,
                    json_decode($toolCall->function->arguments, true)
                );

                $messages[] = [
                    'role' => 'tool',
                    'name' => $toolCall->function->name,
                    'content' => json_encode($result),
                    'tool_call_id' => $toolCall->id,
                ];
            }

            $iteration++;
        }

        return "I couldn't complete your request. Please try again.";
    }

    protected function executeFunction(string $name, array $arguments): mixed
    {
        return match($name) {
            'search_products' => $this->searchProducts($arguments),
            'get_product_details' => $this->getProductDetails($arguments),
            default => ['error' => 'Unknown function'],
        };
    }

    protected function searchProducts(array $args): array
    {
        $products = Product::query()
            ->where('name', 'like', "%{$args['query']}%")
            ->when($args['category'] ?? null, fn($q, $cat) => $q->where('category', $cat))
            ->limit(5)
            ->get(['id', 'name', 'price', 'category']);

        return $products->toArray();
    }

    protected function getProductDetails(array $args): array
    {
        $product = Product::find($args['product_id']);

        return $product ? $product->toArray() : ['error' => 'Product not found'];
    }

    protected function getFunctionDefinitions(): array
    {
        return [
            [
                'name' => 'search_products',
                'description' => 'Search for products by name and optionally filter by category',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'query' => [
                            'type' => 'string',
                            'description' => 'Product search query',
                        ],
                        'category' => [
                            'type' => 'string',
                            'description' => 'Optional category filter',
                        ],
                    ],
                    'required' => ['query'],
                ],
            ],
            [
                'name' => 'get_product_details',
                'description' => 'Get detailed information about a specific product',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'product_id' => [
                            'type' => 'integer',
                            'description' => 'The product ID',
                        ],
                    ],
                    'required' => ['product_id'],
                ],
            ],
        ];
    }
}

// Usage
$agent = new ProductSearchAgent();
echo $agent->answer('Show me wireless headphones under $100');
// Model will search products and provide formatted results
```

## Advanced Parameters

### Temperature

Controls randomness in responses:

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Deterministic (temperature: 0-0.3)
// Best for: factual answers, code generation, classification
$factual = Mindwave::driver('mistral')
    ->temperature(0.2)
    ->generateText('What is 2+2?');

// Balanced (temperature: 0.4-0.8)
// Best for: general conversation, content generation
$balanced = Mindwave::driver('mistral')
    ->temperature(0.7)
    ->generateText('Write a product description.');

// Creative (temperature: 0.9-1.5)
// Best for: creative writing, brainstorming, diverse outputs
$creative = Mindwave::driver('mistral')
    ->temperature(1.2)
    ->generateText('Create a unique sci-fi story premise.');
```

**Range:** 0.0 to 2.0 (practical range: 0.0 to 1.5)
**Default:** 0.7

### Top P (Nucleus Sampling)

Alternative to temperature for controlling randomness:

```php
// Conservative sampling (top 10% of likely tokens)
$conservative = Mindwave::driver('mistral')
    ->topP(0.1)
    ->generateText($prompt);

// Balanced (default)
$balanced = Mindwave::driver('mistral')
    ->topP(0.9)
    ->generateText($prompt);

// Wide sampling (consider more options)
$diverse = Mindwave::driver('mistral')
    ->topP(0.95)
    ->generateText($prompt);
```

**Range:** 0.0 to 1.0
**Default:** 1.0
**Note:** Use either temperature OR top_p, not both

### Max Tokens

Limit response length:

```php
// Short summary (100 tokens ≈ 75 words)
$summary = Mindwave::driver('mistral')
    ->maxTokens(100)
    ->generateText("Summarize: {$longArticle}");

// Medium response (500 tokens ≈ 375 words)
$description = Mindwave::driver('mistral')
    ->maxTokens(500)
    ->generateText("Describe this product in detail.");

// Long-form content (2000 tokens ≈ 1500 words)
$essay = Mindwave::driver('mistral')
    ->maxTokens(2000)
    ->generateText("Write a comprehensive guide.");
```

**Context Window Limits:**

-   Mistral Large: 128,000 tokens
-   Mistral Medium/Small: 32,000 tokens
-   Mixtral 8x7B: 32,000 tokens
-   Mixtral 8x22B: 64,000 tokens

### Combining Parameters

```php
use Mindwave\Mindwave\Facades\Mindwave;

$response = Mindwave::driver('mistral')
    ->model('mistral-large-latest')
    ->temperature(0.3)          // Focused responses
    ->maxTokens(1000)            // Reasonable length
    ->safeMode(true)             // Content filtering
    ->randomSeed(42)             // Reproducible
    ->systemMessage('You are a technical writer.')
    ->generateText('Explain Docker to beginners.');
```

## Streaming Responses

::: warning
Streaming is not currently implemented for the Mistral driver. This feature is planned for a future release.
:::

When streaming becomes available, you'll be able to use it like this:

```php
// This will work in a future version
use Mindwave\Mindwave\Facades\Mindwave;

Route::get('/chat', function (Request $request) {
    return Mindwave::driver('mistral')
        ->model('mistral-large-latest')
        ->stream($request->input('message'))
        ->respond();
});
```

For now, use the OpenAI driver if you need streaming functionality.

## Self-Hosted Deployment

Mistral offers open-source models that can be self-hosted for complete data control and cost savings at scale.

### Using a Custom Endpoint

Configure Mindwave to use your self-hosted Mistral instance:

```dotenv
MINDWAVE_MISTRAL_BASE_URL=https://your-mistral-instance.com
MINDWAVE_MISTRAL_API_KEY=your-custom-key
MINDWAVE_MISTRAL_MODEL=mistral-7b-instruct
```

### Docker Deployment

Deploy Mistral 7B with Docker:

```bash
# Pull the official Mistral image
docker pull mistralai/mistral-7b-instruct

# Run the server
docker run -d \
  --name mistral-server \
  -p 8080:8080 \
  --gpus all \
  -e MODEL=mistral-7b-instruct \
  mistralai/mistral-7b-instruct
```

### vLLM Deployment (Recommended)

For production self-hosting, use vLLM for better performance:

```bash
# Install vLLM
pip install vllm

# Run Mistral 7B with vLLM
python -m vllm.entrypoints.openai.api_server \
  --model mistralai/Mistral-7B-Instruct-v0.2 \
  --host 0.0.0.0 \
  --port 8080

# Or use Docker
docker run --runtime nvidia --gpus all \
    -v ~/.cache/huggingface:/root/.cache/huggingface \
    --env "HUGGING_FACE_HUB_TOKEN=<your_token>" \
    -p 8080:8000 \
    --ipc=host \
    vllm/vllm-openai:latest \
    --model mistralai/Mistral-7B-Instruct-v0.2
```

### Configuration for Self-Hosted

Update your Mindwave configuration:

```php
// config/mindwave-llm.php
'llms' => [
    'mistral' => [
        'api_key' => env('MINDWAVE_MISTRAL_API_KEY', 'not-required-for-local'),
        'base_url' => env('MINDWAVE_MISTRAL_BASE_URL', 'http://localhost:8080'),
        'model' => 'mistral-7b-instruct',
        'max_tokens' => 2000,
        'temperature' => 0.7,
    ],
],
```

### Available Open Source Models

**Mistral 7B Instruct v0.2**

-   7 billion parameters
-   32K context window
-   Excellent for general tasks
-   Low memory requirements (~14GB VRAM)

**Mixtral 8x7B Instruct**

-   46.7B total parameters (12.9B active)
-   32K context window
-   Superior performance to Mistral 7B
-   Requires ~90GB VRAM or quantization

**Mixtral 8x22B Instruct**

-   141B total parameters (39B active)
-   64K context window
-   Close to GPT-4 performance
-   Requires significant resources

### Performance Considerations

**GPU Requirements:**
| Model | Full Precision | 8-bit Quantization | 4-bit Quantization |
|-------|---------------|-------------------|-------------------|
| Mistral 7B | 14GB VRAM | 7GB VRAM | 4GB VRAM |
| Mixtral 8x7B | 90GB VRAM | 45GB VRAM | 23GB VRAM |
| Mixtral 8x22B | 280GB VRAM | 140GB VRAM | 70GB VRAM |

**Throughput:**

-   vLLM can achieve 10-20x higher throughput than naive implementations
-   Continuous batching for maximum GPU utilization
-   PagedAttention for efficient memory management

## Best Practices

### Model Selection Guide

**Choose Mistral Large when:**

-   You need top-tier reasoning capabilities
-   Task involves complex multi-step logic
-   Code generation quality is critical
-   Using function calling with multiple tools
-   Budget allows for premium performance

**Choose Mistral Medium when:**

-   You need balanced performance and cost
-   General-purpose chat application
-   Content generation and summarization
-   Production deployment at scale
-   Sweet spot for most use cases

**Choose Mistral Small when:**

-   Task is straightforward (classification, simple Q&A)
-   High volume of requests
-   Cost is primary concern
-   Development and testing
-   Sufficient for 70% of typical use cases

**Choose Mixtral 8x7B when:**

-   Need better performance than Small
-   Multilingual support is critical
-   Self-hosting is an option
-   Cost-effective alternative to Large
-   Batch processing workloads

### Cost Optimization

**1. Use Appropriate Models**

```php
// Bad: Using Mistral Large for simple tasks
$sentiment = Mindwave::driver('mistral')
    ->model('mistral-large-latest')
    ->generateText("Classify sentiment: {$tweet}");
// Cost: $0.004 per 1K input tokens

// Good: Use Mistral Small for classification
$sentiment = Mindwave::driver('mistral')
    ->model('mistral-small-latest')
    ->generateText("Classify sentiment: {$tweet}");
// Cost: $0.001 per 1K input tokens (75% savings!)
```

**2. Optimize Prompts with PromptComposer**

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Automatically fit prompts to model limits
$response = Mindwave::prompt()
    ->section('system', $systemInstructions)
    ->section('context', $largeDocument, priority: 50, shrinker: 'summarize')
    ->section('examples', $fewShotExamples, priority: 30)
    ->section('user', $userQuestion)
    ->driver('mistral')
    ->model('mistral-medium-latest')
    ->fit()  // Automatically trims to context window
    ->run();
```

**3. Set Appropriate Max Tokens**

```php
// Bad: Allowing unlimited response length
$response = Mindwave::driver('mistral')->generateText($prompt);
// Could generate 4000+ tokens

// Good: Set reasonable limits
$response = Mindwave::driver('mistral')
    ->maxTokens(500)  // Enough for most responses
    ->generateText($prompt);
```

**4. Monitor Costs with Tracing**

```php
use Mindwave\Mindwave\Models\MindwaveTrace;

// Find expensive traces
$expensive = MindwaveTrace::where('cost', '>', 0.10)->get();

// Daily cost summary
$dailyCost = MindwaveTrace::whereDate('created_at', today())
    ->sum('cost');

// Cost by model
$costByModel = MindwaveTrace::query()
    ->selectRaw('attributes->>"$.gen_ai.request.model" as model, SUM(cost) as total_cost')
    ->groupBy('model')
    ->get();
```

### Prompt Engineering for Mistral

**1. Be Direct and Specific**

```php
// Bad: Vague and indirect
$response = Mindwave::driver('mistral')
    ->generateText("Can you maybe help me with something about Laravel?");

// Good: Clear and specific
$response = Mindwave::driver('mistral')
    ->generateText("List the 5 most important Laravel best practices for security.");
```

**2. Use System Messages Effectively**

```php
// Set expertise and tone via system message
$driver = Mindwave::driver('mistral')
    ->model('mistral-large-latest')
    ->systemMessage('You are a Laravel expert with 15 years of experience.
        Provide concise, accurate answers with code examples.
        Focus on Laravel 11 best practices.');

$advice = $driver->generateText('How should I implement API rate limiting?');
```

**3. Leverage Mistral's Multilingual Strengths**

```php
// Mistral excels at European languages
$translation = Mindwave::driver('mistral')
    ->model('mistral-medium-latest')
    ->generateText("Translate to French, German, and Spanish:
        'Your order has been shipped and will arrive in 2-3 business days.'");
```

**4. Structure Complex Tasks**

```php
$response = Mindwave::driver('mistral')
    ->model('mistral-large-latest')
    ->generateText("
        Analyze this user review and provide:
        1. Sentiment (positive/negative/neutral)
        2. Key themes (list)
        3. Actionable insights (bullet points)
        4. Priority level (high/medium/low)

        Review: {$userReview}
    ");
```

### Error Handling

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Illuminate\Http\Client\RequestException;

try {
    $response = Mindwave::driver('mistral')
        ->model('mistral-large-latest')
        ->generateText($prompt);

    return $response;

} catch (RequestException $e) {
    // Check error type
    if ($e->response->status() === 401) {
        Log::error('Mistral API authentication failed - check API key');
        return 'Authentication error. Please contact support.';
    }

    if ($e->response->status() === 429) {
        Log::warning('Mistral rate limit exceeded', [
            'retry_after' => $e->response->header('Retry-After')
        ]);
        return 'Service temporarily busy. Please try again.';
    }

    if ($e->response->status() === 400) {
        $error = $e->response->json();
        Log::error('Mistral bad request', ['error' => $error]);

        // Handle context length errors
        if (str_contains($error['message'] ?? '', 'context length')) {
            return 'Input too long. Please reduce the text length.';
        }
    }

    // Generic error
    Log::error('Mistral API error', [
        'status' => $e->response->status(),
        'body' => $e->response->body()
    ]);

    return 'An error occurred. Please try again later.';

} catch (\RuntimeException $e) {
    // Empty API response (no choices returned)
    Log::error('Mistral returned empty response', [
        'error' => $e->getMessage(),
    ]);
    return 'Received an empty response from the API';
}
```

::: tip Empty Response Protection
Mindwave throws a `RuntimeException` if the Mistral API returns a response with no choices. This prevents silent failures from propagating through your application.
:::

### Rate Limiting

Implement retry logic for rate limits:

```php
use Illuminate\Support\Facades\Cache;

class MistralService
{
    public function generateWithRetry(string $prompt, int $maxRetries = 3): string
    {
        $attempt = 0;

        while ($attempt < $maxRetries) {
            try {
                return Mindwave::driver('mistral')
                    ->model('mistral-medium-latest')
                    ->generateText($prompt);

            } catch (RequestException $e) {
                if ($e->response->status() === 429) {
                    $retryAfter = (int) $e->response->header('Retry-After', 60);

                    if ($attempt < $maxRetries - 1) {
                        Log::info("Rate limited, waiting {$retryAfter}s before retry");
                        sleep($retryAfter);
                        $attempt++;
                        continue;
                    }
                }

                throw $e;
            }
        }

        throw new \RuntimeException('Max retries exceeded');
    }
}
```

### Timeout Configuration

Configure appropriate timeouts:

```php
// In config/mindwave-llm.php or app configuration
config([
    'http.timeout' => 60,  // 60 seconds for long responses
    'http.connect_timeout' => 10,  // 10 seconds to establish connection
]);

// Or per request
Http::timeout(120)->post(/* ... */);
```

## Pricing & Cost Management

### Current Pricing (Per 1M Tokens)

| Model              | Input | Output | Best For                       |
| ------------------ | ----- | ------ | ------------------------------ |
| **Mistral Large**  | $4.00 | $12.00 | Complex reasoning, top quality |
| **Mistral Medium** | $2.70 | $8.10  | General purpose, balanced      |
| **Mistral Small**  | $1.00 | $3.00  | Simple tasks, high volume      |
| **Mistral Tiny**   | $0.25 | $0.25  | Ultra-low-cost operations      |

### Cost Calculation Examples

**Example 1: Customer Support Chatbot**

```php
// Input: 500 tokens (conversation history)
// Output: 200 tokens (response)
// Model: Mistral Medium
// Volume: 10,000 requests/day

$inputCost = (500 / 1_000_000) * 10_000 * $2.70;   // $0.0135
$outputCost = (200 / 1_000_000) * 10_000 * $8.10;  // $0.0162

$dailyCost = $inputCost + $outputCost;  // $0.0297/day
$monthlyCost = $dailyCost * 30;         // $0.89/month
```

**Example 2: Content Summarization**

```php
// Input: 2000 tokens (article)
// Output: 300 tokens (summary)
// Model: Mistral Small
// Volume: 1,000 articles/day

$inputCost = (2000 / 1_000_000) * 1_000 * $1.00;   // $0.002
$outputCost = (300 / 1_000_000) * 1_000 * $3.00;   // $0.0009

$dailyCost = $inputCost + $outputCost;  // $0.0029/day
$monthlyCost = $dailyCost * 30;         // $0.087/month
```

### Comparison with OpenAI

| Task              | Mistral Model | Cost        | GPT Model     | Cost        | Savings |
| ----------------- | ------------- | ----------- | ------------- | ----------- | ------- |
| Complex reasoning | Large         | $4/$12      | GPT-4 Turbo   | $10/$30     | 60%     |
| General chat      | Medium        | $2.70/$8.10 | GPT-3.5 Turbo | $0.50/$1.50 | -81%    |
| Simple tasks      | Small         | $1/$3       | GPT-3.5 Turbo | $0.50/$1.50 | -50%    |

**Key Takeaway:** Mistral Large offers significant savings vs GPT-4, but GPT-3.5 Turbo is cheaper for simple tasks.

### Using PromptComposer to Manage Costs

Automatically optimize prompts to stay within token budgets:

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Automatically trim expensive context
$response = Mindwave::prompt()
    ->section('system', 'You are a helpful assistant.', priority: 100)
    ->section('context', $largeDatabase, priority: 50, shrinker: 'summarize')
    ->section('examples', $fewShotExamples, priority: 30, shrinker: 'truncate')
    ->section('user', $question, priority: 100)
    ->driver('mistral')
    ->model('mistral-medium-latest')
    ->maxTokensBudget(1000)  // Limit input cost
    ->fit()
    ->run();
```

### Monitoring Spend with Tracing

Track and analyze costs:

```php
use Mindwave\Mindwave\Models\MindwaveTrace;

// Most expensive operations this month
$expensive = MindwaveTrace::query()
    ->whereMonth('created_at', now()->month)
    ->orderByDesc('cost')
    ->limit(10)
    ->get(['name', 'cost', 'attributes->gen_ai.request.model']);

// Total spend by model
$spendByModel = MindwaveTrace::query()
    ->selectRaw('
        attributes->>"$.gen_ai.request.model" as model,
        COUNT(*) as requests,
        SUM(cost) as total_cost,
        AVG(cost) as avg_cost
    ')
    ->whereMonth('created_at', now()->month)
    ->groupBy('model')
    ->get();

// Set up alerts
if (MindwaveTrace::whereDate('created_at', today())->sum('cost') > 10.00) {
    Mail::to('admin@example.com')->send(new DailyCostAlert());
}
```

## GDPR & Data Privacy

### European Data Residency

**Mistral AI Advantages:**

-   All API infrastructure hosted in Europe
-   Data processed in EU data centers (France)
-   No cross-border data transfers to USA
-   Ideal for GDPR compliance

**Configuration for GDPR:**

```php
// Ensure you're using EU endpoints
'mistral' => [
    'base_url' => env('MINDWAVE_MISTRAL_BASE_URL', 'https://api.mistral.ai'),
    // Mistral AI's default API is EU-hosted
],
```

### GDPR Compliance Features

**1. Data Minimization**

```php
// Only send necessary data to Mistral
$response = Mindwave::driver('mistral')
    ->generateText("Analyze this feedback: " . strip_tags($userFeedback));
```

**2. No Data Retention**

-   Mistral AI does not store API requests by default
-   No training on customer data without explicit consent
-   Right to deletion automatically satisfied

**3. Pseudonymization**

```php
use Illuminate\Support\Str;

// Replace PII before sending to LLM
$sanitized = preg_replace(
    '/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/',
    '[EMAIL]',
    $userText
);

$response = Mindwave::driver('mistral')->generateText($sanitized);
```

**4. Disable Message Capture in Production**

```dotenv
# Don't store prompts/responses in tracing
MINDWAVE_TRACE_CAPTURE_MESSAGES=false
```

### Data Processing Agreement

Mistral AI provides GDPR-compliant DPAs:

-   Standard Contractual Clauses (SCCs)
-   Article 28 GDPR compliance
-   Available on request from Mistral AI support

### Privacy Best Practices

**1. Minimize PII in Prompts**

```php
// Bad: Sending full user data
$response = Mindwave::driver('mistral')
    ->generateText("Analyze user: " . json_encode($user));

// Good: Send only relevant, non-PII data
$response = Mindwave::driver('mistral')
    ->generateText("Analyze user behavior: {$user->purchase_category}, {$user->activity_level}");
```

**2. Use Safe Mode for User Content**

```php
// Enable safe mode when processing user-generated content
$response = Mindwave::driver('mistral')
    ->safeMode(true)
    ->generateText($userInput);
```

**3. Implement Retention Policies**

```php
// Auto-delete traces older than 30 days
// config/mindwave-tracing.php
'retention_days' => 30,

// Run cleanup
php artisan mindwave:prune-traces
```

## Limitations & Considerations

### Rate Limits

**Mistral AI Rate Limits (as of 2024):**

-   **Requests per minute:** Varies by tier
    -   Free tier: ~20 RPM
    -   Paid tier: ~60 RPM
    -   Enterprise: Custom limits
-   **Tokens per minute:** ~100K-500K depending on tier

**Handling Rate Limits:**

```php
use Illuminate\Support\Facades\RateLimiter;

// Application-level rate limiting
RateLimiter::for('mistral-api', function ($request) {
    return Limit::perMinute(50)->by($request->user()->id);
});

// In your code
if (RateLimiter::tooManyAttempts('mistral-api:' . $userId, 50)) {
    $seconds = RateLimiter::availableIn('mistral-api:' . $userId);
    return response()->json(['message' => "Too many requests. Try again in {$seconds}s"], 429);
}

RateLimiter::hit('mistral-api:' . $userId);
```

### Context Window Limits

**Maximum Context Windows:**

-   Mistral Large: 128,000 tokens (~96,000 words)
-   Mistral Medium/Small: 32,000 tokens (~24,000 words)
-   Mixtral 8x7B: 32,000 tokens
-   Mixtral 8x22B: 64,000 tokens

**Handling Long Inputs:**

```php
use Mindwave\Mindwave\PromptComposer\Tokenizer\ModelTokenLimits;

$maxTokens = ModelTokenLimits::getContextWindow('mistral-medium-latest');
// Returns: 32000

// Use PromptComposer to auto-fit
$response = Mindwave::prompt()
    ->section('system', $instructions)
    ->section('context', $veryLongDocument, priority: 50, shrinker: 'summarize')
    ->section('user', $question)
    ->driver('mistral')
    ->model('mistral-medium-latest')
    ->fit()  // Automatically trims to 32K context
    ->run();
```

### Model Availability

**Regional Considerations:**

-   All Mistral models available globally via API
-   Self-hosted models require download from Hugging Face
-   Some models may have limited availability during high demand

### Language Support

**Strong Support:**

-   English, French, German, Spanish, Italian

**Good Support:**

-   Dutch, Portuguese, Polish, Russian

**Limited Support:**

-   Other European languages
-   Non-European languages (use with caution)

**Example:**

```php
// Excellent for European languages
$translation = Mindwave::driver('mistral')
    ->model('mistral-medium-latest')
    ->generateText("Translate to German: 'Your order has been confirmed.'");
// "Ihre Bestellung wurde bestätigt."

// Less reliable for Asian languages
$chinese = Mindwave::driver('mistral')
    ->generateText("Translate to Chinese: 'Hello world'");
// May be less accurate than GPT-4
```

### Streaming Limitations

**Current Status:**

-   Streaming is NOT yet implemented in MistralDriver
-   Will throw `BadMethodCallException` if attempted
-   Planned for future release

**Workaround:**
Use OpenAI driver for streaming needs:

```php
// For streaming, use OpenAI
return Mindwave::driver('openai')
    ->stream($prompt)
    ->respond();
```

## Troubleshooting

### Common Errors

#### 401 Unauthorized

**Error:**

```
HTTP 401: Unauthorized
```

**Causes:**

-   Invalid or missing API key
-   Expired API key
-   API key not activated

**Solutions:**

```php
// 1. Check API key is set
dd(config('mindwave-llm.llms.mistral.api_key'));

// 2. Verify in .env
MINDWAVE_MISTRAL_API_KEY=your-actual-key-here

// 3. Clear config cache
php artisan config:clear

// 4. Test connection
try {
    $response = Mindwave::driver('mistral')->generateText('test');
    echo "Connection successful!";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage();
}
```

#### 429 Too Many Requests

**Error:**

```
HTTP 429: Too Many Requests
Retry-After: 60
```

**Causes:**

-   Exceeded rate limit
-   Too many concurrent requests
-   Token per minute limit reached

**Solutions:**

```php
// 1. Implement exponential backoff
use Illuminate\Support\Facades\Http;

$maxRetries = 3;
$attempt = 0;

while ($attempt < $maxRetries) {
    try {
        return Mindwave::driver('mistral')->generateText($prompt);
    } catch (RequestException $e) {
        if ($e->response->status() === 429) {
            $waitTime = 2 ** $attempt * 10; // 10s, 20s, 40s
            sleep($waitTime);
            $attempt++;
            continue;
        }
        throw $e;
    }
}

// 2. Use queueing for high-volume tasks
dispatch(new GenerateContentJob($prompt))->onQueue('mistral-api');

// 3. Upgrade to higher tier
// Contact Mistral AI for increased limits
```

#### 400 Bad Request - Context Length

**Error:**

```
HTTP 400: Context length exceeded
Maximum context length is 32000 tokens
```

**Causes:**

-   Input + output tokens exceed model limit
-   Prompt is too long

**Solutions:**

```php
// 1. Check token count
use Mindwave\Mindwave\PromptComposer\Tokenizer\TiktokenTokenizer;

$tokenizer = new TiktokenTokenizer();
$tokenCount = $tokenizer->count($prompt);

if ($tokenCount > 30000) {
    // Prompt too long for mistral-medium (32K limit)
    // Reduce prompt or use mistral-large (128K limit)
}

// 2. Use PromptComposer auto-fitting
$response = Mindwave::prompt()
    ->section('context', $longText, shrinker: 'summarize')
    ->section('user', $question)
    ->driver('mistral')
    ->fit()  // Automatically trims to model limit
    ->run();

// 3. Switch to larger context model
$response = Mindwave::driver('mistral')
    ->model('mistral-large-latest')  // 128K context
    ->generateText($longPrompt);
```

#### 500 Internal Server Error

**Error:**

```
HTTP 500: Internal Server Error
```

**Causes:**

-   Mistral API temporary issue
-   Malformed request
-   Server-side bug

**Solutions:**

```php
// 1. Implement retry logic
$maxRetries = 2;
$attempt = 0;

while ($attempt < $maxRetries) {
    try {
        return Mindwave::driver('mistral')->generateText($prompt);
    } catch (RequestException $e) {
        if ($e->response->status() === 500 && $attempt < $maxRetries - 1) {
            sleep(5);
            $attempt++;
            continue;
        }

        Log::error('Mistral 500 error', [
            'attempt' => $attempt,
            'response' => $e->response->body()
        ]);

        throw $e;
    }
}

// 2. Check Mistral status
// Visit: https://status.mistral.ai

// 3. Contact support if persistent
```

#### Self-Hosted Connection Issues

**Error:**

```
cURL error 7: Failed to connect to localhost port 8080
```

**Causes:**

-   Self-hosted server not running
-   Wrong base URL
-   Network connectivity

**Solutions:**

```php
// 1. Verify server is running
curl http://localhost:8080/health

// 2. Check base URL configuration
dd(config('mindwave-llm.llms.mistral.base_url'));

// 3. Test connection manually
Http::get('http://localhost:8080/health');

// 4. Check Docker logs
docker logs mistral-server

// 5. Verify firewall rules
sudo ufw status
```

### Debugging Tips

**Enable Detailed Logging:**

```php
// Log all Mistral requests
use Illuminate\Support\Facades\Http;

Http::macro('mistral', function () {
    return Http::withOptions([
        'debug' => true,
        'on_stats' => function ($stats) {
            Log::info('Mistral API call', [
                'url' => $stats->getEffectiveUri(),
                'transfer_time' => $stats->getTransferTime(),
            ]);
        },
    ]);
});
```

**Inspect Trace Data:**

```php
use Mindwave\Mindwave\Models\MindwaveTrace;

// Find failed requests
$failed = MindwaveTrace::whereNotNull('error')->latest()->first();

dd([
    'error' => $failed->error,
    'attributes' => $failed->attributes,
    'spans' => $failed->spans,
]);
```

## Comparison with OpenAI

### When to Use Mistral vs OpenAI

**Choose Mistral When:**

-   GDPR compliance is critical
-   European data residency required
-   Cost optimization is important (for GPT-4 class models)
-   Multilingual European language support needed
-   Self-hosting option desired

**Choose OpenAI When:**

-   Need absolute best-in-class reasoning (GPT-4o, o1)
-   Require proven production stability
-   Need comprehensive ecosystem (GPT Store, etc.)
-   Budget allows premium pricing
-   Streaming is required (until Mistral driver supports it)

### Performance Comparison

| Benchmark        | Mistral Large | Mistral Medium | GPT-4 Turbo | GPT-3.5 Turbo |
| ---------------- | ------------- | -------------- | ----------- | ------------- |
| MMLU             | 81.2%         | ~75%           | 86.4%       | 70.0%         |
| HumanEval (code) | 73.2%         | ~60%           | 87.0%       | 48.1%         |
| MT-Bench         | 8.2           | ~7.5           | 9.3         | 8.4           |
| Context Window   | 128K          | 32K            | 128K        | 16K           |

### Cost Comparison

**For 1M input + 1M output tokens:**

| Model          | Total Cost | Use Case                 |
| -------------- | ---------- | ------------------------ |
| Mistral Large  | $16.00     | Complex reasoning        |
| Mistral Medium | $10.80     | General purpose          |
| Mistral Small  | $4.00      | Simple tasks             |
| GPT-4 Turbo    | $40.00     | Top-tier reasoning       |
| GPT-3.5 Turbo  | $2.00      | High-volume simple tasks |

**Savings Example:**
If you're currently using GPT-4 Turbo for 10M tokens/month:

-   GPT-4 Turbo: $400/month
-   Mistral Large: $160/month
-   **Savings: $240/month (60%)**

### Feature Parity

| Feature          | Mistral   | OpenAI      |
| ---------------- | --------- | ----------- |
| Chat Completion  | ✅        | ✅          |
| Function Calling | ✅        | ✅          |
| Streaming        | ⏳ Coming | ✅          |
| JSON Mode        | ✅        | ✅          |
| Vision           | ❌        | ✅ (GPT-4V) |
| Image Generation | ❌        | ✅ (DALL-E) |
| Embeddings       | ✅        | ✅          |
| Fine-tuning      | ✅        | ✅          |
| Self-hosting     | ✅        | ❌          |

### Migration Example

Switching from OpenAI to Mistral:

```php
// Before (OpenAI)
$response = Mindwave::driver('openai')
    ->model('gpt-4-turbo')
    ->temperature(0.7)
    ->maxTokens(1000)
    ->generateText($prompt);

// After (Mistral)
$response = Mindwave::driver('mistral')
    ->model('mistral-large-latest')
    ->temperature(0.7)
    ->maxTokens(1000)
    ->generateText($prompt);

// Minimal code changes required!
```

### Use Case Recommendations

**Content Generation:**

-   Blog posts, marketing copy: Mistral Medium (cost-effective)
-   Technical documentation: Mistral Large or GPT-4 (accuracy)
-   Social media posts: Mistral Small (speed + cost)

**Code Generation:**

-   Complex refactoring: GPT-4 Turbo (best quality)
-   Code review: Mistral Large (good balance)
-   Simple functions: Mistral Medium (sufficient)

**Customer Support:**

-   European customers: Mistral Medium (GDPR + cost)
-   Global customers: GPT-3.5 Turbo (established reliability)
-   Complex issues: Mistral Large or GPT-4

**Data Analysis:**

-   Financial analysis: Mistral Large (European compliance)
-   General analytics: Mistral Medium (balanced)
-   Simple classification: Mistral Small (cost-effective)

## Next Steps

Now that you understand the Mistral AI provider:

-   **[Configuration](/docs/configuration)** - Deep dive into all configuration options
-   **[Prompt Composer](/docs/core/prompt-composer)** - Auto-fit long prompts to Mistral's context windows
-   **[Tracing](/docs/observability/tracing)** - Monitor Mistral costs and performance
-   **[Function Calling](/docs/advanced/function-calling)** - Build agentic workflows with Mistral

## Resources

**Official Mistral AI:**

-   [Mistral AI Website](https://mistral.ai)
-   [API Documentation](https://docs.mistral.ai)
-   [Model Pricing](https://mistral.ai/technology#pricing)
-   [API Status](https://status.mistral.ai)

**Community:**

-   [Mistral AI Discord](https://discord.gg/mistralai)
-   [GitHub Discussions](https://github.com/mistralai)
-   [Hugging Face Models](https://huggingface.co/mistralai)

**Mindwave Integration:**

-   [GitHub Repository](https://github.com/helgesverre/mindwave)
-   [Issue Tracker](https://github.com/helgesverre/mindwave/issues)
