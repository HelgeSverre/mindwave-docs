# Output Parsers

## Overview

Output Parsers transform unstructured LLM text responses into structured, typed data that your Laravel application can reliably work with. While LLMs are powerful, their text outputs need to be parsed and validated before you can use them programmatically.

### Why Parse LLM Outputs?

**The Challenge:**
- LLMs generate natural language text, not structured data
- Response formats can vary even with detailed instructions
- Type safety is crucial for production applications
- Validation prevents downstream errors

**The Solution:**
Output Parsers provide a structured approach to converting LLM text into typed PHP objects, arrays, or collections. They handle:

- **Format Instructions** - Tell the LLM how to structure its response
- **Parsing Logic** - Extract structured data from text responses
- **Type Safety** - Convert data to proper PHP types
- **Error Handling** - Gracefully handle malformed responses

### Common Parsing Challenges

1. **Inconsistent Formatting** - LLMs may add extra text or formatting
2. **Type Mismatches** - String numbers vs actual integers
3. **Missing Fields** - Optional data not always present
4. **JSON Extraction** - Finding JSON in markdown code blocks
5. **Validation** - Ensuring data meets business requirements

### How Mindwave Approaches Output Parsing

Mindwave provides a simple, extensible parser system:

```php
interface OutputParser
{
    // Get format instructions to append to prompts
    public function getFormatInstructions(): string;

    // Parse LLM response into structured data
    public function parse(string $text): mixed;
}
```

Parsers integrate seamlessly with `PromptTemplate` to automatically format prompts with parsing instructions and parse responses.

## Built-in Parsers

Mindwave includes five production-ready parsers for common use cases.

### TextOutputParser

The simplest parser - returns raw text without modification. This is the default parser.

```php
use Mindwave\Mindwave\Prompts\OutputParsers\TextOutputParser;
use Mindwave\Mindwave\Prompts\PromptTemplate;

$template = PromptTemplate::create(
    'Write a tagline for {product}',
    new TextOutputParser()
);

$prompt = $template->format(['product' => 'Laravel']);
// "Write a tagline for Laravel"

$response = Mindwave::llm()->generate($template, ['product' => 'Laravel']);
// "Empowering Web Artisans to Build Amazing Applications"
```

**Use When:**
- You need the raw LLM output
- No structured parsing required
- Simple text generation tasks

### JsonOutputParser

Parses JSON responses from markdown code blocks, returning associative arrays.

```php
use Mindwave\Mindwave\Prompts\OutputParsers\JsonOutputParser;

$template = PromptTemplate::create(
    'Extract contact details from: {text}',
    new JsonOutputParser()
);

$prompt = $template->format(['text' => 'Email john@example.com or call 555-0123']);

// The format instructions are automatically appended:
// "RESPONSE FORMAT INSTRUCTIONS
// ----------------------------
// When responding to me please, please output the response in the following format:
// ```json
// {
//     // response
// }
// ```
// However, above all else, all responses must adhere to the format of RESPONSE FORMAT INSTRUCTIONS.
// Remember to respond with a JSON blob, and NOTHING else."

$result = Mindwave::llm()->generate($template, [
    'text' => 'Email john@example.com or call 555-0123'
]);

// Returns array:
// [
//     'email' => 'john@example.com',
//     'phone' => '555-0123'
// ]
```

**How It Works:**

1. Appends JSON format instructions to your prompt
2. Extracts JSON from between ` ```json ` and ` ``` ` markers
3. Validates that the content is valid JSON
4. Decodes to associative array

**Error Handling:**

```php
use InvalidArgumentException;

try {
    $parser = new JsonOutputParser();
    $result = $parser->parse('Invalid response without JSON');
} catch (InvalidArgumentException $e) {
    // "Could not parse response"
    Log::error('Failed to parse LLM response', [
        'error' => $e->getMessage()
    ]);
}
```

### JsonListOutputParser

Specialized parser for extracting arrays of strings from a JSON response with a `data` key.

```php
use Mindwave\Mindwave\Prompts\OutputParsers\JsonListOutputParser;

$template = PromptTemplate::create(
    'Generate 5 keywords for {topic}',
    new JsonListOutputParser()
);

$result = Mindwave::llm()->generate($template, ['topic' => 'Laravel']);

// Returns array:
// ['eloquent', 'artisan', 'routing', 'middleware', 'migrations']
```

**Format Instructions:**

```
RESPONSE FORMAT INSTRUCTIONS
----------------------------
When responding to me please, please output the response in the following format:
```json
{
    "data": array // An array of strings.
}
```
However, above all else, all responses must adhere to the format of RESPONSE FORMAT INSTRUCTIONS.
Remember to respond with a JSON blob with a single key, and NOTHING else.
```

**Implementation:**

```php
// Extends JsonOutputParser and extracts the 'data' key
public function parse(string $text): array
{
    return Arr::get(parent::parse($text), 'data', []);
}
```

**Use Cases:**

```php
// Generate keyword lists
$keywords = Mindwave::llm()->generate(
    PromptTemplate::create(
        'List SEO keywords for {topic}',
        new JsonListOutputParser()
    ),
    ['topic' => 'AI in Laravel']
);

// Generate tag suggestions
$tags = Mindwave::llm()->generate(
    PromptTemplate::create(
        'Suggest tags for this article: {content}',
        new JsonListOutputParser()
    ),
    ['content' => $article->content]
);

// Extract entities
$entities = Mindwave::llm()->generate(
    PromptTemplate::create(
        'Extract all company names mentioned in: {text}',
        new JsonListOutputParser()
    ),
    ['text' => $document]
);
```

### CommaSeparatedListOutputParser

Parses simple comma-separated lists into arrays. Ideal for quick list generation.

```php
use Mindwave\Mindwave\Prompts\OutputParsers\CommaSeparatedListOutputParser;

$template = PromptTemplate::create(
    'List 3 colors for {theme}',
    new CommaSeparatedListOutputParser()
);

$result = Mindwave::llm()->generate($template, ['theme' => 'ocean']);

// Returns array:
// ['blue', 'turquoise', 'navy']
```

**Format Instructions:**

```
Your response should be a list of comma separated values, eg: `foo, bar, baz`
```

**Implementation:**

```php
public function parse(string $text): array
{
    return array_map('trim', explode(',', $text));
}
```

**When to Use:**
- Simple list generation
- When JSON is overkill
- Lighter format instructions
- Quick prototyping

**Comparison with JsonListOutputParser:**

```php
// CommaSeparatedListOutputParser - simpler, lighter
// LLM Response: "red, green, blue"
// Result: ['red', 'green', 'blue']

// JsonListOutputParser - more structured, reliable
// LLM Response: ```json{"data": ["red", "green", "blue"]}```
// Result: ['red', 'green', 'blue']
```

### StructuredOutputParser

The most powerful parser - converts JSON responses into typed PHP objects using reflection.

```php
use Mindwave\Mindwave\Prompts\OutputParsers\StructuredOutputParser;

class Person
{
    public string $name;
    public ?int $age;
    public ?bool $hasBusiness;
    public ?array $interests;
    public ?Collection $tags;
}

$template = PromptTemplate::create(
    'Generate random details about a fictional person',
    new StructuredOutputParser(Person::class)
);

$person = Mindwave::llm()->generate($template);

// Returns instance of Person:
// Person {
//     name: "Lila Jones"
//     age: 28
//     hasBusiness: true
//     interests: ["hiking", "reading", "painting"]
//     tags: Collection(['adventurous', 'creative', 'entrepreneur'])
// }

echo $person->name; // "Lila Jones"
echo $person->age;  // 28
```

**How It Works:**

1. Uses reflection to analyze class properties
2. Generates JSON schema from property types
3. Appends schema-based format instructions
4. Parses JSON response and instantiates class
5. Converts values to correct types

**Schema Generation:**

```php
$parser = new StructuredOutputParser(Person::class);
$schema = $parser->getSchemaStructure();

// Returns:
// [
//     'properties' => [
//         'name' => ['role' => 'string'],
//         'age' => ['role' => 'int'],
//         'hasBusiness' => ['role' => 'bool'],
//         'interests' => ['role' => 'array'],
//         'tags' => ['role' => 'array'],
//     ],
//     'required' => ['name'] // Non-nullable properties
// ]
```

**Type Mapping:**

| PHP Type | Schema Role | Conversion |
|----------|-------------|------------|
| `string` | `string` | As-is |
| `int` | `int` | `intval()` |
| `float` | `float` | `floatval()` |
| `bool` | `bool` | `boolval()` |
| `array` | `array` | As-is |
| `Collection` | `array` | `collect()` |
| Other | `object` | As-is |

**Format Instructions:**

```
RESPONSE FORMAT INSTRUCTIONS
----------------------------
The output should be formatted as a JSON instance that conforms to the JSON schema below.

As an example, for the schema {"properties": {"foo": {"title": "Foo", "description": "a list of strings", "role": "array", "items": {"role": "string"}}}, "required": ["foo"]}
the object {"foo": ["bar", "baz"]} is a well-formatted instance of the schema. The object {"properties": {"foo": ["bar", "baz"]}} is not well-formatted.

Here is the output schema:
```json
{"properties":{"name":{"role":"string"},"age":{"role":"int"},...},"required":["name"]}
```
Remember to respond with a JSON blob, and NOTHING else.
```

## Real-World Examples

### Example 1: Contact Information Extraction

Extract structured contact details from unstructured text.

```php
use Mindwave\Mindwave\Prompts\OutputParsers\StructuredOutputParser;

class ContactInfo
{
    public string $name;
    public ?string $email;
    public ?string $phone;
    public ?string $company;
    public ?string $jobTitle;
}

$text = "Hi, I'm Sarah Chen, CTO at TechCorp.
         You can reach me at sarah.chen@techcorp.com or 555-0199.";

$template = PromptTemplate::create(
    'Extract contact information from this text: {text}',
    new StructuredOutputParser(ContactInfo::class)
);

$contact = Mindwave::llm()->generate($template, ['text' => $text]);

// Validate with Laravel
$validator = validator($contact, [
    'name' => 'required|string',
    'email' => 'nullable|email',
    'phone' => 'nullable|string',
]);

if ($validator->fails()) {
    throw new ValidationException($validator);
}

// Use the structured data
Contact::create([
    'name' => $contact->name,
    'email' => $contact->email,
    'phone' => $contact->phone,
    'company' => $contact->company,
    'job_title' => $contact->jobTitle,
]);
```

### Example 2: Sentiment Analysis Output

Parse sentiment scores with reasoning.

```php
class SentimentAnalysis
{
    public string $sentiment; // positive, negative, neutral
    public float $score;      // -1.0 to 1.0
    public string $reasoning;
    public ?array $keywords;
}

$template = PromptTemplate::create(
    'Analyze the sentiment of this review: {review}',
    new StructuredOutputParser(SentimentAnalysis::class)
);

$result = Mindwave::llm()->generate($template, [
    'review' => $productReview->content
]);

// Returns:
// SentimentAnalysis {
//     sentiment: "positive"
//     score: 0.85
//     reasoning: "Customer expresses high satisfaction with product quality and service"
//     keywords: ["excellent", "satisfied", "recommend"]
// }

// Store analysis
$productReview->update([
    'sentiment' => $result->sentiment,
    'sentiment_score' => $result->score,
    'sentiment_analysis' => $result->reasoning,
]);

// Trigger workflows based on sentiment
if ($result->sentiment === 'negative' && $result->score < -0.7) {
    dispatch(new AlertCustomerServiceJob($productReview));
}
```

### Example 3: Product Data Extraction

Extract product details from unstructured descriptions.

```php
class ProductData
{
    public string $name;
    public ?string $category;
    public ?float $price;
    public ?string $color;
    public ?string $size;
    public ?array $features;
    public ?string $material;
}

$description = "The Aurora Wireless Headphones in Midnight Black
                offer premium sound quality with active noise cancellation.
                Features include 30-hour battery life, USB-C charging,
                and Bluetooth 5.0. Made with sustainable materials.
                Only $199.99.";

$template = PromptTemplate::create(
    'Extract product information from: {description}',
    new StructuredOutputParser(ProductData::class)
);

$product = Mindwave::llm()->generate($template, [
    'description' => $description
]);

// Validate
validator($product, [
    'name' => 'required|string',
    'price' => 'nullable|numeric|min:0',
    'features' => 'nullable|array',
])->validate();

// Create product
Product::create([
    'name' => $product->name,
    'category' => $product->category,
    'price' => $product->price,
    'color' => $product->color,
    'features' => $product->features,
    'material' => $product->material,
]);
```

### Example 4: Meeting Notes Parser

Parse complex meeting notes with nested structures.

```php
use Illuminate\Support\Collection;

class MeetingNotes
{
    public string $title;
    public string $date;
    public array $attendees;
    public array $decisions;
    public array $actionItems;
    public ?string $nextMeetingDate;
}

class ActionItem
{
    public string $task;
    public string $assignee;
    public ?string $dueDate;
    public string $priority; // high, medium, low
}

// First, parse the meeting notes
$notesTemplate = PromptTemplate::create(
    'Parse these meeting notes: {notes}',
    new StructuredOutputParser(MeetingNotes::class)
);

$meeting = Mindwave::llm()->generate($notesTemplate, [
    'notes' => $rawNotes
]);

// Then parse each action item into structured objects
$actionItemTemplate = PromptTemplate::create(
    'Convert this to a structured action item: {item}',
    new StructuredOutputParser(ActionItem::class)
);

$structuredActions = collect($meeting->actionItems)->map(function ($item) use ($actionItemTemplate) {
    return Mindwave::llm()->generate($actionItemTemplate, ['item' => $item]);
});

// Store in database
$meetingRecord = Meeting::create([
    'title' => $meeting->title,
    'date' => Carbon::parse($meeting->date),
    'attendees' => $meeting->attendees,
    'decisions' => $meeting->decisions,
]);

foreach ($structuredActions as $action) {
    Task::create([
        'meeting_id' => $meetingRecord->id,
        'description' => $action->task,
        'assignee' => User::where('name', $action->assignee)->first()?->id,
        'due_date' => $action->dueDate ? Carbon::parse($action->dueDate) : null,
        'priority' => $action->priority,
    ]);
}
```

## Creating Custom Parsers

Build custom parsers for specialized parsing needs.

### Basic Custom Parser

```php
use Mindwave\Mindwave\Contracts\OutputParser;

class KeyValueOutputParser implements OutputParser
{
    public function getFormatInstructions(): string
    {
        return "Format your response as key-value pairs, one per line:\nkey: value";
    }

    public function parse(string $text): array
    {
        $result = [];
        $lines = explode("\n", trim($text));

        foreach ($lines as $line) {
            if (str_contains($line, ':')) {
                [$key, $value] = explode(':', $line, 2);
                $result[trim($key)] = trim($value);
            }
        }

        return $result;
    }
}

// Usage
$template = PromptTemplate::create(
    'Extract metadata from: {text}',
    new KeyValueOutputParser()
);

$result = Mindwave::llm()->generate($template, [
    'text' => 'Document created on 2024-01-15 by John Doe, status: approved'
]);

// Returns:
// [
//     'created' => '2024-01-15',
//     'author' => 'John Doe',
//     'status' => 'approved'
// ]
```

### Parser with Validation

```php
class EmailListParser implements OutputParser
{
    public function getFormatInstructions(): string
    {
        return "List email addresses one per line.";
    }

    public function parse(string $text): array
    {
        $lines = explode("\n", trim($text));
        $emails = [];

        foreach ($lines as $line) {
            $email = trim($line);

            // Validate email format
            if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $emails[] = $email;
            } else {
                Log::warning('Invalid email in LLM response', ['email' => $email]);
            }
        }

        return $emails;
    }
}
```

### Parser with Type Conversion

```php
class NumericRangeParser implements OutputParser
{
    public function getFormatInstructions(): string
    {
        return "Respond with 'min: X, max: Y' where X and Y are numbers.";
    }

    public function parse(string $text): array
    {
        preg_match('/min:\s*(\d+(?:\.\d+)?),\s*max:\s*(\d+(?:\.\d+)?)/', $text, $matches);

        if (count($matches) !== 3) {
            throw new InvalidArgumentException('Could not parse numeric range');
        }

        return [
            'min' => (float) $matches[1],
            'max' => (float) $matches[2],
        ];
    }
}
```

### Parser with Default Values

```php
class ProductRatingParser implements OutputParser
{
    public function getFormatInstructions(): string
    {
        return "Rate the product on a scale of 1-5 stars and provide a brief comment.";
    }

    public function parse(string $text): array
    {
        // Try to extract rating
        preg_match('/(\d+(?:\.\d+)?)\s*(?:stars?|\/5)/i', $text, $matches);
        $rating = isset($matches[1]) ? (float) $matches[1] : 3.0; // Default to 3.0

        // Clamp rating between 1 and 5
        $rating = max(1.0, min(5.0, $rating));

        return [
            'rating' => $rating,
            'comment' => trim(preg_replace('/\d+(?:\.\d+)?\s*(?:stars?|\/5)/i', '', $text)),
        ];
    }
}
```

## Data Validation

Always validate parsed output before using it in your application.

### Laravel Validation Integration

```php
class ProductReview
{
    public string $productName;
    public int $rating;
    public string $comment;
    public ?array $pros;
    public ?array $cons;
}

$template = PromptTemplate::create(
    'Review this product: {description}',
    new StructuredOutputParser(ProductReview::class)
);

$review = Mindwave::llm()->generate($template, ['description' => $product->description]);

// Validate with Laravel
$validated = validator((array) $review, [
    'productName' => 'required|string|max:255',
    'rating' => 'required|integer|min:1|max:5',
    'comment' => 'required|string|min:10',
    'pros' => 'nullable|array',
    'pros.*' => 'string',
    'cons' => 'nullable|array',
    'cons.*' => 'string',
])->validate();

// Safe to use
ProductReview::create($validated);
```

### Custom Validation Logic

```php
class CustomValidator
{
    public static function validateContactInfo(ContactInfo $contact): bool
    {
        // Business rule: Must have either email or phone
        if (empty($contact->email) && empty($contact->phone)) {
            throw new ValidationException('Contact must have email or phone');
        }

        // Validate email format if present
        if ($contact->email && !filter_var($contact->email, FILTER_VALIDATE_EMAIL)) {
            throw new ValidationException('Invalid email format');
        }

        // Validate phone format if present
        if ($contact->phone && !preg_match('/^\d{3}-\d{4}$/', $contact->phone)) {
            throw new ValidationException('Phone must be in format XXX-XXXX');
        }

        return true;
    }
}

$contact = Mindwave::llm()->generate($template, ['text' => $input]);
CustomValidator::validateContactInfo($contact);
```

### Type Safety with DTOs

Use Data Transfer Objects for additional type safety:

```php
use Spatie\LaravelData\Data;

class ContactData extends Data
{
    public function __construct(
        public string $name,
        public ?string $email,
        public ?string $phone,
    ) {}

    public static function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'nullable|email',
            'phone' => 'nullable|string',
        ];
    }
}

// Parse and validate in one step
$rawContact = Mindwave::llm()->generate($template, ['text' => $input]);
$contact = ContactData::from($rawContact);

// Now type-safe and validated
echo $contact->email; // string|null
```

### Schema Validation for JSON

Use JSON Schema for complex validation:

```php
use Opis\JsonSchema\Validator;
use Opis\JsonSchema\Errors\ErrorFormatter;

$schema = json_decode('{
    "type": "object",
    "properties": {
        "name": {"type": "string", "minLength": 1},
        "age": {"type": "integer", "minimum": 0, "maximum": 150},
        "email": {"type": "string", "format": "email"}
    },
    "required": ["name"]
}');

$parser = new JsonOutputParser();
$data = $parser->parse($llmResponse);

$validator = new Validator();
$result = $validator->validate(json_decode(json_encode($data)), $schema);

if (!$result->isValid()) {
    $formatter = new ErrorFormatter();
    $errors = $formatter->format($result->error());
    throw new ValidationException('Schema validation failed: ' . json_encode($errors));
}
```

## Advanced Patterns

### Parser Composition (Chaining Parsers)

Combine multiple parsers for complex workflows:

```php
class ParserChain
{
    protected array $parsers = [];

    public function add(OutputParser $parser): self
    {
        $this->parsers[] = $parser;
        return $this;
    }

    public function parse(string $text): mixed
    {
        $result = $text;

        foreach ($this->parsers as $parser) {
            $result = $parser->parse($result);
        }

        return $result;
    }
}

// Usage: Extract JSON, then convert to object
$chain = (new ParserChain())
    ->add(new JsonOutputParser())
    ->add(new class implements OutputParser {
        public function getFormatInstructions(): string { return ''; }

        public function parse(string $text): mixed {
            return (object) json_decode($text, true);
        }
    });

$result = $chain->parse($llmResponse);
```

### Fallback Parsing Strategies

Try multiple parsing strategies when the primary one fails:

```php
class FallbackParser implements OutputParser
{
    protected array $parsers;

    public function __construct(array $parsers)
    {
        $this->parsers = $parsers;
    }

    public function getFormatInstructions(): string
    {
        return $this->parsers[0]->getFormatInstructions();
    }

    public function parse(string $text): mixed
    {
        foreach ($this->parsers as $parser) {
            try {
                return $parser->parse($text);
            } catch (Exception $e) {
                Log::debug('Parser failed, trying next', [
                    'parser' => get_class($parser),
                    'error' => $e->getMessage()
                ]);
                continue;
            }
        }

        throw new RuntimeException('All parsers failed');
    }
}

// Try JSON first, fall back to comma-separated
$parser = new FallbackParser([
    new JsonListOutputParser(),
    new CommaSeparatedListOutputParser(),
]);
```

### Retry with Clarification Prompts

Re-prompt the LLM when parsing fails:

```php
class RetryingParser
{
    protected OutputParser $parser;
    protected int $maxRetries;

    public function __construct(OutputParser $parser, int $maxRetries = 3)
    {
        $this->parser = $parser;
        $this->maxRetries = $maxRetries;
    }

    public function parseWithRetry(string $originalPrompt, array $variables = []): mixed
    {
        $attempts = 0;
        $lastError = null;

        while ($attempts < $this->maxRetries) {
            $response = Mindwave::llm()->generate(
                PromptTemplate::create($originalPrompt, $this->parser),
                $variables
            );

            try {
                return $response;
            } catch (Exception $e) {
                $lastError = $e;
                $attempts++;

                // Add clarification to the prompt
                $variables['previous_error'] = $e->getMessage();
                $originalPrompt .= "\n\nPrevious attempt failed with error: {previous_error}. Please try again following the format instructions exactly.";

                Log::warning('Parsing failed, retrying', [
                    'attempt' => $attempts,
                    'error' => $e->getMessage()
                ]);
            }
        }

        throw new RuntimeException(
            "Failed to parse after {$this->maxRetries} attempts. Last error: " . $lastError->getMessage()
        );
    }
}

// Usage
$parser = new RetryingParser(new JsonOutputParser());
$result = $parser->parseWithRetry('Extract data from: {text}', ['text' => $input]);
```

### Partial Parsing

Extract what's possible even when some data is missing:

```php
class PartialContactParser implements OutputParser
{
    public function getFormatInstructions(): string
    {
        return "Extract contact info as JSON: {\"name\": \"\", \"email\": \"\", \"phone\": \"\"}";
    }

    public function parse(string $text): object
    {
        $defaults = [
            'name' => null,
            'email' => null,
            'phone' => null,
            'company' => null,
        ];

        try {
            $data = json_decode($text, true);
            if (!$data) {
                throw new InvalidArgumentException('Invalid JSON');
            }
        } catch (Exception $e) {
            // Try regex extraction as fallback
            $data = [];

            if (preg_match('/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/', $text, $matches)) {
                $data['email'] = $matches[0];
            }

            if (preg_match('/\d{3}-\d{3}-\d{4}/', $text, $matches)) {
                $data['phone'] = $matches[0];
            }
        }

        // Merge with defaults
        return (object) array_merge($defaults, $data);
    }
}
```

### Streaming Output Parsing

For streaming LLM responses, parse incrementally:

```php
class StreamingJsonParser
{
    protected string $buffer = '';
    protected bool $inJsonBlock = false;

    public function addChunk(string $chunk): void
    {
        $this->buffer .= $chunk;

        // Detect start of JSON block
        if (!$this->inJsonBlock && str_contains($this->buffer, '```json')) {
            $this->inJsonBlock = true;
        }
    }

    public function tryParse(): ?array
    {
        if (!$this->inJsonBlock) {
            return null;
        }

        // Check if JSON block is complete
        if (!str_contains($this->buffer, '```', strpos($this->buffer, '```json') + 7)) {
            return null; // Not complete yet
        }

        // Extract and parse
        $parser = new JsonOutputParser();
        try {
            return $parser->parse($this->buffer);
        } catch (Exception $e) {
            return null; // Not valid yet
        }
    }

    public function reset(): void
    {
        $this->buffer = '';
        $this->inJsonBlock = false;
    }
}
```

## Error Handling

Robust error handling is critical when working with unpredictable LLM outputs.

### Handling Malformed JSON

```php
use InvalidArgumentException;

try {
    $parser = new JsonOutputParser();
    $result = $parser->parse($llmResponse);
} catch (InvalidArgumentException $e) {
    Log::error('JSON parsing failed', [
        'response' => $llmResponse,
        'error' => $e->getMessage()
    ]);

    // Fallback: Try to extract any JSON from the response
    preg_match('/\{.*\}/s', $llmResponse, $matches);
    if (isset($matches[0])) {
        try {
            $result = json_decode($matches[0], true);
        } catch (Exception $e) {
            // Ultimate fallback
            $result = ['error' => 'Could not parse response', 'raw' => $llmResponse];
        }
    }
}
```

### Handling Missing Required Fields

```php
class SafeStructuredParser extends StructuredOutputParser
{
    public function parse(string $text): mixed
    {
        $result = parent::parse($text);

        if ($result === null) {
            throw new ParsingException('Failed to parse structured output');
        }

        // Validate required fields based on schema
        $schema = $this->getSchemaStructure();
        foreach ($schema['required'] as $field) {
            if (!isset($result->{$field}) || empty($result->{$field})) {
                throw new ValidationException("Required field '{$field}' is missing or empty");
            }
        }

        return $result;
    }
}
```

### Handling Type Mismatches

```php
class TypeSafeParser extends StructuredOutputParser
{
    public function parse(string $text): mixed
    {
        $result = parent::parse($text);

        if ($result === null) {
            return null;
        }

        // Validate types match schema
        $reflectionClass = new ReflectionClass($this->schema);

        foreach ($reflectionClass->getProperties() as $property) {
            $propertyName = $property->getName();
            $expectedType = $property->getType()->getName();

            if (!isset($result->{$propertyName})) {
                continue;
            }

            $actualType = gettype($result->{$propertyName});

            // Verify type compatibility
            $compatible = match($expectedType) {
                'string' => $actualType === 'string',
                'int' => $actualType === 'integer',
                'float' => in_array($actualType, ['double', 'integer']),
                'bool' => $actualType === 'boolean',
                'array' => $actualType === 'array',
                Collection::class => $actualType === 'object' && $result->{$propertyName} instanceof Collection,
                default => true
            };

            if (!$compatible) {
                throw new TypeError(
                    "Property '{$propertyName}' expected {$expectedType}, got {$actualType}"
                );
            }
        }

        return $result;
    }
}
```

### Recovery Strategies

```php
class ResilientParser
{
    protected OutputParser $parser;
    protected $fallbackValue;

    public function __construct(OutputParser $parser, $fallbackValue = null)
    {
        $this->parser = $parser;
        $this->fallbackValue = $fallbackValue;
    }

    public function parse(string $text): mixed
    {
        try {
            return $this->parser->parse($text);
        } catch (Exception $e) {
            Log::error('Parser failed, using fallback', [
                'parser' => get_class($this->parser),
                'error' => $e->getMessage(),
                'text' => $text
            ]);

            // Log for later analysis
            FailedParse::create([
                'parser_class' => get_class($this->parser),
                'input_text' => $text,
                'error_message' => $e->getMessage(),
                'stack_trace' => $e->getTraceAsString(),
            ]);

            return $this->fallbackValue;
        }
    }
}

// Usage with sensible defaults
$parser = new ResilientParser(
    new JsonListOutputParser(),
    fallbackValue: []  // Empty array if parsing fails
);

$tags = $parser->parse($llmResponse);
```

## Integration with Mindwave

### Using Parsers with LLM Responses

Parsers integrate seamlessly with Mindwave's LLM interface:

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\Prompts\PromptTemplate;
use Mindwave\Mindwave\Prompts\OutputParsers\JsonOutputParser;

// Method 1: Pass PromptTemplate with parser to generate()
$result = Mindwave::llm()->generate(
    PromptTemplate::create(
        'Extract data from: {text}',
        new JsonOutputParser()
    ),
    ['text' => $input]
);

// Result is automatically parsed

// Method 2: Manual parsing
$template = PromptTemplate::create(
    'Summarize: {text}',
    new JsonOutputParser()
);

$prompt = $template->format(['text' => $article]);
$response = Mindwave::llm()->prompt($prompt);
$parsed = $template->parse($response);
```

### Integration with PromptComposer

```php
use Mindwave\Mindwave\Prompts\PromptComposer;

$composer = new PromptComposer();
$composer
    ->system('You are a helpful assistant that extracts structured data.')
    ->user('Extract contact info from: {text}')
    ->withOutputParser(new StructuredOutputParser(ContactInfo::class));

$contact = Mindwave::llm()->generate($composer, ['text' => $emailBody]);
```

### Tracing Parsed Outputs

Track parsing operations in your traces:

```php
use Mindwave\Mindwave\Facades\Mindwave;

$result = Mindwave::traced(function () use ($input) {
    $template = PromptTemplate::create(
        'Parse this data: {input}',
        new JsonOutputParser()
    );

    return Mindwave::llm()->generate($template, ['input' => $input]);
}, attributes: [
    'parser.type' => 'json',
    'parser.format' => 'structured',
]);

// Parsing errors are automatically captured in traces
```

### Error Tracking

Monitor parsing failures:

```php
use Mindwave\Mindwave\Events\ParsingFailed;
use Mindwave\Mindwave\Facades\Mindwave;

Event::listen(ParsingFailed::class, function ($event) {
    Log::error('LLM output parsing failed', [
        'parser' => $event->parserClass,
        'input' => $event->rawText,
        'error' => $event->error,
    ]);

    // Alert if parsing failures spike
    if (Cache::increment('parsing_failures', 1, now()->addMinutes(5)) > 10) {
        Alert::send('High parsing failure rate detected');
    }
});

// Trigger event when parsing fails
try {
    $result = $parser->parse($text);
} catch (Exception $e) {
    event(new ParsingFailed(get_class($parser), $text, $e->getMessage()));
    throw $e;
}
```

## Testing Parsers

### Unit Testing Parsers

```php
use Tests\TestCase;
use Mindwave\Mindwave\Prompts\OutputParsers\JsonOutputParser;

class JsonOutputParserTest extends TestCase
{
    /** @test */
    public function it_parses_json_from_markdown_code_block()
    {
        $parser = new JsonOutputParser();

        $input = '```json
        {
            "name": "John Doe",
            "email": "john@example.com"
        }
        ```';

        $result = $parser->parse($input);

        $this->assertIsArray($result);
        $this->assertEquals('John Doe', $result['name']);
        $this->assertEquals('john@example.com', $result['email']);
    }

    /** @test */
    public function it_throws_exception_for_invalid_json()
    {
        $parser = new JsonOutputParser();

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Could not parse response');

        $parser->parse('This is not JSON');
    }

    /** @test */
    public function it_handles_json_with_whitespace()
    {
        $parser = new JsonOutputParser();

        $input = '  ```json
        {"key": "value"}
        ```  ';

        $result = $parser->parse($input);

        $this->assertEquals(['key' => 'value'], $result);
    }
}
```

### Testing Structured Output Parser

```php
use Mindwave\Mindwave\Prompts\OutputParsers\StructuredOutputParser;

class StructuredOutputParserTest extends TestCase
{
    /** @test */
    public function it_generates_correct_schema_from_class()
    {
        class TestPerson
        {
            public string $name;
            public ?int $age;
        }

        $parser = new StructuredOutputParser(TestPerson::class);
        $schema = $parser->getSchemaStructure();

        $this->assertArrayHasKey('properties', $schema);
        $this->assertArrayHasKey('required', $schema);
        $this->assertContains('name', $schema['required']);
        $this->assertNotContains('age', $schema['required']);
    }

    /** @test */
    public function it_parses_json_into_class_instance()
    {
        class TestProduct
        {
            public string $name;
            public float $price;
            public bool $inStock;
        }

        $parser = new StructuredOutputParser(TestProduct::class);

        $json = '{"name": "Widget", "price": "29.99", "inStock": true}';
        $result = $parser->parse($json);

        $this->assertInstanceOf(TestProduct::class, $result);
        $this->assertEquals('Widget', $result->name);
        $this->assertEquals(29.99, $result->price);
        $this->assertTrue($result->inStock);
    }

    /** @test */
    public function it_converts_types_correctly()
    {
        class TestTypes
        {
            public int $count;
            public float $rating;
            public bool $active;
        }

        $parser = new StructuredOutputParser(TestTypes::class);

        // LLM might return strings
        $json = '{"count": "42", "rating": "4.5", "active": "true"}';
        $result = $parser->parse($json);

        $this->assertIsInt($result->count);
        $this->assertIsFloat($result->rating);
        $this->assertIsBool($result->active);
    }
}
```

### Test Data Generation

```php
class ParserTestDataFactory
{
    public static function jsonWithCodeBlock(array $data): string
    {
        return sprintf("```json\n%s\n```", json_encode($data));
    }

    public static function malformedJson(): string
    {
        return '```json { "key": "value", } ```'; // Trailing comma
    }

    public static function validContactInfo(): array
    {
        return [
            'name' => 'Jane Smith',
            'email' => 'jane@example.com',
            'phone' => '555-0123',
        ];
    }

    public static function incompleteContactInfo(): array
    {
        return [
            'name' => 'John Doe',
            // Missing email and phone
        ];
    }
}

// Usage in tests
/** @test */
public function it_handles_complete_contact_info()
{
    $parser = new JsonOutputParser();
    $input = ParserTestDataFactory::jsonWithCodeBlock(
        ParserTestDataFactory::validContactInfo()
    );

    $result = $parser->parse($input);

    $this->assertArrayHasKey('name', $result);
    $this->assertArrayHasKey('email', $result);
    $this->assertArrayHasKey('phone', $result);
}
```

### Edge Case Testing

```php
class ParserEdgeCaseTest extends TestCase
{
    /** @test */
    public function it_handles_empty_arrays()
    {
        $parser = new JsonListOutputParser();
        $result = $parser->parse('```json{"data": []}```');

        $this->assertEquals([], $result);
    }

    /** @test */
    public function it_handles_unicode_characters()
    {
        $parser = new JsonOutputParser();
        $input = '```json{"message": "Hello 世界 🌍"}```';
        $result = $parser->parse($input);

        $this->assertEquals('Hello 世界 🌍', $result['message']);
    }

    /** @test */
    public function it_handles_nested_structures()
    {
        $parser = new JsonOutputParser();
        $input = '```json
        {
            "user": {
                "name": "Alice",
                "address": {
                    "city": "Portland",
                    "country": "USA"
                }
            }
        }
        ```';

        $result = $parser->parse($input);

        $this->assertEquals('Portland', $result['user']['address']['city']);
    }

    /** @test */
    public function it_handles_large_arrays()
    {
        $parser = new JsonListOutputParser();
        $items = range(1, 1000);
        $input = sprintf('```json{"data": %s}```', json_encode($items));

        $result = $parser->parse($input);

        $this->assertCount(1000, $result);
    }
}
```

### Integration Testing with Mock LLM

```php
use Mindwave\Mindwave\Facades\Mindwave;

class ParserIntegrationTest extends TestCase
{
    /** @test */
    public function it_parses_llm_response_end_to_end()
    {
        // Mock LLM to return predictable response
        Mindwave::shouldReceive('llm->generate')
            ->once()
            ->andReturn((object) [
                'name' => 'Test Product',
                'price' => 99.99,
            ]);

        class Product
        {
            public string $name;
            public float $price;
        }

        $template = PromptTemplate::create(
            'Extract product data',
            new StructuredOutputParser(Product::class)
        );

        $result = Mindwave::llm()->generate($template);

        $this->assertInstanceOf(Product::class, $result);
        $this->assertEquals('Test Product', $result->name);
    }
}
```

## Best Practices

### 1. Design Prompts for Parseable Output

Make it easy for LLMs to produce parseable responses:

```php
// Bad: Vague instructions
$template = PromptTemplate::create(
    'Tell me about this product',
    new JsonOutputParser()
);

// Good: Clear, structured instructions
$template = PromptTemplate::create(
    'Extract the following product details in JSON format:
    - name (string)
    - price (number)
    - category (string)
    - inStock (boolean)

    Product description: {description}',
    new JsonOutputParser()
);

// Better: Use StructuredOutputParser for automatic schema
$template = PromptTemplate::create(
    'Extract product details from: {description}',
    new StructuredOutputParser(Product::class)
);
```

### 2. When to Use JSON Mode vs Parsing

```php
// Use OutputParsers when:
// - You need the schema in the prompt
// - You want automatic format instructions
// - You're using open-source models
// - You need custom parsing logic

$template = PromptTemplate::create(
    'Extract data from: {text}',
    new JsonOutputParser()
);

// Consider native JSON mode (if available) when:
// - Using OpenAI/Anthropic with JSON mode support
// - You need guaranteed JSON output
// - Performance is critical
// - Simpler prompts are preferred

// Note: Mindwave parsers work with all models
```

### 3. Validation Strategies

Always validate parsed output:

```php
// Strategy 1: Laravel validation (recommended)
$data = $parser->parse($response);
validator($data, [
    'name' => 'required|string',
    'email' => 'required|email',
])->validate();

// Strategy 2: Type checking
if (!is_array($data) || !isset($data['name'])) {
    throw new ValidationException('Invalid data structure');
}

// Strategy 3: Domain validation
class ContactValidator
{
    public static function validate(array $contact): void
    {
        if (empty($contact['email']) && empty($contact['phone'])) {
            throw new ValidationException('Must have email or phone');
        }
    }
}

// Strategy 4: Use DTOs with validation (best)
class ContactData extends Data
{
    public function __construct(
        public string $name,
        public string $email,
    ) {}

    public static function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email',
        ];
    }
}
```

### 4. Type Safety with PHP 8+

Leverage PHP's type system:

```php
// Use strict types
declare(strict_types=1);

// Use typed properties
class Product
{
    public string $name;        // Never null
    public ?string $description; // Nullable
    public int $stock;          // Strict integer
    public float $price;        // Strict float
    public bool $active;        // Strict boolean
    public array $tags;         // Array type
    public Collection $reviews;  // Collection type
}

// Use typed return values
class ProductParser implements OutputParser
{
    public function parse(string $text): Product
    {
        // Type hint ensures we return Product or throw
    }
}

// Use union types (PHP 8+)
public function parse(string $text): Product|null
{
    // Can return Product or null
}

// Use readonly properties (PHP 8.1+)
class ImmutableProduct
{
    public function __construct(
        public readonly string $name,
        public readonly float $price,
    ) {}
}
```

### 5. Performance Considerations

Optimize parsing for production:

```php
// Cache format instructions (they don't change)
class CachedParser implements OutputParser
{
    private static ?string $cachedInstructions = null;

    public function getFormatInstructions(): string
    {
        if (self::$cachedInstructions === null) {
            self::$cachedInstructions = $this->generateInstructions();
        }
        return self::$cachedInstructions;
    }
}

// Use lazy loading for large schemas
class LazyStructuredParser extends StructuredOutputParser
{
    private ?array $schema = null;

    public function getSchemaStructure(): array
    {
        if ($this->schema === null) {
            $this->schema = parent::getSchemaStructure();
        }
        return $this->schema;
    }
}

// Batch parse when possible
class BatchParser
{
    public function parseMultiple(array $responses): array
    {
        return array_map(
            fn($response) => $this->parser->parse($response),
            $responses
        );
    }
}

// Use simpler parsers for simple tasks
// CommaSeparatedListOutputParser is faster than JsonListOutputParser
$parser = new CommaSeparatedListOutputParser(); // Faster
$parser = new JsonListOutputParser();           // More robust
```

### 6. Error Handling Best Practices

```php
// Always wrap parsing in try-catch
try {
    $result = $parser->parse($response);
} catch (InvalidArgumentException $e) {
    Log::error('Parsing failed', ['response' => $response]);
    // Handle gracefully
}

// Provide meaningful error messages
throw new InvalidArgumentException(
    "Failed to parse contact info. Expected JSON with 'name' and 'email' fields."
);

// Log failures for analysis
Log::error('Parser failed', [
    'parser' => get_class($parser),
    'input' => $response,
    'error' => $e->getMessage(),
]);

// Use custom exceptions
class ParsingException extends Exception
{
    public function __construct(
        string $message,
        public readonly string $rawResponse,
        public readonly string $parserClass
    ) {
        parent::__construct($message);
    }
}
```

## Troubleshooting

### Inconsistent Output Format

**Problem:** LLM doesn't follow format instructions consistently.

**Solutions:**

```php
// 1. Strengthen format instructions
$parser = new class extends JsonOutputParser {
    public function getFormatInstructions(): string
    {
        return parent::getFormatInstructions() . "\n\n" .
               "IMPORTANT: You MUST respond with ONLY the JSON object. " .
               "Do not include any explanatory text before or after the JSON.";
    }
};

// 2. Use system messages to enforce format
$composer = new PromptComposer();
$composer->system('You ONLY respond with valid JSON. Never add explanations.')
         ->user('Extract data from: {text}')
         ->withOutputParser(new JsonOutputParser());

// 3. Use StructuredOutputParser for stronger schema guidance
$parser = new StructuredOutputParser(ContactInfo::class);
// Schema is explicitly shown to the LLM

// 4. Add examples to your prompt
$template = PromptTemplate::create(
    'Extract contact info from: {text}

    Example output:
    ```json
    {"name": "John Doe", "email": "john@example.com"}
    ```',
    new JsonOutputParser()
);
```

### JSON Parsing Errors

**Problem:** `InvalidArgumentException: Could not parse response`

**Solutions:**

```php
// 1. Check what the LLM actually returned
try {
    $result = $parser->parse($response);
} catch (InvalidArgumentException $e) {
    Log::debug('Raw LLM response', ['response' => $response]);
    // Examine the response to see what went wrong
}

// 2. Handle extra text around JSON
class FlexibleJsonParser extends JsonOutputParser
{
    public function parse(string $text): array
    {
        // Try standard parsing first
        try {
            return parent::parse($text);
        } catch (InvalidArgumentException $e) {
            // Fallback: Find any JSON in the text
            preg_match('/\{.*\}/s', $text, $matches);
            if (isset($matches[0])) {
                $data = json_decode($matches[0], true);
                if ($data !== null) {
                    return $data;
                }
            }
            throw $e;
        }
    }
}

// 3. Validate JSON before parsing
$cleaned = Str::of($response)->between('```json', '```')->trim();
if (json_decode($cleaned) === null) {
    Log::error('Invalid JSON', ['json' => $cleaned]);
}
```

### Missing Required Fields

**Problem:** Parsed object missing expected fields.

**Solutions:**

```php
// 1. Add validation after parsing
$result = $parser->parse($response);

$required = ['name', 'email'];
foreach ($required as $field) {
    if (!isset($result[$field]) || empty($result[$field])) {
        throw new ValidationException("Required field '$field' is missing");
    }
}

// 2. Use Laravel validation
validator($result, [
    'name' => 'required|string',
    'email' => 'required|email',
])->validate();

// 3. Provide defaults for optional fields
$result = array_merge([
    'phone' => null,
    'company' => null,
], $parser->parse($response));

// 4. Make prompt more explicit about required fields
$template = PromptTemplate::create(
    'Extract contact info. You MUST include:
    - name (required)
    - email (required)
    - phone (optional)

    From: {text}',
    new JsonOutputParser()
);
```

### Type Validation Failures

**Problem:** Parsed values don't match expected types.

**Solutions:**

```php
// 1. Explicit type conversion in custom parser
class StrictProductParser implements OutputParser
{
    public function parse(string $text): array
    {
        $data = json_decode($text, true);

        return [
            'name' => (string) ($data['name'] ?? ''),
            'price' => (float) ($data['price'] ?? 0.0),
            'stock' => (int) ($data['stock'] ?? 0),
            'active' => (bool) ($data['active'] ?? false),
        ];
    }
}

// 2. Use StructuredOutputParser (handles types automatically)
class Product
{
    public string $name;
    public float $price;
    public int $stock;
}

$parser = new StructuredOutputParser(Product::class);
// Automatically converts types

// 3. Validate types after parsing
$result = $parser->parse($response);

if (!is_numeric($result['price'])) {
    throw new TypeError("Price must be numeric, got: " . gettype($result['price']));
}

// 4. Use DTOs with type coercion
class ProductData extends Data
{
    public function __construct(
        public string $name,
        public float $price,
        public int $stock,
    ) {}

    // Spatie Data automatically coerces types when possible
}
```

### Parser Performance Issues

**Problem:** Parsing is slow, especially for large datasets.

**Solutions:**

```php
// 1. Cache schema generation
class OptimizedStructuredParser extends StructuredOutputParser
{
    private static array $schemaCache = [];

    public function getSchemaStructure(): array
    {
        $class = $this->schema;

        if (!isset(self::$schemaCache[$class])) {
            self::$schemaCache[$class] = parent::getSchemaStructure();
        }

        return self::$schemaCache[$class];
    }
}

// 2. Use simpler parsers when appropriate
// Instead of JsonListOutputParser
$parser = new CommaSeparatedListOutputParser();

// 3. Batch processing
$results = array_map(
    fn($response) => $parser->parse($response),
    $responses
);

// 4. Profile parsing operations
$start = microtime(true);
$result = $parser->parse($response);
$duration = microtime(true) - $start;

if ($duration > 0.1) {
    Log::warning('Slow parsing detected', [
        'duration' => $duration,
        'parser' => get_class($parser),
    ]);
}
```

## Summary

Output Parsers are essential for transforming LLM text into reliable, type-safe data structures. Key takeaways:

**Core Concepts:**
- Parsers provide format instructions and parsing logic
- Five built-in parsers cover common use cases
- Custom parsers extend the system for specialized needs

**Production Recommendations:**
- Always validate parsed output with Laravel validation
- Use `StructuredOutputParser` for complex, typed objects
- Implement comprehensive error handling
- Log parsing failures for monitoring and improvement
- Test parsers with edge cases and malformed data

**Best Practices:**
- Design prompts that encourage parseable output
- Leverage PHP 8+ type system for safety
- Use DTOs for additional validation and type coercion
- Cache expensive operations like schema generation
- Monitor parsing success rates in production

**Common Pitfalls to Avoid:**
- Trusting LLM output without validation
- Assuming consistent format compliance
- Ignoring type mismatches
- Not handling missing fields gracefully
- Skipping error logging

With proper parsing and validation, you can confidently use LLM-generated data in production Laravel applications.
