# Vector Stores Reference

Reference for vector database providers supported by Mindwave's Brain system.

## Overview

Mindwave supports multiple vector store providers for storing and searching embeddings. Vector stores are accessed through the Brain abstraction, which provides a consistent API across all providers.

## Supported Providers

### Pinecone

Managed vector database with excellent performance and scalability.

#### Configuration

```bash
MINDWAVE_VECTORSTORE=pinecone
MINDWAVE_PINECONE_API_KEY=your-api-key
MINDWAVE_PINECONE_ENVIRONMENT=us-east1-gcp
MINDWAVE_PINECONE_INDEX=mindwave
```

#### Setup

1. Create account at [pinecone.io](https://www.pinecone.io/)
2. Create an index with matching dimensions (1536 for OpenAI ada-002)
3. Copy API key and environment from dashboard

#### Features

- Managed service (no infrastructure)
- High performance at scale
- Built-in metadata filtering
- Real-time updates
- Auto-scaling

#### Best For

- Production applications
- High-volume search
- Managed infrastructure
- Teams without ops expertise

---

### Qdrant

High-performance open-source vector database.

#### Configuration

```bash
MINDWAVE_VECTORSTORE=qdrant
MINDWAVE_QDRANT_HOST=localhost
MINDWAVE_QDRANT_PORT=6333
MINDWAVE_QDRANT_API_KEY=  # Optional
MINDWAVE_QDRANT_COLLECTION=mindwave
```

#### Setup

**Docker:**
```bash
docker run -p 6333:6333 qdrant/qdrant
```

**Cloud:** Available on Qdrant Cloud

#### Features

- Open source
- Self-hosted or cloud
- Advanced filtering
- Hybrid search support
- Excellent performance

#### Best For

- Self-hosted deployments
- On-premise requirements
- Cost optimization
- Full control over infrastructure

---

### Weaviate

Open-source vector database with ML models built-in.

#### Configuration

```bash
MINDWAVE_VECTORSTORE=weaviate
MINDWAVE_WEAVIATE_URL=http://localhost:8080/v1
MINDWAVE_WEAVIATE_API_TOKEN=password
MINDWAVE_WEAVIATE_INDEX=items
MINDWAVE_WEAVIATE_ADDITIONAL_HEADERS='{}'
```

#### Setup

**Docker:**
```bash
docker run -d \
  -p 8080:8080 \
  -e AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED=true \
  semitechnologies/weaviate:latest
```

#### Features

- Open source
- Built-in vectorization
- GraphQL API
- Multi-modal support
- RESTful interface

#### Best For

- Multi-modal applications
- GraphQL integration
- Built-in ML models
- Complex data relationships

---

### File Storage (Development Only)

Simple JSON file storage for development and testing.

#### Configuration

```bash
MINDWAVE_VECTORSTORE=file
MINDWAVE_VECTORSTORE_PATH=storage/mindwave/vectorstore.json
```

#### Features

- No dependencies
- Easy debugging
- Fast setup
- Portable

#### Limitations

- Not suitable for production
- No concurrent access
- No advanced filtering
- Linear search (slow for large datasets)

#### Best For

- Local development
- Testing
- Prototyping
- Small datasets (< 1000 items)

---

### Array Storage (Testing Only)

In-memory storage for unit tests.

#### Configuration

```bash
MINDWAVE_VECTORSTORE=array
```

#### Features

- Ephemeral (lost on restart)
- Fast
- No setup required
- Perfect for testing

#### Best For

- Unit tests
- Integration tests
- CI/CD pipelines
- Ephemeral environments

---

## Using Brain API

The Brain provides a consistent API across all vector stores:

### Store Vectors

```php
use Mindwave\Mindwave\Facades\Mindwave;

$brain = Mindwave::brain('documentation');

// Remember single item
$brain->remember('Laravel is a PHP framework', ['id' => 1, 'type' => 'doc']);

// Remember multiple items
$brain->rememberMany([
    ['text' => 'Vue.js is a framework', 'metadata' => ['id' => 2]],
    ['text' => 'Docker is a platform', 'metadata' => ['id' => 3]],
]);
```

### Search Vectors

```php
// Search by text (automatic embedding)
$results = $brain->recall('PHP web framework', limit: 5);

foreach ($results as $result) {
    echo $result->content;        // Original text
    echo $result->score;          // Similarity score (0-1)
    print_r($result->metadata);   // Metadata array
}

// Search by embedding
$embedding = Mindwave::embeddings()->embed('PHP framework');
$results = $brain->recallByEmbedding($embedding, limit: 5);
```

### Filter by Metadata

```php
// Store with metadata
$brain->remember('Laravel routing', ['category' => 'docs', 'version' => '10.x']);
$brain->remember('Vue components', ['category' => 'tutorial', 'version' => '3.x']);

// Filter during search
$results = $brain->recall('framework basics',
    limit: 5,
    filter: ['category' => 'docs']
);
```

### Forget (Delete) Vectors

```php
// Forget by metadata
$brain->forget(['id' => 1]);

// Clear all
$brain->forgetAll();
```

## Performance Comparison

| Feature | Pinecone | Qdrant | Weaviate | File | Array |
|---------|----------|--------|----------|------|-------|
| Scale | Millions | Millions | Millions | < 10K | < 1K |
| Speed | Excellent | Excellent | Excellent | Slow | Fast |
| Setup | Easy | Medium | Medium | Easy | Easy |
| Cost | Paid | Free/Paid | Free/Paid | Free | Free |
| Filtering | Yes | Yes | Yes | Limited | Limited |
| Production | Yes | Yes | Yes | No | No |

## Configuration Examples

### Development Setup

```bash
# Simple file storage for local dev
MINDWAVE_VECTORSTORE=file
MINDWAVE_VECTORSTORE_PATH=storage/mindwave/vectors.json
```

### Production Setup (Pinecone)

```bash
MINDWAVE_VECTORSTORE=pinecone
MINDWAVE_PINECONE_API_KEY=${PINECONE_KEY}  # From secrets manager
MINDWAVE_PINECONE_ENVIRONMENT=us-east1-gcp
MINDWAVE_PINECONE_INDEX=production-vectors
```

### Self-Hosted Setup (Qdrant)

```bash
MINDWAVE_VECTORSTORE=qdrant
MINDWAVE_QDRANT_HOST=qdrant.internal
MINDWAVE_QDRANT_PORT=6333
MINDWAVE_QDRANT_API_KEY=${QDRANT_KEY}
MINDWAVE_QDRANT_COLLECTION=app-vectors
```

## Migration Between Providers

Migrate data between vector stores:

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Source brain
$source = Mindwave::brain('old-brain');
$source->setDriver('file');

// Destination brain
$destination = Mindwave::brain('new-brain');
$destination->setDriver('pinecone');

// Get all vectors from source
$vectors = $source->getAllVectors(); // Depends on provider

// Store in destination
foreach ($vectors as $vector) {
    $destination->remember($vector->text, $vector->metadata, $vector->embedding);
}
```

## Best Practices

### Choose the Right Provider

**Pinecone** - Best for:
- Production applications
- Startups and small teams
- Managed infrastructure preference

**Qdrant** - Best for:
- Self-hosted requirements
- Cost optimization
- Full infrastructure control

**Weaviate** - Best for:
- Multi-modal use cases
- GraphQL integration
- Built-in ML models

**File/Array** - Best for:
- Development only
- Testing only

### Index Configuration

Configure dimensions to match your embedding model:

```bash
# OpenAI ada-002 or 3-small
Dimensions: 1536

# OpenAI 3-large
Dimensions: 3072
```

### Metadata Strategy

Use consistent metadata across your application:

```php
$brain->remember($text, [
    'id' => $model->id,
    'type' => 'article',
    'category' => 'tech',
    'created_at' => now()->timestamp,
    'author_id' => $author->id,
]);
```

### Batch Operations

Use batch operations for better performance:

```php
// Bad: Individual inserts
foreach ($items as $item) {
    $brain->remember($item->text, ['id' => $item->id]);
}

// Good: Batch insert
$batch = $items->map(fn($item) => [
    'text' => $item->text,
    'metadata' => ['id' => $item->id]
])->toArray();

$brain->rememberMany($batch);
```

## Troubleshooting

### Connection Issues

**Pinecone:**
```bash
# Test API key
curl -H "Api-Key: YOUR_KEY" https://controller.YOUR_ENV.pinecone.io/databases
```

**Qdrant:**
```bash
# Test connection
curl http://localhost:6333/collections
```

**Weaviate:**
```bash
# Test connection
curl http://localhost:8080/v1/.well-known/ready
```

### Dimension Mismatch

Ensure vector dimensions match across:
1. Embedding model output
2. Vector store configuration
3. Query vectors

```php
// Check embedding dimensions
$embedding = Mindwave::embeddings()->embed('test');
echo count($embedding); // Should match vector store config
```

### Slow Queries

**Optimize with:**
1. Proper indexing
2. Metadata filtering
3. Limit result count
4. Batch operations

```php
// Use filters to reduce search space
$results = $brain->recall($query,
    limit: 10,  // Reasonable limit
    filter: ['category' => 'relevant']  // Filter early
);
```

## Related Documentation

- [Brain API](/docs/core/brain) - Brain usage guide
- [Embeddings Reference](/docs/reference/embeddings.md) - Embedding providers
- [RAG Overview](/docs/rag/overview) - RAG architecture
- [Configuration Guide](/docs/configuration.md) - Complete configuration
