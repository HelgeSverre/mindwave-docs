# Quick Start

Get up and running with Mindwave in minutes. This guide covers installation and your first LLM call.

## Installation

Install via Composer:

```bash
composer require mindwave/mindwave
```

Publish configuration files:

```bash
php artisan vendor:publish --tag="mindwave-config"
```

Run migrations for tracing:

```bash
php artisan migrate
```

## Configuration

Add your API key to `.env`:

```bash
# OpenAI (recommended)
MINDWAVE_OPENAI_API_KEY=sk-proj-your-key-here
MINDWAVE_OPENAI_MODEL=gpt-4-turbo

# OR Anthropic Claude
MINDWAVE_ANTHROPIC_API_KEY=sk-ant-your-key-here
MINDWAVE_ANTHROPIC_MODEL=claude-sonnet-4-5-20250929

# OR Mistral AI
MINDWAVE_MISTRAL_API_KEY=your-key-here
MINDWAVE_MISTRAL_MODEL=mistral-large-latest
```

## Your First LLM Call

```php
use Mindwave\Mindwave\Facades\Mindwave;

$response = Mindwave::llm()->generateText('What is Laravel?');
echo $response->choices[0]->message->content;
```

That's it! You just made your first LLM call with automatic tracing.

## Next Steps

### Core Features

Explore Mindwave's main capabilities:

**[Prompt Composer](/docs/core/prompt-composer)** - Auto-fit long prompts with smart section management

```php
Mindwave::prompt()
    ->section('system', 'You are a Laravel expert')
    ->section('context', $longDocumentation, priority: 50, shrinker: 'truncate')
    ->section('user', 'Explain routing')
    ->fit()  // Automatically fits to model's context window
    ->run();
```

**[Streaming Responses](/docs/core/streaming)** - Real-time SSE streaming in 3 lines

```php
return Mindwave::stream('Explain Laravel')
    ->model('gpt-4-turbo')
    ->respond();
```

**[Context Discovery](/docs/core/context-discovery)** - Ad-hoc full-text search over your data

```php
$source = TntSearchSource::fromEloquent(
    User::where('active', true),
    fn($u) => "Name: {$u->name}, Skills: {$u->skills}"
);

Mindwave::prompt()
    ->context($source, query: 'Laravel expert')
    ->section('user', 'Who should I assign to the new project?')
    ->run();
```

**[OpenTelemetry Tracing](/docs/observability/tracing)** - Cost tracking and performance monitoring

```php
use Mindwave\Mindwave\Observability\Models\Trace;

// Find expensive traces
$expensive = Trace::where('estimated_cost', '>', 0.10)
    ->with('spans')
    ->orderByDesc('estimated_cost')
    ->get();

foreach ($expensive as $trace) {
    echo "Cost: $" . $trace->estimated_cost;
    echo "Tokens: {$trace->total_input_tokens} + {$trace->total_output_tokens}";
}
```

### Common Use Cases

**Build a Chatbot** → Start with [Streaming Responses](/docs/core/streaming)

**RAG/Q&A System** → Start with [Context Discovery](/docs/core/context-discovery)

**Long-Form Content** → Start with [Prompt Composer](/docs/core/prompt-composer)

**Production Monitoring** → Start with [OpenTelemetry Tracing](/docs/observability/tracing)

### Complete Guides

-   **[Full Installation Guide](/docs/installation.md)** - Detailed setup, requirements, and configuration
-   **[Configuration Guide](/docs/configuration.md)** - All environment variables and options
-   **[API Reference](/docs/reference/api.md)** - Complete API documentation

## Examples

### Simple Chat

```php
use Mindwave\Mindwave\Facades\Mindwave;

$response = Mindwave::llm()->chat([
    ['role' => 'system', 'content' => 'You are a helpful Laravel expert.'],
    ['role' => 'user', 'content' => 'Explain middleware in one sentence.'],
]);

echo $response->choices[0]->message->content;
```

### Streaming Backend Route

```php
use Mindwave\Mindwave\Facades\Mindwave;

Route::get('/stream', function () {
    return Mindwave::stream('Explain Laravel in simple terms')
        ->model('gpt-4-turbo')
        ->respond();
});
```

### Auto-Fit Long Prompt

```php
use Mindwave\Mindwave\Facades\Mindwave;

Mindwave::prompt()
    ->model('gpt-4')
    ->reserveOutputTokens(500)
    ->section('system', 'You are a technical writer.', priority: 100)
    ->section('context', $longDocument, priority: 50, shrinker: 'summarize')
    ->section('user', 'Summarize the key points', priority: 100)
    ->fit()  // Automatically fits to 8K context window
    ->run();
```

### Cost Tracking

```php
use Mindwave\Mindwave\Observability\Models\Trace;
use Carbon\Carbon;

// Today's spending
$todayCost = Trace::whereDate('created_at', Carbon::today())
    ->sum('estimated_cost');

echo "Today's LLM spend: $" . number_format($todayCost, 4);

// Breakdown by provider
$breakdown = Span::whereDate('created_at', today())
    ->selectRaw('provider_name, SUM(input_tokens) as input, SUM(output_tokens) as output')
    ->groupBy('provider_name')
    ->get();

foreach ($breakdown as $row) {
    echo "{$row->provider_name}: {$row->input} in, {$row->output} out\n";
}
```

## Getting Help

-   **[GitHub Issues](https://github.com/helgesverre/mindwave/issues)** - Bug reports and feature requests
-   **[GitHub Discussions](https://github.com/helgesverre/mindwave/discussions)** - Questions and community support
-   **[Full Documentation](/docs/installation)** - Complete guides and tutorials
