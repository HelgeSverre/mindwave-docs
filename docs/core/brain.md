# Brain - Knowledge Management System

The Brain is Mindwave's knowledge management system that provides persistent, long-term memory for your Laravel AI applications. It combines vector embeddings with semantic search to store and retrieve knowledge efficiently.

## Overview

The Brain serves as a persistent knowledge layer that can store, index, and retrieve information using semantic similarity. Unlike short-term memory (like conversation history), the Brain is designed for long-term knowledge storage that persists across sessions and can grow indefinitely.

### What is the Brain?

The Brain is a wrapper around Mindwave's vector store system that simplifies knowledge management:

- **Knowledge Storage** - Store documents with automatic chunking and embedding
- **Semantic Search** - Find relevant information using meaning, not just keywords
- **Document Management** - Handle various document types (text, PDF, web pages, Word documents)
- **Integration** - Works seamlessly with PromptComposer and Context Discovery

### Key Features

- **Automatic Text Splitting** - Documents are automatically chunked for optimal retrieval
- **Vector Embeddings** - Content is converted to embeddings for semantic search
- **Multiple Backends** - Support for Pinecone, Qdrant, Weaviate, or local file storage
- **Document Loaders** - Built-in loaders for various formats
- **Context Integration** - Use with Context Discovery for intelligent RAG patterns

## Quick Start

### Basic Setup

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\Document\Data\Document;

// Get the Brain instance
$brain = Mindwave::brain();

// Store a document
$brain->consume(Document::make('Laravel is a PHP framework'));

// Search for relevant content
$results = $brain->search('PHP web development', count: 5);

foreach ($results as $doc) {
    echo $doc->content();
}
```

### Configuration

Configure your vector store in `config/mindwave-vectorstore.php`:

```php
return [
    'default' => env('MINDWAVE_VECTORSTORE', 'pinecone'),

    'vectorstores' => [
        'pinecone' => [
            'api_key' => env('MINDWAVE_PINECONE_API_KEY'),
            'environment' => env('MINDWAVE_PINECONE_ENVIRONMENT'),
            'index' => env('MINDWAVE_PINECONE_INDEX'),
        ],

        'qdrant' => [
            'host' => env('MINDWAVE_QDRANT_HOST', 'localhost'),
            'port' => env('MINDWAVE_QDRANT_PORT', '6333'),
            'collection' => env('MINDWAVE_QDRANT_COLLECTION', 'items'),
        ],
    ],
];
```

## Storing Knowledge

### Simple Document Storage

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\Document\Data\Document;

$brain = Mindwave::brain();

// Store simple text
$brain->consume(
    Document::make('Mindwave is a production AI utility package for Laravel')
);

// Store with metadata
$brain->consume(
    Document::make(
        content: 'Our support email is support@example.com',
        metadata: [
            'category' => 'contact',
            'type' => 'email',
            'department' => 'support'
        ]
    )
);
```

### Batch Storage

```php
$documents = [
    Document::make('Document 1 content', ['category' => 'docs']),
    Document::make('Document 2 content', ['category' => 'docs']),
    Document::make('Document 3 content', ['category' => 'docs']),
];

$brain->consumeAll($documents);
```

### Loading from Various Sources

```php
use Mindwave\Mindwave\Facades\DocumentLoader;

$brain = Mindwave::brain();

// From URL
$brain->consume(
    DocumentLoader::fromUrl('https://laravel.com/docs/11.x/installation')
);

// From PDF
$brain->consume(
    DocumentLoader::fromPdf('/path/to/document.pdf')
);

// From Word document
$brain->consume(
    DocumentLoader::fromWord('/path/to/document.docx')
);
```

## Retrieving Knowledge

### Basic Search

```php
$brain = Mindwave::brain();

// Semantic search returns array of Document objects
$results = $brain->search(
    query: 'How do I authenticate users?',
    count: 5
);

foreach ($results as $doc) {
    echo $doc->content();
    dump($doc->metadata());
}
```

### Using with PromptComposer

```php
use Mindwave\Mindwave\Facades\Mindwave;

$brain = Mindwave::brain();

// Search the Brain
$docs = $brain->search('user authentication', count: 3);

// Build context from results
$context = collect($docs)
    ->map(fn($doc) => $doc->content())
    ->join("\n\n---\n\n");

// Use in prompt
$response = Mindwave::prompt()
    ->section('system', "Use this context:\n\n{$context}")
    ->section('user', 'How do I implement login?')
    ->run();
```

### Using with Context Discovery

```php
use Mindwave\Mindwave\Context\Sources\VectorStoreSource;
use Mindwave\Mindwave\Facades\Mindwave;

// Create a context source from Brain
$vectorSource = VectorStoreSource::fromBrain(
    brain: Mindwave::brain(),
    name: 'knowledge-base'
);

// Use in PromptComposer with automatic context injection
$response = Mindwave::prompt()
    ->context($vectorSource, query: 'user preferences')
    ->section('user', 'What are my notification settings?')
    ->run();
```

## Common Use Cases

### 1. Long-Term Conversation Memory

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\Document\Data\Document;

class ConversationMemoryService
{
    protected $brain;

    public function __construct()
    {
        $this->brain = Mindwave::brain();
    }

    public function storeFact(string $sessionId, string $fact): void
    {
        $this->brain->consume(Document::make(
            content: $fact,
            metadata: [
                'session_id' => $sessionId,
                'type' => 'learned_fact',
                'learned_at' => now()->toIso8601String()
            ]
        ));
    }

    public function chat(string $sessionId, string $message): string
    {
        // Retrieve relevant past facts
        $memories = $this->brain->search(
            query: "{$sessionId} {$message}",
            count: 5
        );

        $context = collect($memories)
            ->map(fn($doc) => "- {$doc->content()}")
            ->join("\n");

        return Mindwave::prompt()
            ->section('system', "Previous conversations:\n{$context}")
            ->section('user', $message)
            ->run();
    }
}
```

### 2. Company Knowledge Base

```php
class CompanyKnowledgeBase
{
    protected $brain;

    public function __construct()
    {
        $this->brain = Mindwave::brain();
    }

    public function indexCompanyDocs(): void
    {
        // HR Policies
        $this->brain->consumeAll([
            DocumentLoader::fromPdf(storage_path('docs/employee-handbook.pdf')),
            DocumentLoader::fromPdf(storage_path('docs/remote-work-policy.pdf')),
        ]);

        // Engineering Docs
        $this->brain->consumeAll([
            DocumentLoader::fromUrl('https://docs.company.com/api'),
            DocumentLoader::fromUrl('https://docs.company.com/architecture'),
        ]);
    }

    public function askHR(string $question): string
    {
        return Mindwave::qa()->answerQuestion($question);
    }
}
```

### 3. Customer Support Knowledge Base

```php
class SupportAssistant
{
    protected $brain;

    public function __construct()
    {
        $this->brain = Mindwave::brain();
    }

    public function loadKnowledgeBase(): void
    {
        $faqs = [
            ['q' => 'How do I reset my password?', 'a' => 'Click "Forgot Password"...'],
            ['q' => 'How do I cancel my subscription?', 'a' => 'Go to Settings > Billing...'],
        ];

        $documents = collect($faqs)->map(fn($faq) =>
            Document::make(
                "Q: {$faq['q']}\nA: {$faq['a']}",
                metadata: ['type' => 'faq']
            )
        );

        $this->brain->consumeAll($documents->toArray());
    }

    public function answer(string $customerQuestion): string
    {
        $relevant = $this->brain->search($customerQuestion, count: 3);

        $context = collect($relevant)
            ->map(fn($doc) => $doc->content())
            ->join("\n\n");

        return Mindwave::prompt()
            ->section('system', "You are a customer support assistant.\n\nFAQs:\n{$context}")
            ->section('user', $customerQuestion)
            ->run();
    }
}
```

## Best Practices

### What to Store in Brain

**Good Candidates:**
- Documentation and knowledge base articles
- Product information and specifications
- Company policies and procedures
- FAQs and common questions
- User preferences and learned facts

**Poor Candidates:**
- Frequently changing data (use database instead)
- Real-time information (use API calls instead)
- Highly structured data (use database queries instead)

### Chunk Size Optimization

```php
use Mindwave\Mindwave\TextSplitters\RecursiveCharacterTextSplitter;
use Mindwave\Mindwave\Brain\Brain;

// For detailed documentation (smaller chunks)
$brain = new Brain(
    vectorstore: Mindwave::vectorStore(),
    embeddings: Mindwave::embeddings(),
    textSplitter: new RecursiveCharacterTextSplitter(
        chunkSize: 500,
        chunkOverlap: 100
    )
);

// Large document will be automatically split
$brain->consume(Document::make($largeText));
```

**Guidelines:**
- **Small chunks (300-600)** - Precise matching, detailed docs
- **Medium chunks (800-1200)** - General purpose, balanced
- **Large chunks (1500-2000)** - Contextual information, summaries

### Performance Optimization

```php
// Bad: Many individual inserts
foreach ($documents as $doc) {
    Mindwave::brain()->consume($doc); // Slow for large batches
}

// Good: Batch operations
Mindwave::brain()->consumeAll($documents); // Much faster
```

## Memory Management

### Updating Knowledge

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\Document\Data\Document;

// Option 1: Add new version with timestamp
Mindwave::brain()->consume(Document::make(
    'Support hours are now 24/7',
    metadata: [
        'category' => 'support',
        'version' => 2,
        'updated_at' => now()->toIso8601String(),
        'replaces' => 'support-hours-v1'
    ]
));

// Option 2: Clear and reload
Mindwave::vectorStore()->truncate();
Mindwave::brain()->consumeAll($updatedDocuments);
```

### Clearing the Brain

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Clear all data
Mindwave::vectorStore()->truncate();

// Check item count
$count = Mindwave::vectorStore()->itemCount();
echo "Vector store has {$count} items";
```

## Brain vs Context Discovery

### When to Use Brain

Use the Brain when you need:

- **Persistent knowledge** across sessions
- **Large knowledge bases** that don't fit in prompts
- **Semantic search** for finding relevant information
- **Document storage** with automatic chunking

```php
// Brain: For stored knowledge
$brain = Mindwave::brain();
$brain->consumeAll($documentationPages);
$results = $brain->search('authentication');
```

### When to Use Context Discovery

Use Context Discovery when you need:

- **Dynamic context** from multiple sources
- **Real-time data** from databases or APIs
- **Automatic prompt fitting** with token limits
- **Combined sources** (Brain + Database + Static)

```php
// Context Discovery: For dynamic, multi-source context
use Mindwave\Mindwave\Context\Sources\{VectorStoreSource, DatabaseSource};

$response = Mindwave::prompt()
    ->context(VectorStoreSource::fromBrain(Mindwave::brain()))
    ->context(DatabaseSource::query(User::find($id)))
    ->section('user', 'What are my settings?')
    ->run();
```

## Related Documentation

- [Context Discovery](/docs/core/context-discovery) - Dynamic multi-source context
- [RAG Overview](/docs/core/rag-overview) - Retrieval-Augmented Generation patterns
- [PromptComposer](/docs/core/prompt-composer) - Auto-fitting prompts
- [Document Loaders](/docs/document-loaders) - Loading various file types
- [Vector Stores](/docs/reference/vector-stores) - Backend storage options
