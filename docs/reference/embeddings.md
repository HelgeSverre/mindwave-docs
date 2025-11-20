# Embeddings Reference

Reference for embedding providers and models supported by Mindwave.

## Overview

Mindwave supports multiple embedding providers for generating vector representations of text. Embeddings are used with vector stores for semantic search and RAG (Retrieval-Augmented Generation) applications.

## Supported Providers

### OpenAI Embeddings

OpenAI provides high-quality embedding models optimized for semantic search.

#### Configuration

```bash
MINDWAVE_EMBEDDINGS=openai
MINDWAVE_OPENAI_API_KEY=sk-proj-...
```

#### Available Models

| Model | Dimensions | Cost per 1K Tokens | Best For |
|-------|------------|-------------------|----------|
| `text-embedding-ada-002` | 1536 | $0.0001 | General purpose, most popular |
| `text-embedding-3-small` | 1536 | $0.00002 | Improved performance, lower cost |
| `text-embedding-3-large` | 3072 | $0.00013 | Highest quality, larger vectors |

#### Usage Example

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Get embedding for a single text
$embedding = Mindwave::embeddings()->embed('Laravel is a PHP framework');

// $embedding is an array of 1536 floats
echo count($embedding); // 1536

// Batch embedding
$embeddings = Mindwave::embeddings()->embedBatch([
    'Laravel is a PHP framework',
    'Vue.js is a JavaScript framework',
    'Docker is a containerization platform',
]);

// $embeddings is an array of arrays
echo count($embeddings); // 3
echo count($embeddings[0]); // 1536
```

#### Model Selection

```php
// Use default model (ada-002)
$embedding = Mindwave::embeddings()->embed($text);

// Use specific model
$embedding = Mindwave::embeddings()
    ->model('text-embedding-3-large')
    ->embed($text);
```

#### Performance Characteristics

- **text-embedding-ada-002:**
  - Dimensions: 1536
  - Speed: ~100ms per request
  - Quality: Excellent
  - Cost: $0.0001 per 1K tokens

- **text-embedding-3-small:**
  - Dimensions: 1536
  - Speed: ~80ms per request
  - Quality: Better than ada-002
  - Cost: $0.00002 per 1K tokens (80% cheaper)

- **text-embedding-3-large:**
  - Dimensions: 3072
  - Speed: ~120ms per request
  - Quality: Best available
  - Cost: $0.00013 per 1K tokens

### Custom Embedding Providers

You can implement custom embedding providers by implementing the `EmbeddingProvider` interface:

```php
use Mindwave\Mindwave\Embeddings\Contracts\EmbeddingProvider;

class CustomEmbeddingProvider implements EmbeddingProvider
{
    public function embed(string $text): array
    {
        // Return array of floats
        return [0.1, 0.2, 0.3, ...];
    }

    public function embedBatch(array $texts): array
    {
        // Return array of arrays
        return array_map(fn($text) => $this->embed($text), $texts);
    }

    public function getDimensions(): int
    {
        // Return vector dimensions
        return 1536;
    }
}
```

## Integration with Vector Stores

Embeddings are typically used with vector stores for semantic search:

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Get a Brain (vector store wrapper)
$brain = Mindwave::brain('documentation');

// Store text with automatic embedding
$brain->remember('Laravel is a PHP framework', ['id' => 1]);
$brain->remember('Vue.js is a JavaScript framework', ['id' => 2]);

// Search with automatic embedding
$results = $brain->recall('PHP web framework', limit: 5);

foreach ($results as $result) {
    echo $result->content;
    echo $result->metadata['id'];
    echo $result->score; // Similarity score
}
```

## Best Practices

### Choosing an Embedding Model

**Use `text-embedding-3-small` for:**
- Most applications
- Cost-sensitive projects
- High-volume embedding generation

**Use `text-embedding-ada-002` for:**
- Legacy applications
- Proven stable performance

**Use `text-embedding-3-large` for:**
- Highest accuracy requirements
- Complex semantic understanding
- Research and evaluation

### Batch Processing

For better performance, use batch embedding:

```php
// Bad: One request per item
foreach ($items as $item) {
    $embedding = Mindwave::embeddings()->embed($item->text);
    $item->embedding = $embedding;
}

// Good: Batch request
$texts = $items->pluck('text')->toArray();
$embeddings = Mindwave::embeddings()->embedBatch($texts);

foreach ($items as $index => $item) {
    $item->embedding = $embeddings[$index];
}
```

### Caching Embeddings

Embeddings are deterministic for the same text and model. Cache them to reduce costs:

```php
use Illuminate\Support\Facades\Cache;

function getCachedEmbedding(string $text, string $model = 'text-embedding-ada-002'): array
{
    $cacheKey = "embedding:{$model}:" . md5($text);

    return Cache::remember($cacheKey, now()->addDays(30), function () use ($text, $model) {
        return Mindwave::embeddings()
            ->model($model)
            ->embed($text);
    });
}
```

### Text Preprocessing

Normalize text before embedding for better results:

```php
function normalizeForEmbedding(string $text): string
{
    // Remove extra whitespace
    $text = preg_replace('/\s+/', ' ', $text);

    // Trim
    $text = trim($text);

    // Lowercase (optional, model-dependent)
    // $text = strtolower($text);

    // Remove special characters (optional)
    // $text = preg_replace('/[^a-zA-Z0-9\s]/', '', $text);

    return $text;
}

$embedding = Mindwave::embeddings()->embed(
    normalizeForEmbedding($rawText)
);
```

## Configuration Reference

### Environment Variables

```bash
# Provider Selection
MINDWAVE_EMBEDDINGS=openai

# OpenAI Configuration
MINDWAVE_OPENAI_API_KEY=sk-proj-...
MINDWAVE_OPENAI_ORG_ID=org-...  # Optional
```

### Config File

```php
// config/mindwave-embeddings.php

return [
    'default' => env('MINDWAVE_EMBEDDINGS', 'openai'),

    'embeddings' => [
        'openai' => [
            'api_key' => env('MINDWAVE_OPENAI_API_KEY'),
            'org_id' => env('MINDWAVE_OPENAI_ORG_ID'),
            'model' => env('MINDWAVE_OPENAI_EMBEDDING_MODEL', 'text-embedding-ada-002'),
        ],
    ],
];
```

## Cost Optimization

### Model Comparison

| Task | Recommended Model | Monthly Cost (1M texts) |
|------|------------------|----------------------|
| Production search | text-embedding-3-small | $20 |
| High-volume indexing | text-embedding-3-small | $20 |
| Maximum accuracy | text-embedding-3-large | $130 |
| Legacy systems | text-embedding-ada-002 | $100 |

### Token Counting

Estimate costs before embedding:

```php
use Yethee\Tiktoken\EncoderProvider;

$encoder = (new EncoderProvider)->get('cl100k_base');
$tokens = count($encoder->encode($text));
$estimatedCost = ($tokens / 1000) * 0.00002; // For text-embedding-3-small

echo "Tokens: {$tokens}\n";
echo "Estimated cost: \${$estimatedCost}\n";
```

## Troubleshooting

### Common Issues

**Issue: "Embedding dimensions mismatch"**

Ensure your vector store is configured for the correct dimensions:
- ada-002 and 3-small: 1536 dimensions
- 3-large: 3072 dimensions

**Issue: "Rate limit exceeded"**

Implement exponential backoff:

```php
use Illuminate\Support\Facades\Http;

$retries = 0;
$maxRetries = 3;

while ($retries < $maxRetries) {
    try {
        $embedding = Mindwave::embeddings()->embed($text);
        break;
    } catch (RateLimitException $e) {
        $retries++;
        $delay = pow(2, $retries);
        sleep($delay);
    }
}
```

**Issue: "High costs"**

Use caching and batch processing:

```php
// Cache embeddings
$embedding = Cache::remember("emb:" . md5($text), 3600, fn() =>
    Mindwave::embeddings()->embed($text)
);

// Batch process
$embeddings = Mindwave::embeddings()->embedBatch($texts);
```

## Related Documentation

- [Brain (Vector Store)](/docs/rag/brain) - Vector store integration
- [RAG Overview](/docs/rag/overview) - RAG architecture
- [Vector Stores Reference](/docs/reference/vector-stores.md) - Vector database options
- [Configuration Guide](/docs/configuration.md) - Complete configuration
