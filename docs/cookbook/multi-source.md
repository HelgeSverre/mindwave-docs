# Multi-Source Context Pipeline

## Introduction

This cookbook demonstrates building a production-ready hybrid RAG system that combines multiple context sources to provide the most relevant information for your AI prompts. You'll learn how to orchestrate TNTSearch (BM25), Vector embeddings, Eloquent queries, and static data sources into a unified context pipeline.

### What We're Building

A customer support AI that intelligently pulls context from:

-   **TNTSearch**: Fast keyword search over product documentation
-   **Vector Store**: Semantic search through embedded knowledge base
-   **Eloquent**: Database queries for company policies and procedures
-   **Static Sources**: Frequently Asked Questions and common responses

### Features Included

-   Hybrid search combining BM25 and semantic similarity
-   Intelligent deduplication across sources
-   Relevance-based ranking and scoring
-   Token-aware context injection
-   Source attribution and confidence tracking
-   Fallback strategies for reliability

### Prerequisites

```bash
# Required packages
composer require mindwave/mindwave
composer require teamtnt/laravel-scout-tntsearch-driver
composer require qdrant/php-client

# Laravel 11+
php artisan vendor:publish --tag=mindwave-config
```

### What You'll Learn

1. Setting up multiple context sources
2. Building a Context Pipeline
3. Implementing hybrid search strategies
4. Deduplication and ranking algorithms
5. Token-aware context management
6. Source attribution for transparency
7. Production optimization patterns

## Architecture Overview

### Context Pipeline Flow

```
User Query
    |
    v
+------------------+
| Query Processor  |
+------------------+
    |
    +-------------------+-------------------+-------------------+
    |                   |                   |                   |
    v                   v                   v                   v
+----------+      +-----------+      +----------+      +--------+
|TNTSearch |      |  Vector   |      | Eloquent |      | Static |
|  (BM25)  |      |(Semantic) |      |(Database)|      | (FAQ)  |
+----------+      +-----------+      +----------+      +--------+
    |                   |                   |                   |
    +-------------------+-------------------+-------------------+
                        |
                        v
            +----------------------+
            | Result Aggregator    |
            | - Deduplication      |
            | - Relevance Scoring  |
            | - Source Attribution |
            +----------------------+
                        |
                        v
            +----------------------+
            | Token Manager        |
            | - Fit to budget      |
            | - Priority ranking   |
            +----------------------+
                        |
                        v
            +----------------------+
            | Prompt Composer      |
            | - Inject context     |
            | - Format sources     |
            +----------------------+
                        |
                        v
                   Final Prompt
```

### Source Types Explained

**TNTSearch (BM25)**

-   **Best for**: Exact keyword matches, technical terms, product codes
-   **Speed**: Very fast (in-memory index)
-   **Cost**: Minimal (no API calls)
-   **Use case**: Product documentation, technical specs

**Vector Store (Semantic)**

-   **Best for**: Conceptual similarity, natural language
-   **Speed**: Fast (optimized vector search)
-   **Cost**: Embedding API costs
-   **Use case**: Knowledge base articles, troubleshooting guides

**Eloquent (Database)**

-   **Best for**: Structured data, real-time information
-   **Speed**: Fast (indexed queries)
-   **Cost**: Database resources
-   **Use case**: Company policies, user data, inventory

**Static Sources**

-   **Best for**: Fixed content, common questions
-   **Speed**: Instant (in-memory)
-   **Cost**: None
-   **Use case**: FAQs, standard responses, legal disclaimers

### Deduplication and Ranking

The pipeline uses a multi-stage approach:

1. **Retrieval**: Each source returns top N results
2. **Normalization**: Scores normalized to 0-1 range
3. **Deduplication**: Similar results merged by content hash
4. **Re-ranking**: Combined score = weighted sum of source scores
5. **Token Fitting**: Results trimmed to fit prompt budget
6. **Attribution**: Track which sources contributed

## Step 1: Environment Setup

### Configure Vector Store (Qdrant)

```dotenv
# .env
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_API_KEY=your-api-key
QDRANT_COLLECTION=support_docs

OPENAI_API_KEY=your-openai-key
```

### Configure TNTSearch

```bash
# Publish TNTSearch config
php artisan vendor:publish --provider="TeamTNT\Scout\TNTSearchScoutServiceProvider"

# Create storage directory
mkdir -p storage/tntsearch
```

Update `config/scout.php`:

```php
'tntsearch' => [
    'storage' => storage_path('tntsearch'),
    'fuzziness' => true,
    'fuzzy' => [
        'prefix_length' => 2,
        'max_expansions' => 50,
        'distance' => 2,
    ],
    'asYouType' => false,
],
```

### Database Migration for Policies

```php
// database/migrations/2024_01_01_create_company_policies_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_policies', function (Blueprint $table) {
            $table->id();
            $table->string('category');
            $table->string('title');
            $table->text('content');
            $table->json('tags')->nullable();
            $table->timestamp('effective_date');
            $table->timestamps();

            $table->index(['category', 'effective_date']);
            $table->fullText(['title', 'content']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_policies');
    }
};
```

### Complete Environment Setup

```bash
# Run migrations
php artisan migrate

# Seed sample policies
php artisan db:seed CompanyPolicySeeder

# Create Qdrant collection
php artisan mindwave:setup-vector-store
```

## Step 2: Setting Up Multiple Sources

### Source 1: TNTSearch (Documentation)

Create a searchable model for documentation:

```php
// app/Models/Documentation.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Laravel\Scout\Searchable;

class Documentation extends Model
{
    use Searchable;

    protected $fillable = [
        'title',
        'slug',
        'content',
        'category',
        'tags',
    ];

    protected $casts = [
        'tags' => 'array',
    ];

    /**
     * Get the indexable data array for the model.
     */
    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'content' => $this->content,
            'category' => $this->category,
            'tags' => implode(' ', $this->tags ?? []),
        ];
    }

    /**
     * Get the value used to index the model.
     */
    public function searchableAs(): string
    {
        return 'documentation_index';
    }
}
```

Index your documentation:

```php
// database/seeders/DocumentationSeeder.php
namespace Database\Seeders;

use App\Models\Documentation;
use Illuminate\Database\Seeder;

class DocumentationSeeder extends Seeder
{
    public function run(): void
    {
        $docs = [
            [
                'title' => 'Product Return Policy',
                'slug' => 'return-policy',
                'content' => 'Customers can return products within 30 days of purchase. Items must be unused and in original packaging. Refunds are processed within 5-7 business days.',
                'category' => 'policies',
                'tags' => ['returns', 'refunds', 'customer-service'],
            ],
            [
                'title' => 'Shipping Information',
                'slug' => 'shipping-info',
                'content' => 'Standard shipping takes 5-7 business days. Express shipping available for 2-3 day delivery. Free shipping on orders over $50.',
                'category' => 'shipping',
                'tags' => ['shipping', 'delivery', 'logistics'],
            ],
            [
                'title' => 'Product Warranty',
                'slug' => 'warranty',
                'content' => 'All products include a 1-year manufacturer warranty covering defects in materials and workmanship. Extended warranties available for purchase.',
                'category' => 'warranty',
                'tags' => ['warranty', 'guarantee', 'protection'],
            ],
        ];

        foreach ($docs as $doc) {
            Documentation::create($doc);
        }
    }
}
```

Configure TNTSearch source:

```php
// app/Services/Context/TNTSearchContextSource.php
namespace App\Services\Context;

use App\Models\Documentation;
use Mindwave\Mindwave\Context\Contracts\ContextSource;

class TNTSearchContextSource implements ContextSource
{
    public function __construct(
        private int $limit = 5
    ) {}

    public function retrieve(string $query, array $options = []): array
    {
        $results = Documentation::search($query)
            ->take($this->limit)
            ->get();

        return $results->map(function ($doc) {
            return [
                'content' => $doc->content,
                'metadata' => [
                    'source' => 'tntsearch',
                    'title' => $doc->title,
                    'category' => $doc->category,
                    'url' => "/docs/{$doc->slug}",
                ],
                'score' => 1.0, // TNTSearch doesn't provide scores
            ];
        })->toArray();
    }

    public function name(): string
    {
        return 'tntsearch';
    }
}
```

### Source 2: VectorStore (Embeddings)

Embed and store documentation:

```php
// app/Services/Context/VectorStoreSetup.php
namespace App\Services\Context;

use Mindwave\Mindwave\Embeddings\EmbeddingGenerator;
use Qdrant\Client;
use Qdrant\Models\PointStruct;
use Qdrant\Models\VectorStruct;

class VectorStoreSetup
{
    public function __construct(
        private EmbeddingGenerator $embeddings,
        private Client $qdrant
    ) {}

    public function embedDocumentation(): void
    {
        $docs = [
            [
                'id' => 1,
                'content' => 'Product Return Policy: Customers can return products within 30 days of purchase. Items must be unused and in original packaging.',
                'title' => 'Return Policy',
                'category' => 'policies',
            ],
            [
                'id' => 2,
                'content' => 'Shipping Information: Standard shipping takes 5-7 business days. Express shipping available for 2-3 day delivery.',
                'title' => 'Shipping Info',
                'category' => 'shipping',
            ],
            [
                'id' => 3,
                'content' => 'Product Warranty: All products include a 1-year manufacturer warranty covering defects in materials and workmanship.',
                'title' => 'Warranty',
                'category' => 'warranty',
            ],
            [
                'id' => 4,
                'content' => 'How to track your order: Use your order number and email to track shipments in real-time through our tracking portal.',
                'title' => 'Order Tracking',
                'category' => 'shipping',
            ],
            [
                'id' => 5,
                'content' => 'Payment methods: We accept Visa, MasterCard, American Express, PayPal, and Apple Pay for all purchases.',
                'title' => 'Payment Options',
                'category' => 'billing',
            ],
        ];

        $points = [];

        foreach ($docs as $doc) {
            $embedding = $this->embeddings->embed($doc['content']);

            $points[] = new PointStruct(
                id: $doc['id'],
                vector: new VectorStruct($embedding, 'default'),
                payload: [
                    'content' => $doc['content'],
                    'title' => $doc['title'],
                    'category' => $doc['category'],
                ]
            );
        }

        $this->qdrant->points(config('qdrant.collection'))
            ->upsert($points);
    }
}
```

Configure Vector source:

```php
// app/Services/Context/VectorContextSource.php
namespace App\Services\Context;

use Mindwave\Mindwave\Context\Contracts\ContextSource;
use Mindwave\Mindwave\Embeddings\EmbeddingGenerator;
use Qdrant\Client;
use Qdrant\Models\VectorStruct;
use Qdrant\Models\Request\SearchRequest;

class VectorContextSource implements ContextSource
{
    public function __construct(
        private EmbeddingGenerator $embeddings,
        private Client $qdrant,
        private int $limit = 5,
        private float $scoreThreshold = 0.7
    ) {}

    public function retrieve(string $query, array $options = []): array
    {
        // Generate query embedding
        $queryEmbedding = $this->embeddings->embed($query);

        // Search Qdrant
        $searchRequest = new SearchRequest(
            vector: new VectorStruct($queryEmbedding, 'default'),
            limit: $this->limit,
            scoreThreshold: $this->scoreThreshold,
            withPayload: true
        );

        $results = $this->qdrant->points(config('qdrant.collection'))
            ->search($searchRequest);

        return collect($results)->map(function ($result) {
            return [
                'content' => $result->payload['content'],
                'metadata' => [
                    'source' => 'vector',
                    'title' => $result->payload['title'],
                    'category' => $result->payload['category'],
                    'score' => $result->score,
                ],
                'score' => $result->score,
            ];
        })->toArray();
    }

    public function name(): string
    {
        return 'vector';
    }
}
```

### Source 3: Eloquent (Database)

Create Company Policy model:

```php
// app/Models/CompanyPolicy.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanyPolicy extends Model
{
    protected $fillable = [
        'category',
        'title',
        'content',
        'tags',
        'effective_date',
    ];

    protected $casts = [
        'tags' => 'array',
        'effective_date' => 'datetime',
    ];

    /**
     * Search policies by keyword and category.
     */
    public function scopeSearch($query, string $keyword, ?string $category = null)
    {
        $query->whereFullText(['title', 'content'], $keyword)
              ->where('effective_date', '<=', now())
              ->orderBy('effective_date', 'desc');

        if ($category) {
            $query->where('category', $category);
        }

        return $query;
    }

    /**
     * Calculate relevance score based on keyword matches.
     */
    public function calculateRelevanceScore(string $query): float
    {
        $query = strtolower($query);
        $content = strtolower($this->title . ' ' . $this->content);

        // Simple keyword matching
        $keywords = explode(' ', $query);
        $matches = 0;

        foreach ($keywords as $keyword) {
            if (strlen($keyword) > 2 && str_contains($content, $keyword)) {
                $matches++;
            }
        }

        return $matches / max(count($keywords), 1);
    }
}
```

Configure Eloquent source:

```php
// app/Services/Context/EloquentContextSource.php
namespace App\Services\Context;

use App\Models\CompanyPolicy;
use Mindwave\Mindwave\Context\Contracts\ContextSource;

class EloquentContextSource implements ContextSource
{
    public function __construct(
        private int $limit = 5,
        private ?string $category = null
    ) {}

    public function retrieve(string $query, array $options = []): array
    {
        $category = $options['category'] ?? $this->category;

        $policies = CompanyPolicy::search($query, $category)
            ->limit($this->limit)
            ->get();

        return $policies->map(function ($policy) use ($query) {
            return [
                'content' => $policy->content,
                'metadata' => [
                    'source' => 'eloquent',
                    'title' => $policy->title,
                    'category' => $policy->category,
                    'effective_date' => $policy->effective_date->format('Y-m-d'),
                    'tags' => $policy->tags,
                ],
                'score' => $policy->calculateRelevanceScore($query),
            ];
        })->toArray();
    }

    public function name(): string
    {
        return 'eloquent';
    }
}
```

Seed company policies:

```php
// database/seeders/CompanyPolicySeeder.php
namespace Database\Seeders;

use App\Models\CompanyPolicy;
use Illuminate\Database\Seeder;

class CompanyPolicySeeder extends Seeder
{
    public function run(): void
    {
        $policies = [
            [
                'category' => 'refund',
                'title' => 'Refund Processing Timeline',
                'content' => 'Refunds are processed within 5-7 business days after receiving returned items. The amount will be credited to the original payment method. Bank processing may take an additional 3-5 days.',
                'tags' => ['refund', 'timeline', 'payment'],
                'effective_date' => now()->subMonths(6),
            ],
            [
                'category' => 'privacy',
                'title' => 'Customer Data Privacy',
                'content' => 'We collect and store customer information in accordance with GDPR. Data is encrypted at rest and in transit. Customers can request data deletion at any time.',
                'tags' => ['privacy', 'gdpr', 'security'],
                'effective_date' => now()->subMonths(3),
            ],
            [
                'category' => 'support',
                'title' => 'Support Response Times',
                'content' => 'Email support: 24-hour response time. Chat support: Available 9am-5pm EST with immediate response. Phone support: Available for premium customers.',
                'tags' => ['support', 'response', 'sla'],
                'effective_date' => now()->subMonth(),
            ],
        ];

        foreach ($policies as $policy) {
            CompanyPolicy::create($policy);
        }
    }
}
```

### Source 4: Static (FAQ)

Create static FAQ source:

```php
// app/Services/Context/StaticFAQSource.php
namespace App\Services\Context;

use Mindwave\Mindwave\Context\Contracts\ContextSource;

class StaticFAQSource implements ContextSource
{
    private array $faqs;

    public function __construct()
    {
        $this->faqs = [
            [
                'question' => 'How do I reset my password?',
                'answer' => 'Click "Forgot Password" on the login page. Enter your email and follow the reset link sent to your inbox. The link expires in 1 hour.',
                'keywords' => ['password', 'reset', 'login', 'forgot'],
                'category' => 'account',
            ],
            [
                'question' => 'What payment methods do you accept?',
                'answer' => 'We accept Visa, MasterCard, American Express, PayPal, Apple Pay, and Google Pay. All transactions are secured with 256-bit SSL encryption.',
                'keywords' => ['payment', 'credit card', 'pay', 'billing'],
                'category' => 'billing',
            ],
            [
                'question' => 'How can I track my order?',
                'answer' => 'Use your order number and email address on our tracking page. You will also receive tracking updates via email once your order ships.',
                'keywords' => ['track', 'order', 'shipping', 'delivery'],
                'category' => 'shipping',
            ],
            [
                'question' => 'Can I cancel my order?',
                'answer' => 'Orders can be cancelled within 1 hour of placement. After this time, the order enters processing and cannot be cancelled. You can return items after delivery.',
                'keywords' => ['cancel', 'order', 'refund'],
                'category' => 'orders',
            ],
            [
                'question' => 'Do you ship internationally?',
                'answer' => 'Yes, we ship to over 50 countries. International shipping takes 10-14 business days. Customs fees may apply depending on your country.',
                'keywords' => ['international', 'shipping', 'country', 'abroad'],
                'category' => 'shipping',
            ],
        ];
    }

    public function retrieve(string $query, array $options = []): array
    {
        $query = strtolower($query);
        $results = [];

        foreach ($this->faqs as $faq) {
            $score = $this->calculateScore($query, $faq['keywords']);

            if ($score > 0) {
                $results[] = [
                    'content' => $faq['answer'],
                    'metadata' => [
                        'source' => 'static',
                        'question' => $faq['question'],
                        'category' => $faq['category'],
                    ],
                    'score' => $score,
                ];
            }
        }

        // Sort by score descending
        usort($results, fn($a, $b) => $b['score'] <=> $a['score']);

        return array_slice($results, 0, 3);
    }

    private function calculateScore(string $query, array $keywords): float
    {
        $queryWords = explode(' ', $query);
        $matches = 0;
        $totalWords = count($queryWords);

        foreach ($queryWords as $word) {
            if (strlen($word) > 2) {
                foreach ($keywords as $keyword) {
                    if (str_contains($word, $keyword) || str_contains($keyword, $word)) {
                        $matches++;
                        break;
                    }
                }
            }
        }

        return $totalWords > 0 ? $matches / $totalWords : 0;
    }

    public function name(): string
    {
        return 'static';
    }
}
```

## Step 3: Context Pipeline

Create a comprehensive pipeline that orchestrates all sources:

```php
// app/Services/Context/MultiSourceContextPipeline.php
namespace App\Services\Context;

use Mindwave\Mindwave\Context\Contracts\ContextSource;

class MultiSourceContextPipeline
{
    private array $sources = [];
    private array $weights = [];
    private float $deduplicationThreshold = 0.85;
    private int $maxResults = 10;

    public function __construct(
        private int $tokenBudget = 2000
    ) {}

    /**
     * Add a context source to the pipeline.
     */
    public function addSource(ContextSource $source, float $weight = 1.0): self
    {
        $this->sources[] = [
            'source' => $source,
            'weight' => $weight,
        ];

        $this->weights[$source->name()] = $weight;

        return $this;
    }

    /**
     * Set deduplication threshold (0-1).
     */
    public function setDeduplicationThreshold(float $threshold): self
    {
        $this->deduplicationThreshold = $threshold;
        return $this;
    }

    /**
     * Set maximum number of results to return.
     */
    public function setMaxResults(int $max): self
    {
        $this->maxResults = $max;
        return $this;
    }

    /**
     * Execute the pipeline and retrieve context.
     */
    public function retrieve(string $query, array $options = []): array
    {
        // Step 1: Retrieve from all sources in parallel
        $allResults = $this->retrieveFromAllSources($query, $options);

        // Step 2: Normalize scores
        $normalized = $this->normalizeScores($allResults);

        // Step 3: Deduplicate results
        $deduplicated = $this->deduplicateResults($normalized);

        // Step 4: Re-rank with weighted scores
        $ranked = $this->reRankResults($deduplicated);

        // Step 5: Limit to max results
        $limited = array_slice($ranked, 0, $this->maxResults);

        // Step 6: Fit to token budget
        $fitted = $this->fitToTokenBudget($limited);

        return $fitted;
    }

    /**
     * Retrieve results from all sources.
     */
    private function retrieveFromAllSources(string $query, array $options): array
    {
        $allResults = [];

        foreach ($this->sources as $sourceConfig) {
            $source = $sourceConfig['source'];

            try {
                $results = $source->retrieve($query, $options);

                foreach ($results as $result) {
                    $allResults[] = array_merge($result, [
                        'source_name' => $source->name(),
                        'source_weight' => $sourceConfig['weight'],
                    ]);
                }
            } catch (\Exception $e) {
                // Log error but continue with other sources
                logger()->error("Source {$source->name()} failed", [
                    'error' => $e->getMessage(),
                    'query' => $query,
                ]);
            }
        }

        return $allResults;
    }

    /**
     * Normalize scores to 0-1 range per source.
     */
    private function normalizeScores(array $results): array
    {
        // Group by source
        $bySource = [];
        foreach ($results as $result) {
            $bySource[$result['source_name']][] = $result;
        }

        $normalized = [];

        // Normalize each source's scores
        foreach ($bySource as $sourceName => $sourceResults) {
            $scores = array_column($sourceResults, 'score');
            $maxScore = max($scores) ?: 1.0;
            $minScore = min($scores) ?: 0.0;
            $range = $maxScore - $minScore ?: 1.0;

            foreach ($sourceResults as $result) {
                $result['normalized_score'] = ($result['score'] - $minScore) / $range;
                $normalized[] = $result;
            }
        }

        return $normalized;
    }

    /**
     * Deduplicate similar results.
     */
    private function deduplicateResults(array $results): array
    {
        $unique = [];
        $seen = [];

        foreach ($results as $result) {
            $hash = $this->contentHash($result['content']);
            $isDuplicate = false;

            // Check against seen hashes
            foreach ($seen as $seenHash => $seenIndex) {
                $similarity = $this->calculateSimilarity($hash, $seenHash);

                if ($similarity >= $this->deduplicationThreshold) {
                    // Merge with existing result (keep higher score)
                    if ($result['normalized_score'] > $unique[$seenIndex]['normalized_score']) {
                        $unique[$seenIndex] = $this->mergeResults(
                            $unique[$seenIndex],
                            $result
                        );
                    }
                    $isDuplicate = true;
                    break;
                }
            }

            if (!$isDuplicate) {
                $seen[$hash] = count($unique);
                $unique[] = $result;
            }
        }

        return array_values($unique);
    }

    /**
     * Re-rank results using weighted scores.
     */
    private function reRankResults(array $results): array
    {
        foreach ($results as &$result) {
            $weight = $result['source_weight'];
            $normalizedScore = $result['normalized_score'];

            // Combined score: weighted average
            $result['final_score'] = $normalizedScore * $weight;
        }

        // Sort by final score descending
        usort($results, fn($a, $b) => $b['final_score'] <=> $a['final_score']);

        return $results;
    }

    /**
     * Fit results to token budget.
     */
    private function fitToTokenBudget(array $results): array
    {
        $fitted = [];
        $usedTokens = 0;

        foreach ($results as $result) {
            $tokens = $this->estimateTokens($result['content']);

            if ($usedTokens + $tokens <= $this->tokenBudget) {
                $fitted[] = $result;
                $usedTokens += $tokens;
            } else {
                // Try to fit truncated version
                $remaining = $this->tokenBudget - $usedTokens;

                if ($remaining > 100) { // Only if meaningful space left
                    $result['content'] = $this->truncateToTokens(
                        $result['content'],
                        $remaining
                    );
                    $result['metadata']['truncated'] = true;
                    $fitted[] = $result;
                }

                break;
            }
        }

        return $fitted;
    }

    /**
     * Generate content hash for deduplication.
     */
    private function contentHash(string $content): string
    {
        // Normalize content
        $normalized = strtolower(trim($content));
        $normalized = preg_replace('/\s+/', ' ', $normalized);

        return hash('xxh3', $normalized);
    }

    /**
     * Calculate similarity between two hashes.
     */
    private function calculateSimilarity(string $hash1, string $hash2): float
    {
        // For content hashes, exact match or no match
        return $hash1 === $hash2 ? 1.0 : 0.0;
    }

    /**
     * Merge two duplicate results.
     */
    private function mergeResults(array $result1, array $result2): array
    {
        // Keep result with higher score, but merge metadata
        $merged = $result1['final_score'] > $result2['final_score'] ? $result1 : $result2;

        // Track both sources
        $merged['metadata']['sources'] = array_unique(array_merge(
            $merged['metadata']['sources'] ?? [$merged['source_name']],
            [$result1['source_name'], $result2['source_name']]
        ));

        return $merged;
    }

    /**
     * Estimate token count for content.
     */
    private function estimateTokens(string $content): int
    {
        // Rough estimation: ~4 characters per token
        return (int) ceil(strlen($content) / 4);
    }

    /**
     * Truncate content to fit token budget.
     */
    private function truncateToTokens(string $content, int $tokens): string
    {
        $chars = $tokens * 4;

        if (strlen($content) <= $chars) {
            return $content;
        }

        // Truncate at sentence boundary if possible
        $truncated = substr($content, 0, $chars);
        $lastPeriod = strrpos($truncated, '.');

        if ($lastPeriod !== false && $lastPeriod > $chars * 0.8) {
            return substr($truncated, 0, $lastPeriod + 1);
        }

        return $truncated . '...';
    }

    /**
     * Get pipeline statistics.
     */
    public function getStats(): array
    {
        return [
            'sources' => count($this->sources),
            'weights' => $this->weights,
            'deduplication_threshold' => $this->deduplicationThreshold,
            'max_results' => $this->maxResults,
            'token_budget' => $this->tokenBudget,
        ];
    }
}
```

## Step 4: Advanced Service

Create a comprehensive RAG service that uses the pipeline:

```php
// app/Services/MultiSourceRAGService.php
namespace App\Services;

use App\Services\Context\MultiSourceContextPipeline;
use App\Services\Context\TNTSearchContextSource;
use App\Services\Context\VectorContextSource;
use App\Services\Context\EloquentContextSource;
use App\Services\Context\StaticFAQSource;
use Mindwave\Mindwave\Prompt\PromptComposer;
use Mindwave\Mindwave\Completions\CompletionService;
use Mindwave\Mindwave\Embeddings\EmbeddingGenerator;
use Qdrant\Client as QdrantClient;

class MultiSourceRAGService
{
    private MultiSourceContextPipeline $pipeline;

    public function __construct(
        private PromptComposer $composer,
        private CompletionService $completions,
        private EmbeddingGenerator $embeddings,
        private QdrantClient $qdrant
    ) {
        $this->initializePipeline();
    }

    /**
     * Initialize the context pipeline with all sources.
     */
    private function initializePipeline(): void
    {
        $this->pipeline = new MultiSourceContextPipeline(tokenBudget: 2000);

        // Add sources with weights
        $this->pipeline
            ->addSource(new VectorContextSource($this->embeddings, $this->qdrant), weight: 1.5)
            ->addSource(new TNTSearchContextSource(), weight: 1.2)
            ->addSource(new EloquentContextSource(), weight: 1.0)
            ->addSource(new StaticFAQSource(), weight: 0.8)
            ->setDeduplicationThreshold(0.85)
            ->setMaxResults(8);
    }

    /**
     * Generate answer with multi-source context.
     */
    public function answer(string $question, array $options = []): array
    {
        // Retrieve context from all sources
        $context = $this->pipeline->retrieve($question, $options);

        // Build prompt with context
        $prompt = $this->buildPrompt($question, $context);

        // Generate completion
        $response = $this->completions->create([
            'model' => 'gpt-4',
            'messages' => [
                ['role' => 'system', 'content' => $this->getSystemPrompt()],
                ['role' => 'user', 'content' => $prompt],
            ],
            'temperature' => 0.7,
            'max_tokens' => 500,
        ]);

        return [
            'answer' => $response['choices'][0]['message']['content'],
            'sources' => $this->formatSources($context),
            'context_used' => count($context),
            'pipeline_stats' => $this->pipeline->getStats(),
        ];
    }

    /**
     * Search across all sources without generating answer.
     */
    public function search(string $query, array $options = []): array
    {
        $results = $this->pipeline->retrieve($query, $options);

        return [
            'results' => $results,
            'total' => count($results),
            'sources_used' => array_unique(array_column($results, 'source_name')),
        ];
    }

    /**
     * Build prompt with context.
     */
    private function buildPrompt(string $question, array $context): string
    {
        $this->composer->reset();

        $this->composer->addSection('context', function ($section) use ($context) {
            $section->line('Use the following information to answer the question:');
            $section->line('');

            foreach ($context as $i => $item) {
                $source = $item['metadata']['source'] ?? $item['source_name'];
                $title = $item['metadata']['title'] ?? 'Untitled';
                $score = number_format($item['final_score'], 2);

                $section->line("### Source " . ($i + 1) . ": {$title} (from {$source}, score: {$score})");
                $section->line($item['content']);
                $section->line('');
            }
        });

        $this->composer->addSection('question', function ($section) use ($question) {
            $section->line('Question: ' . $question);
        });

        $this->composer->addSection('instructions', function ($section) {
            $section->line('Provide a helpful, accurate answer based on the context above.');
            $section->line('If the context does not contain enough information, say so.');
            $section->line('Always cite which sources you used in your answer.');
        });

        return $this->composer->toString();
    }

    /**
     * Get system prompt for customer support.
     */
    private function getSystemPrompt(): string
    {
        return <<<PROMPT
You are a helpful customer support assistant. Your role is to:

1. Answer questions accurately using the provided context
2. Be concise but thorough
3. Cite your sources when providing information
4. Admit when you don't have enough information
5. Maintain a friendly, professional tone

When multiple sources provide conflicting information, prefer:
- Vector sources for conceptual questions
- Database sources for up-to-date policies
- TNTSearch for exact keyword matches
- Static FAQs for common questions
PROMPT;
    }

    /**
     * Format sources for response.
     */
    private function formatSources(array $context): array
    {
        return array_map(function ($item, $index) {
            return [
                'id' => $index + 1,
                'source' => $item['source_name'],
                'title' => $item['metadata']['title'] ?? 'Untitled',
                'category' => $item['metadata']['category'] ?? null,
                'score' => round($item['final_score'], 3),
                'url' => $item['metadata']['url'] ?? null,
                'truncated' => $item['metadata']['truncated'] ?? false,
            ];
        }, $context, array_keys($context));
    }

    /**
     * Configure source weights dynamically.
     */
    public function configureWeights(array $weights): void
    {
        $this->pipeline = new MultiSourceContextPipeline(tokenBudget: 2000);

        $sources = [
            'vector' => new VectorContextSource($this->embeddings, $this->qdrant),
            'tntsearch' => new TNTSearchContextSource(),
            'eloquent' => new EloquentContextSource(),
            'static' => new StaticFAQSource(),
        ];

        foreach ($weights as $sourceName => $weight) {
            if (isset($sources[$sourceName])) {
                $this->pipeline->addSource($sources[$sourceName], $weight);
            }
        }

        $this->pipeline
            ->setDeduplicationThreshold(0.85)
            ->setMaxResults(8);
    }

    /**
     * Get available sources.
     */
    public function getAvailableSources(): array
    {
        return [
            'vector' => [
                'name' => 'Vector Search',
                'description' => 'Semantic search through embedded documentation',
                'best_for' => 'Conceptual questions, natural language queries',
            ],
            'tntsearch' => [
                'name' => 'TNTSearch',
                'description' => 'Fast keyword search over documentation',
                'best_for' => 'Exact terms, product codes, technical specs',
            ],
            'eloquent' => [
                'name' => 'Database',
                'description' => 'Company policies and structured data',
                'best_for' => 'Current policies, official procedures',
            ],
            'static' => [
                'name' => 'FAQ',
                'description' => 'Frequently asked questions',
                'best_for' => 'Common questions, quick answers',
            ],
        ];
    }
}
```

## Step 5: Controller Implementation

Create an API endpoint for multi-source RAG:

```php
// app/Http/Controllers/Api/MultiSourceRAGController.php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\MultiSourceRAGService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class MultiSourceRAGController extends Controller
{
    public function __construct(
        private MultiSourceRAGService $rag
    ) {}

    /**
     * Answer a question using multi-source RAG.
     */
    public function answer(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'question' => 'required|string|max:500',
            'sources' => 'sometimes|array',
            'sources.*' => 'string|in:vector,tntsearch,eloquent,static',
            'weights' => 'sometimes|array',
        ]);

        // Configure custom weights if provided
        if (isset($validated['weights'])) {
            $this->rag->configureWeights($validated['weights']);
        }

        $options = [];

        // Filter sources if specified
        if (isset($validated['sources'])) {
            $options['sources'] = $validated['sources'];
        }

        $result = $this->rag->answer($validated['question'], $options);

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * Search across all sources without generating answer.
     */
    public function search(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'query' => 'required|string|max:500',
            'sources' => 'sometimes|array',
        ]);

        $result = $this->rag->search($validated['query'], [
            'sources' => $validated['sources'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * Get available sources and their descriptions.
     */
    public function sources(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->rag->getAvailableSources(),
        ]);
    }

    /**
     * Health check for all sources.
     */
    public function health(): JsonResponse
    {
        $health = [
            'vector' => $this->checkVectorHealth(),
            'tntsearch' => $this->checkTNTSearchHealth(),
            'eloquent' => $this->checkEloquentHealth(),
            'static' => ['status' => 'healthy'], // Always available
        ];

        $allHealthy = collect($health)->every(fn($source) => $source['status'] === 'healthy');

        return response()->json([
            'success' => true,
            'overall_status' => $allHealthy ? 'healthy' : 'degraded',
            'sources' => $health,
        ]);
    }

    private function checkVectorHealth(): array
    {
        try {
            // Try to connect to Qdrant
            app(\Qdrant\Client::class)->collections()->list();
            return ['status' => 'healthy'];
        } catch (\Exception $e) {
            return [
                'status' => 'unhealthy',
                'error' => 'Cannot connect to Qdrant',
            ];
        }
    }

    private function checkTNTSearchHealth(): array
    {
        try {
            $indexPath = storage_path('tntsearch/documentation_index.index');
            return [
                'status' => file_exists($indexPath) ? 'healthy' : 'unhealthy',
                'error' => !file_exists($indexPath) ? 'Index file not found' : null,
            ];
        } catch (\Exception $e) {
            return ['status' => 'unhealthy', 'error' => $e->getMessage()];
        }
    }

    private function checkEloquentHealth(): array
    {
        try {
            \DB::connection()->getPdo();
            return ['status' => 'healthy'];
        } catch (\Exception $e) {
            return ['status' => 'unhealthy', 'error' => 'Database connection failed'];
        }
    }
}
```

Register routes:

```php
// routes/api.php
use App\Http\Controllers\Api\MultiSourceRAGController;

Route::prefix('rag')->group(function () {
    Route::post('/answer', [MultiSourceRAGController::class, 'answer']);
    Route::post('/search', [MultiSourceRAGController::class, 'search']);
    Route::get('/sources', [MultiSourceRAGController::class, 'sources']);
    Route::get('/health', [MultiSourceRAGController::class, 'health']);
});
```

## Step 6: Source Attribution UI

Create a Vue component for displaying source attribution:

```vue
<!-- resources/js/components/MultiSourceAnswer.vue -->
<template>
    <div class="multi-source-answer">
        <!-- Answer Display -->
        <div class="answer-card">
            <div class="answer-header">
                <h3>Answer</h3>
                <span class="context-badge">
                    {{ contextUsed }} sources used
                </span>
            </div>

            <div class="answer-content" v-html="formattedAnswer"></div>
        </div>

        <!-- Source Attribution -->
        <div class="sources-section">
            <h4>Sources</h4>

            <div class="sources-grid">
                <div
                    v-for="source in sources"
                    :key="source.id"
                    class="source-card"
                    :class="`source-${source.source}`"
                >
                    <div class="source-header">
                        <span class="source-icon">
                            {{ getSourceIcon(source.source) }}
                        </span>
                        <span class="source-name">{{ source.title }}</span>
                    </div>

                    <div class="source-meta">
                        <span class="source-type">{{
                            formatSourceType(source.source)
                        }}</span>
                        <span class="source-score">
                            {{ formatScore(source.score) }}% relevant
                        </span>
                    </div>

                    <div v-if="source.category" class="source-category">
                        {{ source.category }}
                    </div>

                    <a
                        v-if="source.url"
                        :href="source.url"
                        class="source-link"
                        target="_blank"
                    >
                        View original →
                    </a>

                    <span v-if="source.truncated" class="truncated-badge">
                        Truncated
                    </span>
                </div>
            </div>
        </div>

        <!-- Pipeline Statistics -->
        <div v-if="showStats" class="stats-section">
            <h4>Pipeline Statistics</h4>

            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Sources Configured</span>
                    <span class="stat-value">{{ pipelineStats.sources }}</span>
                </div>

                <div class="stat-item">
                    <span class="stat-label">Deduplication Threshold</span>
                    <span class="stat-value">{{
                        pipelineStats.deduplication_threshold
                    }}</span>
                </div>

                <div class="stat-item">
                    <span class="stat-label">Token Budget</span>
                    <span class="stat-value">{{
                        pipelineStats.token_budget
                    }}</span>
                </div>
            </div>

            <div class="weights-section">
                <h5>Source Weights</h5>
                <div class="weights-list">
                    <div
                        v-for="(weight, source) in pipelineStats.weights"
                        :key="source"
                        class="weight-item"
                    >
                        <span class="weight-source">{{
                            formatSourceType(source)
                        }}</span>
                        <div class="weight-bar">
                            <div
                                class="weight-fill"
                                :style="{
                                    width: `${(weight / maxWeight) * 100}%`,
                                }"
                            ></div>
                        </div>
                        <span class="weight-value">{{ weight }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    answer: String,
    sources: Array,
    contextUsed: Number,
    pipelineStats: Object,
    showStats: {
        type: Boolean,
        default: false,
    },
});

const formattedAnswer = computed(() => {
    // Simple markdown to HTML conversion
    return props.answer
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
});

const maxWeight = computed(() => {
    if (!props.pipelineStats?.weights) return 1;
    return Math.max(...Object.values(props.pipelineStats.weights));
});

function getSourceIcon(source) {
    const icons = {
        vector: '🔍',
        tntsearch: '⚡',
        eloquent: '📊',
        static: '📋',
    };
    return icons[source] || '📄';
}

function formatSourceType(source) {
    const types = {
        vector: 'Vector Search',
        tntsearch: 'TNTSearch',
        eloquent: 'Database',
        static: 'FAQ',
    };
    return types[source] || source;
}

function formatScore(score) {
    return Math.round(score * 100);
}
</script>

<style scoped>
.multi-source-answer {
    max-width: 1200px;
    margin: 0 auto;
}

.answer-card {
    background: white;
    border-radius: 8px;
    padding: 24px;
    margin-bottom: 24px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.answer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.context-badge {
    background: #e3f2fd;
    color: #1976d2;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 14px;
}

.answer-content {
    line-height: 1.6;
    color: #333;
}

.sources-section {
    margin-bottom: 24px;
}

.sources-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
    margin-top: 16px;
}

.source-card {
    background: white;
    border-radius: 8px;
    padding: 16px;
    border-left: 4px solid #ccc;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.source-card.source-vector {
    border-left-color: #4caf50;
}

.source-card.source-tntsearch {
    border-left-color: #ff9800;
}

.source-card.source-eloquent {
    border-left-color: #2196f3;
}

.source-card.source-static {
    border-left-color: #9c27b0;
}

.source-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.source-icon {
    font-size: 20px;
}

.source-name {
    font-weight: 600;
    color: #333;
}

.source-meta {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    color: #666;
    margin-bottom: 8px;
}

.source-score {
    font-weight: 500;
    color: #4caf50;
}

.source-category {
    display: inline-block;
    background: #f5f5f5;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    color: #666;
    margin-bottom: 8px;
}

.source-link {
    display: inline-block;
    color: #1976d2;
    text-decoration: none;
    font-size: 14px;
    margin-top: 8px;
}

.source-link:hover {
    text-decoration: underline;
}

.truncated-badge {
    display: inline-block;
    background: #fff3cd;
    color: #856404;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    margin-top: 8px;
}

.stats-section {
    background: white;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin: 16px 0;
}

.stat-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.stat-label {
    font-size: 14px;
    color: #666;
}

.stat-value {
    font-size: 24px;
    font-weight: 600;
    color: #333;
}

.weights-section {
    margin-top: 24px;
}

.weights-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 12px;
}

.weight-item {
    display: grid;
    grid-template-columns: 120px 1fr 50px;
    align-items: center;
    gap: 12px;
}

.weight-source {
    font-size: 14px;
    color: #666;
}

.weight-bar {
    height: 8px;
    background: #f5f5f5;
    border-radius: 4px;
    overflow: hidden;
}

.weight-fill {
    height: 100%;
    background: linear-gradient(90deg, #4caf50, #2196f3);
    transition: width 0.3s ease;
}

.weight-value {
    text-align: right;
    font-weight: 600;
    color: #333;
}
</style>
```

Usage example:

```javascript
// Example usage in your main component
import MultiSourceAnswer from './components/MultiSourceAnswer.vue';

async function askQuestion() {
    const response = await fetch('/api/rag/answer', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            question: 'How do I return a product?',
        }),
    });

    const data = await response.json();

    // Pass to component
    return {
        answer: data.data.answer,
        sources: data.data.sources,
        contextUsed: data.data.context_used,
        pipelineStats: data.data.pipeline_stats,
    };
}
```

## Testing

### Unit Tests for Pipeline

```php
// tests/Unit/MultiSourceContextPipelineTest.php
namespace Tests\Unit;

use Tests\TestCase;
use App\Services\Context\MultiSourceContextPipeline;
use Mindwave\Mindwave\Context\Contracts\ContextSource;
use Mockery;

class MultiSourceContextPipelineTest extends TestCase
{
    public function test_can_add_sources()
    {
        $pipeline = new MultiSourceContextPipeline();

        $source1 = Mockery::mock(ContextSource::class);
        $source1->shouldReceive('name')->andReturn('source1');

        $source2 = Mockery::mock(ContextSource::class);
        $source2->shouldReceive('name')->andReturn('source2');

        $pipeline
            ->addSource($source1, 1.0)
            ->addSource($source2, 1.5);

        $stats = $pipeline->getStats();

        $this->assertEquals(2, $stats['sources']);
        $this->assertEquals(['source1' => 1.0, 'source2' => 1.5], $stats['weights']);
    }

    public function test_deduplicates_similar_results()
    {
        $pipeline = new MultiSourceContextPipeline();

        $source = Mockery::mock(ContextSource::class);
        $source->shouldReceive('name')->andReturn('test');
        $source->shouldReceive('retrieve')->andReturn([
            [
                'content' => 'Test content',
                'score' => 0.9,
                'metadata' => ['title' => 'Test'],
            ],
            [
                'content' => 'Test content', // Duplicate
                'score' => 0.8,
                'metadata' => ['title' => 'Test 2'],
            ],
            [
                'content' => 'Different content',
                'score' => 0.7,
                'metadata' => ['title' => 'Test 3'],
            ],
        ]);

        $pipeline->addSource($source, 1.0);

        $results = $pipeline->retrieve('test query');

        // Should have 2 results (duplicate removed)
        $this->assertEquals(2, count($results));
    }

    public function test_respects_token_budget()
    {
        $pipeline = new MultiSourceContextPipeline(tokenBudget: 100);

        $source = Mockery::mock(ContextSource::class);
        $source->shouldReceive('name')->andReturn('test');
        $source->shouldReceive('retrieve')->andReturn([
            [
                'content' => str_repeat('word ', 200), // ~800 characters
                'score' => 1.0,
                'metadata' => ['title' => 'Large'],
            ],
            [
                'content' => 'Small content',
                'score' => 0.9,
                'metadata' => ['title' => 'Small'],
            ],
        ]);

        $pipeline->addSource($source, 1.0);

        $results = $pipeline->retrieve('test');

        // Should fit to budget
        $this->assertLessThanOrEqual(100, $this->estimateTokens($results));
    }

    public function test_handles_source_failures_gracefully()
    {
        $pipeline = new MultiSourceContextPipeline();

        $failingSource = Mockery::mock(ContextSource::class);
        $failingSource->shouldReceive('name')->andReturn('failing');
        $failingSource->shouldReceive('retrieve')->andThrow(new \Exception('Source failed'));

        $workingSource = Mockery::mock(ContextSource::class);
        $workingSource->shouldReceive('name')->andReturn('working');
        $workingSource->shouldReceive('retrieve')->andReturn([
            ['content' => 'Test', 'score' => 1.0, 'metadata' => ['title' => 'Test']],
        ]);

        $pipeline
            ->addSource($failingSource, 1.0)
            ->addSource($workingSource, 1.0);

        $results = $pipeline->retrieve('test');

        // Should still get results from working source
        $this->assertCount(1, $results);
    }

    private function estimateTokens(array $results): int
    {
        $totalChars = array_sum(array_map(
            fn($r) => strlen($r['content']),
            $results
        ));

        return (int) ceil($totalChars / 4);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}
```

### Feature Tests for API

```php
// tests/Feature/MultiSourceRAGApiTest.php
namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\CompanyPolicy;
use App\Models\Documentation;

class MultiSourceRAGApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed test data
        $this->seedTestData();
    }

    public function test_can_answer_questions()
    {
        $response = $this->postJson('/api/rag/answer', [
            'question' => 'How do I return a product?',
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'answer',
                    'sources',
                    'context_used',
                    'pipeline_stats',
                ],
            ]);

        $this->assertNotEmpty($response->json('data.answer'));
        $this->assertGreaterThan(0, $response->json('data.context_used'));
    }

    public function test_can_search_without_generating_answer()
    {
        $response = $this->postJson('/api/rag/search', [
            'query' => 'shipping policy',
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'results',
                    'total',
                    'sources_used',
                ],
            ]);
    }

    public function test_can_filter_by_sources()
    {
        $response = $this->postJson('/api/rag/answer', [
            'question' => 'What is the return policy?',
            'sources' => ['static', 'eloquent'],
        ]);

        $response->assertOk();

        $sources = collect($response->json('data.sources'))
            ->pluck('source')
            ->unique()
            ->toArray();

        // Should only use specified sources
        $this->assertCount(2, array_intersect($sources, ['static', 'eloquent']));
    }

    public function test_can_configure_custom_weights()
    {
        $response = $this->postJson('/api/rag/answer', [
            'question' => 'shipping information',
            'weights' => [
                'vector' => 2.0,
                'tntsearch' => 1.0,
                'eloquent' => 0.5,
                'static' => 0.5,
            ],
        ]);

        $response->assertOk();

        $stats = $response->json('data.pipeline_stats');
        $this->assertEquals(2.0, $stats['weights']['vector']);
    }

    public function test_can_get_available_sources()
    {
        $response = $this->getJson('/api/rag/sources');

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'vector',
                    'tntsearch',
                    'eloquent',
                    'static',
                ],
            ]);
    }

    public function test_health_check_returns_status()
    {
        $response = $this->getJson('/api/rag/health');

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'overall_status',
                'sources' => [
                    'vector',
                    'tntsearch',
                    'eloquent',
                    'static',
                ],
            ]);
    }

    public function test_validates_question_input()
    {
        $response = $this->postJson('/api/rag/answer', [
            'question' => '', // Empty question
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['question']);
    }

    public function test_validates_source_filter()
    {
        $response = $this->postJson('/api/rag/answer', [
            'question' => 'test',
            'sources' => ['invalid_source'], // Invalid source
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['sources.0']);
    }

    private function seedTestData(): void
    {
        // Seed policies
        CompanyPolicy::create([
            'category' => 'returns',
            'title' => 'Return Policy',
            'content' => 'Products can be returned within 30 days.',
            'tags' => ['returns', 'refunds'],
            'effective_date' => now(),
        ]);

        // Seed documentation
        Documentation::create([
            'title' => 'Shipping Guide',
            'slug' => 'shipping-guide',
            'content' => 'Standard shipping takes 5-7 business days.',
            'category' => 'shipping',
            'tags' => ['shipping', 'delivery'],
        ]);
    }
}
```

### Testing Individual Sources

```php
// tests/Unit/Sources/VectorContextSourceTest.php
namespace Tests\Unit\Sources;

use Tests\TestCase;
use App\Services\Context\VectorContextSource;
use Mindwave\Mindwave\Embeddings\EmbeddingGenerator;
use Qdrant\Client;
use Mockery;

class VectorContextSourceTest extends TestCase
{
    public function test_retrieves_relevant_results()
    {
        $embeddings = Mockery::mock(EmbeddingGenerator::class);
        $embeddings->shouldReceive('embed')
            ->andReturn(array_fill(0, 384, 0.1));

        $qdrant = Mockery::mock(Client::class);
        // Mock Qdrant response...

        $source = new VectorContextSource($embeddings, $qdrant, limit: 5);

        $results = $source->retrieve('test query');

        $this->assertIsArray($results);
        $this->assertLessThanOrEqual(5, count($results));
    }

    public function test_filters_by_score_threshold()
    {
        $embeddings = Mockery::mock(EmbeddingGenerator::class);
        $embeddings->shouldReceive('embed')
            ->andReturn(array_fill(0, 384, 0.1));

        $qdrant = Mockery::mock(Client::class);
        // Mock low-score results...

        $source = new VectorContextSource(
            $embeddings,
            $qdrant,
            scoreThreshold: 0.8
        );

        $results = $source->retrieve('test');

        // Should filter out low scores
        foreach ($results as $result) {
            $this->assertGreaterThanOrEqual(0.8, $result['score']);
        }
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}
```

## Advanced Patterns

### Weighted Source Priorities

Adjust source weights based on query type:

```php
// app/Services/Context/AdaptiveWeightingStrategy.php
namespace App\Services\Context;

class AdaptiveWeightingStrategy
{
    /**
     * Calculate dynamic weights based on query characteristics.
     */
    public function calculateWeights(string $query): array
    {
        $weights = [
            'vector' => 1.0,
            'tntsearch' => 1.0,
            'eloquent' => 1.0,
            'static' => 1.0,
        ];

        // Boost vector for natural language questions
        if ($this->isNaturalLanguageQuery($query)) {
            $weights['vector'] *= 1.5;
        }

        // Boost TNTSearch for technical queries
        if ($this->hasTechnicalTerms($query)) {
            $weights['tntsearch'] *= 1.3;
        }

        // Boost database for policy questions
        if ($this->isPolicyQuery($query)) {
            $weights['eloquent'] *= 1.4;
        }

        // Boost static for common questions
        if ($this->isCommonQuestion($query)) {
            $weights['static'] *= 1.2;
        }

        return $weights;
    }

    private function isNaturalLanguageQuery(string $query): bool
    {
        // Check for question words
        $questionWords = ['how', 'what', 'why', 'when', 'where', 'can', 'should'];
        $query = strtolower($query);

        foreach ($questionWords as $word) {
            if (str_starts_with($query, $word)) {
                return true;
            }
        }

        return false;
    }

    private function hasTechnicalTerms(string $query): bool
    {
        $technicalPatterns = [
            '/\b[A-Z]{2,}\b/', // Acronyms
            '/\b\d{3,}\b/', // Product codes
            '/\bv\d+\.\d+\b/', // Version numbers
        ];

        foreach ($technicalPatterns as $pattern) {
            if (preg_match($pattern, $query)) {
                return true;
            }
        }

        return false;
    }

    private function isPolicyQuery(string $query): bool
    {
        $policyKeywords = ['policy', 'procedure', 'rule', 'regulation', 'terms', 'condition'];
        $query = strtolower($query);

        foreach ($policyKeywords as $keyword) {
            if (str_contains($query, $keyword)) {
                return true;
            }
        }

        return false;
    }

    private function isCommonQuestion(string $query): bool
    {
        $commonPhrases = [
            'how do i',
            'how can i',
            'where is',
            'what is',
            'can i',
        ];

        $query = strtolower($query);

        foreach ($commonPhrases as $phrase) {
            if (str_contains($query, $phrase)) {
                return true;
            }
        }

        return false;
    }
}
```

Usage:

```php
$strategy = new AdaptiveWeightingStrategy();
$weights = $strategy->calculateWeights($question);
$rag->configureWeights($weights);
```

### Fallback Strategies

Implement intelligent fallbacks when primary sources fail:

```php
// app/Services/Context/FallbackPipeline.php
namespace App\Services\Context;

use App\Services\Context\MultiSourceContextPipeline;

class FallbackPipeline extends MultiSourceContextPipeline
{
    private array $fallbackChain = [];
    private int $minimumResults = 3;

    /**
     * Define fallback chain.
     */
    public function defineFallbackChain(array $chain): self
    {
        $this->fallbackChain = $chain;
        return $this;
    }

    /**
     * Set minimum results threshold.
     */
    public function setMinimumResults(int $min): self
    {
        $this->minimumResults = $min;
        return $this;
    }

    /**
     * Retrieve with fallback logic.
     */
    public function retrieve(string $query, array $options = []): array
    {
        $results = parent::retrieve($query, $options);

        // If we have enough results, return them
        if (count($results) >= $this->minimumResults) {
            return $results;
        }

        // Try fallback strategies
        foreach ($this->fallbackChain as $fallback) {
            $fallbackResults = $this->executeFallback($fallback, $query, $options);

            $results = array_merge($results, $fallbackResults);

            if (count($results) >= $this->minimumResults) {
                break;
            }
        }

        return $results;
    }

    private function executeFallback(string $strategy, string $query, array $options): array
    {
        return match($strategy) {
            'expand_query' => $this->expandQueryFallback($query, $options),
            'relax_threshold' => $this->relaxThresholdFallback($query, $options),
            'category_search' => $this->categorySearchFallback($query, $options),
            'default_content' => $this->defaultContentFallback($query, $options),
            default => [],
        };
    }

    private function expandQueryFallback(string $query, array $options): array
    {
        // Extract keywords and search with each
        $keywords = $this->extractKeywords($query);
        $results = [];

        foreach ($keywords as $keyword) {
            $keywordResults = parent::retrieve($keyword, $options);
            $results = array_merge($results, $keywordResults);
        }

        return $results;
    }

    private function relaxThresholdFallback(string $query, array $options): array
    {
        // Temporarily lower score thresholds
        $originalThreshold = $this->deduplicationThreshold;
        $this->setDeduplicationThreshold(0.6);

        $results = parent::retrieve($query, $options);

        $this->setDeduplicationThreshold($originalThreshold);

        return $results;
    }

    private function categorySearchFallback(string $query, array $options): array
    {
        // Infer category and search within it
        $category = $this->inferCategory($query);

        if ($category) {
            $options['category'] = $category;
            return parent::retrieve($query, $options);
        }

        return [];
    }

    private function defaultContentFallback(string $query, array $options): array
    {
        // Return generic helpful content
        return [
            [
                'content' => 'For additional help, please contact our support team at support@example.com or call 1-800-SUPPORT.',
                'metadata' => [
                    'source' => 'fallback',
                    'title' => 'Contact Support',
                ],
                'score' => 0.5,
            ],
        ];
    }

    private function extractKeywords(string $query): array
    {
        // Simple keyword extraction
        $stopWords = ['how', 'what', 'when', 'where', 'why', 'is', 'the', 'a', 'an'];
        $words = str_word_count(strtolower($query), 1);

        return array_values(array_diff($words, $stopWords));
    }

    private function inferCategory(string $query): ?string
    {
        $categories = [
            'shipping' => ['ship', 'delivery', 'track', 'package'],
            'returns' => ['return', 'refund', 'exchange'],
            'billing' => ['payment', 'charge', 'invoice', 'billing'],
            'account' => ['password', 'login', 'account', 'profile'],
        ];

        $query = strtolower($query);

        foreach ($categories as $category => $keywords) {
            foreach ($keywords as $keyword) {
                if (str_contains($query, $keyword)) {
                    return $category;
                }
            }
        }

        return null;
    }
}
```

### Query Expansion Across Sources

Expand queries to improve recall:

```php
// app/Services/Context/QueryExpander.php
namespace App\Services\Context;

use Mindwave\Mindwave\Completions\CompletionService;

class QueryExpander
{
    public function __construct(
        private CompletionService $completions
    ) {}

    /**
     * Expand query with synonyms and related terms.
     */
    public function expand(string $query): array
    {
        $prompt = <<<PROMPT
Given the search query: "{$query}"

Generate 3-5 related queries that would help find relevant information.
Include:
- Synonyms
- Related questions
- Alternative phrasings

Return only the queries, one per line.
PROMPT;

        $response = $this->completions->create([
            'model' => 'gpt-3.5-turbo',
            'messages' => [
                ['role' => 'user', 'content' => $prompt],
            ],
            'temperature' => 0.7,
            'max_tokens' => 150,
        ]);

        $expanded = explode("\n", trim($response['choices'][0]['message']['content']));

        return array_merge([$query], array_filter($expanded));
    }

    /**
     * Extract key entities from query.
     */
    public function extractEntities(string $query): array
    {
        // Simple entity extraction (can be enhanced with NER)
        $entities = [
            'products' => [],
            'actions' => [],
            'topics' => [],
        ];

        // Extract product codes
        if (preg_match_all('/\b[A-Z]{2,}\d+\b/', $query, $matches)) {
            $entities['products'] = $matches[0];
        }

        // Extract action verbs
        $actionVerbs = ['return', 'ship', 'track', 'cancel', 'refund', 'exchange'];
        foreach ($actionVerbs as $verb) {
            if (str_contains(strtolower($query), $verb)) {
                $entities['actions'][] = $verb;
            }
        }

        return $entities;
    }
}
```

### Re-ranking with LLM

Use an LLM to re-rank results based on relevance:

```php
// app/Services/Context/LLMReranker.php
namespace App\Services\Context;

use Mindwave\Mindwave\Completions\CompletionService;

class LLMReranker
{
    public function __construct(
        private CompletionService $completions
    ) {}

    /**
     * Re-rank results using LLM.
     */
    public function rerank(string $query, array $results): array
    {
        if (count($results) <= 1) {
            return $results;
        }

        $rankedIndices = $this->getLLMRanking($query, $results);

        return array_map(
            fn($index) => $results[$index],
            $rankedIndices
        );
    }

    private function getLLMRanking(string $query, array $results): array
    {
        $contextsText = '';
        foreach ($results as $i => $result) {
            $contextsText .= "[{$i}] {$result['content']}\n\n";
        }

        $prompt = <<<PROMPT
Query: {$query}

Rank the following contexts by relevance to the query.
Return only the indices in order of relevance (most relevant first).

Contexts:
{$contextsText}

Return format: 0,2,1,3 (comma-separated indices)
PROMPT;

        $response = $this->completions->create([
            'model' => 'gpt-3.5-turbo',
            'messages' => [
                ['role' => 'user', 'content' => $prompt],
            ],
            'temperature' => 0.3,
            'max_tokens' => 50,
        ]);

        $rankingText = $response['choices'][0]['message']['content'];
        $indices = array_map('intval', explode(',', trim($rankingText)));

        // Validate indices
        $validIndices = array_filter($indices, fn($i) => isset($results[$i]));

        // Add any missing indices
        $missing = array_diff(array_keys($results), $validIndices);

        return array_merge($validIndices, $missing);
    }
}
```

## Production Considerations

### Source Performance Tuning

Optimize each source for production:

```php
// config/multisource-rag.php
return [
    'sources' => [
        'vector' => [
            'enabled' => env('RAG_VECTOR_ENABLED', true),
            'limit' => env('RAG_VECTOR_LIMIT', 5),
            'score_threshold' => env('RAG_VECTOR_THRESHOLD', 0.7),
            'timeout' => env('RAG_VECTOR_TIMEOUT', 3), // seconds
        ],

        'tntsearch' => [
            'enabled' => env('RAG_TNT_ENABLED', true),
            'limit' => env('RAG_TNT_LIMIT', 5),
            'fuzziness' => env('RAG_TNT_FUZZINESS', true),
            'timeout' => env('RAG_TNT_TIMEOUT', 1),
        ],

        'eloquent' => [
            'enabled' => env('RAG_ELOQUENT_ENABLED', true),
            'limit' => env('RAG_ELOQUENT_LIMIT', 5),
            'timeout' => env('RAG_ELOQUENT_TIMEOUT', 2),
        ],

        'static' => [
            'enabled' => env('RAG_STATIC_ENABLED', true),
            'cache_ttl' => env('RAG_STATIC_CACHE_TTL', 3600),
        ],
    ],

    'pipeline' => [
        'token_budget' => env('RAG_TOKEN_BUDGET', 2000),
        'max_results' => env('RAG_MAX_RESULTS', 8),
        'deduplication_threshold' => env('RAG_DEDUP_THRESHOLD', 0.85),
        'parallel_execution' => env('RAG_PARALLEL', true),
    ],
];
```

### Caching Strategies Per Source

Implement intelligent caching:

```php
// app/Services/Context/CachedMultiSourcePipeline.php
namespace App\Services\Context;

use Illuminate\Support\Facades\Cache;

class CachedMultiSourcePipeline extends MultiSourceContextPipeline
{
    private array $cacheTTL = [
        'vector' => 3600,      // 1 hour (embeddings rarely change)
        'tntsearch' => 1800,   // 30 minutes (indexed content)
        'eloquent' => 300,     // 5 minutes (database content)
        'static' => 86400,     // 24 hours (static content)
    ];

    public function retrieve(string $query, array $options = []): array
    {
        $cacheKey = $this->generateCacheKey($query, $options);

        return Cache::remember($cacheKey, 300, function () use ($query, $options) {
            return parent::retrieve($query, $options);
        });
    }

    protected function retrieveFromAllSources(string $query, array $options): array
    {
        $allResults = [];

        foreach ($this->sources as $sourceConfig) {
            $source = $sourceConfig['source'];
            $sourceName = $source->name();

            $cacheKey = "rag:source:{$sourceName}:" . md5($query . json_encode($options));
            $ttl = $this->cacheTTL[$sourceName] ?? 300;

            try {
                $results = Cache::remember($cacheKey, $ttl, function () use ($source, $query, $options) {
                    return $source->retrieve($query, $options);
                });

                foreach ($results as $result) {
                    $allResults[] = array_merge($result, [
                        'source_name' => $sourceName,
                        'source_weight' => $sourceConfig['weight'],
                        'from_cache' => Cache::has($cacheKey),
                    ]);
                }
            } catch (\Exception $e) {
                logger()->error("Source {$sourceName} failed", [
                    'error' => $e->getMessage(),
                    'query' => $query,
                ]);
            }
        }

        return $allResults;
    }

    private function generateCacheKey(string $query, array $options): string
    {
        return 'rag:pipeline:' . md5($query . json_encode($options));
    }
}
```

### Cost Optimization

Balance quality and cost:

```php
// app/Services/Context/CostOptimizedPipeline.php
namespace App\Services\Context;

class CostOptimizedPipeline extends MultiSourceContextPipeline
{
    private array $sourceCosts = [
        'vector' => 0.001,     // Per query (embedding cost)
        'tntsearch' => 0.0001, // Minimal
        'eloquent' => 0.0002,  // Database query cost
        'static' => 0.0,       // Free
    ];

    private float $maxCostPerQuery = 0.01;

    /**
     * Retrieve with cost optimization.
     */
    public function retrieve(string $query, array $options = []): array
    {
        $costBudget = $options['cost_budget'] ?? $this->maxCostPerQuery;

        // Try cheap sources first
        $cheapSources = $this->getSortedSourcesByCost();
        $results = [];
        $costUsed = 0.0;

        foreach ($cheapSources as $sourceConfig) {
            $source = $sourceConfig['source'];
            $cost = $this->sourceCosts[$source->name()] ?? 0;

            if ($costUsed + $cost <= $costBudget) {
                try {
                    $sourceResults = $source->retrieve($query, $options);
                    $results = array_merge($results, $sourceResults);
                    $costUsed += $cost;
                } catch (\Exception $e) {
                    logger()->error("Source failed", ['source' => $source->name()]);
                }
            }
        }

        // Process results through pipeline
        $normalized = $this->normalizeScores($results);
        $deduplicated = $this->deduplicateResults($normalized);
        $ranked = $this->reRankResults($deduplicated);

        return array_slice($ranked, 0, $this->maxResults);
    }

    private function getSortedSourcesByCost(): array
    {
        $sources = $this->sources;

        usort($sources, function ($a, $b) {
            $costA = $this->sourceCosts[$a['source']->name()] ?? PHP_FLOAT_MAX;
            $costB = $this->sourceCosts[$b['source']->name()] ?? PHP_FLOAT_MAX;

            return $costA <=> $costB;
        });

        return $sources;
    }
}
```

### Monitoring Source Quality

Track performance metrics:

```php
// app/Services/Context/MonitoredPipeline.php
namespace App\Services\Context;

use Illuminate\Support\Facades\Log;

class MonitoredPipeline extends MultiSourceContextPipeline
{
    private array $metrics = [];

    public function retrieve(string $query, array $options = []): array
    {
        $startTime = microtime(true);

        $results = parent::retrieve($query, $options);

        $duration = microtime(true) - $startTime;

        $this->recordMetrics($query, $results, $duration);

        return $results;
    }

    protected function retrieveFromAllSources(string $query, array $options): array
    {
        $allResults = [];

        foreach ($this->sources as $sourceConfig) {
            $source = $sourceConfig['source'];
            $sourceName = $source->name();

            $startTime = microtime(true);

            try {
                $results = $source->retrieve($query, $options);
                $duration = microtime(true) - $startTime;

                $this->metrics[$sourceName] = [
                    'results_count' => count($results),
                    'duration' => $duration,
                    'status' => 'success',
                ];

                foreach ($results as $result) {
                    $allResults[] = array_merge($result, [
                        'source_name' => $sourceName,
                        'source_weight' => $sourceConfig['weight'],
                    ]);
                }
            } catch (\Exception $e) {
                $duration = microtime(true) - $startTime;

                $this->metrics[$sourceName] = [
                    'results_count' => 0,
                    'duration' => $duration,
                    'status' => 'failed',
                    'error' => $e->getMessage(),
                ];

                logger()->error("Source {$sourceName} failed", [
                    'error' => $e->getMessage(),
                    'query' => $query,
                ]);
            }
        }

        return $allResults;
    }

    private function recordMetrics(string $query, array $results, float $duration): void
    {
        Log::info('RAG Pipeline Execution', [
            'query' => $query,
            'total_duration' => $duration,
            'results_count' => count($results),
            'source_metrics' => $this->metrics,
            'sources_used' => array_unique(array_column($results, 'source_name')),
        ]);

        // Send to monitoring service
        $this->sendToMonitoring([
            'pipeline_duration' => $duration,
            'results_count' => count($results),
            'sources' => $this->metrics,
        ]);
    }

    private function sendToMonitoring(array $metrics): void
    {
        // Integration with monitoring services
        // e.g., DataDog, New Relic, CloudWatch
    }

    public function getMetrics(): array
    {
        return $this->metrics;
    }
}
```

### Scaling Considerations

Strategies for scaling multi-source RAG:

1. **Horizontal Scaling**

    - Deploy multiple pipeline instances
    - Load balance requests
    - Share cache layer (Redis)

2. **Source Optimization**

    - Index partitioning for TNTSearch
    - Vector index sharding for large datasets
    - Database read replicas for Eloquent

3. **Async Processing**

    ```php
    // Process sources in parallel
    use Illuminate\Support\Facades\Parallel;

    $results = Parallel::run([
        fn() => $vectorSource->retrieve($query),
        fn() => $tntSource->retrieve($query),
        fn() => $eloquentSource->retrieve($query),
        fn() => $staticSource->retrieve($query),
    ]);
    ```

4. **Circuit Breakers**

    ```php
    // Fail fast on source failures
    class CircuitBreakerSource implements ContextSource
    {
        private int $failureCount = 0;
        private int $threshold = 5;
        private bool $open = false;

        public function retrieve(string $query, array $options = []): array
        {
            if ($this->open) {
                throw new \Exception('Circuit breaker open');
            }

            try {
                $results = $this->source->retrieve($query, $options);
                $this->failureCount = 0;
                return $results;
            } catch (\Exception $e) {
                $this->failureCount++;

                if ($this->failureCount >= $this->threshold) {
                    $this->open = true;
                }

                throw $e;
            }
        }
    }
    ```

## Summary

You've built a production-ready multi-source RAG system that:

1. **Combines Four Source Types**: TNTSearch (BM25), Vector (semantic), Eloquent (database), and Static (FAQ)
2. **Intelligent Orchestration**: Pipeline with deduplication, ranking, and token management
3. **Flexible Configuration**: Dynamic weights, source selection, and fallback strategies
4. **Production Ready**: Caching, monitoring, cost optimization, and scaling patterns
5. **Observable**: Source attribution, confidence scores, and performance metrics

This hybrid approach gives you the best of all worlds:

-   Fast keyword matching from TNTSearch
-   Semantic understanding from vectors
-   Real-time data from database
-   Instant answers from static content

The system intelligently combines results, removes duplicates, ranks by relevance, and fits everything into your token budget while maintaining full transparency about which sources contributed to each answer.
