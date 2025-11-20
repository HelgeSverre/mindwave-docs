# RAG Patterns

Retrieval-Augmented Generation (RAG) combines the knowledge retrieval capabilities of search systems with the generative power of LLMs. This guide explores advanced RAG patterns, optimization techniques, and production-ready architectures for building sophisticated information retrieval systems.

## Overview

### What You'll Learn

This guide covers advanced RAG implementation patterns:

- **Hybrid Search** - Combine semantic and keyword search for best results
- **Re-Ranking Strategies** - Improve relevance with multi-stage retrieval
- **Context Window Optimization** - Maximize information density
- **Query Optimization** - Transform user queries for better retrieval
- **Multi-Source Aggregation** - Combine data from heterogeneous sources
- **Caching Strategies** - Reduce costs and improve performance
- **Evaluation Metrics** - Measure and improve RAG quality
- **Production Patterns** - Scale RAG systems effectively

### Prerequisites

This guide assumes you understand:
- [RAG basics and fundamentals](/docs/core/rag-overview)
- [Vector stores and embeddings](/docs/rag/vectorstores)
- [Context Pipeline](/docs/rag/context-pipeline)
- [Brain API](/docs/rag/brain)

## Hybrid Search Patterns

Combining semantic vector search with keyword-based search provides the best of both worlds.

### Basic Hybrid Search

Combine vector and keyword search using Context Pipeline:

```php
use Mindwave\Mindwave\Context\ContextPipeline;
use Mindwave\Mindwave\Context\Sources\VectorStoreSource;
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;
use Mindwave\Mindwave\Facades\Mindwave;
use App\Models\Article;

// Semantic search source
$vectorSource = VectorStoreSource::fromBrain(
    Mindwave::brain('articles'),
    name: 'semantic_search'
);

// Keyword search source
$keywordSource = TntSearchSource::fromEloquent(
    Article::query(),
    fn($article) => $article->title . "\n" . $article->content,
    name: 'keyword_search'
);

// Combine both
$pipeline = (new ContextPipeline)
    ->addSource($vectorSource)
    ->addSource($keywordSource)
    ->deduplicate(true)
    ->rerank(true);

// Query returns both semantic matches AND exact keyword matches
$results = $pipeline->search('Laravel authentication', limit: 10);
```

**Why hybrid search works:**
- Vector search finds conceptually similar content
- Keyword search catches exact technical terms
- Combined results cover both semantic and lexical matching
- Deduplication removes overlapping results

### Weighted Hybrid Search

Weight different sources based on importance:

```php
class WeightedHybridSearch
{
    public function search(string $query, int $limit = 10): Collection
    {
        $vectorResults = $this->vectorSource->search($query, limit: 20);
        $keywordResults = $this->keywordSource->search($query, limit: 20);

        // Apply weights to scores
        $weightedVector = $vectorResults->map(function($item) {
            $item->score *= 0.7; // Vector search gets 70% weight
            $item->source = 'vector';
            return $item;
        });

        $weightedKeyword = $keywordResults->map(function($item) {
            $item->score *= 0.3; // Keyword search gets 30% weight
            $item->source = 'keyword';
            return $item;
        });

        // Combine and sort by weighted score
        return $weightedVector
            ->concat($weightedKeyword)
            ->unique('content') // Deduplicate
            ->sortByDesc('score')
            ->take($limit)
            ->values();
    }
}
```

### Adaptive Hybrid Search

Adjust weights based on query characteristics:

```php
class AdaptiveHybridSearch
{
    public function search(string $query, int $limit = 10): Collection
    {
        $weights = $this->determineWeights($query);

        $vectorResults = $this->vectorSource
            ->search($query, limit: $limit * 2)
            ->map(fn($item) => $this->applyWeight($item, $weights['vector']));

        $keywordResults = $this->keywordSource
            ->search($query, limit: $limit * 2)
            ->map(fn($item) => $this->applyWeight($item, $weights['keyword']));

        return $this->mergeResults($vectorResults, $keywordResults, $limit);
    }

    protected function determineWeights(string $query): array
    {
        // Technical queries favor keyword search
        if ($this->isTechnicalQuery($query)) {
            return ['vector' => 0.3, 'keyword' => 0.7];
        }

        // Conceptual queries favor vector search
        if ($this->isConceptualQuery($query)) {
            return ['vector' => 0.8, 'keyword' => 0.2];
        }

        // Balanced for mixed queries
        return ['vector' => 0.6, 'keyword' => 0.4];
    }

    protected function isTechnicalQuery(string $query): bool
    {
        // Check for code patterns, function names, technical terms
        return preg_match('/[A-Z][a-z]+::[a-z]+|function\s+\w+|\$\w+/', $query)
            || str_contains($query, '()')
            || str_contains($query, '::');
    }

    protected function isConceptualQuery(string $query): bool
    {
        // Check for question words, conceptual language
        $conceptualWords = ['why', 'how', 'what', 'explain', 'understand', 'concept', 'difference'];

        foreach ($conceptualWords as $word) {
            if (str_contains(strtolower($query), $word)) {
                return true;
            }
        }

        return false;
    }
}
```

## Re-Ranking Strategies

Improve retrieval quality with multi-stage ranking.

### LLM-Based Re-Ranking

Use an LLM to re-rank results for better relevance:

```php
use Mindwave\Mindwave\Facades\LLM;

class LLMReranker
{
    public function rerank(string $query, Collection $results, int $topK = 5): Collection
    {
        if ($results->count() <= $topK) {
            return $results;
        }

        $prompt = $this->buildRerankPrompt($query, $results);

        $response = LLM::driver('openai')
            ->model('gpt-4o-mini') // Fast, cheap model for ranking
            ->generateText($prompt);

        $rankings = $this->parseRankings($response);

        return $this->applyRankings($results, $rankings)->take($topK);
    }

    protected function buildRerankPrompt(string $query, Collection $results): string
    {
        $passages = $results->map(function($item, $index) {
            return "[{$index}] {$item->content}";
        })->join("\n\n");

        return <<<PROMPT
        Given the query: "{$query}"

        Rank the following passages by relevance (most relevant first).
        Return ONLY the indices in order, comma-separated (e.g., "2,5,1,3,4").

        {$passages}

        Rankings (indices only):
        PROMPT;
    }

    protected function parseRankings(string $response): array
    {
        // Extract comma-separated indices
        preg_match_all('/\d+/', $response, $matches);
        return array_map('intval', $matches[0]);
    }

    protected function applyRankings(Collection $results, array $rankings): Collection
    {
        $ranked = collect();

        foreach ($rankings as $index) {
            if ($results->has($index)) {
                $ranked->push($results[$index]);
            }
        }

        // Add any unranked items at the end
        $results->each(function($item) use ($ranked) {
            if (!$ranked->contains($item)) {
                $ranked->push($item);
            }
        });

        return $ranked;
    }
}
```

### Cross-Encoder Re-Ranking

Use a cross-encoder model for precise relevance scoring:

```php
class CrossEncoderReranker
{
    protected string $model = 'cross-encoder/ms-marco-MiniLM-L-12-v2';

    public function rerank(string $query, Collection $results, int $topK = 5): Collection
    {
        if ($results->count() <= $topK) {
            return $results;
        }

        // Score each result with cross-encoder
        $scored = $results->map(function($item) use ($query) {
            $item->crossEncoderScore = $this->score($query, $item->content);
            return $item;
        });

        // Sort by cross-encoder score
        return $scored
            ->sortByDesc('crossEncoderScore')
            ->take($topK)
            ->values();
    }

    protected function score(string $query, string $document): float
    {
        // Call cross-encoder API or model
        // This is a simplified example
        $response = Http::post('http://localhost:8000/score', [
            'query' => $query,
            'document' => $document,
        ]);

        return $response->json('score');
    }
}
```

### Multi-Stage Retrieval

Combine fast initial retrieval with expensive re-ranking:

```php
class MultiStageRetriever
{
    public function __construct(
        protected VectorStoreSource $vectorSource,
        protected LLMReranker $reranker,
    ) {}

    public function retrieve(string $query, int $finalCount = 5): Collection
    {
        // Stage 1: Fast vector search - retrieve many candidates
        $candidates = $this->vectorSource->search($query, limit: 50);

        // Stage 2: LLM re-ranking - expensive but accurate
        $reranked = $this->reranker->rerank($query, $candidates, topK: $finalCount);

        return $reranked;
    }
}

// Usage
$retriever = new MultiStageRetriever($vectorSource, $reranker);
$results = $retriever->retrieve('How do I deploy Laravel?', finalCount: 5);
```

## Context Window Optimization

Maximize the information density within token limits.

### Intelligent Context Pruning

Remove less important content to fit more results:

```php
use Mindwave\Mindwave\Facades\Tokenizer;

class ContextPruner
{
    public function pruneToFit(Collection $items, int $maxTokens): Collection
    {
        $pruned = collect();
        $totalTokens = 0;

        foreach ($items as $item) {
            $content = $item->content;
            $tokens = Tokenizer::count($content);

            if ($totalTokens + $tokens <= $maxTokens) {
                // Item fits completely
                $pruned->push($item);
                $totalTokens += $tokens;
            } else {
                // Try to fit a truncated version
                $remaining = $maxTokens - $totalTokens;

                if ($remaining > 100) {
                    $truncated = $this->truncateToTokens($content, $remaining);
                    $item->content = $truncated;
                    $item->truncated = true;
                    $pruned->push($item);
                }

                break; // No more space
            }
        }

        return $pruned;
    }

    protected function truncateToTokens(string $text, int $maxTokens): string
    {
        // Truncate to approximate token count
        $encoding = Tokenizer::encode($text);
        $truncated = array_slice($encoding, 0, $maxTokens);
        $decoded = Tokenizer::decode($truncated);

        return $decoded . '...';
    }
}
```

### Summarization-Based Compression

Compress contexts using LLM summarization:

```php
class ContextCompressor
{
    public function compress(Collection $items, int $targetTokens): string
    {
        $totalTokens = $items->sum(fn($item) => Tokenizer::count($item->content));

        if ($totalTokens <= $targetTokens) {
            // No compression needed
            return $items->pluck('content')->join("\n\n");
        }

        // Compression needed
        $compressionRatio = $targetTokens / $totalTokens;

        if ($compressionRatio > 0.7) {
            // Light compression: Truncate each item proportionally
            return $this->truncateProportionally($items, $targetTokens);
        } else {
            // Heavy compression: Summarize with LLM
            return $this->summarizeWithLLM($items, $targetTokens);
        }
    }

    protected function summarizeWithLLM(Collection $items, int $targetTokens): string
    {
        $combined = $items->pluck('content')->join("\n\n");

        $prompt = <<<PROMPT
        Summarize the following information concisely while preserving key facts.
        Target length: approximately {$targetTokens} tokens.

        Information:
        {$combined}

        Summary:
        PROMPT;

        return LLM::driver('openai')
            ->model('gpt-4o-mini')
            ->generateText($prompt);
    }

    protected function truncateProportionally(Collection $items, int $targetTokens): string
    {
        $tokensPerItem = (int) ($targetTokens / $items->count());

        return $items->map(function($item) use ($tokensPerItem) {
            $encoding = Tokenizer::encode($item->content);

            if (count($encoding) <= $tokensPerItem) {
                return $item->content;
            }

            $truncated = array_slice($encoding, 0, $tokensPerItem);
            return Tokenizer::decode($truncated) . '...';
        })->join("\n\n");
    }
}
```

### Sliding Window Context

Use sliding windows for long documents:

```php
class SlidingWindowRetriever
{
    protected int $windowSize = 512; // tokens
    protected int $overlap = 128; // tokens

    public function createWindows(string $document): Collection
    {
        $tokens = Tokenizer::encode($document);
        $windows = collect();

        $start = 0;
        while ($start < count($tokens)) {
            $end = min($start + $this->windowSize, count($tokens));
            $windowTokens = array_slice($tokens, $start, $end - $start);

            $windows->push([
                'content' => Tokenizer::decode($windowTokens),
                'start' => $start,
                'end' => $end,
            ]);

            $start += ($this->windowSize - $this->overlap);
        }

        return $windows;
    }

    public function search(string $query, string $document): string
    {
        $windows = $this->createWindows($document);

        // Find most relevant window
        $embeddings = $windows->map(fn($w) => Embeddings::embedText($w['content']));
        $queryEmbedding = Embeddings::embedText($query);

        $scored = $windows->map(function($window, $index) use ($queryEmbedding, $embeddings) {
            $similarity = $this->cosineSimilarity($queryEmbedding, $embeddings[$index]);
            $window['score'] = $similarity;
            return $window;
        });

        return $scored->sortByDesc('score')->first()['content'];
    }
}
```

## Query Optimization

Transform user queries for better retrieval.

### Query Expansion

Expand queries with synonyms and related terms:

```php
class QueryExpander
{
    public function expand(string $query): array
    {
        $expansions = [$query]; // Original query

        // Add LLM-generated expansions
        $llmExpansions = $this->llmExpand($query);
        $expansions = array_merge($expansions, $llmExpansions);

        // Add synonym-based expansions
        $synonymExpansions = $this->synonymExpand($query);
        $expansions = array_merge($expansions, $synonymExpansions);

        return array_unique($expansions);
    }

    protected function llmExpand(string $query): array
    {
        $prompt = <<<PROMPT
        Given the query: "{$query}"

        Generate 3 alternative phrasings that mean the same thing.
        Return only the alternatives, one per line.
        PROMPT;

        $response = LLM::driver('openai')
            ->model('gpt-4o-mini')
            ->generateText($prompt);

        return array_filter(explode("\n", trim($response)));
    }

    protected function synonymExpand(string $query): array
    {
        // Simple synonym expansion (could use a thesaurus API)
        $synonymMap = [
            'fix' => ['repair', 'solve', 'resolve'],
            'error' => ['bug', 'issue', 'problem'],
            'create' => ['make', 'build', 'generate'],
        ];

        $expanded = [];

        foreach ($synonymMap as $term => $synonyms) {
            if (str_contains(strtolower($query), $term)) {
                foreach ($synonyms as $synonym) {
                    $expanded[] = str_replace($term, $synonym, strtolower($query));
                }
            }
        }

        return $expanded;
    }

    public function searchWithExpansion(string $query, VectorStoreSource $source): Collection
    {
        $queries = $this->expand($query);
        $results = collect();

        foreach ($queries as $expandedQuery) {
            $queryResults = $source->search($expandedQuery, limit: 10);
            $results = $results->concat($queryResults);
        }

        return $results->unique('content')->sortByDesc('score')->take(10);
    }
}
```

### Hypothetical Document Embeddings (HyDE)

Generate hypothetical answers and search for documents similar to them:

```php
class HyDERetriever
{
    public function retrieve(string $query, VectorStoreSource $source, int $limit = 5): Collection
    {
        // Generate hypothetical answer
        $hypotheticalAnswer = $this->generateHypotheticalAnswer($query);

        // Search using the hypothetical answer instead of the query
        $results = $source->search($hypotheticalAnswer, limit: $limit);

        return $results;
    }

    protected function generateHypotheticalAnswer(string $query): string
    {
        $prompt = <<<PROMPT
        Answer this question in 2-3 detailed sentences: {$query}

        Write as if you're providing a knowledgeable answer from documentation.
        PROMPT;

        return LLM::driver('openai')
            ->model('gpt-4o-mini')
            ->generateText($prompt);
    }
}

// Usage
$retriever = new HyDERetriever();
$results = $retriever->retrieve(
    'How do I configure database connections?',
    $vectorSource
);
```

### Multi-Query Retrieval

Generate multiple query variations and merge results:

```php
class MultiQueryRetriever
{
    public function retrieve(string $query, VectorStoreSource $source, int $limit = 5): Collection
    {
        $variations = $this->generateQueryVariations($query);
        $allResults = collect();

        foreach ($variations as $variation) {
            $results = $source->search($variation, limit: $limit * 2);
            $allResults = $allResults->concat($results);
        }

        // Deduplicate and rank by frequency
        $counts = [];
        foreach ($allResults as $item) {
            $hash = md5($item->content);
            if (!isset($counts[$hash])) {
                $counts[$hash] = ['item' => $item, 'count' => 0];
            }
            $counts[$hash]['count']++;
        }

        return collect($counts)
            ->sortByDesc('count')
            ->pluck('item')
            ->take($limit)
            ->values();
    }

    protected function generateQueryVariations(string $query): array
    {
        $prompt = <<<PROMPT
        Generate 3 different ways to ask this question: "{$query}"

        Each variation should:
        - Ask for the same information
        - Use different wording
        - Be a complete question

        Return only the 3 variations, one per line.
        PROMPT;

        $response = LLM::driver('openai')
            ->model('gpt-4o-mini')
            ->generateText($prompt);

        $variations = array_filter(explode("\n", trim($response)));

        return array_merge([$query], $variations);
    }
}
```

## Multi-Source Aggregation

Combine information from diverse data sources.

### Hierarchical Source Priority

Give different sources different priorities:

```php
class PrioritizedAggregator
{
    protected array $sources = [];

    public function addSource(ContextSource $source, int $priority): self
    {
        $this->sources[] = compact('source', 'priority');
        return $this;
    }

    public function search(string $query, int $limit = 10): Collection
    {
        $allResults = collect();

        foreach ($this->sources as $config) {
            $results = $config['source']->search($query, limit: $limit * 2);

            $results = $results->map(function($item) use ($config) {
                // Boost score based on source priority
                $item->score *= ($config['priority'] / 100);
                $item->sourcePriority = $config['priority'];
                return $item;
            });

            $allResults = $allResults->concat($results);
        }

        return $allResults
            ->unique('content')
            ->sortByDesc('score')
            ->take($limit)
            ->values();
    }
}

// Usage
$aggregator = (new PrioritizedAggregator())
    ->addSource($officialDocsSource, priority: 100)  // Highest priority
    ->addSource($communityDocsSource, priority: 70)
    ->addSource($stackOverflowSource, priority: 50); // Lowest priority

$results = $aggregator->search('Laravel deployment', limit: 10);
```

### Source-Specific Filtering

Apply different filters to different sources:

```php
class FilteredAggregator
{
    public function search(string $query, array $filters = []): Collection
    {
        $results = collect();

        // Official docs - always include
        $docsResults = $this->docsSource->search($query, limit: 5);
        $results = $results->concat($docsResults);

        // Blog posts - only recent ones
        if ($filters['include_blogs'] ?? true) {
            $blogResults = $this->blogSource
                ->search($query, limit: 5)
                ->filter(fn($item) => $item->created_at->gte(now()->subMonths(6)));

            $results = $results->concat($blogResults);
        }

        // Community content - only high-rated
        if ($filters['include_community'] ?? true) {
            $communityResults = $this->communitySource
                ->search($query, limit: 5)
                ->filter(fn($item) => $item->rating >= 4.0);

            $results = $results->concat($communityResults);
        }

        return $results->unique('content')->take($filters['limit'] ?? 10);
    }
}
```

### Metadata-Enhanced Retrieval

Use metadata to improve relevance:

```php
class MetadataEnhancedRetriever
{
    public function search(string $query, array $requiredMetadata = []): Collection
    {
        $results = $this->source->search($query, limit: 20);

        // Filter by metadata
        $filtered = $results->filter(function($item) use ($requiredMetadata) {
            foreach ($requiredMetadata as $key => $value) {
                if (!isset($item->metadata[$key]) || $item->metadata[$key] !== $value) {
                    return false;
                }
            }
            return true;
        });

        // Boost based on metadata relevance
        return $filtered->map(function($item) use ($query) {
            // Boost recent content
            if (isset($item->metadata['published_at'])) {
                $daysOld = now()->diffInDays($item->metadata['published_at']);
                if ($daysOld < 30) {
                    $item->score *= 1.2; // 20% boost for recent content
                }
            }

            // Boost by author reputation
            if (isset($item->metadata['author_reputation'])) {
                $boost = 1 + ($item->metadata['author_reputation'] / 1000);
                $item->score *= $boost;
            }

            // Boost by view count
            if (isset($item->metadata['view_count'])) {
                $boost = 1 + (log($item->metadata['view_count'] + 1) / 100);
                $item->score *= $boost;
            }

            return $item;
        })->sortByDesc('score');
    }
}

// Usage
$results = $retriever->search('Laravel queue workers', [
    'category' => 'tutorial',
    'language' => 'en',
    'version' => '11.x',
]);
```

## Caching Strategies

Reduce costs and improve performance with intelligent caching.

### Embedding Cache

Cache embeddings to avoid regenerating them:

```php
use Illuminate\Support\Facades\Cache;

class CachedEmbeddings
{
    public function embed(string $text): array
    {
        $key = 'embedding:' . md5($text);

        return Cache::remember($key, 86400, function() use ($text) {
            return Embeddings::embedText($text)->toArray();
        });
    }

    public function embedBatch(array $texts): array
    {
        $embeddings = [];
        $toEmbed = [];

        // Check cache first
        foreach ($texts as $index => $text) {
            $key = 'embedding:' . md5($text);
            $cached = Cache::get($key);

            if ($cached) {
                $embeddings[$index] = $cached;
            } else {
                $toEmbed[$index] = $text;
            }
        }

        // Batch embed uncached texts
        if (!empty($toEmbed)) {
            $newEmbeddings = Embeddings::embedBatch(array_values($toEmbed));

            foreach ($toEmbed as $index => $text) {
                $embedding = $newEmbeddings->shift();
                $key = 'embedding:' . md5($text);
                Cache::put($key, $embedding->toArray(), 86400);
                $embeddings[$index] = $embedding->toArray();
            }
        }

        ksort($embeddings);
        return array_values($embeddings);
    }
}
```

### Query Result Cache

Cache search results for common queries:

```php
class CachedRetriever
{
    protected int $cacheTtl = 3600; // 1 hour

    public function search(string $query, int $limit = 10): Collection
    {
        $key = $this->getCacheKey($query, $limit);

        return Cache::remember($key, $this->cacheTtl, function() use ($query, $limit) {
            return $this->source->search($query, limit: $limit);
        });
    }

    protected function getCacheKey(string $query, int $limit): string
    {
        return sprintf(
            'rag:search:%s:%d',
            md5(strtolower(trim($query))),
            $limit
        );
    }

    public function invalidateQuery(string $query): void
    {
        // Invalidate all cached results for this query
        for ($limit = 1; $limit <= 100; $limit++) {
            $key = $this->getCacheKey($query, $limit);
            Cache::forget($key);
        }
    }

    public function invalidateAll(): void
    {
        // Clear all cached searches
        Cache::tags(['rag:search'])->flush();
    }
}
```

### Adaptive Cache TTL

Adjust cache duration based on query characteristics:

```php
class AdaptiveCacheRetriever
{
    public function search(string $query, int $limit = 10): Collection
    {
        $ttl = $this->determineCacheTtl($query);
        $key = 'rag:' . md5($query . $limit);

        return Cache::remember($key, $ttl, function() use ($query, $limit) {
            return $this->source->search($query, limit: $limit);
        });
    }

    protected function determineCacheTtl(string $query): int
    {
        // Time-sensitive queries - short cache
        if ($this->isTimeSensitive($query)) {
            return 300; // 5 minutes
        }

        // Documentation queries - long cache
        if ($this->isDocumentationQuery($query)) {
            return 86400; // 24 hours
        }

        // General queries - medium cache
        return 3600; // 1 hour
    }

    protected function isTimeSensitive(string $query): bool
    {
        $timeWords = ['today', 'now', 'current', 'latest', 'recent'];

        foreach ($timeWords as $word) {
            if (str_contains(strtolower($query), $word)) {
                return true;
            }
        }

        return false;
    }

    protected function isDocumentationQuery(string $query): bool
    {
        $docWords = ['how to', 'documentation', 'guide', 'tutorial', 'example'];

        foreach ($docWords as $word) {
            if (str_contains(strtolower($query), $word)) {
                return true;
            }
        }

        return false;
    }
}
```

## Evaluation and Monitoring

Measure and improve RAG system quality.

### Retrieval Quality Metrics

Track retrieval performance:

```php
class RAGMetrics
{
    public function evaluate(string $query, Collection $retrieved, string $expectedAnswer): array
    {
        return [
            'precision_at_k' => $this->precisionAtK($retrieved, $expectedAnswer, k: 5),
            'recall_at_k' => $this->recallAtK($retrieved, $expectedAnswer, k: 10),
            'mrr' => $this->meanReciprocalRank($retrieved, $expectedAnswer),
            'ndcg' => $this->normalizedDCG($retrieved, $expectedAnswer),
        ];
    }

    protected function precisionAtK(Collection $retrieved, string $expected, int $k): float
    {
        $topK = $retrieved->take($k);
        $relevant = $topK->filter(fn($item) => $this->isRelevant($item->content, $expected));

        return $relevant->count() / min($k, $retrieved->count());
    }

    protected function recallAtK(Collection $retrieved, string $expected, int $k): float
    {
        $topK = $retrieved->take($k);
        $relevant = $topK->filter(fn($item) => $this->isRelevant($item->content, $expected));

        // Assume we know total relevant documents (would need ground truth)
        $totalRelevant = 10; // Placeholder

        return $relevant->count() / $totalRelevant;
    }

    protected function meanReciprocalRank(Collection $retrieved, string $expected): float
    {
        foreach ($retrieved as $index => $item) {
            if ($this->isRelevant($item->content, $expected)) {
                return 1 / ($index + 1);
            }
        }

        return 0;
    }

    protected function isRelevant(string $content, string $expected): bool
    {
        // Use LLM to judge relevance
        $prompt = <<<PROMPT
        Is the following content relevant to answering: "{$expected}"?

        Content: {$content}

        Answer with just "yes" or "no":
        PROMPT;

        $response = LLM::driver('openai')
            ->model('gpt-4o-mini')
            ->generateText($prompt);

        return str_contains(strtolower($response), 'yes');
    }
}
```

### Answer Quality Evaluation

Evaluate the quality of generated answers:

```php
class AnswerEvaluator
{
    public function evaluate(string $question, string $answer, string $context): array
    {
        return [
            'faithfulness' => $this->evaluateFaithfulness($answer, $context),
            'relevance' => $this->evaluateRelevance($question, $answer),
            'completeness' => $this->evaluateCompleteness($question, $answer),
        ];
    }

    protected function evaluateFaithfulness(string $answer, string $context): float
    {
        // Check if answer is grounded in context
        $prompt = <<<PROMPT
        Context: {$context}

        Answer: {$answer}

        On a scale of 0-1, how well is the answer supported by the context?
        0 = completely unsupported/hallucinated
        1 = fully grounded in context

        Return only the number:
        PROMPT;

        $response = LLM::driver('openai')
            ->model('gpt-4o')
            ->generateText($prompt);

        return (float) trim($response);
    }

    protected function evaluateRelevance(string $question, string $answer): float
    {
        // Check if answer addresses the question
        $prompt = <<<PROMPT
        Question: {$question}

        Answer: {$answer}

        On a scale of 0-1, how relevant is the answer to the question?
        0 = completely irrelevant
        1 = perfectly answers the question

        Return only the number:
        PROMPT;

        $response = LLM::driver('openai')
            ->model('gpt-4o')
            ->generateText($prompt);

        return (float) trim($response);
    }

    protected function evaluateCompleteness(string $question, string $answer): float
    {
        // Check if answer is complete
        $prompt = <<<PROMPT
        Question: {$question}

        Answer: {$answer}

        On a scale of 0-1, how complete is the answer?
        0 = missing critical information
        1 = comprehensive and complete

        Return only the number:
        PROMPT;

        $response = LLM::driver('openai')
            ->model('gpt-4o')
            ->generateText($prompt);

        return (float) trim($response);
    }
}
```

### Logging and Monitoring

Track RAG performance in production:

```php
class RAGMonitor
{
    public function logRetrieval(string $query, Collection $results, float $duration): void
    {
        Log::info('RAG retrieval', [
            'query' => $query,
            'result_count' => $results->count(),
            'top_score' => $results->first()->score ?? 0,
            'avg_score' => $results->avg('score') ?? 0,
            'duration_ms' => $duration * 1000,
            'sources' => $results->pluck('source')->unique()->values(),
        ]);

        // Track metrics
        Metrics::increment('rag.retrievals.total');
        Metrics::histogram('rag.retrieval.duration', $duration);
        Metrics::gauge('rag.retrieval.results', $results->count());

        // Alert on poor retrieval
        if ($results->isEmpty()) {
            Alert::send("No RAG results for query: {$query}");
        }

        if ($results->first()->score < 0.5) {
            Alert::send("Low relevance score for query: {$query}");
        }
    }

    public function logGeneration(string $query, string $answer, array $evaluation): void
    {
        Log::info('RAG generation', [
            'query' => $query,
            'answer_length' => strlen($answer),
            'faithfulness' => $evaluation['faithfulness'],
            'relevance' => $evaluation['relevance'],
            'completeness' => $evaluation['completeness'],
        ]);

        // Track answer quality metrics
        Metrics::gauge('rag.answer.faithfulness', $evaluation['faithfulness']);
        Metrics::gauge('rag.answer.relevance', $evaluation['relevance']);
        Metrics::gauge('rag.answer.completeness', $evaluation['completeness']);

        // Alert on poor quality
        if ($evaluation['faithfulness'] < 0.6) {
            Alert::send("Low faithfulness score for query: {$query}");
        }
    }
}
```

## Production Patterns

Scale RAG systems for production workloads.

### Async Embedding Pipeline

Process embeddings asynchronously:

```php
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;

class GenerateEmbeddingsJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        protected int $documentId,
        protected string $content
    ) {}

    public function handle(): void
    {
        $embedding = Embeddings::embedText($this->content);

        Document::find($this->documentId)->update([
            'embedding' => $embedding->toArray(),
            'embedded_at' => now(),
        ]);

        // Store in vector database
        Mindwave::brain('documents')->upsert([
            'id' => $this->documentId,
            'values' => $embedding->toArray(),
            'metadata' => [
                'document_id' => $this->documentId,
                'embedded_at' => now()->toIso8601String(),
            ],
        ]);
    }
}

// Dispatch for async processing
GenerateEmbeddingsJob::dispatch($document->id, $document->content);
```

### Batch Processing

Process documents in batches for efficiency:

```php
class BatchEmbeddingProcessor
{
    protected int $batchSize = 100;

    public function processDocuments(Collection $documents): void
    {
        $documents->chunk($this->batchSize)->each(function($batch) {
            $this->processBatch($batch);
        });
    }

    protected function processBatch(Collection $batch): void
    {
        // Extract text content
        $texts = $batch->pluck('content')->toArray();

        // Batch embed (more efficient than individual calls)
        $embeddings = Embeddings::embedBatch($texts);

        // Prepare vector store data
        $vectors = $batch->map(function($doc, $index) use ($embeddings) {
            return [
                'id' => $doc->id,
                'values' => $embeddings[$index]->toArray(),
                'metadata' => [
                    'title' => $doc->title,
                    'category' => $doc->category,
                    'created_at' => $doc->created_at->toIso8601String(),
                ],
            ];
        })->toArray();

        // Batch upsert to vector store
        Mindwave::brain('documents')->upsertBatch($vectors);

        Log::info("Processed batch of {$batch->count()} documents");
    }
}
```

### Graceful Degradation

Handle failures gracefully:

```php
class ResilientRAG
{
    public function retrieve(string $query, int $limit = 10): Collection
    {
        try {
            // Try primary vector search
            return $this->vectorSource->search($query, limit: $limit);

        } catch (\Exception $e) {
            Log::error('Vector search failed, falling back', [
                'error' => $e->getMessage(),
                'query' => $query,
            ]);

            try {
                // Fallback to keyword search
                return $this->keywordSource->search($query, limit: $limit);

            } catch (\Exception $e) {
                Log::error('Keyword search also failed', [
                    'error' => $e->getMessage(),
                    'query' => $query,
                ]);

                // Ultimate fallback: static responses
                return $this->staticFallback($query);
            }
        }
    }

    protected function staticFallback(string $query): Collection
    {
        return collect([
            new ContextItem(
                content: "I'm currently unable to search our knowledge base. Please try again later.",
                score: 0,
                source: 'fallback'
            )
        ]);
    }
}
```

## Best Practices

### 1. Choose the Right Embedding Model

Select embeddings based on your use case:

```php
// General purpose - OpenAI ada-002
$brain = Mindwave::brain('general')
    ->setEmbeddingProvider('openai')
    ->setEmbeddingModel('text-embedding-ada-002');

// Multilingual - multilingual-e5-large
$brain = Mindwave::brain('multilingual')
    ->setEmbeddingProvider('huggingface')
    ->setEmbeddingModel('intfloat/multilingual-e5-large');

// Domain-specific - fine-tuned model
$brain = Mindwave::brain('medical')
    ->setEmbeddingProvider('custom')
    ->setEmbeddingModel('bio-bert-base');
```

### 2. Optimize Chunk Size

Experiment with chunk sizes for your content:

```php
// Short chunks - better precision
$shortChunker = new ChunkingStrategy(size: 256, overlap: 50);

// Medium chunks - balanced
$mediumChunker = new ChunkingStrategy(size: 512, overlap: 100);

// Long chunks - more context
$longChunker = new ChunkingStrategy(size: 1024, overlap: 200);

// Test and measure
$evaluator = new RAGEvaluator();
$results = [
    'short' => $evaluator->evaluate($shortChunker),
    'medium' => $evaluator->evaluate($mediumChunker),
    'long' => $evaluator->evaluate($longChunker),
];
```

### 3. Monitor Costs

Track embedding and retrieval costs:

```php
class CostTracker
{
    public function trackEmbedding(int $tokenCount, string $model): void
    {
        $cost = match($model) {
            'text-embedding-ada-002' => $tokenCount * 0.0001 / 1000,
            'text-embedding-3-small' => $tokenCount * 0.00002 / 1000,
            'text-embedding-3-large' => $tokenCount * 0.00013 / 1000,
            default => 0,
        };

        Metrics::increment('rag.embedding.cost', $cost);
        Log::info("Embedding cost: \${$cost}");
    }

    public function trackRetrieval(string $provider, int $queries): void
    {
        $cost = match($provider) {
            'pinecone' => $queries * 0.0002,
            'weaviate' => 0, // self-hosted
            'qdrant' => 0, // self-hosted
            default => 0,
        };

        Metrics::increment('rag.retrieval.cost', $cost);
    }
}
```

### 4. Version Your Embeddings

Track embedding versions for reproducibility:

```php
class VersionedEmbeddings
{
    protected string $version = 'v2.1';

    public function embed(string $text): array
    {
        $embedding = Embeddings::embedText($text);

        return [
            'values' => $embedding->toArray(),
            'version' => $this->version,
            'model' => 'text-embedding-ada-002',
            'created_at' => now()->toIso8601String(),
        ];
    }

    public function requiresReembedding(array $stored): bool
    {
        return ($stored['version'] ?? 'v1.0') !== $this->version;
    }
}
```

### 5. Test with Real Queries

Build a test suite with real user queries:

```php
class RAGTestSuite
{
    protected array $testCases = [
        [
            'query' => 'How do I reset my password?',
            'expected_contains' => ['password', 'reset', 'email'],
            'min_relevance' => 0.8,
        ],
        [
            'query' => 'What are the deployment options?',
            'expected_contains' => ['deploy', 'server', 'cloud'],
            'min_relevance' => 0.7,
        ],
    ];

    public function run(): array
    {
        $results = [];

        foreach ($this->testCases as $test) {
            $retrieved = $this->rag->retrieve($test['query']);

            $results[] = [
                'query' => $test['query'],
                'passed' => $this->evaluate($retrieved, $test),
                'relevance' => $retrieved->first()->score ?? 0,
            ];
        }

        return $results;
    }

    protected function evaluate(Collection $results, array $test): bool
    {
        if ($results->isEmpty()) {
            return false;
        }

        $topResult = $results->first();

        if ($topResult->score < $test['min_relevance']) {
            return false;
        }

        foreach ($test['expected_contains'] as $term) {
            if (!str_contains(strtolower($topResult->content), strtolower($term))) {
                return false;
            }
        }

        return true;
    }
}
```

## Common Pitfalls

### 1. Not Deduplicating Results

Always deduplicate when using multiple sources:

```php
// Bad: Duplicate results from multiple sources
$results = $vectorSource->search($query)
    ->concat($keywordSource->search($query));

// Good: Deduplicate by content
$results = $vectorSource->search($query)
    ->concat($keywordSource->search($query))
    ->unique('content');
```

### 2. Ignoring Token Limits

Always check and manage token limits:

```php
// Bad: Might exceed context window
$context = $results->pluck('content')->join("\n\n");

// Good: Fit within limits
$context = $pruner->pruneToFit($results, maxTokens: 4000);
```

### 3. Not Caching Embeddings

Cache embeddings to avoid unnecessary costs:

```php
// Bad: Re-embedding same content
$embedding = Embeddings::embedText($content);

// Good: Cache embeddings
$embedding = Cache::remember(
    "emb:" . md5($content),
    86400,
    fn() => Embeddings::embedText($content)
);
```

### 4. Poor Chunk Boundaries

Chunk at logical boundaries:

```php
// Bad: Split mid-sentence
$chunks = str_split($text, 500);

// Good: Split at sentence boundaries
$sentences = preg_split('/(?<=[.!?])\s+/', $text);
$chunks = $this->groupSentences($sentences, targetSize: 500);
```

### 5. Not Monitoring Quality

Always track and monitor RAG quality:

```php
// Log every retrieval
$monitor = new RAGMonitor();
$monitor->logRetrieval($query, $results, $duration);

// Evaluate answer quality
$evaluation = $evaluator->evaluate($query, $answer, $context);
$monitor->logGeneration($query, $answer, $evaluation);

// Alert on degradation
if ($evaluation['faithfulness'] < 0.6) {
    Alert::send('RAG quality degraded');
}
```

## Related Documentation

- [RAG Overview](/docs/core/rag-overview)
- [Vector Stores](/docs/rag/vectorstores)
- [Context Pipeline](/docs/rag/context-pipeline)
- [Embeddings](/docs/rag/embeddings)
- [RAG Evaluation](/docs/rag/evaluation)
- [Production Deployment](/docs/production)
