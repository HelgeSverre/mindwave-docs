# RAG Evaluation

Measure and improve the quality of your RAG (Retrieval-Augmented Generation) systems with comprehensive evaluation strategies, metrics, and testing approaches. This guide covers retrieval quality, generation faithfulness, and production monitoring.

## Overview

RAG evaluation helps you answer critical questions:

-   Are we retrieving the right documents?
-   Is the generated content accurate and grounded in retrieved context?
-   How can we measure and improve RAG performance over time?
-   What metrics matter for our specific use case?

### Why Evaluate RAG Systems?

**Quality Assurance**

-   Ensure accurate retrieval and generation
-   Catch regressions before they reach production
-   Validate improvements from system changes

**Performance Optimization**

-   Identify bottlenecks in retrieval or generation
-   A/B test different approaches
-   Tune parameters for better results

**User Experience**

-   Measure response quality from user perspective
-   Track satisfaction and task completion
-   Reduce hallucinations and errors

**Compliance & Trust**

-   Verify factual accuracy
-   Ensure source attribution
-   Meet regulatory requirements

## Evaluation Dimensions

RAG systems have two main components to evaluate:

### 1. Retrieval Quality

**Context Relevance**: Are retrieved documents relevant to the query?

**Context Recall**: Do we retrieve all relevant documents?

**Context Precision**: What percentage of retrieved documents are relevant?

**Ranking Quality**: Are the most relevant documents ranked highest?

### 2. Generation Quality

**Faithfulness**: Is the response grounded in retrieved context?

**Answer Relevance**: Does the answer address the user's question?

**Completeness**: Does the answer cover all aspects of the question?

**Hallucination Detection**: Does the response include unsupported claims?

## Retrieval Evaluation

### Context Relevance

Measure how relevant retrieved documents are to the query.

```php
<?php

namespace App\Evaluation\Metrics;

class ContextRelevance
{
    /**
     * Calculate average relevance of retrieved context
     *
     * @param array $retrieved Array of retrieved documents with scores
     * @param string $query The search query
     * @return float Relevance score 0.0-1.0
     */
    public function calculate(array $retrieved, string $query): float
    {
        if (empty($retrieved)) {
            return 0.0;
        }

        $scores = array_map(fn($doc) => $doc['score'] ?? 0.0, $retrieved);

        return array_sum($scores) / count($scores);
    }

    /**
     * Calculate relevance using LLM judgment
     */
    public function calculateWithLLM(array $retrieved, string $query): float
    {
        if (empty($retrieved)) {
            return 0.0;
        }

        $relevanceScores = [];

        foreach ($retrieved as $doc) {
            $prompt = <<<PROMPT
            Query: {$query}

            Document: {$doc['content']}

            Rate the relevance of this document to the query on a scale of 0-10.
            Only return a number.
            PROMPT;

            $response = Mindwave::prompt()
                ->section('user', $prompt)
                ->model('gpt-4o-mini')
                ->run();

            $relevanceScores[] = (float) trim($response->content) / 10;
        }

        return array_sum($relevanceScores) / count($relevanceScores);
    }
}
```

**Usage:**

```php
use App\Evaluation\Metrics\ContextRelevance;

$metric = new ContextRelevance();

$retrieved = [
    ['content' => 'Laravel authentication docs...', 'score' => 0.95],
    ['content' => 'Laravel routing docs...', 'score' => 0.65],
    ['content' => 'Vue.js docs...', 'score' => 0.12],
];

$relevance = $metric->calculate($retrieved, 'Laravel authentication');
// Result: 0.57 (average of scores)

$llmRelevance = $metric->calculateWithLLM($retrieved, 'Laravel authentication');
// Result: More nuanced relevance based on LLM judgment
```

### Precision and Recall

Measure retrieval accuracy with ground truth labels.

```php
<?php

namespace App\Evaluation\Metrics;

class RetrievalMetrics
{
    /**
     * Calculate precision: relevant retrieved / total retrieved
     */
    public function precision(array $retrieved, array $relevant): float
    {
        if (empty($retrieved)) {
            return 0.0;
        }

        $retrievedIds = array_column($retrieved, 'id');
        $relevantIds = array_column($relevant, 'id');

        $truePositives = count(array_intersect($retrievedIds, $relevantIds));

        return $truePositives / count($retrievedIds);
    }

    /**
     * Calculate recall: relevant retrieved / total relevant
     */
    public function recall(array $retrieved, array $relevant): float
    {
        if (empty($relevant)) {
            return 0.0;
        }

        $retrievedIds = array_column($retrieved, 'id');
        $relevantIds = array_column($relevant, 'id');

        $truePositives = count(array_intersect($retrievedIds, $relevantIds));

        return $truePositives / count($relevantIds);
    }

    /**
     * Calculate F1 score: harmonic mean of precision and recall
     */
    public function f1Score(array $retrieved, array $relevant): float
    {
        $precision = $this->precision($retrieved, $relevant);
        $recall = $this->recall($retrieved, $relevant);

        if ($precision + $recall == 0) {
            return 0.0;
        }

        return 2 * ($precision * $recall) / ($precision + $recall);
    }

    /**
     * Calculate Mean Reciprocal Rank (MRR)
     */
    public function meanReciprocalRank(array $retrieved, array $relevant): float
    {
        $retrievedIds = array_column($retrieved, 'id');
        $relevantIds = array_column($relevant, 'id');

        foreach ($retrievedIds as $rank => $id) {
            if (in_array($id, $relevantIds)) {
                return 1.0 / ($rank + 1);
            }
        }

        return 0.0;
    }

    /**
     * Calculate Normalized Discounted Cumulative Gain (NDCG)
     */
    public function ndcg(array $retrieved, array $relevanceScores, int $k = null): float
    {
        $k = $k ?? count($retrieved);
        $retrieved = array_slice($retrieved, 0, $k);

        // Calculate DCG
        $dcg = 0.0;
        foreach ($retrieved as $i => $doc) {
            $relevance = $relevanceScores[$doc['id']] ?? 0;
            $dcg += $relevance / log($i + 2, 2);
        }

        // Calculate IDCG (ideal DCG)
        arsort($relevanceScores);
        $idealRelevance = array_slice($relevanceScores, 0, $k);
        $idcg = 0.0;
        foreach ($idealRelevance as $i => $relevance) {
            $idcg += $relevance / log($i + 2, 2);
        }

        return $idcg > 0 ? $dcg / $idcg : 0.0;
    }
}
```

**Usage:**

```php
use App\Evaluation\Metrics\RetrievalMetrics;

$metrics = new RetrievalMetrics();

// Retrieved documents
$retrieved = [
    ['id' => 1, 'content' => 'Doc 1'],
    ['id' => 3, 'content' => 'Doc 3'],
    ['id' => 5, 'content' => 'Doc 5'],
];

// Ground truth relevant documents
$relevant = [
    ['id' => 1],
    ['id' => 2],
    ['id' => 3],
];

$precision = $metrics->precision($retrieved, $relevant);  // 0.67 (2/3)
$recall = $metrics->recall($retrieved, $relevant);        // 0.67 (2/3)
$f1 = $metrics->f1Score($retrieved, $relevant);           // 0.67
```

## Generation Evaluation

### Faithfulness

Measure if the generated answer is supported by retrieved context.

```php
<?php

namespace App\Evaluation\Metrics;

use Mindwave\Mindwave\Facades\Mindwave;

class Faithfulness
{
    /**
     * Check if answer is faithful to context using LLM
     */
    public function evaluate(string $answer, string $context): float
    {
        $prompt = <<<PROMPT
        Context:
        {$context}

        Answer:
        {$answer}

        Evaluate if the answer is fully supported by the context.
        Rate faithfulness on a scale of 0-10 where:
        - 0: Completely unsupported or contradicts context
        - 5: Partially supported
        - 10: Fully supported by context

        Only return a number.
        PROMPT;

        $response = Mindwave::prompt()
            ->section('user', $prompt)
            ->model('gpt-4o')
            ->run();

        return (float) trim($response->content) / 10;
    }

    /**
     * Extract and verify claims from answer
     */
    public function verifyСlaims(string $answer, string $context): array
    {
        // Extract claims
        $claimsPrompt = <<<PROMPT
        Extract factual claims from this answer.
        Return as JSON array of strings.

        Answer: {$answer}
        PROMPT;

        $claimsResponse = Mindwave::prompt()
            ->section('user', $claimsPrompt)
            ->model('gpt-4o-mini')
            ->run();

        $claims = json_decode($claimsResponse->content, true) ?? [];

        // Verify each claim
        $results = [];
        foreach ($claims as $claim) {
            $verifyPrompt = <<<PROMPT
            Context:
            {$context}

            Claim:
            {$claim}

            Is this claim supported by the context?
            Answer "yes", "no", or "partial".
            PROMPT;

            $verification = Mindwave::prompt()
                ->section('user', $verifyPrompt)
                ->model('gpt-4o-mini')
                ->run();

            $results[] = [
                'claim' => $claim,
                'supported' => strtolower(trim($verification->content)),
            ];
        }

        return $results;
    }
}
```

**Usage:**

```php
use App\Evaluation\Metrics\Faithfulness;

$metric = new Faithfulness();

$context = "Laravel uses the Model-View-Controller (MVC) architectural pattern.";
$answer = "Laravel follows the MVC pattern for organizing application code.";

$faithfulness = $metric->evaluate($answer, $context);
// Result: ~1.0 (highly faithful)

$claims = $metric->verifyClaims($answer, $context);
// Result: [['claim' => 'Laravel follows MVC pattern', 'supported' => 'yes']]
```

### Answer Relevance

Measure if the answer addresses the user's question.

```php
<?php

namespace App\Evaluation\Metrics;

use Mindwave\Mindwave\Facades\Mindwave;

class AnswerRelevance
{
    /**
     * Evaluate answer relevance to question
     */
    public function evaluate(string $question, string $answer): float
    {
        $prompt = <<<PROMPT
        Question: {$question}

        Answer: {$answer}

        Rate how well the answer addresses the question on a scale of 0-10.
        Only return a number.
        PROMPT;

        $response = Mindwave::prompt()
            ->section('user', $prompt)
            ->model('gpt-4o-mini')
            ->run();

        return (float) trim($response->content) / 10;
    }

    /**
     * Check if answer is complete
     */
    public function evaluateCompleteness(string $question, string $answer): float
    {
        $prompt = <<<PROMPT
        Question: {$question}

        Answer: {$answer}

        Rate how completely the answer covers all aspects of the question.
        Scale 0-10 where:
        - 0: Missing all key information
        - 5: Covers some aspects
        - 10: Thoroughly covers all aspects

        Only return a number.
        PROMPT;

        $response = Mindwave::prompt()
            ->section('user', $prompt)
            ->model('gpt-4o')
            ->run();

        return (float) trim($response->content) / 10;
    }
}
```

**Usage:**

```php
use App\Evaluation\Metrics\AnswerRelevance;

$metric = new AnswerRelevance();

$question = "How do I configure Laravel caching?";
$answer = "Laravel caching is configured in config/cache.php where you can set the default driver.";

$relevance = $metric->evaluate($question, $answer);
// Result: ~0.8 (good relevance)

$completeness = $metric->evaluateCompleteness($question, $answer);
// Result: ~0.6 (partially complete, missing driver options)
```

### Hallucination Detection

Detect when the model generates unsupported information.

```php
<?php

namespace App\Evaluation\Metrics;

use Mindwave\Mindwave\Facades\Mindwave;

class HallucinationDetector
{
    /**
     * Detect hallucinations in answer
     */
    public function detect(string $answer, string $context): array
    {
        $prompt = <<<PROMPT
        Context (source of truth):
        {$context}

        Answer to check:
        {$answer}

        Identify any statements in the answer that are not supported by the context.
        Return as JSON array of objects: [{"statement": "...", "reason": "..."}]
        If no hallucinations, return empty array.
        PROMPT;

        $response = Mindwave::prompt()
            ->section('user', $prompt)
            ->model('gpt-4o')
            ->run();

        return json_decode($response->content, true) ?? [];
    }

    /**
     * Calculate hallucination rate
     */
    public function hallucinationRate(string $answer, string $context): float
    {
        $hallucinations = $this->detect($answer, $context);

        if (empty($hallucinations)) {
            return 0.0;
        }

        // Count total statements
        $statements = $this->extractStatements($answer);

        return count($hallucinations) / max(count($statements), 1);
    }

    private function extractStatements(string $text): array
    {
        // Simple sentence splitting
        $sentences = preg_split('/[.!?]+/', $text);

        return array_filter(array_map('trim', $sentences));
    }
}
```

**Usage:**

```php
use App\Evaluation\Metrics\HallucinationDetector;

$detector = new HallucinationDetector();

$context = "Laravel was created by Taylor Otwell in 2011.";
$answer = "Laravel was created by Taylor Otwell in 2011 and is written in Ruby.";

$hallucinations = $detector->detect($answer, $context);
// Result: [{"statement": "written in Ruby", "reason": "Not mentioned in context"}]

$rate = $detector->hallucinationRate($answer, $context);
// Result: 0.5 (50% hallucination rate)
```

## Comprehensive Evaluation Framework

Combine all metrics into a unified evaluation framework.

```php
<?php

namespace App\Evaluation;

use App\Evaluation\Metrics\ContextRelevance;
use App\Evaluation\Metrics\RetrievalMetrics;
use App\Evaluation\Metrics\Faithfulness;
use App\Evaluation\Metrics\AnswerRelevance;
use App\Evaluation\Metrics\HallucinationDetector;

class RAGEvaluator
{
    public function __construct(
        private ContextRelevance $contextRelevance,
        private RetrievalMetrics $retrievalMetrics,
        private Faithfulness $faithfulness,
        private AnswerRelevance $answerRelevance,
        private HallucinationDetector $hallucinationDetector
    ) {}

    /**
     * Comprehensive evaluation of RAG system
     */
    public function evaluate(array $testCase): array
    {
        $query = $testCase['query'];
        $retrieved = $testCase['retrieved'];
        $relevantDocs = $testCase['relevant'] ?? [];
        $generatedAnswer = $testCase['answer'];
        $context = $this->formatContext($retrieved);

        return [
            // Retrieval metrics
            'retrieval' => [
                'context_relevance' => $this->contextRelevance->calculate($retrieved, $query),
                'precision' => $this->retrievalMetrics->precision($retrieved, $relevantDocs),
                'recall' => $this->retrievalMetrics->recall($retrieved, $relevantDocs),
                'f1_score' => $this->retrievalMetrics->f1Score($retrieved, $relevantDocs),
                'mrr' => $this->retrievalMetrics->meanReciprocalRank($retrieved, $relevantDocs),
            ],

            // Generation metrics
            'generation' => [
                'faithfulness' => $this->faithfulness->evaluate($generatedAnswer, $context),
                'answer_relevance' => $this->answerRelevance->evaluate($query, $generatedAnswer),
                'completeness' => $this->answerRelevance->evaluateCompleteness($query, $generatedAnswer),
                'hallucination_rate' => $this->hallucinationDetector->hallucinationRate($generatedAnswer, $context),
            ],

            // Overall score (weighted average)
            'overall_score' => $this->calculateOverallScore([
                'context_relevance' => $this->contextRelevance->calculate($retrieved, $query),
                'faithfulness' => $this->faithfulness->evaluate($generatedAnswer, $context),
                'answer_relevance' => $this->answerRelevance->evaluate($query, $generatedAnswer),
            ]),
        ];
    }

    /**
     * Batch evaluate multiple test cases
     */
    public function batchEvaluate(array $testCases): array
    {
        $results = [];

        foreach ($testCases as $testCase) {
            $results[] = $this->evaluate($testCase);
        }

        return [
            'individual_results' => $results,
            'aggregate' => $this->aggregateResults($results),
        ];
    }

    private function formatContext(array $retrieved): string
    {
        return collect($retrieved)
            ->pluck('content')
            ->join("\n\n---\n\n");
    }

    private function calculateOverallScore(array $metrics): float
    {
        // Weighted average
        $weights = [
            'context_relevance' => 0.3,
            'faithfulness' => 0.4,
            'answer_relevance' => 0.3,
        ];

        $score = 0.0;
        foreach ($metrics as $key => $value) {
            $score += $value * ($weights[$key] ?? 0);
        }

        return $score;
    }

    private function aggregateResults(array $results): array
    {
        $aggregate = [
            'retrieval' => [],
            'generation' => [],
            'overall_score' => 0.0,
        ];

        foreach ($results as $result) {
            foreach ($result['retrieval'] as $metric => $value) {
                $aggregate['retrieval'][$metric][] = $value;
            }

            foreach ($result['generation'] as $metric => $value) {
                $aggregate['generation'][$metric][] = $value;
            }

            $aggregate['overall_score'] += $result['overall_score'];
        }

        // Calculate averages
        foreach ($aggregate['retrieval'] as $metric => $values) {
            $aggregate['retrieval'][$metric] = array_sum($values) / count($values);
        }

        foreach ($aggregate['generation'] as $metric => $values) {
            $aggregate['generation'][$metric] = array_sum($values) / count($values);
        }

        $aggregate['overall_score'] /= count($results);

        return $aggregate;
    }
}
```

**Usage:**

```php
use App\Evaluation\RAGEvaluator;

$evaluator = app(RAGEvaluator::class);

$testCase = [
    'query' => 'How do I configure Laravel caching?',
    'retrieved' => [
        ['id' => 1, 'content' => 'Laravel caching config...', 'score' => 0.95],
        ['id' => 2, 'content' => 'Cache drivers in Laravel...', 'score' => 0.85],
    ],
    'relevant' => [
        ['id' => 1],
        ['id' => 2],
        ['id' => 3],  // Not retrieved
    ],
    'answer' => 'Configure Laravel caching in config/cache.php...',
];

$results = $evaluator->evaluate($testCase);

print_r($results);
/*
[
    'retrieval' => [
        'context_relevance' => 0.90,
        'precision' => 1.0,
        'recall' => 0.67,
        'f1_score' => 0.80,
        'mrr' => 1.0,
    ],
    'generation' => [
        'faithfulness' => 0.95,
        'answer_relevance' => 0.85,
        'completeness' => 0.70,
        'hallucination_rate' => 0.0,
    ],
    'overall_score' => 0.88,
]
*/
```

## Test Dataset Creation

Create comprehensive test datasets for RAG evaluation.

```php
<?php

namespace App\Evaluation;

class TestDatasetBuilder
{
    /**
     * Create test dataset from existing queries
     */
    public function fromQueryLog(array $queries, int $limit = 100): array
    {
        $dataset = [];

        foreach (array_slice($queries, 0, $limit) as $queryData) {
            $dataset[] = [
                'query' => $queryData['query'],
                'expected_answer' => $queryData['answer'] ?? null,
                'relevant_docs' => $queryData['relevant_docs'] ?? [],
            ];
        }

        return $dataset;
    }

    /**
     * Generate synthetic test cases
     */
    public function generateSynthetic(array $documents, int $count = 50): array
    {
        $dataset = [];

        foreach (array_slice($documents, 0, $count) as $doc) {
            // Generate question from document
            $question = $this->generateQuestion($doc['content']);

            $dataset[] = [
                'query' => $question,
                'relevant_docs' => [['id' => $doc['id']]],
                'expected_answer' => $this->generateExpectedAnswer($doc['content'], $question),
            ];
        }

        return $dataset;
    }

    private function generateQuestion(string $content): string
    {
        $prompt = <<<PROMPT
        Generate a question that can be answered using this content:

        {$content}

        Return only the question.
        PROMPT;

        $response = Mindwave::prompt()
            ->section('user', $prompt)
            ->model('gpt-4o-mini')
            ->run();

        return trim($response->content);
    }

    private function generateExpectedAnswer(string $content, string $question): string
    {
        $prompt = <<<PROMPT
        Content:
        {$content}

        Question:
        {$question}

        Provide a concise answer based only on the content.
        PROMPT;

        $response = Mindwave::prompt()
            ->section('user', $prompt)
            ->model('gpt-4o-mini')
            ->run();

        return trim($response->content);
    }
}
```

**Usage:**

```php
use App\Evaluation\TestDatasetBuilder;

$builder = new TestDatasetBuilder();

// From existing queries
$dataset = $builder->fromQueryLog($queryLogs, limit: 100);

// Generate synthetic dataset
$documents = Article::published()->get()->toArray();
$syntheticDataset = $builder->generateSynthetic($documents, count: 50);

// Save for later use
Storage::put('evaluation/test_dataset.json', json_encode($dataset));
```

## A/B Testing

Compare different RAG configurations.

```php
<?php

namespace App\Evaluation;

class ABTest
{
    /**
     * Run A/B test between two RAG configurations
     */
    public function run(
        callable $configA,
        callable $configB,
        array $testCases,
        RAGEvaluator $evaluator
    ): array {
        $resultsA = [];
        $resultsB = [];

        foreach ($testCases as $testCase) {
            // Test configuration A
            $responseA = $configA($testCase['query']);
            $resultsA[] = $evaluator->evaluate([
                ...$testCase,
                'retrieved' => $responseA['retrieved'],
                'answer' => $responseA['answer'],
            ]);

            // Test configuration B
            $responseB = $configB($testCase['query']);
            $resultsB[] = $evaluator->evaluate([
                ...$testCase,
                'retrieved' => $responseB['retrieved'],
                'answer' => $responseB['answer'],
            ]);
        }

        return [
            'config_a' => $this->summarize($resultsA),
            'config_b' => $this->summarize($resultsB),
            'winner' => $this->determineWinner($resultsA, $resultsB),
            'statistical_significance' => $this->calculateSignificance($resultsA, $resultsB),
        ];
    }

    private function summarize(array $results): array
    {
        $scores = array_column($results, 'overall_score');

        return [
            'mean' => array_sum($scores) / count($scores),
            'median' => $this->median($scores),
            'std_dev' => $this->standardDeviation($scores),
            'min' => min($scores),
            'max' => max($scores),
        ];
    }

    private function determineWinner(array $resultsA, array $resultsB): string
    {
        $meanA = array_sum(array_column($resultsA, 'overall_score')) / count($resultsA);
        $meanB = array_sum(array_column($resultsB, 'overall_score')) / count($resultsB);

        if ($meanA > $meanB) {
            return 'config_a';
        } elseif ($meanB > $meanA) {
            return 'config_b';
        }

        return 'tie';
    }

    private function calculateSignificance(array $resultsA, array $resultsB): float
    {
        // T-test for statistical significance
        $scoresA = array_column($resultsA, 'overall_score');
        $scoresB = array_column($resultsB, 'overall_score');

        $meanA = array_sum($scoresA) / count($scoresA);
        $meanB = array_sum($scoresB) / count($scoresB);

        $varA = $this->variance($scoresA);
        $varB = $this->variance($scoresB);

        $n = count($scoresA);
        $t = ($meanA - $meanB) / sqrt(($varA + $varB) / $n);

        // Rough p-value estimation
        return abs($t) > 2.0 ? 0.05 : 0.1;  // Simplified for example
    }

    private function median(array $values): float
    {
        sort($values);
        $count = count($values);
        $middle = floor($count / 2);

        if ($count % 2 == 0) {
            return ($values[$middle - 1] + $values[$middle]) / 2;
        }

        return $values[$middle];
    }

    private function standardDeviation(array $values): float
    {
        $variance = $this->variance($values);

        return sqrt($variance);
    }

    private function variance(array $values): float
    {
        $mean = array_sum($values) / count($values);
        $squaredDiffs = array_map(fn($v) => pow($v - $mean, 2), $values);

        return array_sum($squaredDiffs) / count($values);
    }
}
```

**Usage:**

```php
use App\Evaluation\ABTest;

$abTest = new ABTest();

// Configuration A: Vector search only
$configA = function($query) {
    return [
        'retrieved' => $vectorSource->search($query, 5),
        'answer' => generateAnswer($query, $vectorSource),
    ];
};

// Configuration B: Hybrid (vector + keyword)
$configB = function($query) use ($pipeline) {
    return [
        'retrieved' => $pipeline->search($query, 5),
        'answer' => generateAnswer($query, $pipeline),
    ];
};

$results = $abTest->run($configA, $configB, $testDataset, $evaluator);

print_r($results);
/*
[
    'config_a' => ['mean' => 0.75, 'std_dev' => 0.12, ...],
    'config_b' => ['mean' => 0.82, 'std_dev' => 0.10, ...],
    'winner' => 'config_b',
    'statistical_significance' => 0.05,
]
*/
```

## Production Monitoring

Monitor RAG performance in production.

```php
<?php

namespace App\Monitoring;

use App\Evaluation\Metrics\Faithfulness;
use App\Evaluation\Metrics\AnswerRelevance;

class RAGMonitor
{
    public function __construct(
        private Faithfulness $faithfulness,
        private AnswerRelevance $answerRelevance
    ) {}

    /**
     * Log RAG interaction for monitoring
     */
    public function logInteraction(array $data): void
    {
        DB::table('rag_interactions')->insert([
            'query' => $data['query'],
            'retrieved_count' => count($data['retrieved']),
            'answer' => $data['answer'],
            'faithfulness_score' => $this->faithfulness->evaluate(
                $data['answer'],
                $this->formatContext($data['retrieved'])
            ),
            'relevance_score' => $this->answerRelevance->evaluate(
                $data['query'],
                $data['answer']
            ),
            'response_time_ms' => $data['response_time'] ?? null,
            'user_feedback' => $data['feedback'] ?? null,
            'created_at' => now(),
        ]);
    }

    /**
     * Get performance metrics over time period
     */
    public function getMetrics(int $days = 7): array
    {
        $startDate = now()->subDays($days);

        $stats = DB::table('rag_interactions')
            ->where('created_at', '>=', $startDate)
            ->select([
                DB::raw('AVG(faithfulness_score) as avg_faithfulness'),
                DB::raw('AVG(relevance_score) as avg_relevance'),
                DB::raw('AVG(response_time_ms) as avg_response_time'),
                DB::raw('COUNT(*) as total_interactions'),
                DB::raw('SUM(CASE WHEN user_feedback = "positive" THEN 1 ELSE 0 END) as positive_feedback'),
            ])
            ->first();

        return [
            'avg_faithfulness' => round($stats->avg_faithfulness, 3),
            'avg_relevance' => round($stats->avg_relevance, 3),
            'avg_response_time_ms' => round($stats->avg_response_time),
            'total_interactions' => $stats->total_interactions,
            'positive_feedback_rate' => $stats->total_interactions > 0
                ? $stats->positive_feedback / $stats->total_interactions
                : 0,
        ];
    }

    /**
     * Detect performance degradation
     */
    public function detectDegradation(): array
    {
        $current = $this->getMetrics(days: 1);
        $baseline = $this->getMetrics(days: 30);

        $alerts = [];

        if ($current['avg_faithfulness'] < $baseline['avg_faithfulness'] * 0.9) {
            $alerts[] = [
                'metric' => 'faithfulness',
                'severity' => 'high',
                'message' => 'Faithfulness dropped below 90% of baseline',
                'current' => $current['avg_faithfulness'],
                'baseline' => $baseline['avg_faithfulness'],
            ];
        }

        if ($current['avg_relevance'] < $baseline['avg_relevance'] * 0.9) {
            $alerts[] = [
                'metric' => 'relevance',
                'severity' => 'medium',
                'message' => 'Relevance dropped below 90% of baseline',
                'current' => $current['avg_relevance'],
                'baseline' => $baseline['avg_relevance'],
            ];
        }

        return $alerts;
    }

    private function formatContext(array $retrieved): string
    {
        return collect($retrieved)
            ->pluck('content')
            ->join("\n\n---\n\n");
    }
}
```

**Usage:**

```php
use App\Monitoring\RAGMonitor;

$monitor = app(RAGMonitor::class);

// Log each interaction
$monitor->logInteraction([
    'query' => 'How do I configure caching?',
    'retrieved' => $retrievedDocs,
    'answer' => $generatedAnswer,
    'response_time' => 450,
    'feedback' => 'positive',
]);

// Check metrics
$metrics = $monitor->getMetrics(days: 7);
print_r($metrics);

// Detect issues
$alerts = $monitor->detectDegradation();
if (!empty($alerts)) {
    foreach ($alerts as $alert) {
        Log::warning('RAG performance degradation detected', $alert);
    }
}
```

## Best Practices

### 1. Start with Simple Metrics

Begin with basic metrics and add complexity as needed:

```php
// Start simple
$avgRelevance = array_sum(array_column($retrieved, 'score')) / count($retrieved);

// Add complexity later
$faithfulness = $faithfulnessMetric->evaluate($answer, $context);
```

### 2. Use Multiple Metrics

No single metric tells the full story:

```php
$evaluation = [
    'retrieval_quality' => $retrievalMetrics->f1Score($retrieved, $relevant),
    'generation_faithfulness' => $faithfulness->evaluate($answer, $context),
    'answer_relevance' => $answerRelevance->evaluate($question, $answer),
    'user_satisfaction' => $userFeedbackScore,
];
```

### 3. Automate Testing

Integrate evaluation into CI/CD:

```php
// tests/Feature/RAGEvaluationTest.php
class RAGEvaluationTest extends TestCase
{
    /** @test */
    public function rag_system_meets_quality_thresholds()
    {
        $evaluator = app(RAGEvaluator::class);
        $testCases = json_decode(file_get_contents('tests/fixtures/rag_test_cases.json'), true);

        $results = $evaluator->batchEvaluate($testCases);

        $this->assertGreaterThan(0.8, $results['aggregate']['overall_score']);
        $this->assertGreaterThan(0.7, $results['aggregate']['retrieval']['precision']);
        $this->assertGreaterThan(0.85, $results['aggregate']['generation']['faithfulness']);
    }
}
```

### 4. Monitor in Production

Continuous monitoring catches regressions:

```php
// Schedule in app/Console/Kernel.php
protected function schedule(Schedule $schedule)
{
    $schedule->call(function () {
        $monitor = app(RAGMonitor::class);
        $alerts = $monitor->detectDegradation();

        if (!empty($alerts)) {
            Notification::route('slack', config('slack.webhook'))
                ->notify(new RAGPerformanceAlert($alerts));
        }
    })->hourly();
}
```

### 5. Iterate Based on Data

Use evaluation results to guide improvements:

```php
// Analyze weak spots
$results = $evaluator->batchEvaluate($testCases);

if ($results['aggregate']['retrieval']['recall'] < 0.7) {
    Log::info('Low recall - consider increasing retrieval limit');
}

if ($results['aggregate']['generation']['hallucination_rate'] > 0.1) {
    Log::warning('High hallucination rate - review prompts and context');
}
```

## Related Documentation

-   [RAG Overview](/docs/rag/overview) - RAG architecture and concepts
-   [Context Pipeline](/docs/rag/context-pipeline) - Multi-source aggregation
-   [Custom Sources](/docs/rag/custom-sources) - Build custom retrievers
-   [Observability](/docs/observability/overview) - System monitoring and tracing
