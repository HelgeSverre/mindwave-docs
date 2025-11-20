# Document Loaders

Load and process various document formats for RAG applications.

## Overview

Mindwave includes document loaders for common formats. This is a simplified version - for complete documentation and advanced features, see [RAG Documentation](/docs/rag/overview).

## Supported Formats

Mindwave can process:

- **PDF Files** - Using `smalot/pdfparser`
- **Text Files** - Plain text, Markdown, etc.
- **Web Pages** - HTML scraping and extraction
- **CSV Files** - Structured data
- **JSON Files** - Structured data

## PDF Loading Example

```php
use Mindwave\Mindwave\Documents\PdfLoader;

$loader = new PdfLoader();
$text = $loader->load(storage_path('documents/manual.pdf'));

// Process for RAG
$brain = Mindwave::brain('documentation');
$brain->remember($text, ['source' => 'manual', 'type' => 'pdf']);
```

## Text File Loading

```php
use Illuminate\Support\Facades\File;

$content = File::get(storage_path('documents/readme.md'));

// Store in vector database
$brain = Mindwave::brain('documentation');
$brain->remember($content, ['source' => 'readme', 'type' => 'markdown']);
```

## Web Page Scraping

```php
use Illuminate\Support\Facades\Http;

$html = Http::get('https://laravel.com/docs')->body();

// Extract text (simple approach)
$text = strip_tags($html);

// Store for semantic search
$brain = Mindwave::brain('external-docs');
$brain->remember($text, ['source' => 'laravel-docs', 'url' => $url]);
```

## CSV Processing

Use TNTSearch for structured CSV data:

```php
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;

// Create searchable source from CSV
$source = TntSearchSource::fromCsv(
    filepath: storage_path('data/products.csv'),
    columns: ['name', 'description', 'category']
);

// Use in context discovery
Mindwave::prompt()
    ->context($source, query: 'electronics')
    ->section('user', 'Show me available electronics')
    ->run();
```

## Chunking Long Documents

For long documents, split into chunks for better search:

```php
function chunkDocument(string $text, int $chunkSize = 1000): array
{
    // Split by paragraphs
    $paragraphs = preg_split('/\n\s*\n/', $text);

    $chunks = [];
    $currentChunk = '';

    foreach ($paragraphs as $paragraph) {
        if (strlen($currentChunk . $paragraph) > $chunkSize) {
            if ($currentChunk) {
                $chunks[] = trim($currentChunk);
            }
            $currentChunk = $paragraph;
        } else {
            $currentChunk .= "\n\n" . $paragraph;
        }
    }

    if ($currentChunk) {
        $chunks[] = trim($currentChunk);
    }

    return $chunks;
}

// Usage
$pdf = (new PdfLoader)->load($pdfPath);
$chunks = chunkDocument($pdf);

$brain = Mindwave::brain('manuals');
foreach ($chunks as $index => $chunk) {
    $brain->remember($chunk, [
        'source' => 'manual',
        'chunk' => $index,
        'total_chunks' => count($chunks)
    ]);
}
```

## Batch Processing

Process multiple documents efficiently:

```php
use Illuminate\Support\Facades\File;

$brain = Mindwave::brain('knowledge-base');
$documents = File::files(storage_path('documents'));

$batch = [];
foreach ($documents as $file) {
    $content = File::get($file->getPathname());

    $batch[] = [
        'text' => $content,
        'metadata' => [
            'filename' => $file->getFilename(),
            'path' => $file->getPathname(),
            'size' => $file->getSize(),
        ]
    ];
}

// Batch insert for better performance
$brain->rememberMany($batch);
```

## PDF-Specific Features

```php
use Mindwave\Mindwave\Documents\PdfLoader;

$loader = new PdfLoader();

// Load with metadata
$pdf = $loader->load($pdfPath);

// Extract text with page numbers
$pageTexts = $loader->loadByPage($pdfPath);

foreach ($pageTexts as $pageNum => $text) {
    $brain->remember($text, [
        'source' => 'manual',
        'page' => $pageNum
    ]);
}
```

## Best Practices

### 1. Clean Text Before Storage

```php
function cleanText(string $text): string
{
    // Remove extra whitespace
    $text = preg_replace('/\s+/', ' ', $text);

    // Remove control characters
    $text = preg_replace('/[\x00-\x1F\x7F]/', '', $text);

    // Trim
    return trim($text);
}

$content = cleanText($rawContent);
$brain->remember($content, $metadata);
```

### 2. Add Rich Metadata

```php
$brain->remember($content, [
    'source' => 'pdf',
    'filename' => $filename,
    'created_at' => now()->timestamp,
    'author' => $author,
    'category' => $category,
    'page_count' => $pageCount,
]);
```

### 3. Use Appropriate Chunk Sizes

- **Small chunks (500-1000 chars)** - Better precision, more results
- **Medium chunks (1000-2000 chars)** - Balanced
- **Large chunks (2000-4000 chars)** - More context, fewer results

### 4. Process Asynchronously

```php
use Illuminate\Support\Facades\Bus;

// Queue document processing
Bus::dispatch(new ProcessDocumentJob($filePath, $metadata));
```

## Common Patterns

### Pattern 1: PDF Knowledge Base

```php
// Process all PDFs in a directory
$pdfs = File::glob(storage_path('pdfs/*.pdf'));
$brain = Mindwave::brain('pdf-knowledge');

foreach ($pdfs as $pdfPath) {
    $text = (new PdfLoader)->load($pdfPath);
    $chunks = chunkDocument($text, 1500);

    foreach ($chunks as $index => $chunk) {
        $brain->remember($chunk, [
            'source' => basename($pdfPath),
            'chunk' => $index
        ]);
    }
}
```

### Pattern 2: Web Documentation Sync

```php
// Scrape and sync documentation
$urls = [
    'https://laravel.com/docs/installation',
    'https://laravel.com/docs/routing',
];

$brain = Mindwave::brain('external-docs');

foreach ($urls as $url) {
    $html = Http::get($url)->body();
    $text = strip_tags($html);

    $brain->remember($text, [
        'source' => 'laravel-docs',
        'url' => $url,
        'synced_at' => now()->timestamp
    ]);
}
```

### Pattern 3: Mixed Format Processing

```php
// Process various document types
$documents = [
    ['path' => 'manual.pdf', 'type' => 'pdf'],
    ['path' => 'readme.md', 'type' => 'text'],
    ['path' => 'faq.csv', 'type' => 'csv'],
];

$brain = Mindwave::brain('mixed-docs');

foreach ($documents as $doc) {
    match ($doc['type']) {
        'pdf' => processPdf($doc['path'], $brain),
        'text' => processText($doc['path'], $brain),
        'csv' => processCsv($doc['path'], $brain),
    };
}
```

## Complete Documentation

For advanced features including:
- Custom loaders
- Advanced chunking strategies
- Document preprocessing
- Metadata extraction
- Error handling

See the **[RAG Documentation](/docs/rag/overview)**.

## Related Documentation

- [Brain (Vector Store)](/docs/rag/brain) - Vector store API
- [Embeddings Reference](/docs/reference/embeddings.md) - Embedding providers
- [Vector Stores Reference](/docs/reference/vector-stores.md) - Vector databases
