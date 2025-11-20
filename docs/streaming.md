# Streaming

Real-time Server-Sent Events (SSE) streaming for responsive AI interactions.

## Overview

This page provides a quick introduction. For complete documentation, see [Core Streaming](/docs/core/streaming).

## What is Streaming?

Streaming allows you to:

- **Display responses in real-time** - Show tokens as they're generated
- **Improve perceived performance** - Users see output immediately
- **Build responsive UIs** - ChatGPT-like experiences in Laravel
- **Work with any LLM** - OpenAI, Anthropic, Mistral all support streaming

## Quick Example

```php
use Mindwave\Mindwave\Facades\Mindwave;

Route::get('/stream', function () {
    return Mindwave::stream('Explain Laravel in simple terms')
        ->model('gpt-4-turbo')
        ->respond();
});
```

Frontend (JavaScript):

```javascript
const eventSource = new EventSource('/stream');

eventSource.onmessage = (event) => {
    if (event.data === '[DONE]') {
        eventSource.close();
        return;
    }

    // Append token to display
    document.getElementById('output').textContent += event.data;
};
```

That's it! Three lines on backend, a few on frontend.

## Features

### Auto-Configure Headers

Mindwave automatically sets correct SSE headers:

```php
Content-Type: text/event-stream
Cache-Control: no-cache
X-Accel-Buffering: no
```

### Streaming with Options

```php
return Mindwave::stream('Tell me about Laravel')
    ->model('gpt-4-turbo')
    ->temperature(0.7)
    ->maxTokens(500)
    ->respond();
```

### Custom System Prompts

```php
return Mindwave::stream()
    ->systemPrompt('You are a Laravel expert')
    ->userPrompt('Explain middleware')
    ->model('gpt-4-turbo')
    ->respond();
```

### Low-Level Streaming

For more control, use the LLM driver directly:

```php
Route::get('/stream', function () {
    return response()->stream(function () {
        $stream = Mindwave::llm()->stream('Tell me about Laravel', [
            'model' => 'gpt-4-turbo',
            'temperature' => 0.7,
        ]);

        foreach ($stream as $delta) {
            echo "data: " . json_encode(['text' => $delta]) . "\n\n";
            ob_flush();
            flush();
        }

        echo "data: [DONE]\n\n";
    }, 200, [
        'Content-Type' => 'text/event-stream',
        'Cache-Control' => 'no-cache',
        'X-Accel-Buffering' => 'no',
    ]);
});
```

## Frontend Integration

### Vanilla JavaScript

```javascript
const eventSource = new EventSource('/stream');

eventSource.onmessage = (event) => {
    if (event.data === '[DONE]') {
        eventSource.close();
        console.log('Stream complete');
        return;
    }

    document.getElementById('output').textContent += event.data;
};

eventSource.onerror = (error) => {
    console.error('Stream error:', error);
    eventSource.close();
};
```

### Vue.js

```vue
<template>
    <div>
        <button @click="startStream">Ask Question</button>
        <div>{{ response }}</div>
    </div>
</template>

<script setup>
import { ref } from 'vue';

const response = ref('');

const startStream = () => {
    response.value = '';

    const eventSource = new EventSource('/stream');

    eventSource.onmessage = (event) => {
        if (event.data === '[DONE]') {
            eventSource.close();
            return;
        }

        response.value += event.data;
    };
};
</script>
```

### React

```jsx
import { useState } from 'react';

function StreamingChat() {
    const [response, setResponse] = useState('');

    const startStream = () => {
        setResponse('');

        const eventSource = new EventSource('/stream');

        eventSource.onmessage = (event) => {
            if (event.data === '[DONE]') {
                eventSource.close();
                return;
            }

            setResponse(prev => prev + event.data);
        };
    };

    return (
        <div>
            <button onClick={startStream}>Ask Question</button>
            <div>{response}</div>
        </div>
    );
}
```

### Livewire

```php
class Chat extends Component
{
    public string $response = '';

    public function stream()
    {
        $this->response = '';

        return Mindwave::stream($this->question)
            ->model('gpt-4-turbo')
            ->respond();
    }
}
```

```blade
<div>
    <button wire:click="stream">Ask</button>
    <div id="response">{{ $response }}</div>
</div>

<script>
wire.on('stream', () => {
    const eventSource = new EventSource('/livewire/stream');

    eventSource.onmessage = (event) => {
        if (event.data === '[DONE]') {
            eventSource.close();
            return;
        }

        document.getElementById('response').textContent += event.data;
    };
});
</script>
```

## Common Patterns

### Pattern 1: Chat Interface

```php
Route::post('/chat/stream', function (Request $request) {
    $messages = $request->input('messages');

    return response()->stream(function () use ($messages) {
        $stream = Mindwave::llm()->chat($messages, [
            'model' => 'gpt-4-turbo',
            'stream' => true,
        ]);

        foreach ($stream as $delta) {
            echo "data: {$delta}\n\n";
            ob_flush();
            flush();
        }

        echo "data: [DONE]\n\n";
    }, 200, [
        'Content-Type' => 'text/event-stream',
        'Cache-Control' => 'no-cache',
    ]);
});
```

### Pattern 2: Long-Form Content

```php
Route::get('/generate/{topic}', function (string $topic) {
    return Mindwave::stream()
        ->systemPrompt('You are a technical writer')
        ->userPrompt("Write a comprehensive guide about {$topic}")
        ->model('gpt-4-turbo')
        ->maxTokens(2000)
        ->respond();
});
```

### Pattern 3: Streaming with Context

```php
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;

Route::post('/support/stream', function (Request $request) {
    $source = TntSearchSource::fromEloquent(
        Article::where('category', 'support'),
        fn($a) => $a->content
    );

    $context = $source->search($request->input('question'), limit: 3);

    $prompt = "Context:\n" . $context->formatForPrompt() . "\n\n"
            . "Question: " . $request->input('question');

    return Mindwave::stream($prompt)
        ->model('gpt-4-turbo')
        ->respond();
});
```

## Observability

Streaming responses are automatically traced:

```php
use Mindwave\Mindwave\Observability\Models\Span;

// Find streaming operations
$streamingSpans = Span::where('operation_name', 'text_completion')
    ->where('streaming', true)
    ->get();

foreach ($streamingSpans as $span) {
    echo "Duration: {$span->getDurationInMilliseconds()}ms\n";
    echo "Tokens: {$span->output_tokens}\n";
}
```

## Best Practices

### 1. Set Reasonable Token Limits

```php
->maxTokens(500)  // Short responses
->maxTokens(1000) // Medium responses
->maxTokens(2000) // Long responses
```

### 2. Handle Errors Gracefully

```php
eventSource.onerror = (error) => {
    console.error('Stream error:', error);
    eventSource.close();

    // Show error to user
    alert('Connection lost. Please try again.');
};
```

### 3. Close Streams Properly

Always close the EventSource when done:

```javascript
if (event.data === '[DONE]') {
    eventSource.close();
}
```

### 4. Use Buffering for Better UX

```javascript
let buffer = '';
let bufferTimer;

eventSource.onmessage = (event) => {
    buffer += event.data;

    clearTimeout(bufferTimer);
    bufferTimer = setTimeout(() => {
        document.getElementById('output').textContent = buffer;
    }, 50);  // Update UI every 50ms
};
```

## Complete Documentation

For detailed information including:
- Advanced streaming patterns
- Error handling
- Performance optimization
- Testing strategies
- Production deployment

See the **[Core Streaming Documentation](/docs/core/streaming)**.

## Related Documentation

- [Prompt Composer](/docs/core/prompt-composer) - Build streaming prompts
- [Context Discovery](/docs/core/context-discovery) - Stream with context
- [OpenTelemetry Tracing](/docs/observability/tracing) - Monitor streaming performance
