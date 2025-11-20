# Prompt Composer

Build token-aware prompts that automatically fit within model context windows.

## Overview

This page provides a quick introduction. For complete documentation, see [Core Prompt Composer](/docs/core/prompt-composer).

## What is Prompt Composer?

PromptComposer is Mindwave's intelligent prompt assembly system that:

- **Manages token budgets** - Stays within model context limits automatically
- **Prioritizes content** - Preserves critical sections, shrinks low-priority content
- **Handles multiple sections** - System prompts, context, examples, user queries
- **Supports multiple models** - Works with GPT-4 (8K), Claude (200K), and more

## Quick Example

```php
use Mindwave\Mindwave\Facades\Mindwave;

// This prompt might exceed 8K tokens
$response = Mindwave::prompt()
    ->model('gpt-4')
    ->reserveOutputTokens(500)

    // Critical sections - never shrink
    ->section('system', 'You are a Laravel expert', priority: 100)
    ->section('user', 'Explain routing', priority: 100)

    // Can be shrunk if needed
    ->section('context', $largeDocumentation, priority: 50, shrinker: 'truncate')

    ->fit()  // Automatically fits to 8K - 500 = 7.5K tokens
    ->run();
```

If the documentation exceeds available space, it's automatically truncated while preserving system and user sections.

## Key Features

### Auto-Fit Algorithm

The auto-fit algorithm intelligently manages token budgets:

1. Calculates total tokens across all sections
2. Compares against model's context window minus reserved output tokens
3. If over budget:
   - Preserves high-priority, non-shrinkable sections
   - Distributes remaining budget among shrinkable sections
   - Applies shrinkers to reduce content
4. Throws exception if non-shrinkable sections exceed budget

### Priority System

Use priorities (0-100) to control what gets preserved:

```php
Mindwave::prompt()
    ->section('system', '...', priority: 100)      // Critical - never remove
    ->section('examples', '...', priority: 70, shrinker: 'truncate')
    ->section('context', '...', priority: 50, shrinker: 'truncate')
    ->section('metadata', '...', priority: 20, shrinker: 'truncate')
    ->section('user', '...', priority: 100)        // Critical - never remove
    ->run();
```

### Built-in Shrinkers

**Truncate Shrinker** - Removes content from the end:

```php
->section('docs', $longText, shrinker: 'truncate')
```

**Compress Shrinker** - Removes formatting first, then truncates:

```php
->section('markdown', $formattedText, shrinker: 'compress')
```

## Common Patterns

### Pattern 1: RAG with Context Discovery

```php
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;

$source = TntSearchSource::fromEloquent(
    Documentation::all(),
    fn($doc) => $doc->content
);

Mindwave::prompt()
    ->section('system', 'You are a helpful assistant', priority: 100)
    ->context($source, priority: 60)  // Auto-searches and injects context
    ->section('user', 'How do I deploy to production?', priority: 100)
    ->run();
```

### Pattern 2: Multi-Model Support

```php
function buildPrompt(string $content, string $model): mixed
{
    $composer = Mindwave::prompt()->model($model);

    // Adjust strategy based on context window
    $contextWindow = $composer->getAvailableTokens();

    if ($contextWindow > 100_000) {
        // Large context (Claude) - include everything
        $composer->section('context', $allDocs, priority: 50, shrinker: 'truncate');
    } else {
        // Small context (GPT-4) - be selective
        $composer->section('context', $essentialDocs, priority: 50, shrinker: 'compress');
    }

    return $composer
        ->section('user', $content, priority: 100)
        ->run();
}
```

### Pattern 3: Dynamic Content Assembly

```php
function buildSupportPrompt(string $query, User $user): mixed
{
    $composer = Mindwave::prompt()
        ->section('system', 'You are a support agent', priority: 100);

    // Add order history if exists
    if ($user->orders->isNotEmpty()) {
        $orders = $user->orders->map(fn($o) =>
            "Order #{$o->id}: {$o->product} - {$o->status}"
        )->join("\n");

        $composer->section('orders', $orders, priority: 70, shrinker: 'truncate');
    }

    // Add chat history
    if ($user->recentChats->isNotEmpty()) {
        $composer->section('history', $chatHistory, priority: 50, shrinker: 'truncate');
    }

    return $composer
        ->section('user', $query, priority: 100)
        ->run();
}
```

## Token Management

### Check Token Counts

```php
$composer = Mindwave::prompt()
    ->model('gpt-4')
    ->section('system', 'You are helpful')
    ->section('user', 'Hello');

// Current tokens
echo $composer->getTokenCount();  // e.g., 15

// Available budget
echo $composer->getAvailableTokens();  // e.g., 8192 - 1000 = 7192

// Check if fitted
if (!$composer->isFitted()) {
    $composer->fit();
}
```

### Reserve Output Tokens

Always reserve tokens for the model's response:

```php
->reserveOutputTokens(500)   // Short answer
->reserveOutputTokens(2000)  // Detailed response
->reserveOutputTokens(4000)  // Long-form content
```

## Model Support

PromptComposer knows context windows for all major models:

| Model | Context Window | Use Case |
|-------|----------------|----------|
| GPT-4 | 8K | Standard applications |
| GPT-4 Turbo | 128K | Long documents |
| Claude 3.5 Sonnet | 200K | Massive context |
| Claude 3.5 Haiku | 200K | Fast with large context |
| Gemini 1.5 Pro | 2M | Maximum context |

```php
// Automatically uses correct context window
Mindwave::prompt()
    ->model('claude-3-5-sonnet-20241022')  // 200K window
    ->section('docs', $hugeDocument, priority: 50, shrinker: 'truncate')
    ->run();
```

## Output Formats

### Messages Array (for chat models)

```php
$messages = Mindwave::prompt()
    ->section('system', 'You are helpful')
    ->section('user', 'Hello')
    ->toMessages();

// [
//     ['role' => 'system', 'content' => 'You are helpful'],
//     ['role' => 'user', 'content' => 'Hello']
// ]
```

### Plain Text (for completion models)

```php
$text = Mindwave::prompt()
    ->section('intro', 'Introduction')
    ->section('body', 'Body content')
    ->toText();

// "Introduction\n\nBody content"
```

### Direct Execution

```php
$response = Mindwave::prompt()
    ->section('system', 'You are helpful')
    ->section('user', 'What is Laravel?')
    ->run();  // Executes with configured LLM
```

## Complete Documentation

For detailed information including:
- Custom shrinker creation
- Advanced token management
- Integration patterns
- Performance optimization
- Best practices
- Troubleshooting

See the **[Core Prompt Composer Documentation](/docs/core/prompt-composer)**.

## Related Documentation

- [Context Discovery](/docs/core/context-discovery) - Context aggregation
- [Streaming](/docs/core/streaming) - Real-time responses
- [Configuration](/docs/configuration.md) - Model configuration
