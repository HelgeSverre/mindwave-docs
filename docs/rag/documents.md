# Documents

Document processing is the foundation of any Retrieval-Augmented Generation (RAG) system. Mindwave provides a comprehensive document loading and processing pipeline that handles multiple file formats, intelligent text chunking, and seamless integration with both TNTSearch and vector stores.

## Overview

Mindwave's document processing system consists of three core components:

1. **Document Loaders** - Extract text from various file formats (PDF, HTML, Word, etc.)
2. **Text Splitters** - Break documents into optimally-sized chunks for RAG
3. **Document Objects** - Unified data structure with content and metadata

This pipeline transforms raw documents into searchable, retrievable chunks that power your RAG applications.

## Why Chunk Documents?

Document chunking is critical for RAG quality:

- **Context Window Limits** - LLMs have finite input sizes; chunks must fit within these limits
- **Retrieval Precision** - Smaller chunks enable more precise context matching
- **Relevance Scoring** - Focused chunks produce better similarity scores
- **Cost Efficiency** - Smaller contexts mean fewer tokens and lower costs

The key is finding the right balance: chunks large enough to maintain context, but small enough for precise retrieval.

## Document Object

All loaders return a standardized `Document` object:

```php
use Mindwave\Mindwave\Document\Data\Document;

// Create a document
$document = Document::make(
    content: 'Your document text content here...',
    metadata: [
        'source' => 'user_manual.pdf',
        'page' => 1,
        'author' => 'John Doe',
        'created_at' => now()
    ]
);

// Access content
$text = $document->content();

// Access metadata
$meta = $document->metadata();

// Check if empty
if ($document->isNotEmpty()) {
    // Process document
}
```

The `Document` class is macroable, allowing you to extend it with custom methods:

```php
Document::macro('wordCount', function () {
    return str_word_count($this->content());
});

$count = $document->wordCount();
```

## Document Loading

Mindwave supports multiple document formats out of the box. All loading is handled through the `DocumentLoader` facade.

### Plain Text

The simplest loader - takes raw text and wraps it in a Document object:

```php
use Mindwave\Mindwave\Facades\DocumentLoader;

$document = DocumentLoader::fromText(
    text: 'This is plain text content',
    meta: ['source' => 'user_input']
);
```

### PDF Documents

Extract text from PDF files using the PDF parser:

```php
// Load PDF from file
$pdfContent = file_get_contents(storage_path('docs/manual.pdf'));

$document = DocumentLoader::fromPdf(
    data: $pdfContent,
    meta: [
        'source' => 'manual.pdf',
        'type' => 'user_manual',
        'version' => '2.0'
    ]
);

// The PDF text is automatically extracted and whitespace normalized
echo $document->content();
```

PDF processing automatically:
- Extracts all text from the document
- Normalizes whitespace for cleaner text
- Handles multi-page documents
- Preserves text structure

### HTML Documents

Extract clean text from HTML by removing scripts, styles, and tags:

```php
$html = '<html>
    <head><title>Page Title</title></head>
    <body>
        <h1>Welcome</h1>
        <p>This is the content.</p>
        <script>alert("ads")</script>
    </body>
</html>';

$document = DocumentLoader::fromHtml(
    data: $html,
    meta: ['source' => 'webpage.html']
);

// Returns: "Welcome This is the content."
// Scripts, styles, and tags are automatically removed
```

The HTML loader automatically removes:
- `<script>` tags and content
- `<style>` tags and content
- `<link>` tags
- `<head>` sections
- `<noscript>` tags
- `<template>` tags
- `<svg>` elements
- `<br>` and `<hr>` tags

### Web Pages (URLs)

Load and extract content directly from URLs:

```php
use Mindwave\Mindwave\Facades\DocumentLoader;

$document = DocumentLoader::fromUrl(
    data: 'https://example.com/article',
    meta: ['scraped_at' => now()]
);

// The loader automatically:
// - Fetches the URL content
// - Extracts clean text from HTML
// - Adds URL metadata
```

The web loader automatically adds metadata:

```php
[
    'url' => 'https://example.com/article',
    'effective_url' => 'https://example.com/article', // After redirects
    'scraped_at' => '2025-11-19 10:30:00'
]
```

If the request fails, `null` is returned instead of throwing an exception.

### Word Documents

Load text from Microsoft Word documents (both `.doc` and `.docx`):

```php
$wordContent = file_get_contents(storage_path('docs/report.docx'));

$document = DocumentLoader::fromWord(
    data: $wordContent,
    meta: ['source' => 'report.docx']
);
```

The Word loader:
- Supports both `.doc` (legacy) and `.docx` formats
- Extracts text content while preserving paragraph breaks
- Handles tables and basic formatting
- Returns `null` for corrupted files

### Loading from Laravel Storage

Combine Laravel's filesystem with document loaders:

```php
use Illuminate\Support\Facades\Storage;
use Mindwave\Mindwave\Facades\DocumentLoader;

// Load from default disk
$content = Storage::get('documents/manual.pdf');
$document = DocumentLoader::fromPdf($content, [
    'source' => 'manual.pdf',
    'disk' => 'local'
]);

// Load from S3
$content = Storage::disk('s3')->get('docs/report.docx');
$document = DocumentLoader::fromWord($content, [
    'source' => 'report.docx',
    'disk' => 's3'
]);

// Load multiple files
$files = Storage::files('knowledge-base');
$documents = collect($files)->map(function ($file) {
    $content = Storage::get($file);
    $extension = pathinfo($file, PATHINFO_EXTENSION);

    return match($extension) {
        'pdf' => DocumentLoader::fromPdf($content, ['source' => $file]),
        'html' => DocumentLoader::fromHtml($content, ['source' => $file]),
        'txt', 'md' => DocumentLoader::fromText($content, ['source' => $file]),
        default => null,
    };
})->filter();
```

## Text Chunking (Splitting)

Once you have documents, the next step is splitting them into chunks. Mindwave provides two powerful text splitters.

### Why Text Splitting Matters

Different chunk sizes work better for different models and use cases:

| Model Type | Recommended Chunk Size | Overlap |
|------------|------------------------|---------|
| GPT-3.5 Turbo | 500-1000 characters | 100-200 |
| GPT-4 | 1000-2000 characters | 200-400 |
| Claude 3 | 1000-2000 characters | 200-400 |
| Embedding Models | 500-1000 characters | 50-100 |

Smaller chunks = more precise retrieval, but potentially less context
Larger chunks = more context, but potentially less precise matching

### CharacterTextSplitter

The simplest splitter - divides text on a separator with optional overlap:

```php
use Mindwave\Mindwave\TextSplitters\CharacterTextSplitter;

// Default: splits on double newline, 1000 chars, 200 overlap
$splitter = new CharacterTextSplitter();

// Custom configuration
$splitter = new CharacterTextSplitter(
    separator: "\n\n",      // Split on paragraphs
    chunkSize: 500,         // Maximum chunk size
    chunkOverlap: 100       // Overlap between chunks
);

// Split plain text
$text = "Long document text...";
$chunks = $splitter->splitText($text);

foreach ($chunks as $chunk) {
    echo $chunk . "\n---\n";
}
```

Split documents directly:

```php
use Mindwave\Mindwave\Facades\DocumentLoader;

$document = DocumentLoader::fromPdf($pdfContent, [
    'source' => 'manual.pdf'
]);

$splitter = new CharacterTextSplitter(
    separator: "\n",
    chunkSize: 1000,
    chunkOverlap: 200
);

// Returns array of Document objects
$chunks = $splitter->splitDocument($document);

// Each chunk preserves the original metadata
foreach ($chunks as $chunk) {
    echo "Source: " . $chunk->metadata()['source'] . "\n";
    echo "Content: " . $chunk->content() . "\n\n";
}
```

### RecursiveCharacterTextSplitter

The intelligent splitter - tries multiple separators in order, falling back to smaller separators when needed:

```php
use Mindwave\Mindwave\TextSplitters\RecursiveCharacterTextSplitter;

// Default separators: ["\n\n", "\n", " ", ""]
// Tries paragraphs first, then lines, then words, then characters
$splitter = new RecursiveCharacterTextSplitter();

// Custom configuration
$splitter = new RecursiveCharacterTextSplitter(
    separators: ["\n\n", "\n", ". ", " ", ""],  // Custom hierarchy
    chunkSize: 1000,
    chunkOverlap: 200,
    maxDepth: 10  // Maximum recursion depth
);

$chunks = $splitter->splitText($longText);
```

The recursive splitter is smarter because it:
1. Tries to split on the largest separator (e.g., paragraph breaks)
2. If chunks are still too large, recursively tries smaller separators
3. Maintains semantic boundaries when possible
4. Falls back to character-level splitting only when necessary

**Example with code:**

```php
// Perfect for splitting code that should stay together
$splitter = new RecursiveCharacterTextSplitter(
    separators: [
        "\n\nclass ",   // Split on class boundaries
        "\n\nfunction ", // Then function boundaries
        "\n\n",         // Then empty lines
        "\n",           // Then lines
        " ",            // Then words
        ""              // Finally characters
    ],
    chunkSize: 2000,
    chunkOverlap: 100
);

$codeDocument = DocumentLoader::fromText(
    file_get_contents(app_path('Services/ImportantService.php'))
);

$chunks = $splitter->splitDocument($codeDocument);
```

### Working with Multiple Documents

Process entire document collections:

```php
use Mindwave\Mindwave\Document\Data\Document;
use Mindwave\Mindwave\TextSplitters\RecursiveCharacterTextSplitter;

// Create multiple documents
$documents = [
    Document::make('First document content...', ['id' => 1]),
    Document::make('Second document content...', ['id' => 2]),
    Document::make('Third document content...', ['id' => 3]),
];

$splitter = new RecursiveCharacterTextSplitter(
    chunkSize: 500,
    chunkOverlap: 50
);

// Split all documents at once
$allChunks = $splitter->splitDocuments($documents);

// Each chunk preserves its parent document's metadata
foreach ($allChunks as $chunk) {
    $docId = $chunk->metadata()['id'];
    echo "Document {$docId}: " . substr($chunk->content(), 0, 50) . "...\n";
}
```

Or create documents from raw text arrays:

```php
$texts = [
    'First article text...',
    'Second article text...',
    'Third article text...'
];

$metadata = [
    ['article_id' => 1, 'author' => 'John'],
    ['article_id' => 2, 'author' => 'Jane'],
    ['article_id' => 3, 'author' => 'Bob'],
];

$chunks = $splitter->createDocuments($texts, $metadata);
```

### Chunk Overlap Explained

Overlap ensures context isn't lost between chunks:

```php
$text = "The quick brown fox jumps over the lazy dog. The dog was sleeping under a tree.";

$splitter = new CharacterTextSplitter(
    separator: ". ",
    chunkSize: 50,
    chunkOverlap: 20  // Last 20 chars repeated in next chunk
);

$chunks = $splitter->splitText($text);

// Chunk 1: "The quick brown fox jumps over the lazy dog"
// Chunk 2: "lazy dog. The dog was sleeping under a tree"
//           ^^^^^^^^^ (overlap - repeated from previous chunk)
```

This overlap:
- Prevents loss of context at boundaries
- Improves retrieval when queries span chunk boundaries
- Helps maintain coherence in retrieved passages

## Metadata Management

Metadata is crucial for source attribution, filtering, and debugging.

### Common Metadata Patterns

```php
use Mindwave\Mindwave\Facades\DocumentLoader;

// Document identification
$document = DocumentLoader::fromPdf($pdfContent, [
    'source' => 'user_manual.pdf',
    'document_id' => 'doc_12345',
    'type' => 'user_manual',
]);

// Versioning and timestamps
$document = DocumentLoader::fromText($text, [
    'version' => '2.1.0',
    'created_at' => now(),
    'updated_at' => now(),
    'indexed_at' => now(),
]);

// Categorization
$document = DocumentLoader::fromHtml($html, [
    'category' => 'documentation',
    'tags' => ['api', 'rest', 'v2'],
    'language' => 'en',
    'audience' => 'developers',
]);

// Access control
$document = DocumentLoader::fromText($text, [
    'visibility' => 'public',
    'team_id' => 42,
    'author_id' => 123,
    'confidentiality' => 'internal',
]);
```

### Metadata with Chunking

When you split documents, metadata is preserved in each chunk:

```php
$document = DocumentLoader::fromPdf($pdfContent, [
    'source' => 'legal_contract.pdf',
    'document_id' => 'contract_789',
    'contract_date' => '2025-11-19',
    'parties' => ['Acme Corp', 'Widget Inc']
]);

$splitter = new RecursiveCharacterTextSplitter(chunkSize: 1000);
$chunks = $splitter->splitDocument($document);

foreach ($chunks as $index => $chunk) {
    // Original metadata is preserved
    $source = $chunk->metadata()['source'];  // 'legal_contract.pdf'
    $docId = $chunk->metadata()['document_id'];  // 'contract_789'

    // Add chunk-specific metadata
    $chunkMeta = array_merge($chunk->metadata(), [
        'chunk_index' => $index,
        'total_chunks' => count($chunks),
        'chunk_length' => strlen($chunk->content())
    ]);
}
```

## Real-World Examples

### Example 1: Knowledge Base from Markdown Files

Load and process an entire directory of markdown documentation:

```php
use Illuminate\Support\Facades\Storage;
use Mindwave\Mindwave\Facades\DocumentLoader;
use Mindwave\Mindwave\TextSplitters\RecursiveCharacterTextSplitter;

// Get all markdown files
$files = Storage::disk('local')->files('knowledge-base');

$splitter = new RecursiveCharacterTextSplitter(
    separators: ["##", "\n\n", "\n", ". ", " "],  // Markdown-aware
    chunkSize: 1000,
    chunkOverlap: 100
);

$allChunks = collect($files)
    ->filter(fn($file) => str_ends_with($file, '.md'))
    ->map(function($file) use ($splitter) {
        $content = Storage::get($file);

        $document = DocumentLoader::fromText($content, [
            'source' => $file,
            'filename' => basename($file),
            'type' => 'documentation',
            'indexed_at' => now()
        ]);

        return $splitter->splitDocument($document);
    })
    ->flatten(1);

// Now you have all chunks ready for indexing
echo "Processed " . $allChunks->count() . " chunks from " . count($files) . " files";
```

### Example 2: PDF Documentation Library

Process a library of PDF documents:

```php
use Illuminate\Support\Facades\Storage;
use Mindwave\Mindwave\Facades\DocumentLoader;
use Mindwave\Mindwave\TextSplitters\RecursiveCharacterTextSplitter;

class DocumentProcessor
{
    public function processPdfLibrary(string $directory): Collection
    {
        $files = Storage::disk('s3')->files($directory);
        $splitter = new RecursiveCharacterTextSplitter(
            chunkSize: 1500,
            chunkOverlap: 200
        );

        return collect($files)
            ->filter(fn($file) => str_ends_with($file, '.pdf'))
            ->map(fn($file) => $this->processPdfFile($file, $splitter))
            ->flatten(1);
    }

    private function processPdfFile(string $path, $splitter): array
    {
        try {
            $content = Storage::disk('s3')->get($path);

            $document = DocumentLoader::fromPdf($content, [
                'source' => $path,
                'filename' => basename($path),
                'size' => strlen($content),
                'processed_at' => now(),
                'storage' => 's3'
            ]);

            if ($document->isEmpty()) {
                logger()->warning("Empty PDF: {$path}");
                return [];
            }

            return $splitter->splitDocument($document);

        } catch (\Exception $e) {
            logger()->error("Failed to process PDF: {$path}", [
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
}

// Usage
$processor = new DocumentProcessor();
$chunks = $processor->processPdfLibrary('documents/manuals');
```

### Example 3: Processing Code Documentation

Extract and process code documentation:

```php
use Mindwave\Mindwave\Facades\DocumentLoader;
use Mindwave\Mindwave\TextSplitters\RecursiveCharacterTextSplitter;

class CodeDocumentationProcessor
{
    public function processPhpFiles(string $directory): Collection
    {
        $files = File::allFiles(base_path($directory));

        // Code-aware splitter
        $splitter = new RecursiveCharacterTextSplitter(
            separators: [
                "\n\nclass ",
                "\n\ninterface ",
                "\n\ntrait ",
                "\n\nfunction ",
                "\n\npublic function ",
                "\n\nprotected function ",
                "\n\nprivate function ",
                "\n\n",
                "\n",
                " ",
                ""
            ],
            chunkSize: 2000,  // Larger chunks for code
            chunkOverlap: 100
        );

        return collect($files)
            ->filter(fn($file) => $file->getExtension() === 'php')
            ->map(fn($file) => $this->processFile($file, $splitter))
            ->flatten(1);
    }

    private function processFile($file, $splitter): array
    {
        $content = $file->getContents();

        // Extract docblocks and class information
        preg_match('/namespace\s+([\w\\\\]+);/', $content, $namespaceMatch);
        preg_match('/class\s+(\w+)/', $content, $classMatch);

        $document = DocumentLoader::fromText($content, [
            'source' => $file->getRelativePathname(),
            'type' => 'source_code',
            'language' => 'php',
            'namespace' => $namespaceMatch[1] ?? null,
            'class' => $classMatch[1] ?? null,
            'path' => $file->getPathname(),
        ]);

        return $splitter->splitDocument($document);
    }
}
```

### Example 4: Batch Processing with Queue

Process large document sets asynchronously:

```php
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Mindwave\Mindwave\Facades\DocumentLoader;
use Mindwave\Mindwave\TextSplitters\RecursiveCharacterTextSplitter;

class ProcessDocumentJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $filePath,
        public string $fileType,
        public array $metadata = []
    ) {}

    public function handle(): void
    {
        $content = Storage::get($this->filePath);

        // Load based on type
        $document = match($this->fileType) {
            'pdf' => DocumentLoader::fromPdf($content),
            'html' => DocumentLoader::fromHtml($content),
            'docx' => DocumentLoader::fromWord($content),
            default => DocumentLoader::fromText($content),
        };

        if ($document->isEmpty()) {
            logger()->warning("Empty document: {$this->filePath}");
            return;
        }

        // Split into chunks
        $splitter = new RecursiveCharacterTextSplitter(
            chunkSize: 1000,
            chunkOverlap: 200
        );

        $chunks = $splitter->splitDocument($document);

        // Index each chunk
        foreach ($chunks as $index => $chunk) {
            $this->indexChunk($chunk, $index);
        }

        logger()->info("Processed {$this->filePath}: " . count($chunks) . " chunks");
    }

    private function indexChunk($chunk, $index): void
    {
        // Add to vector store, TNTSearch, or database
        // This is where you'd integrate with your RAG system
    }
}

// Dispatch jobs for all documents
$files = Storage::files('documents/pending');
foreach ($files as $file) {
    $extension = pathinfo($file, PATHINFO_EXTENSION);
    ProcessDocumentJob::dispatch($file, $extension);
}
```

## Integration with RAG Systems

### Using with StaticSource

StaticSource is perfect for pre-processed document chunks:

```php
use Mindwave\Mindwave\Context\Sources\StaticSource;
use Mindwave\Mindwave\Facades\DocumentLoader;
use Mindwave\Mindwave\TextSplitters\RecursiveCharacterTextSplitter;

// Load and chunk documents
$document = DocumentLoader::fromPdf($pdfContent);
$splitter = new RecursiveCharacterTextSplitter(chunkSize: 800);
$chunks = $splitter->splitDocument($document);

// Convert to strings for StaticSource
$chunkStrings = collect($chunks)
    ->map(fn($chunk) => $chunk->content())
    ->toArray();

// Create a static source from chunks
$source = StaticSource::fromStrings($chunkStrings, 'pdf-manual');

// Use in context pipeline
$context = $source->search('How do I install?', limit: 5);
```

Or with structured items for better metadata:

```php
$items = collect($chunks)->map(function($chunk, $index) {
    return [
        'content' => $chunk->content(),
        'keywords' => $this->extractKeywords($chunk->content()),
        'metadata' => [
            'source' => $chunk->metadata()['source'],
            'chunk_index' => $index,
        ]
    ];
})->toArray();

$source = StaticSource::fromItems($items, 'documentation');
```

### Using with TNTSearch

Index document chunks in TNTSearch for full-text search:

```php
use Mindwave\Mindwave\Context\Sources\TntSearchSource;
use Mindwave\Mindwave\Facades\DocumentLoader;
use Mindwave\Mindwave\TextSplitters\RecursiveCharacterTextSplitter;

// Load and chunk
$files = Storage::files('knowledge-base');
$splitter = new RecursiveCharacterTextSplitter(chunkSize: 1000);

$chunks = collect($files)
    ->map(function($file) use ($splitter) {
        $content = Storage::get($file);
        $document = DocumentLoader::fromText($content, ['source' => $file]);
        return $splitter->splitDocument($document);
    })
    ->flatten(1);

// Index chunks
$source = TntSearchSource::fromArray(
    data: $chunks->map(fn($chunk) => [
        'id' => md5($chunk->content()),
        'content' => $chunk->content(),
        'source' => $chunk->metadata()['source'],
    ])->toArray(),
    contentField: 'content',
    name: 'docs'
);

// Search
$results = $source->search('authentication');
```

### Using with Vector Stores

Embed and store document chunks for semantic search:

```php
use Mindwave\Mindwave\Facades\Vectorstore;
use Mindwave\Mindwave\Facades\DocumentLoader;
use Mindwave\Mindwave\TextSplitters\RecursiveCharacterTextSplitter;

// Process documents
$document = DocumentLoader::fromPdf($pdfContent, [
    'source' => 'api-docs.pdf'
]);

$splitter = new RecursiveCharacterTextSplitter(
    chunkSize: 800,  // Optimal for embeddings
    chunkOverlap: 100
);

$chunks = $splitter->splitDocument($document);

// Add to vector store
foreach ($chunks as $index => $chunk) {
    Vectorstore::addText(
        text: $chunk->content(),
        metadata: array_merge($chunk->metadata(), [
            'chunk_index' => $index,
            'chunk_length' => strlen($chunk->content())
        ])
    );
}

// Search by semantic similarity
$results = Vectorstore::similaritySearch('user authentication flow', 5);
```

### Complete RAG Pipeline

End-to-end document processing to retrieval:

```php
use Mindwave\Mindwave\Context\ContextPipeline;
use Mindwave\Mindwave\Context\Sources\TntSearchSource;
use Mindwave\Mindwave\Context\Sources\VectorStoreSource;
use Mindwave\Mindwave\Facades\DocumentLoader;
use Mindwave\Mindwave\Facades\Vectorstore;
use Mindwave\Mindwave\TextSplitters\RecursiveCharacterTextSplitter;

class DocumentIndexer
{
    public function indexDocument(string $path): void
    {
        // 1. Load document
        $content = Storage::get($path);
        $document = DocumentLoader::fromPdf($content, [
            'source' => $path,
            'indexed_at' => now()
        ]);

        // 2. Chunk document
        $splitter = new RecursiveCharacterTextSplitter(
            chunkSize: 1000,
            chunkOverlap: 200
        );
        $chunks = $splitter->splitDocument($document);

        // 3. Index in TNTSearch (keyword search)
        $tntData = $chunks->map(fn($chunk, $i) => [
            'id' => md5($path . $i),
            'content' => $chunk->content(),
            'source' => $chunk->metadata()['source']
        ])->toArray();

        $tntSource = TntSearchSource::fromArray(
            data: $tntData,
            contentField: 'content',
            name: 'docs'
        );

        // 4. Index in vector store (semantic search)
        foreach ($chunks as $chunk) {
            Vectorstore::addText(
                text: $chunk->content(),
                metadata: $chunk->metadata()
            );
        }
    }

    public function search(string $query)
    {
        // 5. Create hybrid search pipeline
        $pipeline = (new ContextPipeline)
            ->addSource(TntSearchSource::fromIndex('docs'))
            ->addSource(VectorStoreSource::from(Vectorstore::getFacadeRoot()));

        // 6. Retrieve relevant context
        return $pipeline->process($query, limit: 5);
    }
}

// Usage
$indexer = new DocumentIndexer();

// Index multiple documents
foreach ($documents as $doc) {
    $indexer->indexDocument($doc);
}

// Search and retrieve
$context = $indexer->search('How do I authenticate users?');

// Use in prompt
$response = Mindwave::query(
    prompt: "Answer based on this context:\n\n{$context->toString()}\n\nQuestion: How do I authenticate users?"
);
```

## Best Practices

### Chunk Size Guidelines

Choose chunk sizes based on your model and use case:

```php
// For embeddings (semantic search)
$embeddingsSplitter = new RecursiveCharacterTextSplitter(
    chunkSize: 500,  // Smaller chunks for precise semantic matching
    chunkOverlap: 50
);

// For GPT-3.5 context
$gpt35Splitter = new RecursiveCharacterTextSplitter(
    chunkSize: 1000,
    chunkOverlap: 200
);

// For GPT-4/Claude (larger context windows)
$gpt4Splitter = new RecursiveCharacterTextSplitter(
    chunkSize: 2000,
    chunkOverlap: 400
);

// For code documentation (preserve structure)
$codeSplitter = new RecursiveCharacterTextSplitter(
    separators: ["\n\nclass ", "\n\nfunction ", "\n\n", "\n"],
    chunkSize: 2500,
    chunkOverlap: 100
);
```

### Overlap Strategies

Overlap prevents context loss at chunk boundaries:

```php
// Minimal overlap (memory constrained)
$minOverlap = new RecursiveCharacterTextSplitter(
    chunkSize: 1000,
    chunkOverlap: 50  // 5% overlap
);

// Standard overlap (recommended)
$standardOverlap = new RecursiveCharacterTextSplitter(
    chunkSize: 1000,
    chunkOverlap: 200  // 20% overlap
);

// High overlap (critical accuracy)
$highOverlap = new RecursiveCharacterTextSplitter(
    chunkSize: 1000,
    chunkOverlap: 400  // 40% overlap
);
```

Rule of thumb: **10-20% overlap** for most use cases.

### Metadata Design

Design metadata for filtering and attribution:

```php
$document = DocumentLoader::fromPdf($content, [
    // Required - for source attribution
    'source' => $filePath,
    'document_id' => $documentId,

    // Useful - for filtering
    'type' => 'user_manual',
    'category' => 'documentation',
    'version' => '2.1.0',

    // Essential - for debugging
    'indexed_at' => now(),
    'file_size' => strlen($content),

    // Optional - for access control
    'visibility' => 'public',
    'team_id' => 42,

    // Optional - for analytics
    'language' => 'en',
    'author' => 'John Doe',
    'last_updated' => $document->updated_at,
]);
```

### File Organization

Structure your storage for efficient processing:

```
storage/
├── documents/
│   ├── incoming/        # New documents to process
│   ├── processed/       # Successfully indexed documents
│   ├── failed/          # Failed processing (retry later)
│   └── archive/         # Old versions
├── indexes/
│   ├── tntsearch/       # Full-text indexes
│   └── vectors/         # Vector embeddings
└── metadata/
    └── processing_log.json
```

### Error Handling

Robust error handling for production:

```php
use Mindwave\Mindwave\Facades\DocumentLoader;

class RobustDocumentProcessor
{
    public function processDocument(string $path, string $type): ?array
    {
        try {
            $content = Storage::get($path);

            $document = match($type) {
                'pdf' => DocumentLoader::fromPdf($content),
                'html' => DocumentLoader::fromHtml($content),
                'docx' => DocumentLoader::fromWord($content),
                default => DocumentLoader::fromText($content),
            };

            if (!$document || $document->isEmpty()) {
                $this->logWarning("Empty document", $path);
                return null;
            }

            $splitter = new RecursiveCharacterTextSplitter(
                chunkSize: 1000,
                chunkOverlap: 200
            );

            return $splitter->splitDocument($document);

        } catch (\Exception $e) {
            $this->logError("Processing failed", $path, $e);
            $this->moveToFailedQueue($path);
            return null;
        }
    }

    private function logError(string $message, string $path, \Exception $e): void
    {
        logger()->error($message, [
            'path' => $path,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
    }

    private function logWarning(string $message, string $path): void
    {
        logger()->warning($message, ['path' => $path]);
    }

    private function moveToFailedQueue(string $path): void
    {
        $failedPath = str_replace('incoming/', 'failed/', $path);
        Storage::move($path, $failedPath);
    }
}
```

## Performance Optimization

### Batch Processing

Process large document sets efficiently:

```php
use Illuminate\Support\Collection;

class BatchDocumentProcessor
{
    public function processBatch(array $files, int $batchSize = 50): void
    {
        collect($files)
            ->chunk($batchSize)
            ->each(function($batch) {
                // Process batch
                $chunks = $batch->map(fn($file) => $this->processFile($file))
                    ->flatten(1);

                // Bulk index
                $this->bulkIndex($chunks);

                // Free memory
                unset($chunks);
                gc_collect_cycles();
            });
    }

    private function bulkIndex(Collection $chunks): void
    {
        // Batch insert into database, TNTSearch, or vector store
        // Much faster than individual inserts
    }
}
```

### Memory Management

Handle large documents without exhausting memory:

```php
class MemoryEfficientProcessor
{
    public function processLargeFile(string $path): void
    {
        // Stream large files instead of loading entirely
        $content = '';
        $handle = Storage::readStream($path);

        while (!feof($handle)) {
            $content .= fread($handle, 8192);  // Read in chunks

            // Process when we have enough content
            if (strlen($content) > 100000) {
                $this->processChunk($content);
                $content = '';
                gc_collect_cycles();
            }
        }

        fclose($handle);

        // Process remaining content
        if (!empty($content)) {
            $this->processChunk($content);
        }
    }
}
```

### Caching

Cache processed documents to avoid reprocessing:

```php
use Illuminate\Support\Facades\Cache;

class CachedDocumentProcessor
{
    public function getProcessedDocument(string $path): array
    {
        $cacheKey = 'document:' . md5($path . filemtime($path));

        return Cache::remember($cacheKey, now()->addHours(24), function() use ($path) {
            return $this->processDocument($path);
        });
    }

    private function processDocument(string $path): array
    {
        $content = Storage::get($path);
        $document = DocumentLoader::fromPdf($content);

        $splitter = new RecursiveCharacterTextSplitter(
            chunkSize: 1000,
            chunkOverlap: 200
        );

        return $splitter->splitDocument($document);
    }
}
```

## Troubleshooting

### File Not Found Errors

```php
// Problem: File doesn't exist
$document = DocumentLoader::fromPdf($content);  // Error!

// Solution: Check file exists first
if (!Storage::exists($path)) {
    logger()->error("File not found: {$path}");
    return null;
}

$content = Storage::get($path);
```

### Encoding Issues

```php
// Problem: Invalid UTF-8 characters
$document = DocumentLoader::fromText($content);  // Garbled text

// Solution: Normalize encoding
$content = mb_convert_encoding($content, 'UTF-8', 'auto');
$document = DocumentLoader::fromText($content);
```

### Empty Documents

```php
// Problem: PDF extraction fails
$document = DocumentLoader::fromPdf($corruptedPdf);

// Solution: Check if document is empty
if ($document->isEmpty()) {
    logger()->warning("Empty document extracted");
    return null;
}

// Or use isNotEmpty()
if ($document->isNotEmpty()) {
    $chunks = $splitter->splitDocument($document);
}
```

### Chunk Size Errors

```php
// Problem: Chunks too large
$splitter = new RecursiveCharacterTextSplitter(
    chunkSize: 100,
    chunkOverlap: 200  // Overlap > chunkSize!
);

// Error: Exception thrown

// Solution: Ensure overlap < chunkSize
$splitter = new RecursiveCharacterTextSplitter(
    chunkSize: 1000,
    chunkOverlap: 200  // 20% overlap
);
```

### Memory Issues

```php
// Problem: Out of memory on large files
$files = Storage::files('documents');  // 10,000 files
$chunks = collect($files)->map(...);  // Boom!

// Solution: Process in chunks and free memory
collect($files)->chunk(50)->each(function($batch) {
    $chunks = $batch->map(fn($file) => $this->process($file));
    $this->index($chunks);
    unset($chunks);
    gc_collect_cycles();
});
```

### Max Recursion Depth

```php
// Problem: Recursive splitter hits max depth
$splitter = new RecursiveCharacterTextSplitter(
    separators: ["\n\n", "\n"],  // Missing character separator!
    chunkSize: 100,
    maxDepth: 10
);

// Error: Maximum recursion depth exceeded

// Solution: Always include character-level separators
$splitter = new RecursiveCharacterTextSplitter(
    separators: ["\n\n", "\n", " ", ""],  // Include "" for character splitting
    chunkSize: 100,
    maxDepth: 10
);
```

## Next Steps

Now that you understand document processing and chunking, explore:

- **[TNTSearch](./tntsearch)** - Index chunks for full-text search
- **[Vector Stores](./vectorstores)** - Store embeddings for semantic search
- **[Prompt Composer](/docs/core/prompt-composer)** - Combine retrieved chunks with LLM prompts

Document processing is the foundation of effective RAG. Master chunking strategies and metadata design to build production-ready retrieval systems that power intelligent Laravel applications.
