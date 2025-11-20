# Testing AI Applications

Testing LLM-powered applications requires different strategies than traditional software testing. This guide covers comprehensive testing approaches for Mindwave applications, from unit tests to end-to-end RAG system validation.

## Overview

AI application testing presents unique challenges:

- **Non-deterministic outputs** - LLMs can produce different responses for identical inputs
- **Complex dependencies** - RAG systems involve embeddings, vector stores, and retrieval pipelines
- **Cost considerations** - Real API calls during testing add up quickly
- **Quality metrics** - Traditional assertions don't capture semantic correctness

This guide provides practical patterns for:

- **Unit Testing** - Test individual components in isolation
- **Integration Testing** - Test component interactions without real APIs
- **Mocking Strategies** - Simulate LLM responses efficiently
- **RAG Testing** - Validate retrieval quality and accuracy
- **Evaluation Metrics** - Measure semantic correctness
- **CI/CD Integration** - Automate testing in your pipeline

## Testing Strategies

### 1. Unit Testing with Fake Driver

The fake LLM driver allows fast, deterministic testing without API calls.

#### Basic Setup

```php
<?php

namespace Tests\Feature;

use Tests\TestCase;
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\Testing\Fakes\FakeLLM;

class ChatbotTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Use fake driver for testing
        config(['mindwave-llm.default' => 'fake']);
    }

    /** @test */
    public function it_generates_a_greeting()
    {
        $response = Mindwave::llm()
            ->generateText('Say hello');

        $this->assertNotEmpty($response);
        $this->assertIsString($response);
    }
}
```

#### Controlling Fake Responses

```php
use Mindwave\Mindwave\Testing\Fakes\FakeLLM;

/** @test */
public function it_summarizes_text()
{
    // Set a specific fake response
    FakeLLM::fake([
        'response' => 'This is a test summary.',
        'usage' => [
            'prompt_tokens' => 50,
            'completion_tokens' => 10,
            'total_tokens' => 60,
        ],
    ]);

    $service = new DocumentSummarizer();
    $summary = $service->summarize('Long document text...');

    $this->assertEquals('This is a test summary.', $summary);
}
```

#### Testing Multiple Calls

```php
/** @test */
public function it_handles_conversation()
{
    // Queue multiple fake responses
    FakeLLM::fake([
        ['response' => 'Hello! How can I help you?'],
        ['response' => 'I can answer questions about Laravel.'],
        ['response' => 'Laravel is a PHP framework.'],
    ]);

    $chatbot = new Chatbot();

    $response1 = $chatbot->sendMessage('Hi');
    $response2 = $chatbot->sendMessage('What can you do?');
    $response3 = $chatbot->sendMessage('What is Laravel?');

    $this->assertEquals('Hello! How can I help you?', $response1);
    $this->assertEquals('I can answer questions about Laravel.', $response2);
    $this->assertEquals('Laravel is a PHP framework.', $response3);
}
```

### 2. Integration Testing

Test component interactions while mocking expensive external calls.

#### Testing PromptComposer

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\Testing\Fakes\FakeLLM;

/** @test */
public function it_builds_prompt_with_context()
{
    FakeLLM::fake();

    $composer = Mindwave::prompt()
        ->section('system', 'You are helpful')
        ->section('context', $this->getSampleContext())
        ->section('user', 'What is Laravel?')
        ->model('gpt-4');

    // Assert prompt structure
    $messages = $composer->toMessages();

    $this->assertCount(3, $messages);
    $this->assertEquals('system', $messages[0]['role']);
    $this->assertEquals('You are helpful', $messages[0]['content']);
}

/** @test */
public function it_fits_prompt_to_token_limit()
{
    FakeLLM::fake();

    $largeContext = str_repeat('Context information. ', 1000);

    $composer = Mindwave::prompt()
        ->section('system', 'You are helpful', priority: 100)
        ->section('context', $largeContext, priority: 50, shrinker: 'truncate')
        ->section('user', 'Question?', priority: 100)
        ->model('gpt-4')
        ->reserveOutputTokens(1000)
        ->fit();

    $tokenCount = $composer->getTokenCount();

    // GPT-4 has 8K context, minus 1K reserved = 7K max
    $this->assertLessThanOrEqual(7000, $tokenCount);
}
```

#### Testing Context Discovery

```php
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;

/** @test */
public function it_retrieves_relevant_documents()
{
    $source = TntSearchSource::fromArray([
        'Laravel is a PHP web framework',
        'Vue.js is a JavaScript framework',
        'Docker is a containerization platform',
    ]);

    $source->initialize();
    $results = $source->search('PHP framework', limit: 3);

    $this->assertGreaterThan(0, $results->count());
    $this->assertStringContainsString('Laravel', $results->first()->content);
    $this->assertGreaterThan(0.5, $results->first()->score);
}

/** @test */
public function it_deduplicates_pipeline_results()
{
    $source1 = TntSearchSource::fromArray([
        'Laravel is a PHP framework',
        'Laravel provides Eloquent ORM',
    ], name: 'source1');

    $source2 = TntSearchSource::fromArray([
        'Laravel is a PHP framework', // Duplicate
        'Laravel uses Blade templates',
    ], name: 'source2');

    $pipeline = (new ContextPipeline)
        ->addSource($source1)
        ->addSource($source2)
        ->deduplicate(true);

    $results = $pipeline->search('Laravel', limit: 10);

    // Should have 3 unique results, not 4
    $this->assertCount(3, $results);
}
```

### 3. Mocking External APIs

Mock LLM provider APIs for integration tests that need realistic behavior.

#### Using HTTP Fake

```php
use Illuminate\Support\Facades\Http;

/** @test */
public function it_handles_openai_api_response()
{
    Http::fake([
        'api.openai.com/*' => Http::response([
            'id' => 'chatcmpl-test',
            'object' => 'chat.completion',
            'created' => time(),
            'model' => 'gpt-4',
            'choices' => [
                [
                    'index' => 0,
                    'message' => [
                        'role' => 'assistant',
                        'content' => 'This is a test response.',
                    ],
                    'finish_reason' => 'stop',
                ],
            ],
            'usage' => [
                'prompt_tokens' => 20,
                'completion_tokens' => 10,
                'total_tokens' => 30,
            ],
        ], 200),
    ]);

    config(['mindwave-llm.default' => 'openai']);

    $response = Mindwave::llm()
        ->generateText('Test prompt');

    $this->assertEquals('This is a test response.', $response);

    // Verify request was made
    Http::assertSent(function ($request) {
        return $request->url() === 'https://api.openai.com/v1/chat/completions'
            && $request['model'] === 'gpt-4';
    });
}
```

#### Mocking Vector Stores

```php
use Mindwave\Mindwave\Facades\Mindwave;

/** @test */
public function it_searches_brain_for_documents()
{
    // Use array driver for testing (in-memory)
    config(['mindwave-vectorstore.default' => 'array']);

    $brain = Mindwave::brain('test');

    // Populate with test data
    $brain->consume(Document::make('Laravel provides Eloquent ORM'));
    $brain->consume(Document::make('Vue.js is a progressive framework'));

    $results = $brain->search('ORM', count: 1);

    $this->assertCount(1, $results);
    $this->assertStringContainsString('Eloquent', $results[0]->content());
}
```

### 4. Testing RAG Systems

Comprehensive testing for retrieval-augmented generation pipelines.

#### Testing Retrieval Quality

```php
class RAGRetrievalTest extends TestCase
{
    protected TntSearchSource $source;

    protected function setUp(): void
    {
        parent::setUp();

        $this->source = TntSearchSource::fromArray([
            'Laravel Eloquent provides an ActiveRecord ORM implementation',
            'Vue.js uses a virtual DOM for efficient rendering',
            'Docker containers package applications with dependencies',
            'Kubernetes orchestrates containerized applications',
            'Laravel routing allows you to define URL patterns',
        ], name: 'test-docs');

        $this->source->initialize();
    }

    /** @test */
    public function it_retrieves_relevant_documents_for_query()
    {
        $results = $this->source->search('ORM database', limit: 2);

        // Should return Eloquent document with high score
        $this->assertGreaterThan(0, $results->count());
        $this->assertStringContainsString('Eloquent', $results->first()->content);
        $this->assertGreaterThan(0.6, $results->first()->score);
    }

    /** @test */
    public function it_ranks_results_by_relevance()
    {
        $results = $this->source->search('container', limit: 3);

        $scores = $results->pluck('score')->toArray();

        // Scores should be in descending order
        $this->assertEquals($scores, array_values(rsort($scores)));

        // Docker should rank higher than Kubernetes for "container" query
        $dockerResult = $results->firstWhere(fn($r) =>
            str_contains($r->content, 'Docker')
        );

        $this->assertNotNull($dockerResult);
        $this->assertGreaterThan(0.5, $dockerResult->score);
    }

    /** @test */
    public function it_returns_empty_for_irrelevant_query()
    {
        $results = $this->source->search('quantum physics', limit: 5);

        // Should return results but with low scores
        if ($results->count() > 0) {
            $this->assertLessThan(0.3, $results->first()->score);
        }
    }

    protected function tearDown(): void
    {
        $this->source->cleanup();
        parent::tearDown();
    }
}
```

#### Testing End-to-End RAG

```php
class DocumentQATest extends TestCase
{
    /** @test */
    public function it_answers_questions_from_documents()
    {
        // Setup: Use fake LLM with controlled response
        FakeLLM::fake([
            'response' => 'Eloquent is Laravel\'s ORM that provides an ActiveRecord implementation.',
        ]);

        // Populate knowledge base
        $source = TntSearchSource::fromArray([
            'Laravel Eloquent provides an ActiveRecord ORM implementation',
            'Eloquent allows you to interact with databases using models',
            'Each database table has a corresponding Model class',
        ]);

        // Execute RAG pipeline
        $response = Mindwave::prompt()
            ->section('system', 'Answer based on the provided context.')
            ->context($source, query: 'What is Eloquent?', limit: 2)
            ->section('user', 'What is Eloquent ORM?')
            ->run();

        // Assertions
        $this->assertStringContainsString('Eloquent', $response->content);
        $this->assertStringContainsString('ORM', $response->content);

        // Verify context was injected
        $prompt = Mindwave::prompt()
            ->context($source, query: 'What is Eloquent?', limit: 2)
            ->toMessages();

        $this->assertCount(1, array_filter($prompt, fn($m) =>
            str_contains($m['content'], 'Laravel Eloquent')
        ));
    }
}
```

### 5. Snapshot Testing

Test LLM outputs against saved snapshots to detect regressions.

#### Using Spatie's Snapshot Package

```bash
composer require --dev spatie/phpunit-snapshot-assertions
```

```php
use Spatie\Snapshots\MatchesSnapshots;

class LLMOutputTest extends TestCase
{
    use MatchesSnapshots;

    /** @test */
    public function it_generates_consistent_summary()
    {
        FakeLLM::fake([
            'response' => 'Laravel is a PHP web framework with expressive syntax.',
        ]);

        $summarizer = new DocumentSummarizer();
        $summary = $summarizer->summarize($this->getSampleDocument());

        // First run creates snapshot, subsequent runs compare
        $this->assertMatchesSnapshot($summary);
    }

    /** @test */
    public function it_generates_consistent_prompt_structure()
    {
        $composer = Mindwave::prompt()
            ->section('system', 'You are helpful')
            ->section('user', 'Hello')
            ->model('gpt-4');

        $messages = $composer->toMessages();

        // Snapshot the prompt structure
        $this->assertMatchesJsonSnapshot($messages);
    }
}
```

### 6. Testing with Real APIs (Sparingly)

Occasionally test with real LLM APIs to validate integration.

#### Conditional Real API Tests

```php
/**
 * @group real-api
 * @group slow
 */
class RealAPITest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (!env('RUN_REAL_API_TESTS')) {
            $this->markTestSkipped('Real API tests disabled');
        }

        if (!config('mindwave-llm.llms.openai.api_key')) {
            $this->markTestSkipped('OpenAI API key not configured');
        }
    }

    /** @test */
    public function it_generates_text_with_real_openai()
    {
        config(['mindwave-llm.default' => 'openai']);

        $response = Mindwave::llm()
            ->model('gpt-3.5-turbo') // Use cheap model
            ->generateText('Say "test successful" and nothing else');

        $this->assertStringContainsString('test', strtolower($response));
        $this->assertLessThan(50, strlen($response)); // Should be short
    }

    /** @test */
    public function it_tracks_real_api_costs()
    {
        $trace = null;

        Event::listen(LlmResponseCompleted::class, function($event) use (&$trace) {
            $trace = $event;
        });

        Mindwave::llm()->generateText('Test');

        $this->assertNotNull($trace);
        $this->assertGreaterThan(0, $trace->costEstimate);
        $this->assertGreaterThan(0, $trace->getTotalTokens());
    }
}
```

**Run real API tests selectively:**

```bash
# Skip real API tests (default)
vendor/bin/phpunit

# Run only real API tests
RUN_REAL_API_TESTS=true vendor/bin/phpunit --group=real-api

# Exclude slow tests in CI
vendor/bin/phpunit --exclude-group=slow
```

## Evaluation Metrics

### 1. Semantic Similarity

Test if outputs are semantically correct even with different wording.

```php
use Mindwave\Mindwave\Facades\Mindwave;

class SemanticTest extends TestCase
{
    /**
     * Check if two texts are semantically similar using embeddings
     */
    protected function assertSemanticallySimilar(
        string $text1,
        string $text2,
        float $threshold = 0.8
    ): void {
        $embedding1 = Mindwave::embeddings()->embedText($text1);
        $embedding2 = Mindwave::embeddings()->embedText($text2);

        $similarity = $this->cosineSimilarity(
            $embedding1->toArray(),
            $embedding2->toArray()
        );

        $this->assertGreaterThan(
            $threshold,
            $similarity,
            "Texts are not semantically similar (similarity: {$similarity})"
        );
    }

    protected function cosineSimilarity(array $a, array $b): float
    {
        $dotProduct = array_sum(array_map(fn($i, $j) => $i * $j, $a, $b));
        $magnitudeA = sqrt(array_sum(array_map(fn($i) => $i * $i, $a)));
        $magnitudeB = sqrt(array_sum(array_map(fn($i) => $i * $i, $b)));

        return $dotProduct / ($magnitudeA * $magnitudeB);
    }

    /** @test */
    public function it_generates_semantically_correct_answer()
    {
        FakeLLM::fake([
            'response' => 'Laravel is a PHP framework for building web applications.',
        ]);

        $answer = $this->askQuestion('What is Laravel?');

        $expectedMeaning = 'Laravel is a PHP web framework';

        // Different words, same meaning should pass
        $this->assertSemanticallySimilar($answer, $expectedMeaning);
    }
}
```

### 2. Response Quality Metrics

```php
class ResponseQualityTest extends TestCase
{
    /**
     * Measure response quality using multiple metrics
     */
    protected function assertQualityResponse(string $response): void
    {
        // Length check
        $this->assertGreaterThan(10, strlen($response), 'Response too short');
        $this->assertLessThan(5000, strlen($response), 'Response too long');

        // Coherence check - no repeated words
        $words = str_word_count($response, 1);
        $uniqueWords = array_unique($words);
        $repetitionRatio = count($words) > 0 ? count($uniqueWords) / count($words) : 0;
        $this->assertGreaterThan(0.6, $repetitionRatio, 'Too much repetition');

        // Basic structure check
        $this->assertMatchesRegularExpression('/[.!?]$/', $response, 'Should end with punctuation');

        // No common error patterns
        $this->assertStringNotContainsString('I apologize', $response);
        $this->assertStringNotContainsString('I cannot', $response);
    }

    /** @test */
    public function it_generates_quality_response()
    {
        FakeLLM::fake([
            'response' => 'Laravel is a modern PHP framework that provides elegant syntax and powerful features for web development. It includes routing, ORM, authentication, and much more.',
        ]);

        $response = Mindwave::llm()->generateText('Describe Laravel');

        $this->assertQualityResponse($response);
    }
}
```

### 3. Retrieval Evaluation

```php
class RetrievalEvaluationTest extends TestCase
{
    /**
     * Precision@K: What percentage of retrieved docs are relevant?
     */
    protected function precisionAtK(
        array $retrieved,
        array $relevant,
        int $k
    ): float {
        $topK = array_slice($retrieved, 0, $k);
        $relevantInTopK = array_intersect($topK, $relevant);

        return count($topK) > 0 ? count($relevantInTopK) / count($topK) : 0;
    }

    /**
     * Recall@K: What percentage of relevant docs were retrieved?
     */
    protected function recallAtK(
        array $retrieved,
        array $relevant,
        int $k
    ): float {
        $topK = array_slice($retrieved, 0, $k);
        $relevantInTopK = array_intersect($topK, $relevant);

        return count($relevant) > 0 ? count($relevantInTopK) / count($relevant) : 0;
    }

    /** @test */
    public function it_achieves_good_precision_and_recall()
    {
        $source = TntSearchSource::fromArray([
            'Laravel Eloquent ORM',
            'Laravel Routing System',
            'Vue.js Framework',
            'React Framework',
            'Laravel Blade Templates',
        ]);

        $results = $source->search('Laravel', limit: 5);

        $retrieved = $results->pluck('content')->toArray();
        $relevant = [
            'Laravel Eloquent ORM',
            'Laravel Routing System',
            'Laravel Blade Templates',
        ];

        $precision = $this->precisionAtK($retrieved, $relevant, 3);
        $recall = $this->recallAtK($retrieved, $relevant, 3);

        // At least 80% precision
        $this->assertGreaterThan(0.8, $precision);

        // At least 66% recall (2 out of 3 relevant docs)
        $this->assertGreaterThan(0.66, $recall);
    }
}
```

## Testing Best Practices

### 1. Use Test Doubles Appropriately

**Good Practice:**

```php
// Unit test - use fake driver
public function test_service_formats_response()
{
    FakeLLM::fake(['response' => 'Test response']);

    $service = new ChatService();
    $formatted = $service->formatResponse('input');

    $this->assertStringStartsWith('[Bot]:', $formatted);
}

// Integration test - use real driver with mocked HTTP
public function test_openai_integration()
{
    Http::fake([...]);
    config(['mindwave-llm.default' => 'openai']);

    $response = Mindwave::llm()->generateText('test');

    $this->assertNotEmpty($response);
}
```

**Bad Practice:**

```php
// Don't use real API in unit tests
public function test_service_formats_response()
{
    config(['mindwave-llm.default' => 'openai']); // ❌ Slow and costs money

    $service = new ChatService();
    $formatted = $service->formatResponse('input');

    $this->assertStringStartsWith('[Bot]:', $formatted);
}
```

### 2. Test Edge Cases

```php
class EdgeCaseTest extends TestCase
{
    /** @test */
    public function it_handles_empty_context()
    {
        FakeLLM::fake(['response' => 'No context provided']);

        $response = Mindwave::prompt()
            ->section('system', 'You are helpful')
            ->context('') // Empty context
            ->section('user', 'Question')
            ->run();

        $this->assertNotEmpty($response->content);
    }

    /** @test */
    public function it_handles_very_long_input()
    {
        $longText = str_repeat('Word ', 10000);

        FakeLLM::fake(['response' => 'Processed long text']);

        $composer = Mindwave::prompt()
            ->section('content', $longText, shrinker: 'truncate')
            ->model('gpt-4')
            ->reserveOutputTokens(500)
            ->fit();

        // Should not exceed token limit
        $this->assertLessThanOrEqual(7500, $composer->getTokenCount());
    }

    /** @test */
    public function it_handles_special_characters()
    {
        $special = "Test with émojis 🚀 and spëcial çhars";

        FakeLLM::fake(['response' => 'Processed special chars']);

        $response = Mindwave::llm()->generateText($special);

        $this->assertNotEmpty($response);
    }

    /** @test */
    public function it_handles_api_failures_gracefully()
    {
        Http::fake([
            'api.openai.com/*' => Http::response(null, 500),
        ]);

        config(['mindwave-llm.default' => 'openai']);

        $this->expectException(\Exception::class);

        Mindwave::llm()->generateText('test');
    }
}
```

### 3. Test Cost Tracking

```php
class CostTrackingTest extends TestCase
{
    /** @test */
    public function it_tracks_token_usage()
    {
        FakeLLM::fake([
            'response' => 'Test response',
            'usage' => [
                'prompt_tokens' => 100,
                'completion_tokens' => 50,
                'total_tokens' => 150,
            ],
        ]);

        $trace = null;
        Event::listen(LlmResponseCompleted::class, function($event) use (&$trace) {
            $trace = $event;
        });

        Mindwave::llm()->generateText('Test prompt');

        $this->assertEquals(100, $trace->getInputTokens());
        $this->assertEquals(50, $trace->getOutputTokens());
        $this->assertEquals(150, $trace->getTotalTokens());
    }

    /** @test */
    public function it_estimates_costs_correctly()
    {
        config([
            'mindwave-tracing.cost_estimation.enabled' => true,
            'mindwave-tracing.cost_estimation.pricing.openai.gpt-4' => [
                'input' => 0.03,
                'output' => 0.06,
            ],
        ]);

        FakeLLM::fake([
            'response' => 'Test',
            'usage' => [
                'prompt_tokens' => 1000,
                'completion_tokens' => 500,
                'total_tokens' => 1500,
            ],
        ]);

        $trace = null;
        Event::listen(LlmResponseCompleted::class, function($event) use (&$trace) {
            $trace = $event;
        });

        Mindwave::llm()->model('gpt-4')->generateText('Test');

        // (1000 / 1000 * 0.03) + (500 / 1000 * 0.06) = 0.03 + 0.03 = 0.06
        $this->assertEquals(0.06, $trace->costEstimate);
    }
}
```

### 4. Database Testing for Traces

```php
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mindwave\Mindwave\Observability\Models\Trace;
use Mindwave\Mindwave\Observability\Models\Span;

class TraceStorageTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function it_stores_traces_in_database()
    {
        config(['mindwave-tracing.database.enabled' => true]);

        FakeLLM::fake(['response' => 'Test']);

        Mindwave::llm()->generateText('Test prompt');

        $this->assertDatabaseCount('mindwave_traces', 1);
        $this->assertDatabaseCount('mindwave_spans', 1);

        $trace = Trace::first();
        $this->assertNotNull($trace->trace_id);
        $this->assertGreaterThan(0, $trace->total_input_tokens);
    }

    /** @test */
    public function it_queries_expensive_traces()
    {
        Trace::factory()->create(['estimated_cost' => 0.05]);
        Trace::factory()->create(['estimated_cost' => 0.15]);
        Trace::factory()->create(['estimated_cost' => 0.25]);

        $expensive = Trace::expensive(0.10)->get();

        $this->assertCount(2, $expensive);
    }
}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: password
          MYSQL_DATABASE: mindwave_test
        ports:
          - 3306:3306
        options: --health-cmd="mysqladmin ping" --health-interval=10s

      qdrant:
        image: qdrant/qdrant:latest
        ports:
          - 6333:6333

    steps:
      - uses: actions/checkout@v3

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
          extensions: mbstring, pdo_mysql
          coverage: xdebug

      - name: Install Dependencies
        run: composer install --prefer-dist

      - name: Copy Environment
        run: cp .env.ci .env

      - name: Run Migrations
        run: php artisan migrate --force

      - name: Run Tests
        env:
          DB_CONNECTION: mysql
          DB_HOST: 127.0.0.1
          DB_PORT: 3306
          DB_DATABASE: mindwave_test
          DB_USERNAME: root
          DB_PASSWORD: password
          MINDWAVE_LLM: fake
          MINDWAVE_VECTORSTORE: qdrant
          MINDWAVE_QDRANT_HOST: localhost
          MINDWAVE_QDRANT_PORT: 6333
          MINDWAVE_TRACING_ENABLED: true
          MINDWAVE_TRACE_DATABASE: true
        run: vendor/bin/phpunit --coverage-clover coverage.xml

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.xml
```

### Laravel Dusk for E2E Testing

```php
use Laravel\Dusk\Browser;
use Tests\DuskTestCase;

class ChatbotE2ETest extends DuskTestCase
{
    /**
     * @group e2e
     */
    public function test_user_can_chat_with_bot()
    {
        FakeLLM::fake([
            ['response' => 'Hello! How can I help you?'],
            ['response' => 'Laravel is a PHP framework.'],
        ]);

        $this->browse(function (Browser $browser) {
            $browser->visit('/chat')
                    ->type('message', 'Hi')
                    ->press('Send')
                    ->waitForText('Hello! How can I help you?')
                    ->type('message', 'What is Laravel?')
                    ->press('Send')
                    ->waitForText('Laravel is a PHP framework');
        });
    }
}
```

## Common Testing Pitfalls

### 1. Not Cleaning Up TNTSearch Indexes

**Problem:**

```php
/** @test */
public function it_searches_documents()
{
    $source = TntSearchSource::fromArray([...]);
    $results = $source->search('query');

    // ❌ Index file left behind
}
```

**Solution:**

```php
/** @test */
public function it_searches_documents()
{
    $source = TntSearchSource::fromArray([...]);
    $source->initialize();

    try {
        $results = $source->search('query');
        $this->assertNotEmpty($results);
    } finally {
        $source->cleanup(); // ✅ Always cleanup
    }
}
```

### 2. Forgetting to Initialize Sources

**Problem:**

```php
/** @test */
public function it_searches()
{
    $source = TntSearchSource::fromArray([...]);
    $results = $source->search('query'); // ❌ Not initialized
}
```

**Solution:**

```php
/** @test */
public function it_searches()
{
    $source = TntSearchSource::fromArray([...]);
    $source->initialize(); // ✅ Initialize first
    $results = $source->search('query');
}
```

### 3. Testing with Production Credentials

**Problem:**

```php
// .env.testing
MINDWAVE_OPENAI_API_KEY=sk-proj-real-production-key  # ❌ Dangerous!
```

**Solution:**

```php
// .env.testing
MINDWAVE_LLM=fake  # ✅ Use fake driver
MINDWAVE_OPENAI_API_KEY=sk-test-fake-key
```

### 4. Not Testing Token Limits

**Problem:**

```php
/** @test */
public function it_processes_large_document()
{
    $huge = str_repeat('word ', 100000);
    $response = Mindwave::llm()->generateText($huge);

    // ❌ May exceed token limit in production
}
```

**Solution:**

```php
/** @test */
public function it_handles_large_documents()
{
    $huge = str_repeat('word ', 100000);

    $composer = Mindwave::prompt()
        ->section('content', $huge, shrinker: 'truncate')
        ->model('gpt-4')
        ->reserveOutputTokens(500)
        ->fit();

    // ✅ Verify it fits
    $this->assertLessThanOrEqual(7500, $composer->getTokenCount());
}
```

## Troubleshooting Tests

### Tests Failing Intermittently

**Cause:** Race conditions or non-deterministic LLM outputs

**Solution:**

```php
// Use fake driver for deterministic tests
FakeLLM::fake(['response' => 'Consistent response']);

// Or use seeded randomness
config(['mindwave-llm.llms.mistral.random_seed' => 42]);
```

### High Memory Usage in Tests

**Cause:** Large context or many test iterations

**Solution:**

```php
protected function tearDown(): void
{
    // Clear large objects
    unset($this->largeContext);

    // Cleanup indexes
    if (isset($this->source)) {
        $this->source->cleanup();
    }

    parent::tearDown();
}
```

### Slow Test Suite

**Cause:** Too many real API calls or expensive operations

**Solution:**

```bash
# Skip slow tests by default
vendor/bin/phpunit --exclude-group=slow,real-api

# Run fast tests in parallel
vendor/bin/paratest --processes=4
```

## Summary

Effective testing strategies for Mindwave applications:

1. **Use the fake driver** for fast, deterministic unit tests
2. **Mock external APIs** for integration tests
3. **Test RAG pipelines** with real retrieval but fake generation
4. **Measure quality** with semantic similarity and custom metrics
5. **Test edge cases** including errors and limits
6. **Automate in CI/CD** with proper isolation
7. **Use real APIs sparingly** for critical integration validation

**Key Takeaway:** Good tests balance speed, reliability, and cost. Favor fakes for unit tests, use mocks for integration tests, and reserve real API tests for critical paths only.

## Related Documentation

- [Production Deployment](/docs/production)
- [Troubleshooting](/docs/troubleshooting)
- [Observability](/docs/observability/overview)
- [Cost Tracking](/docs/observability/cost-tracking)
