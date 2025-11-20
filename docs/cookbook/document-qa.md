# Document Q&A System with RAG

Build a complete production-ready Document Q&A system using Retrieval-Augmented Generation (RAG). This cookbook guides you through implementing semantic document search, question answering with source attribution, and scalable document management using Mindwave's RAG capabilities.

## What We're Building

A sophisticated document Q&A system that allows users to ask questions about uploaded documents and receive accurate answers with source citations. The system combines:

-   **Semantic Search**: Find relevant document chunks by meaning, not just keywords
-   **Vector Storage**: Scalable embedding storage with Qdrant
-   **Source Attribution**: Track which documents contributed to each answer
-   **Document Management**: Upload, index, and manage document collections
-   **Cost Tracking**: Monitor API usage and costs with built-in observability
-   **Production-Ready**: Queue-based processing, error handling, and testing

## Features

-   Upload documents (PDF, TXT, Markdown)
-   Automatic chunking and embedding generation
-   Semantic similarity search across documents
-   LLM-powered answer generation with citations
-   Document collection management
-   Real-time Q&A API
-   Frontend interface with source highlighting
-   Comprehensive testing suite

## Prerequisites

Before starting, ensure you have:

-   Laravel 10+ application
-   Mindwave package installed ([Installation Guide](/docs/installation))
-   OpenAI API key configured
-   Docker for running Qdrant vector store
-   Basic understanding of RAG concepts ([RAG Overview](/docs/core/rag-overview))

## What You'll Learn

By following this cookbook, you'll learn:

1. How to set up a production vector store (Qdrant)
2. Document processing pipelines (chunking, embedding, storage)
3. Semantic search implementation with Brain
4. Building Q&A services with PromptComposer
5. Managing document collections at scale
6. Testing RAG systems effectively
7. Production deployment considerations

## Architecture Overview

Our Document Q&A system follows the RAG (Retrieval-Augmented Generation) pattern:

```
┌──────────────────────────────────────────────────────────────┐
│                    User Question                             │
└───────────────────────┬──────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────────────┐
│              Step 1: Semantic Search                          │
│  • Generate query embedding (OpenAI)                          │
│  • Search vector store for similar chunks (Qdrant)            │
│  • Retrieve top K most relevant document chunks               │
└───────────────────────┬───────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────────────┐
│              Step 2: Context Composition                      │
│  • Format retrieved chunks as context                         │
│  • Manage token budget with PromptComposer                    │
│  • Include source metadata for citations                      │
└───────────────────────┬───────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────────────┐
│              Step 3: Answer Generation                        │
│  • Compose prompt: system + context + question                │
│  • Generate answer with LLM (GPT-4)                           │
│  • Extract source citations from response                     │
└───────────────────────┬───────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────────────┐
│              Response with Sources                            │
│  • Answer text                                                │
│  • Source documents (title, page, relevance score)            │
│  • Metadata (tokens used, cost, confidence)                   │
└───────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend                                 │
│  (Upload UI, Question Input, Answer Display)                    │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                   API Controller                                │
│  (Request Validation, Response Formatting)                      │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                 DocumentQAService                               │
│  (Orchestrates retrieval + generation)                          │
└──────┬──────────────────────────────┬──────────────────────┬────┘
       ↓                              ↓                      ↓
┌──────────────┐          ┌────────────────────┐    ┌───────────────┐
│    Brain     │          │  PromptComposer    │    │  LLM Driver   │
│  (Semantic   │  ←───→   │  (Token mgmt,      │    │  (OpenAI)     │
│   Search)    │          │   Composition)     │    │               │
└──────┬───────┘          └────────────────────┘    └───────────────┘
       ↓
┌──────────────────────────────────────────────────────────────────┐
│                    Vector Store (Qdrant)                         │
│  (Embeddings, Similarity Search, Metadata)                       │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Document Ingestion**:

    - User uploads document → Storage (Laravel filesystem)
    - Job processes document → Text extraction
    - Text chunking → RecursiveCharacterTextSplitter (512 chars, 50 overlap)
    - Embedding generation → OpenAI embeddings API
    - Vector storage → Qdrant collection

2. **Question Answering**:
    - User asks question → API endpoint
    - Query embedding → OpenAI
    - Semantic search → Brain searches Qdrant
    - Context retrieval → Top 5 relevant chunks
    - Prompt composition → PromptComposer assembles prompt
    - Answer generation → LLM generates response
    - Response formatting → Include sources and metadata

## Step 1: Environment Setup

### 1.1 Install Qdrant Vector Store

Qdrant is a high-performance vector database perfect for production RAG systems. We'll run it via Docker.

```bash
# Create a Docker Compose file for Qdrant
cat > docker-compose.yml <<EOF
version: '3.8'
services:
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - ./qdrant_storage:/qdrant/storage
    environment:
      - QDRANT__SERVICE__ENABLE_TLS=false
    restart: unless-stopped
EOF

# Start Qdrant
docker-compose up -d qdrant

# Verify Qdrant is running
curl http://localhost:6333/
```

**Expected Response**:

```json
{
    "title": "qdrant - vector search engine",
    "version": "1.7.0"
}
```

### 1.2 Configure Embeddings

Add OpenAI embeddings configuration to your `.env`:

```dotenv
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key
MINDWAVE_EMBEDDINGS_DRIVER=openai
MINDWAVE_EMBEDDINGS_MODEL=text-embedding-3-small

# Qdrant Configuration
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_API_KEY=null
```

### 1.3 Update Mindwave Configuration

Update `config/mindwave.php` to configure the vector store:

```php
<?php

return [
    // ... existing configuration

    'embeddings' => [
        'driver' => env('MINDWAVE_EMBEDDINGS_DRIVER', 'openai'),
        'model' => env('MINDWAVE_EMBEDDINGS_MODEL', 'text-embedding-3-small'),
    ],

    'vectorstores' => [
        'default' => env('MINDWAVE_VECTORSTORE_DRIVER', 'qdrant'),

        'drivers' => [
            'qdrant' => [
                'host' => env('QDRANT_HOST', 'localhost'),
                'port' => env('QDRANT_PORT', 6333),
                'api_key' => env('QDRANT_API_KEY', null),
                'collection' => env('QDRANT_COLLECTION', 'documents'),
            ],
        ],
    ],

    'brains' => [
        'documents' => [
            'vectorstore' => 'qdrant',
            'embeddings' => 'openai',
            'collection' => 'company_documents',
        ],
    ],
];
```

### 1.4 Verify Setup

Create a simple test to verify everything is working:

```bash
php artisan tinker
```

```php
// Test embeddings
$embedding = \Mindwave\Mindwave\Facades\Mindwave::embeddings()
    ->embedText('Hello, world!');

echo "Embedding dimensions: " . count($embedding->values) . "\n";
// Output: Embedding dimensions: 1536

// Test vector store connection
$brain = \Mindwave\Mindwave\Facades\Mindwave::brain('documents');
echo "Brain initialized successfully\n";
```

### 1.5 Create Storage Directory

Set up a directory for document uploads:

```bash
# Create storage directory for documents
mkdir -p storage/app/documents

# Create symbolic link for public access
php artisan storage:link

# Set permissions
chmod -R 775 storage/app/documents
```

## Step 2: Document Processing

### 2.1 Create Document Model

Generate a model to track uploaded documents:

```bash
php artisan make:model Document -m
```

**Migration** (`database/migrations/xxxx_create_documents_table.php`):

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('filename');
            $table->string('filepath');
            $table->string('mime_type');
            $table->bigInteger('file_size'); // bytes
            $table->integer('chunk_count')->default(0);
            $table->enum('status', ['pending', 'processing', 'indexed', 'failed'])->default('pending');
            $table->text('error_message')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('indexed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
```

Run the migration:

```bash
php artisan migrate
```

**Model** (`app/Models/Document.php`):

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Mindwave\Mindwave\Document\Data\Document as MindwaveDocument;

class Document extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'title',
        'filename',
        'filepath',
        'mime_type',
        'file_size',
        'chunk_count',
        'status',
        'error_message',
        'metadata',
        'indexed_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'indexed_at' => 'datetime',
        'file_size' => 'integer',
        'chunk_count' => 'integer',
    ];

    /**
     * Get the full file path.
     */
    public function getFullPathAttribute(): string
    {
        return storage_path('app/' . $this->filepath);
    }

    /**
     * Get file content.
     */
    public function getContent(): string
    {
        if (!file_exists($this->full_path)) {
            throw new \RuntimeException("File not found: {$this->full_path}");
        }

        return file_get_contents($this->full_path);
    }

    /**
     * Convert to Mindwave Document format.
     */
    public function toMindwaveDocument(): MindwaveDocument
    {
        return new MindwaveDocument(
            content: $this->getContent(),
            metadata: [
                'id' => $this->id,
                'title' => $this->title,
                'filename' => $this->filename,
                'mime_type' => $this->mime_type,
                'file_size' => $this->file_size,
                'created_at' => $this->created_at->toIso8601String(),
            ]
        );
    }

    /**
     * Mark document as processing.
     */
    public function markAsProcessing(): void
    {
        $this->update(['status' => 'processing']);
    }

    /**
     * Mark document as indexed.
     */
    public function markAsIndexed(int $chunkCount): void
    {
        $this->update([
            'status' => 'indexed',
            'chunk_count' => $chunkCount,
            'indexed_at' => now(),
            'error_message' => null,
        ]);
    }

    /**
     * Mark document as failed.
     */
    public function markAsFailed(string $error): void
    {
        $this->update([
            'status' => 'failed',
            'error_message' => $error,
        ]);
    }

    /**
     * Check if document is indexed.
     */
    public function isIndexed(): bool
    {
        return $this->status === 'indexed';
    }

    /**
     * Scope: Only indexed documents.
     */
    public function scopeIndexed($query)
    {
        return $query->where('status', 'indexed');
    }
}
```

### 2.2 Create Document Processing Job

Create a job to process and index documents:

```bash
php artisan make:job ProcessDocument
```

**Job** (`app/Jobs/ProcessDocument.php`):

```php
<?php

namespace App\Jobs;

use App\Models\Document;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\TextSplitters\RecursiveCharacterTextSplitter;

class ProcessDocument implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 300; // 5 minutes

    public function __construct(
        public Document $document
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            Log::info("Processing document: {$this->document->id} - {$this->document->title}");

            $this->document->markAsProcessing();

            // 1. Load document content
            $content = $this->document->getContent();

            if (empty($content)) {
                throw new \RuntimeException('Document content is empty');
            }

            // 2. Split into chunks
            $splitter = new RecursiveCharacterTextSplitter(
                chunkSize: 512,        // ~128 tokens (4 chars ≈ 1 token)
                chunkOverlap: 50,      // Preserve context between chunks
                separators: ["\n\n", "\n", '. ', ' ', '']
            );

            $chunks = $splitter->splitText($content);

            if (empty($chunks)) {
                throw new \RuntimeException('No chunks generated from document');
            }

            Log::info("Split document into " . count($chunks) . " chunks");

            // 3. Get Brain instance
            $brain = Mindwave::brain('documents');

            // 4. Process each chunk and add to vector store
            $mindwaveDoc = $this->document->toMindwaveDocument();

            // Split the document and consume it
            // Brain will automatically generate embeddings and store in Qdrant
            $brain->consume($mindwaveDoc);

            // 5. Mark as indexed
            $this->document->markAsIndexed(count($chunks));

            Log::info("Successfully indexed document: {$this->document->id}");

        } catch (\Exception $e) {
            Log::error("Failed to process document {$this->document->id}: {$e->getMessage()}", [
                'exception' => $e,
                'document_id' => $this->document->id,
            ]);

            $this->document->markAsFailed($e->getMessage());

            throw $e;
        }
    }

    /**
     * Handle job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("Job permanently failed for document {$this->document->id}", [
            'exception' => $exception,
        ]);

        $this->document->markAsFailed(
            "Failed after {$this->tries} attempts: {$exception->getMessage()}"
        );
    }
}
```

### 2.3 Document Text Extractor Service

Create a service to extract text from different file formats:

```bash
php artisan make:class Services/DocumentTextExtractor
```

**Service** (`app/Services/DocumentTextExtractor.php`):

````php
<?php

namespace App\Services;

use Illuminate\Support\Str;

class DocumentTextExtractor
{
    /**
     * Extract text from a file based on its MIME type.
     */
    public function extract(string $filepath, string $mimeType): string
    {
        if (!file_exists($filepath)) {
            throw new \RuntimeException("File not found: {$filepath}");
        }

        return match (true) {
            $this->isPlainText($mimeType) => $this->extractPlainText($filepath),
            $this->isMarkdown($mimeType) => $this->extractMarkdown($filepath),
            $this->isPdf($mimeType) => $this->extractPdf($filepath),
            default => throw new \RuntimeException("Unsupported file type: {$mimeType}"),
        };
    }

    /**
     * Extract text from plain text file.
     */
    protected function extractPlainText(string $filepath): string
    {
        return file_get_contents($filepath);
    }

    /**
     * Extract text from Markdown file.
     */
    protected function extractMarkdown(string $filepath): string
    {
        $content = file_get_contents($filepath);

        // Remove markdown code blocks (keep content)
        $content = preg_replace('/```[a-z]*\n(.*?)\n```/s', '$1', $content);

        // Remove markdown links but keep text
        $content = preg_replace('/\[([^\]]+)\]\([^\)]+\)/', '$1', $content);

        // Remove markdown images
        $content = preg_replace('/!\[([^\]]*)\]\([^\)]+\)/', '', $content);

        // Remove headers (#)
        $content = preg_replace('/^#+\s+/m', '', $content);

        return $content;
    }

    /**
     * Extract text from PDF file.
     *
     * Note: Requires smalot/pdfparser package.
     * Install with: composer require smalot/pdfparser
     */
    protected function extractPdf(string $filepath): string
    {
        if (!class_exists(\Smalot\PdfParser\Parser::class)) {
            throw new \RuntimeException(
                'PDF parsing requires smalot/pdfparser. Install with: composer require smalot/pdfparser'
            );
        }

        $parser = new \Smalot\PdfParser\Parser();
        $pdf = $parser->parseFile($filepath);

        return $pdf->getText();
    }

    /**
     * Check if MIME type is plain text.
     */
    protected function isPlainText(string $mimeType): bool
    {
        return Str::startsWith($mimeType, 'text/plain');
    }

    /**
     * Check if MIME type is Markdown.
     */
    protected function isMarkdown(string $mimeType): bool
    {
        return Str::contains($mimeType, ['markdown', 'text/markdown', 'text/x-markdown']);
    }

    /**
     * Check if MIME type is PDF.
     */
    protected function isPdf(string $mimeType): bool
    {
        return $mimeType === 'application/pdf';
    }
}
````

Update the `ProcessDocument` job to use the text extractor:

```php
// In ProcessDocument::handle()

// 1. Extract text from document
$extractor = new \App\Services\DocumentTextExtractor();
$content = $extractor->extract(
    $this->document->full_path,
    $this->document->mime_type
);
```

## Step 3: Building the Q&A Service

Create the core service that handles question answering:

```bash
php artisan make:class Services/DocumentQAService
```

**Service** (`app/Services/DocumentQAService.php`):

```php
<?php

namespace App\Services;

use App\Models\Document;
use Mindwave\Mindwave\Context\Sources\VectorStoreSource;
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\Observability\Models\Trace;
use Illuminate\Support\Facades\Log;

class DocumentQAService
{
    protected string $brainName = 'documents';
    protected string $model = 'gpt-4o';

    /**
     * Ask a question about the documents.
     *
     * @param  string  $question  The user's question
     * @param  array  $options  Additional options (limit, model, etc.)
     * @return array{answer: string, sources: array, metadata: array}
     */
    public function ask(string $question, array $options = []): array
    {
        $limit = $options['limit'] ?? 5;
        $model = $options['model'] ?? $this->model;

        Log::info("DocumentQA: Processing question", [
            'question' => $question,
            'limit' => $limit,
            'model' => $model,
        ]);

        // 1. Create vector store source from Brain
        $brain = Mindwave::brain($this->brainName);
        $vectorSource = VectorStoreSource::fromBrain($brain, name: 'document-vectors');

        // 2. Build the system prompt
        $systemPrompt = $this->getSystemPrompt();

        // 3. Generate answer with context from vector search
        $response = Mindwave::prompt()
            ->section('system', $systemPrompt, priority: 100)
            ->context(
                $vectorSource,
                query: $question,
                limit: $limit,
                priority: 75
            )
            ->section('user', $question, priority: 100)
            ->reserveOutputTokens(800)
            ->model($model)
            ->fit()
            ->run();

        // 4. Extract sources (do manual search to get metadata)
        $sources = $this->extractSources($brain, $question, $limit);

        // 5. Get trace metadata for cost tracking
        $trace = Trace::latest()->first();

        return [
            'answer' => $response->content,
            'sources' => $sources,
            'metadata' => [
                'tokens' => [
                    'input' => $trace?->total_input_tokens ?? 0,
                    'output' => $trace?->total_output_tokens ?? 0,
                    'total' => $trace?->total_tokens ?? 0,
                ],
                'cost' => $trace?->estimated_cost ?? 0,
                'model' => $model,
                'duration_ms' => $trace?->duration ? $trace->duration / 1_000_000 : 0,
            ],
        ];
    }

    /**
     * Ask with streaming response.
     *
     * @param  string  $question
     * @param  callable  $callback  Called with each chunk: fn(string $chunk) => void
     * @param  array  $options
     * @return array{sources: array, metadata: array}
     */
    public function askStreaming(string $question, callable $callback, array $options = []): array
    {
        $limit = $options['limit'] ?? 5;
        $model = $options['model'] ?? $this->model;

        // Create vector source
        $brain = Mindwave::brain($this->brainName);
        $vectorSource = VectorStoreSource::fromBrain($brain, name: 'document-vectors');

        // Build prompt
        $prompt = Mindwave::prompt()
            ->section('system', $this->getSystemPrompt(), priority: 100)
            ->context($vectorSource, query: $question, limit: $limit, priority: 75)
            ->section('user', $question, priority: 100)
            ->reserveOutputTokens(800)
            ->model($model)
            ->fit();

        // Stream response
        $response = Mindwave::driver()
            ->model($model)
            ->streamChat($prompt->toMessages(), $callback);

        // Extract sources
        $sources = $this->extractSources($brain, $question, $limit);

        // Get trace
        $trace = Trace::latest()->first();

        return [
            'sources' => $sources,
            'metadata' => [
                'tokens' => [
                    'input' => $trace?->total_input_tokens ?? 0,
                    'output' => $trace?->total_output_tokens ?? 0,
                    'total' => $trace?->total_tokens ?? 0,
                ],
                'cost' => $trace?->estimated_cost ?? 0,
                'model' => $model,
                'duration_ms' => $trace?->duration ? $trace->duration / 1_000_000 : 0,
            ],
        ];
    }

    /**
     * Get system prompt for document Q&A.
     */
    protected function getSystemPrompt(): string
    {
        return <<<'PROMPT'
You are a knowledgeable document assistant. Your role is to answer questions based ONLY on the provided document context.

Guidelines:
1. Only answer using information from the provided context
2. If the context doesn't contain enough information to answer, say so clearly
3. Cite specific documents when possible (e.g., "According to [Document Title]...")
4. Be concise but thorough in your answers
5. If multiple documents contain relevant information, synthesize them
6. Never make up or hallucinate information not present in the context

Response Format:
- Start with a direct answer to the question
- Provide supporting details from the context
- End with source references when applicable

If you cannot answer the question based on the provided context, respond with:
"I don't have enough information in the available documents to answer this question accurately."
PROMPT;
    }

    /**
     * Extract source documents from search results.
     */
    protected function extractSources($brain, string $query, int $limit): array
    {
        // Perform search to get sources with scores
        $results = $brain->search($query, $limit);

        $sources = [];
        foreach ($results as $result) {
            $metadata = $result->metadata() ?? [];

            $sources[] = [
                'title' => $metadata['title'] ?? 'Untitled',
                'filename' => $metadata['filename'] ?? null,
                'document_id' => $metadata['id'] ?? null,
                'chunk_index' => $metadata['_mindwave_doc_chunk_index'] ?? 0,
                'content_preview' => $this->getPreview($result->content(), 200),
                'relevance_score' => round($metadata['score'] ?? 0, 3),
            ];
        }

        return $sources;
    }

    /**
     * Get preview of content (first N characters).
     */
    protected function getPreview(string $content, int $length = 200): string
    {
        if (strlen($content) <= $length) {
            return $content;
        }

        return substr($content, 0, $length) . '...';
    }

    /**
     * Get statistics about the document collection.
     */
    public function getStats(): array
    {
        return [
            'total_documents' => Document::count(),
            'indexed_documents' => Document::indexed()->count(),
            'pending_documents' => Document::where('status', 'pending')->count(),
            'processing_documents' => Document::where('status', 'processing')->count(),
            'failed_documents' => Document::where('status', 'failed')->count(),
            'total_chunks' => Document::indexed()->sum('chunk_count'),
            'storage_size_bytes' => Document::sum('file_size'),
            'storage_size_mb' => round(Document::sum('file_size') / 1024 / 1024, 2),
        ];
    }

    /**
     * Get cost analytics for a date range.
     */
    public function getCostAnalytics(int $days = 7): array
    {
        $traces = Trace::where('created_at', '>=', now()->subDays($days))
            ->orderBy('created_at', 'desc')
            ->get();

        return [
            'period_days' => $days,
            'total_queries' => $traces->count(),
            'total_cost' => round($traces->sum('estimated_cost'), 4),
            'avg_cost_per_query' => round($traces->avg('estimated_cost'), 4),
            'total_tokens' => $traces->sum('total_tokens'),
            'avg_tokens_per_query' => round($traces->avg('total_tokens'), 0),
            'total_input_tokens' => $traces->sum('total_input_tokens'),
            'total_output_tokens' => $traces->sum('total_output_tokens'),
            'most_expensive_queries' => $traces->sortByDesc('estimated_cost')
                ->take(5)
                ->map(fn($trace) => [
                    'cost' => $trace->estimated_cost,
                    'tokens' => $trace->total_tokens,
                    'created_at' => $trace->created_at->toIso8601String(),
                ])
                ->values()
                ->toArray(),
        ];
    }

    /**
     * Search for similar documents (without generating an answer).
     */
    public function search(string $query, int $limit = 10): array
    {
        $brain = Mindwave::brain($this->brainName);
        $results = $brain->search($query, $limit);

        $documents = [];
        foreach ($results as $result) {
            $metadata = $result->metadata() ?? [];

            $documents[] = [
                'document_id' => $metadata['id'] ?? null,
                'title' => $metadata['title'] ?? 'Untitled',
                'filename' => $metadata['filename'] ?? null,
                'chunk_index' => $metadata['_mindwave_doc_chunk_index'] ?? 0,
                'content' => $result->content(),
                'relevance_score' => round($metadata['score'] ?? 0, 3),
                'metadata' => $metadata,
            ];
        }

        return $documents;
    }
}
```

## Step 4: Controller & Routes

Create the API endpoints for document Q&A:

```bash
php artisan make:controller Api/DocumentQAController
```

**Controller** (`app/Http/Controllers/Api/DocumentQAController.php`):

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DocumentQAService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentQAController extends Controller
{
    public function __construct(
        protected DocumentQAService $qaService
    ) {}

    /**
     * Ask a question about documents.
     *
     * POST /api/document-qa/ask
     * Body: { "question": "What is...?", "limit": 5, "model": "gpt-4o" }
     */
    public function ask(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'question' => 'required|string|min:3|max:500',
            'limit' => 'sometimes|integer|min:1|max:20',
            'model' => 'sometimes|string|in:gpt-4o,gpt-4o-mini,gpt-4-turbo',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        try {
            $result = $this->qaService->ask(
                question: $request->input('question'),
                options: [
                    'limit' => $request->input('limit', 5),
                    'model' => $request->input('model', 'gpt-4o'),
                ]
            );

            return response()->json([
                'success' => true,
                'data' => $result,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to process question',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Ask a question with streaming response.
     *
     * POST /api/document-qa/ask-stream
     * Body: { "question": "What is...?", "limit": 5 }
     * Returns: text/event-stream
     */
    public function askStream(Request $request): StreamedResponse
    {
        $validator = Validator::make($request->all(), [
            'question' => 'required|string|min:3|max:500',
            'limit' => 'sometimes|integer|min:1|max:20',
            'model' => 'sometimes|string|in:gpt-4o,gpt-4o-mini,gpt-4-turbo',
        ]);

        if ($validator->fails()) {
            return response()->stream(function () use ($validator) {
                echo "data: " . json_encode([
                    'error' => 'Validation failed',
                    'messages' => $validator->errors(),
                ]) . "\n\n";
                flush();
            }, 422, [
                'Content-Type' => 'text/event-stream',
                'Cache-Control' => 'no-cache',
                'X-Accel-Buffering' => 'no',
            ]);
        }

        return response()->stream(function () use ($request) {
            try {
                // Send initial metadata
                echo "data: " . json_encode(['type' => 'start']) . "\n\n";
                flush();

                // Stream answer
                $metadata = $this->qaService->askStreaming(
                    question: $request->input('question'),
                    callback: function (string $chunk) {
                        echo "data: " . json_encode([
                            'type' => 'chunk',
                            'content' => $chunk,
                        ]) . "\n\n";
                        flush();
                    },
                    options: [
                        'limit' => $request->input('limit', 5),
                        'model' => $request->input('model', 'gpt-4o'),
                    ]
                );

                // Send sources and metadata
                echo "data: " . json_encode([
                    'type' => 'sources',
                    'sources' => $metadata['sources'],
                ]) . "\n\n";
                flush();

                echo "data: " . json_encode([
                    'type' => 'metadata',
                    'metadata' => $metadata['metadata'],
                ]) . "\n\n";
                flush();

                // Send done signal
                echo "data: " . json_encode(['type' => 'done']) . "\n\n";
                flush();

            } catch (\Exception $e) {
                echo "data: " . json_encode([
                    'type' => 'error',
                    'message' => $e->getMessage(),
                ]) . "\n\n";
                flush();
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * Search for similar documents without generating an answer.
     *
     * POST /api/document-qa/search
     * Body: { "query": "search term", "limit": 10 }
     */
    public function search(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'query' => 'required|string|min:2|max:500',
            'limit' => 'sometimes|integer|min:1|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        try {
            $results = $this->qaService->search(
                query: $request->input('query'),
                limit: $request->input('limit', 10)
            );

            return response()->json([
                'success' => true,
                'data' => $results,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Search failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get statistics about the document collection.
     *
     * GET /api/document-qa/stats
     */
    public function stats(): JsonResponse
    {
        try {
            $stats = $this->qaService->getStats();

            return response()->json([
                'success' => true,
                'data' => $stats,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to retrieve stats',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get cost analytics.
     *
     * GET /api/document-qa/analytics?days=7
     */
    public function analytics(Request $request): JsonResponse
    {
        $days = (int) $request->input('days', 7);

        if ($days < 1 || $days > 365) {
            return response()->json([
                'error' => 'Days must be between 1 and 365',
            ], 422);
        }

        try {
            $analytics = $this->qaService->getCostAnalytics($days);

            return response()->json([
                'success' => true,
                'data' => $analytics,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to retrieve analytics',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
```

**Routes** (`routes/api.php`):

```php
<?php

use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\DocumentQAController;
use Illuminate\Support\Facades\Route;

// Document Q&A endpoints
Route::prefix('document-qa')->group(function () {
    Route::post('/ask', [DocumentQAController::class, 'ask']);
    Route::post('/ask-stream', [DocumentQAController::class, 'askStream']);
    Route::post('/search', [DocumentQAController::class, 'search']);
    Route::get('/stats', [DocumentQAController::class, 'stats']);
    Route::get('/analytics', [DocumentQAController::class, 'analytics']);
});

// Document management endpoints (see Step 5)
Route::apiResource('documents', DocumentController::class);
Route::post('documents/{document}/reindex', [DocumentController::class, 'reindex']);
```

## Step 5: Document Management

Create endpoints for uploading and managing documents:

```bash
php artisan make:controller Api/DocumentController --api
```

**Controller** (`app/Http/Controllers/Api/DocumentController.php`):

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessDocument;
use App\Models\Document;
use App\Services\DocumentTextExtractor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class DocumentController extends Controller
{
    /**
     * List all documents.
     *
     * GET /api/documents
     */
    public function index(Request $request): JsonResponse
    {
        $query = Document::query();

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        // Sort
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Paginate
        $perPage = min((int) $request->input('per_page', 15), 100);
        $documents = $query->paginate($perPage);

        return response()->json($documents);
    }

    /**
     * Upload and process a new document.
     *
     * POST /api/documents
     * Body: multipart/form-data with "file" and optional "title"
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:txt,pdf,md|max:10240', // 10MB max
            'title' => 'sometimes|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        try {
            $file = $request->file('file');
            $filename = $file->getClientOriginalName();
            $title = $request->input('title', pathinfo($filename, PATHINFO_FILENAME));

            // Store file
            $filepath = $file->store('documents', 'local');

            // Create document record
            $document = Document::create([
                'title' => $title,
                'filename' => $filename,
                'filepath' => $filepath,
                'mime_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
                'status' => 'pending',
            ]);

            // Dispatch processing job
            ProcessDocument::dispatch($document);

            return response()->json([
                'success' => true,
                'message' => 'Document uploaded and queued for processing',
                'data' => $document,
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to upload document',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Show document details.
     *
     * GET /api/documents/{id}
     */
    public function show(Document $document): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $document,
        ]);
    }

    /**
     * Update document metadata.
     *
     * PUT/PATCH /api/documents/{id}
     */
    public function update(Request $request, Document $document): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:255',
            'metadata' => 'sometimes|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        $document->update($request->only(['title', 'metadata']));

        return response()->json([
            'success' => true,
            'message' => 'Document updated',
            'data' => $document,
        ]);
    }

    /**
     * Delete document.
     *
     * DELETE /api/documents/{id}
     */
    public function destroy(Document $document): JsonResponse
    {
        try {
            // Delete file from storage
            if (Storage::exists($document->filepath)) {
                Storage::delete($document->filepath);
            }

            // Soft delete document record
            $document->delete();

            // Note: Vector embeddings remain in Qdrant
            // Use truncate command to clear all embeddings if needed

            return response()->json([
                'success' => true,
                'message' => 'Document deleted',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to delete document',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reindex a document (re-process and update embeddings).
     *
     * POST /api/documents/{id}/reindex
     */
    public function reindex(Document $document): JsonResponse
    {
        if ($document->status === 'processing') {
            return response()->json([
                'error' => 'Document is already being processed',
            ], 409);
        }

        try {
            // Reset status
            $document->update([
                'status' => 'pending',
                'chunk_count' => 0,
                'indexed_at' => null,
                'error_message' => null,
            ]);

            // Dispatch processing job
            ProcessDocument::dispatch($document);

            return response()->json([
                'success' => true,
                'message' => 'Document queued for reindexing',
                'data' => $document,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to reindex document',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
```

### Artisan Commands

Create helpful Artisan commands for document management:

```bash
php artisan make:command IndexAllDocuments
php artisan make:command ClearDocumentIndex
```

**Command: Index All Documents** (`app/Console/Commands/IndexAllDocuments.php`):

```php
<?php

namespace App\Console\Commands;

use App\Jobs\ProcessDocument;
use App\Models\Document;
use Illuminate\Console\Command;

class IndexAllDocuments extends Command
{
    protected $signature = 'documents:index-all
                            {--force : Reindex all documents, even if already indexed}
                            {--status=* : Only index documents with specific status}';

    protected $description = 'Index all documents in the database';

    public function handle(): int
    {
        $query = Document::query();

        // Filter by status
        if ($statuses = $this->option('status')) {
            $query->whereIn('status', $statuses);
        } elseif (!$this->option('force')) {
            // Only index pending/failed documents by default
            $query->whereIn('status', ['pending', 'failed']);
        }

        $documents = $query->get();
        $count = $documents->count();

        if ($count === 0) {
            $this->info('No documents to index.');
            return Command::SUCCESS;
        }

        $this->info("Indexing {$count} documents...");

        $bar = $this->output->createProgressBar($count);
        $bar->start();

        foreach ($documents as $document) {
            // Reset status if forcing reindex
            if ($this->option('force') && $document->status === 'indexed') {
                $document->update(['status' => 'pending']);
            }

            ProcessDocument::dispatch($document);
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();

        $this->info("Queued {$count} documents for indexing.");

        return Command::SUCCESS;
    }
}
```

**Command: Clear Document Index** (`app/Console/Commands/ClearDocumentIndex.php`):

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Mindwave\Mindwave\Facades\Mindwave;

class ClearDocumentIndex extends Command
{
    protected $signature = 'documents:clear-index
                            {--brain=documents : Brain name to clear}';

    protected $description = 'Clear all embeddings from the document index';

    public function handle(): int
    {
        $brainName = $this->option('brain');

        if (!$this->confirm("This will delete ALL embeddings from the '{$brainName}' brain. Continue?")) {
            $this->info('Cancelled.');
            return Command::SUCCESS;
        }

        try {
            $brain = Mindwave::brain($brainName);

            // Truncate the vector store
            $brain->vectorstore->truncate();

            $this->info("Successfully cleared the '{$brainName}' brain.");
            $this->warn('Note: Document records still exist. Run documents:index-all to rebuild the index.');

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error("Failed to clear index: {$e->getMessage()}");
            return Command::FAILURE;
        }
    }
}
```

## Step 6: Frontend Interface

Create a simple web interface for document Q&A:

**Blade View** (`resources/views/document-qa.blade.php`):

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="csrf-token" content="{{ csrf_token() }}" />
        <title>Document Q&A</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            .source-card {
                transition: all 0.2s;
            }
            .source-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
        </style>
    </head>
    <body class="bg-gray-50 min-h-screen">
        <div class="container mx-auto px-4 py-8 max-w-6xl">
            <!-- Header -->
            <div class="mb-8">
                <h1 class="text-4xl font-bold text-gray-900 mb-2">
                    Document Q&A
                </h1>
                <p class="text-gray-600">
                    Ask questions about your uploaded documents
                </p>
            </div>

            <!-- Stats -->
            <div id="stats" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <!-- Stats will be populated here -->
            </div>

            <!-- Document Upload Section -->
            <div class="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 class="text-2xl font-semibold mb-4">Upload Document</h2>
                <form id="upload-form" enctype="multipart/form-data">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label
                                class="block text-sm font-medium text-gray-700 mb-2"
                                >File</label
                            >
                            <input
                                type="file"
                                id="file-input"
                                name="file"
                                accept=".txt,.pdf,.md"
                                required
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                            <p class="text-xs text-gray-500 mt-1">
                                Supported: TXT, PDF, Markdown (max 10MB)
                            </p>
                        </div>
                        <div>
                            <label
                                class="block text-sm font-medium text-gray-700 mb-2"
                                >Title (optional)</label
                            >
                            <input
                                type="text"
                                id="title-input"
                                name="title"
                                placeholder="Document title"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
                    >
                        Upload Document
                    </button>
                </form>
                <div id="upload-status" class="mt-4"></div>
            </div>

            <!-- Q&A Section -->
            <div class="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 class="text-2xl font-semibold mb-4">Ask a Question</h2>

                <form id="question-form">
                    <div class="mb-4">
                        <textarea
                            id="question-input"
                            rows="3"
                            placeholder="What would you like to know about your documents?"
                            class="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        ></textarea>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label
                                class="block text-sm font-medium text-gray-700 mb-2"
                                >Model</label
                            >
                            <select
                                id="model-select"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md"
                            >
                                <option value="gpt-4o" selected>
                                    GPT-4o (Best)
                                </option>
                                <option value="gpt-4o-mini">
                                    GPT-4o Mini (Fast)
                                </option>
                                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                            </select>
                        </div>
                        <div>
                            <label
                                class="block text-sm font-medium text-gray-700 mb-2"
                                >Context Limit</label
                            >
                            <select
                                id="limit-select"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md"
                            >
                                <option value="3">3 chunks</option>
                                <option value="5" selected>5 chunks</option>
                                <option value="8">8 chunks</option>
                                <option value="10">10 chunks</option>
                            </select>
                        </div>
                        <div class="flex items-end">
                            <button
                                type="submit"
                                id="ask-button"
                                class="w-full bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition"
                            >
                                Ask Question
                            </button>
                        </div>
                    </div>
                </form>

                <!-- Answer Display -->
                <div id="answer-section" class="hidden mt-6">
                    <div class="border-t pt-6">
                        <h3 class="text-xl font-semibold mb-4">Answer</h3>
                        <div
                            id="answer-text"
                            class="prose max-w-none bg-gray-50 p-4 rounded-md mb-4"
                        ></div>

                        <!-- Metadata -->
                        <div
                            id="metadata"
                            class="text-sm text-gray-600 mb-4 grid grid-cols-2 md:grid-cols-4 gap-2"
                        ></div>

                        <!-- Sources -->
                        <h4 class="text-lg font-semibold mb-3">Sources</h4>
                        <div
                            id="sources"
                            class="grid grid-cols-1 md:grid-cols-2 gap-4"
                        ></div>
                    </div>
                </div>

                <!-- Loading Indicator -->
                <div id="loading" class="hidden mt-6 text-center">
                    <div
                        class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"
                    ></div>
                    <p class="text-gray-600 mt-2">Thinking...</p>
                </div>
            </div>
        </div>

        <script>
            // Load stats on page load
            document.addEventListener('DOMContentLoaded', () => {
                loadStats();
            });

            // Load statistics
            async function loadStats() {
                try {
                    const response = await fetch('/api/document-qa/stats');
                    const { data } = await response.json();

                    document.getElementById('stats').innerHTML = `
                    <div class="bg-white rounded-lg shadow p-4">
                        <div class="text-sm text-gray-600">Total Documents</div>
                        <div class="text-2xl font-bold text-gray-900">${data.total_documents}</div>
                    </div>
                    <div class="bg-white rounded-lg shadow p-4">
                        <div class="text-sm text-gray-600">Indexed</div>
                        <div class="text-2xl font-bold text-green-600">${data.indexed_documents}</div>
                    </div>
                    <div class="bg-white rounded-lg shadow p-4">
                        <div class="text-sm text-gray-600">Total Chunks</div>
                        <div class="text-2xl font-bold text-blue-600">${data.total_chunks}</div>
                    </div>
                    <div class="bg-white rounded-lg shadow p-4">
                        <div class="text-sm text-gray-600">Storage</div>
                        <div class="text-2xl font-bold text-purple-600">${data.storage_size_mb} MB</div>
                    </div>
                `;
                } catch (error) {
                    console.error('Failed to load stats:', error);
                }
            }

            // Document upload
            document
                .getElementById('upload-form')
                .addEventListener('submit', async (e) => {
                    e.preventDefault();

                    const formData = new FormData();
                    const fileInput = document.getElementById('file-input');
                    const titleInput = document.getElementById('title-input');

                    formData.append('file', fileInput.files[0]);
                    if (titleInput.value) {
                        formData.append('title', titleInput.value);
                    }

                    const statusDiv = document.getElementById('upload-status');
                    statusDiv.innerHTML =
                        '<p class="text-blue-600">Uploading...</p>';

                    try {
                        const response = await fetch('/api/documents', {
                            method: 'POST',
                            headers: {
                                'X-CSRF-TOKEN': document.querySelector(
                                    'meta[name="csrf-token"]'
                                ).content,
                            },
                            body: formData,
                        });

                        const result = await response.json();

                        if (result.success) {
                            statusDiv.innerHTML =
                                '<p class="text-green-600">Document uploaded! Processing in background...</p>';
                            fileInput.value = '';
                            titleInput.value = '';
                            setTimeout(loadStats, 1000); // Reload stats
                        } else {
                            statusDiv.innerHTML = `<p class="text-red-600">Error: ${result.message}</p>`;
                        }
                    } catch (error) {
                        statusDiv.innerHTML = `<p class="text-red-600">Upload failed: ${error.message}</p>`;
                    }
                });

            // Question submission
            document
                .getElementById('question-form')
                .addEventListener('submit', async (e) => {
                    e.preventDefault();

                    const question = document
                        .getElementById('question-input')
                        .value.trim();
                    if (!question) return;

                    const model = document.getElementById('model-select').value;
                    const limit = parseInt(
                        document.getElementById('limit-select').value
                    );

                    // Show loading
                    document
                        .getElementById('loading')
                        .classList.remove('hidden');
                    document
                        .getElementById('answer-section')
                        .classList.add('hidden');

                    try {
                        const response = await fetch('/api/document-qa/ask', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-TOKEN': document.querySelector(
                                    'meta[name="csrf-token"]'
                                ).content,
                            },
                            body: JSON.stringify({ question, model, limit }),
                        });

                        const result = await response.json();

                        if (result.success) {
                            displayAnswer(result.data);
                        } else {
                            alert('Error: ' + result.message);
                        }
                    } catch (error) {
                        alert('Request failed: ' + error.message);
                    } finally {
                        document
                            .getElementById('loading')
                            .classList.add('hidden');
                    }
                });

            // Display answer and sources
            function displayAnswer(data) {
                const answerSection = document.getElementById('answer-section');
                const answerText = document.getElementById('answer-text');
                const metadata = document.getElementById('metadata');
                const sources = document.getElementById('sources');

                // Display answer
                answerText.innerHTML = data.answer.replace(/\n/g, '<br>');

                // Display metadata
                metadata.innerHTML = `
                <div><strong>Tokens:</strong> ${
                    data.metadata.tokens.total
                }</div>
                <div><strong>Cost:</strong> $${data.metadata.cost.toFixed(
                    4
                )}</div>
                <div><strong>Model:</strong> ${data.metadata.model}</div>
                <div><strong>Duration:</strong> ${Math.round(
                    data.metadata.duration_ms
                )}ms</div>
            `;

                // Display sources
                sources.innerHTML = data.sources
                    .map(
                        (source, idx) => `
                <div class="source-card bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div class="flex justify-between items-start mb-2">
                        <h5 class="font-semibold text-gray-900">${
                            source.title
                        }</h5>
                        <span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                            ${(source.relevance_score * 100).toFixed(0)}%
                        </span>
                    </div>
                    <p class="text-sm text-gray-600 mb-2">${
                        source.filename || 'N/A'
                    }</p>
                    <p class="text-sm text-gray-700 line-clamp-3">${
                        source.content_preview
                    }</p>
                    <p class="text-xs text-gray-500 mt-2">Chunk ${
                        source.chunk_index
                    }</p>
                </div>
            `
                    )
                    .join('');

                answerSection.classList.remove('hidden');
            }
        </script>
    </body>
</html>
```

**Route** (`routes/web.php`):

```php
Route::get('/document-qa', function () {
    return view('document-qa');
})->name('document-qa');
```

## Step 7: Testing

Create comprehensive tests for the Document Q&A system:

### Unit Tests

**Test: DocumentQAService** (`tests/Unit/Services/DocumentQAServiceTest.php`):

```php
<?php

namespace Tests\Unit\Services;

use App\Models\Document;
use App\Services\DocumentQAService;
use Mindwave\Mindwave\Facades\Mindwave;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class DocumentQAServiceTest extends TestCase
{
    use RefreshDatabase;

    protected DocumentQAService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new DocumentQAService();
    }

    /** @test */
    public function it_can_answer_questions_about_documents()
    {
        // Create a test document
        $document = Document::factory()->create([
            'status' => 'indexed',
            'chunk_count' => 5,
        ]);

        // Mock Brain response
        // In real tests, you'd populate the vector store with test data

        $result = $this->service->ask('What is the main topic?');

        $this->assertIsArray($result);
        $this->assertArrayHasKey('answer', $result);
        $this->assertArrayHasKey('sources', $result);
        $this->assertArrayHasKey('metadata', $result);
        $this->assertIsString($result['answer']);
    }

    /** @test */
    public function it_returns_sources_with_relevance_scores()
    {
        $result = $this->service->ask('Test question');

        $this->assertIsArray($result['sources']);

        foreach ($result['sources'] as $source) {
            $this->assertArrayHasKey('title', $source);
            $this->assertArrayHasKey('relevance_score', $source);
            $this->assertArrayHasKey('content_preview', $source);
        }
    }

    /** @test */
    public function it_tracks_token_usage_and_cost()
    {
        $result = $this->service->ask('Test question');

        $this->assertArrayHasKey('metadata', $result);
        $this->assertArrayHasKey('tokens', $result['metadata']);
        $this->assertArrayHasKey('cost', $result['metadata']);
        $this->assertIsNumeric($result['metadata']['cost']);
    }

    /** @test */
    public function it_can_search_without_generating_answer()
    {
        $results = $this->service->search('test query', limit: 5);

        $this->assertIsArray($results);
        $this->assertLessThanOrEqual(5, count($results));
    }

    /** @test */
    public function it_provides_collection_statistics()
    {
        Document::factory()->count(3)->create(['status' => 'indexed']);
        Document::factory()->count(2)->create(['status' => 'pending']);

        $stats = $this->service->getStats();

        $this->assertEquals(5, $stats['total_documents']);
        $this->assertEquals(3, $stats['indexed_documents']);
        $this->assertEquals(2, $stats['pending_documents']);
    }

    /** @test */
    public function it_provides_cost_analytics()
    {
        $analytics = $this->service->getCostAnalytics(days: 7);

        $this->assertArrayHasKey('total_queries', $analytics);
        $this->assertArrayHasKey('total_cost', $analytics);
        $this->assertArrayHasKey('avg_cost_per_query', $analytics);
        $this->assertArrayHasKey('period_days', $analytics);
        $this->assertEquals(7, $analytics['period_days']);
    }
}
```

### Feature Tests

**Test: Document Q&A API** (`tests/Feature/Api/DocumentQAControllerTest.php`):

```php
<?php

namespace Tests\Feature\Api;

use App\Models\Document;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class DocumentQAControllerTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function it_can_ask_questions_via_api()
    {
        Document::factory()->create(['status' => 'indexed']);

        $response = $this->postJson('/api/document-qa/ask', [
            'question' => 'What is the main topic?',
            'limit' => 5,
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'answer',
                    'sources',
                    'metadata' => [
                        'tokens',
                        'cost',
                        'model',
                    ],
                ],
            ]);
    }

    /** @test */
    public function it_validates_question_input()
    {
        $response = $this->postJson('/api/document-qa/ask', [
            'question' => 'AB', // Too short
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['question']);
    }

    /** @test */
    public function it_can_search_documents_via_api()
    {
        $response = $this->postJson('/api/document-qa/search', [
            'query' => 'test query',
            'limit' => 10,
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data',
            ]);
    }

    /** @test */
    public function it_returns_statistics()
    {
        Document::factory()->count(5)->create();

        $response = $this->getJson('/api/document-qa/stats');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'total_documents',
                    'indexed_documents',
                    'pending_documents',
                    'total_chunks',
                    'storage_size_mb',
                ],
            ]);
    }

    /** @test */
    public function it_returns_cost_analytics()
    {
        $response = $this->getJson('/api/document-qa/analytics?days=30');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'period_days',
                    'total_queries',
                    'total_cost',
                    'avg_cost_per_query',
                ],
            ]);
    }
}
```

**Test: Document Management** (`tests/Feature/Api/DocumentControllerTest.php`):

```php
<?php

namespace Tests\Feature\Api;

use App\Models\Document;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DocumentControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    /** @test */
    public function it_can_upload_a_document()
    {
        $file = UploadedFile::fake()->create('test.txt', 100, 'text/plain');

        $response = $this->postJson('/api/documents', [
            'file' => $file,
            'title' => 'Test Document',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'id',
                    'title',
                    'filename',
                    'status',
                ],
            ]);

        $this->assertDatabaseHas('documents', [
            'title' => 'Test Document',
            'filename' => 'test.txt',
            'status' => 'pending',
        ]);
    }

    /** @test */
    public function it_validates_file_upload()
    {
        $response = $this->postJson('/api/documents', [
            'file' => 'not-a-file',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    /** @test */
    public function it_can_list_documents()
    {
        Document::factory()->count(3)->create();

        $response = $this->getJson('/api/documents');

        $response->assertStatus(200)
            ->assertJsonCount(3, 'data');
    }

    /** @test */
    public function it_can_filter_documents_by_status()
    {
        Document::factory()->create(['status' => 'indexed']);
        Document::factory()->create(['status' => 'pending']);

        $response = $this->getJson('/api/documents?status=indexed');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    /** @test */
    public function it_can_show_document_details()
    {
        $document = Document::factory()->create();

        $response = $this->getJson("/api/documents/{$document->id}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $document->id,
                    'title' => $document->title,
                ],
            ]);
    }

    /** @test */
    public function it_can_update_document_metadata()
    {
        $document = Document::factory()->create(['title' => 'Old Title']);

        $response = $this->putJson("/api/documents/{$document->id}", [
            'title' => 'New Title',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('documents', [
            'id' => $document->id,
            'title' => 'New Title',
        ]);
    }

    /** @test */
    public function it_can_delete_a_document()
    {
        Storage::fake('local');
        $document = Document::factory()->create();

        $response = $this->deleteJson("/api/documents/{$document->id}");

        $response->assertStatus(200);
        $this->assertSoftDeleted('documents', ['id' => $document->id]);
    }

    /** @test */
    public function it_can_reindex_a_document()
    {
        $document = Document::factory()->create(['status' => 'indexed']);

        $response = $this->postJson("/api/documents/{$document->id}/reindex");

        $response->assertStatus(200);

        $this->assertDatabaseHas('documents', [
            'id' => $document->id,
            'status' => 'pending',
        ]);
    }
}
```

**Factory** (`database/factories/DocumentFactory.php`):

```php
<?php

namespace Database\Factories;

use App\Models\Document;
use Illuminate\Database\Eloquent\Factories\Factory;

class DocumentFactory extends Factory
{
    protected $model = Document::class;

    public function definition(): array
    {
        return [
            'title' => $this->faker->sentence(3),
            'filename' => $this->faker->word() . '.txt',
            'filepath' => 'documents/' . $this->faker->uuid() . '.txt',
            'mime_type' => 'text/plain',
            'file_size' => $this->faker->numberBetween(1000, 1000000),
            'chunk_count' => $this->faker->numberBetween(1, 50),
            'status' => 'indexed',
            'metadata' => [],
            'indexed_at' => now(),
        ];
    }

    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'pending',
            'chunk_count' => 0,
            'indexed_at' => null,
        ]);
    }

    public function processing(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'processing',
            'chunk_count' => 0,
            'indexed_at' => null,
        ]);
    }

    public function failed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'failed',
            'chunk_count' => 0,
            'indexed_at' => null,
            'error_message' => 'Processing failed',
        ]);
    }
}
```

## Step 8: Enhancements

### 8.1 Hybrid Search (BM25 + Vector)

Combine keyword-based and semantic search for better retrieval:

```php
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;
use Mindwave\Mindwave\Context\Sources\VectorStoreSource;
use Mindwave\Mindwave\Context\ContextPipeline;

class EnhancedDocumentQAService extends DocumentQAService
{
    public function ask(string $question, array $options = []): array
    {
        $limit = $options['limit'] ?? 5;

        // Create BM25 source (keyword search)
        $bm25Source = TntSearchSource::fromEloquent(
            Document::indexed(),
            fn($doc) => "{$doc->title}\n\n{$doc->getContent()}",
            name: 'documents-bm25'
        );

        // Create vector source (semantic search)
        $brain = Mindwave::brain('documents');
        $vectorSource = VectorStoreSource::fromBrain($brain, name: 'documents-vector');

        // Combine in pipeline
        $pipeline = (new ContextPipeline)
            ->addSource($bm25Source)      // Exact keyword matches
            ->addSource($vectorSource)    // Semantic matches
            ->deduplicate(true)           // Remove duplicates
            ->rerank(true);               // Best results first

        // Generate answer
        $response = Mindwave::prompt()
            ->section('system', $this->getSystemPrompt(), priority: 100)
            ->context($pipeline, query: $question, limit: $limit, priority: 75)
            ->section('user', $question, priority: 100)
            ->reserveOutputTokens(800)
            ->model($options['model'] ?? 'gpt-4o')
            ->fit()
            ->run();

        // ... rest of implementation
    }
}
```

### 8.2 Multi-Document Collections

Organize documents into collections:

```bash
php artisan make:migration create_document_collections_table
```

```php
Schema::create('document_collections', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->text('description')->nullable();
    $table->string('brain_name')->unique();
    $table->timestamps();
});

Schema::table('documents', function (Blueprint $table) {
    $table->foreignId('collection_id')->nullable()->constrained('document_collections');
});
```

**Service Enhancement**:

```php
class DocumentQAService
{
    public function __construct(
        protected ?string $collectionName = null
    ) {}

    public function ask(string $question, array $options = []): array
    {
        // Get collection-specific brain
        $brainName = $this->collectionName
            ? "collection_{$this->collectionName}"
            : 'documents';

        $brain = Mindwave::brain($brainName);
        // ... rest of implementation
    }
}

// Usage
$techDocsQA = new DocumentQAService(collectionName: 'technical-docs');
$result = $techDocsQA->ask('How do I configure the API?');
```

### 8.3 Conversation History

Add conversation context for follow-up questions:

```php
class ConversationalQAService extends DocumentQAService
{
    protected array $conversationHistory = [];

    public function ask(string $question, array $options = []): array
    {
        // Get context sources
        $brain = Mindwave::brain('documents');
        $vectorSource = VectorStoreSource::fromBrain($brain);

        // Build prompt with conversation history
        $prompt = Mindwave::prompt()
            ->section('system', $this->getSystemPrompt(), priority: 100);

        // Add conversation history
        foreach ($this->conversationHistory as $turn) {
            $prompt->section('user', $turn['question'], priority: 90);
            $prompt->section('assistant', $turn['answer'], priority: 90);
        }

        // Add current question with context
        $prompt->context($vectorSource, query: $question, limit: 5, priority: 75)
               ->section('user', $question, priority: 100)
               ->reserveOutputTokens(800)
               ->model($options['model'] ?? 'gpt-4o')
               ->fit();

        $response = $prompt->run();

        // Store in history
        $this->conversationHistory[] = [
            'question' => $question,
            'answer' => $response->content,
        ];

        return [
            'answer' => $response->content,
            // ... rest of response
        ];
    }

    public function clearHistory(): void
    {
        $this->conversationHistory = [];
    }
}
```

### 8.4 Answer Confidence Scoring

Add confidence scores based on source relevance:

```php
class DocumentQAService
{
    protected function calculateConfidence(array $sources): float
    {
        if (empty($sources)) {
            return 0.0;
        }

        // Average of top 3 source scores
        $topScores = array_slice(
            array_column($sources, 'relevance_score'),
            0,
            3
        );

        return round(array_sum($topScores) / count($topScores), 2);
    }

    public function ask(string $question, array $options = []): array
    {
        // ... existing implementation

        $confidence = $this->calculateConfidence($sources);

        return [
            'answer' => $response->content,
            'sources' => $sources,
            'confidence' => $confidence,
            'confidence_level' => match (true) {
                $confidence >= 0.8 => 'high',
                $confidence >= 0.5 => 'medium',
                default => 'low',
            },
            'metadata' => [/* ... */],
        ];
    }
}
```

## Production Considerations

### 9.1 Embedding Cost Optimization

Reduce embedding API costs:

```php
// Cache embeddings for common queries
use Illuminate\Support\Facades\Cache;

class CachedEmbeddingsService
{
    public function embedQuery(string $query): EmbeddingVector
    {
        $cacheKey = 'embedding:' . md5($query);

        return Cache::remember($cacheKey, now()->addDays(7), function () use ($query) {
            return Mindwave::embeddings()->embedText($query);
        });
    }
}

// Batch process documents to reduce API calls
class OptimizedProcessDocument extends ProcessDocument
{
    public function handle(): void
    {
        // Process in batches
        $chunks = $this->chunkDocument();

        $chunkBatches = array_chunk($chunks, 50); // 50 chunks per batch

        foreach ($chunkBatches as $batch) {
            // Use embedDocuments (batch API) instead of embedDocument
            $embeddings = Mindwave::embeddings()->embedDocuments($batch);

            // Store all at once
            $brain->insertMany($embeddings);
        }
    }
}
```

### 9.2 Vector Store Scaling

Scale Qdrant for production:

```yaml
# docker-compose.production.yml
version: '3.8'
services:
    qdrant:
        image: qdrant/qdrant:latest
        ports:
            - '6333:6333'
        volumes:
            - qdrant_data:/qdrant/storage
        environment:
            - QDRANT__SERVICE__GRPC_PORT=6334
            - QDRANT__SERVICE__HTTP_PORT=6333
        deploy:
            resources:
                limits:
                    memory: 4G
                reservations:
                    memory: 2G
        restart: always

volumes:
    qdrant_data:
        driver: local
```

**Sharding Strategy** for millions of documents:

```php
// Use separate collections per tenant/category
$brainConfig = [
    'tenant_1' => 'collection_tenant_1',
    'tenant_2' => 'collection_tenant_2',
    'technical_docs' => 'collection_tech',
    'marketing_docs' => 'collection_marketing',
];

class ShardedDocumentQAService
{
    public function ask(string $question, string $shard, array $options = []): array
    {
        $collectionName = $this->getCollectionForShard($shard);
        $brain = Mindwave::brain($collectionName);

        // ... rest of implementation
    }
}
```

### 9.3 Caching Strategies

Implement multi-layer caching:

```php
class CachedDocumentQAService extends DocumentQAService
{
    public function ask(string $question, array $options = []): array
    {
        // Layer 1: Exact question cache (fastest)
        $exactCacheKey = 'qa:exact:' . md5($question);

        if ($cached = Cache::get($exactCacheKey)) {
            return $cached;
        }

        // Layer 2: Similar question cache
        $similarCacheKey = $this->findSimilarCachedQuestion($question);

        if ($similarCacheKey && $cached = Cache::get($similarCacheKey)) {
            return $cached;
        }

        // Layer 3: Generate new answer
        $result = parent::ask($question, $options);

        // Cache for 24 hours
        Cache::put($exactCacheKey, $result, now()->addDay());

        return $result;
    }

    protected function findSimilarCachedQuestion(string $question): ?string
    {
        // Find cached questions with high semantic similarity
        // Implementation depends on your cache strategy
        return null;
    }
}
```

### 9.4 Monitoring and Analytics

Track system health and performance:

```php
// app/Console/Commands/MonitorQASystem.php
class MonitorQASystem extends Command
{
    protected $signature = 'qa:monitor';

    public function handle(DocumentQAService $qaService): int
    {
        $stats = $qaService->getStats();
        $analytics = $qaService->getCostAnalytics(days: 1);

        // Check document processing health
        if ($stats['failed_documents'] > 10) {
            $this->error("High failure rate: {$stats['failed_documents']} failed documents");
            // Send alert
        }

        // Check daily cost
        if ($analytics['total_cost'] > 10.00) {
            $this->warn("High daily cost: \${$analytics['total_cost']}");
            // Send cost alert
        }

        // Check processing queue
        if ($stats['processing_documents'] > 50) {
            $this->warn("Large processing queue: {$stats['processing_documents']} documents");
        }

        $this->info("System Health:");
        $this->table(
            ['Metric', 'Value'],
            [
                ['Total Documents', $stats['total_documents']],
                ['Indexed', $stats['indexed_documents']],
                ['Failed', $stats['failed_documents']],
                ['Daily Queries', $analytics['total_queries']],
                ['Daily Cost', '$' . number_format($analytics['total_cost'], 2)],
            ]
        );

        return Command::SUCCESS;
    }
}

// Schedule monitoring
// app/Console/Kernel.php
protected function schedule(Schedule $schedule): void
{
    $schedule->command('qa:monitor')
        ->hourly()
        ->emailOutputOnFailure('admin@example.com');
}
```

### 9.5 Rate Limiting

Protect your API from abuse:

```php
// app/Http/Kernel.php
protected $middlewareGroups = [
    'api' => [
        // ...
        'throttle:api',
    ],
];

// config/app.php - Rate limiters
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;

RateLimiter::for('api', function (Request $request) {
    return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
});

RateLimiter::for('document-qa', function (Request $request) {
    return [
        Limit::perMinute(10)->by($request->user()?->id ?: $request->ip()),
        Limit::perDay(100)->by($request->user()?->id ?: $request->ip()),
    ];
});

// Apply to routes
Route::middleware('throttle:document-qa')->group(function () {
    Route::post('/api/document-qa/ask', [DocumentQAController::class, 'ask']);
});
```

## Summary

You've now built a complete, production-ready Document Q&A system with:

-   **Semantic Search**: Vector-based similarity search using Qdrant
-   **Document Processing**: Automated chunking, embedding, and indexing
-   **RAG Pipeline**: Context retrieval and answer generation with PromptComposer
-   **Source Attribution**: Track which documents contribute to each answer
-   **Cost Tracking**: Monitor API usage and costs with observability
-   **Document Management**: Upload, index, and manage document collections
-   **Testing**: Comprehensive unit and feature tests
-   **Production Features**: Caching, monitoring, rate limiting, scaling

### Key Takeaways

1. **RAG is powerful**: Combine retrieval with generation for accurate, grounded answers
2. **Chunking matters**: Proper text splitting (512 chars, 50 overlap) improves retrieval quality
3. **Hybrid search wins**: Combine BM25 (keywords) + vector search (semantics) for best results
4. **Cost awareness**: Monitor and optimize embedding API usage
5. **Observability is critical**: Use Mindwave's tracing to track performance and costs

### Next Steps

-   **Experiment**: Try different chunk sizes and overlap configurations
-   **Optimize**: Test different retrieval strategies (hybrid, re-ranking, query expansion)
-   **Scale**: Move to production vector stores (managed Qdrant, Pinecone)
-   **Enhance**: Add conversation history, multi-document collections, confidence scoring
-   **Monitor**: Set up alerts for costs, failures, and performance issues

## Related Documentation

-   [RAG Overview](/docs/core/rag-overview) - RAG concepts and architecture
-   [Vector Stores](/docs/reference/vector-stores) - Vector database integration
-   [Brain](/docs/rag/brain) - Document processing and semantic search
-   [PromptComposer](/docs/core/prompt-composer) - Token-aware prompt composition
-   [Observability](/docs/observability/overview) - Tracing and cost tracking
-   [Testing](/docs/advanced/testing) - Testing AI applications

## Resources

-   [Example Code Repository](https://github.com/mindwave/examples/tree/main/document-qa)
-   [Qdrant Documentation](https://qdrant.tech/documentation/)
-   [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
-   [RAG Best Practices Blog](https://mindwave.dev/blog/rag-best-practices)
