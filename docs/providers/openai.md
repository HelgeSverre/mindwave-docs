# OpenAI Provider

## Overview

OpenAI is one of the leading LLM providers and is the default provider in Mindwave. OpenAI offers a comprehensive suite of models from the cost-effective GPT-3.5 Turbo to the powerful GPT-4 Turbo and the reasoning-focused O1 models.

### Why Use OpenAI with Mindwave?

-   **Industry-leading models** - Access GPT-4o, GPT-4 Turbo, and O1 reasoning models
-   **Function calling** - Native support for tool use and function execution
-   **Reliable API** - Production-grade infrastructure with high availability
-   **Streaming support** - Real-time response streaming with Server-Sent Events
-   **Cost-effective options** - Models ranging from $0.15/1M to $60/1M input tokens
-   **Large context windows** - Up to 128K tokens for comprehensive context

### Key Capabilities

-   ✅ Chat completions with multi-turn conversations
-   ✅ Streaming responses with SSE
-   ✅ Function/tool calling with parallel execution
-   ✅ JSON mode for structured outputs
-   ✅ Vision capabilities (GPT-4o, GPT-4 Turbo with Vision)
-   ✅ Advanced reasoning (O1 models)
-   ✅ Legacy completions API support
-   ✅ Automatic tracing and cost tracking

## Setup & Configuration

### Getting Your API Key

1. Create an account at [platform.openai.com](https://platform.openai.com)
2. Navigate to **API Keys** section
3. Click **Create new secret key**
4. Copy your key (starts with `sk-`)
5. Add billing information to enable API access

### Environment Variables

Add these to your `.env` file:

```dotenv
# Required: Your OpenAI API key
MINDWAVE_OPENAI_API_KEY=sk-your-api-key-here

# Optional: Organization ID (for teams)
MINDWAVE_OPENAI_ORG_ID=org-your-org-id

# Optional: Default model
MINDWAVE_OPENAI_MODEL=gpt-4-1106-preview

# Optional: Generation parameters
MINDWAVE_OPENAI_MAX_TOKENS=1000
MINDWAVE_OPENAI_TEMPERATURE=0.4

# Set OpenAI as default provider
MINDWAVE_LLM=openai
```

### Configuration File

The OpenAI configuration is defined in `config/mindwave-llm.php`:

```php
return [
    'default' => env('MINDWAVE_LLM', 'openai'),

    'llms' => [
        'openai' => [
            'api_key' => env('MINDWAVE_OPENAI_API_KEY'),
            'org_id' => env('MINDWAVE_OPENAI_ORG_ID'),
            'model' => env('MINDWAVE_OPENAI_MODEL', 'gpt-4-1106-preview'),
            'max_tokens' => env('MINDWAVE_OPENAI_MAX_TOKENS', 1000),
            'temperature' => env('MINDWAVE_OPENAI_TEMPERATURE', 0.4),
        ],
    ],
];
```

### Testing Your Connection

Test that your API key is working:

```php
use Mindwave\Mindwave\Facades\Mindwave;

$response = Mindwave::llm()->generateText('Say hello!');

if ($response) {
    echo "✅ OpenAI connection successful!";
    echo "Response: " . $response;
} else {
    echo "❌ Connection failed - check your API key";
}
```

## Available Models

### GPT-4o (Multimodal)

The most capable and efficient GPT-4 model with multimodal capabilities.

| Model ID      | Context Window | Input Price | Output Price | Best For                   |
| ------------- | -------------- | ----------- | ------------ | -------------------------- |
| `gpt-4o`      | 128,000 tokens | $2.50/1M    | $10.00/1M    | Multimodal tasks, vision   |
| `gpt-4o-mini` | 128,000 tokens | $0.15/1M    | $0.60/1M     | Fast, cost-effective tasks |

**Use Cases:**

-   Image analysis and understanding
-   Document processing with visual elements
-   Fast reasoning with vision
-   Cost-sensitive multimodal applications

**Limitations:**

-   Not designed for deep reasoning (use O1 instead)

### GPT-4 Turbo

High-intelligence model with large context window and improved performance.

| Model ID              | Context Window | Input Price | Output Price | Best For                      |
| --------------------- | -------------- | ----------- | ------------ | ----------------------------- |
| `gpt-4-turbo`         | 128,000 tokens | $10.00/1M   | $30.00/1M    | Complex tasks, large contexts |
| `gpt-4-turbo-preview` | 128,000 tokens | $10.00/1M   | $30.00/1M    | Latest preview features       |
| `gpt-4-1106-preview`  | 128,000 tokens | $10.00/1M   | $30.00/1M    | Stable version                |

**Use Cases:**

-   Complex reasoning and analysis
-   Large document processing
-   Multi-step problem solving
-   Production applications requiring intelligence

**Limitations:**

-   Higher cost than GPT-3.5
-   Slower than GPT-4o-mini

### GPT-4 (Original)

The original GPT-4 model with smaller context window.

| Model ID    | Context Window | Input Price | Output Price | Best For            |
| ----------- | -------------- | ----------- | ------------ | ------------------- |
| `gpt-4`     | 8,192 tokens   | $30.00/1M   | $60.00/1M    | High-stakes tasks   |
| `gpt-4-32k` | 32,768 tokens  | $60.00/1M   | $120.00/1M   | Large context needs |

**Use Cases:**

-   When you need GPT-4 intelligence with smaller contexts
-   Legacy applications

**Note:** GPT-4 Turbo is generally better - larger context, lower cost, faster.

### GPT-3.5 Turbo

Fast and cost-effective model for simpler tasks.

| Model ID                 | Context Window | Input Price | Output Price | Best For                  |
| ------------------------ | -------------- | ----------- | ------------ | ------------------------- |
| `gpt-3.5-turbo`          | 16,385 tokens  | $0.50/1M    | $1.50/1M     | High-volume, simple tasks |
| `gpt-3.5-turbo-instruct` | 4,096 tokens   | $1.50/1M    | $2.00/1M     | Legacy completions        |

**Use Cases:**

-   High-volume content generation
-   Simple classification and categorization
-   Basic Q&A systems
-   Cost-sensitive applications
-   Rapid prototyping

**Limitations:**

-   Less capable reasoning than GPT-4
-   May require more prompt engineering
-   Limited context window

### O1 Models (Reasoning)

Specialized models with enhanced reasoning capabilities for complex problems.

| Model ID     | Context Window | Input Price | Output Price | Best For                |
| ------------ | -------------- | ----------- | ------------ | ----------------------- |
| `o1-preview` | 128,000 tokens | $15.00/1M   | $60.00/1M    | Complex reasoning tasks |
| `o1-mini`    | 128,000 tokens | $3.00/1M    | $12.00/1M    | Faster reasoning        |

**Use Cases:**

-   Scientific and mathematical problems
-   Complex logical reasoning
-   Code debugging and optimization
-   Multi-step problem decomposition
-   Research and analysis

**Important Differences:**

-   O1 models use internal reasoning steps (not visible)
-   No streaming support
-   No system messages (use user messages instead)
-   No temperature control (reasoning models use fixed sampling)
-   Higher latency due to reasoning process

**When to Use O1 vs GPT-4:**

-   **O1**: Complex logic, math, science, debugging
-   **GPT-4**: General chat, content generation, function calling

## Basic Usage

### Simple Text Generation

Generate text using the default configured model:

```php
use Mindwave\Mindwave\Facades\Mindwave;

$response = Mindwave::llm()->generateText('Explain Laravel in one sentence.');

echo $response;
// "Laravel is a PHP web framework with expressive syntax..."
```

### Chat Completion

Send a chat message with system instructions:

```php
use Mindwave\Mindwave\Facades\Mindwave;

$response = Mindwave::llm()
    ->model('gpt-4o')
    ->maxTokens(500)
    ->temperature(0.7)
    ->chat([
        ['role' => 'system', 'content' => 'You are a helpful Laravel expert.'],
        ['role' => 'user', 'content' => 'How do I create a migration?'],
    ]);

echo $response->content;
```

### Using Specific Models

Switch between models easily:

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Use GPT-4o for speed and efficiency
$quickResponse = Mindwave::llm()
    ->model('gpt-4o-mini')
    ->generateText('Summarize this: ' . $text);

// Use GPT-4 Turbo for complex reasoning
$detailedResponse = Mindwave::llm()
    ->model('gpt-4-turbo')
    ->maxTokens(2000)
    ->generateText('Analyze the architectural patterns in: ' . $code);

// Use O1 for complex logic
$reasoningResponse = Mindwave::llm()
    ->model('o1-preview')
    ->generateText('Debug this algorithm: ' . $algorithm);
```

### Multi-Turn Conversations

Maintain conversation context across multiple turns:

```php
use Mindwave\Mindwave\Facades\Mindwave;

$messages = [
    ['role' => 'system', 'content' => 'You are a helpful assistant.'],
    ['role' => 'user', 'content' => 'What is Laravel?'],
];

// First turn
$response1 = Mindwave::llm()->chat($messages);
$messages[] = [
    'role' => 'assistant',
    'content' => $response1->content
];

// Second turn
$messages[] = ['role' => 'user', 'content' => 'How do I install it?'];
$response2 = Mindwave::llm()->chat($messages);

echo $response2->content;
```

### Setting System Messages

Configure the assistant's behavior with system messages:

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Method 1: Via chat messages
$response = Mindwave::llm()->chat([
    ['role' => 'system', 'content' => 'You are a senior Laravel architect. Provide concise, production-ready advice.'],
    ['role' => 'user', 'content' => $question],
]);

// Method 2: Using generateText (system message as prompt)
$response = Mindwave::llm()->generateText(
    "You are a helpful assistant.\n\nUser: {$userQuestion}"
);
```

## Model-Specific Features

### GPT-4o: Speed and Efficiency

GPT-4o is optimized for fast, cost-effective responses:

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Fast content generation
$summary = Mindwave::llm()
    ->model('gpt-4o-mini')
    ->temperature(0.3)
    ->maxTokens(200)
    ->generateText("Summarize: $articleText");

// Image understanding (multimodal)
// Note: Vision capabilities require using the OpenAI SDK directly
// or extending the driver to support image inputs
```

**Performance Tips:**

-   Use `gpt-4o-mini` for 80% faster responses than GPT-4
-   Lower temperature (0.3-0.5) for more consistent outputs
-   Ideal for production chat interfaces

### O1 Models: Advanced Reasoning

O1 models work differently - they perform internal reasoning:

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Complex debugging
$debugAnalysis = Mindwave::llm()
    ->model('o1-preview')
    ->generateText("
        Debug this Laravel code and explain the issue:

        {$buggyCode}

        Identify the bug, explain why it occurs, and provide a fix.
    ");

// Mathematical problem solving
$solution = Mindwave::llm()
    ->model('o1-mini')
    ->generateText("
        Solve this optimization problem:
        Given constraints: {$constraints}
        Find the optimal solution.
    ");
```

**O1 Best Practices:**

-   Don't use streaming (not supported)
-   Don't set temperature (ignored)
-   Use detailed prompts with clear problem statements
-   Allow higher max_tokens for reasoning steps
-   Expect higher latency (30-60 seconds for complex problems)

**O1 vs GPT-4 Decision Matrix:**

| Task Type            | Recommended Model | Why                                |
| -------------------- | ----------------- | ---------------------------------- |
| Debug complex code   | O1                | Deep reasoning required            |
| Generate boilerplate | GPT-4o-mini       | Fast, simple task                  |
| Solve math problems  | O1-mini           | Reasoning required, cost-effective |
| Chat interface       | GPT-4o            | Real-time streaming, fast          |
| Analyze architecture | O1-preview        | Complex logical analysis           |
| Simple Q&A           | GPT-3.5-turbo     | Cost-effective, fast               |

### GPT-3.5 Turbo: Cost Optimization

GPT-3.5 Turbo is perfect for high-volume, simple tasks:

```php
use Mindwave\Mindwave\Facades\Mindwave;

// High-volume content tagging
$tags = collect($articles)->map(function ($article) {
    return Mindwave::llm()
        ->model('gpt-3.5-turbo')
        ->temperature(0.2)
        ->maxTokens(50)
        ->generateText("Extract 3 tags from: {$article->title}");
});

// Simple classification
$category = Mindwave::llm()
    ->model('gpt-3.5-turbo')
    ->temperature(0.1)
    ->generateText("
        Categorize this support ticket (bug/feature/question):
        {$ticket->body}

        Return only: bug, feature, or question
    ");
```

**Cost Comparison (1M tokens input + 1M tokens output):**

-   GPT-3.5-turbo: $2.00
-   GPT-4o-mini: $0.75 (actually cheaper!)
-   GPT-4o: $12.50
-   GPT-4-turbo: $40.00

**Note:** For new projects, consider `gpt-4o-mini` over `gpt-3.5-turbo` - it's cheaper and more capable.

## Function Calling

OpenAI's function calling allows the model to intelligently call functions with structured parameters.

### Defining Functions with FunctionBuilder

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\LLM\FunctionCalling\FunctionBuilder;

$functions = FunctionBuilder::make()
    ->addFunction('get_current_weather')
    ->setDescription('Get the current weather in a given location')
    ->addParameter('location', 'string', 'The city and state, e.g. San Francisco, CA', required: true)
    ->addParameter('unit', 'string', 'Temperature unit', required: true, enum: ['celsius', 'fahrenheit']);

$result = Mindwave::llm()
    ->model('gpt-4o')
    ->functionCall(
        prompt: 'What is the weather in Boston?',
        functions: $functions,
        requiredFunction: 'auto' // or 'none' or specific function name
    );

if ($result instanceof \Mindwave\Mindwave\LLM\FunctionCalling\FunctionCall) {
    echo "Function: {$result->name}\n";
    print_r($result->arguments);
    // Function: get_current_weather
    // Array(['location' => 'Boston, MA', 'unit' => 'celsius'])
}
```

### Function Calling with Closures

Define functions using PHP closures with attribute-based descriptions:

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\LLM\FunctionCalling\FunctionBuilder;
use Mindwave\Mindwave\LLM\FunctionCalling\Attributes\Description;

$functions = FunctionBuilder::make()
    ->addFunction(
        name: 'get_current_weather',
        description: 'Get the current weather in a location',
        closure: function (
            #[Description('The city and state, e.g. San Francisco, CA')]
            string $location,
            #[Description('The temperature unit to use')]
            string $unit
        ) {
            // This closure isn't executed by the LLM
            // It's used to generate the function schema
            return "Weather data for {$location} in {$unit}";
        }
    );

$result = Mindwave::llm()->functionCall(
    'What is the weather like in London?',
    $functions
);
```

### Executing Function Calls

Handle the function call response and execute your logic:

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\LLM\FunctionCalling\FunctionBuilder;
use Mindwave\Mindwave\LLM\FunctionCalling\FunctionCall;

// Define available functions
$functions = FunctionBuilder::make()
    ->addFunction('search_users')
    ->setDescription('Search for users by expertise')
    ->addParameter('skill', 'string', 'The skill to search for', required: true)
    ->addParameter('years_experience', 'integer', 'Minimum years of experience', required: false);

// Call the LLM
$result = Mindwave::llm()
    ->model('gpt-4o')
    ->functionCall(
        'Find developers with Laravel expertise',
        $functions
    );

// Execute the function
if ($result instanceof FunctionCall) {
    $users = match ($result->name) {
        'search_users' => User::where('skills', 'like', "%{$result->arguments['skill']}%")
            ->when(
                isset($result->arguments['years_experience']),
                fn($q) => $q->where('years_experience', '>=', $result->arguments['years_experience'])
            )
            ->get(),
        default => throw new \Exception("Unknown function: {$result->name}")
    };

    // Send results back to the LLM for natural language response
    $finalResponse = Mindwave::llm()->generateText(
        "Based on these results: " . json_encode($users->toArray()) .
        "\n\nAnswer the original question: Find developers with Laravel expertise"
    );

    echo $finalResponse;
}
```

### Multiple Functions Example

Define multiple tools and let the model choose:

```php
use Mindwave\Mindwave\LLM\FunctionCalling\FunctionBuilder;

$functions = FunctionBuilder::make()
    // Weather function
    ->addFunction('get_weather')
    ->setDescription('Get current weather for a location')
    ->addParameter('city', 'string', 'City name', required: true)

    // User search function
    ->addFunction('search_users')
    ->setDescription('Search for users in the database')
    ->addParameter('query', 'string', 'Search query', required: true)
    ->addParameter('limit', 'integer', 'Number of results', required: false)

    // Send email function
    ->addFunction('send_email')
    ->setDescription('Send an email to a user')
    ->addParameter('to', 'string', 'Recipient email', required: true)
    ->addParameter('subject', 'string', 'Email subject', required: true)
    ->addParameter('body', 'string', 'Email body', required: true);

$result = Mindwave::llm()
    ->model('gpt-4o')
    ->functionCall(
        prompt: 'Send an email to john@example.com about the weather in San Francisco',
        functions: $functions,
        requiredFunction: 'auto' // Let the model choose which function(s) to call
    );
```

### Forcing Specific Functions

Force the model to use a specific function:

```php
// Force the model to call get_weather
$result = Mindwave::llm()->functionCall(
    prompt: 'Tell me about San Francisco',
    functions: $functions,
    requiredFunction: 'get_weather' // Force this function
);

// Prevent function calling (get text response only)
$result = Mindwave::llm()->functionCall(
    prompt: 'Just chat with me',
    functions: $functions,
    requiredFunction: 'none' // No function calls allowed
);
```

### Parallel Function Calling

OpenAI supports calling multiple functions in parallel:

```php
// The model might return multiple function calls
// Handle this by checking if tool_calls is an array
$response = Mindwave::llm()
    ->model('gpt-4o')
    ->functionCall(
        'Get weather in NYC and London, then email the results to admin@example.com',
        $functions
    );

// Current implementation returns the first function call
// For parallel calls, use the OpenAI SDK directly or extend the driver
```

## Advanced Parameters

OpenAI models support extensive parameters for fine-tuning behavior.

### Temperature

Controls randomness in responses. Lower = more focused, higher = more creative.

**Range:** 0.0 to 2.0
**Default:** 0.7

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Very deterministic (good for facts, classification)
$factual = Mindwave::llm()
    ->model('gpt-4o')
    ->temperature(0.1)
    ->generateText('What is the capital of France?');

// Balanced (good for most tasks)
$balanced = Mindwave::llm()
    ->temperature(0.7)
    ->generateText('Write a product description');

// Creative (good for storytelling, brainstorming)
$creative = Mindwave::llm()
    ->temperature(1.2)
    ->generateText('Write a creative story about AI');
```

**Use Cases:**

-   **0.0-0.3**: Facts, classification, extraction, code generation
-   **0.4-0.7**: Balanced tasks, explanations, summaries
-   **0.8-1.2**: Creative writing, brainstorming, diverse responses
-   **1.3-2.0**: Maximum creativity (rarely needed)

### Max Tokens

Limits the maximum number of tokens in the response.

**Range:** 1 to model's max output
**Default:** 1000 (in Mindwave config)

```php
// Short response (save costs)
$brief = Mindwave::llm()
    ->maxTokens(50)
    ->generateText('Explain Laravel in one sentence');

// Medium response
$moderate = Mindwave::llm()
    ->maxTokens(500)
    ->generateText('Explain Laravel middleware');

// Long response
$detailed = Mindwave::llm()
    ->maxTokens(2000)
    ->generateText('Write a comprehensive guide to Laravel routing');
```

**Note:** Input tokens + output tokens must fit within the model's context window.

### Top P (Nucleus Sampling)

Alternative to temperature. Considers only top P probability mass.

**Range:** 0.0 to 1.0
**Default:** 1.0

```php
// Use top_p for focused responses (can't be set directly via driver)
// Requires using OpenAI SDK directly:

use OpenAI\Laravel\Facades\OpenAI;

$response = OpenAI::chat()->create([
    'model' => 'gpt-4o',
    'messages' => [
        ['role' => 'user', 'content' => 'Explain Laravel'],
    ],
    'top_p' => 0.9,
    'temperature' => 1, // Use either top_p OR temperature, not both
]);
```

**Note:** OpenAI recommends altering either `temperature` or `top_p`, but not both.

### Presence Penalty

Encourages the model to talk about new topics.

**Range:** -2.0 to 2.0
**Default:** 0

```php
use OpenAI\Laravel\Facades\OpenAI;

// Encourage topic diversity
$response = OpenAI::chat()->create([
    'model' => 'gpt-4o',
    'messages' => [['role' => 'user', 'content' => 'Tell me about Laravel']],
    'presence_penalty' => 0.6, // Encourage new topics
]);
```

**Use Cases:**

-   **Positive values (0.5-1.0)**: Encourage discussing new topics, reduce repetition
-   **Negative values**: Allow more focus on existing topics
-   **0**: No penalty (default)

### Frequency Penalty

Decreases likelihood of repeating the same line verbatim.

**Range:** -2.0 to 2.0
**Default:** 0

```php
use OpenAI\Laravel\Facades\OpenAI;

// Reduce repetition
$response = OpenAI::chat()->create([
    'model' => 'gpt-4o',
    'messages' => [['role' => 'user', 'content' => 'Write about Laravel']],
    'frequency_penalty' => 0.5, // Penalize repeated phrases
]);
```

**Use Cases:**

-   **Positive values (0.5-1.0)**: Reduce repetitive phrases
-   **Negative values**: Allow more repetition (rarely needed)
-   **0**: No penalty

### Stop Sequences

Stop generation when specific strings are encountered.

```php
use OpenAI\Laravel\Facades\OpenAI;

$response = OpenAI::chat()->create([
    'model' => 'gpt-4o',
    'messages' => [
        ['role' => 'user', 'content' => 'List Laravel features:']
    ],
    'stop' => ['\n\n', 'Conclusion:'], // Stop at double newline or "Conclusion:"
]);
```

**Use Cases:**

-   Control output format
-   Stop at natural boundaries
-   Prevent overly long responses

### Seed (Reproducible Outputs)

Enable deterministic outputs (beta feature).

```php
use OpenAI\Laravel\Facades\OpenAI;

$seed = 12345;

$response1 = OpenAI::chat()->create([
    'model' => 'gpt-4o',
    'messages' => [['role' => 'user', 'content' => 'Explain Laravel']],
    'seed' => $seed,
    'temperature' => 0,
]);

$response2 = OpenAI::chat()->create([
    'model' => 'gpt-4o',
    'messages' => [['role' => 'user', 'content' => 'Explain Laravel']],
    'seed' => $seed,
    'temperature' => 0,
]);

// response1 and response2 should be identical (most of the time)
```

**Note:** Determinism is best-effort, not guaranteed 100%.

### Logit Bias

Modify likelihood of specific tokens appearing.

```php
use OpenAI\Laravel\Facades\OpenAI;

// Ban specific words (token IDs required)
$response = OpenAI::chat()->create([
    'model' => 'gpt-4o',
    'messages' => [['role' => 'user', 'content' => 'Tell me about Laravel']],
    'logit_bias' => [
        '1234' => -100, // Ban token 1234
        '5678' => 10,   // Encourage token 5678
    ],
]);
```

**Note:** Requires knowing token IDs. Rarely used in practice.

### Complete Parameter Example

```php
use OpenAI\Laravel\Facades\OpenAI;

$response = OpenAI::chat()->create([
    'model' => 'gpt-4o',
    'messages' => [
        ['role' => 'system', 'content' => 'You are a helpful Laravel expert.'],
        ['role' => 'user', 'content' => 'Explain middleware'],
    ],
    'temperature' => 0.7,          // Balanced creativity
    'max_tokens' => 500,           // Limit response length
    'presence_penalty' => 0.3,     // Slight topic diversity
    'frequency_penalty' => 0.3,    // Slight repetition reduction
    'stop' => ['\n\n\n'],          // Stop at triple newline
    'user' => 'user-123',          // Track user (for abuse monitoring)
]);

echo $response->content;
```

## Streaming Responses

Stream responses in real-time for better user experience.

### Backend: Laravel Route

```php
use Illuminate\Http\Request;
use Mindwave\Mindwave\Facades\Mindwave;

Route::get('/api/chat', function (Request $request) {
    $prompt = $request->input('prompt');

    return Mindwave::llm()
        ->model('gpt-4o')
        ->temperature(0.7)
        ->maxTokens(1000)
        ->streamText($prompt)
        ->toStreamedResponse(); // Returns SSE response
});
```

### Frontend: JavaScript (Vanilla)

```javascript
const eventSource = new EventSource(
    `/api/chat?prompt=${encodeURIComponent(question)}`
);
const output = document.getElementById('output');

eventSource.addEventListener('message', (event) => {
    output.textContent += event.data; // Append each chunk
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

### Frontend: Alpine.js

```html
<div x-data="chatStream()">
    <input type="text" x-model="prompt" @keyup.enter="send" />
    <button @click="send" :disabled="isStreaming">Send</button>
    <div x-html="response"></div>
</div>

<script>
    function chatStream() {
        return {
            prompt: '',
            response: '',
            isStreaming: false,
            eventSource: null,

            send() {
                this.response = '';
                this.isStreaming = true;

                if (this.eventSource) this.eventSource.close();

                this.eventSource = new EventSource(
                    `/api/chat?prompt=${encodeURIComponent(this.prompt)}`
                );

                this.eventSource.addEventListener('message', (e) => {
                    this.response += e.data;
                });

                this.eventSource.addEventListener('done', () => {
                    this.isStreaming = false;
                    this.eventSource.close();
                });
            },
        };
    }
</script>
```

### Streaming with Plain Text Response

For non-SSE streaming (plain text):

```php
Route::get('/api/chat-plain', function (Request $request) {
    return Mindwave::llm()
        ->model('gpt-4o')
        ->streamText($request->input('prompt'))
        ->toPlainStreamedResponse(); // Plain text chunks
});
```

### Error Handling in Streams

```php
use Illuminate\Http\Request;
use Mindwave\Mindwave\Facades\Mindwave;

Route::get('/api/chat', function (Request $request) {
    try {
        $stream = Mindwave::llm()
            ->model('gpt-4o')
            ->streamText($request->input('prompt'));

        return $stream->toStreamedResponse();
    } catch (\Exception $e) {
        return response()->json([
            'error' => 'Streaming failed',
            'message' => $e->getMessage()
        ], 500);
    }
});
```

### Streaming with Callbacks

Process chunks as they arrive:

```php
use Mindwave\Mindwave\Facades\Mindwave;

$stream = Mindwave::llm()
    ->model('gpt-4o')
    ->streamText('Explain Laravel');

$stream->onChunk(function ($chunk) {
    // Process each chunk
    logger()->info('Received chunk', ['chunk' => $chunk]);

    // Could save to cache, database, etc.
    Cache::append('stream-output', $chunk);
});

// Convert to string (consumes stream)
$fullText = $stream->toString();
```

### Streaming Best Practices

1. **Always close streams** - Use event listeners to close on completion
2. **Handle errors gracefully** - Implement retry logic for connection failures
3. **Show loading states** - Indicate to users that streaming is in progress
4. **Use HTTPS in production** - EventSource requires secure connections
5. **Consider mobile** - Streaming works but may be less reliable on poor connections
6. **Set reasonable timeouts** - Don't let streams hang indefinitely
7. **Monitor connection health** - Implement heartbeat for long streams

## JSON Mode

Get structured JSON outputs from OpenAI models.

### Enabling JSON Mode

```php
use OpenAI\Laravel\Facades\OpenAI;

$response = OpenAI::chat()->create([
    'model' => 'gpt-4o',
    'messages' => [
        [
            'role' => 'system',
            'content' => 'You are a helpful assistant designed to output JSON.'
        ],
        [
            'role' => 'user',
            'content' => 'Extract name, email, and role from: John Doe (john@example.com) - Developer'
        ]
    ],
    'response_format' => ['type' => 'json_object'],
]);

$json = json_decode($response->content, true);
// ['name' => 'John Doe', 'email' => 'john@example.com', 'role' => 'Developer']
```

### JSON Mode Requirements

1. **Include "JSON" in prompt** - Tell the model to output JSON
2. **Use gpt-4o or gpt-4-turbo** - Older models don't support JSON mode
3. **Set response_format** - Must explicitly enable JSON mode

### Structured Data Extraction

```php
use OpenAI\Laravel\Facades\OpenAI;

$ticket = "User reported: The login page is broken on Safari. Priority: High";

$response = OpenAI::chat()->create([
    'model' => 'gpt-4o',
    'messages' => [
        [
            'role' => 'system',
            'content' => 'Extract ticket information as JSON with keys: issue, browser, priority'
        ],
        [
            'role' => 'user',
            'content' => $ticket
        ]
    ],
    'response_format' => ['type' => 'json_object'],
]);

$data = json_decode($response->content, true);
/*
[
    'issue' => 'Login page is broken',
    'browser' => 'Safari',
    'priority' => 'High'
]
*/

// Save to database
SupportTicket::create($data);
```

### Complex JSON Schemas

```php
use OpenAI\Laravel\Facades\OpenAI;

$response = OpenAI::chat()->create([
    'model' => 'gpt-4o',
    'messages' => [
        [
            'role' => 'system',
            'content' => 'Extract user profile as JSON with this schema:
            {
                "name": "string",
                "email": "string",
                "skills": ["array", "of", "strings"],
                "experience": {
                    "years": "integer",
                    "companies": ["array", "of", "strings"]
                }
            }'
        ],
        [
            'role' => 'user',
            'content' => 'Parse: Jane Smith, jane@example.com, expert in PHP, Laravel, Vue.js.
                         5 years experience at Acme Corp and TechCo.'
        ]
    ],
    'response_format' => ['type' => 'json_object'],
]);

$profile = json_decode($response->content, true);
```

### Error Handling with JSON Mode

```php
use OpenAI\Laravel\Facades\OpenAI;

try {
    $response = OpenAI::chat()->create([
        'model' => 'gpt-4o',
        'messages' => [
            ['role' => 'user', 'content' => 'Extract data as JSON from: ' . $input]
        ],
        'response_format' => ['type' => 'json_object'],
    ]);

    $data = json_decode($response->content, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new \Exception('Invalid JSON response: ' . json_last_error_msg());
    }

    return $data;
} catch (\Exception $e) {
    logger()->error('JSON extraction failed', ['error' => $e->getMessage()]);
    return null;
}
```

## Best Practices

### Model Selection Guide

**Decision Tree:**

1. **Need reasoning/debugging?** → Use `o1-preview` or `o1-mini`
2. **Need fast responses?** → Use `gpt-4o` or `gpt-4o-mini`
3. **High volume, simple tasks?** → Use `gpt-4o-mini` or `gpt-3.5-turbo`
4. **Complex analysis?** → Use `gpt-4-turbo`
5. **Cost-sensitive?** → Use `gpt-4o-mini` first, `gpt-3.5-turbo` second

### Cost Optimization

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Strategy 1: Start cheap, escalate if needed
$response = Mindwave::llm()->model('gpt-4o-mini')->generateText($prompt);

if (!$this->isGoodQuality($response)) {
    $response = Mindwave::llm()->model('gpt-4o')->generateText($prompt);
}

// Strategy 2: Use PromptComposer to fit context
$response = Mindwave::prompt()
    ->model('gpt-4o-mini') // Cheaper model
    ->reserveOutputTokens(500)
    ->section('context', $largeDoc, priority: 50, shrinker: 'truncate')
    ->section('user', $question, priority: 100)
    ->fit() // Trim to context window
    ->run();

// Strategy 3: Cache responses
$cacheKey = 'llm:' . md5($prompt);
$response = Cache::remember($cacheKey, now()->addHours(24), function () use ($prompt) {
    return Mindwave::llm()->model('gpt-4o-mini')->generateText($prompt);
});

// Strategy 4: Batch processing
$results = collect($items)->chunk(100)->flatMap(function ($chunk) {
    return $chunk->map(fn($item) =>
        Mindwave::llm()->model('gpt-3.5-turbo')->generateText("Process: {$item}")
    );
});
```

### Prompt Engineering Tips

```php
// ❌ Vague prompt
$bad = Mindwave::llm()->generateText('Tell me about Laravel');

// ✅ Specific prompt with context
$good = Mindwave::llm()->generateText("
You are a Laravel expert reviewing code for best practices.

CODE:
{$codeSnippet}

Task: Identify security issues and provide specific fixes.
Format: Return as numbered list with code examples.
");

// ✅ Use system messages for consistent behavior
$response = Mindwave::llm()->chat([
    [
        'role' => 'system',
        'content' => 'You are a senior Laravel developer.
                     Provide concise, production-ready code.
                     Always include error handling.'
    ],
    ['role' => 'user', 'content' => $userQuestion],
]);

// ✅ Few-shot examples for consistency
$prompt = "
Extract name and email from text.

Examples:
Input: 'Contact John at john@example.com'
Output: {\"name\": \"John\", \"email\": \"john@example.com\"}

Input: 'Email jane@test.com for Jane Smith'
Output: {\"name\": \"Jane Smith\", \"email\": \"jane@test.com\"}

Now extract from: '{$userInput}'
Output:
";
```

### Error Handling

```php
use Mindwave\Mindwave\Facades\Mindwave;
use OpenAI\Exceptions\ErrorException;

try {
    $response = Mindwave::llm()
        ->model('gpt-4o')
        ->generateText($prompt);

} catch (ErrorException $e) {
    // OpenAI API error
    if ($e->getCode() === 401) {
        // Invalid API key
        logger()->error('OpenAI API key invalid');
        return 'Configuration error - please check API key';
    }

    if ($e->getCode() === 429) {
        // Rate limit exceeded
        logger()->warning('OpenAI rate limit hit');
        // Implement backoff/retry logic
        sleep(5);
        return retry(3, fn() => Mindwave::llm()->generateText($prompt), 1000);
    }

    if ($e->getCode() === 500) {
        // OpenAI server error
        logger()->error('OpenAI server error', ['message' => $e->getMessage()]);
        return 'Service temporarily unavailable';
    }

} catch (\RuntimeException $e) {
    // Empty API response (no choices returned)
    logger()->error('OpenAI returned empty response', [
        'error' => $e->getMessage(),
    ]);
    return 'Received an empty response from the API';

} catch (\Exception $e) {
    // Other errors
    logger()->error('LLM request failed', [
        'error' => $e->getMessage(),
        'prompt' => $prompt,
    ]);
    return 'An error occurred';
}
```

::: tip Empty Response Protection
Mindwave throws a `RuntimeException` if the OpenAI API returns a response with no choices or no embeddings. This prevents silent failures from propagating through your application.
:::

### Rate Limiting Strategy

```php
use Illuminate\Support\Facades\RateLimiter;
use Mindwave\Mindwave\Facades\Mindwave;

Route::post('/api/chat', function (Request $request) {
    // Apply rate limiting
    $userId = $request->user()->id;

    $executed = RateLimiter::attempt(
        "chat:{$userId}",
        $perMinute = 10,
        function () use ($request) {
            return Mindwave::llm()
                ->model('gpt-4o')
                ->generateText($request->input('message'));
        }
    );

    if (!$executed) {
        return response()->json([
            'error' => 'Too many requests. Please wait.'
        ], 429);
    }

    return response()->json(['response' => $executed]);
});
```

### Timeout Configuration

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Configure timeout for long-running requests (O1 models)
config(['openai.request_timeout' => 120]); // 120 seconds

try {
    $response = Mindwave::llm()
        ->model('o1-preview')
        ->maxTokens(4000)
        ->generateText($complexPrompt);
} catch (\Exception $e) {
    if (str_contains($e->getMessage(), 'timeout')) {
        logger()->warning('LLM request timed out');
        return 'Request took too long - try simplifying your question';
    }
    throw $e;
}
```

## Pricing & Cost Management

### Current Pricing (as of Nov 2024)

| Model         | Input (per 1M tokens) | Output (per 1M tokens) |
| ------------- | --------------------- | ---------------------- |
| gpt-4o        | $2.50                 | $10.00                 |
| gpt-4o-mini   | $0.15                 | $0.60                  |
| gpt-4-turbo   | $10.00                | $30.00                 |
| gpt-4         | $30.00                | $60.00                 |
| gpt-4-32k     | $60.00                | $120.00                |
| gpt-3.5-turbo | $0.50                 | $1.50                  |
| o1-preview    | $15.00                | $60.00                 |
| o1-mini       | $3.00                 | $12.00                 |

**Note:** Prices may change. Check [OpenAI Pricing](https://openai.com/pricing) for latest rates.

### Cost Calculation Examples

```php
// Example 1: Simple chat (gpt-4o-mini)
// Input: 500 tokens, Output: 200 tokens
// Cost = (500/1M × $0.15) + (200/1M × $0.60)
// Cost = $0.000075 + $0.000120 = $0.000195 (~$0.0002)

// Example 2: Complex analysis (gpt-4-turbo)
// Input: 10,000 tokens, Output: 2,000 tokens
// Cost = (10,000/1M × $10) + (2,000/1M × $30)
// Cost = $0.10 + $0.06 = $0.16

// Example 3: High-volume tagging (gpt-3.5-turbo)
// 10,000 requests × 100 tokens input × 20 tokens output
// Input cost = (10,000 × 100)/1M × $0.50 = $0.50
// Output cost = (10,000 × 20)/1M × $1.50 = $0.30
// Total = $0.80 for 10,000 requests
```

### Track Costs with Tracing

Mindwave automatically tracks costs with OpenTelemetry tracing:

```php
use Mindwave\Mindwave\Observability\Models\Trace;
use Mindwave\Mindwave\Observability\Models\Span;

// Find expensive traces
$expensive = Trace::where('estimated_cost', '>', 0.10)
    ->with('spans')
    ->orderByDesc('estimated_cost')
    ->get();

foreach ($expensive as $trace) {
    echo "Trace ID: {$trace->trace_id}\n";
    echo "Cost: \${$trace->estimated_cost}\n";
    echo "Input tokens: {$trace->total_input_tokens}\n";
    echo "Output tokens: {$trace->total_output_tokens}\n";
    echo "Duration: " . ($trace->duration / 1_000_000) . "ms\n\n";
}

// Daily cost summary
$dailyCosts = Trace::selectRaw('
        DATE(created_at) as date,
        COUNT(*) as requests,
        SUM(estimated_cost) as cost,
        SUM(total_input_tokens) as input_tokens,
        SUM(total_output_tokens) as output_tokens
    ')
    ->whereDate('created_at', '>=', now()->subDays(30))
    ->groupBy('date')
    ->orderByDesc('date')
    ->get();

// Cost by model
$costByModel = Span::selectRaw('
        JSON_EXTRACT(attributes, "$.gen_ai.request.model") as model,
        COUNT(*) as requests,
        SUM(CAST(JSON_EXTRACT(attributes, "$.gen_ai.usage.input_tokens") AS UNSIGNED)) as input_tokens,
        SUM(CAST(JSON_EXTRACT(attributes, "$.gen_ai.usage.output_tokens") AS UNSIGNED)) as output_tokens
    ')
    ->where('operation_name', 'chat')
    ->groupBy('model')
    ->get();
```

### Using PromptComposer to Manage Costs

PromptComposer automatically fits prompts to context windows, reducing token usage:

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Without PromptComposer (may exceed context window or waste tokens)
$longContext = file_get_contents('huge-document.txt'); // 50,000 tokens
$response = Mindwave::llm()
    ->model('gpt-4o')
    ->generateText("Context: {$longContext}\n\nQuestion: {$question}");
// This might fail or cost $2.50 × 50,000/1M = $0.125 just for input

// With PromptComposer (auto-fits to context window)
$response = Mindwave::prompt()
    ->model('gpt-4o')
    ->reserveOutputTokens(500)
    ->section('context', $longContext, priority: 50, shrinker: 'truncate')
    ->section('question', $question, priority: 100)
    ->fit() // Automatically trims to fit
    ->run();
// Only uses tokens that fit, saving money
```

### Set Budget Alerts

```php
// Monitor daily costs and send alerts
use Illuminate\Support\Facades\Mail;
use Mindwave\Mindwave\Observability\Models\Trace;

// Run this as a scheduled task
$todayCost = Trace::whereDate('created_at', today())
    ->sum('estimated_cost');

$dailyBudget = 10.00; // $10/day

if ($todayCost > $dailyBudget) {
    Mail::to('admin@example.com')->send(
        new BudgetAlertMail($todayCost, $dailyBudget)
    );

    // Optionally disable AI features
    Cache::put('ai_disabled', true, now()->endOfDay());
}
```

## Limitations & Considerations

### Rate Limits

OpenAI enforces rate limits based on your tier:

| Tier    | RPM (Requests/min) | TPM (Tokens/min) |
| ------- | ------------------ | ---------------- |
| Free    | 3                  | 40,000           |
| Tier 1  | 500                | 2,000,000        |
| Tier 2  | 5,000              | 10,000,000       |
| Tier 3+ | Higher             | Higher           |

**Handling Rate Limits:**

```php
use Mindwave\Mindwave\Facades\Mindwave;

function callWithRetry($prompt, $maxAttempts = 3) {
    $attempt = 0;

    while ($attempt < $maxAttempts) {
        try {
            return Mindwave::llm()->generateText($prompt);
        } catch (\Exception $e) {
            if ($e->getCode() === 429) {
                $attempt++;
                $waitSeconds = pow(2, $attempt); // Exponential backoff
                logger()->warning("Rate limited, waiting {$waitSeconds}s");
                sleep($waitSeconds);
            } else {
                throw $e;
            }
        }
    }

    throw new \Exception('Max retry attempts exceeded');
}
```

### Context Window Limits

Each model has maximum token limits:

-   **GPT-4o, GPT-4 Turbo**: 128,000 tokens
-   **GPT-4-32k**: 32,768 tokens
-   **GPT-4**: 8,192 tokens
-   **GPT-3.5 Turbo**: 16,385 tokens
-   **O1 models**: 128,000 tokens

**Input + Output must fit within context window.**

```php
use Mindwave\Mindwave\PromptComposer\Tokenizer\ModelTokenLimits;

$model = 'gpt-4o';
$contextWindow = ModelTokenLimits::getContextWindow($model); // 128,000

// Ensure prompt fits
$promptTokens = Mindwave::prompt()->countTokens($prompt, $model);
$maxOutputTokens = 1000;

if ($promptTokens + $maxOutputTokens > $contextWindow) {
    // Prompt too long - use PromptComposer to fit
    $response = Mindwave::prompt()
        ->model($model)
        ->reserveOutputTokens($maxOutputTokens)
        ->section('user', $prompt, priority: 100)
        ->fit()
        ->run();
} else {
    $response = Mindwave::llm()->model($model)->generateText($prompt);
}
```

### Model Availability

Some models may not be available in all regions or accounts:

-   **GPT-4** requires separate access approval (though widely available now)
-   **O1 models** may have restricted access in some tiers
-   **Fine-tuned models** require additional setup

Check model availability:

```php
use OpenAI\Laravel\Facades\OpenAI;

try {
    $response = OpenAI::chat()->create([
        'model' => 'gpt-4',
        'messages' => [['role' => 'user', 'content' => 'test']],
        'max_tokens' => 5,
    ]);
    echo "✅ Model available";
} catch (\Exception $e) {
    if (str_contains($e->getMessage(), 'model_not_found')) {
        echo "❌ Model not available for your account";
    }
}
```

### Deprecation Schedule

OpenAI periodically deprecates old models. Check [OpenAI Deprecation](https://platform.openai.com/docs/deprecations) page.

**Recently deprecated:**

-   `gpt-3.5-turbo-0301` (deprecated)
-   `gpt-4-0314` (deprecated)

**Best Practice:** Use latest model identifiers without date suffixes:

-   ✅ Use `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`
-   ❌ Avoid `gpt-4-0613`, `gpt-3.5-turbo-0301`

### Regional Considerations

OpenAI availability and performance may vary by region:

-   **Best latency**: US, Europe
-   **Higher latency**: Asia, Africa, South America
-   **Potential blocks**: Some countries block OpenAI API

**For international apps:**

-   Consider using a CDN/proxy
-   Implement timeout handling
-   Test from target regions
-   Have fallback providers

## Troubleshooting

### 401 Unauthorized

**Problem:** Invalid API key

```
Error: Incorrect API key provided
```

**Solutions:**

1. Check your API key in `.env`:

    ```dotenv
    MINDWAVE_OPENAI_API_KEY=sk-...
    ```

2. Verify key is active at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

3. Clear config cache:

    ```bash
    php artisan config:clear
    ```

4. Ensure no extra spaces in `.env` file

### 429 Rate Limit Exceeded

**Problem:** Too many requests

```
Error: Rate limit exceeded
```

**Solutions:**

1. Check your rate limits at [platform.openai.com/account/limits](https://platform.openai.com/account/limits)

2. Implement exponential backoff:

    ```php
    use Illuminate\Support\Facades\RateLimiter;

    $response = RateLimiter::attempt(
        'openai:' . auth()->id(),
        $perMinute = 10,
        fn() => Mindwave::llm()->generateText($prompt)
    );
    ```

3. Add delays between requests:

    ```php
    foreach ($items as $item) {
        $result = Mindwave::llm()->generateText($item);
        sleep(1); // Wait 1 second between requests
    }
    ```

4. Upgrade your OpenAI tier for higher limits

### 500 Internal Server Error

**Problem:** OpenAI service error

```
Error: The server had an error processing your request
```

**Solutions:**

1. Retry the request (transient error):

    ```php
    $response = retry(3, function () use ($prompt) {
        return Mindwave::llm()->generateText($prompt);
    }, 1000); // Wait 1 second between retries
    ```

2. Check [OpenAI Status Page](https://status.openai.com)

3. If persistent, contact OpenAI support

### Context Length Exceeded

**Problem:** Prompt + output > model's context window

```
Error: This model's maximum context length is 8192 tokens
```

**Solutions:**

1. Use PromptComposer to auto-fit:

    ```php
    $response = Mindwave::prompt()
        ->model('gpt-4o')
        ->reserveOutputTokens(1000)
        ->section('user', $longPrompt, priority: 100)
        ->fit() // Automatically trims to fit
        ->run();
    ```

2. Switch to a larger context model:

    ```php
    // Instead of gpt-4 (8K tokens)
    $response = Mindwave::llm()->model('gpt-4-turbo')->generateText($prompt);
    // Now you have 128K tokens
    ```

3. Reduce `max_tokens`:

    ```php
    $response = Mindwave::llm()
        ->maxTokens(500) // Lower output limit
        ->generateText($prompt);
    ```

4. Summarize long content first:

    ```php
    $summary = Mindwave::llm()
        ->model('gpt-4o-mini')
        ->generateText("Summarize this in 500 words: {$longContent}");

    $response = Mindwave::llm()->generateText("Based on: {$summary}\n\n{$question}");
    ```

### Invalid Request Error

**Problem:** Malformed request parameters

```
Error: Invalid parameter: messages
```

**Solutions:**

1. Check message format:

    ```php
    // ❌ Wrong
    $response = Mindwave::llm()->chat('Hello');

    // ✅ Correct
    $response = Mindwave::llm()->chat([
        ['role' => 'user', 'content' => 'Hello']
    ]);
    ```

2. Validate parameters:

    ```php
    $temperature = 0.7;
    if ($temperature < 0 || $temperature > 2) {
        throw new \Exception('Temperature must be between 0 and 2');
    }
    ```

3. Check for unsupported parameters with specific models (e.g., O1 doesn't support temperature)

### Timeout Errors

**Problem:** Request takes too long

```
Error: cURL error 28: Operation timed out
```

**Solutions:**

1. Increase timeout:

    ```php
    config(['openai.request_timeout' => 120]); // 120 seconds
    ```

2. Use a faster model:

    ```php
    // Instead of o1-preview (slow)
    $response = Mindwave::llm()->model('gpt-4o')->generateText($prompt);
    ```

3. Reduce max_tokens:

    ```php
    $response = Mindwave::llm()
        ->maxTokens(1000) // Shorter response = faster
        ->generateText($prompt);
    ```

4. Implement async processing for long requests:
    ```php
    dispatch(new ProcessLLMRequest($prompt));
    ```

### Billing Issues

**Problem:** Insufficient quota

```
Error: You exceeded your current quota
```

**Solutions:**

1. Add payment method at [platform.openai.com/account/billing](https://platform.openai.com/account/billing)

2. Check usage at [platform.openai.com/account/usage](https://platform.openai.com/account/usage)

3. Set up billing alerts to prevent unexpected charges

4. Implement cost controls in your app:

    ```php
    $dailyCost = Trace::whereDate('created_at', today())->sum('estimated_cost');

    if ($dailyCost > 50) {
        throw new \Exception('Daily budget exceeded');
    }
    ```

## Azure OpenAI

Mindwave can work with Azure OpenAI Service using the OpenAI PHP SDK's configuration.

### Configuration

```php
// config/openai.php (if using openai-php/laravel package)

return [
    'api_key' => env('AZURE_OPENAI_API_KEY'),
    'organization' => env('AZURE_OPENAI_ORGANIZATION'),

    // Azure-specific configuration
    'base_uri' => env('AZURE_OPENAI_ENDPOINT'), // e.g., https://YOUR_RESOURCE.openai.azure.com/openai/deployments/YOUR_DEPLOYMENT
    'api_version' => env('AZURE_OPENAI_API_VERSION', '2024-02-15-preview'),
];
```

### Environment Variables

```dotenv
# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=your-azure-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/openai/deployments/your-deployment
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

### Using Azure OpenAI with Mindwave

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Mindwave will use the configured Azure endpoint
$response = Mindwave::llm()
    ->model('your-deployment-name') // Use your Azure deployment name
    ->generateText('Explain Laravel');
```

### Differences from OpenAI

1. **Endpoint structure**: Azure uses a different URL structure
2. **Model names**: Use deployment names instead of model names
3. **API versions**: Azure requires explicit API version
4. **Authentication**: Uses Azure API keys, not OpenAI keys
5. **Availability**: Limited to Azure regions where you deployed

### Benefits of Azure OpenAI

-   **Data privacy**: Data stays within your Azure tenant
-   **Compliance**: May be required for enterprise/government
-   **Integration**: Works with other Azure services
-   **SLA**: Enterprise-grade service level agreements

## Summary

OpenAI is a powerful and versatile provider with models for every use case:

-   **gpt-4o/gpt-4o-mini** - Fast, cost-effective, multimodal
-   **gpt-4-turbo** - High intelligence, large contexts
-   **o1-preview/o1-mini** - Advanced reasoning for complex problems
-   **gpt-3.5-turbo** - Budget-friendly for simple tasks

**Key Takeaways:**

1. ✅ Start with `gpt-4o-mini` for most tasks
2. ✅ Use function calling for structured tool integration
3. ✅ Implement streaming for better UX
4. ✅ Track costs with Mindwave tracing
5. ✅ Use PromptComposer to manage context windows
6. ✅ Handle errors gracefully with retries
7. ✅ Choose the right model for each task

**Next Steps:**

-   Explore [Function Calling](/docs/core/function-calling)
-   Learn about [Streaming](/docs/core/streaming)
-   Set up [Tracing](/docs/observability/tracing) for cost tracking
-   Master [PromptComposer](/docs/core/prompt-composer) for context management

**Resources:**

-   [OpenAI Documentation](https://platform.openai.com/docs)
-   [OpenAI Pricing](https://openai.com/pricing)
-   [OpenAI Cookbook](https://github.com/openai/openai-cookbook)
-   [OpenAI Community Forum](https://community.openai.com)
