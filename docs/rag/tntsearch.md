# TNTSearch Full-Text Search

TNTSearch provides fast, full-text search capabilities for Mindwave's RAG (Retrieval-Augmented Generation) system. Using the industry-standard BM25 ranking algorithm, TNTSearch enables keyword-based search across your Laravel application data, making it perfect for retrieving relevant context from documents, database records, or CSV files.

## Overview

### What is TNTSearch?

TNTSearch is a lightweight, pure-PHP full-text search engine that uses SQLite for storage and implements the BM25 ranking algorithm. In Mindwave, TNTSearch powers the `TntSearchSource` context source, providing fast keyword-based search for RAG applications.

### Why Use TNTSearch for RAG?

- **Fast keyword matching** - Finds documents containing specific terms
- **BM25 ranking** - Industry-standard relevance scoring
- **Laravel-friendly** - Works seamlessly with Eloquent models
- **Flexible indexing** - Index from models, arrays, or CSV files
- **Ephemeral indexes** - Temporary indexes with automatic cleanup
- **Zero dependencies** - No external search services required

### BM25 Ranking Algorithm

BM25 (Best Matching 25) is a probabilistic ranking function that scores documents based on:
- **Term frequency** - How often query terms appear
- **Document length** - Normalizes for document size
- **Inverse document frequency** - Rare terms score higher

This provides more relevant results than simple keyword matching.

### When to Use TNTSearch vs Vector Stores

| Feature | TNTSearch | Vector Stores |
|---------|-----------|---------------|
| Search Type | Keyword-based | Semantic similarity |
| Best For | Exact term matching | Conceptual matching |
| Query | "Laravel framework" | "web development tools" |
| Results | Contains "Laravel" | Related concepts |
| Dataset Size | < 10,000 documents | Millions of documents |
| Setup | Instant | Requires embeddings |

**Use TNTSearch when:**
- You need exact keyword matching
- Users search with specific terms
- Quick setup without embeddings
- Small to medium datasets

**Use Vector Stores when:**
- You need semantic understanding
- Users ask questions naturally
- Large datasets (millions of records)
- Finding conceptually similar content

## Setup & Configuration

### Configuration File

TNTSearch settings are configured in `config/mindwave-context.php`:

```php
return [
    'tntsearch' => [
        // Directory for ephemeral indexes
        'storage_path' => storage_path('mindwave/tnt-indexes'),

        // Hours before indexes are auto-cleaned (default: 24)
        'ttl_hours' => env('MINDWAVE_TNT_INDEX_TTL', 24),

        // Maximum index size in MB (default: 100)
        'max_index_size_mb' => env('MINDWAVE_TNT_MAX_INDEX_SIZE', 100),
    ],
];
```

### Environment Variables

Add to your `.env` file:

```bash
# Optional: Customize TTL (hours)
MINDWAVE_TNT_INDEX_TTL=24

# Optional: Maximum index size (MB)
MINDWAVE_TNT_MAX_INDEX_SIZE=100
```

### Storage Directory

The storage directory is created automatically, but you can verify it exists:

```bash
# Check storage path
ls -la storage/mindwave/tnt-indexes/

# Ensure proper permissions
chmod -R 755 storage/mindwave/
```

### Testing the Setup

Verify TNTSearch is working:

```php
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;

// Create a simple test
$source = TntSearchSource::fromArray([
    'Laravel is a PHP web framework',
    'Vue.js is a JavaScript framework',
]);

$results = $source->search('Laravel');

// Should return 1 result
echo count($results); // 1
echo $results[0]->content; // "Laravel is a PHP web framework"
```

## Creating Indexes

### From Eloquent Models

Index data directly from your Eloquent models:

```php
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;
use App\Models\User;

// Basic indexing with transformer
$source = TntSearchSource::fromEloquent(
    query: User::where('active', true),
    transform: fn($user) => "{$user->name} {$user->bio}",
    name: 'active-users'
);

// Search the indexed users
$results = $source->search('Laravel developer');
```

**With query constraints:**

```php
use App\Models\Article;

$source = TntSearchSource::fromEloquent(
    query: Article::where('published', true)
        ->where('category', 'technology')
        ->orderBy('views', 'desc'),
    transform: fn($article) => "
        Title: {$article->title}
        Content: {$article->content}
        Tags: {$article->tags}
    ",
    name: 'tech-articles'
);

$results = $source->search('artificial intelligence', limit: 5);
```

**Metadata preservation:**

```php
$source = TntSearchSource::fromEloquent(
    User::all(),
    fn($user) => $user->bio
);

$results = $source->search('Laravel');

foreach ($results as $item) {
    echo $item->content;                // User bio
    echo $item->metadata['model_id'];   // User ID
    echo $item->metadata['model_type']; // "App\Models\User"
}
```

### From Arrays

Index in-memory data or dynamic content:

```php
// Simple string array
$docs = [
    'Laravel provides an expressive ORM called Eloquent',
    'Vue.js uses a virtual DOM for efficient rendering',
    'Docker containers package applications with dependencies',
];

$source = TntSearchSource::fromArray($docs);
$results = $source->search('ORM');
```

**Structured data:**

```php
$apiDocs = [
    ['endpoint' => 'POST /users', 'description' => 'Create a new user'],
    ['endpoint' => 'GET /users/:id', 'description' => 'Retrieve user details'],
    ['endpoint' => 'PUT /users/:id', 'description' => 'Update user information'],
    ['endpoint' => 'DELETE /users/:id', 'description' => 'Delete a user'],
];

$source = TntSearchSource::fromArray($apiDocs, name: 'api-endpoints');
$results = $source->search('create user');
```

**Dynamic content generation:**

```php
// Generate documentation from code
$methods = get_class_methods(MyClass::class);
$docs = array_map(function($method) {
    $reflection = new ReflectionMethod(MyClass::class, $method);
    $comment = $reflection->getDocComment();
    return "{$method}: {$comment}";
}, $methods);

$source = TntSearchSource::fromArray($docs, name: 'class-methods');
```

### From CSV Files

Index data from CSV files:

```php
// Index all columns
$source = TntSearchSource::fromCsv(
    filepath: storage_path('data/products.csv')
);

// Index specific columns only
$source = TntSearchSource::fromCsv(
    filepath: storage_path('data/products.csv'),
    columns: ['name', 'description', 'category'],
    name: 'product-catalog'
);

$results = $source->search('laptop');
```

**CSV format example:**

```csv
id,name,category,description,price
1,MacBook Pro,Laptops,"Powerful laptop for developers",2499.99
2,Magic Keyboard,Accessories,"Wireless keyboard with Touch ID",149.99
3,Dell XPS 13,Laptops,"Ultra-portable Windows laptop",1299.99
```

**Accessing CSV metadata:**

```php
$source = TntSearchSource::fromCsv(
    storage_path('data/products.csv'),
    columns: ['name', 'description']
);

$results = $source->search('laptop');

foreach ($results as $item) {
    echo $item->content;              // "MacBook Pro Powerful laptop..."
    echo $item->metadata['id'];       // "1"
    echo $item->metadata['name'];     // "MacBook Pro"
    echo $item->metadata['price'];    // "2499.99"
}
```

**Large file handling:**

```php
// For large CSV files (>10,000 rows), consider chunking
use Illuminate\Support\LazyCollection;

$chunks = LazyCollection::make(function() {
    $handle = fopen(storage_path('data/large.csv'), 'r');
    $header = fgetcsv($handle);

    while ($row = fgetcsv($handle)) {
        yield array_combine($header, $row);
    }

    fclose($handle);
})->chunk(1000);

foreach ($chunks as $chunk) {
    $source = TntSearchSource::fromArray(
        $chunk->map(fn($row) => implode(' ', $row))->toArray()
    );

    // Process each chunk...
}
```

## Searching

### Basic Search

```php
$source = TntSearchSource::fromArray([
    'Laravel is a PHP framework',
    'Vue.js is a JavaScript framework',
    'Python Django web framework',
]);

// Simple search
$results = $source->search('framework');

// Results contain all matching documents
foreach ($results as $item) {
    echo $item->content; // Document content
    echo $item->score;   // Relevance score (0.0 - 1.0)
}
```

### Keyword Matching

TNTSearch performs keyword-based matching:

```php
// Multiple keywords (AND behavior)
$results = $source->search('Laravel PHP');
// Returns: Documents containing both "Laravel" AND "PHP"

// Single keyword
$results = $source->search('framework');
// Returns: All documents containing "framework"

// Phrase search
$results = $source->search('web framework');
// Returns: Documents with "web" AND "framework"
```

### Limiting Results

Control the number of results returned:

```php
// Get top 5 results
$results = $source->search('Laravel', limit: 5);

// Get top result only
$results = $source->search('PHP', limit: 1);

// Default limit is 5
$results = $source->search('framework');
echo count($results); // Maximum of 5 results
```

### Scoring and Ranking

Results are automatically ranked by relevance:

```php
$source = TntSearchSource::fromArray([
    'Laravel is a PHP framework for web artisans',
    'PHP is a programming language',
    'Laravel uses PHP',
]);

$results = $source->search('Laravel PHP');

foreach ($results as $item) {
    echo sprintf(
        "Score: %.2f - %s\n",
        $item->score,
        $item->content
    );
}

// Output (sorted by score):
// Score: 0.95 - Laravel is a PHP framework for web artisans
// Score: 0.78 - Laravel uses PHP
// Score: 0.42 - PHP is a programming language
```

**Understanding scores:**
- **1.0** - Perfect match
- **0.7-0.9** - Highly relevant
- **0.4-0.6** - Somewhat relevant
- **< 0.4** - Marginally relevant

### Empty Results

Handle cases with no matches:

```php
$results = $source->search('nonexistent');

if ($results->isEmpty()) {
    echo "No results found";
} else {
    // Process results
}

// Alternative
if ($results->count() === 0) {
    // Handle empty results
}
```

## Using TntSearchSource

### Creating a Source

Three factory methods are available:

```php
// From Eloquent
$source = TntSearchSource::fromEloquent(
    query: User::query(),
    transform: fn($u) => $u->bio,
    name: 'users'
);

// From Array
$source = TntSearchSource::fromArray(
    documents: ['doc1', 'doc2'],
    name: 'docs'
);

// From CSV
$source = TntSearchSource::fromCsv(
    filepath: 'data.csv',
    columns: ['title', 'content'],
    name: 'csv-data'
);
```

### Manual Initialization

Indexes are created automatically on first search, but you can initialize manually:

```php
$source = TntSearchSource::fromArray(['content']);

// Initialize index explicitly
$source->initialize();

// Now search (reuses existing index)
$results = $source->search('query');
```

### Integration with Context Pipeline

Combine multiple sources for comprehensive context:

```php
use Mindwave\Mindwave\Context\ContextPipeline;

$userSource = TntSearchSource::fromEloquent(
    User::where('active', true),
    fn($u) => "Expert: {$u->name}, Skills: {$u->skills}"
);

$docSource = TntSearchSource::fromCsv(
    storage_path('docs/api.csv'),
    columns: ['endpoint', 'description']
);

$pipeline = (new ContextPipeline)
    ->addSource($userSource)
    ->addSource($docSource)
    ->deduplicate(true)
    ->rerank(true);

$results = $pipeline->search('Laravel API', limit: 10);
```

### Complete Working Example

```php
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;
use App\Models\KnowledgeBase;

// Index knowledge base articles
$source = TntSearchSource::fromEloquent(
    query: KnowledgeBase::where('published', true),
    transform: fn($article) => "
        Q: {$article->question}
        A: {$article->answer}
        Tags: {$article->tags}
    ",
    name: 'knowledge-base'
);

// Search for relevant articles
$query = 'How do I reset my password?';
$results = $source->search($query, limit: 3);

// Display results
foreach ($results as $index => $item) {
    echo sprintf(
        "[%d] Score: %.2f\n%s\n\n",
        $index + 1,
        $item->score,
        $item->content
    );

    // Access original article ID if needed
    $articleId = $item->metadata['model_id'];
}

// Cleanup when done
$source->cleanup();
```

## Index Management

### Creating Indexes

Indexes are created automatically but can be created explicitly:

```php
$source = TntSearchSource::fromArray(['data']);

// Create index
$source->initialize();

// Check if initialized
// (No public method, but search() will handle it)
```

### Updating Indexes

Indexes are ephemeral and immutable. To update, create a new source:

```php
// Old data
$source = TntSearchSource::fromArray(['old data']);
$source->cleanup(); // Clean up old index

// New data
$source = TntSearchSource::fromArray(['new data']);
// New index created automatically
```

### Deleting Indexes

Indexes are automatically cleaned up:

```php
// Manual cleanup
$source->cleanup();

// Automatic cleanup on object destruction
unset($source); // Index deleted automatically

// Or let garbage collector handle it
// (destructor calls cleanup automatically)
```

### Index Statistics

View index storage statistics:

```bash
# Show index statistics
php artisan mindwave:index-stats
```

Output:
```
📊 TNTSearch Index Statistics

┌───────────────────────┬────────────────────────────────────────────┐
│ Metric                │ Value                                      │
├───────────────────────┼────────────────────────────────────────────┤
│ Total Indexes         │ 5                                          │
│ Total Size (MB)       │ 12.45                                      │
│ Total Size (Bytes)    │ 13,058,048                                 │
│ Storage Path          │ /app/storage/mindwave/tnt-indexes          │
└───────────────────────┴────────────────────────────────────────────┘

💡 Tip: Run "php artisan mindwave:clear-indexes" to remove old indexes
```

### Artisan Commands

**View index statistics:**

```bash
php artisan mindwave:index-stats
```

**Clear old indexes:**

```bash
# Clear indexes older than 24 hours (default)
php artisan mindwave:clear-indexes

# Clear indexes older than 12 hours
php artisan mindwave:clear-indexes --ttl=12

# Skip confirmation prompt
php artisan mindwave:clear-indexes --force

# Clear and show results
php artisan mindwave:clear-indexes --ttl=1 --force
```

Example output:
```
🔍 Found 5 index(es) (12.45 MB)
⏰ Clearing indexes older than 24 hours

Do you want to proceed? (yes/no) [yes]:
> yes

✅ Cleared 3 index(es)
💾 Freed 7.23 MB
ℹ️  2 active index(es) remaining
```

## Advanced Features

### Custom Scoring

While BM25 scoring is automatic, you can post-process scores:

```php
$results = $source->search('Laravel');

// Boost scores based on metadata
$boosted = $results->map(function($item) {
    // Boost premium content
    if ($item->metadata['is_premium'] ?? false) {
        return $item->withScore($item->score * 1.5);
    }
    return $item;
})->rerank(); // Re-sort by new scores
```

### Multiple Search Terms

Combine searches for complex queries:

```php
$source = TntSearchSource::fromEloquent(
    Article::query(),
    fn($a) => $a->title . ' ' . $a->content
);

// Search for multiple related terms
$terms = ['Laravel', 'PHP', 'framework'];
$allResults = [];

foreach ($terms as $term) {
    $results = $source->search($term, limit: 3);
    $allResults = array_merge($allResults, $results->all());
}

// Create collection and deduplicate
$combined = (new ContextCollection($allResults))
    ->deduplicate()
    ->rerank()
    ->take(10);
```

### Conditional Indexing

Index different content based on conditions:

```php
use App\Models\User;

$source = TntSearchSource::fromEloquent(
    User::all(),
    transform: function($user) {
        // Customize indexed content per user
        if ($user->hasRole('developer')) {
            return "Developer: {$user->name}, Tech: {$user->tech_stack}";
        }

        if ($user->hasRole('designer')) {
            return "Designer: {$user->name}, Tools: {$user->design_tools}";
        }

        return "Team Member: {$user->name}, Role: {$user->role}";
    },
    name: 'team-members'
);
```

### Combining with Other Sources

Mix TNTSearch with other context sources:

```php
use Mindwave\Mindwave\Context\Sources\VectorStoreSource;
use Mindwave\Mindwave\Context\Sources\StaticSource;
use Mindwave\Mindwave\Context\ContextPipeline;

// Keyword search
$tntSource = TntSearchSource::fromEloquent(
    Article::query(),
    fn($a) => $a->content
);

// Semantic search
$vectorSource = VectorStoreSource::from(Mindwave::brain('articles'));

// Static policies
$staticSource = StaticSource::fromStrings([
    'Company policy: All content must be reviewed',
    'Guidelines: Use inclusive language',
]);

// Combine all sources
$pipeline = (new ContextPipeline)
    ->addSource($tntSource)      // Keyword matches
    ->addSource($vectorSource)   // Semantic matches
    ->addSource($staticSource)   // Static policies
    ->deduplicate()
    ->rerank();

$results = $pipeline->search('content guidelines', limit: 10);
```

## Performance Optimization

### Index Size Considerations

**Recommended limits:**
- **Small datasets:** < 1,000 documents (instant indexing)
- **Medium datasets:** 1,000 - 10,000 documents (< 1 second)
- **Large datasets:** > 10,000 documents (consider alternative solutions)

Monitor index sizes:

```bash
php artisan mindwave:index-stats
```

**Size optimization tips:**
```php
// ❌ Don't index everything
$source = TntSearchSource::fromEloquent(
    Article::all(),
    fn($a) => $a->title . ' ' . $a->content . ' ' . $a->metadata
);

// ✅ Index only searchable fields
$source = TntSearchSource::fromEloquent(
    Article::all(),
    fn($a) => $a->title . ' ' . $a->excerpt // Skip metadata
);
```

### Query Performance

**Optimize query selection:**

```php
// ❌ Avoid loading unnecessary relations
$source = TntSearchSource::fromEloquent(
    User::with(['posts', 'comments', 'profile'])->get(),
    fn($u) => $u->bio
);

// ✅ Only load what you need
$source = TntSearchSource::fromEloquent(
    User::select(['id', 'name', 'bio'])->get(),
    fn($u) => $u->name . ' ' . $u->bio
);
```

**Limit result processing:**

```php
// Request only what you need
$results = $source->search('Laravel', limit: 5); // Not 50

// Process efficiently
foreach ($results as $item) {
    // Efficient processing
}
```

### Caching Strategies

Cache expensive transformations:

```php
use Illuminate\Support\Facades\Cache;

// Cache indexed content
$documents = Cache::remember('articles-indexed', 3600, function() {
    return Article::all()->map(fn($a) => [
        'content' => $a->title . ' ' . $a->content,
        'metadata' => ['id' => $a->id],
    ])->toArray();
});

// Create source from cached data
$source = TntSearchSource::fromArray($documents);
```

**Cache search results:**

```php
$cacheKey = "search:{$query}";

$results = Cache::remember($cacheKey, 300, function() use ($source, $query) {
    return $source->search($query, limit: 10);
});
```

### Batch Indexing for Large Datasets

Process large datasets in chunks:

```php
use Illuminate\Support\Collection;

// Process in batches
Article::chunk(1000, function($articles) {
    $source = TntSearchSource::fromEloquent(
        $articles,
        fn($a) => $a->content
    );

    // Use this source for a specific query batch
    $results = $source->search('query');

    // Process results...

    // Cleanup immediately
    $source->cleanup();
});
```

**For very large datasets:**

```php
// Consider using Laravel queues
ProcessLargeIndexJob::dispatch($query, $limit);

// In job:
public function handle() {
    $source = TntSearchSource::fromEloquent(
        Article::where('category', $this->category),
        fn($a) => $a->content
    );

    $results = $source->search($this->query, $this->limit);

    // Store results for later retrieval
    Cache::put("results:{$this->jobId}", $results, 3600);
}
```

## Real-World Examples

### Customer Support Tickets

Search through past ticket resolutions:

```php
use App\Models\SupportTicket;
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;

// Index resolved tickets with high ratings
$ticketSource = TntSearchSource::fromEloquent(
    query: SupportTicket::where('status', 'resolved')
        ->where('rating', '>=', 4)
        ->orderBy('created_at', 'desc')
        ->limit(1000),
    transform: fn($ticket) => "
        Issue: {$ticket->title}
        Category: {$ticket->category}
        Resolution: {$ticket->resolution}
        Agent Notes: {$ticket->agent_notes}
    ",
    name: 'support-tickets'
);

// Use in support agent prompt
$customerIssue = "Customer cannot reset password, email not arriving";

$response = Mindwave::prompt()
    ->section('system', 'You are a helpful customer support agent.')
    ->context($ticketSource, query: $customerIssue, limit: 5)
    ->section('user', $customerIssue)
    ->run();

echo $response->content;
```

### Documentation Search

Search through code documentation:

```php
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;

// Index documentation from CSV
$docSource = TntSearchSource::fromCsv(
    filepath: storage_path('docs/api-reference.csv'),
    columns: ['class', 'method', 'description', 'example'],
    name: 'api-docs'
);

// Search for authentication docs
$query = 'user authentication JWT token';
$results = $docSource->search($query, limit: 3);

// Use in developer assistant
$response = Mindwave::prompt()
    ->section('system', 'You are a Laravel expert. Use API docs to answer.')
    ->context($docSource, query: $query, limit: 5)
    ->section('user', 'How do I implement JWT authentication?')
    ->run();
```

**api-reference.csv:**
```csv
class,method,description,example
Auth,login,"Authenticate user and return JWT token","Auth::login($user)"
Auth,refresh,"Refresh expired JWT token","Auth::refresh($token)"
Auth,logout,"Invalidate JWT token","Auth::logout()"
User,find,"Find user by ID","User::find($id)"
```

### Product Catalog

Search product catalog for recommendations:

```php
use App\Models\Product;
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;

// Index products
$productSource = TntSearchSource::fromEloquent(
    query: Product::where('in_stock', true)
        ->where('active', true),
    transform: fn($product) => "
        Name: {$product->name}
        Category: {$product->category}
        Description: {$product->description}
        Features: {$product->features}
        Price: \${$product->price}
    ",
    name: 'product-catalog'
);

// Customer inquiry
$customerQuery = "I need a laptop for software development under $2000";

$response = Mindwave::prompt()
    ->section('system', 'You are a product recommendation expert.')
    ->context($productSource, query: $customerQuery, limit: 5)
    ->section('user', $customerQuery)
    ->run();

// Response includes relevant products from context
echo $response->content;
```

### FAQ System

Build an intelligent FAQ system:

```php
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;
use Mindwave\Mindwave\Context\Sources\StaticSource;
use Mindwave\Mindwave\Context\ContextPipeline;

// Load FAQs from CSV
$faqSource = TntSearchSource::fromCsv(
    filepath: storage_path('data/faq.csv'),
    columns: ['question', 'answer', 'category'],
    name: 'faq'
);

// Add static policies
$policySource = StaticSource::fromStrings([
    'Refund policy: Full refunds within 30 days of purchase',
    'Shipping: 3-5 business days domestic, 7-14 international',
    'Support hours: Monday-Friday, 9 AM - 5 PM EST',
]);

// Combine sources
$pipeline = (new ContextPipeline)
    ->addSource($faqSource)
    ->addSource($policySource)
    ->deduplicate()
    ->rerank();

// Handle user question
$userQuestion = "How long does shipping take and what's your refund policy?";

$response = Mindwave::prompt()
    ->section('system', 'You are a helpful FAQ assistant. Answer based on provided information.')
    ->context($pipeline, query: $userQuestion, limit: 5)
    ->section('user', $userQuestion)
    ->run();

echo $response->content;
```

**faq.csv:**
```csv
question,answer,category
How do I track my order?,Use the tracking number sent via email in the shipping confirmation,Shipping
What payment methods do you accept?,"We accept Visa, Mastercard, Amex, PayPal, and Apple Pay",Billing
Can I return a product?,"Yes, full refunds within 30 days, partial within 60 days",Returns
How do I contact support?,Email support@example.com or call 1-800-SUPPORT,Support
```

## Integration with PromptComposer

### Retrieving Context with TNTSearch

Seamless integration with Mindwave's PromptComposer:

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;

$source = TntSearchSource::fromArray([
    'Laravel provides elegant syntax for web development',
    'Vue.js is a progressive JavaScript framework',
    'Tailwind CSS is a utility-first CSS framework',
]);

// Use in prompt - query extracted automatically from user message
$response = Mindwave::prompt()
    ->section('system', 'You are a web development expert.')
    ->context($source) // Query extracted from user section
    ->section('user', 'Tell me about Laravel features')
    ->run();
```

### Injecting into Prompts

Explicit query specification:

```php
// Explicit query
$response = Mindwave::prompt()
    ->section('system', 'You are a helpful assistant.')
    ->context($source, query: 'Laravel framework', limit: 3)
    ->section('user', 'Can you help me understand Laravel?')
    ->run();

// Multiple context sources
$response = Mindwave::prompt()
    ->section('system', 'You are an expert.')
    ->context($userSource, query: 'Laravel expert', limit: 2)
    ->context($docSource, query: 'Laravel documentation', limit: 3)
    ->section('user', 'Question about Laravel')
    ->run();
```

### Token Management

Control token usage with context:

```php
use Mindwave\Mindwave\Facades\Mindwave;

$source = TntSearchSource::fromEloquent(
    Article::all(),
    fn($a) => $a->content
);

$response = Mindwave::prompt()
    ->section('system', 'You are a helpful assistant.', priority: 100)
    ->context($source, query: 'Laravel', limit: 10, priority: 75)
    ->section('user', 'Tell me about Laravel', priority: 100)
    ->reserveOutputTokens(500)
    ->fit() // Shrink context if needed to fit token budget
    ->run();

// Context is shrunk before system/user sections due to lower priority
```

**Check token usage:**

```php
$results = $source->search('Laravel', limit: 20);

// Get total tokens
$totalTokens = $results->getTotalTokens('gpt-4');
echo "Context uses {$totalTokens} tokens";

// Truncate if too large
if ($totalTokens > 1000) {
    $results = $results->truncateToTokens(1000, 'gpt-4');
}

// Use truncated results
$formatted = $results->formatForPrompt('numbered');
```

### Complete Example

Full integration with PromptComposer:

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;
use App\Models\KnowledgeBase;

// Create searchable knowledge base
$kbSource = TntSearchSource::fromEloquent(
    query: KnowledgeBase::where('published', true)
        ->orderBy('views', 'desc'),
    transform: fn($article) => "
        Title: {$article->title}
        Content: {$article->content}
        Category: {$article->category}
    ",
    name: 'knowledge-base'
);

// User question
$userQuestion = "How do I configure Laravel queue workers?";

// Generate response with context
$response = Mindwave::prompt()
    ->section('system', "
        You are a Laravel expert assistant.
        Answer questions using the provided knowledge base articles.
        Be concise and include code examples.
    ", priority: 100)
    ->context(
        source: $kbSource,
        query: $userQuestion,
        limit: 5,
        priority: 75
    )
    ->section('user', $userQuestion, priority: 100)
    ->reserveOutputTokens(800)
    ->fit()
    ->run();

// Display response
echo $response->content;

// Check what context was used
$promptSections = $response->getPromptSections();
foreach ($promptSections as $section) {
    if ($section['role'] === 'context') {
        echo "Used context:\n";
        echo $section['content'];
    }
}
```

## Best Practices

### What to Index

**Do index:**
- Searchable text content (titles, descriptions, body text)
- Relevant metadata (categories, tags, keywords)
- User-generated content (bios, skills, specialties)
- Frequently searched fields

**Don't index:**
- Binary data (images, PDFs unless extracted)
- Large blobs of irrelevant data
- Sensitive information (passwords, tokens, PII)
- Redundant information

```php
// ❌ Bad: Index everything including sensitive data
$source = TntSearchSource::fromEloquent(
    User::all(),
    fn($u) => json_encode($u->toArray()) // Includes password hash, tokens, etc.
);

// ✅ Good: Index only searchable, non-sensitive fields
$source = TntSearchSource::fromEloquent(
    User::all(),
    fn($u) => "Name: {$u->name}, Skills: {$u->skills}, Bio: {$u->bio}"
);
```

### Index Refresh Strategies

**Short-lived indexes (default):**
```php
// Create, use, cleanup immediately
$source = TntSearchSource::fromEloquent(User::all(), fn($u) => $u->bio);
$results = $source->search('Laravel');
$source->cleanup(); // Explicit cleanup
```

**Session-scoped indexes:**
```php
// Store in session for multiple searches
$source = TntSearchSource::fromArray($documents);
session(['search_source' => $source]);

// Later in same request/session
$source = session('search_source');
$results = $source->search('query');
```

**Request-scoped indexes:**
```php
// Bind to Laravel service container for request duration
app()->instance('kb-search', TntSearchSource::fromEloquent(
    KnowledgeBase::all(),
    fn($kb) => $kb->content
));

// Use anywhere in request
$results = app('kb-search')->search('query');

// Automatic cleanup at end of request
```

### Query Optimization

**Be specific with queries:**
```php
// ❌ Too broad
$results = $source->search('help');

// ✅ More specific
$results = $source->search('Laravel queue configuration help');
```

**Use appropriate limits:**
```php
// ❌ Request too many results
$results = $source->search('Laravel', limit: 100);

// ✅ Request only what you need
$results = $source->search('Laravel', limit: 5);
```

**Pre-filter Eloquent queries:**
```php
// ❌ Index everything, search subset
$source = TntSearchSource::fromEloquent(
    Article::all(),
    fn($a) => $a->content
);
$results = $source->search('Laravel')->filter(fn($item) =>
    $item->metadata['published'] === true
);

// ✅ Filter before indexing
$source = TntSearchSource::fromEloquent(
    Article::where('published', true), // Pre-filtered
    fn($a) => $a->content
);
$results = $source->search('Laravel');
```

### Storage Management

**Monitor storage usage:**
```bash
# Check regularly
php artisan mindwave:index-stats

# Set up monitoring alert
# If Total Size > 500 MB, trigger cleanup
```

**Automate cleanup:**
```php
// In app/Console/Kernel.php
protected function schedule(Schedule $schedule)
{
    // Clean old indexes daily
    $schedule->command('mindwave:clear-indexes --force')
        ->daily();

    // Or more aggressively
    $schedule->command('mindwave:clear-indexes --ttl=1 --force')
        ->hourly();
}
```

**Set conservative TTL:**
```bash
# In .env
MINDWAVE_TNT_INDEX_TTL=12  # 12 hours instead of default 24
MINDWAVE_TNT_MAX_INDEX_SIZE=50  # 50 MB max
```

### Production Deployment

**Environment configuration:**
```bash
# .env.production
MINDWAVE_TNT_INDEX_TTL=6  # Aggressive cleanup in production
MINDWAVE_TNT_MAX_INDEX_SIZE=100
```

**Deployment checklist:**
- [ ] Storage directory exists with correct permissions
- [ ] TTL configured appropriately for your use case
- [ ] Scheduled cleanup command in Kernel.php
- [ ] Monitoring for storage usage
- [ ] Error handling for large datasets

**Error handling:**
```php
use Illuminate\Support\Facades\Log;

try {
    $source = TntSearchSource::fromEloquent(
        Article::all(),
        fn($a) => $a->content
    );
    $results = $source->search($query);
} catch (\Exception $e) {
    Log::error('TNTSearch failed', [
        'query' => $query,
        'error' => $e->getMessage(),
    ]);

    // Fallback to alternative search
    $results = Article::where('title', 'LIKE', "%{$query}%")->get();
}
```

**Graceful degradation:**
```php
// Try TNTSearch first, fall back to database query
function search($query) {
    try {
        $source = TntSearchSource::fromEloquent(
            Article::all(),
            fn($a) => $a->content
        );
        return $source->search($query);
    } catch (\Exception $e) {
        // Fallback to database LIKE query
        return Article::where('content', 'LIKE', "%{$query}%")
            ->limit(10)
            ->get()
            ->map(fn($a) => ContextItem::make($a->content, 1.0, 'database'));
    }
}
```

## Troubleshooting

### Index Not Found

**Problem:** `Index not found` or similar error

**Causes:**
- Index not initialized before search
- Index deleted prematurely
- Storage directory permissions

**Solutions:**
```php
// ✅ Ensure initialization before search
$source = TntSearchSource::fromArray(['data']);
$source->initialize(); // Explicit initialization
$results = $source->search('query');

// ✅ Don't cleanup too early
$source = TntSearchSource::fromArray(['data']);
$results1 = $source->search('query1');
$results2 = $source->search('query2'); // Reuses same index
$source->cleanup(); // Only cleanup when completely done

// ✅ Check storage permissions
chmod -R 755 storage/mindwave/tnt-indexes/
```

### Poor Search Results

**Problem:** Search returns irrelevant results or no results

**Causes:**
- Query too vague or too specific
- Indexed content doesn't match query terms
- Need semantic search instead of keyword search

**Solutions:**
```php
// ❌ Indexed content doesn't match query
$source = TntSearchSource::fromEloquent(
    User::all(),
    fn($u) => $u->id // Only indexing IDs!
);
$results = $source->search('Laravel developer'); // No match

// ✅ Index relevant content
$source = TntSearchSource::fromEloquent(
    User::all(),
    fn($u) => "Name: {$u->name}, Skills: {$u->skills}, Bio: {$u->bio}"
);
$results = $source->search('Laravel developer'); // Better results

// ✅ Consider semantic search for conceptual queries
use Mindwave\Mindwave\Context\Sources\VectorStoreSource;
$vectorSource = VectorStoreSource::from(Mindwave::brain('users'));
$results = $vectorSource->search('experienced web developer'); // Finds related concepts
```

### Performance Issues

**Problem:** Search is slow or uses too much memory

**Causes:**
- Too many documents indexed
- Large document content
- No query constraints

**Solutions:**
```php
// ❌ Indexing too much data
$source = TntSearchSource::fromEloquent(
    Article::all(), // 100,000 articles
    fn($a) => $a->full_content // 10,000 words each
);

// ✅ Limit indexed content
$source = TntSearchSource::fromEloquent(
    Article::where('published', true)
        ->limit(5000), // Reasonable limit
    fn($a) => $a->title . ' ' . substr($a->content, 0, 500) // First 500 chars only
);

// ✅ Use chunking for large datasets
Article::chunk(1000, function($articles) {
    $source = TntSearchSource::fromEloquent(
        $articles,
        fn($a) => $a->excerpt
    );
    // Process this chunk...
    $source->cleanup();
});
```

**Check index size:**
```bash
php artisan mindwave:index-stats
# If Total Size > 100 MB, consider optimization
```

### Storage Problems

**Problem:** Disk space issues or too many index files

**Causes:**
- TTL too long
- Cleanup not running
- Index files not being deleted

**Solutions:**
```bash
# Immediate cleanup
php artisan mindwave:clear-indexes --ttl=0 --force

# Check current state
php artisan mindwave:index-stats

# Verify storage path exists
ls -la storage/mindwave/tnt-indexes/

# Check permissions
chmod -R 755 storage/mindwave/

# Set aggressive TTL
# .env
MINDWAVE_TNT_INDEX_TTL=1  # 1 hour
```

**Schedule regular cleanup:**
```php
// app/Console/Kernel.php
protected function schedule(Schedule $schedule)
{
    $schedule->command('mindwave:clear-indexes --force')
        ->hourly(); // Run every hour
}
```

### Empty Results Unexpectedly

**Problem:** Search returns no results when matches should exist

**Causes:**
- Query terms don't match indexed content
- Content transformation issues
- Case sensitivity

**Solutions:**
```php
// Debug: Check what's being indexed
$source = TntSearchSource::fromEloquent(
    User::all(),
    fn($u) => {
        $content = "Name: {$u->name}, Skills: {$u->skills}";
        \Log::info('Indexing:', ['content' => $content]);
        return $content;
    }
);

// Verify query terms match
$results = $source->search('Laravel'); // Check logs for matching content

// Try broader search
$results = $source->search('developer'); // More general term

// Verify data exists
$users = User::all();
dd($users->pluck('skills')); // Check actual data
```

---

## Summary

TNTSearch provides fast, keyword-based full-text search for Mindwave's RAG system. Key takeaways:

- **Fast keyword search** with BM25 ranking
- **Multiple indexing methods**: Eloquent, arrays, CSV files
- **Ephemeral indexes** with automatic cleanup
- **Laravel-native** integration with PromptComposer
- **Production-ready** with monitoring and management commands

Use TNTSearch when you need exact keyword matching for small to medium datasets. For semantic understanding or large datasets, consider Vector Stores with Mindwave Brain.

For more information, see:
- [Context Discovery Guide](/docs/context-discovery)
- [Vector Stores Documentation](/docs/rag/vector-stores)
- [PromptComposer Integration](/docs/prompt-composer)
