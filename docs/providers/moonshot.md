# Moonshot (Kimi) Provider

## Overview

Moonshot AI is the company behind Kimi, a family of large language models with strong multilingual capabilities and large context windows. Moonshot's API is OpenAI-compatible, so Mindwave reuses its OpenAI driver with a custom base URI, providing seamless integration with all existing OpenAI driver features.

### Why Use Moonshot with Mindwave?

-   **Strong multilingual support** - Excellent Chinese and English language capabilities
-   **Large context windows** - Up to 128K tokens for long document processing
-   **OpenAI-compatible API** - Same interface, drop-in replacement
-   **Competitive pricing** - Cost-effective for Asian market applications
-   **Streaming support** - Full SSE streaming through the OpenAI driver

### Key Capabilities

-   ✅ Chat completions with multi-turn conversations
-   ✅ Streaming responses with SSE
-   ✅ Function/tool calling
-   ✅ JSON mode for structured outputs
-   ✅ Automatic tracing and cost tracking
-   ✅ All OpenAI driver features

## Setup & Configuration

### Getting Your API Key

1. Visit [platform.moonshot.cn](https://platform.moonshot.cn)
2. Create an account
3. Navigate to the API section
4. Generate a new API key
5. Copy your key

### Environment Variables

Add these to your `.env` file:

```dotenv
# Required: Your Moonshot API key
MOONSHOT_API_KEY=your-moonshot-api-key-here

# Optional: Default model
MINDWAVE_MOONSHOT_MODEL=kimi-latest

# Optional: Generation parameters
MINDWAVE_MOONSHOT_MAX_TOKENS=1000
MINDWAVE_MOONSHOT_TEMPERATURE=0.4

# Set Moonshot as default provider
MINDWAVE_LLM=moonshot
```

### Configuration File

The Moonshot configuration is defined in `config/mindwave-llm.php`:

```php
return [
    'default' => env('MINDWAVE_LLM', 'openai'),

    'llms' => [
        'moonshot' => [
            'api_key' => env('MOONSHOT_API_KEY'),
            'model' => env('MINDWAVE_MOONSHOT_MODEL', 'kimi-latest'),
            'max_tokens' => env('MINDWAVE_MOONSHOT_MAX_TOKENS', 1000),
            'temperature' => env('MINDWAVE_MOONSHOT_TEMPERATURE', 0.4),
        ],
    ],
];
```

### How It Works

Moonshot uses the OpenAI-compatible API format, so Mindwave creates an OpenAI driver instance with Moonshot's base URI:

```php
// Internally, Mindwave does this:
$client = OpenAI::factory()
    ->withApiKey(config('mindwave-llm.llms.moonshot.api_key'))
    ->withBaseUri('https://api.moonshot.ai/v1')
    ->make();
```

This means all OpenAI driver features work seamlessly with Moonshot.

### Testing Your Connection

```php
use Mindwave\Mindwave\Facades\LLM;

$response = LLM::driver('moonshot')->generateText('Say hello!');

if ($response) {
    echo "Moonshot connection successful!";
    echo "Response: " . $response;
} else {
    echo "Connection failed - check your API key";
}
```

## Available Models

### Kimi Latest (Default - Recommended)

The latest and most capable Kimi model.

| Model ID       | Context Window | Best For                              |
| -------------- | -------------- | ------------------------------------- |
| `kimi-latest`  | 128,000 tokens | General-purpose, multilingual tasks   |

### Other Kimi Models

Moonshot offers several model variants. Check [platform.moonshot.cn](https://platform.moonshot.cn) for the full list of available models and their specifications.

::: tip Model Naming
Moonshot frequently updates their model lineup. Using `kimi-latest` ensures you always get the most recent version.
:::

## Basic Usage

### Simple Text Generation

```php
use Mindwave\Mindwave\Facades\LLM;

$response = LLM::driver('moonshot')
    ->generateText('Explain Laravel in one sentence.');

echo $response;
```

### Chat Completion

```php
use Mindwave\Mindwave\Facades\LLM;

$response = LLM::driver('moonshot')
    ->model('kimi-latest')
    ->maxTokens(500)
    ->temperature(0.7)
    ->chat([
        ['role' => 'system', 'content' => 'You are a helpful assistant.'],
        ['role' => 'user', 'content' => 'How do I create a Laravel migration?'],
    ]);

echo $response->content;
```

### Multilingual Usage

Moonshot excels at Chinese-English bilingual tasks:

```php
use Mindwave\Mindwave\Facades\LLM;

// Chinese language support
$response = LLM::driver('moonshot')
    ->chat([
        ['role' => 'system', 'content' => 'You are a helpful bilingual assistant.'],
        ['role' => 'user', 'content' => 'Translate this to Chinese: Laravel is a PHP framework'],
    ]);
```

## Streaming Responses

Since Moonshot uses the OpenAI driver, streaming works identically to OpenAI:

```php
use Mindwave\Mindwave\Facades\LLM;
use Mindwave\Mindwave\LLM\Streaming\StreamedTextResponse;

Route::get('/api/chat', function (Request $request) {
    $stream = LLM::driver('moonshot')
        ->model('kimi-latest')
        ->streamText($request->input('prompt'));

    $response = new StreamedTextResponse($stream);

    return $response->toStreamedResponse();
});
```

## Best Practices

### When to Use Moonshot

**Choose Moonshot when:**

-   Your application targets Chinese-speaking users
-   You need strong bilingual (Chinese/English) capabilities
-   You want an OpenAI alternative with Asian market focus

**Consider other providers when:**

-   You need primarily English-language capabilities (OpenAI, Anthropic)
-   You need the fastest inference (Groq)
-   You need the largest context windows (Gemini 1.5 Pro)

## Troubleshooting

### 401 Unauthorized

**Solutions:**

1. Verify your API key at [platform.moonshot.cn](https://platform.moonshot.cn)
2. Check `.env`:
   ```dotenv
   MOONSHOT_API_KEY=your-actual-key
   ```
3. Clear config cache: `php artisan config:clear`

### Connection Timeouts

Moonshot's servers are primarily hosted in Asia. If you experience high latency from other regions, consider:

-   Increasing HTTP timeout values
-   Using a CDN or proxy closer to Moonshot's servers
-   Using a different provider for latency-sensitive applications

## Summary

Moonshot provides access to Kimi models through an OpenAI-compatible API:

-   **Kimi Latest** - Strong multilingual model with 128K context
-   **OpenAI-compatible** - Same API, same code, different model
-   **Bilingual strength** - Excellent for Chinese-English applications

**Next Steps:**

-   Explore [Streaming Responses](/docs/core/streaming) for real-time UIs
-   Learn about [Tracing](/docs/observability/tracing) for cost monitoring
-   Compare with [OpenAI](/docs/providers/openai) for feature differences

**Resources:**

-   [Moonshot Platform](https://platform.moonshot.cn)
-   [Moonshot API Documentation](https://platform.moonshot.cn/docs)
