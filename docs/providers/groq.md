# Groq Provider

## Overview

Groq is a high-performance AI inference platform known for extremely fast response times. Groq runs open-source models like Meta's Llama series on custom LPU (Language Processing Unit) hardware, delivering industry-leading inference speeds. Since Groq's API is OpenAI-compatible, Mindwave reuses its OpenAI driver with a custom base URI.

### Why Use Groq with Mindwave?

-   **Ultra-fast inference** - Lowest latency available for LLM inference
-   **Open-source models** - Access Llama 3.3 70B, Mixtral, and more
-   **OpenAI-compatible API** - Same interface you already know
-   **Competitive pricing** - Cost-effective for high-volume workloads
-   **Streaming support** - Full SSE streaming through the OpenAI driver
-   **No vendor lock-in** - Uses open-source models you can self-host

### Key Capabilities

-   ✅ Chat completions with multi-turn conversations
-   ✅ Streaming responses with SSE
-   ✅ Function/tool calling
-   ✅ JSON mode for structured outputs
-   ✅ Automatic tracing and cost tracking
-   ✅ All OpenAI driver features

## Setup & Configuration

### Getting Your API Key

1. Create an account at [console.groq.com](https://console.groq.com)
2. Navigate to **API Keys** in the sidebar
3. Click **Create API Key**
4. Copy your key (starts with `gsk_`)

### Environment Variables

Add these to your `.env` file:

```dotenv
# Required: Your Groq API key
GROQ_API_KEY=gsk_your-groq-api-key-here

# Optional: Default model
MINDWAVE_GROQ_MODEL=llama-3.3-70b-versatile

# Optional: Generation parameters
MINDWAVE_GROQ_MAX_TOKENS=1000
MINDWAVE_GROQ_TEMPERATURE=0.4

# Set Groq as default provider
MINDWAVE_LLM=groq
```

### Configuration File

The Groq configuration is defined in `config/mindwave-llm.php`:

```php
return [
    'default' => env('MINDWAVE_LLM', 'openai'),

    'llms' => [
        'groq' => [
            'api_key' => env('GROQ_API_KEY'),
            'model' => env('MINDWAVE_GROQ_MODEL', 'llama-3.3-70b-versatile'),
            'max_tokens' => env('MINDWAVE_GROQ_MAX_TOKENS', 1000),
            'temperature' => env('MINDWAVE_GROQ_TEMPERATURE', 0.4),
        ],
    ],
];
```

### How It Works

Groq uses the OpenAI-compatible API format, so Mindwave creates an OpenAI driver instance with Groq's base URI:

```php
// Internally, Mindwave does this:
$client = OpenAI::factory()
    ->withApiKey(config('mindwave-llm.llms.groq.api_key'))
    ->withBaseUri('https://api.groq.com/openai/v1')
    ->make();
```

This means all OpenAI driver features work seamlessly with Groq.

### Testing Your Connection

```php
use Mindwave\Mindwave\Facades\LLM;

$response = LLM::driver('groq')->generateText('Say hello!');

if ($response) {
    echo "Groq connection successful!";
    echo "Response: " . $response;
} else {
    echo "Connection failed - check your API key";
}
```

## Available Models

### Llama 3.3 70B Versatile (Default - Recommended)

Meta's latest open-source model with excellent general performance.

| Model ID                   | Context Window | Input Price | Output Price | Best For               |
| -------------------------- | -------------- | ----------- | ------------ | ---------------------- |
| `llama-3.3-70b-versatile`  | 128,000 tokens | $0.59/1M    | $0.79/1M     | General-purpose tasks  |

### Llama 3.1 8B Instant

A smaller, faster model for simple tasks.

| Model ID                | Context Window | Input Price | Output Price | Best For             |
| ----------------------- | -------------- | ----------- | ------------ | -------------------- |
| `llama-3.1-8b-instant`  | 128,000 tokens | $0.05/1M    | $0.08/1M     | Fast, simple tasks   |

### Mixtral 8x7B

Mistral's Mixture-of-Experts model on Groq hardware.

| Model ID                         | Context Window | Input Price | Output Price | Best For                |
| -------------------------------- | -------------- | ----------- | ------------ | ----------------------- |
| `mixtral-8x7b-32768`             | 32,768 tokens  | $0.24/1M    | $0.24/1M     | Multilingual, balanced  |

### Gemma 2 9B

Google's open-source model running on Groq.

| Model ID       | Context Window | Input Price | Output Price | Best For               |
| -------------- | -------------- | ----------- | ------------ | ---------------------- |
| `gemma2-9b-it` | 8,192 tokens   | $0.20/1M    | $0.20/1M     | Lightweight tasks      |

::: tip Check Available Models
Groq regularly adds new models. Check [console.groq.com/docs/models](https://console.groq.com/docs/models) for the latest list.
:::

## Basic Usage

### Simple Text Generation

```php
use Mindwave\Mindwave\Facades\LLM;

$response = LLM::driver('groq')
    ->generateText('Explain Laravel in one sentence.');

echo $response;
```

### Chat Completion

```php
use Mindwave\Mindwave\Facades\LLM;

$response = LLM::driver('groq')
    ->model('llama-3.3-70b-versatile')
    ->maxTokens(500)
    ->temperature(0.7)
    ->chat([
        ['role' => 'system', 'content' => 'You are a helpful Laravel expert.'],
        ['role' => 'user', 'content' => 'How do I create a migration?'],
    ]);

echo $response->content;
```

### Using Specific Models

```php
use Mindwave\Mindwave\Facades\LLM;

// Fast responses with small model
$quick = LLM::driver('groq')
    ->model('llama-3.1-8b-instant')
    ->generateText('Summarize this: ' . $text);

// High quality with large model
$detailed = LLM::driver('groq')
    ->model('llama-3.3-70b-versatile')
    ->maxTokens(2000)
    ->generateText('Analyze this code: ' . $code);
```

## Streaming Responses

Since Groq uses the OpenAI driver, streaming works exactly the same as OpenAI:

### SSE Streaming in Laravel

```php
use Mindwave\Mindwave\Facades\LLM;
use Mindwave\Mindwave\LLM\Streaming\StreamedTextResponse;

Route::get('/api/chat', function (Request $request) {
    $stream = LLM::driver('groq')
        ->model('llama-3.3-70b-versatile')
        ->streamText($request->input('prompt'));

    $response = new StreamedTextResponse($stream);

    return $response->toStreamedResponse();
});
```

### Text Streaming

```php
use Mindwave\Mindwave\Facades\LLM;

foreach (LLM::driver('groq')->streamText('Write a story') as $chunk) {
    echo $chunk;
}
```

## Best Practices

### Model Selection Guide

| Use Case                   | Recommended Model           | Why                          |
| -------------------------- | --------------------------- | ---------------------------- |
| General-purpose chat       | `llama-3.3-70b-versatile`   | Best quality on Groq         |
| Fast classification        | `llama-3.1-8b-instant`      | Ultra-fast, ultra-cheap      |
| Multilingual tasks         | `mixtral-8x7b-32768`        | Strong multilingual support  |
| Cost-sensitive production  | `llama-3.1-8b-instant`      | Lowest cost per token        |

### When to Use Groq

**Choose Groq when:**

-   Latency is critical (real-time chat, interactive applications)
-   You want to use open-source models
-   Cost optimization is important
-   You want the fastest inference speeds

**Consider other providers when:**

-   You need the absolute best quality (use OpenAI GPT-4o or Anthropic Claude)
-   You need function calling with complex tools (OpenAI has the most mature support)
-   You need vision/multimodal capabilities
-   You need very large context windows (Gemini 1.5 Pro offers 2M tokens)

## Pricing & Cost Management

### Current Pricing

| Model                     | Input (per 1M tokens) | Output (per 1M tokens) |
| ------------------------- | --------------------- | ---------------------- |
| Llama 3.3 70B Versatile   | $0.59                 | $0.79                  |
| Llama 3.1 8B Instant      | $0.05                 | $0.08                  |
| Mixtral 8x7B              | $0.24                 | $0.24                  |
| Gemma 2 9B                | $0.20                 | $0.20                  |

**Note:** Pricing may change. Check [groq.com/pricing](https://groq.com/pricing) for latest rates.

## Limitations & Considerations

### Rate Limits

Groq enforces rate limits based on your plan:

-   **Free tier**: Limited RPM and TPM
-   **Paid tier**: Higher limits

Check [console.groq.com/settings/limits](https://console.groq.com/settings/limits) for your current limits.

### Model Availability

Groq hosts a curated set of open-source models. Not all models from Meta, Mistral, or Google are available. Check the Groq console for the current model list.

### Context Window Limits

Most models on Groq support up to 128K tokens, but some older models have smaller windows. Always check the model specifications.

## Troubleshooting

### 401 Unauthorized

**Solutions:**

1. Verify your API key starts with `gsk_`
2. Check `.env`:
   ```dotenv
   GROQ_API_KEY=gsk_your-actual-key
   ```
3. Clear config cache: `php artisan config:clear`

### 429 Rate Limit Exceeded

**Solutions:**

1. Implement exponential backoff
2. Reduce request frequency
3. Upgrade your Groq plan for higher limits

### Model Not Found

**Solutions:**

1. Check available models at [console.groq.com/docs/models](https://console.groq.com/docs/models)
2. Groq periodically updates their model list - some models may be deprecated

## Summary

Groq provides the fastest LLM inference available, running open-source models on custom hardware:

-   **Llama 3.3 70B** - Best quality open-source model on Groq
-   **Llama 3.1 8B** - Ultra-fast and ultra-cheap for simple tasks
-   **OpenAI-compatible** - Same API, same code, faster inference

**Next Steps:**

-   Explore [Streaming Responses](/docs/core/streaming) for real-time UIs
-   Learn about [Tracing](/docs/observability/tracing) for cost monitoring
-   Compare with [OpenAI](/docs/providers/openai) for feature differences

**Resources:**

-   [Groq Console](https://console.groq.com)
-   [Groq Documentation](https://console.groq.com/docs)
-   [Groq Pricing](https://groq.com/pricing)
-   [Groq Status](https://status.groq.com)
