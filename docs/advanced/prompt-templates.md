# Prompt Templates

## Overview

Prompt templates are reusable, parameterized prompts that enable consistent, maintainable AI interactions across your Laravel application. Instead of hardcoding prompts throughout your codebase, templates allow you to define prompts once with variable placeholders and reuse them wherever needed.

### Why Use Prompt Templates?

**Reusability** - Write once, use everywhere. Define a prompt template and reuse it across multiple features, controllers, and jobs.

**Consistency** - Ensure all similar AI interactions use the same prompt structure, improving reliability and predictability of responses.

**Maintainability** - Update a prompt in one place and all usages benefit. No need to hunt down hardcoded prompts scattered throughout your application.

**Testability** - Templated prompts are easier to test with fixtures and mock data. You can validate prompt generation without making API calls.

**Collaboration** - Share templates across your team. Templates become documentation of your AI interactions.

### Mindwave's Templating Approach

Mindwave provides two complementary approaches to prompt templating:

1. **PromptTemplate** - Simple string-based templates with variable substitution and output parsing
2. **PromptComposer** - Section-based prompt composition with token management and priority-based assembly

Both approaches can be combined to create powerful, flexible prompt management systems.

## PromptTemplate: Simple Variable Substitution

The `PromptTemplate` class provides a straightforward way to create parameterized prompts with variable substitution.

### Basic Usage

```php
use Mindwave\Mindwave\Prompts\PromptTemplate;

// Create a template with placeholders
$template = PromptTemplate::create(
    'Summarize this article in {length} words: {article}'
);

// Format the template with actual values
$prompt = $template->format([
    'length' => '100',
    'article' => $articleText
]);

// Use with Mindwave LLM
$summary = Mindwave::llm()->generate($prompt);
```

### Variable Placeholders

Variables are defined using curly braces `{variable_name}`:

```php
$template = PromptTemplate::create(
    'Hello, {name}! Your {product} order is ready for pickup.'
);

$message = $template->format([
    'name' => 'Alice',
    'product' => 'iPhone 15'
]);

// Result: "Hello, Alice! Your iPhone 15 order is ready for pickup."
```

### Custom Placeholder Formatters

If you need different placeholder syntax (e.g., square brackets), use a custom formatter:

```php
$template = PromptTemplate::create('Hello, [name]! Your [product] is ready.')
    ->withPlaceholderFormatter(fn($variable) => "[{$variable}]")
    ->format([
        'name' => 'Bob',
        'product' => 'Laptop'
    ]);

// Works with [name] and [product] instead of {name} and {product}
```

### Loading Templates from Files

Store complex prompts in files and load them dynamically:

```php
// resources/prompts/customer-support.txt
$template = PromptTemplate::fromPath(
    resource_path('prompts/customer-support.txt')
);

$response = $template->format([
    'customer_name' => $customer->name,
    'issue' => $ticket->description
]);
```

**File structure example:**
```
resources/
  prompts/
    customer-support.txt
    code-review.txt
    content-summary.txt
    data-extraction.txt
```

## Output Parsers: Structured Responses

PromptTemplates integrate with Output Parsers to automatically format instructions and parse LLM responses into structured data.

### Available Parsers

```php
use Mindwave\Mindwave\Prompts\OutputParsers\TextOutputParser;
use Mindwave\Mindwave\Prompts\OutputParsers\JsonOutputParser;
use Mindwave\Mindwave\Prompts\OutputParsers\JsonListOutputParser;
use Mindwave\Mindwave\Prompts\OutputParsers\CommaSeparatedListOutputParser;
use Mindwave\Mindwave\Prompts\OutputParsers\StructuredOutputParser;
```

### Text Output (Default)

```php
$template = PromptTemplate::create(
    'Write a tagline for: {product}',
    new TextOutputParser()
);

$prompt = $template->format(['product' => 'Smart Watch']);
$tagline = Mindwave::llm()->generate($prompt);
// Returns plain text response
```

### JSON Output

```php
$template = PromptTemplate::create(
    'Analyze sentiment of: {text}',
    new JsonOutputParser()
);

$prompt = $template->format(['text' => $review]);
$result = Mindwave::llm()->generate($prompt);
// Returns parsed JSON array: ['sentiment' => 'positive', 'score' => 0.9]
```

The parser automatically:
- Adds JSON format instructions to the prompt
- Extracts JSON from code blocks
- Parses response into PHP array

### JSON List Output

```php
$template = PromptTemplate::create(
    'Extract key topics from: {content}',
    new JsonListOutputParser()
);

$prompt = $template->format(['content' => $article]);
$topics = Mindwave::llm()->generate($prompt);
// Returns array: ['AI', 'Machine Learning', 'Laravel', 'PHP']
```

### Comma-Separated List Output

```php
$template = PromptTemplate::create(
    'List 5 alternatives to: {product}',
    new CommaSeparatedListOutputParser()
);

$prompt = $template->format(['product' => 'iPhone']);
$alternatives = Mindwave::llm()->generate($prompt);
// Returns array: ['Samsung Galaxy', 'Google Pixel', 'OnePlus', ...]
```

### Structured Output with Schema Validation

The most powerful parser - maps LLM responses to PHP objects:

```php
class Product
{
    public string $name;
    public ?string $description;
    public ?float $price;
    public ?array $features;
    public ?Collection $tags;
}

$template = PromptTemplate::create(
    'Extract product details from: {text}',
    new StructuredOutputParser(Product::class)
);

$result = Mindwave::llm()->generate($template, [
    'text' => $productDescription
]);

// $result is a Product instance with all fields populated
echo $result->name;
echo $result->price;
```

The parser:
- Reflects on the class to generate JSON schema
- Adds schema to prompt as format instructions
- Parses response into object instance
- Handles type conversion (int, float, bool, Collection)

### Changing Parsers Dynamically

```php
$template = PromptTemplate::create('Extract features from: {product}');

// Use as JSON list
$jsonResult = $template
    ->withOutputParser(new JsonListOutputParser())
    ->format(['product' => $description]);

// Use as comma-separated
$csvResult = $template
    ->withOutputParser(new CommaSeparatedListOutputParser())
    ->format(['product' => $description]);
```

## PromptComposer: Advanced Template Composition

While `PromptTemplate` handles simple variable substitution, `PromptComposer` enables complex prompt assembly with sections, priorities, and token management.

### Why Use PromptComposer for Templates?

- **Section-based composition** - Build prompts from reusable sections
- **Priority management** - Control which sections are included when space is tight
- **Token-aware** - Automatically fit prompts within model context windows
- **Shrinking strategies** - Compress or truncate sections when needed
- **Dynamic assembly** - Add sections conditionally based on runtime logic

### Basic PromptComposer Template

```php
use Mindwave\Mindwave\PromptComposer\PromptComposer;
use Mindwave\Mindwave\PromptComposer\Tokenizer\TiktokenTokenizer;

$composer = new PromptComposer(new TiktokenTokenizer());

$composer
    ->section('system', 'You are a helpful customer support agent.')
    ->section('context', $customerHistory, priority: 70, shrinker: 'truncate')
    ->section('user', $userQuestion, priority: 100);

$response = $composer->run();
```

### Reusable Section Templates

Create reusable section builders:

```php
class PromptSections
{
    public static function customerSupportSystem(): string
    {
        return <<<'PROMPT'
You are a professional customer support agent.

Guidelines:
- Be polite and empathetic
- Provide clear, actionable solutions
- Ask clarifying questions when needed
- Maintain professional tone
PROMPT;
    }

    public static function codeReviewSystem(): string
    {
        return <<<'PROMPT'
You are an expert code reviewer.

Review criteria:
- Code quality and best practices
- Security vulnerabilities
- Performance considerations
- Documentation completeness
PROMPT;
    }

    public static function formatCustomerContext(Customer $customer): string
    {
        return <<<CONTEXT
Customer: {$customer->name}
Account: {$customer->account_number}
Tier: {$customer->tier}
Previous tickets: {$customer->tickets()->count()}
CONTEXT;
    }
}

// Usage
$composer
    ->section('system', PromptSections::customerSupportSystem(), priority: 100)
    ->section('context', PromptSections::formatCustomerContext($customer), priority: 70, shrinker: 'truncate')
    ->section('user', $ticket->message, priority: 100);
```

### Template Factory Pattern

Create a factory for common prompt templates:

```php
class PromptFactory
{
    public function __construct(
        private readonly PromptComposer $composer
    ) {}

    public function customerSupport(Customer $customer, string $question): PromptComposer
    {
        return $this->composer
            ->section('system', PromptSections::customerSupportSystem(), priority: 100)
            ->section('context', $this->buildCustomerContext($customer), priority: 70, shrinker: 'truncate')
            ->section('user', $question, priority: 100)
            ->reserveOutputTokens(500)
            ->model('gpt-4');
    }

    public function codeReview(string $code, array $standards = []): PromptComposer
    {
        $composer = $this->composer
            ->section('system', PromptSections::codeReviewSystem(), priority: 100)
            ->section('code', "```php\n{$code}\n```", priority: 90);

        if (!empty($standards)) {
            $composer->section('standards', $this->formatStandards($standards), priority: 80, shrinker: 'truncate');
        }

        return $composer
            ->section('user', 'Review this code and provide feedback.', priority: 100)
            ->reserveOutputTokens(1000)
            ->model('gpt-4');
    }

    public function summarize(string $content, int $maxWords = 100): PromptComposer
    {
        return $this->composer
            ->section('system', "You are a concise summarizer.", priority: 100)
            ->section('content', $content, priority: 90, shrinker: 'compress')
            ->section('user', "Summarize this in {$maxWords} words or less.", priority: 100)
            ->reserveOutputTokens(200)
            ->model('gpt-4');
    }

    private function buildCustomerContext(Customer $customer): string
    {
        return PromptSections::formatCustomerContext($customer);
    }

    private function formatStandards(array $standards): string
    {
        return "Coding Standards:\n" . implode("\n", array_map(
            fn($standard) => "- {$standard}",
            $standards
        ));
    }
}

// Usage
$factory = app(PromptFactory::class);
$response = $factory->customerSupport($customer, $question)->run();
```

### Combining PromptTemplate with PromptComposer

Use `PromptTemplate` for variable substitution within sections:

```php
class TemplateLibrary
{
    public static function summarizationInstructions(int $wordCount): string
    {
        return PromptTemplate::create(
            'Summarize the following content in approximately {words} words. Focus on the main points and key takeaways.'
        )->format(['words' => $wordCount]);
    }

    public static function extractionInstructions(string $schema): string
    {
        return PromptTemplate::create(
            'Extract information according to this schema: {schema}. Return valid JSON only.'
        )->format(['schema' => $schema]);
    }
}

// Use in PromptComposer
$composer
    ->section('system', 'You are a data extraction specialist.', priority: 100)
    ->section('instructions', TemplateLibrary::extractionInstructions($jsonSchema), priority: 90)
    ->section('content', $documentText, priority: 80, shrinker: 'truncate')
    ->section('user', 'Extract the data now.', priority: 100);
```

## Real-World Template Examples

### Template 1: Customer Support Response

```php
class CustomerSupportTemplate
{
    public static function create(
        Customer $customer,
        Ticket $ticket,
        PromptComposer $composer
    ): PromptComposer {
        $systemPrompt = <<<'SYSTEM'
You are a professional customer support agent for our SaaS platform.

Core principles:
- Be empathetic and understanding
- Provide clear, step-by-step solutions
- Reference specific features and documentation when relevant
- Maintain a friendly but professional tone
- Ask clarifying questions before making assumptions

If you don't know the answer, say so and offer to escalate.
SYSTEM;

        $customerContext = <<<CONTEXT
Customer Profile:
- Name: {$customer->name}
- Email: {$customer->email}
- Account Type: {$customer->subscription->plan_name}
- Member Since: {$customer->created_at->format('M Y')}
- Total Tickets: {$customer->tickets()->count()}
- Priority: {$customer->priority_level}

Recent Activity:
{$customer->recentActivity()->take(5)->pluck('description')->implode("\n")}
CONTEXT;

        $ticketContext = <<<TICKET
Current Ticket:
- Subject: {$ticket->subject}
- Category: {$ticket->category}
- Priority: {$ticket->priority}
- Created: {$ticket->created_at->diffForHumans()}

Description:
{$ticket->description}
TICKET;

        return $composer
            ->section('system', $systemPrompt, priority: 100)
            ->section('customer', $customerContext, priority: 80, shrinker: 'truncate')
            ->section('ticket', $ticketContext, priority: 90)
            ->section('user', 'Provide a helpful response to this customer.', priority: 100)
            ->model('gpt-4')
            ->reserveOutputTokens(800);
    }
}

// Usage
$response = CustomerSupportTemplate::create($customer, $ticket, app(PromptComposer::class))->run();
```

### Template 2: Code Review

```php
class CodeReviewTemplate
{
    public static function create(
        string $code,
        string $language,
        array $focusAreas = [],
        ?array $codingStandards = null
    ): PromptTemplate {
        $focusSection = !empty($focusAreas)
            ? "\n\nFocus Areas:\n" . implode("\n", array_map(fn($area) => "- {$area}", $focusAreas))
            : '';

        $standardsSection = $codingStandards
            ? "\n\nCoding Standards:\n" . implode("\n", array_map(fn($std) => "- {$std}", $codingStandards))
            : '';

        $template = <<<PROMPT
Review this {language} code for:
- Code quality and best practices
- Potential bugs or logic errors
- Security vulnerabilities
- Performance optimizations
- Readability and maintainability{$focusSection}{$standardsSection}

Code to review:
```{language}
{code}
```

Provide a structured review with:
1. Overall assessment
2. Specific issues found (if any)
3. Recommendations for improvement
4. Positive aspects worth noting
PROMPT;

        return PromptTemplate::create($template);
    }
}

// Usage
$template = CodeReviewTemplate::create(
    code: $pullRequest->diff,
    language: 'php',
    focusAreas: ['Security', 'Performance'],
    codingStandards: ['PSR-12', 'Laravel Best Practices']
);

$review = Mindwave::llm()->generate($template->format(['code' => $code]));
```

### Template 3: Content Summarization

```php
class SummarizationTemplate
{
    public static function create(
        string $content,
        int $maxWords = 100,
        string $style = 'concise',
        ?string $audience = null
    ): PromptTemplate {
        $styleGuidance = match($style) {
            'concise' => 'Focus on key points only. Be brief and direct.',
            'detailed' => 'Include important details and context.',
            'bullet' => 'Use bullet points for clarity.',
            'narrative' => 'Write as a flowing narrative summary.',
            default => 'Summarize clearly and concisely.'
        };

        $audienceNote = $audience
            ? " Write for {$audience}."
            : '';

        $template = <<<PROMPT
Summarize the following content in approximately {max_words} words.

Style: {style_guidance}{$audienceNote}

Content:
{content}

Requirements:
- Maximum {max_words} words
- Capture main ideas and key takeaways
- Maintain factual accuracy
- Use clear, accessible language
PROMPT;

        return PromptTemplate::create($template);
    }
}

// Usage
$template = SummarizationTemplate::create(
    content: $article->body,
    maxWords: 150,
    style: 'bullet',
    audience: 'executives'
);

$summary = Mindwave::llm()->generate($template->format([
    'content' => $article->body,
    'max_words' => 150,
    'style_guidance' => 'Focus on key points only. Be brief and direct.'
]));
```

### Template 4: Data Extraction

```php
class DataExtractionTemplate
{
    public static function create(
        string $schema,
        array $examples = [],
        bool $strict = true
    ): PromptTemplate {
        $examplesSection = !empty($examples)
            ? "\n\nExamples:\n" . json_encode($examples, JSON_PRETTY_PRINT)
            : '';

        $strictness = $strict
            ? "IMPORTANT: Only extract data that clearly matches the schema. Use null for missing fields."
            : "Extract data as best as possible. Make reasonable inferences when needed.";

        $template = <<<PROMPT
Extract structured data from the following text according to this schema.

Schema:
{schema}{$examplesSection}

{$strictness}

Text to extract from:
{input_text}

Return only valid JSON matching the schema. No additional commentary.
PROMPT;

        return PromptTemplate::create($template, new JsonOutputParser());
    }

    public static function fromClass(string $className): PromptTemplate
    {
        return PromptTemplate::create(
            'Extract data from the following text: {input_text}',
            new StructuredOutputParser($className)
        );
    }
}

// Usage - with schema
$schema = [
    'name' => 'string',
    'email' => 'string',
    'phone' => 'string',
    'company' => 'string',
];

$template = DataExtractionTemplate::create(
    schema: json_encode($schema),
    strict: true
);

$data = Mindwave::llm()->generate($template, [
    'input_text' => $emailBody,
    'schema' => json_encode($schema)
]);

// Usage - with class
class ContactInfo
{
    public string $name;
    public string $email;
    public ?string $phone;
    public ?string $company;
}

$template = DataExtractionTemplate::fromClass(ContactInfo::class);
$contact = Mindwave::llm()->generate($template, ['input_text' => $emailBody]);
```

## Template Library Pattern

Organize templates in a central library for team-wide reuse:

```php
namespace App\AI\Templates;

class TemplateLibrary
{
    /**
     * Customer support response template
     */
    public function customerSupport(): PromptTemplate
    {
        return PromptTemplate::fromPath(
            resource_path('prompts/customer-support.txt')
        );
    }

    /**
     * Code review template
     */
    public function codeReview(string $language = 'php'): PromptTemplate
    {
        $path = resource_path("prompts/code-review-{$language}.txt");

        if (!file_exists($path)) {
            $path = resource_path('prompts/code-review-generic.txt');
        }

        return PromptTemplate::fromPath($path);
    }

    /**
     * Content summarization template
     */
    public function summarize(string $style = 'concise'): PromptTemplate
    {
        return PromptTemplate::fromPath(
            resource_path("prompts/summarize-{$style}.txt")
        );
    }

    /**
     * Data extraction template
     */
    public function extract(string $schema): PromptTemplate
    {
        return PromptTemplate::create(
            file_get_contents(resource_path('prompts/extract-base.txt')),
            new JsonOutputParser()
        );
    }

    /**
     * Get all available templates
     */
    public function all(): array
    {
        return [
            'customer-support' => $this->customerSupport(),
            'code-review' => $this->codeReview(),
            'summarize' => $this->summarize(),
            'extract' => fn($schema) => $this->extract($schema),
        ];
    }
}

// Register as singleton
app()->singleton(TemplateLibrary::class);

// Usage
$library = app(TemplateLibrary::class);
$response = Mindwave::llm()->generate(
    $library->customerSupport(),
    ['customer_name' => $customer->name, 'issue' => $issue]
);
```

### Template Repository with Version Control

```php
namespace App\AI\Repositories;

class PromptTemplateRepository
{
    private array $templates = [];

    public function register(string $name, PromptTemplate $template, string $version = '1.0'): void
    {
        $key = "{$name}@{$version}";
        $this->templates[$key] = $template;
    }

    public function get(string $name, string $version = 'latest'): PromptTemplate
    {
        if ($version === 'latest') {
            $version = $this->getLatestVersion($name);
        }

        $key = "{$name}@{$version}";

        if (!isset($this->templates[$key])) {
            throw new \InvalidArgumentException("Template {$name}@{$version} not found");
        }

        return $this->templates[$key];
    }

    public function versions(string $name): array
    {
        $versions = [];

        foreach (array_keys($this->templates) as $key) {
            if (str_starts_with($key, "{$name}@")) {
                $versions[] = substr($key, strlen($name) + 1);
            }
        }

        return $versions;
    }

    private function getLatestVersion(string $name): string
    {
        $versions = $this->versions($name);

        if (empty($versions)) {
            throw new \InvalidArgumentException("No versions found for template: {$name}");
        }

        usort($versions, 'version_compare');

        return end($versions);
    }
}

// Service provider registration
class TemplateServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(PromptTemplateRepository::class, function () {
            $repo = new PromptTemplateRepository();

            // Register templates
            $repo->register('summarize', SummarizationTemplate::create('', 100), '1.0');
            $repo->register('summarize', SummarizationTemplate::create('', 200), '2.0');
            $repo->register('code-review', CodeReviewTemplate::create('', 'php'), '1.0');

            return $repo;
        });
    }
}

// Usage
$repo = app(PromptTemplateRepository::class);
$template = $repo->get('summarize', 'latest'); // Gets v2.0
$oldTemplate = $repo->get('summarize', '1.0'); // Gets v1.0
```

## Dynamic Templates

Create templates that adapt based on runtime conditions:

```php
class DynamicCustomerSupportTemplate
{
    public function create(
        Customer $customer,
        Ticket $ticket,
        PromptComposer $composer
    ): PromptComposer {
        // Base system prompt
        $composer->section('system', $this->getSystemPrompt(), priority: 100);

        // Add VIP context for premium customers
        if ($customer->isPremium()) {
            $composer->section('vip-notice', $this->getVIPNotice(), priority: 95);
        }

        // Add customer context
        $composer->section(
            'customer',
            $this->formatCustomerContext($customer),
            priority: 80,
            shrinker: 'truncate'
        );

        // Add technical context for technical issues
        if ($ticket->isTechnical()) {
            $composer->section(
                'technical',
                $this->getTechnicalGuidelines(),
                priority: 85
            );
        }

        // Add recent ticket history if available
        $recentTickets = $customer->tickets()
            ->where('id', '!=', $ticket->id)
            ->latest()
            ->take(3)
            ->get();

        if ($recentTickets->isNotEmpty()) {
            $composer->section(
                'history',
                $this->formatTicketHistory($recentTickets),
                priority: 70,
                shrinker: 'truncate'
            );
        }

        // Add current ticket
        $composer->section('ticket', $this->formatTicket($ticket), priority: 90);

        // User instruction
        $composer->section('user', 'Provide a helpful response.', priority: 100);

        return $composer
            ->model('gpt-4')
            ->reserveOutputTokens(800);
    }

    private function getSystemPrompt(): string
    {
        return 'You are a professional customer support agent.';
    }

    private function getVIPNotice(): string
    {
        return <<<'NOTICE'
IMPORTANT: This is a PREMIUM customer. Ensure:
- Immediate, personalized attention
- Offer premium solutions when applicable
- Escalate complex issues to senior support
NOTICE;
    }

    private function getTechnicalGuidelines(): string
    {
        return <<<'TECH'
Technical Issue Guidelines:
- Provide specific, step-by-step troubleshooting
- Reference system logs and error codes
- Suggest debugging approaches
- Offer to escalate to engineering if needed
TECH;
    }

    private function formatCustomerContext(Customer $customer): string
    {
        // Implementation
    }

    private function formatTicket(Ticket $ticket): string
    {
        // Implementation
    }

    private function formatTicketHistory($tickets): string
    {
        // Implementation
    }
}
```

### Conditional Template Sections

```php
class ConditionalPromptBuilder
{
    private PromptComposer $composer;
    private array $conditions = [];

    public function __construct(PromptComposer $composer)
    {
        $this->composer = $composer;
    }

    public function when(bool $condition, callable $callback): self
    {
        if ($condition) {
            $callback($this->composer);
        }

        return $this;
    }

    public function unless(bool $condition, callable $callback): self
    {
        return $this->when(!$condition, $callback);
    }

    public function build(): PromptComposer
    {
        return $this->composer;
    }
}

// Usage
$builder = new ConditionalPromptBuilder(app(PromptComposer::class));

$composer = $builder
    ->when($user->isAdmin(), function ($composer) {
        $composer->section('admin-context', 'User has admin privileges.', priority: 90);
    })
    ->when($request->hasFile(), function ($composer) use ($request) {
        $composer->section('file-context', "File uploaded: {$request->file()->name}", priority: 85);
    })
    ->unless($user->hasCompletedOnboarding(), function ($composer) {
        $composer->section('onboarding', 'User is new - provide extra guidance.', priority: 95);
    })
    ->build();
```

### A/B Testing Templates

```php
class TemplateExperiment
{
    public function __construct(
        private readonly string $name,
        private readonly array $variants,
        private readonly TemplateMetrics $metrics
    ) {}

    public function run(array $variables): mixed
    {
        // Select variant (e.g., using user hash for consistency)
        $variant = $this->selectVariant();

        // Track experiment
        $this->metrics->recordExperiment($this->name, $variant);

        // Get template for variant
        $template = $this->variants[$variant];

        // Execute
        $startTime = microtime(true);
        $result = Mindwave::llm()->generate($template, $variables);
        $duration = microtime(true) - $startTime;

        // Track metrics
        $this->metrics->recordResult($this->name, $variant, [
            'duration' => $duration,
            'tokens' => strlen($result) / 4, // Rough estimate
        ]);

        return $result;
    }

    private function selectVariant(): string
    {
        // Implement variant selection logic
        // Could use user ID hash, random selection, etc.
        $variants = array_keys($this->variants);
        return $variants[array_rand($variants)];
    }
}

// Usage
$experiment = new TemplateExperiment(
    name: 'summarization-length',
    variants: [
        'short' => SummarizationTemplate::create('', maxWords: 50),
        'medium' => SummarizationTemplate::create('', maxWords: 100),
        'long' => SummarizationTemplate::create('', maxWords: 200),
    ],
    metrics: app(TemplateMetrics::class)
);

$summary = $experiment->run(['content' => $article]);
```

## Integration with Mindwave Features

### Templates with Context Discovery

Combine templates with Mindwave's Context Discovery for RAG patterns:

```php
use Mindwave\Mindwave\Context\Sources\DatabaseSource;
use Mindwave\Mindwave\PromptComposer\PromptComposer;

$contextSource = new DatabaseSource(
    table: 'knowledge_base',
    embeddings: 'embedding',
    content: 'content',
    metadata: ['title', 'category']
);

$composer = app(PromptComposer::class);
$composer
    ->section('system', 'You are a knowledgeable assistant.', priority: 100)
    ->context($contextSource, priority: 80, query: $userQuestion)
    ->section('user', $userQuestion, priority: 100);

$response = $composer->run();
```

### Templates with Token Management

PromptComposer automatically manages tokens:

```php
$composer = app(PromptComposer::class);

$composer
    ->model('gpt-4') // 8K context window
    ->reserveOutputTokens(1000) // Reserve space for response
    ->section('system', $systemPrompt, priority: 100) // Never shrunk
    ->section('context', $largeContext, priority: 80, shrinker: 'truncate') // Will shrink if needed
    ->section('examples', $examples, priority: 70, shrinker: 'compress') // Lower priority
    ->section('user', $question, priority: 100); // Never shrunk

// Automatically fits within (8K - 1K) = 7K tokens
$response = $composer->run();
```

### Templates with Tracing

All template usage is automatically traced when tracing is enabled:

```php
use Mindwave\Mindwave\Facades\Mindwave;

Mindwave::enableTracing();

$template = PromptTemplate::create('Summarize: {content}');
$result = Mindwave::llm()->generate($template, ['content' => $text]);

// Check traces
$traces = Mindwave::getTraces();
// Will show prompt template usage, token counts, etc.
```

## Testing Templates

### Unit Testing Template Output

```php
use Tests\TestCase;
use Mindwave\Mindwave\Prompts\PromptTemplate;

class PromptTemplateTest extends TestCase
{
    /** @test */
    public function it_formats_customer_support_template()
    {
        $template = CustomerSupportTemplate::create(
            customer: $this->createMockCustomer(),
            ticket: $this->createMockTicket(),
            composer: app(PromptComposer::class)
        );

        $text = $template->toText();

        $this->assertStringContainsString('professional customer support', $text);
        $this->assertStringContainsString('Test Customer', $text);
        $this->assertStringContainsString('Test Ticket Subject', $text);
    }

    /** @test */
    public function it_includes_vip_notice_for_premium_customers()
    {
        $customer = $this->createMockCustomer(['is_premium' => true]);
        $template = DynamicCustomerSupportTemplate::create($customer, ...);

        $text = $template->toText();

        $this->assertStringContainsString('PREMIUM customer', $text);
    }

    /** @test */
    public function it_substitutes_variables_correctly()
    {
        $template = PromptTemplate::create('Hello {name}, your {product} is ready.');

        $result = $template->format([
            'name' => 'Alice',
            'product' => 'Order #123'
        ]);

        $this->assertEquals('Hello Alice, your Order #123 is ready.', $result);
    }

    private function createMockCustomer(array $overrides = []): Customer
    {
        return new Customer(array_merge([
            'name' => 'Test Customer',
            'email' => 'test@example.com',
            'is_premium' => false,
        ], $overrides));
    }

    private function createMockTicket(array $overrides = []): Ticket
    {
        return new Ticket(array_merge([
            'subject' => 'Test Ticket Subject',
            'description' => 'Test description',
            'category' => 'general',
        ], $overrides));
    }
}
```

### Testing with Fixtures

```php
class PromptFixtures
{
    public static function sampleArticle(): string
    {
        return file_get_contents(base_path('tests/fixtures/sample-article.txt'));
    }

    public static function sampleCode(): string
    {
        return file_get_contents(base_path('tests/fixtures/sample-code.php'));
    }

    public static function sampleCustomerData(): array
    {
        return [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'tier' => 'premium',
            'tickets' => 5,
        ];
    }
}

// Usage in tests
/** @test */
public function it_summarizes_article()
{
    $template = SummarizationTemplate::create(
        content: PromptFixtures::sampleArticle(),
        maxWords: 100
    );

    $formatted = $template->format(['content' => PromptFixtures::sampleArticle()]);

    $this->assertStringContainsString('Summarize', $formatted);
    $this->assertStringContainsString('100 words', $formatted);
}
```

### Regression Testing

```php
class PromptRegressionTest extends TestCase
{
    /** @test */
    public function customer_support_template_snapshot()
    {
        $template = CustomerSupportTemplate::create(
            $this->createFixtureCustomer(),
            $this->createFixtureTicket(),
            app(PromptComposer::class)
        );

        $output = $template->toText();

        // Compare against saved snapshot
        $this->assertMatchesSnapshot($output);
    }

    /** @test */
    public function template_token_count_regression()
    {
        $composer = app(PromptComposer::class);
        $template = CustomerSupportTemplate::create(...);

        $tokenCount = $composer->getTokenCount();

        // Ensure templates don't unexpectedly grow
        $this->assertLessThan(3000, $tokenCount);
    }
}
```

## Best Practices

### 1. Template Design Principles

**Keep templates focused** - One template should do one thing well. Don't try to create universal templates.

```php
// Good: Focused template
class InvoiceEmailTemplate { ... }

// Bad: Generic template trying to do everything
class EmailTemplate { ... }
```

**Use clear variable names** - Make placeholder names self-documenting.

```php
// Good
'{customer_name}, your order #{order_number} is ready'

// Bad
'{name}, your {thing} is {status}'
```

**Provide defaults** - Set sensible defaults for optional parameters.

```php
public static function create(
    string $content,
    int $maxWords = 100,  // Sensible default
    string $style = 'concise'  // Sensible default
): PromptTemplate { ... }
```

### 2. When to Template vs Hardcode

**Use templates when:**
- Prompt will be reused across multiple features
- Prompt structure needs to be consistent
- Prompt requires variable substitution
- Prompt may need A/B testing
- Team needs to collaborate on prompt design

**Hardcode when:**
- One-off, unique prompts
- Very simple prompts with no variables
- Rapid prototyping
- Prompt is tightly coupled to specific logic

### 3. Version Control for Templates

**Store templates in files:**
```
resources/
  prompts/
    v1/
      customer-support.txt
      code-review.txt
    v2/
      customer-support.txt  # Updated version
      code-review.txt
```

**Use semantic versioning:**
```php
$repo->register('summarize', $template, '1.0.0');
$repo->register('summarize', $improvedTemplate, '1.1.0');
$repo->register('summarize', $breakingChangeTemplate, '2.0.0');
```

**Track changes in Git:**
- Commit template changes with clear messages
- Review template changes in PRs
- Tag significant template updates

### 4. Documentation for Templates

Document each template's purpose, variables, and expected usage:

```php
/**
 * Customer Support Response Template
 *
 * Generates professional customer support responses with context.
 *
 * @param Customer $customer The customer receiving support
 * @param Ticket $ticket The support ticket being addressed
 * @param PromptComposer $composer Composer instance for building prompt
 *
 * @return PromptComposer Configured composer ready to execute
 *
 * Variables:
 * - customer_name: Customer's full name
 * - account_type: Customer's subscription plan
 * - ticket_subject: Subject line of support ticket
 * - ticket_description: Full ticket description
 *
 * Token Budget:
 * - System: ~200 tokens
 * - Customer Context: ~300 tokens (shrinkable)
 * - Ticket: ~500 tokens
 * - Response: 800 tokens reserved
 *
 * Example:
 * ```php
 * $response = CustomerSupportTemplate::create($customer, $ticket, $composer)->run();
 * ```
 */
class CustomerSupportTemplate { ... }
```

### 5. Team Collaboration

**Centralize templates:**
- Create a `app/AI/Templates` directory
- Register templates in a service provider
- Use dependency injection for template access

**Code review templates:**
- Review template changes like code
- Test prompts before merging
- Get feedback from domain experts

**Share knowledge:**
- Document effective prompting patterns
- Share successful templates across teams
- Create a template style guide

### 6. Performance Considerations

**Cache compiled templates:**
```php
use Illuminate\Support\Facades\Cache;

public function getCachedTemplate(string $name): PromptTemplate
{
    return Cache::remember("template.{$name}", 3600, function () use ($name) {
        return PromptTemplate::fromPath(resource_path("prompts/{$name}.txt"));
    });
}
```

**Lazy-load large templates:**
```php
public function getLargeTemplate(): PromptTemplate
{
    return once(fn() => PromptTemplate::fromPath(resource_path('prompts/large.txt')));
}
```

**Monitor token usage:**
```php
$composer->fit();

if ($composer->getTokenCount() > 6000) {
    Log::warning('Template exceeds recommended token count', [
        'count' => $composer->getTokenCount(),
        'template' => 'customer-support'
    ]);
}
```

## Troubleshooting

### Variable Substitution Errors

**Problem:** Variables not being replaced in output.

```php
$template = PromptTemplate::create('Hello {name}');
$result = $template->format([]); // Missing variable
// Output: "Hello {name}" - not replaced!
```

**Solution:** Ensure all variables are provided.

```php
$result = $template->format(['name' => 'Alice']); // ✓
```

### Missing Variables

**Problem:** Some variables undefined at runtime.

**Solution:** Provide default values or validate before formatting.

```php
public function format(array $variables): string
{
    $required = ['name', 'product'];
    $missing = array_diff($required, array_keys($variables));

    if (!empty($missing)) {
        throw new \InvalidArgumentException(
            'Missing required variables: ' . implode(', ', $missing)
        );
    }

    return $this->template->format($variables);
}
```

### Template Not Found

**Problem:** File-based template doesn't exist.

```php
$template = PromptTemplate::fromPath(resource_path('prompts/missing.txt'));
// Error: file_get_contents(): Failed to open stream
```

**Solution:** Check file exists before loading.

```php
public static function fromPath(string $path): PromptTemplate
{
    if (!file_exists($path)) {
        throw new \InvalidArgumentException("Template file not found: {$path}");
    }

    return new self(file_get_contents($path));
}
```

### Unexpected Output Format

**Problem:** LLM not following output format instructions.

**Solution:** Use appropriate output parser and be more explicit.

```php
// Instead of hoping for JSON
$template = PromptTemplate::create('Extract data: {text}');

// Use JsonOutputParser
$template = PromptTemplate::create(
    'Extract data: {text}',
    new JsonOutputParser()  // Adds format instructions automatically
);
```

### Token Budget Exceeded

**Problem:** Prompt sections exceed model's context window.

```php
$composer->section('large-context', $hugeText);
$composer->fit();
// RuntimeException: Non-shrinkable sections exceed available budget
```

**Solution:** Mark large sections as shrinkable.

```php
$composer->section(
    'large-context',
    $hugeText,
    priority: 70,
    shrinker: 'truncate'  // Allow shrinking
);
```

### Prompt Composer Priority Issues

**Problem:** Important sections being dropped or over-shrunk.

**Solution:** Use appropriate priorities (0-100, higher = more important).

```php
$composer
    ->section('system', $systemPrompt, priority: 100)  // Always keep
    ->section('examples', $examples, priority: 50)      // Less important
    ->section('user', $userQuery, priority: 100);       // Always keep
```

---

**Next Steps:**
- Explore [Context Discovery](/docs/advanced/context-discovery) for RAG patterns
- Learn about [Token Management](/docs/advanced/token-management) in PromptComposer
- Read [Output Parsers](/docs/output-parsers) for structured responses
