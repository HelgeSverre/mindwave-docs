# RAG (Retrieval-Augmented Generation) Overview

Mindwave provides a flexible, production-ready RAG implementation designed specifically for Laravel applications. This guide introduces RAG concepts and shows you how to implement powerful context discovery features using Mindwave's architecture.

## What is RAG?

**Retrieval-Augmented Generation (RAG)** is a technique that enhances Large Language Model (LLM) responses by retrieving relevant information from external knowledge sources and injecting it into the prompt. Instead of relying solely on the model's training data, RAG allows the LLM to answer questions using your application's data, documents, and knowledge bases.

### How RAG Works

The RAG pattern follows three core steps:

1. **Retrieve**: Search your knowledge sources for relevant information based on the user's query
2. **Augment**: Inject the retrieved context into the LLM prompt
3. **Generate**: The LLM generates a response grounded in the retrieved information

```
User Query → Search Knowledge Base → Retrieve Top Results → Inject into Prompt → LLM Response
```

### Why Use RAG?

Traditional LLMs have several limitations that RAG addresses:

**Knowledge Beyond Training Data**

-   LLMs are limited to what they learned during training
-   RAG provides access to your proprietary data and domain knowledge
-   Your application data, customer records, and documents become available to the LLM

**Up-to-Date Information**

-   LLM training data has a cutoff date
-   RAG retrieves current information from live databases
-   Product catalogs, user profiles, and policies stay current

**Source Attribution**

-   RAG provides traceable sources for responses
-   You know which documents or records influenced the answer
-   Better accountability and fact-checking

**Cost-Effective Context**

-   Fine-tuning LLMs is expensive and time-consuming
-   RAG dynamically injects relevant context at query time
-   No model retraining needed when data changes

**Reduced Hallucination**

-   LLMs can "hallucinate" (make up plausible-sounding but incorrect information)
-   RAG grounds responses in actual retrieved documents
-   Responses are based on facts from your knowledge base

## RAG in Mindwave

Mindwave implements RAG through its **Context Discovery** architecture—a modular system that integrates seamlessly with PromptComposer and provides built-in observability.

### Core Philosophy

Mindwave's RAG implementation follows these principles:

**Laravel-Native**

-   Uses Eloquent, queues, cache, and other Laravel primitives
-   Feels natural to Laravel developers
-   Integrates with existing application architecture

**Flexible & Composable**

-   Multiple context source types (full-text search, vector search, SQL, static)
-   Mix and match sources in pipelines
-   Extend with custom sources

**Token-Aware**

-   Automatic token counting and management
-   Respects model context window limits
-   Integrates with PromptComposer's priority system

**Observable**

-   Built-in OpenTelemetry tracing
-   Track search performance and quality
-   Monitor costs and token usage

**Production-Ready**

-   Designed for high-volume applications
-   Automatic cleanup and resource management
-   Performance optimizations built-in

### Architecture Overview

Mindwave's RAG system consists of three layers:

```
┌─────────────────────────────────────────────────────────┐
│                    PromptComposer                       │
│  (Token management, priority system, auto-fitting)      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   Context Pipeline                      │
│  (Multi-source aggregation, deduplication, re-ranking)  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌───────────────┬──────────────┬──────────────┬──────────┐
│  TNTSearch    │ Vector Store │   Eloquent   │  Static  │
│  (BM25 FTS)   │  (Semantic)  │  (SQL LIKE)  │  (KW)    │
└───────────────┴──────────────┴──────────────┴──────────┘
```

## Mindwave's RAG Components

### Context Sources

Context sources are searchable knowledge stores. Each source type excels at different use cases:

#### 1. TNTSearch Source (Full-Text Search)

Uses TNTSearch with BM25 ranking for keyword-based search. Best for finding documents based on exact terms and phrases.

```php
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;

// From Eloquent models
$ticketSource = TntSearchSource::fromEloquent(
    SupportTicket::where('status', 'resolved'),
    fn($ticket) => "Issue: {$ticket->title}\nSolution: {$ticket->resolution}",
    name: 'support-tickets'
);

// From arrays
$docsSource = TntSearchSource::fromArray([
    'Laravel provides Eloquent ORM for database access',
    'Vue.js is a progressive JavaScript framework',
    'Docker containers package applications with dependencies',
]);

// From CSV files
$faqSource = TntSearchSource::fromCsv(
    storage_path('data/faq.csv'),
    columns: ['question', 'answer'],
    name: 'product-faq'
);
```

**Strengths:**

-   Fast full-text search with BM25 ranking
-   Works with any data source (Eloquent, CSV, arrays)
-   No external dependencies
-   Good for keyword matching

**Limitations:**

-   Ephemeral indexes (created per-request)
-   Not ideal for very large datasets (>10k documents)
-   Keyword-based only (no semantic understanding)

#### 2. Vector Store Source (Semantic Search)

Uses Mindwave's Brain for semantic similarity search. Finds conceptually similar content even without exact keyword matches.

```php
use Mindwave\Mindwave\Context\Sources\VectorStoreSource;
use Mindwave\Mindwave\Facades\Mindwave;

// Create from existing Brain
$brain = Mindwave::brain('documentation');
$vectorSource = VectorStoreSource::fromBrain($brain, name: 'docs-semantic');

// Semantic search finds related concepts
$response = Mindwave::prompt()
    ->context($vectorSource, query: 'authentication mechanisms')
    ->section('user', 'How do I implement login?')
    ->run();

// Will find content about "OAuth", "JWT", "sessions" even without exact matches
```

**Strengths:**

-   Semantic understanding (finds conceptual matches)
-   Scales to millions of documents
-   Multi-language support
-   Better for natural language queries

**Limitations:**

-   Requires pre-computed embeddings
-   Higher latency than keyword search
-   More expensive (embedding API calls)
-   Needs vector database

#### 3. Eloquent Source (SQL LIKE Search)

Simple SQL LIKE-based search for small Eloquent datasets. Best for dynamic queries on small tables.

```php
use Mindwave\Mindwave\Context\Sources\EloquentSource;
use App\Models\User;

$userSource = EloquentSource::create(
    User::where('active', true),
    searchColumns: ['name', 'bio', 'skills'],
    transformer: fn($user) => "Name: {$user->name}\nSkills: {$user->skills}",
    name: 'active-users'
);

// Searches using SQL: WHERE name LIKE '%query%' OR bio LIKE '%query%'...
```

**Strengths:**

-   Simple and lightweight
-   No indexing required
-   Works with existing database
-   Good for small datasets

**Limitations:**

-   Poor performance on large tables
-   Basic LIKE search (no ranking)
-   Limited to database columns

#### 4. Static Source (Keyword Matching)

In-memory keyword matching for hardcoded content. Perfect for FAQs, policies, and small knowledge bases.

```php
use Mindwave\Mindwave\Context\Sources\StaticSource;

// Simple strings
$faqSource = StaticSource::fromStrings([
    'Our office hours are Monday-Friday, 9 AM to 5 PM EST',
    'We accept Visa, Mastercard, and American Express',
    'Shipping takes 3-5 business days for domestic orders',
]);

// With custom keywords
$policiesSource = StaticSource::fromItems([
    [
        'content' => 'Full refunds within 30 days, partial refunds up to 60 days',
        'keywords' => ['refund', 'return', 'money back', 'cancel'],
    ],
    [
        'content' => 'Enterprise plans include priority support',
        'keywords' => ['enterprise', 'business', 'support', 'SLA'],
    ],
]);
```

**Strengths:**

-   Zero dependencies
-   Instant search (in-memory)
-   Simple keyword matching
-   Good for small, static content

**Limitations:**

-   Only for small datasets (<100 items)
-   Simple keyword matching (no semantic search)
-   Must fit in memory

### Context Pipeline

The Context Pipeline aggregates results from multiple sources, deduplicates content, and re-ranks by relevance.

```php
use Mindwave\Mindwave\Context\ContextPipeline;

$pipeline = (new ContextPipeline)
    ->addSource($tntSearchSource)      // Full-text search
    ->addSource($vectorStoreSource)    // Semantic search
    ->addSource($staticSource)         // Static FAQs
    ->deduplicate(true)                // Remove duplicate content
    ->rerank(true);                    // Sort by relevance score

// Search across all sources
$results = $pipeline->search('user authentication', limit: 10);
```

**Pipeline Features:**

**Deduplication**: Removes duplicate content across sources (enabled by default)

```php
->deduplicate(true)  // Keep highest-scored version of duplicates
```

**Re-ranking**: Sorts results by relevance score (enabled by default)

```php
->rerank(true)  // Sort all results by score descending
```

**Limit Enforcement**: Controls total number of results

```php
->search($query, limit: 10)  // Return top 10 across all sources
```

### Integration with PromptComposer

Context sources integrate seamlessly with PromptComposer:

#### Automatic Query Extraction

The query is automatically extracted from the user's message:

```php
Mindwave::prompt()
    ->context($source)  // No query needed!
    ->section('user', 'How do I reset my password?')
    ->run();

// Query "How do I reset my password?" is automatically used for search
```

#### Explicit Query Override

Override auto-extracted query when needed:

```php
Mindwave::prompt()
    ->section('user', 'Can you help me with something?')
    ->context($source, query: 'password reset process')  // Explicit query
    ->run();
```

#### Token-Aware Context Injection

Context respects token budgets and priorities:

```php
Mindwave::prompt()
    ->section('system', 'You are a support agent', priority: 100)
    ->context($source, priority: 75, limit: 5)  // Will shrink before system
    ->section('user', 'How do I reset my password?', priority: 100)
    ->reserveOutputTokens(500)
    ->fit()  // Automatically manages context size
    ->run();
```

The context section will be truncated or removed if needed to fit within the token budget, while high-priority sections (system, user) are preserved.

## When to Use Each Approach

### TNTSearch vs Vector Stores

| Factor           | TNTSearch                       | Vector Store                         |
| ---------------- | ------------------------------- | ------------------------------------ |
| **Search Type**  | Keyword-based (BM25)            | Semantic similarity                  |
| **Best For**     | Exact terms, product names, IDs | Conceptual queries, natural language |
| **Dataset Size** | < 10,000 documents              | Millions of documents                |
| **Setup**        | Automatic ephemeral indexing    | Pre-compute embeddings               |
| **Latency**      | Fast (~10-50ms)                 | Moderate (~50-200ms)                 |
| **Cost**         | Low (no API calls)              | Higher (embedding API)               |
| **Accuracy**     | Exact matches, keyword overlap  | Conceptual similarity                |

### Decision Matrix

**Use TNTSearch when:**

-   Searching for specific terms, product names, or identifiers
-   Working with structured data (support tickets, products)
-   Dataset is < 10,000 documents
-   You need fast, low-cost search
-   Keywords matter more than meaning

**Use Vector Stores when:**

-   Natural language queries ("How do I...")
-   Need semantic understanding across languages
-   Large knowledge base (>10,000 documents)
-   Conceptual similarity matters (e.g., "authentication" matches "login", "OAuth")
-   Building conversational interfaces

**Use Eloquent Source when:**

-   Very small datasets (< 1,000 rows)
-   Need dynamic filtering (WHERE clauses)
-   Simple LIKE search is sufficient
-   Don't want to set up indexing

**Use Static Source when:**

-   Fixed FAQs or policies
-   Small content sets (< 100 items)
-   Need instant in-memory search
-   Content rarely changes

### Hybrid Approaches

Combine multiple sources for comprehensive coverage:

#### BM25 + Vector Search (Best of Both)

```php
$pipeline = (new ContextPipeline)
    ->addSource($tntSearchSource)      // Find keyword matches
    ->addSource($vectorStoreSource)    // Find semantic matches
    ->deduplicate()                    // Remove overlaps
    ->rerank();                        // Best results first

Mindwave::prompt()
    ->context($pipeline, limit: 10)
    ->section('user', 'authentication with social providers')
    ->run();

// Gets both exact keyword matches AND conceptually related content
```

#### Multi-Tier Fallback Strategy

```php
// Try exact search first, fall back to semantic
$exactResults = $tntSearchSource->search($query, 5);

if ($exactResults->count() < 3) {
    // Not enough exact matches, add semantic results
    $semanticResults = $vectorSource->search($query, 5);
    $combined = $exactResults->merge($semanticResults)->deduplicate();
}
```

## RAG Architecture Patterns

### Basic RAG Pattern

The simplest RAG implementation: query → retrieve → generate.

```php
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;
use Mindwave\Mindwave\Facades\Mindwave;
use App\Models\SupportTicket;

// 1. Create searchable knowledge base
$knowledgeBase = TntSearchSource::fromEloquent(
    SupportTicket::where('status', 'resolved')->where('rating', '>=', 4),
    fn($ticket) => "Q: {$ticket->title}\nA: {$ticket->resolution}",
    name: 'support-kb'
);

// 2. Search and generate response
$response = Mindwave::prompt()
    ->section('system', 'You are a helpful support agent. Answer based on the knowledge base.')
    ->context($knowledgeBase, query: 'password reset not working', limit: 3)
    ->section('user', 'My password reset email is not arriving')
    ->run();

echo $response->content;
```

**When to use:**

-   Simple Q&A systems
-   Single knowledge source
-   Straightforward queries
-   Getting started with RAG

### Advanced RAG: Multi-Stage Retrieval

Retrieve in stages to improve relevance and quality.

```php
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;
use Mindwave\Mindwave\Context\Sources\VectorStoreSource;
use Mindwave\Mindwave\Context\ContextPipeline;
use Mindwave\Mindwave\Facades\Mindwave;

// Stage 1: Broad retrieval from multiple sources
$documentSource = TntSearchSource::fromCsv(
    storage_path('docs/api-docs.csv'),
    name: 'api-documentation'
);

$tutorialSource = VectorStoreSource::fromBrain(
    Mindwave::brain('tutorials'),
    name: 'tutorial-embeddings'
);

$codeExampleSource = TntSearchSource::fromArray(
    File::files(base_path('examples'))
        ->map(fn($file) => File::get($file))
        ->toArray(),
    name: 'code-examples'
);

// Stage 2: Combine and rank
$pipeline = (new ContextPipeline)
    ->addSource($documentSource)
    ->addSource($tutorialSource)
    ->addSource($codeExampleSource)
    ->deduplicate()
    ->rerank();

// Stage 3: Generate with context
$response = Mindwave::prompt()
    ->section('system', 'You are an expert developer assistant. Provide code examples.')
    ->context($pipeline, limit: 8)
    ->section('user', 'How do I implement OAuth2 authentication in Laravel?')
    ->reserveOutputTokens(1000)
    ->fit()
    ->run();
```

**When to use:**

-   Complex knowledge bases
-   Multiple content types (docs, code, tutorials)
-   Need comprehensive coverage

### Advanced RAG: Re-Ranking with LLM

Use an LLM to re-rank retrieved results for better relevance.

```php
use Mindwave\Mindwave\Facades\Mindwave;

// 1. Broad retrieval (over-fetch)
$initialResults = $pipeline->search($userQuery, limit: 20);

// 2. LLM re-ranking
$rerankedContent = Mindwave::prompt()
    ->section('system', 'You are a search quality expert. Given a query and documents, select the 5 most relevant documents.')
    ->section('query', "Query: {$userQuery}")
    ->section('documents', $initialResults->formatForPrompt())
    ->section('user', 'Return ONLY the document numbers (e.g., [1, 5, 8, 12, 15]) of the 5 most relevant documents.')
    ->model('gpt-4o-mini')  // Use cheaper model for re-ranking
    ->run();

// Parse and filter
$selectedIndices = json_decode($rerankedContent->content);
$reranked = $initialResults->filter(fn($item, $idx) => in_array($idx + 1, $selectedIndices));

// 3. Generate final answer with re-ranked context
$response = Mindwave::prompt()
    ->section('system', 'You are a helpful assistant.')
    ->context($reranked->formatForPrompt())
    ->section('user', $userQuery)
    ->run();
```

**When to use:**

-   Quality matters more than speed
-   Complex queries with nuanced requirements
-   Willing to pay extra for better results

### Advanced RAG: Query Expansion

Expand the user's query to improve retrieval coverage.

```php
// 1. Generate query variations
$expansions = Mindwave::prompt()
    ->section('system', 'Generate 3 alternative phrasings of the user query. Return as JSON array.')
    ->section('user', "Original: {$userQuery}\n\nGenerate variations:")
    ->model('gpt-4o-mini')
    ->run();

$queries = json_decode($expansions->content);
$queries[] = $userQuery;  // Include original

// 2. Search with all query variations
$allResults = collect();
foreach ($queries as $q) {
    $results = $pipeline->search($q, limit: 5);
    $allResults = $allResults->merge($results);
}

// 3. Deduplicate and rank
$finalResults = $allResults->deduplicate()->rerank()->take(10);

// 4. Generate answer
$response = Mindwave::prompt()
    ->section('system', 'You are a helpful assistant.')
    ->context($finalResults->formatForPrompt())
    ->section('user', $userQuery)
    ->run();
```

**When to use:**

-   User queries are vague or ambiguous
-   Need comprehensive retrieval
-   Retrieval recall is low with single query

## Complete RAG Example: Document Q&A System

Here's a production-ready RAG system for document question-answering with multiple context sources, cost tracking, and observability.

```php
<?php

namespace App\Services;

use App\Models\Document;
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;
use Mindwave\Mindwave\Context\Sources\VectorStoreSource;
use Mindwave\Mindwave\Context\Sources\StaticSource;
use Mindwave\Mindwave\Context\ContextPipeline;
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\Observability\Models\Trace;

class DocumentQAService
{
    public function __construct(
        private string $brainName = 'company-documents'
    ) {}

    /**
     * Answer a question about company documents.
     */
    public function ask(string $question, ?int $userId = null): array
    {
        // Create context sources
        $pipeline = $this->buildContextPipeline();

        // Generate response with tracing
        $response = Mindwave::prompt()
            ->section('system', $this->getSystemPrompt())
            ->context($pipeline, query: $question, limit: 8, priority: 75)
            ->section('user', $question, priority: 100)
            ->reserveOutputTokens(800)
            ->model('gpt-4o')
            ->fit()
            ->run();

        // Get trace for cost tracking
        $trace = Trace::latest()->first();

        return [
            'answer' => $response->content,
            'sources' => $this->extractSources($pipeline, $question),
            'cost' => $trace?->estimated_cost ?? 0,
            'tokens' => [
                'input' => $trace?->total_input_tokens ?? 0,
                'output' => $trace?->total_output_tokens ?? 0,
                'total' => $trace?->total_tokens ?? 0,
            ],
        ];
    }

    /**
     * Build multi-source context pipeline.
     */
    private function buildContextPipeline(): ContextPipeline
    {
        // Source 1: Full-text search on document content
        $documentSource = TntSearchSource::fromEloquent(
            Document::where('status', 'published'),
            fn($doc) => "Title: {$doc->title}\n\n{$doc->content}\n\nTags: {$doc->tags}",
            name: 'documents'
        );

        // Source 2: Semantic search using Brain
        $semanticSource = VectorStoreSource::fromBrain(
            Mindwave::brain($this->brainName),
            name: 'document-embeddings'
        );

        // Source 3: Static company policies (always available)
        $policySource = StaticSource::fromItems([
            [
                'content' => 'All company documents are confidential and should not be shared externally without approval.',
                'keywords' => ['confidential', 'sharing', 'external', 'approval'],
            ],
            [
                'content' => 'Document retention policy: Keep all documents for 7 years minimum.',
                'keywords' => ['retention', 'archive', 'delete', 'storage'],
            ],
            [
                'content' => 'Access to sensitive documents requires manager approval and is logged.',
                'keywords' => ['access', 'sensitive', 'permission', 'security'],
            ],
        ]);

        return (new ContextPipeline)
            ->addSource($documentSource)
            ->addSource($semanticSource)
            ->addSource($policySource)
            ->deduplicate(true)
            ->rerank(true);
    }

    /**
     * Get system prompt for document Q&A.
     */
    private function getSystemPrompt(): string
    {
        return <<<'PROMPT'
You are a company document assistant. Answer questions based on the provided context documents.

Guidelines:
- Only answer based on the context provided
- If the context doesn't contain enough information, say so
- Cite which document(s) you're referencing when possible
- Be concise but thorough
- If asked about policies, refer to official company policies in the context

Format your response as:
1. Direct answer to the question
2. Supporting details from context
3. Source references (e.g., "Source: Product Roadmap Q4 2024")
PROMPT;
    }

    /**
     * Extract source references from context.
     */
    private function extractSources(ContextPipeline $pipeline, string $query): array
    {
        $results = $pipeline->search($query, 8);

        return $results->map(function ($item) {
            return [
                'content' => substr($item->content, 0, 200) . '...',
                'score' => round($item->score, 3),
                'source' => $item->source,
                'metadata' => $item->metadata,
            ];
        })->toArray();
    }

    /**
     * Get cost analytics for document Q&A.
     */
    public function getCostAnalytics(int $days = 7): array
    {
        $traces = Trace::where('created_at', '>=', now()->subDays($days))
            ->get();

        return [
            'total_queries' => $traces->count(),
            'total_cost' => $traces->sum('estimated_cost'),
            'avg_cost_per_query' => $traces->avg('estimated_cost'),
            'total_tokens' => $traces->sum('total_tokens'),
            'avg_tokens_per_query' => $traces->avg('total_tokens'),
            'most_expensive' => $traces->sortByDesc('estimated_cost')->take(5)->values(),
        ];
    }
}
```

**Usage:**

```php
use App\Services\DocumentQAService;

$qa = new DocumentQAService();

$result = $qa->ask('What is our document retention policy?');

echo "Answer: {$result['answer']}\n\n";
echo "Cost: \${$result['cost']}\n";
echo "Tokens: {$result['tokens']['total']}\n\n";

foreach ($result['sources'] as $source) {
    echo "Source ({$source['score']}): {$source['content']}\n";
}

// Get cost analytics
$analytics = $qa->getCostAnalytics(days: 30);
echo "30-day cost: \${$analytics['total_cost']}\n";
echo "Average per query: \${$analytics['avg_cost_per_query']}\n";
```

## Best Practices

### 1. Chunk Size Optimization

Break large documents into appropriately sized chunks for better retrieval.

```php
use Mindwave\Mindwave\TextSplitters\RecursiveCharacterTextSplitter;

// For semantic search (Brain/Vector stores)
$splitter = new RecursiveCharacterTextSplitter(
    chunkSize: 512,        // ~128 tokens (4 chars per token)
    chunkOverlap: 50       // Overlap for context continuity
);

$chunks = $splitter->splitText($largeDocument);

// Each chunk is small enough to be semantically coherent
// Overlap prevents losing context at boundaries
```

**Guidelines:**

-   **512-1024 characters** for semantic search (embeddings)
-   **1000-2000 characters** for keyword search (TNTSearch)
-   **50-100 character overlap** between chunks
-   Smaller chunks = more precise, larger chunks = more context

### 2. Retrieval Strategies

Choose the right retrieval strategy for your use case.

```php
// Strategy 1: High precision (fewer, more relevant results)
$results = $source->search($query, limit: 3);

// Strategy 2: High recall (more results, broader coverage)
$results = $source->search($query, limit: 15);

// Strategy 3: Hybrid (balance precision and recall)
$pipeline = (new ContextPipeline)
    ->addSource($exactMatchSource)   // Precision
    ->addSource($semanticSource)     // Recall
    ->deduplicate()
    ->rerank()
    ->search($query, limit: 8);      // Balanced
```

### 3. Context Window Management

Respect token limits and prioritize important sections.

```php
Mindwave::prompt()
    // Critical sections (always included)
    ->section('system', $systemPrompt, priority: 100)
    ->section('user', $userQuery, priority: 100)

    // Context (will shrink/truncate if needed)
    ->context($source, priority: 75, limit: 10)

    // Examples (lowest priority, removed first)
    ->section('examples', $fewShotExamples, priority: 50, shrinker: 'truncate')

    // Reserve tokens for response
    ->reserveOutputTokens(1000)

    // Automatically fit to model's context window
    ->fit()
    ->run();
```

### 4. Cost Optimization

Monitor and optimize RAG costs.

```php
// Use cheaper models for re-ranking and query expansion
$expansions = Mindwave::prompt()
    ->model('gpt-4o-mini')  // Cheap model
    ->ask("Rephrase: {$query}");

// Cache expensive embedding operations
$embeddings = Cache::remember(
    "embeddings::{$documentId}",
    now()->addDays(30),
    fn() => Mindwave::brain()->consume($document)
);

// Limit context size to reduce input tokens
->context($source, limit: 5)  // Fewer results = fewer tokens

// Monitor costs with traces
$dailyCost = Trace::whereDate('created_at', today())
    ->sum('estimated_cost');

if ($dailyCost > 10.00) {
    // Alert or throttle
}
```

### 5. Performance Tuning

Optimize RAG performance for production.

```php
// Index management: Clean old indexes regularly
// Schedule in app/Console/Kernel.php
$schedule->command('mindwave:clear-indexes --ttl=12')
    ->daily();

// Use smaller limits for faster searches
$results = $source->search($query, limit: 5);  // Fast

// Pipeline optimization: Order sources by speed
$pipeline = (new ContextPipeline)
    ->addSource($staticSource)      // Fastest (in-memory)
    ->addSource($tntSearchSource)   // Fast (ephemeral index)
    ->addSource($vectorSource);     // Slower (API + similarity search)

// Parallel search (if using multiple pipelines)
[$results1, $results2] = Promise::all([
    fn() => $pipeline1->search($query),
    fn() => $pipeline2->search($query),
]);
```

### 6. Testing RAG Systems

Test retrieval quality and response accuracy.

```php
use Tests\TestCase;
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;

class DocumentQATest extends TestCase
{
    /** @test */
    public function it_retrieves_relevant_documents()
    {
        // Arrange
        $source = TntSearchSource::fromArray([
            'Laravel provides Eloquent ORM for database access',
            'Vue.js is a progressive JavaScript framework',
            'Docker containers package applications',
        ]);

        // Act
        $results = $source->search('database ORM', limit: 3);

        // Assert
        $this->assertGreaterThan(0, $results->count());
        $this->assertStringContainsString('Eloquent', $results->first()->content);
        $this->assertGreaterThan(0.5, $results->first()->score);
    }

    /** @test */
    public function it_generates_accurate_answers()
    {
        // Test the full RAG pipeline
        $qa = new DocumentQAService();

        $result = $qa->ask('What is Eloquent?');

        $this->assertStringContainsString('ORM', $result['answer']);
        $this->assertGreaterThan(0, $result['tokens']['total']);
    }
}
```

## Common RAG Patterns

### Pattern 1: Customer Support with Ticket Search

Search historical support tickets to answer common questions.

```php
use App\Models\SupportTicket;
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;
use Mindwave\Mindwave\Facades\Mindwave;

class SupportAssistant
{
    public function answerQuestion(string $question): string
    {
        // Search resolved tickets with high ratings
        $ticketSource = TntSearchSource::fromEloquent(
            SupportTicket::where('status', 'resolved')
                ->where('rating', '>=', 4)
                ->latest()
                ->limit(500),
            fn($ticket) => "Issue: {$ticket->title}\nSolution: {$ticket->resolution}\nCategory: {$ticket->category}",
            name: 'resolved-tickets'
        );

        $response = Mindwave::prompt()
            ->section('system', 'You are a customer support agent. Use past ticket resolutions to help customers.')
            ->context($ticketSource, query: $question, limit: 5)
            ->section('user', $question)
            ->run();

        return $response->content;
    }
}
```

### Pattern 2: Code Documentation Assistant

Help developers find relevant code examples and documentation.

```php
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;
use Mindwave\Mindwave\Context\Sources\VectorStoreSource;
use Mindwave\Mindwave\Context\ContextPipeline;
use Mindwave\Mindwave\Facades\Mindwave;

class CodeAssistant
{
    public function findExample(string $query): string
    {
        // Search API documentation (keyword-based)
        $docsSource = TntSearchSource::fromCsv(
            storage_path('docs/api-reference.csv'),
            columns: ['endpoint', 'description', 'example'],
            name: 'api-docs'
        );

        // Search tutorials (semantic)
        $tutorialSource = VectorStoreSource::fromBrain(
            Mindwave::brain('code-tutorials'),
            name: 'tutorials'
        );

        // Combine sources
        $pipeline = (new ContextPipeline)
            ->addSource($docsSource)
            ->addSource($tutorialSource);

        $response = Mindwave::prompt()
            ->section('system', 'You are a senior developer. Provide accurate code examples with explanations.')
            ->context($pipeline, query: $query, limit: 6)
            ->section('user', $query)
            ->reserveOutputTokens(1500)
            ->fit()
            ->run();

        return $response->content;
    }
}
```

### Pattern 3: Knowledge Base Q&A

Answer questions from a company knowledge base with policies and FAQs.

```php
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;
use Mindwave\Mindwave\Context\Sources\StaticSource;
use Mindwave\Mindwave\Context\ContextPipeline;
use Mindwave\Mindwave\Facades\Mindwave;

class KnowledgeBaseAssistant
{
    public function ask(string $question): array
    {
        // Dynamic knowledge base (searchable documents)
        $kbSource = TntSearchSource::fromCsv(
            storage_path('kb/articles.csv'),
            columns: ['title', 'content', 'category']
        );

        // Static policies (always exact)
        $policySource = StaticSource::fromItems([
            [
                'content' => 'Refund policy: Full refund within 30 days, partial within 60 days',
                'keywords' => ['refund', 'return', 'money back'],
            ],
            [
                'content' => 'Support hours: Mon-Fri 9 AM - 5 PM EST, 24h ticket response',
                'keywords' => ['support', 'hours', 'contact', 'response time'],
            ],
        ]);

        $pipeline = (new ContextPipeline)
            ->addSource($kbSource)
            ->addSource($policySource);

        $results = $pipeline->search($question, limit: 5);

        $response = Mindwave::prompt()
            ->section('system', 'You are a helpful assistant. Answer based on company knowledge base.')
            ->context($results->formatForPrompt())
            ->section('user', $question)
            ->run();

        return [
            'answer' => $response->content,
            'sources' => $results->toArray(),
        ];
    }
}
```

### Pattern 4: Multi-Tenant RAG

Implement RAG with tenant isolation (SaaS applications).

```php
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;
use Mindwave\Mindwave\Facades\Mindwave;

class TenantDocumentAssistant
{
    public function __construct(
        private int $tenantId
    ) {}

    public function ask(string $question): string
    {
        // Only search documents for this tenant
        $source = TntSearchSource::fromEloquent(
            Document::where('tenant_id', $this->tenantId)
                ->where('status', 'published'),
            fn($doc) => $doc->content,
            name: "tenant-{$this->tenantId}-docs"
        );

        $response = Mindwave::prompt()
            ->section('system', 'Answer based on company documents.')
            ->context($source, query: $question, limit: 5)
            ->section('user', $question)
            ->run();

        return $response->content;
    }
}

// Usage
$assistant = new TenantDocumentAssistant(tenantId: auth()->user()->tenant_id);
$answer = $assistant->ask('What is our vacation policy?');
```

## Performance & Scalability

### Indexing Strategies

Choose the right indexing approach for your scale.

**Ephemeral Indexes (TNTSearch Default)**

```php
// Created per-request, auto-cleaned
$source = TntSearchSource::fromEloquent(User::query(), fn($u) => $u->bio);
// Index created on first search
// Deleted when object is destroyed
```

**Pros:** Simple, no management required
**Cons:** Overhead on first search, not suitable for large datasets

**Persistent Indexes (Brain/Vector Stores)**

```php
// Pre-compute and store embeddings
$brain = Mindwave::brain('documents');

Document::chunk(100, function ($documents) use ($brain) {
    foreach ($documents as $doc) {
        $brain->consume($doc->toMindwaveDocument());
    }
});

// Fast searches (no indexing overhead)
$source = VectorStoreSource::fromBrain($brain);
```

**Pros:** Fast searches, scales to millions
**Cons:** Requires pre-processing, storage costs

### Query Performance

Optimize search query performance.

```php
// Slow: Large result set
$results = $source->search($query, limit: 100);  // 100 results

// Fast: Smaller result set
$results = $source->search($query, limit: 5);    // 5 results

// Slow: Multiple small searches
foreach ($queries as $q) {
    $results[] = $source->search($q, 5);
}

// Fast: Batch query (if supported)
$allResults = $source->searchMany($queries, 5);

// Use pipeline only when needed
$pipeline->search($query, 5);  // Searches ALL sources
```

### Caching

Cache expensive operations to improve performance.

```php
use Illuminate\Support\Facades\Cache;

class CachedDocumentQA
{
    public function ask(string $question): string
    {
        $cacheKey = 'qa::' . md5($question);

        return Cache::remember($cacheKey, now()->addHours(24), function () use ($question) {
            $source = TntSearchSource::fromEloquent(...);

            return Mindwave::prompt()
                ->context($source, query: $question)
                ->section('user', $question)
                ->run()
                ->content;
        });
    }
}

// Cache embeddings
$embeddings = Cache::remember(
    "embeddings::{$docId}",
    now()->addDays(7),
    fn() => $embeddings->embedDocument($doc)
);
```

### Batch Processing

Process documents in batches for better performance.

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

// Dispatch job
Queue::dispatch(new IndexDocumentsJob());
```

### High-Volume Considerations

**Rate Limiting**

```php
use Illuminate\Support\Facades\RateLimiter;

RateLimiter::for('rag-search', function (Request $request) {
    return Limit::perMinute(30)->by($request->user()->id);
});

// In controller
if (RateLimiter::tooManyAttempts('rag-search', 30)) {
    abort(429, 'Too many requests');
}
```

**Query Queuing**

```php
// For non-real-time RAG queries
class ProcessRAGQuery implements ShouldQueue
{
    public function handle()
    {
        $result = $this->qaService->ask($this->question);

        // Store result for later retrieval
        Cache::put("rag::{$this->queryId}", $result, now()->addHours(1));
    }
}
```

## Troubleshooting

### Poor Retrieval Quality

**Problem:** Search returns irrelevant results.

**Solutions:**

```php
// 1. Try different source types
// If keyword search isn't working, try semantic search
$vectorSource = VectorStoreSource::fromBrain($brain);

// 2. Combine multiple sources
$pipeline = (new ContextPipeline)
    ->addSource($tntSearchSource)
    ->addSource($vectorSource);

// 3. Adjust query phrasing
// Instead of: "login"
// Try: "user authentication and login process"

// 4. Increase result limit for better coverage
->context($source, limit: 10)  // More results

// 5. Check source data quality
$source = TntSearchSource::fromEloquent(
    Document::query(),
    fn($doc) => "Title: {$doc->title}\n\n{$doc->content}"  // Include more context
);
```

### Irrelevant Context

**Problem:** Retrieved context doesn't help the LLM answer correctly.

**Solutions:**

```php
// 1. Filter results by score threshold
$results = $source->search($query, 10)
    ->filter(fn($item) => $item->score > 0.7);  // Only high-quality matches

// 2. Use explicit query instead of auto-extraction
->context($source, query: 'specific search terms')

// 3. Add more specific system prompts
->section('system', 'Only answer if the context contains specific information about X.')

// 4. Re-rank with LLM (see Advanced RAG patterns above)
```

### Token Budget Issues

**Problem:** Context exceeds token limits.

**Solutions:**

```php
// 1. Reduce context limit
->context($source, limit: 3)  // Fewer results

// 2. Set lower priority for context
->context($source, priority: 50)  // Will shrink first

// 3. Use truncate shrinker
->section('context', $results, shrinker: 'truncate')

// 4. Reserve more output tokens
->reserveOutputTokens(1000)  // Leave room for response

// 5. Check token usage
$collection = $source->search($query, 10);
$tokens = $collection->getTotalTokens('gpt-4o');
echo "Context uses {$tokens} tokens\n";
```

### Performance Problems

**Problem:** RAG queries are too slow.

**Solutions:**

```php
// 1. Reduce result limits
->context($source, limit: 3)  // Faster

// 2. Use simpler sources for small datasets
$staticSource = StaticSource::fromStrings($faqs);  // Instant search

// 3. Cache common queries
Cache::remember("rag::{$query}", 3600, fn() => $qa->ask($query));

// 4. Clean old indexes
php artisan mindwave:clear-indexes --ttl=12

// 5. Use faster models for embeddings
config(['mindwave.embeddings.model' => 'text-embedding-3-small']);

// 6. Monitor search performance with traces
Span::where('operation_name', 'context.search')
    ->where('duration', '>', 1_000_000_000)  // > 1 second
    ->get();
```

### Index Not Found Error

**Problem:** TNTSearch index doesn't exist.

**Solutions:**

```php
// Always initialize before searching
$source = TntSearchSource::fromArray($documents);
$source->initialize();  // Explicitly initialize
$results = $source->search($query);

// Or use context() which auto-initializes
Mindwave::prompt()
    ->context($source)  // Auto-initializes
    ->ask($query);
```

### High Costs

**Problem:** RAG is too expensive.

**Solutions:**

```php
// 1. Use cheaper models
->model('gpt-4o-mini')  // Instead of gpt-4o

// 2. Reduce context size
->context($source, limit: 3)  // Fewer tokens

// 3. Cache aggressively
Cache::remember("rag::{$query}", now()->addDay(), ...);

// 4. Use TNTSearch instead of vector search
// Vector search requires embedding API calls ($$)
// TNTSearch is free (local BM25)

// 5. Monitor and alert on costs
if (Trace::today()->sum('estimated_cost') > 5.00) {
    // Throttle or alert
}
```

## Next Steps

Now that you understand RAG fundamentals and Mindwave's architecture, explore these topics:

### Core Components

-   [TNTSearch Source](/docs/rag/tntsearch-source) - Full-text search with BM25 ranking
-   [Vector Store Source](/docs/rag/vector-store-source) - Semantic search with embeddings
-   [Context Pipeline](/docs/rag/context-pipeline) - Multi-source aggregation and ranking
-   [Brain (Vector Stores)](/docs/rag/brain) - Embedding storage and similarity search

### Integration

-   [PromptComposer](/docs/core/prompt-composer) - Token-aware prompt composition
-   [Observability & Tracing](/docs/observability/overview) - Monitor RAG performance and costs
-   [Streaming](/docs/core/streaming) - Stream RAG responses to users

### Advanced Topics

-   [Custom Context Sources](/docs/rag/custom-sources) - Build your own context sources
-   [RAG Evaluation](/docs/rag/evaluation) - Test and measure RAG quality
-   [Production Patterns](/docs/advanced/rag-patterns) - Advanced RAG architectures

### Getting Started

1. **Install Mindwave**: Follow the [Installation Guide](/docs/installation)
2. **Try Basic RAG**: Start with TNTSearch on a small dataset
3. **Add Vector Search**: Implement semantic search with Brain
4. **Monitor Performance**: Enable tracing to track costs and quality
5. **Scale Up**: Optimize for your production workload

### Resources

-   [Example Applications](https://github.com/mindwave/examples) - Complete RAG implementations
-   [API Reference](/docs/reference/api) - Full API documentation
-   [Community Discord](https://discord.gg/mindwave) - Get help and share experiences
-   [Blog: RAG Best Practices](https://mindwave.dev/blog/rag-best-practices) - Deep dive into RAG techniques
