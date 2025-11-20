# RAG (Retrieval-Augmented Generation)

Retrieval-Augmented Generation (RAG) is a technique that enhances LLM responses by retrieving relevant information from external knowledge sources. Mindwave provides a flexible, Laravel-native RAG implementation through its Context Discovery system.

## Overview

RAG allows your AI applications to answer questions using your application's data, documents, and knowledge bases—not just the model's training data. This enables accurate, up-to-date responses grounded in your actual information.

### What is RAG?

**Basic Concept:**
Instead of relying solely on what an LLM learned during training, RAG retrieves relevant information from your knowledge sources and includes it in the prompt, allowing the model to generate responses based on current, accurate data.

**The RAG Flow:**
1. **User asks a question** → "What is our refund policy?"
2. **System searches knowledge base** → Finds relevant policy documents
3. **Context is injected into prompt** → Policy text added to the prompt
4. **LLM generates response** → Answer based on actual policy

### Why Use RAG?

**Up-to-Date Information**
- LLMs have a knowledge cutoff date
- RAG provides access to current information
- Your data stays fresh without retraining models

**Domain-Specific Knowledge**
- Access proprietary company information
- Use specialized technical documentation
- Leverage customer support history

**Reduced Hallucination**
- Responses grounded in actual documents
- Source attribution for fact-checking
- Verifiable information

**Cost-Effective**
- No expensive fine-tuning required
- Update knowledge by adding documents
- Pay only for retrieval and generation

## Quick Start

### Basic RAG Example

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;
use Mindwave\Mindwave\Document\Data\Document;

// 1. Create a searchable knowledge base
$faqSource = TntSearchSource::fromArray([
    'Our refund policy: Full refund within 30 days of purchase',
    'Shipping takes 3-5 business days for domestic orders',
    'We accept Visa, Mastercard, and PayPal',
]);

// 2. Use context in a prompt
$response = Mindwave::prompt()
    ->section('system', 'Answer customer questions using the FAQ context')
    ->context($faqSource, query: 'refund policy', limit: 3)
    ->section('user', 'What is your refund policy?')
    ->run();

echo $response->content;
// Output: "We offer a full refund within 30 days of purchase."
```

### Using Brain for Semantic Search

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\Context\Sources\VectorStoreSource;
use Mindwave\Mindwave\Document\Data\Document;

// 1. Store documents in Brain
$brain = Mindwave::brain();
$brain->consumeAll([
    Document::make('Laravel is a PHP web framework with elegant syntax'),
    Document::make('Eloquent ORM provides intuitive database access'),
    Document::make('Blade is Laravel\'s powerful templating engine'),
]);

// 2. Create vector store source
$vectorSource = VectorStoreSource::fromBrain($brain, name: 'laravel-docs');

// 3. Use semantic search in prompts
$response = Mindwave::prompt()
    ->context($vectorSource, query: 'database queries')  // Finds "Eloquent ORM" semantically
    ->section('user', 'How do I query the database?')
    ->run();
```

## Mindwave's RAG Architecture

Mindwave implements RAG through its **Context Discovery** system, which consists of three layers:

### 1. Context Sources

Context sources are searchable knowledge stores:

**TNTSearch Source** - Full-text keyword search
```php
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;

$source = TntSearchSource::fromEloquent(
    SupportTicket::where('status', 'resolved'),
    fn($ticket) => "Q: {$ticket->question}\nA: {$ticket->answer}"
);
```

**Vector Store Source** - Semantic similarity search
```php
use Mindwave\Mindwave\Context\Sources\VectorStoreSource;

$vectorSource = VectorStoreSource::fromBrain(
    Mindwave::brain('documentation'),
    name: 'docs'
);
```

**Static Source** - In-memory keyword matching
```php
use Mindwave\Mindwave\Context\Sources\StaticSource;

$staticSource = StaticSource::fromStrings([
    'Our office hours are 9 AM - 5 PM EST',
    'Support tickets are answered within 24 hours',
]);
```

**Eloquent Source** - SQL LIKE search
```php
use Mindwave\Mindwave\Context\Sources\EloquentSource;

$eloquentSource = EloquentSource::create(
    User::where('active', true),
    searchColumns: ['name', 'bio'],
    transformer: fn($user) => "{$user->name}: {$user->bio}"
);
```

### 2. Context Pipeline

Combine multiple sources with deduplication and ranking:

```php
use Mindwave\Mindwave\Context\ContextPipeline;

$pipeline = (new ContextPipeline)
    ->addSource($tntSearchSource)      // Keyword search
    ->addSource($vectorStoreSource)    // Semantic search
    ->addSource($staticSource)         // Static FAQs
    ->deduplicate(true)                // Remove duplicates
    ->rerank(true);                    // Sort by relevance

$results = $pipeline->search('user authentication', limit: 10);
```

### 3. PromptComposer Integration

Context sources integrate seamlessly with PromptComposer:

```php
use Mindwave\Mindwave\Facades\Mindwave;

$response = Mindwave::prompt()
    ->section('system', 'You are a helpful assistant', priority: 100)
    ->context($pipeline, priority: 75, limit: 5)  // Auto-managed context
    ->section('user', 'How do I reset my password?', priority: 100)
    ->reserveOutputTokens(500)
    ->fit()  // Automatically fits within token budget
    ->run();
```

## Common RAG Patterns

### 1. Customer Support Bot

```php
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;
use App\Models\SupportTicket;

class SupportBot
{
    public function answer(string $question): string
    {
        // Search past support tickets
        $knowledgeBase = TntSearchSource::fromEloquent(
            SupportTicket::where('status', 'resolved')
                ->where('rating', '>=', 4),
            fn($ticket) => "Q: {$ticket->title}\nA: {$ticket->resolution}"
        );

        return Mindwave::prompt()
            ->section('system', 'You are a support agent. Use past tickets to help.')
            ->context($knowledgeBase, limit: 3)
            ->section('user', $question)
            ->run()
            ->content;
    }
}

$bot = new SupportBot();
echo $bot->answer('How do I change my email address?');
```

### 2. Document Q&A System

```php
use Mindwave\Mindwave\Context\Sources\VectorStoreSource;
use Mindwave\Mindwave\Facades\DocumentLoader;

class DocumentQA
{
    protected $brain;

    public function __construct()
    {
        $this->brain = Mindwave::brain('company-docs');
    }

    public function indexDocuments(): void
    {
        // Load various document types
        $this->brain->consumeAll([
            DocumentLoader::fromPdf('/path/to/employee-handbook.pdf'),
            DocumentLoader::fromUrl('https://docs.company.com/policies'),
            DocumentLoader::fromWord('/path/to/guidelines.docx'),
        ]);
    }

    public function ask(string $question): string
    {
        $vectorSource = VectorStoreSource::fromBrain(
            $this->brain,
            name: 'company-docs'
        );

        return Mindwave::prompt()
            ->section('system', 'Answer based on company documentation')
            ->context($vectorSource, limit: 5)
            ->section('user', $question)
            ->run()
            ->content;
    }
}
```

### 3. Multi-Source Knowledge Base

```php
use Mindwave\Mindwave\Context\ContextPipeline;
use Mindwave\Mindwave\Context\Sources\{TntSearch\TntSearchSource, VectorStoreSource, StaticSource};

class KnowledgeAssistant
{
    public function answer(string $query): string
    {
        // Source 1: Static company policies
        $policies = StaticSource::fromItems([
            [
                'content' => 'Vacation policy: 15 days PTO per year',
                'keywords' => ['vacation', 'pto', 'time off'],
            ],
        ]);

        // Source 2: FAQ database
        $faq = TntSearchSource::fromEloquent(
            FAQ::all(),
            fn($faq) => "Q: {$faq->question}\nA: {$faq->answer}"
        );

        // Source 3: Semantic document search
        $docs = VectorStoreSource::fromBrain(
            Mindwave::brain('documentation')
        );

        // Combine all sources
        $pipeline = (new ContextPipeline)
            ->addSource($policies)
            ->addSource($faq)
            ->addSource($docs)
            ->deduplicate()
            ->rerank();

        return Mindwave::prompt()
            ->context($pipeline, query: $query, limit: 8)
            ->section('user', $query)
            ->run()
            ->content;
    }
}
```

## Choosing the Right Approach

### TNTSearch vs Vector Stores

**Use TNTSearch when:**
- Searching for specific terms or product names
- Working with structured data
- Dataset is < 10,000 documents
- Need fast, low-cost search
- Keywords matter more than meaning

**Use Vector Stores when:**
- Natural language queries
- Need semantic understanding
- Large knowledge base (>10,000 documents)
- Multi-language support needed
- Building conversational interfaces

### Hybrid Approach (Best of Both)

```php
$pipeline = (new ContextPipeline)
    ->addSource($tntSearchSource)      // Find exact keyword matches
    ->addSource($vectorStoreSource)    // Find semantic matches
    ->deduplicate()                    // Remove overlaps
    ->rerank();                        // Best results first

// Gets both exact matches AND semantically related content
$response = Mindwave::prompt()
    ->context($pipeline, limit: 10)
    ->section('user', 'OAuth authentication flow')
    ->run();
```

## Best Practices

### 1. Optimize Chunk Sizes

```php
use Mindwave\Mindwave\TextSplitters\RecursiveCharacterTextSplitter;

$splitter = new RecursiveCharacterTextSplitter(
    chunkSize: 512,        // ~128 tokens (4 chars per token)
    chunkOverlap: 50       // Overlap for context continuity
);

$chunks = $splitter->splitText($largeDocument);

// Guidelines:
// - 512-1024 chars for semantic search
// - 1000-2000 chars for keyword search
// - 50-100 char overlap between chunks
```

### 2. Manage Token Budgets

```php
Mindwave::prompt()
    // Critical sections (always included)
    ->section('system', $systemPrompt, priority: 100)
    ->section('user', $userQuery, priority: 100)

    // Context (will shrink if needed)
    ->context($source, priority: 75, limit: 10)

    // Examples (removed first if space needed)
    ->section('examples', $examples, priority: 50)

    // Reserve space for response
    ->reserveOutputTokens(1000)

    // Auto-fit to model's context window
    ->fit()
    ->run();
```

### 3. Monitor Costs

```php
use Mindwave\Mindwave\Observability\Models\Trace;

// Track daily RAG costs
$cost = Trace::whereDate('created_at', today())
    ->sum('estimated_cost');

echo "Today's RAG cost: \${$cost}";

// Alert on high costs
if ($cost > 10.00) {
    // Send alert or throttle
}
```

### 4. Cache Common Queries

```php
use Illuminate\Support\Facades\Cache;

class CachedRAG
{
    public function answer(string $question): string
    {
        $cacheKey = 'rag:' . md5($question);

        return Cache::remember($cacheKey, now()->addHours(24), function() use ($question) {
            return Mindwave::prompt()
                ->context($this->source, query: $question)
                ->section('user', $question)
                ->run()
                ->content;
        });
    }
}
```

### 5. Test Retrieval Quality

```php
use Tests\TestCase;

class RAGTest extends TestCase
{
    /** @test */
    public function it_retrieves_relevant_documents()
    {
        $source = TntSearchSource::fromArray([
            'Laravel provides Eloquent ORM',
            'Vue.js is a JavaScript framework',
        ]);

        $results = $source->search('database ORM', limit: 3);

        $this->assertGreaterThan(0, $results->count());
        $this->assertStringContainsString('Eloquent', $results->first()->content);
    }
}
```

## Performance Optimization

### Indexing Strategies

**Ephemeral Indexes (TNTSearch)**
- Created per-request
- Good for < 10k documents
- No management required

**Persistent Indexes (Brain/Vector Stores)**
- Pre-compute embeddings
- Scales to millions of documents
- Fast searches, higher setup cost

### Batch Processing

```php
use Illuminate\Support\Facades\Queue;

class IndexDocumentsJob implements ShouldQueue
{
    public function handle()
    {
        $brain = Mindwave::brain('documents');

        Document::where('indexed', false)
            ->chunk(50, function ($documents) use ($brain) {
                foreach ($documents as $doc) {
                    $brain->consume($doc->toMindwaveDocument());
                    $doc->update(['indexed' => true]);
                }
            });
    }
}
```

### Rate Limiting

```php
use Illuminate\Support\Facades\RateLimiter;

RateLimiter::for('rag-search', function (Request $request) {
    return Limit::perMinute(30)->by($request->user()->id);
});

if (RateLimiter::tooManyAttempts('rag-search', 30)) {
    abort(429, 'Too many requests');
}
```

## Troubleshooting

### Poor Retrieval Quality

**Problem:** Search returns irrelevant results.

**Solutions:**
```php
// 1. Try semantic search instead of keyword
$vectorSource = VectorStoreSource::fromBrain($brain);

// 2. Combine multiple sources
$pipeline = (new ContextPipeline)
    ->addSource($keywordSource)
    ->addSource($semanticSource);

// 3. Increase result limit
->context($source, limit: 10)  // More results

// 4. Filter by score threshold
$results = $source->search($query, 10)
    ->filter(fn($item) => $item->score > 0.7);
```

### Token Budget Issues

**Problem:** Context exceeds token limits.

**Solutions:**
```php
// 1. Reduce context limit
->context($source, limit: 3)  // Fewer results

// 2. Set lower priority
->context($source, priority: 50)  // Shrinks first

// 3. Reserve more output tokens
->reserveOutputTokens(1000)

// 4. Use smaller chunks
$splitter = new RecursiveCharacterTextSplitter(chunkSize: 300);
```

### High Costs

**Problem:** RAG queries are too expensive.

**Solutions:**
```php
// 1. Use cheaper models
->model('gpt-4o-mini')

// 2. Reduce context size
->context($source, limit: 3)

// 3. Cache aggressively
Cache::remember("rag::{$query}", now()->addDay(), ...);

// 4. Use TNTSearch instead of vector search
// TNTSearch is free (local), vector search requires API calls
```

## Next Steps

### Learn More

- **[Brain](/docs/core/brain)** - Long-term knowledge storage
- **[Context Discovery](/docs/rag/overview)** - Complete RAG guide
- **[PromptComposer](/docs/core/prompt-composer)** - Token-aware prompts
- **[Tracing](/docs/core/tracing)** - Monitor RAG performance

### Deep Dive

- **[TNTSearch Source](/docs/rag/tntsearch-source)** - Full-text search details
- **[Vector Store Source](/docs/rag/vector-store-source)** - Semantic search guide
- **[Context Pipeline](/docs/rag/context-pipeline)** - Multi-source aggregation
- **[Custom Sources](/docs/rag/custom-sources)** - Build your own

### Examples

Start with a simple example and expand:

1. **Basic FAQ Bot** - Use StaticSource with 10-20 FAQs
2. **Support Ticket Search** - TNTSearch over support tickets
3. **Document Q&A** - Brain with PDFs and docs
4. **Multi-Source Agent** - Combine multiple sources with pipeline
5. **Production System** - Add caching, monitoring, and optimization
