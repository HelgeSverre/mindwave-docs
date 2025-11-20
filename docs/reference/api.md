# API Reference

Complete API reference for Mindwave's core classes, methods, and interfaces.

## Overview

This reference covers Mindwave's public API, including facades, core classes, and interfaces. For configuration details, see the [Configuration Reference](/docs/reference/configuration.md).

## Facades

### Mindwave Facade

The main entry point for Mindwave operations.

**Namespace:** `Mindwave\Mindwave\Facades\Mindwave`

#### llm()

Get an LLM driver instance.

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Get default LLM driver
$llm = Mindwave::llm();

// Get specific driver
$llm = Mindwave::llm('openai');
$llm = Mindwave::llm('anthropic');
$llm = Mindwave::llm('mistral');

// Make a simple LLM call
$response = Mindwave::llm()->generateText('What is Laravel?');
```

**Parameters:**

-   `string|null $driver` - Driver name (null for default)

**Returns:** `LlmDriver` instance

#### prompt()

Create a new PromptComposer instance.

```php
// Create prompt composer
$response = Mindwave::prompt()
    ->section('system', 'You are helpful')
    ->section('user', 'Hello')
    ->run();
```

**Returns:** `PromptComposer` instance

See [Prompt Composer](/docs/core/prompt-composer) for full documentation.

#### brain()

Get a Brain (vector store) instance.

```php
// Get default brain
$brain = Mindwave::brain();

// Get named brain
$brain = Mindwave::brain('documentation');

// Store embeddings
$brain->remember('Laravel is a PHP framework', ['id' => 1]);

// Search
$results = $brain->recall('PHP framework', limit: 5);
```

**Parameters:**

-   `string|null $name` - Brain name (null for default)

**Returns:** `Brain` instance

See [Brain](/docs/rag/brain) for full documentation.

#### stream()

Create a streaming response.

```php
// Simple streaming
Mindwave::stream('Tell me about Laravel')
    ->respond();

// With model override
Mindwave::stream('Tell me about Laravel')
    ->model('gpt-4-turbo')
    ->respond();
```

**Parameters:**

-   `string $prompt` - Text prompt

**Returns:** `StreamedTextResponse` instance

See [Streaming](/docs/core/streaming) for full documentation.

---

## LLM Drivers

### LlmDriver Interface

**Namespace:** `Mindwave\Mindwave\LLM\Contracts\LlmDriver`

All LLM drivers implement this interface.

#### chat()

Make a chat completion request.

```php
$response = Mindwave::llm()->chat([
    ['role' => 'system', 'content' => 'You are helpful'],
    ['role' => 'user', 'content' => 'Hello'],
]);

echo $response->choices[0]->message->content;
```

**Parameters:**

-   `array $messages` - Array of messages with role and content
-   `array $options` - Optional parameters (model, temperature, etc.)

**Returns:** Provider-specific response object

#### generateText()

Generate text from a simple prompt.

```php
$response = Mindwave::llm()->generateText('What is Laravel?');
echo $response->choices[0]->message->content;
```

**Parameters:**

-   `string $prompt` - Text prompt
-   `array $options` - Optional parameters

**Returns:** Provider-specific response object

#### stream()

Stream a text completion.

```php
$stream = Mindwave::llm()->stream('Tell me a story');

foreach ($stream as $delta) {
    echo $delta;
}
```

**Parameters:**

-   `string $prompt` - Text prompt
-   `array $options` - Optional parameters

**Returns:** `Generator` yielding text chunks

#### streamText()

Alias for `stream()`.

**Parameters:**

-   `string $prompt` - Text prompt
-   `array $options` - Optional parameters

**Returns:** `Generator` yielding text chunks

#### setOptions()

Set default options for this driver instance.

```php
$llm = Mindwave::llm()
    ->setOptions([
        'model' => 'gpt-4-turbo',
        'temperature' => 0.7,
        'max_tokens' => 2000,
    ]);
```

**Parameters:**

-   `array $options` - Options to set

**Returns:** `self`

---

## PromptComposer

**Namespace:** `Mindwave\Mindwave\PromptComposer\PromptComposer`

Token-aware prompt assembly with automatic fitting.

### Methods

#### section()

Add a section to the prompt.

```php
$composer->section(
    name: 'system',
    content: 'You are helpful',
    priority: 100,
    shrinker: null,
    metadata: []
);
```

**Parameters:**

-   `string $name` - Section identifier
-   `string|array $content` - Section content
-   `int $priority` - Priority (0-100, default: 50)
-   `string|null $shrinker` - Shrinker strategy (null, 'truncate', 'compress')
-   `array $metadata` - Additional metadata

**Returns:** `self`

#### context()

Add a context section (convenience method).

```php
// Plain text
$composer->context('Some context information');

// With ContextSource
$composer->context($source, priority: 60, query: 'search term', limit: 5);

// With ContextPipeline
$composer->context($pipeline, priority: 60, limit: 10);
```

**Parameters:**

-   `string|array|ContextSource|ContextPipeline $content` - Context content
-   `int $priority` - Priority (default: 50)
-   `string|null $query` - Search query (for sources)
-   `int $limit` - Result limit (for sources)

**Returns:** `self`

#### model()

Set the model for token counting.

```php
$composer->model('gpt-4-turbo');
```

**Parameters:**

-   `string $model` - Model identifier

**Returns:** `self`

#### reserveOutputTokens()

Reserve tokens for the model's response.

```php
$composer->reserveOutputTokens(1000);
```

**Parameters:**

-   `int $tokens` - Number of tokens to reserve

**Returns:** `self`

#### fit()

Apply auto-fit algorithm to stay within token budget.

```php
$composer->fit();
```

**Returns:** `self`

#### toMessages()

Convert to messages array format.

```php
$messages = $composer->toMessages();
```

**Returns:** `array`

#### toText()

Convert to plain text format.

```php
$text = $composer->toText();
```

**Returns:** `string`

#### run()

Execute the prompt with the configured LLM.

```php
$response = $composer->run(['temperature' => 0.7]);
```

**Parameters:**

-   `array $options` - Optional LLM parameters

**Returns:** LLM response object

#### getTokenCount()

Get current total token count.

```php
$tokens = $composer->getTokenCount();
```

**Returns:** `int`

#### getAvailableTokens()

Get available token budget.

```php
$available = $composer->getAvailableTokens();
```

**Returns:** `int`

#### isFitted()

Check if prompt has been fitted.

```php
if (!$composer->isFitted()) {
    $composer->fit();
}
```

**Returns:** `bool`

#### getSections()

Get all sections.

```php
$sections = $composer->getSections();
```

**Returns:** `array<Section>`

#### registerShrinker()

Register a custom shrinker.

```php
$composer->registerShrinker('custom', new CustomShrinker());
```

**Parameters:**

-   `string $name` - Shrinker name
-   `ShrinkerInterface $shrinker` - Shrinker instance

**Returns:** `self`

---

## Context Discovery

### ContextSource Interface

**Namespace:** `Mindwave\Mindwave\Context\Contracts\ContextSource`

All context sources implement this interface.

#### search()

Search the source and return ranked results.

```php
$results = $source->search('Laravel', limit: 5);
```

**Parameters:**

-   `string $query` - Search query
-   `int $limit` - Maximum results (default: 5)

**Returns:** `ContextCollection`

#### getName()

Get the source name.

```php
$name = $source->getName();
```

**Returns:** `string`

#### initialize()

Initialize the source (create indexes, etc.).

```php
$source->initialize();
```

**Returns:** `void`

#### cleanup()

Clean up resources (delete indexes, close connections).

```php
$source->cleanup();
```

**Returns:** `void`

### ContextCollection

**Namespace:** `Mindwave\Mindwave\Context\ContextCollection`

Collection of context items with token management.

#### formatForPrompt()

Format collection for prompt inclusion.

```php
// Numbered format (default)
$text = $collection->formatForPrompt('numbered');

// Markdown format
$text = $collection->formatForPrompt('markdown');

// JSON format
$text = $collection->formatForPrompt('json');
```

**Parameters:**

-   `string $format` - Format type ('numbered', 'markdown', 'json')

**Returns:** `string`

#### deduplicate()

Remove duplicate items.

```php
$deduplicated = $collection->deduplicate();
```

**Returns:** `self`

#### rerank()

Re-rank by relevance score.

```php
$reranked = $collection->rerank();
```

**Returns:** `self`

#### truncateToTokens()

Truncate to fit within token budget.

```php
$truncated = $collection->truncateToTokens(1000, 'gpt-4');
```

**Parameters:**

-   `int $maxTokens` - Token budget
-   `string $model` - Model for token counting

**Returns:** `self`

#### getTotalTokens()

Get total token count.

```php
$tokens = $collection->getTotalTokens('gpt-4');
```

**Parameters:**

-   `string $model` - Model for token counting

**Returns:** `int`

### ContextItem

**Namespace:** `Mindwave\Mindwave\Context\ContextItem`

Individual context item (readonly).

#### Properties

```php
readonly class ContextItem
{
    public string $content;   // Item content
    public float $score;      // Relevance score (0.0-1.0)
    public string $source;    // Source name
    public array $metadata;   // Additional metadata
}
```

#### make()

Create a new ContextItem.

```php
$item = ContextItem::make(
    content: 'Laravel is a framework',
    score: 0.95,
    source: 'docs',
    metadata: ['id' => 1]
);
```

**Parameters:**

-   `string $content` - Item content
-   `float $score` - Relevance score
-   `string $source` - Source name
-   `array $metadata` - Additional data

**Returns:** `ContextItem`

---

## Observability

### Trace Model

**Namespace:** `Mindwave\Mindwave\Observability\Models\Trace`

Eloquent model for trace records.

#### Attributes

-   `string $trace_id` - Unique trace identifier
-   `int $total_input_tokens` - Total input tokens across spans
-   `int $total_output_tokens` - Total output tokens across spans
-   `float $estimated_cost` - Total estimated cost in USD
-   `int $span_count` - Number of spans in trace
-   `string $status` - Trace status ('ok', 'error')
-   `Carbon $start_time` - Trace start time
-   `Carbon $end_time` - Trace end time
-   `int $duration` - Duration in nanoseconds

#### Relationships

```php
// Get spans for this trace
$trace->spans;
```

#### Methods

```php
// Get duration in milliseconds
$ms = $trace->getDurationInMilliseconds();

// Get duration in seconds
$seconds = $trace->getDurationInSeconds();
```

### Span Model

**Namespace:** `Mindwave\Mindwave\Observability\Models\Span`

Eloquent model for span records.

#### Attributes

-   `string $span_id` - Unique span identifier
-   `string $trace_id` - Parent trace ID
-   `string $name` - Span name
-   `string $operation_name` - Operation type ('chat', 'embeddings', etc.)
-   `string $provider_name` - LLM provider ('openai', 'anthropic', etc.)
-   `string $request_model` - Model used
-   `int $input_tokens` - Input token count
-   `int $output_tokens` - Output token count
-   `string $status_code` - Status ('ok', 'error')
-   `int $duration` - Duration in nanoseconds

#### Scopes

```php
// Find spans by operation
Span::operation('chat')->get();

// Find spans by provider
Span::provider('openai')->get();

// Find spans by model
Span::model('gpt-4')->get();

// Find slow spans (>5000ms by default)
Span::slow()->get();
Span::slow(10000)->get(); // Custom threshold

// Find spans with errors
Span::withErrors()->get();
```

---

## Related Documentation

-   [Configuration Reference](/docs/reference/configuration.md) - Full configuration options
-   [Vector Stores Reference](/docs/reference/vector-stores.md) - Vector store implementations
-   [Embeddings Reference](/docs/reference/embeddings.md) - Embedding providers
-   [Core Documentation](/docs/installation) - Getting started guide

For detailed usage examples, see:

-   [Prompt Composer](/docs/core/prompt-composer) - Token-aware prompt building
-   [Context Discovery](/docs/core/context-discovery) - Context aggregation
-   [Streaming](/docs/core/streaming) - Real-time responses
-   [Tracing](/docs/observability/tracing) - Observability and monitoring
