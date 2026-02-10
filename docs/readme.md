# Mindwave: Production AI Utilities for Laravel

**The working developer's AI toolkit** - Long prompts, streaming, tracing, and context discovery made simple.

> **Version 1.0** - Production-ready with 500+ tests, all 4 pillars complete, and comprehensive documentation.

## What is Mindwave?

Mindwave is a Laravel package that provides **production-grade AI utilities** for building LLM-powered features. Unlike complex agent frameworks, Mindwave focuses on practical tools that Laravel developers actually need:

-   ✅ **Auto-fit long prompts** to any model's context window
-   ✅ **Stream LLM responses** with 3 lines of code (SSE/EventSource)
-   ✅ **OpenTelemetry tracing** with database storage for costs, tokens, and performance
-   ✅ **Ad-hoc context discovery** from your database/CSV using TNTSearch

## Why Mindwave?

**Not another agent framework.** Just batteries-included utilities for shipping AI features fast.

## Core Features

### 🧩 Prompt Composer

Automatically manage context windows with priority-based section trimming:

-   **Token budgeting** - Reserve tokens for output, auto-fit sections
-   **Smart shrinkers** - Summarize, truncate, or compress content
-   **Priority system** - Keep important sections, trim less critical ones
-   **Multi-model support** - Works with GPT-4, Claude, Mistral, etc.

[Learn more about Prompt Composer →](/docs/core/prompt-composer)

### 🌊 Streaming (SSE)

Production-ready Server-Sent Events streaming:

-   **3-line setup** - Backend and frontend
-   **Proper headers** - Works with Nginx/Apache out of the box
-   **Connection monitoring** - Handles client disconnects
-   **Error handling** - Graceful failure and retry

[Learn more about Streaming →](/docs/core/streaming)

### 📊 OpenTelemetry Tracing

Industry-standard observability with GenAI semantic conventions:

-   **Automatic tracing** - All LLM calls tracked (zero configuration)
-   **Database storage** - Query traces via Eloquent models
-   **OTLP export** - Send to Jaeger, Grafana, Datadog, Honeycomb, etc.
-   **Cost tracking** - Automatic cost estimation per call
-   **Token usage** - Input/output/total tokens tracked
-   **PII protection** - Configurable message capture and redaction

[Learn more about Tracing →](/docs/observability/tracing)

### 🔍 TNTSearch Context Discovery

Pull context from your application data without complex RAG setup:

-   **No infrastructure** - Pure PHP, no external services
-   **Multiple sources** - Eloquent, arrays, CSV files, VectorStores
-   **Fast indexing** - Ephemeral indexes with automatic cleanup
-   **BM25 ranking** - Industry-standard relevance scoring
-   **Auto-query extraction** - Automatically extracts search terms from user messages

[Learn more about Context Discovery →](/docs/core/context-discovery)

### 🧠 Brain & Vector Stores

Persistent knowledge management with semantic search:

-   **Multiple backends** - Pinecone, Qdrant, Weaviate, or local file storage
-   **Document loaders** - Built-in loaders for various formats (PDF, Word, CSV, etc.)
-   **Automatic chunking** - Documents split for optimal retrieval
-   **Semantic search** - Find information by meaning, not just keywords

[Learn more about the Brain →](/docs/rag/brain)

## Quick Start

### Installation

Install via Composer:

```bash
composer require mindwave/mindwave
```

Publish the config files:

```bash
php artisan vendor:publish --tag="mindwave-config"
```

Run migrations for tracing (optional but recommended):

```bash
php artisan migrate
```

### Basic LLM Chat

```php
use Mindwave\Mindwave\Facades\Mindwave;

$response = Mindwave::llm()->chat([
    ['role' => 'system', 'content' => 'You are a helpful assistant.'],
    ['role' => 'user', 'content' => 'Explain Laravel in one sentence.'],
]);

echo $response->content;
```

### Streaming Responses

**Backend:**

```php
Route::get('/chat', function (Request $request) {
    return Mindwave::stream($request->input('message'))
        ->model('gpt-4')
        ->respond();
});
```

**Frontend:**

```javascript
const stream = new EventSource('/chat?message=' + encodeURIComponent(question));
stream.onmessage = (e) => (output.textContent += e.data);
stream.addEventListener('done', () => stream.close());
```

### Auto-Fit Long Prompts

```php
Mindwave::prompt()
    ->reserveOutputTokens(500)
    ->section('system', 'You are an expert analyst', priority: 100)
    ->section('documentation', $longDocContent, priority: 50, shrinker: 'summarize')
    ->section('history', $conversationHistory, priority: 75)
    ->section('user', $userQuestion, priority: 100)
    ->fit()  // Trims to model's context window
    ->run();
```

## Documentation

-   📖 [Installation Guide](/docs/installation)
-   🔧 [Configuration](/docs/configuration)
-   🚀 [Quick Start Guide](/docs/quick-start)
-   📚 [Core Features](/docs/core/prompt-composer)
-   🍳 [Cookbook Examples](/docs/cookbook/support-bot)

## Supported Providers

### LLM Providers

-   ✅ **OpenAI** (GPT-4, GPT-3.5, etc.)
-   ✅ **Mistral AI** (Mistral Large, Small, etc.)
-   ✅ **Anthropic** (Claude 3.5 Sonnet, Opus, Haiku, etc.)
-   🔄 **Google Gemini** (Coming soon)

### Vector Stores

-   ✅ **Qdrant** - High-performance vector database
-   ✅ **Weaviate** - Open-source vector search engine
-   ✅ **Pinecone** - Managed vector database service
-   ✅ **In-Memory** - For testing and development
-   ✅ **File-based** - JSON file storage for simple use cases

## Use Cases

-   💬 **AI-Powered Customer Support** - Context-aware support bots
-   📄 **Document Q&A** - Search and answer questions from documents
-   🔍 **Data Analysis** - Analyze application data with AI
-   📝 **Content Generation** - Generate content with proper context
-   🤖 **Chatbots** - Build conversational AI applications

## Credits

-   [Helge Sverre](https://twitter.com/helgesverre) - Creator
-   [OpenAI PHP Client](https://github.com/openai-php/client) - OpenAI integration
-   [TeamTNT/TNTSearch](https://github.com/teamtnt/tntsearch) - Full-text search
-   [OpenTelemetry PHP](https://github.com/open-telemetry/opentelemetry-php) - Observability
-   [Tiktoken PHP](https://github.com/yethee/tiktoken-php) - Token counting

## License

The MIT License (MIT).
