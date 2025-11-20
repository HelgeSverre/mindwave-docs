# Context Discovery

Context Discovery enables intelligent context aggregation from multiple sources for your AI applications.

## Overview

This page provides a quick introduction. For complete documentation, see [Core Context Discovery](/docs/core/context-discovery).

## What is Context Discovery?

Context Discovery allows you to:

- **Search multiple data sources** - TNTSearch (full-text), Vector Stores (semantic), Eloquent (database), Static (hardcoded)
- **Aggregate and rank results** - Combine sources with deduplication and re-ranking
- **Integrate seamlessly** - Works natively with PromptComposer for token-aware context injection
- **Scale to production** - Built-in observability with OpenTelemetry tracing

## Quick Example

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;

// Create a searchable source from your database
$source = TntSearchSource::fromEloquent(
    User::where('active', true),
    fn($u) => "Name: {$u->name}, Skills: {$u->skills}, Bio: {$u->bio}"
);

// Use in a prompt - query is automatically extracted
Mindwave::prompt()
    ->section('system', 'You are a project manager')
    ->context($source, limit: 5)  // Automatically searches based on user query
    ->section('user', 'Who are the best Laravel developers for a Vue.js project?')
    ->run();
```

The query "best Laravel developers for a Vue.js project" is automatically used to search the source, rank results by relevance, and inject the top 5 matches into the prompt.

## Context Sources

### TNTSearch Source

Full-text search with BM25 ranking. Best for keyword-based search.

```php
// From Eloquent models
$source = TntSearchSource::fromEloquent(
    Article::where('published', true),
    fn($a) => "{$a->title}\n{$a->content}"
);

// From arrays
$source = TntSearchSource::fromArray([
    'Laravel is a PHP framework',
    'Vue.js is a JavaScript framework',
]);

// From CSV files
$source = TntSearchSource::fromCsv(
    filepath: storage_path('data/faq.csv'),
    columns: ['question', 'answer']
);
```

### Vector Store Source

Semantic similarity search using embeddings.

```php
use Mindwave\Mindwave\Context\Sources\VectorStoreSource;

$brain = Mindwave::brain('documentation');
$source = VectorStoreSource::fromBrain($brain);

// Finds conceptually similar content, not just keyword matches
Mindwave::prompt()
    ->context($source, query: 'authentication mechanisms')
    ->section('user', 'How do I implement login?')
    ->run();
```

### Eloquent Source

Direct database search with SQL LIKE queries.

```php
use Mindwave\Mindwave\Context\Sources\EloquentSource;

$source = EloquentSource::create(
    query: Article::where('published', true),
    searchColumns: ['title', 'body', 'tags'],
    transformer: fn($article) => "Title: {$article->title}\n{$article->body}"
);
```

### Static Source

Hardcoded content with keyword matching.

```php
use Mindwave\Mindwave\Context\Sources\StaticSource;

$source = StaticSource::fromStrings([
    'Our office hours are Monday-Friday, 9 AM to 5 PM EST',
    'We accept Visa, Mastercard, and American Express',
    'Shipping takes 3-5 business days',
]);
```

## Context Pipeline

Combine multiple sources for comprehensive coverage:

```php
use Mindwave\Mindwave\Context\ContextPipeline;

$pipeline = (new ContextPipeline)
    ->addSource($userSource)      // TNTSearch
    ->addSource($docsSource)      // Vector Store
    ->addSource($faqSource)       // Static
    ->deduplicate(true)           // Remove duplicates
    ->rerank(true);               // Sort by relevance

Mindwave::prompt()
    ->context($pipeline, query: 'project approval process', limit: 10)
    ->section('user', 'How do I start a new internal project?')
    ->run();
```

## When to Use What

| Source Type | Dataset Size | Use Case | Search Method |
|-------------|--------------|----------|---------------|
| **TNTSearch** | < 10K docs | Keyword-based search | BM25 full-text |
| **VectorStore** | Millions | Semantic similarity | Vector embeddings |
| **EloquentSource** | < 1K records | Dynamic SQL queries | SQL LIKE |
| **StaticSource** | < 100 items | Fixed content, FAQs | Keyword matching |

## Complete Documentation

For detailed information including:
- Advanced features and configuration
- Custom source creation
- Token management
- Performance optimization
- Tracing and observability
- Complete examples

See the **[Core Context Discovery Documentation](/docs/core/context-discovery)**.

## Related Documentation

- [Prompt Composer](/docs/core/prompt-composer) - Token-aware prompt building
- [Brain (Vector Store)](/docs/core/brain) - Vector store integration
- [Configuration](/docs/configuration.md) - Context configuration options
