# Embeddings

## Overview

Embeddings are numerical representations of text that capture semantic meaning in a high-dimensional vector space. Unlike traditional keyword matching, embeddings enable AI systems to understand the conceptual similarity between pieces of text, making them essential for semantic search, content recommendations, and Retrieval-Augmented Generation (RAG).

### What are Embeddings?

Think of embeddings as coordinates in a space where semantically similar text is positioned closer together. For example:

-   "dog" and "puppy" would be close in embedding space
-   "dog" and "car" would be far apart
-   "king" and "queen" would share similar relationships to "man" and "woman"

Each embedding is a vector of floating-point numbers (typically 1536 or 3072 dimensions for OpenAI models). These vectors capture linguistic patterns, context, and meaning learned from vast amounts of training data.

### How Embeddings Work

1. **Input**: You provide text (a sentence, paragraph, or document)
2. **Processing**: The model converts text into a fixed-size numerical vector
3. **Output**: A vector of floating-point numbers representing the semantic meaning
4. **Comparison**: Vectors can be compared using cosine similarity to find related content

### Use Cases for Embeddings

**Semantic Search**: Find documents by meaning rather than exact keywords

```php
// Search for "vehicle maintenance" finds results about "car repair"
$query = Embeddings::embedText('vehicle maintenance');
$results = $vectorstore->similaritySearch($query);
```

**Content Recommendations**: Suggest similar articles, products, or resources

```php
// Find articles similar to the current one
$currentArticle = Embeddings::embedDocument($article);
$similar = $vectorstore->similaritySearch($currentArticle, limit: 5);
```

**Question Answering**: Retrieve relevant context for AI-powered Q&A

```php
// Find relevant documents to answer a question
$question = Embeddings::embedText('How do I reset my password?');
$context = $vectorstore->similaritySearch($question);
```

**Clustering & Classification**: Group similar content automatically

```php
// Cluster support tickets by topic
$embeddings = Embeddings::embedDocuments($tickets);
// Use clustering algorithm on embeddings
```

### Why Use Embeddings for RAG?

Retrieval-Augmented Generation combines the power of vector search with large language models:

1. **Semantic Understanding**: Retrieves relevant context even with different wording
2. **Scalability**: Search millions of documents efficiently using vector databases
3. **Accuracy**: Provides LLMs with precise, relevant information
4. **Cost-Effective**: Only embed once, query many times
5. **Up-to-Date Knowledge**: Add new information without retraining models

## Supported Providers

### OpenAI Embeddings

Mindwave currently supports OpenAI's embedding models, which are industry-leading for quality and reliability.

**Available Models:**

| Model                  | Dimensions | Cost (per 1M tokens) | Use Case                          |
| ---------------------- | ---------- | -------------------- | --------------------------------- |
| text-embedding-ada-002 | 1536       | $0.10                | Legacy model, widely compatible   |
| text-embedding-3-small | 1536       | $0.02                | Cost-effective, great performance |
| text-embedding-3-large | 3072       | $0.13                | Highest quality, best accuracy    |

**Model Selection Guide:**

-   **text-embedding-ada-002**: Use if you need compatibility with existing systems or have embeddings already generated with this model
-   **text-embedding-3-small**: Best choice for most applications - 5x cheaper than ada-002 with better performance
-   **text-embedding-3-large**: Use when accuracy is critical and cost is secondary (e.g., medical, legal, research)

## Setup & Configuration

### Environment Variables

Add your OpenAI credentials to `.env`:

```dotenv
MINDWAVE_OPENAI_API_KEY=sk-...
MINDWAVE_OPENAI_ORG_ID=org-...  # Optional
MINDWAVE_EMBEDDINGS=openai
```

### Configuration File

The configuration is managed in `config/mindwave-embeddings.php`:

```php
<?php

return [
    'default' => env('MINDWAVE_EMBEDDINGS', 'openai'),

    'embeddings' => [
        'openai' => [
            'api_key' => env('MINDWAVE_OPENAI_API_KEY'),
            'org_id' => env('MINDWAVE_OPENAI_ORG_ID'),
            'model' => 'text-embedding-3-small',  // Recommended default
        ],
    ],
];
```

### Publish Configuration

```bash
php artisan vendor:publish --tag=mindwave-config
```

### Testing the Setup

Verify your embeddings configuration:

```php
use Mindwave\Mindwave\Facades\Embeddings;

// Test embedding generation
$vector = Embeddings::embedText('Hello, world!');

// Check the result
echo "Dimensions: " . count($vector) . "\n";
echo "First values: " . implode(', ', array_slice($vector->toArray(), 0, 5));

// Output:
// Dimensions: 1536
// First values: 0.0123, -0.0456, 0.0789, ...
```

## Creating Embeddings

### Single Text

Embed a single string of text:

```php
use Mindwave\Mindwave\Facades\Embeddings;

$text = "Laravel is a web application framework with expressive, elegant syntax.";
$embedding = Embeddings::embedText($text);

// Result: EmbeddingVector with 1536 dimensions
echo "Vector dimensions: " . count($embedding);

// Access vector values
$values = $embedding->toArray();
$json = $embedding->toJson();
```

**Using Dependency Injection:**

```php
use Mindwave\Mindwave\Contracts\Embeddings;

class DocumentProcessor
{
    public function __construct(
        private Embeddings $embeddings
    ) {}

    public function process(string $text)
    {
        $vector = $this->embeddings->embedText($text);
        // Store or process the vector
    }
}
```

### Batch Embeddings

Embed multiple texts efficiently in a single API call:

```php
use Mindwave\Mindwave\Facades\Embeddings;

$texts = [
    "First document about Laravel development",
    "Second document about PHP programming",
    "Third document about web application security",
];

// Returns array of EmbeddingVector objects
$embeddings = Embeddings::embedTexts($texts);

foreach ($embeddings as $i => $embedding) {
    echo "Document {$i}: " . count($embedding) . " dimensions\n";
}
```

**Why Batch Processing?**

-   **Cost**: Same API cost as individual calls
-   **Performance**: Single HTTP request instead of multiple
-   **Efficiency**: Optimal for processing large datasets
-   **Rate Limits**: Fewer API calls = lower rate limit consumption

### Working with Documents

Mindwave provides a `Document` class for structured content:

```php
use Mindwave\Mindwave\Document\Data\Document;
use Mindwave\Mindwave\Facades\Embeddings;

// Single document
$document = new Document(
    content: 'Laravel is a PHP framework',
    metadata: ['category' => 'framework', 'language' => 'php']
);

$embedding = Embeddings::embedDocument($document);
```

**Batch Document Embedding:**

```php
$documents = [
    new Document('Content about Laravel'),
    new Document('Content about Vue.js'),
    new Document('Content about Tailwind CSS'),
];

// Efficient batch processing
$embeddings = Embeddings::embedDocuments($documents);

// Returns array of EmbeddingVector objects in the same order
```

### Large Documents

For documents exceeding token limits (8,191 tokens for OpenAI models):

```php
use Mindwave\Mindwave\Document\Splitters\RecursiveCharacterTextSplitter;
use Mindwave\Mindwave\Document\Data\Document;
use Mindwave\Mindwave\Facades\Embeddings;

$largeDocument = file_get_contents('large-article.txt');

// Split into chunks
$splitter = new RecursiveCharacterTextSplitter(
    chunkSize: 1000,
    chunkOverlap: 200
);

$chunks = $splitter->split($largeDocument);

// Convert to Document objects
$documents = collect($chunks)->map(fn($chunk) => new Document($chunk));

// Batch embed all chunks
$embeddings = Embeddings::embedDocuments($documents);

// Store with chunk metadata
foreach ($documents->zip($embeddings) as [$document, $embedding]) {
    // Store in vector database with chunk index
    $vectorstore->insert(new VectorStoreEntry($embedding, $document));
}
```

## OpenAI Embedding Models

### text-embedding-ada-002 (Legacy)

The original OpenAI embedding model, still widely used:

**Specifications:**

-   **Dimensions**: 1536
-   **Pricing**: $0.10 per 1M tokens
-   **Context Length**: 8,191 tokens
-   **Released**: December 2022

**When to Use:**

-   Maintaining compatibility with existing embeddings
-   Systems already tuned for ada-002
-   No immediate need to re-embed content

**Example:**

```php
// In config/mindwave-embeddings.php
'embeddings' => [
    'openai' => [
        'model' => 'text-embedding-ada-002',
    ],
],

// Usage
$embedding = Embeddings::embedText('Sample text');
// Returns 1536-dimensional vector
```

### text-embedding-3-small (Recommended)

The best balance of cost and performance:

**Specifications:**

-   **Dimensions**: 1536
-   **Pricing**: $0.02 per 1M tokens (5x cheaper than ada-002)
-   **Context Length**: 8,191 tokens
-   **Performance**: Better than ada-002
-   **Released**: January 2024

**When to Use:**

-   New projects (default choice)
-   Cost-sensitive applications
-   High-volume embedding generation
-   Most production applications

**Example:**

```php
// In config/mindwave-embeddings.php
'embeddings' => [
    'openai' => [
        'model' => 'text-embedding-3-small',
    ],
],

// Usage
$embedding = Embeddings::embedText('Laravel development tips');

// Cost calculation for 100K documents averaging 500 tokens each
// 100,000 docs × 500 tokens = 50M tokens
// Cost: (50M / 1M) × $0.02 = $1.00
```

### text-embedding-3-large (Highest Quality)

The most powerful embedding model:

**Specifications:**

-   **Dimensions**: 3072 (2x larger than other models)
-   **Pricing**: $0.13 per 1M tokens
-   **Context Length**: 8,191 tokens
-   **Performance**: Best accuracy available
-   **Released**: January 2024

**When to Use:**

-   Maximum accuracy requirements
-   Research and analysis
-   Legal or medical applications
-   Low-volume, high-value use cases

**Example:**

```php
// In config/mindwave-embeddings.php
'embeddings' => [
    'openai' => [
        'model' => 'text-embedding-3-large',
    ],
],

// Usage
$embedding = Embeddings::embedText('Complex legal document text');
// Returns 3072-dimensional vector (requires 3072-dimensional vector store)

// Cost comparison for 1M tokens:
// 3-small: $0.02
// 3-large: $0.13 (6.5x more expensive)
```

**Important Note**: Ensure your vector store supports 3072 dimensions when using this model.

## Working with Embeddings

### Storing Embeddings

Embeddings must be stored in vector databases for efficient similarity search:

```php
use Mindwave\Mindwave\Facades\Embeddings;
use Mindwave\Mindwave\Facades\Vectorstore;
use Mindwave\Mindwave\Document\Data\Document;
use Mindwave\Mindwave\Vectorstore\Data\VectorStoreEntry;

// Create document
$document = new Document(
    content: 'Laravel Eloquent provides beautiful ActiveRecord implementation',
    metadata: [
        'title' => 'Eloquent Guide',
        'category' => 'database',
        'url' => 'https://laravel.com/docs/eloquent'
    ]
);

// Generate embedding
$embedding = Embeddings::embedDocument($document);

// Store in vector database
Vectorstore::insert(
    new VectorStoreEntry(
        vector: $embedding,
        document: $document
    )
);
```

### Computing Similarity

Mindwave includes cosine similarity calculation:

```php
use Mindwave\Mindwave\Support\Similarity;
use Mindwave\Mindwave\Facades\Embeddings;

$text1 = "Laravel framework for PHP";
$text2 = "PHP framework called Laravel";
$text3 = "JavaScript library React";

$embedding1 = Embeddings::embedText($text1);
$embedding2 = Embeddings::embedText($text2);
$embedding3 = Embeddings::embedText($text3);

// Calculate similarity (returns float between -1 and 1)
$similarityScore = Similarity::cosine($embedding1, $embedding2);
echo "Similarity: " . $similarityScore; // ~0.95 (very similar)

$differentScore = Similarity::cosine($embedding1, $embedding3);
echo "Similarity: " . $differentScore; // ~0.40 (less similar)
```

**Understanding Cosine Similarity:**

-   **1.0**: Identical or nearly identical meaning
-   **0.8-0.9**: Very similar topics
-   **0.6-0.7**: Related topics
-   **0.4-0.5**: Some relationship
-   **< 0.3**: Largely unrelated

### Finding Similar Documents

Query vector stores for semantically similar content:

```php
use Mindwave\Mindwave\Facades\Embeddings;
use Mindwave\Mindwave\Facades\Vectorstore;

// User's search query
$query = "How do I validate forms in Laravel?";

// Generate query embedding
$queryEmbedding = Embeddings::embedText($query);

// Find similar documents
$results = Vectorstore::similaritySearch(
    embedding: $queryEmbedding,
    count: 5  // Return top 5 results
);

// Process results
foreach ($results as $result) {
    echo "Score: " . $result->score . "\n";
    echo "Content: " . $result->document->content() . "\n";
    echo "Metadata: " . json_encode($result->document->metadata()) . "\n\n";
}
```

## Integration with Vector Stores

### Complete Pipeline Example

From raw text to searchable vector database:

```php
use Mindwave\Mindwave\Facades\Embeddings;
use Mindwave\Mindwave\Facades\Vectorstore;
use Mindwave\Mindwave\Document\Data\Document;
use Mindwave\Mindwave\Vectorstore\Data\VectorStoreEntry;

// Step 1: Prepare your documents
$articles = [
    [
        'title' => 'Getting Started with Laravel',
        'content' => 'Laravel is a web application framework...',
        'category' => 'tutorial'
    ],
    [
        'title' => 'Laravel Database: Getting Started',
        'content' => 'All database interaction in Laravel...',
        'category' => 'database'
    ],
    // ... more articles
];

// Step 2: Convert to Document objects
$documents = collect($articles)->map(fn($article) =>
    new Document(
        content: $article['content'],
        metadata: [
            'title' => $article['title'],
            'category' => $article['category']
        ]
    )
);

// Step 3: Generate embeddings (batch for efficiency)
$embeddings = Embeddings::embedDocuments($documents);

// Step 4: Create VectorStoreEntry objects
$entries = $documents->zip($embeddings)->map(fn($pair) =>
    new VectorStoreEntry(
        vector: $pair[1],
        document: $pair[0]
    )
);

// Step 5: Store in vector database
Vectorstore::insertMany($entries->toArray());

// Step 6: Query the system
$query = "How do I connect to a database?";
$queryEmbedding = Embeddings::embedText($query);
$results = Vectorstore::similaritySearch($queryEmbedding, 3);

// Step 7: Use results (e.g., for RAG)
foreach ($results as $result) {
    echo $result->document->metadata()['title'] . "\n";
}
```

### Production-Ready Implementation

A complete Laravel service for semantic search:

```php
namespace App\Services;

use Mindwave\Mindwave\Contracts\Embeddings;
use Mindwave\Mindwave\Contracts\Vectorstore;
use Mindwave\Mindwave\Document\Data\Document;
use Mindwave\Mindwave\Vectorstore\Data\VectorStoreEntry;
use Illuminate\Support\Collection;

class SemanticSearchService
{
    public function __construct(
        private Embeddings $embeddings,
        private Vectorstore $vectorstore
    ) {}

    /**
     * Index documents for semantic search
     */
    public function indexDocuments(Collection $documents): void
    {
        // Convert to Document objects
        $docs = $documents->map(fn($doc) => new Document(
            content: $doc['content'],
            metadata: $doc['metadata'] ?? []
        ));

        // Generate embeddings in batches
        $chunks = $docs->chunk(100);

        foreach ($chunks as $chunk) {
            $embeddings = $this->embeddings->embedDocuments($chunk);

            $entries = $chunk->zip($embeddings)->map(fn($pair) =>
                new VectorStoreEntry(
                    vector: $pair[1],
                    document: $pair[0]
                )
            );

            $this->vectorstore->insertMany($entries->toArray());
        }
    }

    /**
     * Search for similar documents
     */
    public function search(string $query, int $limit = 5): Collection
    {
        $queryEmbedding = $this->embeddings->embedText($query);

        $results = $this->vectorstore->similaritySearch(
            embedding: $queryEmbedding,
            count: $limit
        );

        return collect($results)->map(fn($result) => [
            'score' => $result->score,
            'content' => $result->document->content(),
            'metadata' => $result->document->metadata(),
        ]);
    }
}
```

**Usage in Controller:**

```php
use App\Services\SemanticSearchService;

class SearchController extends Controller
{
    public function search(Request $request, SemanticSearchService $search)
    {
        $query = $request->input('q');
        $results = $search->search($query, limit: 10);

        return response()->json($results);
    }
}
```

## Real-World Examples

### Example 1: Semantic Documentation Search

Build a smart documentation search that understands intent:

```php
namespace App\Services;

use App\Models\Documentation;
use Mindwave\Mindwave\Facades\Embeddings;
use Mindwave\Mindwave\Facades\Vectorstore;
use Mindwave\Mindwave\Document\Data\Document;
use Mindwave\Mindwave\Vectorstore\Data\VectorStoreEntry;

class DocumentationSearch
{
    /**
     * Index all documentation pages
     */
    public function indexDocumentation(): void
    {
        Documentation::chunk(50, function($docs) {
            $documents = $docs->map(fn($doc) => new Document(
                content: $doc->title . "\n\n" . $doc->content,
                metadata: [
                    'id' => $doc->id,
                    'title' => $doc->title,
                    'slug' => $doc->slug,
                    'category' => $doc->category,
                    'url' => route('docs.show', $doc->slug),
                ]
            ));

            $embeddings = Embeddings::embedDocuments($documents);

            $entries = $documents->zip($embeddings)
                ->map(fn($pair) => new VectorStoreEntry($pair[1], $pair[0]));

            Vectorstore::insertMany($entries->toArray());
        });
    }

    /**
     * Search documentation by semantic meaning
     */
    public function search(string $query): array
    {
        $embedding = Embeddings::embedText($query);
        $results = Vectorstore::similaritySearch($embedding, 5);

        return collect($results)->map(fn($result) => [
            'relevance' => round($result->score * 100, 1),
            'title' => $result->document->metadata()['title'],
            'url' => $result->document->metadata()['url'],
            'excerpt' => substr($result->document->content(), 0, 200) . '...',
        ])->toArray();
    }
}
```

**Real queries this handles well:**

-   "How to deploy" → finds "Deployment Guide"
-   "Database connection" → finds "Database Configuration"
-   "Email setup" → finds "Mail Configuration"

### Example 2: Content Recommendation Engine

Suggest related articles based on semantic similarity:

```php
namespace App\Services;

use App\Models\Article;
use Mindwave\Mindwave\Facades\Embeddings;
use Mindwave\Mindwave\Facades\Vectorstore;
use Illuminate\Support\Collection;

class ArticleRecommendations
{
    /**
     * Get similar articles
     */
    public function getSimilarArticles(Article $article, int $limit = 5): Collection
    {
        // Get or generate embedding for current article
        $embedding = cache()->remember(
            "article.embedding.{$article->id}",
            now()->addWeek(),
            fn() => Embeddings::embedText($article->content)
        );

        // Find similar articles
        $results = Vectorstore::similaritySearch($embedding, $limit + 1);

        // Filter out the current article and get article IDs
        $articleIds = collect($results)
            ->filter(fn($result) =>
                $result->document->metadata()['id'] !== $article->id
            )
            ->take($limit)
            ->pluck('document.metadata.id');

        // Load full article models
        return Article::whereIn('id', $articleIds)->get();
    }

    /**
     * Get personalized recommendations based on reading history
     */
    public function getPersonalizedRecommendations(Collection $readArticles): Collection
    {
        // Embed all read articles
        $embeddings = $readArticles->map(fn($article) =>
            Embeddings::embedText($article->content)
        );

        // Average the embeddings to create user profile
        $profileVector = $this->averageVectors($embeddings);

        // Find articles similar to user's interests
        $results = Vectorstore::similaritySearch($profileVector, 10);

        // Convert to article models
        $articleIds = collect($results)->pluck('document.metadata.id');
        return Article::whereIn('id', $articleIds)->get();
    }

    private function averageVectors(Collection $vectors): array
    {
        $count = $vectors->count();
        $dimension = count($vectors->first());
        $sum = array_fill(0, $dimension, 0);

        foreach ($vectors as $vector) {
            foreach ($vector as $i => $value) {
                $sum[$i] += $value;
            }
        }

        return array_map(fn($value) => $value / $count, $sum);
    }
}
```

### Example 3: Support Ticket Classification

Automatically categorize and route support tickets:

```php
namespace App\Services;

use App\Models\SupportTicket;
use Mindwave\Mindwave\Facades\Embeddings;
use Mindwave\Mindwave\Support\Similarity;

class TicketClassifier
{
    private array $categories = [
        'billing' => 'Questions about invoices, payments, refunds, and pricing',
        'technical' => 'Technical issues, bugs, errors, and system problems',
        'account' => 'Account access, password resets, profile changes',
        'feature' => 'Feature requests, suggestions, and product feedback',
    ];

    /**
     * Classify ticket into category
     */
    public function classify(SupportTicket $ticket): string
    {
        // Embed ticket content
        $ticketEmbedding = Embeddings::embedText($ticket->content);

        // Embed category descriptions
        $categoryEmbeddings = collect($this->categories)
            ->map(fn($description) => Embeddings::embedText($description));

        // Calculate similarity to each category
        $scores = $categoryEmbeddings->map(fn($categoryEmbed) =>
            Similarity::cosine($ticketEmbedding, $categoryEmbed)
        );

        // Return category with highest similarity
        return $scores->keys()->get($scores->argmax());
    }

    /**
     * Find similar past tickets
     */
    public function findSimilarTickets(SupportTicket $ticket, int $limit = 5): Collection
    {
        $embedding = Embeddings::embedText($ticket->content);

        $results = Vectorstore::similaritySearch($embedding, $limit);

        $ticketIds = collect($results)->pluck('document.metadata.ticket_id');

        return SupportTicket::whereIn('id', $ticketIds)
            ->where('status', 'resolved')
            ->with('resolution')
            ->get();
    }
}
```

**Usage:**

```php
$ticket = SupportTicket::find(123);

$classifier = new TicketClassifier();

// Auto-classify
$category = $classifier->classify($ticket);
$ticket->update(['category' => $category]);

// Find similar resolved tickets for context
$similarTickets = $classifier->findSimilarTickets($ticket);

// Route to appropriate agent
$ticket->assignToAgent($category);
```

### Example 4: Product Recommendation System

E-commerce product recommendations using semantic similarity:

```php
namespace App\Services;

use App\Models\Product;
use Mindwave\Mindwave\Facades\Embeddings;
use Mindwave\Mindwave\Facades\Vectorstore;
use Mindwave\Mindwave\Document\Data\Document;
use Mindwave\Mindwave\Vectorstore\Data\VectorStoreEntry;

class ProductRecommendations
{
    /**
     * Index products for semantic search
     */
    public function indexProducts(): void
    {
        Product::chunk(100, function($products) {
            $documents = $products->map(fn($product) => new Document(
                content: $this->buildProductDescription($product),
                metadata: [
                    'product_id' => $product->id,
                    'name' => $product->name,
                    'price' => $product->price,
                    'category' => $product->category,
                ]
            ));

            $embeddings = Embeddings::embedDocuments($documents);

            $entries = $documents->zip($embeddings)
                ->map(fn($pair) => new VectorStoreEntry($pair[1], $pair[0]));

            Vectorstore::insertMany($entries->toArray());
        });
    }

    /**
     * Build rich product description for embedding
     */
    private function buildProductDescription(Product $product): string
    {
        return implode(' ', [
            $product->name,
            $product->description,
            $product->category,
            implode(' ', $product->tags ?? []),
            implode(' ', $product->features ?? []),
        ]);
    }

    /**
     * Find similar products
     */
    public function findSimilar(Product $product, int $limit = 6): Collection
    {
        $description = $this->buildProductDescription($product);
        $embedding = Embeddings::embedText($description);

        $results = Vectorstore::similaritySearch($embedding, $limit + 1);

        $productIds = collect($results)
            ->filter(fn($r) => $r->document->metadata()['product_id'] !== $product->id)
            ->take($limit)
            ->pluck('document.metadata.product_id');

        return Product::whereIn('id', $productIds)->get();
    }

    /**
     * Natural language product search
     */
    public function searchByDescription(string $query): Collection
    {
        $embedding = Embeddings::embedText($query);
        $results = Vectorstore::similaritySearch($embedding, 10);

        $productIds = collect($results)->pluck('document.metadata.product_id');
        return Product::whereIn('id', $productIds)->get();
    }
}
```

**Example Queries:**

-   "comfortable running shoes for flat feet" → finds appropriate athletic shoes
-   "laptop for video editing" → finds high-performance laptops
-   "gift for coffee lover" → finds coffee makers, beans, accessories

## Cost Management

### Understanding Pricing

OpenAI charges based on token count, not character count:

```php
use Mindwave\Mindwave\PromptComposer\Tokenizer;

$text = "Your document content here...";

// Count tokens (more accurate than character count)
$tokenCount = Tokenizer::countTokens($text);

// Calculate cost for text-embedding-3-small
$costPer1MTokens = 0.02;
$cost = ($tokenCount / 1_000_000) * $costPer1MTokens;

echo "Tokens: {$tokenCount}\n";
echo "Cost: $" . number_format($cost, 4);
```

### Cost Calculation Examples

**Scenario 1: Documentation Site (5,000 pages)**

```php
// Average page: 1,000 tokens
// Total tokens: 5,000 pages × 1,000 tokens = 5M tokens

// text-embedding-3-small
$cost = (5_000_000 / 1_000_000) * 0.02;
echo "3-small: $" . $cost; // $0.10

// text-embedding-3-large
$cost = (5_000_000 / 1_000_000) * 0.13;
echo "3-large: $" . $cost; // $0.65

// text-embedding-ada-002
$cost = (5_000_000 / 1_000_000) * 0.10;
echo "ada-002: $" . $cost; // $0.50
```

**Scenario 2: E-commerce Site (100,000 products)**

```php
// Average product description: 300 tokens
// Total tokens: 100,000 × 300 = 30M tokens

// text-embedding-3-small
$cost = (30_000_000 / 1_000_000) * 0.02;
echo "Initial index: $" . $cost; // $0.60

// Monthly updates: 10% of products change
$monthlyCost = (3_000_000 / 1_000_000) * 0.02;
echo "Monthly updates: $" . $monthlyCost; // $0.06
```

**Scenario 3: Support Ticket System (10,000 tickets/month)**

```php
// Average ticket: 200 tokens
// Monthly tokens: 10,000 × 200 = 2M tokens

// text-embedding-3-small
$monthlyCost = (2_000_000 / 1_000_000) * 0.02;
echo "Monthly cost: $" . $monthlyCost; // $0.04

// Annual cost
$annualCost = $monthlyCost * 12;
echo "Annual cost: $" . $annualCost; // $0.48
```

### Optimization Strategies

#### 1. Cache Embeddings

Never generate the same embedding twice:

```php
use Illuminate\Support\Facades\Cache;
use Mindwave\Mindwave\Facades\Embeddings;

class CachedEmbeddings
{
    public function embedText(string $text): array
    {
        $key = 'embedding:' . md5($text);

        return Cache::remember($key, now()->addMonth(), function() use ($text) {
            return Embeddings::embedText($text)->toArray();
        });
    }

    public function embedDocument(int $documentId, string $content): array
    {
        $key = "document:embedding:{$documentId}";

        return Cache::remember($key, now()->addMonth(), function() use ($content) {
            return Embeddings::embedText($content)->toArray();
        });
    }

    public function invalidate(int $documentId): void
    {
        Cache::forget("document:embedding:{$documentId}");
    }
}
```

#### 2. Batch Processing

Always use batch methods for multiple texts:

```php
// ❌ Bad: Individual API calls
foreach ($documents as $doc) {
    $embedding = Embeddings::embedText($doc->content); // Separate API call each time
}

// ✅ Good: Single batch API call
$embeddings = Embeddings::embedTexts(
    $documents->pluck('content')->toArray()
);

// Savings: 95% fewer API calls, same cost, 10x faster
```

#### 3. Choose Cost-Effective Models

Match model to use case:

```php
class AdaptiveEmbeddings
{
    public function embedForSearch(string $text): array
    {
        // Use cheaper model for general search
        config(['mindwave-embeddings.embeddings.openai.model' => 'text-embedding-3-small']);
        return Embeddings::embedText($text)->toArray();
    }

    public function embedForLegal(string $text): array
    {
        // Use high-quality model for critical content
        config(['mindwave-embeddings.embeddings.openai.model' => 'text-embedding-3-large']);
        return Embeddings::embedText($text)->toArray();
    }
}
```

#### 4. Smart Re-Embedding

Only re-embed when content changes:

```php
use App\Models\Article;
use Mindwave\Mindwave\Facades\Embeddings;

class SmartEmbeddingService
{
    public function updateArticleEmbedding(Article $article): void
    {
        // Check if content actually changed
        if (!$article->isDirty('content')) {
            return; // Skip embedding if content hasn't changed
        }

        // Generate new embedding
        $embedding = Embeddings::embedText($article->content);

        // Store embedding and hash
        $article->update([
            'embedding' => $embedding->toJson(),
            'content_hash' => md5($article->content),
        ]);
    }
}
```

#### 5. Track Costs with Tracing

Monitor embedding costs in production:

```php
use Mindwave\Mindwave\Facades\Embeddings;
use Mindwave\Mindwave\Facades\Tracing;

// Tracing automatically captures embedding costs
$span = Tracing::startSpan('document-processing');

try {
    $embeddings = Embeddings::embedTexts($texts);

    // View costs in dashboard
    // The trace includes token count and estimated cost

} finally {
    $span->end();
}

// Query costs from database
$embeddingCosts = Span::where('operation_name', 'embeddings.create')
    ->whereDate('created_at', today())
    ->sum('attributes->gen_ai.usage.input_tokens');

$dailyCost = ($embeddingCosts / 1_000_000) * 0.02;
echo "Today's embedding cost: $" . number_format($dailyCost, 4);
```

## Performance Optimization

### Batch Size Tuning

OpenAI allows up to 2048 embeddings per request:

```php
use Illuminate\Support\Collection;
use Mindwave\Mindwave\Facades\Embeddings;

class OptimizedEmbeddings
{
    private const BATCH_SIZE = 100; // Optimal batch size

    public function embedLargeDataset(Collection $documents): Collection
    {
        return $documents
            ->chunk(self::BATCH_SIZE)
            ->flatMap(function($chunk) {
                $texts = $chunk->pluck('content')->toArray();
                $embeddings = Embeddings::embedTexts($texts);

                return collect($embeddings);
            });
    }
}
```

**Batch Size Recommendations:**

-   **100-500**: Optimal for most use cases
-   **1000+**: For very large imports, watch memory usage
-   **2048**: Maximum per request

### Caching Strategies

Multiple levels of caching:

```php
namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Redis;
use Mindwave\Mindwave\Facades\Embeddings;

class MultiLevelCachedEmbeddings
{
    /**
     * L1: Memory cache (request-level)
     */
    private array $memoryCache = [];

    /**
     * L2: Redis cache (application-level)
     */
    public function embed(string $text): array
    {
        $hash = md5($text);

        // L1: Check memory
        if (isset($this->memoryCache[$hash])) {
            return $this->memoryCache[$hash];
        }

        // L2: Check Redis
        $cached = Cache::get("embed:{$hash}");
        if ($cached) {
            $this->memoryCache[$hash] = $cached;
            return $cached;
        }

        // L3: Generate and cache
        $embedding = Embeddings::embedText($text)->toArray();

        Cache::put("embed:{$hash}", $embedding, now()->addMonth());
        $this->memoryCache[$hash] = $embedding;

        return $embedding;
    }
}
```

### Async Processing with Queues

Process embeddings in the background:

```php
namespace App\Jobs;

use App\Models\Document;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Mindwave\Mindwave\Facades\Embeddings;
use Mindwave\Mindwave\Facades\Vectorstore;

class GenerateDocumentEmbedding implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public function __construct(
        public Document $document
    ) {}

    public function handle(): void
    {
        // Generate embedding
        $embedding = Embeddings::embedText($this->document->content);

        // Store in vector database
        Vectorstore::insert(
            new VectorStoreEntry($embedding, $this->document)
        );

        // Update document status
        $this->document->update(['indexed' => true]);
    }
}
```

**Dispatch Jobs:**

```php
use App\Jobs\GenerateDocumentEmbedding;

// Single document
GenerateDocumentEmbedding::dispatch($document);

// Batch processing
Document::whereNull('indexed')->chunk(100, function($documents) {
    foreach ($documents as $document) {
        GenerateDocumentEmbedding::dispatch($document);
    }
});
```

### Rate Limiting

Respect OpenAI rate limits:

```php
use Illuminate\Support\Facades\RateLimiter;
use Mindwave\Mindwave\Facades\Embeddings;

class RateLimitedEmbeddings
{
    public function embedWithRateLimit(array $texts): array
    {
        return RateLimiter::attempt(
            'openai-embeddings',
            $perMinute = 500, // Adjust to your plan
            function() use ($texts) {
                return Embeddings::embedTexts($texts);
            },
            $decaySeconds = 60
        );
    }
}
```

## Best Practices

### Model Selection Guide

Choose the right model for your needs:

```php
// Decision tree for model selection
function selectModel(array $requirements): string
{
    // High accuracy required?
    if ($requirements['accuracy'] === 'critical') {
        return 'text-embedding-3-large';
    }

    // Large volume, cost-sensitive?
    if ($requirements['volume'] > 1_000_000) {
        return 'text-embedding-3-small';
    }

    // Need compatibility with existing embeddings?
    if ($requirements['compatibility'] === 'ada-002') {
        return 'text-embedding-ada-002';
    }

    // Default: Best balance
    return 'text-embedding-3-small';
}
```

### When to Re-Embed

Only re-embed when necessary:

```php
class EmbeddingStrategy
{
    /**
     * Determine if content needs re-embedding
     */
    public function shouldReEmbed(Document $document): bool
    {
        // Content changed?
        if ($document->isDirty('content')) {
            return true;
        }

        // Model upgraded?
        if ($document->embedding_model !== config('mindwave-embeddings.model')) {
            return true;
        }

        // Embedding missing?
        if (empty($document->embedding)) {
            return true;
        }

        // Embedding older than 6 months? (optional)
        if ($document->embedded_at < now()->subMonths(6)) {
            return true;
        }

        return false;
    }
}
```

### Cache Invalidation

Clear embeddings when content changes:

```php
use App\Models\Article;
use Illuminate\Support\Facades\Cache;

class Article extends Model
{
    protected static function booted()
    {
        // Clear cache on update
        static::updated(function(Article $article) {
            if ($article->isDirty('content')) {
                Cache::forget("article:embedding:{$article->id}");

                // Re-index in background
                GenerateDocumentEmbedding::dispatch($article);
            }
        });

        // Clear cache on delete
        static::deleted(function(Article $article) {
            Cache::forget("article:embedding:{$article->id}");
            Vectorstore::delete($article->id);
        });
    }
}
```

### Error Handling

Robust error handling for production:

```php
use Mindwave\Mindwave\Facades\Embeddings;
use Illuminate\Support\Facades\Log;

class SafeEmbeddings
{
    public function embedWithRetry(string $text, int $maxRetries = 3): ?array
    {
        $attempt = 0;

        while ($attempt < $maxRetries) {
            try {
                return Embeddings::embedText($text)->toArray();

            } catch (\OpenAI\Exceptions\ErrorException $e) {
                $attempt++;

                // Log error
                Log::warning("Embedding attempt {$attempt} failed", [
                    'error' => $e->getMessage(),
                    'text_length' => strlen($text),
                ]);

                // Rate limit? Wait and retry
                if (str_contains($e->getMessage(), 'rate_limit')) {
                    sleep(pow(2, $attempt)); // Exponential backoff
                    continue;
                }

                // Other error? Give up
                throw $e;
            }
        }

        return null;
    }
}
```

### Production Deployment Checklist

```php
/**
 * Pre-deployment checklist for embeddings
 */
class DeploymentChecklist
{
    public function verify(): array
    {
        return [
            // Configuration
            'api_key_set' => !empty(config('mindwave-embeddings.embeddings.openai.api_key')),
            'model_configured' => !empty(config('mindwave-embeddings.embeddings.openai.model')),

            // Vector Store
            'vectorstore_configured' => !empty(config('mindwave-vectorstore.default')),
            'vectorstore_dimensions' => $this->checkDimensions(),

            // Caching
            'cache_configured' => config('cache.default') !== 'array',
            'redis_available' => $this->checkRedis(),

            // Queue
            'queue_configured' => config('queue.default') !== 'sync',
            'queue_workers' => $this->checkQueueWorkers(),

            // Monitoring
            'tracing_enabled' => config('mindwave-tracing.enabled'),
        ];
    }

    private function checkDimensions(): bool
    {
        $model = config('mindwave-embeddings.embeddings.openai.model');
        $expectedDimensions = str_contains($model, '3-large') ? 3072 : 1536;

        // Verify vector store supports these dimensions
        return true; // Implement actual check
    }
}
```

## Troubleshooting

### API Errors

**Invalid API Key:**

```
Error: Incorrect API key provided
```

**Solution:**

```php
// Verify .env configuration
MINDWAVE_OPENAI_API_KEY=sk-...

// Test connection
php artisan tinker
>>> Embeddings::embedText('test');
```

**Rate Limiting:**

```
Error: Rate limit exceeded
```

**Solution:**

```php
// Implement rate limiting
use Illuminate\Support\Facades\RateLimiter;

RateLimiter::for('openai-embeddings', function($job) {
    return Limit::perMinute(500); // Adjust to your plan
});

// Or add delays between requests
foreach ($chunks as $chunk) {
    $embeddings = Embeddings::embedTexts($chunk);
    usleep(100000); // 100ms delay
}
```

### Cost Overruns

**Unexpected High Costs:**

**Solution:**

```php
// Monitor token usage
use Mindwave\Mindwave\PromptComposer\Tokenizer;

$documents->each(function($doc) {
    $tokens = Tokenizer::countTokens($doc->content);

    if ($tokens > 5000) {
        Log::warning("Large document", [
            'id' => $doc->id,
            'tokens' => $tokens,
            'estimated_cost' => ($tokens / 1_000_000) * 0.02,
        ]);
    }
});

// Set cost alerts
if ($dailyTokens > 10_000_000) {
    Notification::route('slack', config('slack.webhook'))
        ->notify(new HighEmbeddingCostAlert($dailyTokens));
}
```

### Performance Issues

**Slow Embedding Generation:**

**Solutions:**

```php
// 1. Use batch processing
$embeddings = Embeddings::embedTexts($texts); // Instead of embedText() in loop

// 2. Implement caching
$cached = Cache::remember("embed:{$hash}", 3600, fn() =>
    Embeddings::embedText($text)
);

// 3. Use queues for non-blocking
GenerateDocumentEmbedding::dispatch($document);

// 4. Process in chunks
$documents->chunk(100)->each(function($chunk) {
    ProcessEmbeddings::dispatch($chunk);
});
```

### Dimension Mismatches

**Error: Vector dimensions don't match:**

```
Error: Expected 3072 dimensions, got 1536
```

**Solution:**

```php
// Check model configuration
$model = config('mindwave-embeddings.embeddings.openai.model');
echo "Current model: {$model}\n";

// text-embedding-3-large = 3072 dimensions
// text-embedding-3-small = 1536 dimensions
// text-embedding-ada-002 = 1536 dimensions

// Update vector store configuration to match
// Or change embedding model to match vector store

// Re-index if you changed models
php artisan mindwave:reindex
```

### Memory Issues

**Out of Memory with Large Batches:**

**Solution:**

```php
// Reduce batch size
$documents->chunk(50)->each(function($chunk) {
    $embeddings = Embeddings::embedDocuments($chunk);

    // Process and clear
    $this->storeEmbeddings($embeddings);
    unset($embeddings); // Free memory
    gc_collect_cycles(); // Force garbage collection
});

// Or increase PHP memory limit
ini_set('memory_limit', '512M');
```

### Testing Connection

Test your embeddings setup:

```php
namespace Tests\Feature;

use Tests\TestCase;
use Mindwave\Mindwave\Facades\Embeddings;

class EmbeddingsTest extends TestCase
{
    public function test_embeddings_connection(): void
    {
        $result = Embeddings::embedText('test');

        $this->assertInstanceOf(EmbeddingVector::class, $result);
        $this->assertCount(1536, $result); // Or 3072 for 3-large
    }

    public function test_batch_embeddings(): void
    {
        $texts = ['first', 'second', 'third'];
        $results = Embeddings::embedTexts($texts);

        $this->assertCount(3, $results);
        $this->assertContainsOnlyInstancesOf(EmbeddingVector::class, $results);
    }
}
```

Run tests:

```bash
php artisan test --filter EmbeddingsTest
```

### Debug Mode

Enable detailed logging:

```php
use Illuminate\Support\Facades\Log;
use Mindwave\Mindwave\Facades\Embeddings;

// Wrap embedding calls with logging
Log::debug('Generating embeddings', [
    'text_length' => strlen($text),
    'model' => config('mindwave-embeddings.embeddings.openai.model'),
]);

$startTime = microtime(true);
$embedding = Embeddings::embedText($text);
$duration = microtime(true) - $startTime;

Log::debug('Embedding generated', [
    'dimensions' => count($embedding),
    'duration_ms' => round($duration * 1000, 2),
]);
```

## Summary

Embeddings are the foundation of semantic search and RAG systems in Mindwave:

-   **Choose wisely**: text-embedding-3-small for most use cases
-   **Batch efficiently**: Always use batch methods for multiple texts
-   **Cache aggressively**: Never generate the same embedding twice
-   **Monitor costs**: Track token usage and set alerts
-   **Optimize storage**: Use appropriate vector stores with correct dimensions
-   **Handle errors**: Implement retry logic and rate limiting
-   **Test thoroughly**: Verify setup before production deployment

For vector storage and similarity search, see the [Vector Stores documentation](/docs/rag/vectorstores).
