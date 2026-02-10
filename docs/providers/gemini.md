# Google Gemini Provider

## Overview

Google Gemini is Google's family of multimodal AI models, offering competitive performance with generous context windows and fast inference speeds. Mindwave includes a native Gemini driver with full streaming support.

### Why Use Google Gemini with Mindwave?

-   **Large context windows** - Up to 2 million tokens for Gemini 1.5 Pro
-   **Fast inference** - Gemini 2.0 Flash offers excellent speed-to-quality ratio
-   **Multimodal capabilities** - Native support for text, images, audio, and video
-   **Competitive pricing** - Generous free tier and cost-effective paid plans
-   **Streaming support** - Full SSE streaming via Mindwave's native driver
-   **Google ecosystem** - Integrates with Google Cloud services

### Key Capabilities

-   ✅ Chat completions with multi-turn conversations
-   ✅ Streaming responses with SSE
-   ✅ System instructions via `systemInstruction` parameter
-   ✅ Token usage tracking (input and output)
-   ✅ Large context windows (up to 2M tokens)
-   ✅ Automatic tracing and cost tracking

## Setup & Configuration

### Getting Your API Key

1. Visit [Google AI Studio](https://aistudio.google.com)
2. Sign in with your Google account
3. Click **Get API Key** in the navigation
4. Click **Create API Key**
5. Select or create a Google Cloud project
6. Copy your API key

### Environment Variables

Add these to your `.env` file:

```dotenv
# Required: Your Google API key
GOOGLE_API_KEY=your-google-api-key-here

# Optional: Default model
MINDWAVE_GEMINI_MODEL=gemini-2.0-flash

# Optional: Generation parameters
MINDWAVE_GEMINI_MAX_TOKENS=1000
MINDWAVE_GEMINI_TEMPERATURE=0.4

# Set Gemini as default provider
MINDWAVE_LLM=gemini
```

### Configuration File

The Gemini configuration is defined in `config/mindwave-llm.php`:

```php
return [
    'default' => env('MINDWAVE_LLM', 'openai'),

    'llms' => [
        'gemini' => [
            'api_key' => env('GOOGLE_API_KEY'),
            'model' => env('MINDWAVE_GEMINI_MODEL', 'gemini-2.0-flash'),
            'max_tokens' => env('MINDWAVE_GEMINI_MAX_TOKENS', 1000),
            'temperature' => env('MINDWAVE_GEMINI_TEMPERATURE', 0.4),
        ],
    ],
];
```

### Testing Your Connection

```php
use Mindwave\Mindwave\Facades\LLM;

$response = LLM::driver('gemini')->generateText('Say hello!');

if ($response) {
    echo "Gemini connection successful!";
    echo "Response: " . $response;
} else {
    echo "Connection failed - check your API key";
}
```

## Available Models

### Gemini 2.0 Flash (Default - Recommended)

The fastest and most cost-effective Gemini model with strong performance.

| Model ID            | Context Window   | Max Output | Input Price  | Output Price | Best For                   |
| ------------------- | ---------------- | ---------- | ------------ | ------------ | -------------------------- |
| `gemini-2.0-flash`  | 1,048,576 tokens | 8,192      | $0.10/1M     | $0.40/1M     | Fast, cost-effective tasks |

**Use Cases:**

-   Real-time chat interfaces
-   High-volume content generation
-   Quick summarization and classification
-   Cost-sensitive production applications
-   Rapid prototyping

### Gemini 2.0 Flash-Lite

An even lighter model optimized for the simplest tasks.

| Model ID                 | Context Window   | Max Output | Input Price  | Output Price | Best For              |
| ------------------------ | ---------------- | ---------- | ------------ | ------------ | --------------------- |
| `gemini-2.0-flash-lite`  | 1,048,576 tokens | 8,192      | $0.025/1M    | $0.10/1M     | Ultra-low-cost tasks  |

### Gemini 1.5 Pro

The most capable Gemini model with the largest context window.

| Model ID          | Context Window   | Max Output | Input Price | Output Price | Best For                  |
| ----------------- | ---------------- | ---------- | ----------- | ------------ | ------------------------- |
| `gemini-1.5-pro`  | 2,097,152 tokens | 8,192      | $1.25/1M    | $5.00/1M     | Long document analysis    |

**Use Cases:**

-   Processing extremely long documents
-   Multi-document analysis and comparison
-   Complex reasoning over large contexts
-   Research and deep analysis tasks

### Gemini 1.5 Flash

A balanced option between speed and capability.

| Model ID            | Context Window   | Max Output | Input Price | Output Price | Best For             |
| ------------------- | ---------------- | ---------- | ----------- | ------------ | -------------------- |
| `gemini-1.5-flash`  | 1,048,576 tokens | 8,192      | $0.075/1M   | $0.30/1M     | Balanced performance |

## Basic Usage

### Simple Text Generation

```php
use Mindwave\Mindwave\Facades\LLM;

$response = LLM::driver('gemini')
    ->generateText('Explain Laravel in one sentence.');

echo $response;
```

### Chat Completion

```php
use Mindwave\Mindwave\Facades\LLM;

$response = LLM::driver('gemini')
    ->model('gemini-2.0-flash')
    ->maxTokens(500)
    ->temperature(0.7)
    ->chat([
        ['role' => 'system', 'content' => 'You are a helpful Laravel expert.'],
        ['role' => 'user', 'content' => 'How do I create a migration?'],
    ]);

echo $response->content;
echo "Input tokens: " . $response->inputTokens;
echo "Output tokens: " . $response->outputTokens;
```

::: tip System Messages
Gemini handles system messages differently from OpenAI. When you pass a message with `role: system`, Mindwave automatically maps it to Gemini's `systemInstruction` parameter. You can also set a default system message in the driver configuration.
:::

### Using Specific Models

```php
use Mindwave\Mindwave\Facades\LLM;

// Fast responses with Flash
$quick = LLM::driver('gemini')
    ->model('gemini-2.0-flash')
    ->generateText('Summarize this: ' . $text);

// Deep analysis with Pro
$detailed = LLM::driver('gemini')
    ->model('gemini-1.5-pro')
    ->maxTokens(4000)
    ->generateText('Analyze the architectural patterns in: ' . $code);
```

### Multi-Turn Conversations

```php
use Mindwave\Mindwave\Facades\LLM;

$messages = [
    ['role' => 'system', 'content' => 'You are a helpful assistant.'],
    ['role' => 'user', 'content' => 'What is Laravel?'],
    ['role' => 'assistant', 'content' => 'Laravel is a PHP web framework...'],
    ['role' => 'user', 'content' => 'How do I install it?'],
];

$response = LLM::driver('gemini')->chat($messages);
echo $response->content;
```

## Streaming Responses

Gemini has full streaming support in Mindwave via Server-Sent Events.

### Text Streaming

```php
use Mindwave\Mindwave\Facades\LLM;

// Stream raw text chunks
foreach (LLM::driver('gemini')->streamText('Write a story about AI') as $chunk) {
    echo $chunk; // Each chunk is a string
}
```

### Structured Chat Streaming

```php
use Mindwave\Mindwave\Facades\LLM;
use Mindwave\Mindwave\LLM\Responses\StreamChunk;

$messages = [
    ['role' => 'user', 'content' => 'Explain quantum computing'],
];

foreach (LLM::driver('gemini')->streamChat($messages) as $chunk) {
    /** @var StreamChunk $chunk */
    if ($chunk->content) {
        echo $chunk->content;
    }

    // Access metadata on final chunk
    if ($chunk->finishReason) {
        echo "\nFinish reason: " . $chunk->finishReason;
        echo "\nInput tokens: " . $chunk->inputTokens;
        echo "\nOutput tokens: " . $chunk->outputTokens;
    }
}
```

### SSE Streaming in Laravel Routes

```php
use Mindwave\Mindwave\Facades\LLM;
use Mindwave\Mindwave\LLM\Streaming\StreamedTextResponse;

Route::get('/api/chat', function (Request $request) {
    $stream = LLM::driver('gemini')
        ->model('gemini-2.0-flash')
        ->streamText($request->input('prompt'));

    $response = new StreamedTextResponse($stream);

    return $response->toStreamedResponse();
});
```

### Streaming with Metadata Accumulation

Use `StreamedChatResponse` to collect metadata while streaming:

```php
use Mindwave\Mindwave\Facades\LLM;
use Mindwave\Mindwave\LLM\Responses\StreamedChatResponse;

$stream = LLM::driver('gemini')->streamChat([
    ['role' => 'user', 'content' => 'Tell me about Laravel'],
]);

$chatResponse = new StreamedChatResponse($stream);

// Iterate chunks (metadata accumulates automatically)
foreach ($chatResponse->chunks() as $chunk) {
    echo $chunk->content;
}

// After consumption, access accumulated metadata
$text = $chatResponse->getText();
$metadata = $chatResponse->getMetadata();

echo "Total input tokens: " . $metadata->inputTokens;
echo "Total output tokens: " . $metadata->outputTokens;
echo "Model: " . $metadata->model;
```

## Advanced Parameters

### Temperature

Controls randomness in responses (0.0 to 2.0):

```php
use Mindwave\Mindwave\Facades\LLM;

// Factual (0.0-0.3)
$factual = LLM::driver('gemini')
    ->temperature(0.1)
    ->generateText('What is the capital of France?');

// Balanced (0.4-0.7)
$balanced = LLM::driver('gemini')
    ->temperature(0.5)
    ->generateText('Explain quantum computing');

// Creative (0.8-1.5)
$creative = LLM::driver('gemini')
    ->temperature(1.2)
    ->generateText('Write a creative story about AI');
```

### Max Tokens

Control response length:

```php
use Mindwave\Mindwave\Facades\LLM;

// Short
$brief = LLM::driver('gemini')
    ->maxTokens(100)
    ->generateText('Summarize AI in one sentence');

// Long-form
$detailed = LLM::driver('gemini')
    ->maxTokens(4000)
    ->generateText('Write a comprehensive guide to...');
```

## Best Practices

### Model Selection Guide

| Use Case                   | Recommended Model      | Why                              |
| -------------------------- | ---------------------- | -------------------------------- |
| Real-time chat             | `gemini-2.0-flash`     | Fastest responses, low cost      |
| Long document analysis     | `gemini-1.5-pro`       | 2M token context window          |
| High-volume classification | `gemini-2.0-flash-lite`| Ultra-low cost                   |
| Complex reasoning          | `gemini-1.5-pro`       | Most capable Gemini model        |
| Cost-sensitive production  | `gemini-2.0-flash`     | Best price/performance ratio     |

### Cost Optimization

```php
use Mindwave\Mindwave\Facades\LLM;

// Strategy 1: Use Flash for most tasks
$response = LLM::driver('gemini')
    ->model('gemini-2.0-flash')
    ->generateText($prompt);

// Strategy 2: Escalate to Pro only when needed
if (!$this->isGoodQuality($response)) {
    $response = LLM::driver('gemini')
        ->model('gemini-1.5-pro')
        ->generateText($prompt);
}

// Strategy 3: Use Flash-Lite for simple tasks
$tags = LLM::driver('gemini')
    ->model('gemini-2.0-flash-lite')
    ->maxTokens(50)
    ->generateText("Extract 3 tags from: {$article->title}");
```

### Error Handling

```php
use Mindwave\Mindwave\Facades\LLM;
use Mindwave\Mindwave\Exceptions\StreamingException;

try {
    $response = LLM::driver('gemini')
        ->model('gemini-2.0-flash')
        ->generateText($prompt);
} catch (StreamingException $e) {
    // Streaming-specific error
    logger()->error('Gemini streaming failed', ['error' => $e->getMessage()]);
} catch (\Exception $e) {
    logger()->error('Gemini request failed', ['error' => $e->getMessage()]);
}
```

## Pricing & Cost Management

### Current Pricing

| Model              | Input (per 1M tokens) | Output (per 1M tokens) | Context Window |
| ------------------ | --------------------- | ---------------------- | -------------- |
| Gemini 2.0 Flash   | $0.10                 | $0.40                  | 1M             |
| Gemini 2.0 Flash-Lite | $0.025             | $0.10                  | 1M             |
| Gemini 1.5 Pro     | $1.25                 | $5.00                  | 2M             |
| Gemini 1.5 Flash   | $0.075                | $0.30                  | 1M             |

**Note:** Google also offers a free tier with rate limits. Check [Google AI pricing](https://ai.google.dev/pricing) for latest rates.

### Cost Comparison

Gemini is highly competitive on pricing:

| Comparison                | Input Cost | Output Cost |
| ------------------------- | ---------- | ----------- |
| Gemini 2.0 Flash          | $0.10/1M   | $0.40/1M    |
| GPT-4o-mini               | $0.15/1M   | $0.60/1M    |
| Claude Haiku 4.5          | $0.80/1M   | $4.00/1M    |
| Groq (Llama 3.3 70B)      | $0.59/1M   | $0.79/1M    |

## Limitations & Considerations

### API Differences

Gemini has a different API format from OpenAI. Mindwave's native driver handles the translation:

-   Messages use `role: model` instead of `role: assistant`
-   System messages are sent via `systemInstruction` parameter
-   Response structure uses `candidates[].content.parts[].text`
-   Token counts are in `usageMetadata` (not `usage`)

### No Function Calling (Yet)

The current Gemini driver focuses on text generation and streaming. Function calling support is planned for a future release.

### Rate Limits

Google AI has rate limits that vary by model and pricing tier:

-   **Free tier**: 15 RPM, 1M TPM, 1,500 RPD
-   **Pay-as-you-go**: 2,000 RPM, 4M TPM

Check [Google AI rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) for details.

## Troubleshooting

### 401/403 Authentication Errors

**Problem:** Invalid API key

**Solutions:**

1. Verify your API key at [Google AI Studio](https://aistudio.google.com)
2. Ensure the key is set in `.env`:
   ```dotenv
   GOOGLE_API_KEY=your-actual-key-here
   ```
3. Clear config cache:
   ```bash
   php artisan config:clear
   ```

### 429 Rate Limit / Quota Errors

**Problem:** Exceeded rate limits or quota

**Solutions:**

1. Check your quota at [Google Cloud Console](https://console.cloud.google.com)
2. Implement exponential backoff
3. Upgrade to a paid plan for higher limits

### Context Length Exceeded

**Problem:** Input too long for model

**Solutions:**

1. Use Gemini 1.5 Pro for its 2M token context window
2. Use PromptComposer to auto-fit prompts:
   ```php
   $response = Mindwave::prompt()
       ->section('context', $longDoc, priority: 50, shrinker: 'truncate')
       ->section('user', $question, priority: 100)
       ->driver('gemini')
       ->fit()
       ->run();
   ```

## Summary

Google Gemini offers excellent value with large context windows and competitive pricing:

-   **Gemini 2.0 Flash** - Best for fast, cost-effective production use
-   **Gemini 1.5 Pro** - Best for long documents and complex reasoning
-   **Full streaming support** - Native SSE streaming via Mindwave driver

**Next Steps:**

-   Explore [Streaming Responses](/docs/core/streaming) for real-time UIs
-   Learn about [PromptComposer](/docs/core/prompt-composer) for context management
-   Set up [Tracing](/docs/observability/tracing) for cost monitoring

**Resources:**

-   [Google AI Documentation](https://ai.google.dev/docs)
-   [Gemini API Reference](https://ai.google.dev/gemini-api/docs)
-   [Google AI Pricing](https://ai.google.dev/pricing)
-   [Google AI Studio](https://aistudio.google.com)
