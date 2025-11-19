# Anthropic Provider

## Overview

Anthropic is a leading AI safety company known for Claude, a family of highly capable and safe language models. Claude excels at complex reasoning, analysis, and maintaining helpful, harmless, and honest conversations.

### Why Use Anthropic with Mindwave?

- **Extended context windows** - Up to 200,000 tokens for processing large documents
- **Strong reasoning** - Excellent performance on complex analytical tasks
- **Safety-focused** - Built with Constitutional AI for more reliable outputs
- **Latest models** - Access Claude Sonnet 4.5, the smartest model for complex tasks
- **Vision support** - Native image understanding across Claude 3+ models
- **Competitive pricing** - Cost-effective options from Claude 3.5 Haiku
- **Streaming support** - Real-time response streaming with Server-Sent Events

### Key Capabilities

- ✅ Chat completions with multi-turn conversations
- ✅ Streaming responses with SSE
- ✅ Extended thinking mode (Claude Sonnet 4.5)
- ✅ Vision capabilities for image understanding
- ✅ 200K token context windows
- ✅ System prompts for precise instruction following
- ✅ Prompt caching for cost optimization
- ✅ Automatic tracing and cost tracking

## Setup & Configuration

### Getting Your API Key

1. Create an account at [console.anthropic.com](https://console.anthropic.com)
2. Navigate to **API Keys** in your account settings
3. Click **Create Key**
4. Copy your key (starts with `sk-ant-`)
5. Add payment method to enable API access

### Environment Variables

Add these to your `.env` file:

```env
# Required: Your Anthropic API key
MINDWAVE_ANTHROPIC_API_KEY=sk-ant-your-api-key-here

# Optional: Default model
MINDWAVE_ANTHROPIC_MODEL=claude-sonnet-4-5-20250929

# Optional: Generation parameters
MINDWAVE_ANTHROPIC_MAX_TOKENS=4096
MINDWAVE_ANTHROPIC_TEMPERATURE=1.0

# Optional: System message
MINDWAVE_ANTHROPIC_SYSTEM_MESSAGE=

# Set Anthropic as default provider
MINDWAVE_LLM=anthropic
```

### Configuration File

The Anthropic configuration is defined in `config/mindwave-llm.php`:

```php
return [
    'default' => env('MINDWAVE_LLM', 'openai'),

    'llms' => [
        'anthropic' => [
            'api_key' => env('MINDWAVE_ANTHROPIC_API_KEY'),
            'model' => env('MINDWAVE_ANTHROPIC_MODEL', 'claude-3-5-sonnet-20241022'),
            'system_message' => env('MINDWAVE_ANTHROPIC_SYSTEM_MESSAGE'),
            'max_tokens' => env('MINDWAVE_ANTHROPIC_MAX_TOKENS', 4096),
            'temperature' => env('MINDWAVE_ANTHROPIC_TEMPERATURE', 1.0),
        ],
    ],
];
```

### Testing Your Connection

Test that your API key is working:

```php
use Mindwave\Mindwave\Facades\Mindwave;

$response = Mindwave::llm('anthropic')->generateText('Say hello!');

if ($response) {
    echo "✅ Anthropic connection successful!";
    echo "Response: " . $response;
} else {
    echo "❌ Connection failed - check your API key";
}
```

## Available Models

### Claude Sonnet 4.5 (Latest - Recommended)

The smartest Claude model for complex agents, coding, and reasoning tasks.

| Model ID | Context Window | Max Output | Input Price | Output Price | Best For |
|----------|---------------|------------|-------------|--------------|----------|
| `claude-sonnet-4-5-20250929` | 200K / 1M (beta) | 64K tokens | $3.00/1M | $15.00/1M | Complex reasoning, code |
| `claude-sonnet-4-5` (alias) | 200K / 1M (beta) | 64K tokens | $3.00/1M | $15.00/1M | Auto-updates to latest |

**Use Cases:**
- Complex code generation and analysis
- Deep reasoning and research tasks
- Long document analysis (up to 1M tokens in beta)
- Production applications requiring highest intelligence
- Multi-agent systems and agentic workflows

**Key Features:**
- Extended thinking mode for complex reasoning
- Superior code understanding and generation
- 1M token context window (beta)
- 64K max output tokens
- Vision capabilities for image understanding

**Limitations:**
- Higher cost than Haiku models
- Slower than Haiku 4.5

### Claude Haiku 4.5 (Latest)

The fastest Claude model with near-frontier intelligence.

| Model ID | Context Window | Max Output | Input Price | Output Price | Best For |
|----------|---------------|------------|-------------|--------------|----------|
| `claude-haiku-4-5-20251001` | 200,000 tokens | 64K tokens | $0.80/1M | $4.00/1M | Fast, cost-effective tasks |
| `claude-haiku-4-5` (alias) | 200,000 tokens | 64K tokens | $0.80/1M | $4.00/1M | Auto-updates to latest |

**Use Cases:**
- High-volume content generation
- Fast customer support responses
- Real-time applications
- Cost-sensitive applications
- Quick prototyping and testing

**Key Features:**
- Fastest response times
- Near-frontier intelligence
- 64K max output tokens
- Excellent price/performance ratio

**Limitations:**
- Less capable reasoning than Sonnet 4.5
- Not ideal for extremely complex tasks

### Claude Opus 4.1 (Latest)

Specialized model for advanced reasoning tasks.

| Model ID | Context Window | Max Output | Input Price | Output Price | Best For |
|----------|---------------|------------|-------------|--------------|----------|
| `claude-opus-4-1-20250805` | 200,000 tokens | 32K tokens | $15.00/1M | $75.00/1M | Specialized reasoning |
| `claude-opus-4-1` (alias) | 200,000 tokens | 32K tokens | $15.00/1M | $75.00/1M | Auto-updates to latest |

**Use Cases:**
- Specialized reasoning tasks
- Research and analysis requiring maximum intelligence
- Complex problem-solving
- High-stakes decision making

**Note:** For most use cases, Claude Sonnet 4.5 provides better value.

### Legacy Models (Deprecated)

The following models are deprecated and should be migrated to the 4.x series:

**Claude 3.5 Models:**
- `claude-3-5-sonnet-20241022` - Upgrade to `claude-sonnet-4-5-20250929`
- `claude-3-5-haiku-20241022` - Upgrade to `claude-haiku-4-5-20251001`

**Claude 3 Models:**
- `claude-3-opus-20240229` - Upgrade to `claude-opus-4-1-20250805`
- `claude-3-sonnet-20240229` - Upgrade to `claude-sonnet-4-5-20250929`
- `claude-3-haiku-20240307` - Upgrade to `claude-haiku-4-5-20251001`

**Claude 2 Models:**
- `claude-2.1`, `claude-2.0`, `claude-instant-1.2` - Significantly outperformed by Claude 4.x models

## Basic Usage

### Simple Text Generation

Generate text using the default configured model:

```php
use Mindwave\Mindwave\Facades\Mindwave;

$response = Mindwave::llm('anthropic')
    ->generateText('Explain Laravel in one sentence.');

echo $response;
// "Laravel is an elegant PHP framework with expressive syntax..."
```

### Using Specific Models

Switch between Claude models easily:

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\LLM\Drivers\Anthropic\ModelNames;

// Use Claude Haiku 4.5 for fast, cost-effective responses
$quickResponse = Mindwave::llm('anthropic')
    ->model(ModelNames::CLAUDE_HAIKU_4_5)
    ->generateText('Summarize this: ' . $text);

// Use Claude Sonnet 4.5 for complex reasoning
$detailedResponse = Mindwave::llm('anthropic')
    ->model(ModelNames::CLAUDE_SONNET_4_5)
    ->maxTokens(4000)
    ->generateText('Analyze the architectural patterns in: ' . $code);

// Use model ID strings directly
$response = Mindwave::llm('anthropic')
    ->model('claude-sonnet-4-5-20250929')
    ->generateText('Your prompt here');
```

### Multi-Turn Conversations

Build conversational applications:

```php
use Mindwave\Mindwave\Facades\Mindwave;

$driver = Mindwave::llm('anthropic')
    ->model('claude-3-5-sonnet-20241022');

// First turn
$response1 = $driver->generateText('What is dependency injection?');

// Continue the conversation
// Note: Claude API requires you to manage conversation history
$conversationHistory = [
    ['role' => 'user', 'content' => 'What is dependency injection?'],
    ['role' => 'assistant', 'content' => $response1],
    ['role' => 'user', 'content' => 'How is it used in Laravel?'],
];

// You'll need to use the chat method directly for multi-turn
$response2 = $driver->chat([
    ['role' => 'user', 'content' => 'What is dependency injection?'],
    ['role' => 'assistant', 'content' => $response1],
    ['role' => 'user', 'content' => 'How is it used in Laravel?'],
]);
```

### Setting System Messages

System messages provide context and instructions:

```php
use Mindwave\Mindwave\Facades\Mindwave;

$response = Mindwave::llm('anthropic')
    ->model('claude-sonnet-4-5-20250929')
    ->setSystemMessage('You are a helpful Laravel expert. Provide concise, accurate answers with code examples.')
    ->generateText('How do I create a custom validation rule?');

echo $response;
```

**Important:** In Anthropic's API, system messages are a separate top-level parameter, not part of the messages array like in OpenAI.

## Model-Specific Features

### Claude Sonnet 4.5: Extended Thinking

Claude Sonnet 4.5 can use extended thinking for complex problems:

```php
use Mindwave\Mindwave\Facades\Mindwave;

$response = Mindwave::llm('anthropic')
    ->model('claude-sonnet-4-5-20250929')
    ->maxTokens(8000) // Allow more tokens for thinking
    ->generateText('
        Solve this complex algorithmic problem:

        Given an array of integers, find the maximum sum of non-adjacent elements.
        Explain your reasoning step by step.
    ');

// Claude will show its thinking process in the response
echo $response;
```

### Claude Haiku 4.5: Speed Optimization

Optimize for speed and cost:

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\LLM\Drivers\Anthropic\ModelNames;

// Process multiple items quickly
$items = ['item1', 'item2', 'item3'];
$results = [];

$driver = Mindwave::llm('anthropic')
    ->model(ModelNames::CLAUDE_HAIKU_4_5)
    ->temperature(0.3); // Lower temperature for consistent results

foreach ($items as $item) {
    $results[] = $driver->generateText("Classify: {$item}");
}
```

### Vision Capabilities

Process images with Claude models:

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Image understanding is available via the Anthropic SDK
// Mindwave will add direct support in a future release
$client = \Anthropic::client(config('mindwave-llm.llms.anthropic.api_key'));

$response = $client->messages()->create([
    'model' => 'claude-sonnet-4-5-20250929',
    'max_tokens' => 1024,
    'messages' => [
        [
            'role' => 'user',
            'content' => [
                [
                    'type' => 'image',
                    'source' => [
                        'type' => 'base64',
                        'media_type' => 'image/jpeg',
                        'data' => base64_encode(file_get_contents('path/to/image.jpg')),
                    ],
                ],
                [
                    'type' => 'text',
                    'text' => 'What's in this image?'
                ],
            ],
        ],
    ],
]);
```

## Advanced Parameters

### Temperature

Controls randomness in responses (0.0 to 1.0):

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Creative writing (default: 1.0)
$creative = Mindwave::llm('anthropic')
    ->temperature(1.0)
    ->generateText('Write a creative story about...');

// Factual, deterministic (recommended: 0.0-0.3)
$factual = Mindwave::llm('anthropic')
    ->temperature(0.0)
    ->generateText('What is the capital of France?');

// Balanced (0.5-0.7)
$balanced = Mindwave::llm('anthropic')
    ->temperature(0.7)
    ->generateText('Explain quantum computing');
```

**Anthropic Default:** 1.0 (vs OpenAI's 0.7)

### Max Tokens

Control response length (required parameter):

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Short responses
$short = Mindwave::llm('anthropic')
    ->maxTokens(100)
    ->generateText('Summarize AI in one sentence');

// Long-form content
$long = Mindwave::llm('anthropic')
    ->maxTokens(4000)
    ->generateText('Write a comprehensive guide to...');
```

**Important:** `max_tokens` is required by Anthropic's API. Mindwave defaults to 4096.

### Top P (Nucleus Sampling)

Alternative to temperature for controlling randomness:

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Available via direct SDK access
$client = \Anthropic::client(config('mindwave-llm.llms.anthropic.api_key'));

$response = $client->messages()->create([
    'model' => 'claude-3-5-sonnet-20241022',
    'max_tokens' => 1024,
    'top_p' => 0.9, // Consider top 90% probability mass
    'messages' => [['role' => 'user', 'content' => 'Your prompt']],
]);
```

### Top K

Limits the number of tokens considered:

```php
// Available via direct SDK access
$response = $client->messages()->create([
    'model' => 'claude-3-5-sonnet-20241022',
    'max_tokens' => 1024,
    'top_k' => 50, // Consider only top 50 tokens
    'messages' => [['role' => 'user', 'content' => 'Your prompt']],
]);
```

### Stop Sequences

Define custom stop conditions:

```php
// Available via direct SDK access
$response = $client->messages()->create([
    'model' => 'claude-3-5-sonnet-20241022',
    'max_tokens' => 1024,
    'stop_sequences' => ['\n\nHuman:', '\n\nAssistant:'],
    'messages' => [['role' => 'user', 'content' => 'Your prompt']],
]);
```

## Streaming Responses

### Backend: Laravel Route

Set up streaming in your Laravel controller:

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\LLM\Streaming\StreamedTextResponse;

Route::get('/api/stream', function () {
    $driver = Mindwave::llm('anthropic')
        ->model('claude-3-5-haiku-20241022');

    $stream = $driver->streamText('Write a story about...');

    return new StreamedTextResponse($stream);
});
```

### Frontend: JavaScript (Vanilla)

```javascript
async function streamResponse() {
    const response = await fetch('/api/stream');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        document.getElementById('output').innerHTML += chunk;
    }
}

streamResponse();
```

### Frontend: Alpine.js

```html
<div x-data="{
    content: '',
    streaming: false,
    async stream() {
        this.streaming = true;
        this.content = '';

        const response = await fetch('/api/stream');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            this.content += decoder.decode(value);
        }

        this.streaming = false;
    }
}">
    <button @click="stream()" :disabled="streaming">
        Generate
    </button>

    <div x-html="content"></div>
</div>
```

### Streaming with Callbacks

Process chunks as they arrive:

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\LLM\Streaming\StreamedTextResponse;

$driver = Mindwave::llm('anthropic')
    ->model('claude-3-5-haiku-20241022');

$stream = $driver->streamText('Count from 1 to 10');
$response = new StreamedTextResponse($stream);

$response->onChunk(function (string $chunk) {
    // Process each chunk
    Log::info('Received chunk:', ['chunk' => $chunk]);

    // Broadcast to websocket
    broadcast(new ChunkReceived($chunk));
});

// Convert to full string
$fullText = $response->toString();
```

### Streaming Best Practices

1. **Use Haiku for Speed**: Claude 3.5 Haiku streams fastest
2. **Handle Errors**: Wrap streaming in try-catch
3. **Set Timeouts**: Configure reasonable timeout values
4. **Buffer Management**: Process chunks efficiently on frontend
5. **User Feedback**: Show loading states during streaming

```php
use Mindwave\Mindwave\Facades\Mindwave;

try {
    $stream = Mindwave::llm('anthropic')
        ->model('claude-3-5-haiku-20241022')
        ->maxTokens(1000) // Limit for faster completion
        ->streamText($prompt);

    return new StreamedTextResponse($stream);
} catch (\Exception $e) {
    Log::error('Streaming failed', ['error' => $e->getMessage()]);
    return response()->json(['error' => 'Streaming failed'], 500);
}
```

## Best Practices

### Model Selection Guide

Choose the right model for your use case:

| Use Case | Recommended Model | Why |
|----------|------------------|-----|
| Complex code generation | Claude 3.5 Sonnet | Best code understanding |
| Fast customer support | Claude 3.5 Haiku | Low latency, cost-effective |
| Research analysis | Claude 3.5 Sonnet | Extended thinking |
| High-volume classification | Claude 3.5 Haiku | Best price/performance |
| Long document analysis | Claude 3.5 Sonnet | 200K context + intelligence |
| Real-time chat | Claude 3.5 Haiku | Fastest responses |
| Complex reasoning | Claude 3.5 Sonnet | Extended thinking mode |

### Cost Optimization

Strategies to reduce API costs:

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\LLM\Drivers\Anthropic\ModelNames;

// 1. Use Haiku for simple tasks
$driver = Mindwave::llm('anthropic')
    ->model(ModelNames::CLAUDE_3_5_HAIKU); // 75% cheaper than Sonnet

// 2. Limit max_tokens appropriately
$driver->maxTokens(500); // Don't request more than needed

// 3. Use temperature 0 for caching-friendly requests
$driver->temperature(0.0); // Deterministic = better caching

// 4. Implement prompt caching (via SDK)
$client = \Anthropic::client(config('mindwave-llm.llms.anthropic.api_key'));
$response = $client->messages()->create([
    'model' => 'claude-3-5-sonnet-20241022',
    'max_tokens' => 1024,
    'system' => [
        [
            'type' => 'text',
            'text' => 'Large system prompt here...',
            'cache_control' => ['type' => 'ephemeral'], // Cache this
        ],
    ],
    'messages' => [['role' => 'user', 'content' => 'User question']],
]);
```

### Prompt Engineering Tips

Anthropic models respond well to clear, structured prompts:

```php
use Mindwave\Mindwave\Facades\Mindwave;

// ✅ Good: Clear structure and examples
$response = Mindwave::llm('anthropic')
    ->setSystemMessage('You are a code reviewer. Provide constructive feedback.')
    ->generateText('
        Review this code:

        ```php
        ' . $code . '
        ```

        Focus on:
        1. Security issues
        2. Performance concerns
        3. Best practices

        Format your response as a bulleted list.
    ');

// ❌ Avoid: Vague prompts
$response = Mindwave::llm('anthropic')
    ->generateText('What do you think about this code? ' . $code);
```

### Error Handling

Implement robust error handling:

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Illuminate\Support\Facades\Log;

try {
    $response = Mindwave::llm('anthropic')
        ->model('claude-3-5-sonnet-20241022')
        ->maxTokens(2000)
        ->generateText($prompt);

    return $response;

} catch (\Anthropic\Exceptions\ErrorException $e) {
    // Anthropic API error
    Log::error('Anthropic API error', [
        'message' => $e->getMessage(),
        'code' => $e->getCode(),
    ]);

    throw $e;

} catch (\Exception $e) {
    // General error
    Log::error('LLM generation failed', [
        'error' => $e->getMessage(),
    ]);

    throw $e;
}
```

### Rate Limiting Strategy

Anthropic has different rate limits by tier:

```php
use Illuminate\Support\Facades\RateLimiter;

// Implement application-level rate limiting
RateLimiter::for('anthropic', function ($request) {
    return Limit::perMinute(50)->by($request->user()->id);
});

// In your route/controller
Route::middleware('throttle:anthropic')->post('/generate', function (Request $request) {
    return Mindwave::llm('anthropic')->generateText($request->input('prompt'));
});
```

## Pricing & Cost Management

### Current Pricing (as of November 2024)

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Context Window |
|-------|----------------------|------------------------|----------------|
| Claude 3.5 Sonnet | $3.00 | $15.00 | 200K |
| Claude 3.5 Haiku | $0.80 | $4.00 | 200K |
| Claude 3 Opus | $15.00 | $75.00 | 200K |
| Claude 3 Sonnet | $3.00 | $15.00 | 200K |
| Claude 3 Haiku | $0.25 | $1.25 | 200K |

**Prompt Caching Discounts:**
- Cached input tokens: 90% discount
- Cache writes: 25% markup

### Cost Calculation Examples

```php
// Example: 1000 requests with Claude 3.5 Sonnet
// Average: 500 input tokens, 200 output tokens per request

$inputTokens = 1000 * 500; // 500,000 tokens
$outputTokens = 1000 * 200; // 200,000 tokens

$inputCost = ($inputTokens / 1_000_000) * 3.00; // $1.50
$outputCost = ($outputTokens / 1_000_000) * 15.00; // $3.00

$totalCost = $inputCost + $outputCost; // $4.50

echo "Cost for 1000 requests: $" . number_format($totalCost, 2);
```

### Track Costs with Tracing

Mindwave automatically tracks token usage:

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Generate text (automatically traced)
$response = Mindwave::llm('anthropic')
    ->model('claude-3-5-sonnet-20241022')
    ->generateText($prompt);

// Query the database for cost information
$traces = \DB::table('mindwave_traces')
    ->where('model', 'claude-3-5-sonnet-20241022')
    ->get();

foreach ($traces as $trace) {
    $metadata = json_decode($trace->metadata, true);
    $inputTokens = $metadata['input_tokens'] ?? 0;
    $outputTokens = $metadata['output_tokens'] ?? 0;

    $cost = ($inputTokens / 1_000_000) * 3.00 + ($outputTokens / 1_000_000) * 15.00;

    echo "Request cost: $" . number_format($cost, 4);
}
```

### Using PromptComposer to Manage Costs

Keep prompts within budget using PromptComposer:

```php
use Mindwave\Mindwave\PromptComposer\PromptComposer;
use Mindwave\Mindwave\Facades\Mindwave;

$composer = new PromptComposer(
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4000 // Leave room for response
);

// Add content intelligently
$composer->addText('System instruction: Be helpful and concise.');
$composer->addText($largeDocument); // Will be truncated if needed

// Get optimized prompt
$optimizedPrompt = $composer->compose();

$response = Mindwave::llm('anthropic')
    ->model('claude-3-5-sonnet-20241022')
    ->generateText($optimizedPrompt);
```

## Limitations & Considerations

### Rate Limits

Anthropic has tiered rate limits:

| Tier | Requests/min | Tokens/min | Tokens/day |
|------|-------------|-----------|------------|
| Free | 5 | 25,000 | 300,000 |
| Build Tier 1 | 50 | 50,000 | 1,000,000 |
| Build Tier 2 | 50 | 100,000 | 2,500,000 |
| Build Tier 3 | 50 | 200,000 | 5,000,000 |
| Build Tier 4 | 50 | 400,000 | 10,000,000 |

**Note:** Limits are per model. Tiers increase with usage.

### Context Window Limits

All Claude 3+ models support 200,000 tokens:

```php
use Mindwave\Mindwave\Facades\Mindwave;

$driver = Mindwave::llm('anthropic')
    ->model('claude-3-5-sonnet-20241022');

// Check max context
$maxTokens = $driver->maxContextTokens(); // Returns: 200000

// This includes both input and output tokens combined
```

### Model Availability

- All Claude 3.5 and 3 models are generally available
- New models may have limited availability during rollout
- Check [Anthropic status page](https://status.anthropic.com) for issues

### Regional Considerations

- Anthropic API is available globally
- No regional endpoints (unlike Azure OpenAI)
- Latency varies by geographic location
- Consider using a CDN for static prompts

## Troubleshooting

### 401 Unauthorized

**Cause:** Invalid or missing API key

**Solution:**
```bash
# Check your .env file
cat .env | grep MINDWAVE_ANTHROPIC_API_KEY

# Verify the key starts with sk-ant-
# Get a new key at console.anthropic.com
```

### 429 Rate Limit Exceeded

**Cause:** Exceeded your tier's rate limits

**Solution:**
```php
// Implement exponential backoff
use Illuminate\Support\Facades\Http;

$retries = 0;
$maxRetries = 3;

while ($retries < $maxRetries) {
    try {
        $response = Mindwave::llm('anthropic')->generateText($prompt);
        break;
    } catch (\Exception $e) {
        if ($e->getCode() === 429) {
            $retries++;
            $waitTime = pow(2, $retries); // Exponential backoff
            sleep($waitTime);
        } else {
            throw $e;
        }
    }
}
```

### 400 Bad Request

**Common causes:**
- Missing `max_tokens` parameter
- Invalid model name
- Malformed request

**Solution:**
```php
try {
    $response = Mindwave::llm('anthropic')
        ->model('claude-3-5-sonnet-20241022') // Correct model name
        ->maxTokens(4096) // Required!
        ->generateText($prompt);
} catch (\Exception $e) {
    Log::error('Bad request', ['error' => $e->getMessage()]);
}
```

### Context Length Exceeded

**Cause:** Input + output tokens exceed 200K limit

**Solution:**
```php
use Mindwave\Mindwave\PromptComposer\PromptComposer;

// Use PromptComposer to stay within limits
$composer = new PromptComposer(
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 4096 // Reserve for output
);

$composer->addText($largeDocument);
$optimizedPrompt = $composer->compose();

$response = Mindwave::llm('anthropic')
    ->maxTokens(4096)
    ->generateText($optimizedPrompt);
```

### Timeout Errors

**Cause:** Request taking too long

**Solution:**
```php
// Set custom timeout in your HTTP client configuration
// Or use faster model for time-sensitive tasks

$response = Mindwave::llm('anthropic')
    ->model('claude-3-5-haiku-20241022') // Faster model
    ->maxTokens(1000) // Limit response length
    ->generateText($prompt);
```

## Comparison with Other Providers

### When to Use Anthropic vs OpenAI

| Feature | Anthropic (Claude) | OpenAI (GPT) |
|---------|-------------------|--------------|
| **Context Window** | 200K tokens | 128K tokens (GPT-4 Turbo) |
| **Reasoning** | Extended thinking | O1 models |
| **Vision** | Built-in (all 3+ models) | GPT-4o, GPT-4V |
| **Function Calling** | Tools API | Native support |
| **Streaming** | ✅ Yes | ✅ Yes |
| **JSON Mode** | Via prompting | Native JSON mode |
| **Safety** | Constitutional AI | Moderation API |
| **Pricing** | Competitive | Similar range |
| **Best For** | Long documents, reasoning | Function calling, structured output |

### Migration from OpenAI

Switching from OpenAI to Anthropic is straightforward:

```php
// Before (OpenAI)
$response = Mindwave::llm('openai')
    ->model('gpt-4-turbo')
    ->temperature(0.7)
    ->generateText($prompt);

// After (Anthropic)
$response = Mindwave::llm('anthropic')
    ->model('claude-3-5-sonnet-20241022')
    ->temperature(0.7)
    ->generateText($prompt);
```

**Key Differences:**
1. System messages are separate parameter (not in messages array)
2. `max_tokens` is required
3. Default temperature is 1.0 (not 0.7)
4. No native JSON mode (use prompting instead)
5. Tool calling has different format

## Summary

Anthropic's Claude models offer excellent performance for complex reasoning tasks, extended context windows, and strong safety guarantees. Key takeaways:

- **Use Claude 3.5 Sonnet** for complex reasoning and code tasks
- **Use Claude 3.5 Haiku** for fast, cost-effective applications
- **200K context window** perfect for long document analysis
- **Streaming support** for real-time user experiences
- **Automatic tracing** for cost and usage monitoring

### Quick Start Checklist

- [ ] Get API key from [console.anthropic.com](https://console.anthropic.com)
- [ ] Add `MINDWAVE_ANTHROPIC_API_KEY` to `.env`
- [ ] Install with: `composer require mozex/anthropic-php`
- [ ] Test connection with simple `generateText()` call
- [ ] Choose appropriate model for your use case
- [ ] Implement error handling and rate limiting
- [ ] Monitor costs with Mindwave tracing

### Additional Resources

- [Anthropic Documentation](https://docs.anthropic.com)
- [Claude API Reference](https://docs.anthropic.com/en/api)
- [Model Card & Evals](https://www-cdn.anthropic.com/files/4zrzovbb/website/1adf000c8f675958c2ee23805d91aaade1cd4613.pdf)
- [Prompt Engineering Guide](https://docs.anthropic.com/en/docs/prompt-engineering)
- [Safety Best Practices](https://docs.anthropic.com/en/docs/security-and-safety)

---

**Need help?** Check the [Mindwave documentation](https://mindwave.dev) or open an issue on [GitHub](https://github.com/helgesverre/mindwave).
