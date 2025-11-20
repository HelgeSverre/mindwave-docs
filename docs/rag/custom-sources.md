# Custom Context Sources

Build custom context sources to integrate any data source into Mindwave's RAG system. This guide shows you how to implement the `ContextSource` interface to retrieve context from APIs, databases, custom search engines, or any other data source.

## Overview

While Mindwave provides built-in sources (VectorStoreSource, TntSearchSource, EloquentSource, StaticSource), you can create custom sources to integrate specialized data retrieval logic into your RAG pipeline.

### What is a Context Source?

A Context Source is any class that implements the `ContextSource` interface and can:

1. **Search** - Retrieve relevant items based on a query
2. **Name** - Provide a unique identifier for tracking
3. **Initialize** - Set up resources (indexes, connections)
4. **Cleanup** - Release resources when done

### When to Build a Custom Source

**Build a custom source when:**
- You need to integrate a proprietary search system
- Your data comes from external APIs
- You have complex filtering/ranking logic
- Built-in sources don't fit your use case
- You need custom caching or optimization

**Use built-in sources when:**
- Simple database queries (use EloquentSource)
- Full-text search (use TntSearchSource)
- Semantic search (use VectorStoreSource)
- Static content (use StaticSource)

## The ContextSource Interface

All context sources must implement this interface:

```php
namespace Mindwave\Mindwave\Context\Contracts;

use Mindwave\Mindwave\Context\ContextCollection;

interface ContextSource
{
    /**
     * Search for relevant context items
     */
    public function search(string $query, int $limit = 5): ContextCollection;

    /**
     * Get the source name (for tracking and debugging)
     */
    public function getName(): string;

    /**
     * Initialize the source (e.g., build indexes, connect to services)
     * Called automatically before search if not already initialized
     */
    public function initialize(): void;

    /**
     * Clean up resources (e.g., delete temporary indexes, close connections)
     * Should be called when source is no longer needed
     */
    public function cleanup(): void;
}
```

### ContextItem Structure

Search results are returned as `ContextItem` objects:

```php
use Mindwave\Mindwave\Context\ContextItem;

$item = new ContextItem(
    content: 'The retrieved text content',
    score: 0.95,                    // Relevance score (0.0 - 1.0)
    source: 'my-custom-source',     // Source identifier
    metadata: [                     // Optional metadata
        'id' => 123,
        'title' => 'Document Title',
        'url' => 'https://example.com/doc',
    ]
);
```

### ContextCollection

Multiple items are returned as a `ContextCollection`:

```php
use Mindwave\Mindwave\Context\ContextCollection;

$collection = new ContextCollection([
    new ContextItem('First result', 0.95, 'source'),
    new ContextItem('Second result', 0.85, 'source'),
    new ContextItem('Third result', 0.75, 'source'),
]);

// Collections support Laravel Collection methods
$filtered = $collection->filter(fn($item) => $item->score > 0.8);
$sorted = $collection->sortByDesc('score');
$top3 = $collection->take(3);
```

## Creating a Basic Custom Source

### Step 1: Implement the Interface

Create a class that implements `ContextSource`:

```php
<?php

namespace App\Context\Sources;

use Mindwave\Mindwave\Context\Contracts\ContextSource;
use Mindwave\Mindwave\Context\ContextCollection;
use Mindwave\Mindwave\Context\ContextItem;

class MyCustomSource implements ContextSource
{
    public function __construct(
        private string $name = 'my-custom-source'
    ) {}

    public function search(string $query, int $limit = 5): ContextCollection
    {
        // Your custom search logic here
        $results = $this->performSearch($query, $limit);

        // Convert to ContextItem objects
        $items = collect($results)->map(function ($result) {
            return new ContextItem(
                content: $result['content'],
                score: $result['score'],
                source: $this->name,
                metadata: $result['metadata'] ?? []
            );
        });

        return new ContextCollection($items->all());
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function initialize(): void
    {
        // Initialize resources (e.g., connect to database, build indexes)
        // Called automatically before first search
    }

    public function cleanup(): void
    {
        // Clean up resources (e.g., close connections, delete temp files)
        // Called when source is no longer needed
    }

    private function performSearch(string $query, int $limit): array
    {
        // Implement your search logic
        return [];
    }
}
```

### Step 2: Use in Context Pipeline

```php
use Mindwave\Mindwave\Context\ContextPipeline;
use App\Context\Sources\MyCustomSource;

$customSource = new MyCustomSource('my-source');

$pipeline = (new ContextPipeline)
    ->addSource($customSource)
    ->deduplicate(true)
    ->rerank(true);

$results = $pipeline->search('user query', limit: 10);
```

### Step 3: Use with PromptComposer

```php
use Mindwave\Mindwave\Facades\Mindwave;

$response = Mindwave::prompt()
    ->section('system', 'You are a helpful assistant.')
    ->context($customSource, query: 'search query', limit: 5)
    ->section('user', 'User question here')
    ->run();
```

## Real-World Examples

### Example 1: REST API Source

Retrieve context from an external API:

```php
<?php

namespace App\Context\Sources;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Mindwave\Mindwave\Context\Contracts\ContextSource;
use Mindwave\Mindwave\Context\ContextCollection;
use Mindwave\Mindwave\Context\ContextItem;

class RestApiSource implements ContextSource
{
    public function __construct(
        private string $apiUrl,
        private string $apiKey,
        private string $name = 'rest-api-source',
        private int $cacheTTL = 3600
    ) {}

    public function search(string $query, int $limit = 5): ContextCollection
    {
        $cacheKey = "api:search:" . md5($query) . ":{$limit}";

        $results = Cache::remember($cacheKey, $this->cacheTTL, function () use ($query, $limit) {
            return $this->fetchFromApi($query, $limit);
        });

        $items = collect($results)->map(function ($result) {
            return new ContextItem(
                content: $result['text'],
                score: $result['relevance'] ?? 0.5,
                source: $this->name,
                metadata: [
                    'id' => $result['id'],
                    'title' => $result['title'] ?? '',
                    'url' => $result['url'] ?? '',
                    'published_at' => $result['published_at'] ?? null,
                ]
            );
        });

        return new ContextCollection($items->all());
    }

    public function getName(): string
    {
        return $this->name;
    }

    private function fetchFromApi(string $query, int $limit): array
    {
        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'Authorization' => "Bearer {$this->apiKey}",
                    'Accept' => 'application/json',
                ])
                ->get($this->apiUrl, [
                    'q' => $query,
                    'limit' => $limit,
                ]);

            if ($response->successful()) {
                return $response->json('data', []);
            }

            \Log::warning("API search failed", [
                'status' => $response->status(),
                'query' => $query,
            ]);

            return [];
        } catch (\Exception $e) {
            \Log::error("API search error", [
                'error' => $e->getMessage(),
                'query' => $query,
            ]);

            return [];
        }
    }
}
```

**Usage:**

```php
use App\Context\Sources\RestApiSource;

$apiSource = new RestApiSource(
    apiUrl: 'https://api.example.com/search',
    apiKey: env('EXTERNAL_API_KEY'),
    name: 'external-knowledge-base',
    cacheTTL: 1800  // 30 minutes
);

$response = Mindwave::prompt()
    ->context($apiSource, query: 'Laravel best practices')
    ->section('user', 'What are Laravel best practices?')
    ->run();
```

### Example 2: Database Source with Custom Filtering

Advanced database queries with complex filtering:

```php
<?php

namespace App\Context\Sources;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Mindwave\Mindwave\Context\Contracts\ContextSource;
use Mindwave\Mindwave\Context\ContextCollection;
use Mindwave\Mindwave\Context\ContextItem;

class AdvancedDatabaseSource implements ContextSource
{
    public function __construct(
        private Builder $query,
        private callable $transformer,
        private ?callable $scorer = null,
        private ?callable $filter = null,
        private string $name = 'database-source'
    ) {}

    public function search(string $query, int $limit = 5): ContextCollection
    {
        // Build base query
        $baseQuery = clone $this->query;

        // Apply custom filters if provided
        if ($this->filter) {
            $baseQuery = ($this->filter)($baseQuery, $query);
        }

        // Execute query
        $results = $baseQuery->limit($limit * 2)->get();  // Over-fetch for filtering

        // Transform and score results
        $items = $results->map(function ($model) use ($query) {
            $content = ($this->transformer)($model);
            $score = $this->scorer
                ? ($this->scorer)($model, $query)
                : $this->calculateScore($content, $query);

            return new ContextItem(
                content: $content,
                score: $score,
                source: $this->name,
                metadata: [
                    'id' => $model->id,
                    'model_type' => get_class($model),
                    'created_at' => $model->created_at?->toIso8601String(),
                ]
            );
        });

        // Sort by score and limit
        $sorted = $items->sortByDesc('score')->take($limit);

        return new ContextCollection($sorted->values()->all());
    }

    public function getName(): string
    {
        return $this->name;
    }

    private function calculateScore(string $content, string $query): float
    {
        // Simple keyword matching score
        $queryTerms = str_word_count(strtolower($query), 1);
        $contentLower = strtolower($content);

        $matches = 0;
        foreach ($queryTerms as $term) {
            if (str_contains($contentLower, $term)) {
                $matches++;
            }
        }

        return $queryTerms ? $matches / count($queryTerms) : 0.0;
    }
}
```

**Usage:**

```php
use App\Context\Sources\AdvancedDatabaseSource;
use App\Models\Article;

$articleSource = new AdvancedDatabaseSource(
    query: Article::where('status', 'published'),
    transformer: fn($article) => "{$article->title}\n\n{$article->content}",
    scorer: function ($article, $query) {
        // Custom scoring logic
        $baseScore = 0.5;

        // Boost recent articles
        if ($article->published_at > now()->subDays(7)) {
            $baseScore += 0.2;
        }

        // Boost by view count
        if ($article->views > 1000) {
            $baseScore += 0.1;
        }

        // Boost if query matches category
        if (str_contains(strtolower($article->category), strtolower($query))) {
            $baseScore += 0.2;
        }

        return min(1.0, $baseScore);
    },
    filter: function (Builder $query, string $searchQuery) {
        // Add WHERE clauses based on search query
        return $query
            ->where(function ($q) use ($searchQuery) {
                $q->where('title', 'LIKE', "%{$searchQuery}%")
                  ->orWhere('content', 'LIKE', "%{$searchQuery}%")
                  ->orWhere('tags', 'LIKE', "%{$searchQuery}%");
            })
            ->orderBy('views', 'desc');
    },
    name: 'articles-advanced'
);

$response = Mindwave::prompt()
    ->context($articleSource, query: 'Laravel authentication')
    ->section('user', 'How do I implement authentication?')
    ->run();
```

### Example 3: Elasticsearch Source

Integrate with Elasticsearch or OpenSearch:

```php
<?php

namespace App\Context\Sources;

use Elastic\Elasticsearch\Client;
use Mindwave\Mindwave\Context\Contracts\ContextSource;
use Mindwave\Mindwave\Context\ContextCollection;
use Mindwave\Mindwave\Context\ContextItem;

class ElasticsearchSource implements ContextSource
{
    public function __construct(
        private Client $client,
        private string $index,
        private array $fields = ['title', 'content'],
        private string $name = 'elasticsearch-source'
    ) {}

    public function search(string $query, int $limit = 5): ContextCollection
    {
        try {
            $response = $this->client->search([
                'index' => $this->index,
                'body' => [
                    'query' => [
                        'multi_match' => [
                            'query' => $query,
                            'fields' => $this->fields,
                            'type' => 'best_fields',
                            'operator' => 'or',
                        ]
                    ],
                    'size' => $limit,
                    '_source' => array_merge($this->fields, ['id', 'url']),
                ]
            ]);

            $hits = $response['hits']['hits'] ?? [];

            $items = collect($hits)->map(function ($hit) {
                $source = $hit['_source'];
                $content = collect($this->fields)
                    ->map(fn($field) => $source[$field] ?? '')
                    ->filter()
                    ->join("\n\n");

                return new ContextItem(
                    content: $content,
                    score: $this->normalizeScore($hit['_score'] ?? 0),
                    source: $this->name,
                    metadata: [
                        'id' => $hit['_id'],
                        'index' => $hit['_index'],
                        'url' => $source['url'] ?? null,
                    ]
                );
            });

            return new ContextCollection($items->all());
        } catch (\Exception $e) {
            \Log::error("Elasticsearch search failed", [
                'error' => $e->getMessage(),
                'query' => $query,
            ]);

            return new ContextCollection([]);
        }
    }

    public function getName(): string
    {
        return $this->name;
    }

    private function normalizeScore(float $score): float
    {
        // Normalize Elasticsearch score to 0.0-1.0 range
        // Elasticsearch scores are unbounded, so we use a sigmoid function
        return 1 / (1 + exp(-$score / 10));
    }
}
```

**Usage:**

```php
use App\Context\Sources\ElasticsearchSource;
use Elastic\Elasticsearch\ClientBuilder;

$client = ClientBuilder::create()
    ->setHosts([env('ELASTICSEARCH_HOST')])
    ->build();

$esSource = new ElasticsearchSource(
    client: $client,
    index: 'documentation',
    fields: ['title', 'content', 'description'],
    name: 'elastic-docs'
);

$pipeline = (new ContextPipeline)
    ->addSource($esSource)
    ->deduplicate(true)
    ->rerank(true);

$response = Mindwave::prompt()
    ->context($pipeline)
    ->section('user', 'Find documentation about caching')
    ->run();
```

### Example 4: Redis Cache Source

Retrieve frequently accessed data from Redis:

```php
<?php

namespace App\Context\Sources;

use Illuminate\Support\Facades\Redis;
use Mindwave\Mindwave\Context\Contracts\ContextSource;
use Mindwave\Mindwave\Context\ContextCollection;
use Mindwave\Mindwave\Context\ContextItem;

class RedisCacheSource implements ContextSource
{
    public function __construct(
        private string $keyPattern,
        private string $name = 'redis-cache-source'
    ) {}

    public function search(string $query, int $limit = 5): ContextCollection
    {
        // Find matching keys
        $keys = Redis::keys($this->keyPattern);

        $items = collect($keys)->take($limit * 2)->map(function ($key) use ($query) {
            $data = Redis::get($key);

            if (!$data) {
                return null;
            }

            $decoded = json_decode($data, true);

            if (!$decoded) {
                return null;
            }

            $content = $this->extractContent($decoded);
            $score = $this->calculateRelevance($content, $query);

            return new ContextItem(
                content: $content,
                score: $score,
                source: $this->name,
                metadata: [
                    'key' => $key,
                    'ttl' => Redis::ttl($key),
                ]
            );
        })
        ->filter()
        ->sortByDesc('score')
        ->take($limit);

        return new ContextCollection($items->values()->all());
    }

    public function getName(): string
    {
        return $this->name;
    }

    private function extractContent(array $data): string
    {
        // Convert array to searchable text
        if (isset($data['content'])) {
            return $data['content'];
        }

        return json_encode($data, JSON_PRETTY_PRINT);
    }

    private function calculateRelevance(string $content, string $query): float
    {
        $queryLower = strtolower($query);
        $contentLower = strtolower($content);

        // Simple substring match scoring
        return str_contains($contentLower, $queryLower) ? 1.0 : 0.0;
    }
}
```

**Usage:**

```php
use App\Context\Sources\RedisCacheSource;

$cacheSource = new RedisCacheSource(
    keyPattern: 'faq:*',
    name: 'redis-faq'
);

$response = Mindwave::prompt()
    ->context($cacheSource)
    ->section('user', 'What are the refund policies?')
    ->run();
```

### Example 5: Graph Database Source

Retrieve contextual information from a graph database:

```php
<?php

namespace App\Context\Sources;

use Laudis\Neo4j\ClientBuilder;
use Laudis\Neo4j\Contracts\ClientInterface;
use Mindwave\Mindwave\Context\Contracts\ContextSource;
use Mindwave\Mindwave\Context\ContextCollection;
use Mindwave\Mindwave\Context\ContextItem;

class Neo4jSource implements ContextSource
{
    public function __construct(
        private ClientInterface $client,
        private string $nodeLabel,
        private array $searchProperties = ['name', 'description'],
        private string $name = 'neo4j-source'
    ) {}

    public function search(string $query, int $limit = 5): ContextCollection
    {
        // Build Cypher query
        $whereConditions = collect($this->searchProperties)
            ->map(fn($prop) => "toLower(n.{$prop}) CONTAINS toLower(\$query)")
            ->join(' OR ');

        $cypher = <<<CYPHER
            MATCH (n:{$this->nodeLabel})
            WHERE {$whereConditions}
            RETURN n,
                   CASE
                       WHEN toLower(n.name) CONTAINS toLower(\$query) THEN 1.0
                       WHEN toLower(n.description) CONTAINS toLower(\$query) THEN 0.8
                       ELSE 0.5
                   END AS score
            ORDER BY score DESC
            LIMIT \$limit
        CYPHER;

        try {
            $results = $this->client->run($cypher, [
                'query' => $query,
                'limit' => $limit,
            ]);

            $items = collect($results)->map(function ($record) {
                $node = $record->get('n');
                $score = $record->get('score');

                $content = $this->formatNode($node);

                return new ContextItem(
                    content: $content,
                    score: $score,
                    source: $this->name,
                    metadata: [
                        'id' => $node->getProperty('id'),
                        'labels' => $node->getLabels(),
                    ]
                );
            });

            return new ContextCollection($items->all());
        } catch (\Exception $e) {
            \Log::error("Neo4j search failed", [
                'error' => $e->getMessage(),
                'query' => $query,
            ]);

            return new ContextCollection([]);
        }
    }

    public function getName(): string
    {
        return $this->name;
    }

    private function formatNode($node): string
    {
        $properties = $node->getProperties();

        return collect($properties)
            ->map(fn($value, $key) => "{$key}: {$value}")
            ->join("\n");
    }
}
```

**Usage:**

```php
use App\Context\Sources\Neo4jSource;
use Laudis\Neo4j\ClientBuilder;

$neo4jClient = ClientBuilder::create()
    ->withDriver('bolt', 'bolt://localhost:7687')
    ->build();

$graphSource = new Neo4jSource(
    client: $neo4jClient,
    nodeLabel: 'Document',
    searchProperties: ['title', 'content', 'tags'],
    name: 'knowledge-graph'
);

$response = Mindwave::prompt()
    ->context($graphSource)
    ->section('user', 'Find related articles about Laravel')
    ->run();
```

## Advanced Patterns

### Pattern 1: Weighted Source Combination

Implement custom weighting for different sources:

```php
<?php

namespace App\Context\Sources;

use Mindwave\Mindwave\Context\Contracts\ContextSource;
use Mindwave\Mindwave\Context\ContextCollection;
use Mindwave\Mindwave\Context\ContextItem;

class WeightedMultiSource implements ContextSource
{
    public function __construct(
        private array $sources,  // ['source' => ContextSource, 'weight' => float]
        private string $name = 'weighted-multi-source'
    ) {}

    public function search(string $query, int $limit = 5): ContextCollection
    {
        $allItems = collect();

        foreach ($this->sources as $config) {
            $source = $config['source'];
            $weight = $config['weight'] ?? 1.0;

            $results = $source->search($query, $limit);

            // Apply weight to scores
            $weighted = $results->map(function ($item) use ($weight) {
                return new ContextItem(
                    content: $item->content,
                    score: $item->score * $weight,
                    source: $item->source,
                    metadata: array_merge(
                        $item->metadata ?? [],
                        ['original_score' => $item->score, 'weight' => $weight]
                    )
                );
            });

            $allItems = $allItems->merge($weighted);
        }

        // Sort by weighted score and limit
        $sorted = $allItems->sortByDesc('score')->take($limit);

        return new ContextCollection($sorted->values()->all());
    }

    public function getName(): string
    {
        return $this->name;
    }
}
```

**Usage:**

```php
use App\Context\Sources\WeightedMultiSource;

$weightedSource = new WeightedMultiSource(
    sources: [
        [
            'source' => $officialDocsSource,
            'weight' => 1.5,  // Boost official docs
        ],
        [
            'source' => $communitySource,
            'weight' => 1.0,  // Neutral weight
        ],
        [
            'source' => $blogSource,
            'weight' => 0.7,  // Lower weight for blogs
        ],
    ],
    name: 'weighted-docs'
);

$response = Mindwave::prompt()
    ->context($weightedSource)
    ->section('user', 'Laravel deployment guide')
    ->run();
```

### Pattern 2: Fallback Source Chain

Implement fallback logic for reliability:

```php
<?php

namespace App\Context\Sources;

use Mindwave\Mindwave\Context\Contracts\ContextSource;
use Mindwave\Mindwave\Context\ContextCollection;

class FallbackSource implements ContextSource
{
    public function __construct(
        private array $sources,  // ContextSource[] in priority order
        private int $minResults = 3,
        private string $name = 'fallback-source'
    ) {}

    public function search(string $query, int $limit = 5): ContextCollection
    {
        foreach ($this->sources as $source) {
            try {
                $results = $source->search($query, $limit);

                if ($results->count() >= $this->minResults) {
                    \Log::info("Fallback source used", [
                        'source' => $source->getName(),
                        'results' => $results->count(),
                    ]);

                    return $results;
                }
            } catch (\Exception $e) {
                \Log::warning("Fallback source failed", [
                    'source' => $source->getName(),
                    'error' => $e->getMessage(),
                ]);

                // Continue to next source
                continue;
            }
        }

        // Return empty collection if all sources fail
        \Log::error("All fallback sources failed", ['query' => $query]);

        return new ContextCollection([]);
    }

    public function getName(): string
    {
        return $this->name;
    }
}
```

**Usage:**

```php
use App\Context\Sources\FallbackSource;

$fallbackSource = new FallbackSource(
    sources: [
        $primaryApiSource,      // Try first
        $secondaryApiSource,    // Fallback 1
        $databaseSource,        // Fallback 2
        $cacheSource,           // Fallback 3
        $staticSource,          // Last resort
    ],
    minResults: 3,
    name: 'reliable-search'
);

$response = Mindwave::prompt()
    ->context($fallbackSource)
    ->section('user', 'Search query')
    ->run();
```

### Pattern 3: Rate-Limited Source

Implement rate limiting for API sources:

```php
<?php

namespace App\Context\Sources;

use Illuminate\Support\Facades\RateLimiter;
use Mindwave\Mindwave\Context\Contracts\ContextSource;
use Mindwave\Mindwave\Context\ContextCollection;

class RateLimitedSource implements ContextSource
{
    public function __construct(
        private ContextSource $wrappedSource,
        private int $maxAttempts = 60,
        private int $decaySeconds = 60,
        private string $name = 'rate-limited-source'
    ) {}

    public function search(string $query, int $limit = 5): ContextCollection
    {
        $key = "context-source:{$this->wrappedSource->getName()}";

        if (RateLimiter::tooManyAttempts($key, $this->maxAttempts)) {
            $seconds = RateLimiter::availableIn($key);

            \Log::warning("Rate limit exceeded", [
                'source' => $this->wrappedSource->getName(),
                'available_in' => $seconds,
            ]);

            return new ContextCollection([]);
        }

        RateLimiter::hit($key, $this->decaySeconds);

        return $this->wrappedSource->search($query, $limit);
    }

    public function getName(): string
    {
        return $this->name;
    }
}
```

**Usage:**

```php
use App\Context\Sources\RateLimitedSource;

$rateLimitedApi = new RateLimitedSource(
    wrappedSource: $externalApiSource,
    maxAttempts: 30,     // 30 requests
    decaySeconds: 60,    // per minute
    name: 'rate-limited-api'
);

$response = Mindwave::prompt()
    ->context($rateLimitedApi)
    ->section('user', 'Query')
    ->run();
```

## Best Practices

### 1. Error Handling

Always handle errors gracefully:

```php
public function search(string $query, int $limit = 5): ContextCollection
{
    try {
        $results = $this->performSearch($query, $limit);

        return new ContextCollection($results);
    } catch (\Exception $e) {
        \Log::error("Custom source search failed", [
            'source' => $this->name,
            'query' => $query,
            'error' => $e->getMessage(),
        ]);

        // Return empty collection instead of throwing
        return new ContextCollection([]);
    }
}
```

### 2. Caching

Implement caching for expensive operations:

```php
use Illuminate\Support\Facades\Cache;

public function search(string $query, int $limit = 5): ContextCollection
{
    $cacheKey = "source:{$this->name}:search:" . md5($query) . ":{$limit}";

    return Cache::remember($cacheKey, 3600, function () use ($query, $limit) {
        return $this->performSearch($query, $limit);
    });
}
```

### 3. Score Normalization

Ensure scores are in the 0.0-1.0 range:

```php
private function normalizeScore(float $rawScore): float
{
    // For unbounded scores, use sigmoid
    return 1 / (1 + exp(-$rawScore / 10));

    // For bounded scores, use min-max normalization
    $min = 0;
    $max = 100;
    return ($rawScore - $min) / ($max - $min);
}
```

### 4. Logging and Monitoring

Track source performance:

```php
public function search(string $query, int $limit = 5): ContextCollection
{
    $start = microtime(true);

    $results = $this->performSearch($query, $limit);

    $duration = microtime(true) - $start;

    \Log::info("Source search completed", [
        'source' => $this->name,
        'query' => $query,
        'results' => count($results),
        'duration_ms' => round($duration * 1000, 2),
    ]);

    return new ContextCollection($results);
}
```

### 5. Metadata Preservation

Include useful metadata for debugging:

```php
return new ContextItem(
    content: $result['text'],
    score: $result['score'],
    source: $this->name,
    metadata: [
        'id' => $result['id'],
        'retrieved_at' => now()->toIso8601String(),
        'source_type' => $this->getSourceType(),
        'query' => $query,  // Helpful for debugging
        'original_data' => $result,  // Include raw data
    ]
);
```

### 6. Timeout Handling

Set appropriate timeouts for external calls:

```php
use Illuminate\Support\Facades\Http;

private function fetchFromApi(string $query): array
{
    $response = Http::timeout(10)  // 10 second timeout
        ->retry(3, 100)            // Retry 3 times with 100ms delay
        ->get($this->apiUrl, ['q' => $query]);

    return $response->successful() ? $response->json() : [];
}
```

## Testing Custom Sources

### Unit Testing

Test your custom source in isolation:

```php
use Tests\TestCase;
use App\Context\Sources\MyCustomSource;

class MyCustomSourceTest extends TestCase
{
    /** @test */
    public function it_returns_context_items()
    {
        $source = new MyCustomSource();

        $results = $source->search('test query', limit: 5);

        $this->assertInstanceOf(ContextCollection::class, $results);
        $this->assertLessThanOrEqual(5, $results->count());
    }

    /** @test */
    public function it_handles_empty_results()
    {
        $source = new MyCustomSource();

        $results = $source->search('nonexistent query', limit: 5);

        $this->assertInstanceOf(ContextCollection::class, $results);
        $this->assertCount(0, $results);
    }

    /** @test */
    public function it_normalizes_scores()
    {
        $source = new MyCustomSource();

        $results = $source->search('query', limit: 10);

        foreach ($results as $item) {
            $this->assertGreaterThanOrEqual(0.0, $item->score);
            $this->assertLessThanOrEqual(1.0, $item->score);
        }
    }

    /** @test */
    public function it_handles_errors_gracefully()
    {
        $source = new MyCustomSource();

        // Force an error condition
        // ...

        $results = $source->search('error query', limit: 5);

        // Should return empty collection, not throw
        $this->assertInstanceOf(ContextCollection::class, $results);
    }
}
```

### Integration Testing

Test with PromptComposer:

```php
use Tests\TestCase;
use App\Context\Sources\MyCustomSource;
use Mindwave\Mindwave\Facades\Mindwave;

class CustomSourceIntegrationTest extends TestCase
{
    /** @test */
    public function it_integrates_with_prompt_composer()
    {
        $source = new MyCustomSource();

        $response = Mindwave::prompt()
            ->section('system', 'You are a helpful assistant.')
            ->context($source, query: 'test query', limit: 3)
            ->section('user', 'Answer this question')
            ->run();

        $this->assertNotEmpty($response->content);
    }
}
```

## Troubleshooting

### Problem: Empty Results

**Cause:** Search logic not finding matching items

**Solution:**

```php
// Add debug logging
public function search(string $query, int $limit = 5): ContextCollection
{
    \Log::debug("Custom source search", [
        'query' => $query,
        'limit' => $limit,
    ]);

    $results = $this->performSearch($query, $limit);

    \Log::debug("Custom source results", [
        'count' => count($results),
        'first_result' => $results[0] ?? null,
    ]);

    return new ContextCollection($results);
}
```

### Problem: Incorrect Scores

**Cause:** Scores outside 0.0-1.0 range

**Solution:**

```php
// Always normalize scores
private function normalizeScore(float $rawScore): float
{
    return max(0.0, min(1.0, $rawScore));
}
```

### Problem: Slow Performance

**Cause:** External API calls or heavy database queries

**Solution:**

```php
// Implement caching and timeouts
public function search(string $query, int $limit = 5): ContextCollection
{
    $cacheKey = "source:{$this->name}:" . md5($query);

    return Cache::remember($cacheKey, 1800, function () use ($query, $limit) {
        return $this->performSearchWithTimeout($query, $limit);
    });
}

private function performSearchWithTimeout(string $query, int $limit): ContextCollection
{
    try {
        return timeout(function () use ($query, $limit) {
            return $this->performSearch($query, $limit);
        }, 5);  // 5 second timeout
    } catch (TimeoutException $e) {
        \Log::warning("Search timeout", ['source' => $this->name]);
        return new ContextCollection([]);
    }
}
```

## Related Documentation

- [RAG Overview](/docs/rag/overview) - Complete RAG architecture
- [Vector Store Source](/docs/rag/vector-store-source) - Semantic search integration
- [TNTSearch Source](/docs/rag/tntsearch-source) - Full-text search
- [Context Pipeline](/docs/rag/context-pipeline) - Multi-source aggregation
- [PromptComposer](/docs/core/prompt-composer) - Token-aware prompts
