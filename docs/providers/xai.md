# XAI (Grok) Provider

## Overview

XAI is the AI company behind Grok, a family of large language models known for their conversational abilities and real-time knowledge. Since XAI's API is OpenAI-compatible, Mindwave reuses its OpenAI driver with a custom base URI, giving you access to all OpenAI driver features with Grok models.

### Why Use XAI with Mindwave?

-   **Strong conversational models** - Grok excels at natural, engaging conversations
-   **OpenAI-compatible API** - Drop-in replacement using the same interface
-   **Competitive pricing** - Cost-effective alternative for chat applications
-   **Streaming support** - Full SSE streaming through the OpenAI driver
-   **All OpenAI features** - Function calling, JSON mode, and more

### Key Capabilities

-   ✅ Chat completions with multi-turn conversations
-   ✅ Streaming responses with SSE
-   ✅ Function/tool calling
-   ✅ JSON mode for structured outputs
-   ✅ Automatic tracing and cost tracking
-   ✅ All OpenAI driver features

## Setup & Configuration

### Getting Your API Key

1. Visit [console.x.ai](https://console.x.ai)
2. Create an account or sign in
3. Navigate to **API Keys**
4. Generate a new API key
5. Copy your key

### Environment Variables

Add these to your `.env` file:

```dotenv
# Required: Your XAI API key
XAI_API_KEY=your-xai-api-key-here

# Optional: Default model
MINDWAVE_XAI_MODEL=grok-3-mini

# Optional: Generation parameters
MINDWAVE_XAI_MAX_TOKENS=1000
MINDWAVE_XAI_TEMPERATURE=0.4

# Set XAI as default provider
MINDWAVE_LLM=xai
```

### Configuration File

The XAI configuration is defined in `config/mindwave-llm.php`:

```php
return [
    'default' => env('MINDWAVE_LLM', 'openai'),

    'llms' => [
        'xai' => [
            'api_key' => env('XAI_API_KEY'),
            'model' => env('MINDWAVE_XAI_MODEL', 'grok-3-mini'),
            'max_tokens' => env('MINDWAVE_XAI_MAX_TOKENS', 1000),
            'temperature' => env('MINDWAVE_XAI_TEMPERATURE', 0.4),
        ],
    ],
];
```

### How It Works

XAI uses the OpenAI-compatible API format, so Mindwave creates an OpenAI driver instance with XAI's base URI:

```php
// Internally, Mindwave does this:
$client = OpenAI::factory()
    ->withApiKey(config('mindwave-llm.llms.xai.api_key'))
    ->withBaseUri('https://api.x.ai/v1')
    ->make();
```

This means all OpenAI driver features work seamlessly with XAI.

### Testing Your Connection

```php
use Mindwave\Mindwave\Facades\LLM;

$response = LLM::driver('xai')->generateText('Say hello!');

if ($response) {
    echo "XAI connection successful!";
    echo "Response: " . $response;
} else {
    echo "Connection failed - check your API key";
}
```

## Available Models

### Grok 3 Mini (Default - Recommended)

A fast, cost-effective model suitable for most tasks.

| Model ID       | Context Window | Best For                          |
| -------------- | -------------- | --------------------------------- |
| `grok-3-mini`  | 131,072 tokens | General chat, fast responses      |

### Grok 3

The full-size Grok model for complex tasks.

| Model ID  | Context Window | Best For                            |
| --------- | -------------- | ----------------------------------- |
| `grok-3`  | 131,072 tokens | Complex reasoning, detailed outputs |

::: tip Check Available Models
XAI regularly updates their model lineup. Check [docs.x.ai](https://docs.x.ai) for the latest available models and pricing.
:::

## Basic Usage

### Simple Text Generation

```php
use Mindwave\Mindwave\Facades\LLM;

$response = LLM::driver('xai')
    ->generateText('Explain Laravel in one sentence.');

echo $response;
```

### Chat Completion

```php
use Mindwave\Mindwave\Facades\LLM;

$response = LLM::driver('xai')
    ->model('grok-3-mini')
    ->maxTokens(500)
    ->temperature(0.7)
    ->chat([
        ['role' => 'system', 'content' => 'You are a helpful Laravel expert.'],
        ['role' => 'user', 'content' => 'How do I create a migration?'],
    ]);

echo $response->content;
```

## Streaming Responses

Since XAI uses the OpenAI driver, streaming works identically to OpenAI:

```php
use Mindwave\Mindwave\Facades\LLM;
use Mindwave\Mindwave\LLM\Streaming\StreamedTextResponse;

Route::get('/api/chat', function (Request $request) {
    $stream = LLM::driver('xai')
        ->model('grok-3-mini')
        ->streamText($request->input('prompt'));

    $response = new StreamedTextResponse($stream);

    return $response->toStreamedResponse();
});
```

### Text Streaming

```php
foreach (LLM::driver('xai')->streamText('Write a story') as $chunk) {
    echo $chunk;
}
```

## Best Practices

### When to Use XAI

**Choose XAI when:**

-   You want Grok's conversational style
-   You need a solid alternative to OpenAI
-   Cost-effective chat applications

**Consider other providers when:**

-   You need the absolute best reasoning (use OpenAI GPT-4o or Anthropic Claude)
-   You need very large context windows (Gemini 1.5 Pro offers 2M tokens)
-   You need function calling with complex tools (OpenAI has the most mature support)

## Troubleshooting

### 401 Unauthorized

**Solutions:**

1. Verify your API key at [console.x.ai](https://console.x.ai)
2. Check `.env`:
   ```dotenv
   XAI_API_KEY=your-actual-key
   ```
3. Clear config cache: `php artisan config:clear`

### Model Not Available

Some Grok models may require specific account tiers. Check your account access at [console.x.ai](https://console.x.ai).

## Summary

XAI provides access to Grok models through an OpenAI-compatible API:

-   **Grok 3 Mini** - Fast and cost-effective for most tasks
-   **Grok 3** - Full-size model for complex reasoning
-   **OpenAI-compatible** - Same API, same code, different model

**Next Steps:**

-   Explore [Streaming Responses](/docs/core/streaming) for real-time UIs
-   Learn about [Tracing](/docs/observability/tracing) for cost monitoring
-   Compare with [OpenAI](/docs/providers/openai) for feature differences

**Resources:**

-   [XAI Console](https://console.x.ai)
-   [XAI Documentation](https://docs.x.ai)
-   [XAI API Reference](https://docs.x.ai/api)
