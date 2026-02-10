# Changelog

All notable changes to Mindwave are documented in this file.

---

## v1.0.0 - December 2025

**Production-ready release** - Mindwave is now feature-complete with all 4 pillars implemented, 500+ tests passing, and comprehensive documentation.

### Highlights

- **4 Core Pillars Complete**: Prompt Composer, Streaming SSE, OpenTelemetry Tracing, and Context Discovery
- **500+ Tests**: Comprehensive test coverage across all components
- **Laravel 10/11 Support**: Full compatibility with modern Laravel versions
- **PHP 8.2/8.3/8.4 Support**: Works with all current PHP versions
- **3 LLM Providers**: OpenAI, Anthropic Claude, and Mistral AI with unified interface

---

### Pillar 1: Prompt Composer

**Auto-fit long prompts to model context windows**

```php
Mindwave::prompt()
    ->reserveOutputTokens(512)
    ->section('system', $instructions, priority: 100)
    ->section('context', $largeDoc, priority: 50, shrinker: 'summarize')
    ->section('user', $question, priority: 100)
    ->fit()
    ->run();
```

Features:

- **Tokenizer Service** - Accurate token counting using tiktoken-php
- **Section Management** - Priority-based sections with automatic ordering
- **Shrinkers** - Truncate and Compress shrinkers for intelligent content reduction
- **46+ Model Support** - GPT-4, GPT-5, Claude, Mistral, Gemini context windows
- **Facade Integration** - `Mindwave::prompt()` for fluent API

---

### Pillar 2: OpenTelemetry Tracing

**Industry-standard LLM observability**

```php
// All LLM calls are automatically traced
$response = Mindwave::llm()->generateText('Hello!');

// Query traces via Eloquent
$expensive = Span::where('cost_usd', '>', 0.10)
    ->orderBy('cost_usd', 'desc')
    ->get();
```

Features:

- **Database Exporter** - Store traces in your database for easy querying
- **OTLP Exporter** - Send to Jaeger, Grafana Tempo, Honeycomb, Datadog
- **Multi-Exporter** - Database AND OTLP simultaneously
- **GenAI Semantic Conventions** - Industry-standard attribute naming
- **Cost Estimation** - Automatic cost calculation per call
- **Token Tracking** - Input/output/total tokens tracked
- **PII Protection** - Configurable message capture and redaction
- **Artisan Commands** - `export-traces`, `prune-traces`, `trace-stats`

---

### Pillar 3: Streaming SSE

**EventSource streaming made simple**

```php
// Backend (1 line)
return Mindwave::stream($prompt)->toStreamedResponse();

// Frontend (6 lines)
const eventSource = new EventSource('/api/chat?prompt=' + query);
eventSource.addEventListener('message', (e) => output.textContent += e.data);
eventSource.addEventListener('done', () => eventSource.close());
```

Features:

- **StreamedTextResponse Helper** - Proper SSE formatting
- **Connection Management** - Handles client disconnects gracefully
- **Error Handling** - Graceful failure and retry support
- **Client Examples** - Vanilla JS, Alpine.js, Vue.js, Blade/Livewire, TypeScript

---

### Pillar 4: Context Discovery

**Ad-hoc context from DB/CSV without complex RAG**

```php
Mindwave::prompt()
    ->context(
        TntSearchSource::fromEloquent(
            User::where('active', true),
            fn($u) => "Name: {$u->name}, Skills: {$u->skills}"
        )
    )
    ->ask('Who has Laravel expertise?');
```

Features:

- **TntSearchSource** - Search Eloquent models, arrays, or CSV files
- **VectorStoreSource** - Brain integration for semantic search
- **EloquentSource** - Direct SQL LIKE searches
- **StaticSource** - Hardcoded context with keyword matching
- **ContextPipeline** - Multi-source aggregation, deduplication, re-ranking
- **Auto-Query Extraction** - Automatically extracts search terms from user messages
- **Artisan Commands** - `index-stats`, `clear-indexes`
- **Tracing Integration** - All searches are traced

---

### Bonus: Laravel Telescope Integration

**MindwaveWatcher for Telescope client_request entries**

- Event-based integration (listens to LLM events)
- Tags: mindwave, provider:*, model:*, slow, expensive, cached
- Privacy controls (capture_messages option)

---

### LLM Providers

| Provider | Status | Streaming | Function Calling |
|----------|--------|-----------|------------------|
| OpenAI   | Stable | Yes       | Yes              |
| Anthropic Claude | Stable | Yes | Yes |
| Mistral AI | Stable | Yes | Yes |

---

### Vector Stores

| Provider | Status | Notes |
|----------|--------|-------|
| Pinecone | Stable | Managed vector database |
| Qdrant   | Stable | UUID-based IDs, configurable dimensions |
| Weaviate | Stable | Open-source vector search |
| In-Memory | Stable | Testing and development |
| File-based | Stable | JSON file storage |

---

### Breaking Changes from Beta

1. **Removed Agent Framework** - Mindwave pivoted from agent orchestration to production utilities
2. **Namespace Changes** - All classes now under `Mindwave\Mindwave\`
3. **Qdrant ID Generation** - Now uses UUID strings instead of integers
4. **Embedding Dimensions** - Now configured per vector store in environment

---

### Migration from Beta

If upgrading from a pre-1.0 beta version:

1. Remove any agent-related code
2. Update namespaces to `Mindwave\Mindwave\`
3. Run `php artisan migrate` for new tracing tables
4. Update vector store configuration for new dimension settings
5. Review config files for new options

See the [Upgrade Guide](/docs/upgrade-guide) for detailed migration steps.

---

### Test Coverage

- **Total Tests**: 500+
- **Prompt Composer**: 57 tests
- **OpenTelemetry Tracing**: 17 tests
- **Streaming SSE**: 13 tests
- **Context Discovery**: 142 tests
- **Telescope Integration**: 15 tests

---

### Documentation

- Complete installation guide
- Quick start tutorial
- Core feature documentation (4 pillars)
- Observability guides (tracing, cost tracking, OTLP)
- RAG documentation (vector stores, embeddings, Brain)
- Provider documentation (OpenAI, Claude, Mistral)
- Cookbook examples (6 complete guides)
- API reference
- Artisan commands reference
- Configuration reference
- Troubleshooting guide
- Production deployment guide

---

### What's NOT in v1.0 (by design)

Mindwave explicitly does not include:

- Agent orchestration frameworks
- Multi-agent coordination
- Tool/function calling systems (beyond basic LLM function calling)
- Workflow engines
- Chain-of-thought frameworks

**Focus:** Simple, production-ready utilities for common AI tasks.

---

### Credits

- [Helge Sverre](https://twitter.com/helgesverre) - Creator
- [OpenAI PHP Client](https://github.com/openai-php/client) - OpenAI integration
- [Anthropic PHP](https://github.com/mozex/anthropic-php) - Claude integration
- [TeamTNT/TNTSearch](https://github.com/teamtnt/tntsearch) - Full-text search
- [OpenTelemetry PHP](https://github.com/open-telemetry/opentelemetry-php) - Observability
- [Tiktoken PHP](https://github.com/yethee/tiktoken-php) - Token counting

---

### Resources

- **GitHub**: [helgesverre/mindwave](https://github.com/helgesverre/mindwave)
- **Packagist**: [mindwave/mindwave](https://packagist.org/packages/mindwave/mindwave)
- **Documentation**: [mindwave.no](https://mindwave.no)
- **Issues**: [GitHub Issues](https://github.com/helgesverre/mindwave/issues)

---

## Roadmap

### v1.1 (January 2026)
- Additional LLM providers (Cohere, Groq)
- Advanced shrinkers (semantic compression)
- Cost estimation and budgets per request
- Grafana dashboard templates

### v1.2 (February 2026)
- Prompt testing framework
- A/B testing for prompts
- Batch processing utilities
- Queue integration for async LLM calls

### v2.0 (Q2 2026)
- Multi-modal support (images, audio)
- Advanced re-ranking algorithms
- Distributed tracing across microservices
- Real-time streaming analytics dashboard
