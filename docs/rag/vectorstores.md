# Vector Stores

Vector stores enable semantic search capabilities in your Laravel application, allowing you to find content based on meaning rather than exact keyword matches. This is essential for building sophisticated RAG (Retrieval-Augmented Generation) systems.

## Overview

### What Are Vector Stores?

Vector stores are specialized databases that store numerical representations (embeddings) of text and enable similarity searches based on semantic meaning. Unlike traditional keyword search, vector stores understand context and meaning.

**Example:**
```php
// Keyword search: Only finds exact matches
$results = DB::table('docs')->where('content', 'LIKE', '%apple%')->get();

// Semantic search: Finds conceptually similar content
$results = Brain::search('fruit from trees');
// Returns: "apple", "orange", "cherry" - even without exact matches
```

### Semantic Search vs Keyword Search

| Aspect | Keyword Search | Semantic Search |
|--------|----------------|-----------------|
| **Matching** | Exact text matches | Conceptual similarity |
| **Synonyms** | Missed unless explicit | Automatically understood |
| **Context** | Ignored | Central to matching |
| **Typos** | Break results | Often still works |
| **Multi-language** | Limited | Possible with right model |
| **Speed** | Very fast | Fast (with index) |
| **Setup** | Simple | Requires embeddings |

### How Embeddings Work

Embeddings convert text into high-dimensional numerical vectors (typically 1536 dimensions for OpenAI's `text-embedding-ada-002`). Similar concepts produce similar vectors, which enables semantic search.

```php
use Mindwave\Mindwave\Facades\Embeddings;

// Convert text to a numerical vector
$vector = Embeddings::embedText('The quick brown fox');
// Returns: EmbeddingVector with 1536 float values

// Similar texts produce similar vectors
$v1 = Embeddings::embedText('dog');
$v2 = Embeddings::embedText('puppy');
$v3 = Embeddings::embedText('car');
// $v1 and $v2 will be much closer to each other than to $v3
```

### When to Use Vector Stores vs TNTSearch

**Use Vector Stores when:**
- You need semantic understanding ("find similar concepts")
- Working with multi-language content
- Building Q&A systems or chatbots
- Matching user intent rather than keywords
- Content has many synonyms or paraphrases

**Use TNTSearch when:**
- You need exact phrase matching
- Searching code, IDs, or precise terms
- Speed is absolutely critical
- Don't want embedding API costs
- Simple keyword search is sufficient

**Best: Use both together!**
```php
use Mindwave\Mindwave\PromptComposer\PromptComposer;
use Mindwave\Mindwave\Context\Sources\VectorStoreSource;
use Mindwave\Mindwave\Context\Sources\TntSearchSource;

$prompt = PromptComposer::make()
    ->addContextSource(VectorStoreSource::fromBrain($brain))  // Semantic
    ->addContextSource(TntSearchSource::fromEngine($tnt))     // Keyword
    ->query('How do I configure Redis?')
    ->build();
```

## Supported Vector Stores

Mindwave supports multiple vector store providers, from managed cloud solutions to self-hosted options.

### Pinecone

**Managed vector database with excellent performance and reliability.**

**When to use:**
- Production applications requiring high availability
- Don't want to manage infrastructure
- Need scalability without operational overhead
- Willing to pay for managed service

**Pros:**
- Fully managed (no infrastructure to maintain)
- Excellent performance and reliability
- Automatic scaling
- Built-in monitoring and analytics
- Simple API
- Great documentation

**Cons:**
- Paid service (can get expensive at scale)
- Vendor lock-in
- Less control over infrastructure
- Cold start times on free tier

**Best for:** Production applications, teams without DevOps resources

### Weaviate

**Open-source vector database with cloud and self-hosted options.**

**When to use:**
- Want open-source solution
- Need advanced filtering capabilities
- Building complex multi-modal applications
- Want flexibility between self-hosted and managed

**Pros:**
- Open source
- Flexible hosting (self-hosted or cloud)
- Advanced filtering and hybrid search
- GraphQL API
- Active community
- Multi-modal support

**Cons:**
- More complex setup than Pinecone
- Requires infrastructure management (if self-hosted)
- Steeper learning curve
- Cloud offering newer than Pinecone

**Best for:** Teams comfortable with infrastructure, complex search requirements

### Qdrant

**High-performance vector database designed for speed and scale.**

**When to use:**
- Performance is critical
- Need advanced filtering
- Want Rust-based performance
- Planning to self-host

**Pros:**
- Excellent performance (Rust-based)
- Open source
- Rich filtering capabilities
- Good documentation
- Docker-friendly
- Cloud option available

**Cons:**
- Smaller ecosystem than Weaviate/Pinecone
- Newer to the market
- Self-hosted requires infrastructure management

**Best for:** Performance-critical applications, teams with DevOps capabilities

### File Storage

**JSON file-based storage for development and testing.**

**When to use:**
- Local development
- Testing
- Small datasets
- Prototyping

**Pros:**
- No setup required
- Easy to inspect (JSON files)
- No external dependencies
- Free

**Cons:**
- Very slow with large datasets
- Not suitable for production
- No concurrent access handling
- Limited scalability

**Best for:** Development, testing, small prototypes

### Array Storage

**In-memory storage for unit tests.**

**When to use:**
- Unit testing
- CI/CD pipelines
- Temporary operations

**Pros:**
- Extremely fast
- No persistence overhead
- Perfect for tests
- Zero configuration

**Cons:**
- Data lost when process ends
- Limited to available RAM
- Not for production

**Best for:** Unit tests, temporary calculations

## Setup & Configuration

### Configuration File

Publish the configuration file:

```bash
php artisan vendor:publish --tag=mindwave-vectorstore-config
```

This creates `config/mindwave-vectorstore.php`:

```php
return [
    'default' => env('MINDWAVE_VECTORSTORE', 'pinecone'),

    'vectorstores' => [
        'array' => [
            // No configuration needed
        ],

        'file' => [
            'path' => env('MINDWAVE_VECTORSTORE_PATH', storage_path('mindwave/vectorstore.json')),
        ],

        'pinecone' => [
            'api_key' => env('MINDWAVE_PINECONE_API_KEY'),
            'environment' => env('MINDWAVE_PINECONE_ENVIRONMENT'),
            'index' => env('MINDWAVE_PINECONE_INDEX'),
        ],

        'weaviate' => [
            'api_url' => env('MINDWAVE_WEAVIATE_URL', 'http://localhost:8080/v1'),
            'api_token' => env('MINDWAVE_WEAVIATE_API_TOKEN', 'password'),
            'index' => env('MINDWAVE_WEAVIATE_INDEX', 'items'),
            'additional_headers' => [],
        ],

        'qdrant' => [
            'host' => env('MINDWAVE_QDRANT_HOST', 'localhost'),
            'port' => env('MINDWAVE_QDRANT_PORT', '6333'),
            'api_key' => env('MINDWAVE_QDRANT_API_KEY', ''),
            'collection' => env('MINDWAVE_QDRANT_COLLECTION', 'items'),
        ],
    ],
];
```

### Pinecone Setup

**1. Create Pinecone Account**

Sign up at [pinecone.io](https://www.pinecone.io/) and create a project.

**2. Create an Index**

In the Pinecone console:
- Click "Create Index"
- **Name:** `mindwave-vectors` (or your preferred name)
- **Dimensions:** `1536` (for OpenAI `text-embedding-ada-002`)
- **Metric:** `cosine`
- **Pod Type:** Choose based on your needs (starter for development)

**3. Get API Credentials**

Copy your API key and environment from the console.

**4. Configure Environment**

Add to `.env`:

```dotenv
MINDWAVE_VECTORSTORE=pinecone
MINDWAVE_PINECONE_API_KEY=your-api-key-here
MINDWAVE_PINECONE_ENVIRONMENT=us-west1-gcp-free
MINDWAVE_PINECONE_INDEX=mindwave-vectors
```

**5. Install Dependencies**

```bash
composer require probots-io/pinecone-php
```

**6. Verify Connection**

```php
use Mindwave\Mindwave\Facades\Vectorstore;

// Should work without errors
$count = Vectorstore::itemCount();
echo "Items in index: {$count}";
```

### Weaviate Setup

#### Option A: Docker (Recommended for Development)

**1. Create Docker Compose File**

Create `docker-compose.yml`:

```yaml
version: '3.4'
services:
  weaviate:
    image: cr.weaviate.io/semitechnologies/weaviate:latest
    ports:
      - "8080:8080"
      - "50051:50051"
    environment:
      QUERY_DEFAULTS_LIMIT: 25
      AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED: 'true'
      PERSISTENCE_DATA_PATH: '/var/lib/weaviate'
      DEFAULT_VECTORIZER_MODULE: 'none'
      ENABLE_MODULES: ''
      CLUSTER_HOSTNAME: 'node1'
    volumes:
      - weaviate_data:/var/lib/weaviate

volumes:
  weaviate_data:
```

**2. Start Weaviate**

```bash
docker-compose up -d
```

**3. Configure Environment**

Add to `.env`:

```dotenv
MINDWAVE_VECTORSTORE=weaviate
MINDWAVE_WEAVIATE_URL=http://localhost:8080/v1
MINDWAVE_WEAVIATE_API_TOKEN=password
MINDWAVE_WEAVIATE_INDEX=MindwaveItems
```

#### Option B: Weaviate Cloud

**1. Create Cluster**

Sign up at [console.weaviate.cloud](https://console.weaviate.cloud/) and create a cluster.

**2. Get Credentials**

Copy your cluster URL and API key from the console.

**3. Configure Environment**

```dotenv
MINDWAVE_VECTORSTORE=weaviate
MINDWAVE_WEAVIATE_URL=https://your-cluster.weaviate.network/v1
MINDWAVE_WEAVIATE_API_TOKEN=your-api-key
MINDWAVE_WEAVIATE_INDEX=MindwaveItems
```

**4. Install Dependencies**

```bash
composer require weaviate/weaviate-php
```

**5. Verify Connection**

```php
use Mindwave\Mindwave\Facades\Vectorstore;

$count = Vectorstore::itemCount();
echo "Items in collection: {$count}";
```

The schema/class is created automatically on first insert.

### Qdrant Setup

#### Option A: Docker (Recommended for Development)

**1. Start Qdrant**

```bash
docker run -p 6333:6333 qdrant/qdrant
```

Or with Docker Compose:

```yaml
version: '3.4'
services:
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_storage:/qdrant/storage

volumes:
  qdrant_storage:
```

**2. Configure Environment**

Add to `.env`:

```dotenv
MINDWAVE_VECTORSTORE=qdrant
MINDWAVE_QDRANT_HOST=localhost
MINDWAVE_QDRANT_PORT=6333
MINDWAVE_QDRANT_API_KEY=
MINDWAVE_QDRANT_COLLECTION=mindwave_items
```

#### Option B: Qdrant Cloud

**1. Create Cluster**

Sign up at [cloud.qdrant.io](https://cloud.qdrant.io/) and create a cluster.

**2. Get Credentials**

Copy your cluster URL and API key.

**3. Configure Environment**

```dotenv
MINDWAVE_VECTORSTORE=qdrant
MINDWAVE_QDRANT_HOST=your-cluster.qdrant.io
MINDWAVE_QDRANT_PORT=6333
MINDWAVE_QDRANT_API_KEY=your-api-key
MINDWAVE_QDRANT_COLLECTION=mindwave_items
```

**4. Install Dependencies**

```bash
composer require qdrant/php-client
```

**5. Verify Connection**

```php
use Mindwave\Mindwave\Facades\Vectorstore;

$count = Vectorstore::itemCount();
echo "Items in collection: {$count}";
```

The collection is created automatically on first insert.

### File Storage Setup (Development Only)

**Configure Environment**

```dotenv
MINDWAVE_VECTORSTORE=file
MINDWAVE_VECTORSTORE_PATH=/path/to/storage/vectorstore.json
```

The file is created automatically when you insert the first vector.

### Array Storage Setup (Testing Only)

**Configure Environment**

```dotenv
MINDWAVE_VECTORSTORE=array
```

No additional configuration needed. Data exists only in memory.

## Creating Embeddings

Before storing vectors, you need to convert text into embeddings. Mindwave uses OpenAI's embedding models by default.

### Embedding Models

**text-embedding-ada-002** (Recommended)
- **Dimensions:** 1536
- **Cost:** $0.0001 per 1K tokens
- **Max tokens:** 8,191
- **Best for:** General use, cost-effective

**text-embedding-3-small**
- **Dimensions:** 1536 (default) or configurable
- **Cost:** $0.00002 per 1K tokens
- **Max tokens:** 8,191
- **Best for:** Budget-conscious applications

**text-embedding-3-large**
- **Dimensions:** 3072 (default) or configurable
- **Cost:** $0.00013 per 1K tokens
- **Max tokens:** 8,191
- **Best for:** Highest quality results

### Configure Embeddings

```dotenv
MINDWAVE_EMBEDDINGS_DRIVER=openai
MINDWAVE_OPENAI_API_KEY=your-openai-api-key
MINDWAVE_OPENAI_EMBEDDING_MODEL=text-embedding-ada-002
```

### Single Text Embedding

```php
use Mindwave\Mindwave\Facades\Embeddings;

// Embed a single text string
$vector = Embeddings::embedText('Laravel is a web framework');

// Returns: EmbeddingVector with 1536 float values
echo count($vector); // 1536
echo $vector[0];     // e.g., 0.0023064255
```

### Batch Text Embedding

Batch embedding is more efficient for multiple texts:

```php
use Mindwave\Mindwave\Facades\Embeddings;

$texts = [
    'Laravel is a web framework',
    'PHP is a programming language',
    'Vector stores enable semantic search',
];

// Embed all texts in a single API call
$vectors = Embeddings::embedTexts($texts);

// Returns: Array of EmbeddingVector objects
foreach ($vectors as $vector) {
    echo count($vector); // 1536
}
```

### Document Embedding

When working with Document objects:

```php
use Mindwave\Mindwave\Facades\Embeddings;
use Mindwave\Mindwave\Document\Data\Document;

$document = new Document(
    content: 'Laravel is a web framework',
    metadata: ['category' => 'framework', 'language' => 'PHP']
);

// Embed a single document
$vector = Embeddings::embedDocument($document);

// Embed multiple documents
$documents = [
    new Document('First document'),
    new Document('Second document'),
    new Document('Third document'),
];

$vectors = Embeddings::embedDocuments($documents);
```

### Cost Considerations

Embedding API calls are charged per token. Be mindful of costs with large datasets:

```php
// Example costs (using text-embedding-ada-002 at $0.0001/1K tokens)

// 1,000 documents × 500 tokens each = 500,000 tokens
// Cost: 500 × $0.0001 = $0.05

// 100,000 documents × 500 tokens each = 50,000,000 tokens
// Cost: 50,000 × $0.0001 = $5.00
```

**Cost optimization strategies:**
1. Cache embeddings - don't re-embed unchanged content
2. Use batch operations - more efficient than individual calls
3. Consider cheaper models - `text-embedding-3-small` is 5× cheaper
4. Chunk wisely - don't embed tiny fragments

## Storing Vectors

Once you have embeddings, you can store them in your vector store.

### Using the Vectorstore Facade

The simplest way to work with vector stores:

```php
use Mindwave\Mindwave\Facades\Vectorstore;
use Mindwave\Mindwave\Facades\Embeddings;
use Mindwave\Mindwave\Document\Data\Document;
use Mindwave\Mindwave\Vectorstore\Data\VectorStoreEntry;

// Create a document
$document = new Document(
    content: 'Laravel is a web application framework',
    metadata: ['category' => 'framework', 'source' => 'docs']
);

// Create embedding
$vector = Embeddings::embedDocument($document);

// Create vector store entry
$entry = new VectorStoreEntry(
    vector: $vector,
    document: $document
);

// Insert into vector store
Vectorstore::insert($entry);
```

### Batch Inserting

For multiple documents, use batch operations:

```php
use Mindwave\Mindwave\Facades\Vectorstore;
use Mindwave\Mindwave\Facades\Embeddings;
use Mindwave\Mindwave\Document\Data\Document;
use Mindwave\Mindwave\Vectorstore\Data\VectorStoreEntry;

$documents = [
    new Document('Laravel is a framework'),
    new Document('PHP is a language'),
    new Document('Mindwave adds AI to Laravel'),
];

// Batch embed for efficiency
$vectors = Embeddings::embedDocuments($documents);

// Create entries
$entries = [];
foreach ($documents as $index => $document) {
    $entries[] = new VectorStoreEntry(
        vector: $vectors[$index],
        document: $document
    );
}

// Batch insert (more efficient than individual inserts)
Vectorstore::insertMany($entries);
```

### Provider-Specific Examples

#### Pinecone

```php
use Mindwave\Mindwave\Vectorstore\Drivers\Pinecone;
use Mindwave\Mindwave\Vectorstore\Data\VectorStoreEntry;
use Mindwave\Mindwave\Document\Data\Document;
use Mindwave\Mindwave\Facades\Embeddings;
use Probots\Pinecone\Client;

// Create Pinecone client
$client = new Client(
    apiKey: config('mindwave-vectorstore.vectorstores.pinecone.api_key'),
    indexHost: config('mindwave-vectorstore.vectorstores.pinecone.index_host'),
);

$vectorstore = new Pinecone(
    client: $client,
    index: config('mindwave-vectorstore.vectorstores.pinecone.index')
);

// Insert documents
$documents = [
    new Document('Pinecone is a managed vector database'),
    new Document('Vector search enables semantic matching'),
];

$vectors = Embeddings::embedDocuments($documents);

$entries = array_map(
    fn($doc, $vec) => new VectorStoreEntry($vec, $doc),
    $documents,
    $vectors
);

$vectorstore->insertMany($entries);

// Check count
echo "Total vectors: " . $vectorstore->itemCount();
```

#### Weaviate

```php
use Mindwave\Mindwave\Vectorstore\Drivers\Weaviate;
use Mindwave\Mindwave\Vectorstore\Data\VectorStoreEntry;
use Mindwave\Mindwave\Document\Data\Document;
use Mindwave\Mindwave\Facades\Embeddings;
use Weaviate\Weaviate as WeaviateClient;

// Create Weaviate client
$client = new WeaviateClient(
    apiUrl: config('mindwave-vectorstore.vectorstores.weaviate.api_url'),
    apiToken: config('mindwave-vectorstore.vectorstores.weaviate.api_token'),
    additionalHeaders: config('mindwave-vectorstore.vectorstores.weaviate.additional_headers', [])
);

$vectorstore = new Weaviate(
    client: $client,
    className: config('mindwave-vectorstore.vectorstores.weaviate.index')
);

// Insert documents (schema created automatically)
$document = new Document('Weaviate supports GraphQL queries');
$vector = Embeddings::embedDocument($document);
$entry = new VectorStoreEntry($vector, $document);

$vectorstore->insert($entry);
```

#### Qdrant

```php
use Mindwave\Mindwave\Vectorstore\Drivers\Qdrant;
use Mindwave\Mindwave\Vectorstore\Data\VectorStoreEntry;
use Mindwave\Mindwave\Document\Data\Document;
use Mindwave\Mindwave\Facades\Embeddings;

// Create Qdrant vector store
$vectorstore = new Qdrant(
    apiKey: config('mindwave-vectorstore.vectorstores.qdrant.api_key'),
    collection: config('mindwave-vectorstore.vectorstores.qdrant.collection'),
    host: config('mindwave-vectorstore.vectorstores.qdrant.host'),
    port: (int) config('mindwave-vectorstore.vectorstores.qdrant.port'),
);

// Insert documents (collection created automatically)
$documents = [
    new Document('Qdrant is built with Rust'),
    new Document('High performance vector search'),
];

$vectors = Embeddings::embedDocuments($documents);
$entries = array_map(
    fn($doc, $vec) => new VectorStoreEntry($vec, $doc),
    $documents,
    $vectors
);

$vectorstore->insertMany($entries);
```

### Document Metadata

Store additional metadata with your documents:

```php
use Mindwave\Mindwave\Document\Data\Document;
use Mindwave\Mindwave\Vectorstore\Data\VectorStoreEntry;
use Mindwave\Mindwave\Facades\Embeddings;
use Mindwave\Mindwave\Facades\Vectorstore;

$document = new Document(
    content: 'Laravel 11 introduces new features',
    metadata: [
        'title' => 'Laravel 11 Release Notes',
        'category' => 'release-notes',
        'version' => '11.0',
        'published_at' => '2024-03-12',
        'url' => 'https://laravel.com/docs/11.x/releases',
    ]
);

$vector = Embeddings::embedDocument($document);
$entry = new VectorStoreEntry($vector, $document);

Vectorstore::insert($entry);
```

The metadata is preserved and returned with search results.

## Semantic Search

Perform similarity searches to find semantically related content.

### Basic Search

```php
use Mindwave\Mindwave\Facades\Vectorstore;
use Mindwave\Mindwave\Facades\Embeddings;

// Search for similar content
$query = 'web framework for PHP';
$queryVector = Embeddings::embedText($query);

// Find top 5 most similar documents
$results = Vectorstore::similaritySearch($queryVector, count: 5);

foreach ($results as $result) {
    echo "Score: {$result->score}\n";
    echo "Content: {$result->document->content()}\n";
    echo "---\n";
}
```

### Accessing Search Results

Search results are `VectorStoreEntry` objects:

```php
use Mindwave\Mindwave\Facades\Vectorstore;
use Mindwave\Mindwave\Facades\Embeddings;

$query = 'How do I configure Redis?';
$results = Vectorstore::similaritySearch(
    Embeddings::embedText($query),
    count: 3
);

foreach ($results as $result) {
    // Similarity score (0-1, higher is better)
    $score = $result->score;

    // The document
    $document = $result->document;
    $content = $document->content();
    $metadata = $document->metadata();

    // The embedding vector
    $vector = $result->vector;

    echo "Similarity: {$score}\n";
    echo "Content: {$content}\n";
    echo "Category: {$metadata['category']}\n";
    echo "\n";
}
```

### Top-K Retrieval

Control how many results to return:

```php
use Mindwave\Mindwave\Facades\Vectorstore;
use Mindwave\Mindwave\Facades\Embeddings;

$query = Embeddings::embedText('Laravel best practices');

// Get top 3 results
$top3 = Vectorstore::similaritySearch($query, count: 3);

// Get top 10 results
$top10 = Vectorstore::similaritySearch($query, count: 10);

// Get top 20 results
$top20 = Vectorstore::similaritySearch($query, count: 20);
```

### Score Thresholds

Filter results by minimum similarity score:

```php
use Mindwave\Mindwave\Facades\Vectorstore;
use Mindwave\Mindwave\Facades\Embeddings;

$query = Embeddings::embedText('database optimization');
$results = Vectorstore::similaritySearch($query, count: 10);

// Only use results above threshold
$threshold = 0.7;
$filtered = array_filter(
    $results,
    fn($result) => $result->score >= $threshold
);

foreach ($filtered as $result) {
    echo "High-quality match (score: {$result->score})\n";
    echo $result->document->content() . "\n\n";
}
```

### Provider-Specific Search

#### Pinecone Search

```php
use Mindwave\Mindwave\Vectorstore\Drivers\Pinecone;
use Mindwave\Mindwave\Facades\Embeddings;
use Probots\Pinecone\Client;

$client = new Client(
    apiKey: env('MINDWAVE_PINECONE_API_KEY'),
    indexHost: env('MINDWAVE_PINECONE_INDEX_HOST')
);

$vectorstore = new Pinecone($client, env('MINDWAVE_PINECONE_INDEX'));

$query = 'machine learning frameworks';
$queryVector = Embeddings::embedText($query);

$results = $vectorstore->similaritySearch($queryVector, count: 5);

foreach ($results as $result) {
    echo "Pinecone Score: {$result->score}\n";
    echo "Content: {$result->document->content()}\n\n";
}
```

#### Weaviate Search

```php
use Mindwave\Mindwave\Vectorstore\Drivers\Weaviate;
use Mindwave\Mindwave\Facades\Embeddings;
use Weaviate\Weaviate as WeaviateClient;

$client = new WeaviateClient(
    apiUrl: env('MINDWAVE_WEAVIATE_URL'),
    apiToken: env('MINDWAVE_WEAVIATE_API_TOKEN')
);

$vectorstore = new Weaviate($client, env('MINDWAVE_WEAVIATE_INDEX'));

$query = 'GraphQL API design';
$queryVector = Embeddings::embedText($query);

$results = $vectorstore->similaritySearch($queryVector, count: 5);

foreach ($results as $result) {
    echo "Weaviate Score: {$result->score}\n";
    echo "Content: {$result->document->content()}\n\n";
}
```

#### Qdrant Search

```php
use Mindwave\Mindwave\Vectorstore\Drivers\Qdrant;
use Mindwave\Mindwave\Facades\Embeddings;

$vectorstore = new Qdrant(
    apiKey: env('MINDWAVE_QDRANT_API_KEY'),
    collection: env('MINDWAVE_QDRANT_COLLECTION'),
    host: env('MINDWAVE_QDRANT_HOST'),
    port: (int) env('MINDWAVE_QDRANT_PORT')
);

$query = 'high performance search';
$queryVector = Embeddings::embedText($query);

$results = $vectorstore->similaritySearch($queryVector, count: 5);

foreach ($results as $result) {
    echo "Qdrant Score: {$result->score}\n";
    echo "Content: {$result->document->content()}\n\n";
}
```

## Using VectorStoreSource

`VectorStoreSource` integrates vector stores with Mindwave's Context Pipeline, enabling semantic search in your RAG workflows.

### Creating a VectorStoreSource

```php
use Mindwave\Mindwave\Brain\Brain;
use Mindwave\Mindwave\Context\Sources\VectorStoreSource;
use Mindwave\Mindwave\Facades\Vectorstore;
use Mindwave\Mindwave\Facades\Embeddings;

// Create a Brain instance (combines vector store + embeddings)
$brain = new Brain(
    vectorstore: Vectorstore::driver(),
    embeddings: Embeddings::driver()
);

// Create VectorStoreSource from Brain
$vectorSource = VectorStoreSource::fromBrain($brain);

// Search for context
$results = $vectorSource->search('How do I configure queues?', limit: 5);

foreach ($results as $item) {
    echo "Score: {$item->score}\n";
    echo "Content: {$item->content}\n";
    echo "Source: {$item->source}\n";
    echo "---\n";
}
```

### Custom Source Name

```php
use Mindwave\Mindwave\Context\Sources\VectorStoreSource;

// Use custom name for tracking
$vectorSource = VectorStoreSource::fromBrain(
    brain: $brain,
    name: 'documentation-vectors'
);

echo $vectorSource->getName(); // 'documentation-vectors'
```

### Integration with Context Pipeline

Use VectorStoreSource alongside other context sources:

```php
use Mindwave\Mindwave\PromptComposer\PromptComposer;
use Mindwave\Mindwave\Context\Sources\VectorStoreSource;
use Mindwave\Mindwave\Context\Sources\TntSearchSource;
use Mindwave\Mindwave\Context\Sources\DatabaseSource;

$composer = PromptComposer::make()
    ->model('gpt-4')
    ->systemPrompt('You are a helpful Laravel expert.')

    // Add semantic search
    ->addContextSource(VectorStoreSource::fromBrain($brain))

    // Add keyword search
    ->addContextSource(TntSearchSource::fromEngine($tntEngine))

    // Add database lookup
    ->addContextSource(DatabaseSource::fromQuery(
        Article::where('published', true)
    ))

    ->query('How do I optimize Laravel performance?')
    ->build();

// Context is retrieved from all sources and injected into the prompt
```

### Complete Working Example

```php
use Mindwave\Mindwave\Brain\Brain;
use Mindwave\Mindwave\Context\Sources\VectorStoreSource;
use Mindwave\Mindwave\PromptComposer\PromptComposer;
use Mindwave\Mindwave\Facades\Vectorstore;
use Mindwave\Mindwave\Facades\Embeddings;
use Mindwave\Mindwave\Facades\LLM;
use Mindwave\Mindwave\Document\Data\Document;
use Mindwave\Mindwave\Vectorstore\Data\VectorStoreEntry;

// 1. Populate vector store with knowledge base
$documents = [
    new Document(
        content: 'Laravel queues allow you to defer time-consuming tasks.',
        metadata: ['topic' => 'queues', 'section' => 'overview']
    ),
    new Document(
        content: 'Configure queue connection in config/queue.php.',
        metadata: ['topic' => 'queues', 'section' => 'configuration']
    ),
    new Document(
        content: 'Use php artisan queue:work to process jobs.',
        metadata: ['topic' => 'queues', 'section' => 'commands']
    ),
];

$vectors = Embeddings::embedDocuments($documents);
$entries = array_map(
    fn($doc, $vec) => new VectorStoreEntry($vec, $doc),
    $documents,
    $vectors
);

Vectorstore::insertMany($entries);

// 2. Create Brain and VectorStoreSource
$brain = new Brain(
    vectorstore: Vectorstore::driver(),
    embeddings: Embeddings::driver()
);

$vectorSource = VectorStoreSource::fromBrain($brain, 'laravel-docs');

// 3. Build prompt with semantic context
$prompt = PromptComposer::make()
    ->model('gpt-4')
    ->systemPrompt('You are a Laravel expert. Use the provided context to answer questions.')
    ->addContextSource($vectorSource)
    ->query('How do I start processing queued jobs?')
    ->build();

// 4. Get AI response with relevant context
$response = LLM::completion($prompt);

echo $response;
// Output: "To start processing queued jobs, use the command
//          `php artisan queue:work`. This will process jobs from your queue..."
```

## Real-World Examples

### Example 1: Documentation Search

Build a semantic documentation search for your Laravel application.

```php
<?php

namespace App\Services;

use Mindwave\Mindwave\Brain\Brain;
use Mindwave\Mindwave\Context\Sources\VectorStoreSource;
use Mindwave\Mindwave\PromptComposer\PromptComposer;
use Mindwave\Mindwave\Facades\Vectorstore;
use Mindwave\Mindwave\Facades\Embeddings;
use Mindwave\Mindwave\Facades\LLM;
use Mindwave\Mindwave\Document\Data\Document;
use Mindwave\Mindwave\Vectorstore\Data\VectorStoreEntry;

class DocumentationSearchService
{
    private Brain $brain;

    public function __construct()
    {
        $this->brain = new Brain(
            vectorstore: Vectorstore::driver(),
            embeddings: Embeddings::driver()
        );
    }

    /**
     * Index documentation files
     */
    public function indexDocumentation(array $markdownFiles): void
    {
        $documents = [];

        foreach ($markdownFiles as $file) {
            $content = file_get_contents($file);
            $title = $this->extractTitle($content);

            $documents[] = new Document(
                content: $content,
                metadata: [
                    'title' => $title,
                    'file' => basename($file),
                    'path' => $file,
                    'indexed_at' => now()->toIso8601String(),
                ]
            );
        }

        // Batch embed for efficiency
        $vectors = Embeddings::embedDocuments($documents);

        $entries = array_map(
            fn($doc, $vec) => new VectorStoreEntry($vec, $doc),
            $documents,
            $vectors
        );

        Vectorstore::insertMany($entries);
    }

    /**
     * Search documentation semantically
     */
    public function search(string $query, int $limit = 5): array
    {
        $results = $this->brain->search($query, $limit);

        return array_map(function($document) {
            return [
                'title' => $document->metadata()['title'] ?? 'Untitled',
                'content' => $document->content(),
                'file' => $document->metadata()['file'] ?? '',
                'path' => $document->metadata()['path'] ?? '',
            ];
        }, $results);
    }

    /**
     * Answer questions using documentation context
     */
    public function answerQuestion(string $question): string
    {
        $vectorSource = VectorStoreSource::fromBrain($this->brain, 'documentation');

        $prompt = PromptComposer::make()
            ->model('gpt-4')
            ->systemPrompt('You are a helpful documentation assistant. Answer questions using the provided documentation context.')
            ->addContextSource($vectorSource)
            ->query($question)
            ->build();

        return LLM::completion($prompt);
    }

    private function extractTitle(string $markdown): string
    {
        if (preg_match('/^#\s+(.+)$/m', $markdown, $matches)) {
            return trim($matches[1]);
        }
        return 'Untitled';
    }
}
```

**Usage:**

```php
use App\Services\DocumentationSearchService;

$docService = new DocumentationSearchService();

// Index documentation
$docService->indexDocumentation([
    resource_path('docs/installation.md'),
    resource_path('docs/configuration.md'),
    resource_path('docs/deployment.md'),
]);

// Semantic search
$results = $docService->search('How do I deploy my app?');

foreach ($results as $result) {
    echo "{$result['title']}\n";
    echo substr($result['content'], 0, 200) . "...\n\n";
}

// Get AI answer with context
$answer = $docService->answerQuestion('What are the deployment requirements?');
echo $answer;
```

### Example 2: Customer Support Ticket Matching

Find similar support tickets to help agents respond faster.

```php
<?php

namespace App\Services;

use App\Models\SupportTicket;
use Mindwave\Mindwave\Facades\Vectorstore;
use Mindwave\Mindwave\Facades\Embeddings;
use Mindwave\Mindwave\Document\Data\Document;
use Mindwave\Mindwave\Vectorstore\Data\VectorStoreEntry;

class SupportTicketMatcher
{
    /**
     * Index a support ticket
     */
    public function indexTicket(SupportTicket $ticket): void
    {
        $document = new Document(
            content: $ticket->subject . "\n\n" . $ticket->description,
            metadata: [
                '_mindwave_doc_source_id' => $ticket->id,
                '_mindwave_doc_source_type' => 'support_ticket',
                'ticket_id' => $ticket->id,
                'status' => $ticket->status,
                'priority' => $ticket->priority,
                'category' => $ticket->category,
                'created_at' => $ticket->created_at->toIso8601String(),
            ]
        );

        $vector = Embeddings::embedDocument($document);
        $entry = new VectorStoreEntry($vector, $document);

        Vectorstore::insert($entry);
    }

    /**
     * Find similar resolved tickets
     */
    public function findSimilarTickets(SupportTicket $newTicket, int $limit = 5): array
    {
        $query = $newTicket->subject . "\n\n" . $newTicket->description;
        $queryVector = Embeddings::embedText($query);

        $results = Vectorstore::similaritySearch($queryVector, $limit * 2);

        // Filter for resolved tickets only
        $similarTickets = [];
        foreach ($results as $result) {
            $metadata = $result->document->metadata();

            // Skip the ticket itself
            if ($metadata['ticket_id'] === $newTicket->id) {
                continue;
            }

            // Only include resolved tickets
            if ($metadata['status'] === 'resolved') {
                $similarTickets[] = [
                    'ticket_id' => $metadata['ticket_id'],
                    'similarity' => $result->score,
                    'category' => $metadata['category'],
                    'subject' => explode("\n", $result->document->content())[0],
                ];
            }

            if (count($similarTickets) >= $limit) {
                break;
            }
        }

        return $similarTickets;
    }

    /**
     * Get suggested responses based on similar tickets
     */
    public function getSuggestedResponses(SupportTicket $ticket): array
    {
        $similarTickets = $this->findSimilarTickets($ticket, 3);
        $suggestions = [];

        foreach ($similarTickets as $similar) {
            $resolved = SupportTicket::find($similar['ticket_id']);

            if ($resolved && $resolved->resolution) {
                $suggestions[] = [
                    'ticket_id' => $resolved->id,
                    'similarity' => $similar['similarity'],
                    'resolution' => $resolved->resolution,
                ];
            }
        }

        return $suggestions;
    }
}
```

**Usage:**

```php
use App\Services\SupportTicketMatcher;
use App\Models\SupportTicket;

$matcher = new SupportTicketMatcher();

// Index existing resolved tickets
SupportTicket::where('status', 'resolved')
    ->chunk(100, function($tickets) use ($matcher) {
        foreach ($tickets as $ticket) {
            $matcher->indexTicket($ticket);
        }
    });

// When a new ticket arrives
$newTicket = SupportTicket::find(123);

// Find similar tickets
$similar = $matcher->findSimilarTickets($newTicket);

foreach ($similar as $ticket) {
    echo "Ticket #{$ticket['ticket_id']} - Similarity: {$ticket['similarity']}\n";
    echo "Subject: {$ticket['subject']}\n\n";
}

// Get suggested responses
$suggestions = $matcher->getSuggestedResponses($newTicket);

foreach ($suggestions as $suggestion) {
    echo "Based on ticket #{$suggestion['ticket_id']} (similarity: {$suggestion['similarity']})\n";
    echo "Suggested resolution: {$suggestion['resolution']}\n\n";
}
```

### Example 3: Product Recommendations

Semantic product matching for e-commerce.

```php
<?php

namespace App\Services;

use App\Models\Product;
use Mindwave\Mindwave\Facades\Vectorstore;
use Mindwave\Mindwave\Facades\Embeddings;
use Mindwave\Mindwave\Document\Data\Document;
use Mindwave\Mindwave\Vectorstore\Data\VectorStoreEntry;

class ProductRecommendationService
{
    /**
     * Index a product
     */
    public function indexProduct(Product $product): void
    {
        $searchableText = implode(' ', [
            $product->name,
            $product->description,
            $product->category,
            implode(' ', $product->tags ?? []),
        ]);

        $document = new Document(
            content: $searchableText,
            metadata: [
                '_mindwave_doc_source_id' => $product->id,
                '_mindwave_doc_source_type' => 'product',
                'product_id' => $product->id,
                'name' => $product->name,
                'category' => $product->category,
                'price' => $product->price,
                'in_stock' => $product->in_stock,
                'rating' => $product->average_rating,
            ]
        );

        $vector = Embeddings::embedDocument($document);
        $entry = new VectorStoreEntry($vector, $document);

        Vectorstore::insert($entry);
    }

    /**
     * Find similar products
     */
    public function findSimilarProducts(Product $product, int $limit = 5): array
    {
        $searchableText = implode(' ', [
            $product->name,
            $product->description,
            $product->category,
        ]);

        $queryVector = Embeddings::embedText($searchableText);
        $results = Vectorstore::similaritySearch($queryVector, $limit + 1);

        $similar = [];
        foreach ($results as $result) {
            $metadata = $result->document->metadata();

            // Skip the product itself
            if ($metadata['product_id'] === $product->id) {
                continue;
            }

            $similar[] = [
                'product_id' => $metadata['product_id'],
                'name' => $metadata['name'],
                'category' => $metadata['category'],
                'price' => $metadata['price'],
                'similarity' => $result->score,
            ];

            if (count($similar) >= $limit) {
                break;
            }
        }

        return $similar;
    }

    /**
     * Natural language product search
     */
    public function search(string $query, int $limit = 10): array
    {
        $queryVector = Embeddings::embedText($query);
        $results = Vectorstore::similaritySearch($queryVector, $limit);

        return array_map(function($result) {
            $metadata = $result->document->metadata();

            return [
                'product_id' => $metadata['product_id'],
                'name' => $metadata['name'],
                'category' => $metadata['category'],
                'price' => $metadata['price'],
                'in_stock' => $metadata['in_stock'],
                'rating' => $metadata['rating'],
                'relevance' => $result->score,
            ];
        }, $results);
    }
}
```

**Usage:**

```php
use App\Services\ProductRecommendationService;
use App\Models\Product;

$recommender = new ProductRecommendationService();

// Index all products
Product::chunk(100, function($products) use ($recommender) {
    foreach ($products as $product) {
        $recommender->indexProduct($product);
    }
});

// Find similar products
$product = Product::find(1);
$similar = $recommender->findSimilarProducts($product);

echo "Customers who viewed '{$product->name}' also viewed:\n\n";
foreach ($similar as $item) {
    echo "- {$item['name']} (similarity: {$item['similarity']})\n";
}

// Natural language search
$results = $recommender->search('comfortable running shoes for marathon training');

foreach ($results as $product) {
    echo "{$product['name']} - ${$product['price']} (relevance: {$product['relevance']})\n";
}
```

### Example 4: FAQ Matching

Semantic FAQ search for customer support.

```php
<?php

namespace App\Services;

use Mindwave\Mindwave\Brain\Brain;
use Mindwave\Mindwave\Facades\Vectorstore;
use Mindwave\Mindwave\Facades\Embeddings;
use Mindwave\Mindwave\Document\Data\Document;
use Mindwave\Mindwave\Vectorstore\Data\VectorStoreEntry;

class FaqMatcher
{
    private Brain $brain;

    public function __construct()
    {
        $this->brain = new Brain(
            vectorstore: Vectorstore::driver(),
            embeddings: Embeddings::driver()
        );
    }

    /**
     * Index FAQ entries
     */
    public function indexFaqs(array $faqs): void
    {
        $documents = [];

        foreach ($faqs as $faq) {
            $documents[] = new Document(
                content: $faq['question'] . "\n\n" . $faq['answer'],
                metadata: [
                    'question' => $faq['question'],
                    'answer' => $faq['answer'],
                    'category' => $faq['category'] ?? 'general',
                    'keywords' => $faq['keywords'] ?? [],
                ]
            );
        }

        $vectors = Embeddings::embedDocuments($documents);
        $entries = array_map(
            fn($doc, $vec) => new VectorStoreEntry($vec, $doc),
            $documents,
            $vectors
        );

        Vectorstore::insertMany($entries);
    }

    /**
     * Find matching FAQ
     */
    public function findAnswer(string $userQuestion, float $threshold = 0.75): ?array
    {
        $results = $this->brain->search($userQuestion, count: 3);

        if (empty($results)) {
            return null;
        }

        $topResult = $results[0];

        // Calculate similarity score
        $queryVector = Embeddings::embedText($userQuestion);
        $topVector = Embeddings::embedDocument($topResult);

        // Use Similarity helper if score not available
        $score = $this->calculateSimilarity($queryVector, $topVector);

        // Only return if above threshold
        if ($score < $threshold) {
            return null;
        }

        return [
            'question' => $topResult->metadata()['question'],
            'answer' => $topResult->metadata()['answer'],
            'category' => $topResult->metadata()['category'],
            'confidence' => $score,
        ];
    }

    /**
     * Get multiple possible answers
     */
    public function getSuggestions(string $userQuestion, int $limit = 3): array
    {
        $results = $this->brain->search($userQuestion, count: $limit);

        return array_map(function($document) use ($userQuestion) {
            $queryVector = Embeddings::embedText($userQuestion);
            $docVector = Embeddings::embedDocument($document);

            return [
                'question' => $document->metadata()['question'],
                'answer' => $document->metadata()['answer'],
                'category' => $document->metadata()['category'],
                'confidence' => $this->calculateSimilarity($queryVector, $docVector),
            ];
        }, $results);
    }

    private function calculateSimilarity($v1, $v2): float
    {
        // Cosine similarity
        return \Mindwave\Mindwave\Support\Similarity::cosine($v1, $v2);
    }
}
```

**Usage:**

```php
use App\Services\FaqMatcher;

$faqMatcher = new FaqMatcher();

// Index FAQ entries
$faqs = [
    [
        'question' => 'How do I reset my password?',
        'answer' => 'Click "Forgot Password" on the login page and follow the instructions.',
        'category' => 'account',
    ],
    [
        'question' => 'What payment methods do you accept?',
        'answer' => 'We accept credit cards, PayPal, and bank transfers.',
        'category' => 'billing',
    ],
    [
        'question' => 'How long does shipping take?',
        'answer' => 'Standard shipping takes 5-7 business days.',
        'category' => 'shipping',
    ],
];

$faqMatcher->indexFaqs($faqs);

// Match user question
$userQuestion = "I can't remember my password";
$answer = $faqMatcher->findAnswer($userQuestion);

if ($answer) {
    echo "Q: {$answer['question']}\n";
    echo "A: {$answer['answer']}\n";
    echo "Confidence: " . ($answer['confidence'] * 100) . "%\n";
} else {
    echo "No matching FAQ found. Please contact support.\n";
}

// Get multiple suggestions
$suggestions = $faqMatcher->getSuggestions("payment options", limit: 3);

foreach ($suggestions as $suggestion) {
    echo "\nQ: {$suggestion['question']}\n";
    echo "A: {$suggestion['answer']}\n";
    echo "Confidence: " . ($suggestion['confidence'] * 100) . "%\n";
}
```

## Integration with PromptComposer

Combine vector stores with PromptComposer for powerful RAG applications.

### Basic Integration

```php
use Mindwave\Mindwave\PromptComposer\PromptComposer;
use Mindwave\Mindwave\Context\Sources\VectorStoreSource;
use Mindwave\Mindwave\Brain\Brain;
use Mindwave\Mindwave\Facades\Vectorstore;
use Mindwave\Mindwave\Facades\Embeddings;
use Mindwave\Mindwave\Facades\LLM;

// Create Brain
$brain = new Brain(
    vectorstore: Vectorstore::driver(),
    embeddings: Embeddings::driver()
);

// Create VectorStoreSource
$vectorSource = VectorStoreSource::fromBrain($brain);

// Build prompt with context
$prompt = PromptComposer::make()
    ->model('gpt-4')
    ->systemPrompt('You are a helpful assistant.')
    ->addContextSource($vectorSource)
    ->query('How do I configure Laravel caching?')
    ->build();

// Get response
$response = LLM::completion($prompt);
echo $response;
```

### Combining Multiple Sources

Mix semantic and keyword search for best results:

```php
use Mindwave\Mindwave\PromptComposer\PromptComposer;
use Mindwave\Mindwave\Context\Sources\VectorStoreSource;
use Mindwave\Mindwave\Context\Sources\TntSearchSource;
use Mindwave\Mindwave\Brain\Brain;
use Mindwave\Mindwave\Facades\Vectorstore;
use Mindwave\Mindwave\Facades\Embeddings;
use TeamTNT\TNTSearch\TNTSearch;

// Create Brain for semantic search
$brain = new Brain(
    vectorstore: Vectorstore::driver(),
    embeddings: Embeddings::driver()
);

// Create TNTSearch for keyword search
$tnt = new TNTSearch();
$tnt->loadConfig([
    'driver' => 'mysql',
    'storage' => storage_path('tnt'),
]);
$tnt->selectIndex('documentation.index');

// Combine both sources
$prompt = PromptComposer::make()
    ->model('gpt-4')
    ->systemPrompt('Answer using the provided documentation.')

    // Semantic search - finds conceptually similar content
    ->addContextSource(VectorStoreSource::fromBrain($brain))

    // Keyword search - finds exact term matches
    ->addContextSource(TntSearchSource::fromEngine($tnt))

    ->query('Laravel Redis configuration')
    ->build();

// Best of both worlds: semantic understanding + exact matches
```

### Token-Aware Context Injection

PromptComposer automatically manages context to fit within token limits:

```php
use Mindwave\Mindwave\PromptComposer\PromptComposer;
use Mindwave\Mindwave\Context\Sources\VectorStoreSource;

$prompt = PromptComposer::make()
    ->model('gpt-4') // Token limit: 8,192 input tokens
    ->systemPrompt('You are a Laravel expert.')
    ->addContextSource(VectorStoreSource::fromBrain($brain))
    ->query('Explain Laravel service providers')
    ->build();

// PromptComposer automatically:
// 1. Searches vector store for relevant context
// 2. Calculates available tokens for context
// 3. Includes as much relevant context as fits
// 4. Prioritizes by relevance score
// 5. Ensures prompt doesn't exceed model limits
```

### Complete RAG Example

Full example with indexing, searching, and AI response:

```php
<?php

namespace App\Services;

use Mindwave\Mindwave\Brain\Brain;
use Mindwave\Mindwave\Context\Sources\VectorStoreSource;
use Mindwave\Mindwave\PromptComposer\PromptComposer;
use Mindwave\Mindwave\Facades\Vectorstore;
use Mindwave\Mindwave\Facades\Embeddings;
use Mindwave\Mindwave\Facades\LLM;
use Mindwave\Mindwave\Document\Data\Document;
use Mindwave\Mindwave\Vectorstore\Data\VectorStoreEntry;

class KnowledgeBaseService
{
    private Brain $brain;
    private VectorStoreSource $vectorSource;

    public function __construct()
    {
        $this->brain = new Brain(
            vectorstore: Vectorstore::driver(),
            embeddings: Embeddings::driver()
        );

        $this->vectorSource = VectorStoreSource::fromBrain(
            $this->brain,
            'knowledge-base'
        );
    }

    /**
     * Add knowledge to the system
     */
    public function addKnowledge(string $content, array $metadata = []): void
    {
        $document = new Document($content, $metadata);
        $this->brain->consume($document);
    }

    /**
     * Add multiple knowledge items
     */
    public function addMultiple(array $items): void
    {
        $documents = [];

        foreach ($items as $item) {
            $documents[] = new Document(
                content: $item['content'],
                metadata: $item['metadata'] ?? []
            );
        }

        $this->brain->consumeAll($documents);
    }

    /**
     * Search knowledge base
     */
    public function search(string $query, int $limit = 5): array
    {
        return $this->brain->search($query, $limit);
    }

    /**
     * Ask a question and get AI-generated answer with context
     */
    public function ask(string $question): array
    {
        $prompt = PromptComposer::make()
            ->model('gpt-4')
            ->systemPrompt(
                'You are a helpful assistant. Answer questions using the provided context. ' .
                'If the context doesn\'t contain the answer, say so clearly.'
            )
            ->addContextSource($this->vectorSource)
            ->query($question)
            ->build();

        $answer = LLM::completion($prompt);

        // Also return the source context for transparency
        $sources = $this->search($question, 3);

        return [
            'answer' => $answer,
            'sources' => array_map(function($doc) {
                return [
                    'content' => $doc->content(),
                    'metadata' => $doc->metadata(),
                ];
            }, $sources),
        ];
    }
}
```

**Usage:**

```php
use App\Services\KnowledgeBaseService;

$kb = new KnowledgeBaseService();

// Add knowledge
$kb->addMultiple([
    [
        'content' => 'Laravel uses the Model-View-Controller (MVC) architectural pattern.',
        'metadata' => ['topic' => 'architecture', 'source' => 'documentation'],
    ],
    [
        'content' => 'Eloquent is Laravel\'s built-in ORM for database operations.',
        'metadata' => ['topic' => 'database', 'source' => 'documentation'],
    ],
    [
        'content' => 'Blade is Laravel\'s templating engine with simple syntax.',
        'metadata' => ['topic' => 'views', 'source' => 'documentation'],
    ],
]);

// Ask questions
$result = $kb->ask('What is Eloquent?');

echo "Answer:\n{$result['answer']}\n\n";

echo "Sources:\n";
foreach ($result['sources'] as $source) {
    echo "- {$source['content']}\n";
    echo "  Topic: {$source['metadata']['topic']}\n\n";
}
```

## Performance & Scalability

### Index Size Considerations

Vector stores can handle millions of vectors, but performance varies:

| Vector Count | Pinecone | Weaviate | Qdrant | File | Array |
|-------------|----------|----------|---------|------|-------|
| < 1,000 | Excellent | Excellent | Excellent | Good | Excellent |
| 1K - 10K | Excellent | Excellent | Excellent | Slow | Good |
| 10K - 100K | Excellent | Excellent | Excellent | Very Slow | Poor |
| 100K - 1M | Excellent | Excellent | Excellent | Unusable | Unusable |
| 1M+ | Excellent | Excellent | Excellent | Unusable | Unusable |

**Recommendations:**
- **< 10K vectors:** Any provider works
- **10K - 100K:** Use Pinecone, Weaviate, or Qdrant
- **100K+:** Use Pinecone, Weaviate, or Qdrant with proper indexing
- **Production:** Always use Pinecone, Weaviate, or Qdrant

### Query Performance

Typical query latencies (p95):

- **Pinecone:** 20-50ms
- **Weaviate:** 10-30ms (self-hosted with good hardware)
- **Qdrant:** 10-40ms (self-hosted with good hardware)
- **File:** 500ms - 5s+ (grows with dataset size)
- **Array:** 10-100ms (limited by RAM)

**Optimization tips:**
1. Use batch operations when possible
2. Implement result caching for common queries
3. Tune `top_k` parameter (don't retrieve more than needed)
4. Consider multiple smaller indices vs one large index

### Batch Operations

Always use batch operations for multiple items:

```php
use Mindwave\Mindwave\Facades\Vectorstore;
use Mindwave\Mindwave\Facades\Embeddings;

// BAD: One-by-one (slow + expensive)
foreach ($documents as $doc) {
    $vector = Embeddings::embedDocument($doc); // Separate API call each time
    $entry = new VectorStoreEntry($vector, $doc);
    Vectorstore::insert($entry); // Separate vector store call each time
}

// GOOD: Batch operations (fast + efficient)
$vectors = Embeddings::embedDocuments($documents); // Single API call
$entries = array_map(
    fn($doc, $vec) => new VectorStoreEntry($vec, $doc),
    $documents,
    $vectors
);
Vectorstore::insertMany($entries); // Single vector store call

// Performance improvement: 10-100x faster
// Cost savings: Same number of embedding tokens, but fewer API requests
```

### Caching Strategies

Cache embeddings and search results:

```php
use Illuminate\Support\Facades\Cache;
use Mindwave\Mindwave\Facades\Embeddings;
use Mindwave\Mindwave\Facades\Vectorstore;

// Cache embeddings
function getEmbedding(string $text) {
    $cacheKey = 'embedding:' . md5($text);

    return Cache::remember($cacheKey, now()->addDays(30), function() use ($text) {
        return Embeddings::embedText($text);
    });
}

// Cache search results
function searchWithCache(string $query, int $limit = 5) {
    $cacheKey = "search:{$limit}:" . md5($query);

    return Cache::remember($cacheKey, now()->addHours(1), function() use ($query, $limit) {
        $vector = Embeddings::embedText($query);
        return Vectorstore::similaritySearch($vector, $limit);
    });
}
```

### Cost Optimization

Embedding costs can add up. Strategies to minimize:

**1. Embedding Caching**
```php
// Don't re-embed unchanged content
if ($document->updated_at > $document->embedded_at) {
    $vector = Embeddings::embedDocument($document);
    // Update vector store
}
```

**2. Use Cheaper Models**
```dotenv
# text-embedding-3-small is 5x cheaper than ada-002
MINDWAVE_OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

**3. Batch Everything**
```php
// Process in batches of 100
$documents = Document::chunk(100, function($batch) {
    $vectors = Embeddings::embedDocuments($batch);
    // Process batch...
});
```

**4. Smart Chunking**
```php
// Don't create tiny chunks
use Mindwave\Mindwave\TextSplitters\RecursiveCharacterTextSplitter;

$splitter = new RecursiveCharacterTextSplitter(
    chunkSize: 1000,        // Larger chunks = fewer embeddings
    chunkOverlap: 200       // Some overlap for context
);
```

**5. Monitor Usage**
```php
use Illuminate\Support\Facades\Log;

$documentsEmbedded = count($documents);
$estimatedCost = ($documentsEmbedded * 500 / 1000) * 0.0001; // Rough estimate

Log::info("Embedded {$documentsEmbedded} documents, estimated cost: \${$estimatedCost}");
```

## Best Practices

### Choosing the Right Vector Store

**Choose Pinecone if:**
- You want fully managed service
- Willing to pay for convenience
- Need high availability
- Don't want to manage infrastructure

**Choose Weaviate if:**
- You want open-source
- Need advanced filtering
- Want hybrid search capabilities
- Comfortable managing infrastructure

**Choose Qdrant if:**
- Performance is top priority
- You prefer Rust-based tools
- Need advanced filtering
- Willing to self-host

**Choose File if:**
- Local development only
- Small prototype
- Learning/experimentation

**Choose Array if:**
- Unit testing
- Temporary operations
- CI/CD pipelines

### Chunk Size for Embeddings

Optimal chunk sizes depend on use case:

```php
use Mindwave\Mindwave\TextSplitters\RecursiveCharacterTextSplitter;

// Documentation/Articles (recommended: 1000-2000 chars)
$splitter = new RecursiveCharacterTextSplitter(
    chunkSize: 1500,
    chunkOverlap: 200
);

// Short-form content like tweets/messages (recommended: 500-1000 chars)
$splitter = new RecursiveCharacterTextSplitter(
    chunkSize: 750,
    chunkOverlap: 100
);

// Technical code (recommended: 500-1000 chars)
$splitter = new RecursiveCharacterTextSplitter(
    chunkSize: 800,
    chunkOverlap: 150
);

// Books/Long-form (recommended: 1500-3000 chars)
$splitter = new RecursiveCharacterTextSplitter(
    chunkSize: 2000,
    chunkOverlap: 300
);
```

**Guidelines:**
- Smaller chunks = more precise matches, higher cost
- Larger chunks = more context, fewer embeddings, lower cost
- Overlap = better context continuity, slight cost increase
- Test different sizes for your specific use case

### Metadata Strategy

Structure metadata for efficient filtering and retrieval:

```php
use Mindwave\Mindwave\Document\Data\Document;

// GOOD: Structured, searchable metadata
$document = new Document(
    content: $articleContent,
    metadata: [
        // Identifiers
        'id' => $article->id,
        'type' => 'article',

        // Categorization
        'category' => 'tutorial',
        'tags' => ['laravel', 'php', 'database'],

        // Temporal
        'published_at' => $article->published_at->toIso8601String(),
        'updated_at' => $article->updated_at->toIso8601String(),

        // Source tracking
        'source' => 'blog',
        'author' => $article->author->name,
        'url' => route('articles.show', $article),

        // Search hints
        'title' => $article->title,
        'language' => 'en',
    ]
);

// BAD: Unstructured, hard to filter
$document = new Document(
    content: $articleContent,
    metadata: [
        'data' => json_encode($article), // Don't do this
    ]
);
```

### Index Organization

Organize vectors into logical indices/collections:

```php
// GOOD: Separate indices by domain
config(['mindwave-vectorstore.default' => 'pinecone']);

// Documentation index
Vectorstore::driver('documentation-index')->insert($docEntry);

// Products index
Vectorstore::driver('products-index')->insert($productEntry);

// Support tickets index
Vectorstore::driver('support-index')->insert($ticketEntry);

// Advantages:
// - Faster searches (smaller search space)
// - Better relevance (no cross-domain pollution)
// - Easier management (delete/rebuild independently)
// - Cost optimization (separate billing/monitoring)
```

### Production Deployment

**Environment Configuration**

```dotenv
# Production settings
MINDWAVE_VECTORSTORE=pinecone  # or weaviate/qdrant
MINDWAVE_PINECONE_API_KEY=prod-api-key
MINDWAVE_PINECONE_INDEX=production-index

# Embeddings
MINDWAVE_EMBEDDINGS_DRIVER=openai
MINDWAVE_OPENAI_API_KEY=prod-openai-key
MINDWAVE_OPENAI_EMBEDDING_MODEL=text-embedding-ada-002

# Performance
CACHE_DRIVER=redis  # Cache embeddings and results
QUEUE_CONNECTION=redis  # Queue batch operations
```

**Queue Indexing Operations**

```php
namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Mindwave\Mindwave\Facades\Vectorstore;
use Mindwave\Mindwave\Facades\Embeddings;
use Mindwave\Mindwave\Document\Data\Document;
use Mindwave\Mindwave\Vectorstore\Data\VectorStoreEntry;

class IndexDocumentJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private string $content,
        private array $metadata
    ) {}

    public function handle(): void
    {
        $document = new Document($this->content, $this->metadata);
        $vector = Embeddings::embedDocument($document);
        $entry = new VectorStoreEntry($vector, $document);

        Vectorstore::insert($entry);
    }
}

// Dispatch to queue
dispatch(new IndexDocumentJob($content, $metadata));
```

**Monitoring**

```php
use Illuminate\Support\Facades\Log;

// Monitor index size
$count = Vectorstore::itemCount();
Log::info("Vector store size: {$count} items");

// Monitor search performance
$start = microtime(true);
$results = Vectorstore::similaritySearch($vector, 10);
$duration = microtime(true) - $start;

Log::info("Search completed in {$duration}s", [
    'results_count' => count($results),
    'query_duration' => $duration,
]);

// Set up alerts for slow queries
if ($duration > 1.0) {
    Log::warning("Slow vector search detected", [
        'duration' => $duration,
    ]);
}
```

## Comparison Table

| Feature | Pinecone | Weaviate | Qdrant | File | Array |
|---------|----------|----------|--------|------|-------|
| **Hosting** | Managed Cloud | Self/Cloud | Self/Cloud | Local | In-Memory |
| **Performance** | Excellent | Excellent | Excellent | Poor | Good |
| **Scalability** | Millions+ | Millions+ | Millions+ | < 10K | < 10K |
| **Setup Complexity** | Easy | Medium | Medium | None | None |
| **Cost** | $$$ (metered) | $ (hosting) | $ (hosting) | Free | Free |
| **Production Ready** | Yes | Yes | Yes | No | No |
| **Open Source** | No | Yes | Yes | N/A | N/A |
| **Query Speed** | 20-50ms | 10-30ms | 10-40ms | 500ms+ | 10-100ms |
| **Filtering** | Basic | Advanced | Advanced | None | None |
| **Hybrid Search** | No | Yes | Yes | No | No |
| **Multi-tenancy** | Yes | Yes | Yes | No | No |
| **Backup/Restore** | Automatic | Manual | Manual | File copy | None |
| **Monitoring** | Built-in | Setup required | Setup required | None | None |
| **Free Tier** | Yes (limited) | Self-host | Self-host | Always | Always |
| **Best For** | Production apps | Flexibility | Performance | Development | Testing |

## Troubleshooting

### Connection Errors

**Problem: Cannot connect to Pinecone**

```
Error: Connection to Pinecone failed
```

**Solutions:**

1. Verify API credentials:
```bash
php artisan tinker
> config('mindwave-vectorstore.vectorstores.pinecone.api_key')
> config('mindwave-vectorstore.vectorstores.pinecone.index')
```

2. Check index exists in Pinecone console

3. Verify environment/region is correct

4. Test connection:
```php
use Probots\Pinecone\Client;

$client = new Client(
    apiKey: env('MINDWAVE_PINECONE_API_KEY'),
    indexHost: env('MINDWAVE_PINECONE_INDEX_HOST')
);

// Should not throw exception
$client->index(env('MINDWAVE_PINECONE_INDEX'))->vectors()->stats();
```

**Problem: Weaviate connection refused**

```
Error: Connection refused on localhost:8080
```

**Solutions:**

1. Verify Weaviate is running:
```bash
docker ps | grep weaviate
```

2. Start Weaviate if not running:
```bash
docker-compose up -d weaviate
```

3. Check URL configuration:
```php
config('mindwave-vectorstore.vectorstores.weaviate.api_url')
// Should be: http://localhost:8080/v1
```

**Problem: Qdrant connection timeout**

```
Error: Connection timeout to Qdrant
```

**Solutions:**

1. Verify Qdrant is running:
```bash
docker ps | grep qdrant
# or
curl http://localhost:6333/health
```

2. Check host/port configuration:
```php
config('mindwave-vectorstore.vectorstores.qdrant.host') // localhost
config('mindwave-vectorstore.vectorstores.qdrant.port') // 6333
```

### Embedding Failures

**Problem: OpenAI API key invalid**

```
Error: Incorrect API key provided
```

**Solution:**

1. Verify API key:
```bash
echo $MINDWAVE_OPENAI_API_KEY
```

2. Check key in OpenAI dashboard

3. Regenerate if necessary

**Problem: Rate limit exceeded**

```
Error: Rate limit reached for requests
```

**Solutions:**

1. Implement retry with backoff:
```php
use Illuminate\Support\Facades\Retry;

$vector = Retry::times(3)
    ->sleep(1000) // 1 second
    ->exponentialBackoff()
    ->when(fn($e) => str_contains($e->getMessage(), 'rate limit'))
    ->run(fn() => Embeddings::embedText($text));
```

2. Use batch operations to reduce requests

3. Upgrade OpenAI plan for higher limits

**Problem: Text too long**

```
Error: This model's maximum context length is 8191 tokens
```

**Solution:**

```php
use Mindwave\Mindwave\TextSplitters\RecursiveCharacterTextSplitter;

// Split long text before embedding
$splitter = new RecursiveCharacterTextSplitter(chunkSize: 1000);
$chunks = $splitter->splitText($longText);

// Embed each chunk
foreach ($chunks as $chunk) {
    $vector = Embeddings::embedText($chunk);
    // Process...
}
```

### Poor Search Results

**Problem: Search returns irrelevant results**

**Solutions:**

1. **Increase chunk size** - Larger chunks provide more context:
```php
$splitter = new RecursiveCharacterTextSplitter(
    chunkSize: 2000,  // Increased from 1000
    chunkOverlap: 300
);
```

2. **Use score threshold** - Filter low-quality matches:
```php
$results = Vectorstore::similaritySearch($vector, 10);
$filtered = array_filter($results, fn($r) => $r->score > 0.75);
```

3. **Improve metadata** - Better metadata helps filtering:
```php
$document = new Document($content, [
    'category' => 'specific-category',
    'keywords' => ['relevant', 'keywords'],
]);
```

4. **Re-index with better source material** - Quality in = quality out

**Problem: Search is too slow**

**Solutions:**

1. **Reduce top_k** - Don't retrieve more than needed:
```php
$results = Vectorstore::similaritySearch($vector, 5); // Instead of 50
```

2. **Cache common queries**:
```php
$cacheKey = 'search:' . md5($query);
$results = Cache::remember($cacheKey, 3600, fn() =>
    Vectorstore::similaritySearch($vector, 10)
);
```

3. **Use production vector store** - Switch from File to Pinecone/Weaviate/Qdrant

4. **Optimize index** - For Weaviate/Qdrant, ensure proper indexing configuration

### Performance Issues

**Problem: Indexing is too slow**

**Solution: Use batch operations**

```php
// SLOW: One at a time
foreach ($documents as $doc) {
    $vector = Embeddings::embedDocument($doc);
    Vectorstore::insert(new VectorStoreEntry($vector, $doc));
}

// FAST: Batch operations
$vectors = Embeddings::embedDocuments($documents);
$entries = array_map(
    fn($doc, $vec) => new VectorStoreEntry($vec, $doc),
    $documents,
    $vectors
);
Vectorstore::insertMany($entries);
```

**Problem: High memory usage**

**Solution: Process in chunks**

```php
Document::chunk(100, function($documents) {
    $vectors = Embeddings::embedDocuments($documents);
    $entries = array_map(
        fn($doc, $vec) => new VectorStoreEntry($vec, $doc),
        $documents->all(),
        $vectors
    );
    Vectorstore::insertMany($entries);
});
```

### Cost Overruns

**Problem: Embedding costs are too high**

**Solutions:**

1. **Cache embeddings**:
```php
$cacheKey = 'embed:' . md5($text);
$vector = Cache::remember($cacheKey, now()->addDays(30),
    fn() => Embeddings::embedText($text)
);
```

2. **Use cheaper model**:
```dotenv
MINDWAVE_OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

3. **Don't re-embed unchanged content**:
```php
if (!$document->hasChanged('content')) {
    return; // Skip re-embedding
}
```

4. **Optimize chunk size**:
```php
// Fewer, larger chunks = fewer embeddings = lower cost
$splitter = new RecursiveCharacterTextSplitter(chunkSize: 2000);
```

5. **Monitor usage**:
```php
Log::info("Embedded {$count} documents, estimated cost: \$" . ($count * 0.0001));
```

---

## Next Steps

- **[Context Discovery](/docs/core/context-discovery)** - Build sophisticated context retrieval pipelines
- **[PromptComposer](/docs/core/prompt-composer)** - Compose prompts with retrieved context
- **[Embeddings](./embeddings)** - Deep dive into embedding models

Vector stores enable powerful semantic search capabilities in your Laravel application. Whether you're building documentation search, customer support automation, or recommendation systems, vector stores provide the foundation for understanding meaning, not just matching keywords.

