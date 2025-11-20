# Model Token Limits Reference

Complete reference of all supported LLM models and their token limits for use with Mindwave's PromptComposer.

## Overview

### What Are Token Limits?

Token limits (also called context windows) define the maximum number of tokens a language model can process in a single request. This includes both:

- **Input tokens**: Your prompt, system messages, context, and conversation history
- **Output tokens**: The model's response/completion

For example, if a model has a 128,000 token context window and you use 120,000 tokens for input, you only have 8,000 tokens available for the model's response.

### Why Token Limits Matter

Understanding token limits is crucial for:

1. **Preventing errors** - Exceeding limits causes "context length exceeded" errors
2. **Optimizing costs** - Larger context windows often cost more per token
3. **Response quality** - Leaving enough room for complete responses
4. **Performance** - Smaller contexts process faster
5. **Feature planning** - Knowing what's possible with your chosen model

### How Mindwave Handles Token Limits

Mindwave's PromptComposer automatically manages token limits through:

- **Automatic detection** - Identifies context windows for all supported models
- **Smart fitting** - Uses `fit()` to trim prompts to available space
- **Reserved output tokens** - Ensures room for complete responses
- **Priority-based shrinking** - Keeps important sections, trims low-priority ones
- **Flexible tokenization** - Accurate token counting for OpenAI, Anthropic, and other providers

### Input vs Output Tokens

The total context window must accommodate both input and output:

```
Total Context Window = Input Tokens + Output Tokens
Available Input Tokens = Context Window - Reserved Output Tokens
```

**Best Practice**: Always reserve sufficient output tokens. For complex tasks, reserve 1,000-4,000 tokens. For simple responses, 250-500 tokens is usually adequate.

### Reserved Tokens Concept

When using PromptComposer, you specify how many tokens to reserve for the model's response:

```php
Mindwave::prompt()
    ->model('gpt-4o')
    ->reserveOutputTokens(1000)  // Reserve 1K tokens for response
    ->section('system', $instructions)
    ->section('context', $largeDocument)
    ->fit();  // Auto-trims input to 127,000 tokens (128K - 1K)
```

This ensures your prompts never exceed the model's limits while guaranteeing adequate space for complete responses.

## How to Use This Reference

### Finding Your Model

Models are organized by provider (OpenAI, Anthropic, Mistral, Google, Cohere). Each table includes:

- **Model ID** - The exact string to use in code
- **Context Window** - Maximum total tokens (input + output)
- **Input Cost** - Price per 1M input tokens (USD)
- **Output Cost** - Price per 1M output tokens (USD)
- **Notes** - Special capabilities or use cases

### Understanding the Tables

- Context windows are in tokens (not characters)
- Costs are approximate and subject to change by providers
- Model IDs support partial matching (e.g., "gpt-4-0613" matches "gpt-4")
- Latest pricing is as of January 2025

### Using with PromptComposer

To specify a model and have Mindwave automatically handle its token limits:

```php
Mindwave::prompt()
    ->model('claude-3-5-sonnet')  // Automatically uses 200K context
    ->reserveOutputTokens(2000)
    ->section('user', $message)
    ->fit()
    ->run();
```

### Model Selection Based on Needs

Skip to the [Model Selection Guide](#model-selection-guide) for recommendations based on:
- Context window size
- Budget/cost tier
- Use case (reasoning, documents, code, etc.)

## Complete Model Reference

### OpenAI Models

#### Latest GPT Models

| Model ID | Context Window | Input Cost | Output Cost | Notes |
|----------|----------------|------------|-------------|-------|
| `gpt-4o` | 128,000 | $2.50/1M | $10.00/1M | Multimodal flagship, best for production |
| `gpt-4o-mini` | 128,000 | $0.15/1M | $0.60/1M | Fast, cost-effective, great for most tasks |
| `gpt-4-turbo` | 128,000 | $10.00/1M | $30.00/1M | Previous generation turbo |

#### O1 Reasoning Models

| Model ID | Context Window | Input Cost | Output Cost | Notes |
|----------|----------------|------------|-------------|-------|
| `o1-preview` | 128,000 | $15.00/1M | $60.00/1M | Advanced reasoning, slower responses |
| `o1-mini` | 128,000 | $3.00/1M | $12.00/1M | Faster reasoning at lower cost |

#### Legacy GPT-4 Models

| Model ID | Context Window | Input Cost | Output Cost | Notes |
|----------|----------------|------------|-------------|-------|
| `gpt-4` | 8,192 | $30.00/1M | $60.00/1M | Original GPT-4, small context |
| `gpt-4-32k` | 32,768 | $60.00/1M | $120.00/1M | Extended context, expensive |

#### GPT-3.5 Models

| Model ID | Context Window | Input Cost | Output Cost | Notes |
|----------|----------------|------------|-------------|-------|
| `gpt-3.5-turbo` | 16,385 | $0.50/1M | $1.50/1M | Budget-friendly, good for simple tasks |
| `gpt-3.5-turbo-16k` | 16,385 | $0.50/1M | $1.50/1M | Same as gpt-3.5-turbo |

#### Future OpenAI Models (Anticipated)

| Model ID | Context Window | Input Cost | Output Cost | Notes |
|----------|----------------|------------|-------------|-------|
| `gpt-5` | 400,000 | TBA | TBA | Next generation flagship |
| `gpt-5-mini` | 400,000 | TBA | TBA | Cost-effective variant |
| `gpt-5-nano` | 400,000 | TBA | TBA | Smallest variant |
| `gpt-4.1` | 1,000,000 | TBA | TBA | 1M token context window |
| `gpt-4.1-mini` | 1,000,000 | TBA | TBA | Cost-effective 1M context |
| `gpt-4.1-nano` | 1,000,000 | TBA | TBA | Smallest 1M context variant |

**Note**: GPT-5 and GPT-4.1 models are anticipated releases with pre-configured support in Mindwave. Pricing and availability TBA.

### Anthropic Claude Models

| Model ID | Context Window | Input Cost | Output Cost | Notes |
|----------|----------------|------------|-------------|-------|
| `claude-3-5-sonnet` | 200,000 | $3.00/1M | $15.00/1M | Latest, most capable, excellent for complex tasks |
| `claude-3-opus` | 200,000 | $15.00/1M | $75.00/1M | Most powerful, best reasoning |
| `claude-3-sonnet` | 200,000 | $3.00/1M | $15.00/1M | Balanced performance and cost |
| `claude-3-haiku` | 200,000 | $0.25/1M | $1.25/1M | Fastest, most affordable Claude 3 |
| `claude-2.1` | 200,000 | $8.00/1M | $24.00/1M | Previous generation, still capable |
| `claude-2.0` | 100,000 | $8.00/1M | $24.00/1M | Older, smaller context window |
| `claude-instant` | 100,000 | $0.80/1M | $2.40/1M | Legacy fast model |

**Recommendation**: For most production use, `claude-3-5-sonnet` offers the best balance of capability, cost, and context size.

### Mistral Models

| Model ID | Context Window | Input Cost | Output Cost | Notes |
|----------|----------------|------------|-------------|-------|
| `mistral-large` | 128,000 | $4.00/1M | $12.00/1M | Flagship model, excellent reasoning |
| `mistral-medium` | 32,000 | $2.70/1M | $8.10/1M | Mid-tier performance |
| `mistral-small` | 32,000 | $1.00/1M | $3.00/1M | Cost-effective option |
| `mistral-tiny` | 32,000 | $0.25/1M | $0.75/1M | Budget tier |
| `mixtral-8x7b` | 32,000 | $0.70/1M | $0.70/1M | Open source, mixture of experts |
| `mixtral-8x22b` | 64,000 | $2.00/1M | $6.00/1M | Larger mixture of experts |

**Recommendation**: `mistral-large` for flagship features, `mixtral-8x7b` for cost-sensitive applications.

### Google Gemini Models

| Model ID | Context Window | Input Cost | Output Cost | Notes |
|----------|----------------|------------|-------------|-------|
| `gemini-1.5-pro` | 2,000,000 | $1.25/1M | $5.00/1M | **Largest context window available** |
| `gemini-1.5-flash` | 1,000,000 | $0.075/1M | $0.30/1M | Extremely fast, huge context, very affordable |
| `gemini-pro` | 32,768 | $0.50/1M | $1.50/1M | Standard tier, legacy |

**Recommendation**: `gemini-1.5-pro` for massive documents, `gemini-1.5-flash` for cost-optimized large context needs.

### Cohere Models

| Model ID | Context Window | Input Cost | Output Cost | Notes |
|----------|----------------|------------|-------------|-------|
| `command-r-plus` | 128,000 | $3.00/1M | $15.00/1M | Enhanced reasoning and retrieval |
| `command-r` | 128,000 | $0.50/1M | $1.50/1M | Standard command model |
| `command` | 4,096 | $1.00/1M | $2.00/1M | Legacy, small context |

**Recommendation**: `command-r` for retrieval-augmented generation (RAG) applications.

## Model Aliases

### How Aliases Work

Mindwave's ModelTokenLimits uses pattern matching to support model versioning and variations. When you specify a model, it matches against model name patterns.

For example:
- `gpt-4-0613` matches the `gpt-4` pattern → 8,192 tokens
- `gpt-4-turbo-preview` matches `gpt-4-turbo` → 128,000 tokens
- `claude-3-opus-20240229` matches `claude-3-opus` → 200,000 tokens

### Common Model Variations

#### OpenAI Variations
```
gpt-4 → Matches: gpt-4, gpt-4-0613, gpt-4-0314
gpt-4-turbo → Matches: gpt-4-turbo, gpt-4-turbo-preview, gpt-4-1106-preview
gpt-4o → Matches: gpt-4o, gpt-4o-2024-05-13
```

#### Anthropic Variations
```
claude-3-5-sonnet → Matches: claude-3-5-sonnet, claude-3-5-sonnet-20240620
claude-3-opus → Matches: claude-3-opus, claude-3-opus-20240229
```

#### Mistral Variations
```
mistral-large → Matches: mistral-large, mistral-large-latest, mistral-large-2402
```

### Using Aliases in Code

You can use any variation of a model name:

```php
// All of these work and use the same token limits:
Mindwave::prompt()->model('gpt-4');
Mindwave::prompt()->model('gpt-4-0613');
Mindwave::prompt()->model('gpt-4-0314');

// All resolve to 128K context:
Mindwave::prompt()->model('gpt-4-turbo');
Mindwave::prompt()->model('gpt-4-turbo-preview');
Mindwave::prompt()->model('gpt-4-1106-preview');
```

### Best Practices for Model Naming

1. **Use canonical names** - Prefer `gpt-4o` over `gpt-4o-2024-05-13` for clarity
2. **Pin versions in production** - Use specific versions like `gpt-4-0613` for consistency
3. **Update regularly** - Providers release new versions; test before upgrading
4. **Check limits** - Verify context windows when switching between model versions

## Token Limit Details

### Understanding Context Windows

#### Total Context Window

The maximum number of tokens a model can process in a single request, including:
- System messages
- Conversation history
- User input
- Retrieved context
- Function/tool definitions
- Model's response

#### Practical Limits

Never use 100% of the context window. Best practices:

| Context Window | Recommended Input Limit | Reserved for Output |
|----------------|-------------------------|---------------------|
| 8K (GPT-4) | 7,000 tokens | 1,000 tokens |
| 16K (GPT-3.5) | 14,000 tokens | 2,000 tokens |
| 32K | 28,000 tokens | 4,000 tokens |
| 128K | 124,000 tokens | 4,000 tokens |
| 200K (Claude) | 195,000 tokens | 5,000 tokens |
| 1M+ (Gemini) | Leave 10,000-20,000 tokens | 10,000-20,000 tokens |

### Recommended Input/Output Splits

Different use cases require different token allocations:

#### Short Answers (Q&A, Classification)
```php
->reserveOutputTokens(500)  // 500 tokens for response
```
- User questions: 200-1,000 input tokens
- Short answers: 100-500 output tokens
- **Example**: Customer support chatbot

#### Medium Responses (Explanations, Summaries)
```php
->reserveOutputTokens(1500)  // 1,500 tokens for response
```
- Complex queries with context: 5,000-10,000 input tokens
- Detailed explanations: 500-1,500 output tokens
- **Example**: Technical documentation Q&A

#### Long-Form Content (Articles, Reports)
```php
->reserveOutputTokens(4000)  // 4,000 tokens for response
```
- Extensive context/research: 20,000-100,000 input tokens
- Full articles/reports: 2,000-4,000 output tokens
- **Example**: AI-generated blog posts

#### Code Generation
```php
->reserveOutputTokens(3000)  // 3,000 tokens for code
```
- Requirements + examples: 5,000-20,000 input tokens
- Generated code + docs: 1,000-3,000 output tokens
- **Example**: Laravel controller generation

### Cost Implications

Token limits directly impact costs. Consider:

#### Small Context Windows (8K-16K)
- **Pros**: Often cheaper per token, faster processing
- **Cons**: Limited context, requires multiple requests for long content
- **Best for**: Simple queries, real-time chat, high-volume applications

#### Medium Context Windows (32K-128K)
- **Pros**: Handles most documents, reasonable cost
- **Cons**: May still need chunking for books/codebases
- **Best for**: Most production applications, document analysis

#### Large Context Windows (128K-200K)
- **Pros**: Entire conversations, long documents, extensive context
- **Cons**: Higher cost per request
- **Best for**: Research, complex reasoning, multi-turn conversations

#### Huge Context Windows (1M+)
- **Pros**: Entire books, full codebases, massive datasets
- **Cons**: Very expensive if using full capacity, slower processing
- **Best for**: Academic research, comprehensive analysis, rare use cases

### Cost Comparison Example

Processing a 50,000-token document with a 1,000-token response:

| Model | Context Window | Total Tokens | Input Cost | Output Cost | Total Cost |
|-------|----------------|--------------|------------|-------------|------------|
| GPT-4 (8K) | 8,192 | **Can't fit** | - | - | **Multiple requests needed** |
| GPT-4o | 128,000 | 51,000 | $0.125 | $0.010 | **$0.135** |
| Claude 3 Haiku | 200,000 | 51,000 | $0.0125 | $0.00125 | **$0.014** |
| Gemini 1.5 Flash | 1,000,000 | 51,000 | $0.00375 | $0.00030 | **$0.004** |

**Takeaway**: For large documents, Gemini 1.5 Flash offers the best value.

## Using with PromptComposer

### Specifying Models

Set the model to automatically detect token limits:

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Method 1: Using PromptComposer
$response = Mindwave::prompt()
    ->model('gpt-4o')  // Sets to 128K context
    ->section('user', 'What is Laravel?')
    ->fit()
    ->run();

// Method 2: Using LLM driver directly
$llm = Mindwave::llm('openai')->model('gpt-4o');
$response = $llm->chat([
    ['role' => 'user', 'content' => 'What is Laravel?']
]);
```

### Automatic Token Limit Detection

PromptComposer automatically detects the model's context window:

```php
$composer = Mindwave::prompt()
    ->model('claude-3-5-sonnet');  // Automatically knows: 200K tokens

$contextWindow = $composer->getAvailableTokens();
// Returns: 200000 (default, no output tokens reserved)
```

### Manual Token Limit Override

While Mindwave auto-detects limits, you can work with custom models:

```php
use Mindwave\Mindwave\PromptComposer\Tokenizer\TiktokenTokenizer;

// For custom/fine-tuned models, use a known model's tokenizer
$tokenizer = new TiktokenTokenizer();

$composer = new PromptComposer($tokenizer);
$composer->model('my-custom-gpt4-model');  // Falls back to 'gpt-4' pattern
```

**Note**: Unknown models default to 4,096 tokens. If using a custom model, ensure its name matches a known pattern or use a standard model name for token counting.

### Reserved Output Tokens

Always reserve adequate space for responses:

```php
// Short responses (classification, yes/no)
Mindwave::prompt()
    ->model('gpt-4o-mini')
    ->reserveOutputTokens(250)
    ->section('user', 'Is this email spam? ' . $emailContent)
    ->fit()
    ->run();

// Medium responses (explanations)
Mindwave::prompt()
    ->model('claude-3-5-sonnet')
    ->reserveOutputTokens(1500)
    ->section('user', 'Explain how Laravel middleware works')
    ->fit()
    ->run();

// Long responses (articles, code)
Mindwave::prompt()
    ->model('gpt-4o')
    ->reserveOutputTokens(4000)
    ->section('user', 'Write a complete Laravel CRUD controller for posts')
    ->fit()
    ->run();

// Very long responses (full documents)
Mindwave::prompt()
    ->model('gemini-1.5-pro')
    ->reserveOutputTokens(10000)
    ->section('user', 'Generate a comprehensive tutorial...')
    ->fit()
    ->run();
```

### Code Examples

#### Example 1: Auto-Fitting Large Context

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Process a large document that exceeds context limits
$largeDocument = file_get_contents('huge-document.txt'); // 500K characters

$response = Mindwave::prompt()
    ->model('claude-3-5-sonnet')  // 200K context
    ->reserveOutputTokens(2000)    // Reserve 2K for summary
    ->section('system', 'You are a document summarizer', priority: 100)
    ->section('document', $largeDocument, priority: 50, shrinker: 'truncate')
    ->section('user', 'Summarize the key points', priority: 100)
    ->fit()  // Auto-trims document to ~198K tokens
    ->run();
```

#### Example 2: Checking Token Usage

```php
use Mindwave\Mindwave\Facades\Mindwave;

$composer = Mindwave::prompt()
    ->model('gpt-4o')
    ->reserveOutputTokens(1000)
    ->section('system', $systemPrompt)
    ->section('context', $contextData)
    ->section('user', $userMessage);

// Check before fitting
$currentTokens = $composer->getTokenCount();
$availableTokens = $composer->getAvailableTokens();

echo "Current: {$currentTokens} tokens\n";
echo "Available: {$availableTokens} tokens\n";
echo "Will fit: " . ($currentTokens > $availableTokens ? 'YES' : 'NO') . "\n";

// Fit and check again
$composer->fit();
$finalTokens = $composer->getTokenCount();
echo "After fit: {$finalTokens} tokens\n";
```

#### Example 3: Model Switching

```php
use Mindwave\Mindwave\Facades\Mindwave;

// Start with a large model, fallback to smaller if needed
$models = ['gemini-1.5-pro', 'claude-3-5-sonnet', 'gpt-4o', 'gpt-4o-mini'];

foreach ($models as $model) {
    try {
        $response = Mindwave::prompt()
            ->model($model)
            ->reserveOutputTokens(2000)
            ->section('context', $massiveContext)
            ->section('user', $question)
            ->fit()
            ->run();

        echo "Successfully used: {$model}\n";
        break;
    } catch (\RuntimeException $e) {
        echo "Failed with {$model}: {$e->getMessage()}\n";
        continue;
    }
}
```

## Model Selection Guide

### By Context Window Size

#### Small Context (≤8K tokens)

**Models:**
- GPT-4 (8,192 tokens)
- Command (4,096 tokens)

**Best for:**
- Simple Q&A
- Real-time chat with minimal history
- High-volume, low-cost applications
- Quick classifications

**Limitations:**
- Cannot handle long documents
- Limited conversation history
- Frequent context trimming required

#### Medium Context (8K-32K tokens)

**Models:**
- GPT-3.5 Turbo (16,385 tokens)
- Gemini Pro (32,768 tokens)
- GPT-4 32K (32,768 tokens)
- Mistral Medium/Small/Tiny (32,000 tokens)
- Mixtral 8x7b (32,000 tokens)

**Best for:**
- Standard chatbots
- Document Q&A (short-medium docs)
- Conversation with moderate history
- Most common use cases

**Limitations:**
- Full books/codebases won't fit
- May need chunking for long content

#### Large Context (32K-128K tokens)

**Models:**
- GPT-4o (128,000 tokens)
- GPT-4o Mini (128,000 tokens)
- GPT-4 Turbo (128,000 tokens)
- O1 Preview/Mini (128,000 tokens)
- Mistral Large (128,000 tokens)
- Mixtral 8x22b (64,000 tokens)
- Command-R/Command-R Plus (128,000 tokens)

**Best for:**
- Long document analysis
- Extended conversations
- Code review (full files)
- Complex multi-step reasoning
- **Recommended for most production apps**

**Limitations:**
- Very long books still need chunking
- Higher cost than smaller models

#### Very Large Context (128K-200K tokens)

**Models:**
- Claude 3.5 Sonnet (200,000 tokens)
- Claude 3 Opus/Sonnet/Haiku (200,000 tokens)
- Claude 2.1 (200,000 tokens)

**Best for:**
- Entire books (most novels fit)
- Full codebase analysis
- Very long conversations
- Research with extensive context
- Legal document analysis

**Limitations:**
- Cost increases with usage
- Some books/codebases still too large

#### Huge Context (1M+ tokens)

**Models:**
- Gemini 1.5 Pro (2,000,000 tokens) - **Largest available**
- Gemini 1.5 Flash (1,000,000 tokens)
- GPT-4.1 (1,000,000 tokens) - *Anticipated*

**Best for:**
- Full book series
- Entire codebases
- Massive datasets
- Academic research papers
- Comprehensive context analysis

**Limitations:**
- Very expensive at full capacity
- Slower processing
- Often overkill for typical use cases

### By Cost Tier

#### Budget Tier (<$1/1M tokens)

**Best Models:**
- **Gemini 1.5 Flash** - $0.075/$0.30 (1M context) - **Best value overall**
- Claude 3 Haiku - $0.25/$1.25 (200K context)
- GPT-4o Mini - $0.15/$0.60 (128K context)
- Mistral Tiny - $0.25/$0.75 (32K context)
- Mixtral 8x7b - $0.70/$0.70 (32K context)
- GPT-3.5 Turbo - $0.50/$1.50 (16K context)

**Best for:**
- High-volume applications
- Development/testing
- Cost-sensitive production
- Simple tasks

**Recommendation**: Start with Gemini 1.5 Flash for massive context at minimal cost, or GPT-4o Mini for OpenAI compatibility.

#### Standard Tier ($1-5/1M tokens)

**Best Models:**
- **Gemini 1.5 Pro** - $1.25/$5.00 (2M context) - **Best value for huge context**
- Claude 3.5 Sonnet - $3.00/$15.00 (200K context)
- Claude 3 Sonnet - $3.00/$15.00 (200K context)
- GPT-4o - $2.50/$10.00 (128K context)
- Mistral Large - $4.00/$12.00 (128K context)
- O1 Mini - $3.00/$12.00 (128K context)
- Command-R Plus - $3.00/$15.00 (128K context)

**Best for:**
- Production applications
- High-quality responses
- Complex reasoning
- Most business use cases

**Recommendation**: Claude 3.5 Sonnet for best overall quality, GPT-4o for OpenAI ecosystem, Gemini 1.5 Pro for massive documents.

#### Premium Tier (>$5/1M tokens)

**Best Models:**
- O1 Preview - $15.00/$60.00 (128K context)
- Claude 3 Opus - $15.00/$75.00 (200K context)
- GPT-4 Turbo - $10.00/$30.00 (128K context)
- Claude 2.1 - $8.00/$24.00 (200K context)
- GPT-4 - $30.00/$60.00 (8K context) - **Legacy, avoid**
- GPT-4 32K - $60.00/$120.00 (32K context) - **Legacy, avoid**

**Best for:**
- Cutting-edge reasoning (O1 Preview)
- Most complex tasks (Claude Opus)
- Mission-critical applications
- When quality is paramount

**Recommendation**: O1 Preview for advanced reasoning, Claude 3 Opus for comprehensive analysis. Consider if standard tier insufficient.

### By Use Case

#### Simple Tasks (Classification, Extraction, Q&A)

**Recommended Models:**
1. **GPT-4o Mini** - Fast, affordable, excellent accuracy
2. **Gemini 1.5 Flash** - Cheapest option with huge context
3. **Claude 3 Haiku** - Fast Claude option
4. **GPT-3.5 Turbo** - Budget-friendly OpenAI

**Why**: Simple tasks don't need flagship models. Save costs without sacrificing accuracy.

**Example**:
```php
// Email classification
Mindwave::prompt()
    ->model('gpt-4o-mini')  // $0.15/$0.60 per 1M tokens
    ->reserveOutputTokens(50)
    ->section('system', 'Classify emails as spam/not-spam')
    ->section('user', $email)
    ->fit()
    ->run();
```

#### Complex Reasoning (Analysis, Strategy, Problem-Solving)

**Recommended Models:**
1. **O1 Preview** - Best reasoning, slower
2. **Claude 3.5 Sonnet** - Excellent reasoning, fast
3. **Claude 3 Opus** - Most thorough analysis
4. **GPT-4o** - Strong reasoning, OpenAI ecosystem

**Why**: Complex reasoning benefits from flagship models' advanced capabilities.

**Example**:
```php
// Strategic business analysis
Mindwave::prompt()
    ->model('claude-3-5-sonnet')  // Excellent reasoning
    ->reserveOutputTokens(3000)
    ->section('system', 'You are a business strategy consultant')
    ->section('context', $marketData)
    ->section('user', 'Analyze competitive landscape and recommend strategy')
    ->fit()
    ->run();
```

#### Long Documents (Books, Research Papers, Legal Docs)

**Recommended Models:**
1. **Gemini 1.5 Pro** - 2M tokens, excellent value
2. **Gemini 1.5 Flash** - 1M tokens, ultra-affordable
3. **Claude 3.5 Sonnet** - 200K tokens, high quality
4. **Claude 3 Haiku** - 200K tokens, fast & cheap

**Why**: Massive context windows eliminate chunking. Gemini models offer best value.

**Example**:
```php
// Analyze entire book
$bookContent = file_get_contents('book.txt'); // 300K tokens

Mindwave::prompt()
    ->model('gemini-1.5-pro')  // 2M token context
    ->reserveOutputTokens(2000)
    ->section('book', $bookContent)
    ->section('user', 'Summarize main themes and arguments')
    ->fit()
    ->run();
```

#### Code Generation (Controllers, Tests, Components)

**Recommended Models:**
1. **GPT-4o** - Excellent code quality, follows conventions
2. **Claude 3.5 Sonnet** - Great for complex code
3. **GPT-4o Mini** - Good for simple code, very affordable
4. **Mistral Large** - Strong coding capabilities

**Why**: These models excel at understanding code patterns and generating clean, idiomatic code.

**Example**:
```php
// Generate Laravel controller
Mindwave::prompt()
    ->model('gpt-4o')  // Excellent for code
    ->reserveOutputTokens(3000)
    ->section('system', 'Generate Laravel code following best practices')
    ->section('examples', $existingControllers)
    ->section('user', 'Create a CRUD controller for Blog posts')
    ->fit()
    ->run();
```

#### Conversational Chatbots

**Recommended Models:**
1. **GPT-4o Mini** - Fast, affordable, natural conversations
2. **Claude 3 Haiku** - Very fast, high quality
3. **GPT-4o** - Premium conversations
4. **Claude 3.5 Sonnet** - Most natural, context-aware

**Why**: Balance speed, cost, and quality for real-time interactions.

**Example**:
```php
// Customer support chatbot
Mindwave::prompt()
    ->model('gpt-4o-mini')  // Fast & affordable
    ->reserveOutputTokens(500)
    ->section('system', $supportInstructions)
    ->section('history', $conversationHistory)
    ->section('user', $userMessage)
    ->fit()
    ->run();
```

#### Retrieval-Augmented Generation (RAG)

**Recommended Models:**
1. **Command-R** - Optimized for RAG, affordable
2. **Command-R Plus** - Enhanced RAG capabilities
3. **GPT-4o** - Strong context integration
4. **Claude 3.5 Sonnet** - Excellent context awareness

**Why**: These models excel at integrating retrieved context into responses.

**Example**:
```php
// RAG with vector search results
Mindwave::prompt()
    ->model('command-r')  // Optimized for RAG
    ->reserveOutputTokens(1000)
    ->section('context', $vectorSearchResults)  // Retrieved docs
    ->section('user', $userQuestion)
    ->fit()
    ->run();
```

## Token Counting

### How Tokens Are Calculated

Tokens are **not** the same as characters or words. They're determined by the model's tokenizer:

**Rough Estimates:**
- **English**: ~4 characters per token (750 words ≈ 1,000 tokens)
- **Code**: ~3-4 characters per token (varies by language)
- **JSON**: ~3-4 characters per token
- **Non-English**: Often more tokens per character

**Examples:**
```
"Hello, world!" → 4 tokens: ["Hello", ",", " world", "!"]
"ChatGPT" → 2 tokens: ["Chat", "GPT"]
"🚀" → 1-3 tokens (depends on encoding)
```

### Estimating Token Usage

#### Quick Estimation Formula

For English text:
```
Estimated Tokens ≈ Character Count ÷ 4
Estimated Tokens ≈ Word Count × 1.3
```

**Example:**
- 10,000 characters ≈ 2,500 tokens
- 1,000 words ≈ 1,300 tokens

#### Precise Counting

Different models use different encodings:

| Model Family | Encoding | Token Efficiency |
|--------------|----------|------------------|
| GPT-4, GPT-4o, GPT-3.5 | cl100k_base | Standard |
| O1 models | o200k_base | More efficient |
| GPT-5, GPT-4.1 (anticipated) | o200k_base | More efficient |
| Claude, Mistral, Gemini | Proprietary | Varies |

### Using PromptComposer's Token Counter

PromptComposer provides accurate token counting:

#### Example 1: Check Token Count

```php
use Mindwave\Mindwave\Facades\Mindwave;

$composer = Mindwave::prompt()
    ->model('gpt-4o')
    ->section('system', $systemPrompt)
    ->section('context', $contextData)
    ->section('user', $userMessage);

// Get current token count
$tokens = $composer->getTokenCount();
echo "Total tokens: {$tokens}\n";

// Get available budget
$available = $composer->getAvailableTokens();
echo "Available: {$available}\n";

// Check if fitting is needed
if ($tokens > $available) {
    echo "Will auto-trim {$tokens - $available} tokens\n";
}
```

#### Example 2: Token Count Per Section

```php
use Mindwave\Mindwave\PromptComposer\Tokenizer\TiktokenTokenizer;

$tokenizer = new TiktokenTokenizer();

$systemPrompt = "You are a helpful assistant.";
$contextData = file_get_contents('context.txt');
$userMessage = "Summarize the context.";

$systemTokens = $tokenizer->count($systemPrompt, 'gpt-4o');
$contextTokens = $tokenizer->count($contextData, 'gpt-4o');
$userTokens = $tokenizer->count($userMessage, 'gpt-4o');

echo "System: {$systemTokens} tokens\n";
echo "Context: {$contextTokens} tokens\n";
echo "User: {$userTokens} tokens\n";
echo "Total: " . ($systemTokens + $contextTokens + $userTokens) . " tokens\n";
```

#### Example 3: Monitor Token Usage During Build

```php
use Mindwave\Mindwave\Facades\Mindwave;

$composer = Mindwave::prompt()->model('claude-3-5-sonnet');

echo "Building prompt...\n";

$composer->section('system', $systemPrompt);
echo "After system: {$composer->getTokenCount()} tokens\n";

$composer->section('context', $largeContext);
echo "After context: {$composer->getTokenCount()} tokens\n";

$composer->section('user', $userMessage);
echo "After user: {$composer->getTokenCount()} tokens\n";

$composer->fit();
echo "After fit: {$composer->getTokenCount()} tokens\n";
```

## Best Practices

### Choosing the Right Model for Your Needs

1. **Start with the cheapest model that meets your requirements**
   - Try GPT-4o Mini or Gemini 1.5 Flash first
   - Upgrade only if quality is insufficient

2. **Match context window to your actual needs**
   - Don't use 200K models for 5K prompts
   - Don't use 8K models for 50K documents

3. **Consider response time**
   - Smaller/faster models: GPT-4o Mini, Claude Haiku, Gemini Flash
   - More thorough but slower: O1 models, Claude Opus

4. **Factor in costs for production scale**
   - Calculate: requests/day × avg tokens × price per token
   - Optimize by using cheaper models for simple tasks

### Balancing Cost vs Context Window

#### Strategy 1: Hybrid Approach

Use different models for different tasks:

```php
// Simple tasks → Cheap model
if ($taskType === 'classification') {
    $model = 'gpt-4o-mini';  // $0.15/$0.60
}

// Complex tasks → Premium model
if ($taskType === 'analysis') {
    $model = 'claude-3-5-sonnet';  // $3.00/$15.00
}

// Huge context → Specialized model
if ($contextSize > 100_000) {
    $model = 'gemini-1.5-flash';  // $0.075/$0.30
}
```

#### Strategy 2: Progressive Enhancement

Start cheap, upgrade if needed:

```php
$models = [
    'gpt-4o-mini',      // Try cheapest first
    'gpt-4o',           // Upgrade if insufficient
    'claude-3-5-sonnet' // Final fallback
];

foreach ($models as $model) {
    $response = Mindwave::prompt()->model($model)->/* ... */->run();

    if ($this->isResponseAcceptable($response)) {
        break; // Success with cheapest possible model
    }
}
```

#### Strategy 3: Context Optimization

Minimize tokens while preserving quality:

```php
Mindwave::prompt()
    ->model('gpt-4o')

    // Critical sections: No shrinking
    ->section('system', $systemPrompt, priority: 100)
    ->section('user', $userQuery, priority: 100)

    // Context: Allow shrinking
    ->section('docs', $documentation, priority: 50, shrinker: 'truncate')
    ->section('history', $conversationHistory, priority: 30, shrinker: 'compress')

    ->reserveOutputTokens(1000)
    ->fit()  // Shrinks low-priority sections if needed
    ->run();
```

### Testing with Different Models

Create a model comparison utility:

```php
namespace App\Services;

class ModelComparison
{
    public function compareModels(array $models, string $prompt): array
    {
        $results = [];

        foreach ($models as $model) {
            $startTime = microtime(true);

            $response = Mindwave::prompt()
                ->model($model)
                ->section('user', $prompt)
                ->fit()
                ->run();

            $duration = microtime(true) - $startTime;

            $results[$model] = [
                'response' => $response,
                'duration' => $duration,
                'tokens' => $this->estimateTokens($prompt, $response),
                'estimated_cost' => $this->estimateCost($model, $prompt, $response),
            ];
        }

        return $results;
    }
}

// Usage
$comparison = new ModelComparison();
$results = $comparison->compareModels(
    ['gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet'],
    'Explain Laravel middleware in detail'
);

foreach ($results as $model => $data) {
    echo "{$model}: {$data['duration']}s, \${$data['estimated_cost']}\n";
}
```

### Monitoring Token Usage

Track token consumption in production:

```php
use Mindwave\Mindwave\Observability\Models\Trace;

// Daily token summary
$dailyStats = Trace::selectRaw('
        DATE(created_at) as date,
        model_name,
        SUM(total_input_tokens) as input_tokens,
        SUM(total_output_tokens) as output_tokens,
        SUM(estimated_cost) as total_cost
    ')
    ->where('created_at', '>', now()->subDays(30))
    ->groupBy('date', 'model_name')
    ->orderByDesc('date')
    ->get();

// Find expensive requests
$expensive = Trace::where('estimated_cost', '>', 0.10)
    ->orderByDesc('estimated_cost')
    ->limit(20)
    ->get();

// Average tokens per model
$avgTokens = Trace::selectRaw('
        model_name,
        AVG(total_input_tokens) as avg_input,
        AVG(total_output_tokens) as avg_output
    ')
    ->groupBy('model_name')
    ->get();
```

### Cost Optimization Strategies

#### 1. Cache Expensive Results

```php
use Illuminate\Support\Facades\Cache;

$cacheKey = 'llm:' . md5($prompt);

$response = Cache::remember($cacheKey, 3600, function () use ($prompt) {
    return Mindwave::prompt()
        ->model('gpt-4o')
        ->section('user', $prompt)
        ->fit()
        ->run();
});
```

#### 2. Use Cheaper Models for Drafts

```php
// First pass: Cheap model for draft
$draft = Mindwave::prompt()
    ->model('gpt-4o-mini')  // $0.15/$0.60
    ->section('user', 'Write an article about Laravel')
    ->reserveOutputTokens(2000)
    ->run();

// Second pass: Premium model for refinement
$final = Mindwave::prompt()
    ->model('claude-3-5-sonnet')  // $3.00/$15.00
    ->section('user', "Improve this article:\n\n{$draft}")
    ->reserveOutputTokens(2500)
    ->run();
```

#### 3. Batch Similar Requests

```php
// Instead of 10 separate requests
$questions = ['Q1', 'Q2', 'Q3', /* ... */, 'Q10'];

// Batch into one request
$batchedPrompt = "Answer these questions:\n";
foreach ($questions as $i => $q) {
    $batchedPrompt .= ($i + 1) . ". {$q}\n";
}

$response = Mindwave::prompt()
    ->model('gpt-4o-mini')
    ->section('user', $batchedPrompt)
    ->run();
```

#### 4. Summarize Long Context

```php
// Don't send entire 100K token document repeatedly
// Summarize once, reuse summary

$summary = Cache::rememberForever('doc:summary:' . $docId, function () use ($doc) {
    return Mindwave::prompt()
        ->model('claude-3-haiku')  // Cheap, fast
        ->section('document', $doc)
        ->section('user', 'Summarize in 500 tokens')
        ->reserveOutputTokens(500)
        ->run();
});

// Use summary for subsequent queries
$answer = Mindwave::prompt()
    ->model('gpt-4o-mini')
    ->section('context', $summary)  // Much smaller!
    ->section('user', $userQuestion)
    ->run();
```

## Troubleshooting

### "Context length exceeded" Errors

**Symptom**: Error message like "maximum context length is 128000 tokens"

**Causes:**
1. Prompt + reserved output exceeds model's context window
2. Forgot to call `fit()` method
3. Non-shrinkable sections exceed available tokens
4. Wrong model specified (smaller context than expected)

**Solutions:**

#### Solution 1: Call fit() Method

```php
// ❌ WRONG - Will error if too large
Mindwave::prompt()
    ->section('context', $hugeDocument)
    ->run();

// ✅ CORRECT - Auto-trims to fit
Mindwave::prompt()
    ->section('context', $hugeDocument, priority: 50, shrinker: 'truncate')
    ->fit()  // Essential!
    ->run();
```

#### Solution 2: Reduce Reserved Output Tokens

```php
// ❌ WRONG - Reserves too much
Mindwave::prompt()
    ->model('gpt-4')  // Only 8K context
    ->reserveOutputTokens(10000)  // Reserves more than total!
    ->section('user', $message)
    ->fit()
    ->run();

// ✅ CORRECT - Reasonable reservation
Mindwave::prompt()
    ->model('gpt-4')
    ->reserveOutputTokens(1000)  // Leaves 7K for input
    ->section('user', $message)
    ->fit()
    ->run();
```

#### Solution 3: Make Sections Shrinkable

```php
// ❌ WRONG - All non-shrinkable, can't fit
Mindwave::prompt()
    ->model('gpt-4o')  // 128K context
    ->section('context', $doc1)  // 50K tokens, no shrinker
    ->section('history', $doc2)  // 60K tokens, no shrinker
    ->section('user', $doc3)     // 30K tokens, no shrinker
    ->fit();  // ERROR: 140K non-shrinkable > 128K available

// ✅ CORRECT - Allow shrinking
Mindwave::prompt()
    ->model('gpt-4o')
    ->section('context', $doc1, priority: 50, shrinker: 'truncate')
    ->section('history', $doc2, priority: 30, shrinker: 'compress')
    ->section('user', $doc3, priority: 100)  // Keep user message intact
    ->fit();  // Success: Trims doc1 and doc2 as needed
```

#### Solution 4: Use Larger Model

```php
// ❌ WRONG - Model too small
Mindwave::prompt()
    ->model('gpt-4')  // 8K context
    ->section('book', $entireBook)  // 200K tokens
    ->fit()
    ->run();  // Will truncate 96% of the book!

// ✅ CORRECT - Use appropriate model
Mindwave::prompt()
    ->model('gemini-1.5-pro')  // 2M context
    ->section('book', $entireBook)
    ->fit()
    ->run();  // Entire book fits!
```

### Unexpected Token Counts

**Symptom**: Token count much higher/lower than expected

**Causes:**
1. Different encodings count differently
2. Special characters use more tokens
3. JSON formatting adds overhead
4. Whitespace counted as tokens

**Solutions:**

#### Solution 1: Use Accurate Counter

```php
use Mindwave\Mindwave\PromptComposer\Tokenizer\TiktokenTokenizer;

$tokenizer = new TiktokenTokenizer();

// Check exact count
$content = "Your content here...";
$exactCount = $tokenizer->count($content, 'gpt-4o');

echo "Exact tokens: {$exactCount}\n";
echo "Characters: " . strlen($content) . "\n";
echo "Ratio: " . (strlen($content) / $exactCount) . " chars/token\n";
```

#### Solution 2: Account for Message Overhead

```php
// Messages have structural overhead
$messages = [
    ['role' => 'system', 'content' => 'You are helpful'],
    ['role' => 'user', 'content' => 'Hello'],
];

// Overhead: role markers, JSON structure, etc.
// Rough estimate: +3-4 tokens per message
$overhead = count($messages) * 4;
$contentTokens = $tokenizer->count($messages[0]['content'], 'gpt-4o')
               + $tokenizer->count($messages[1]['content'], 'gpt-4o');
$total = $contentTokens + $overhead;
```

#### Solution 3: Minimize JSON Overhead

```php
// ❌ INEFFICIENT - Verbose JSON
$verboseContext = json_encode($data, JSON_PRETTY_PRINT);
// Uses extra tokens for whitespace and formatting

// ✅ EFFICIENT - Compact JSON
$compactContext = json_encode($data);
// Saves tokens by removing unnecessary whitespace
```

### Model Not Found Errors

**Symptom**: "Unknown model" or defaults to 4,096 tokens

**Causes:**
1. Typo in model name
2. Using unsupported model
3. Model name doesn't match any pattern

**Solutions:**

#### Solution 1: Verify Model Name

```php
use Mindwave\Mindwave\PromptComposer\Tokenizer\ModelTokenLimits;

// Check if model is supported
$models = ModelTokenLimits::all();

if (!isset($models[$yourModel])) {
    echo "Model not directly supported\n";

    // Try getting context window (uses pattern matching)
    $contextWindow = ModelTokenLimits::getContextWindow($yourModel);
    echo "Context window: {$contextWindow}\n";

    if ($contextWindow === 4096) {
        echo "WARNING: Using default fallback (4,096 tokens)\n";
    }
}
```

#### Solution 2: Use Pattern Matching

```php
// These all work due to pattern matching:
ModelTokenLimits::getContextWindow('gpt-4');              // 8,192
ModelTokenLimits::getContextWindow('gpt-4-0613');         // 8,192
ModelTokenLimits::getContextWindow('gpt-4-0314');         // 8,192
ModelTokenLimits::getContextWindow('gpt-4-custom-v2');    // 8,192

// But this uses default:
ModelTokenLimits::getContextWindow('my-custom-model');    // 4,096 (fallback)
```

#### Solution 3: Use Known Model for Custom Fine-Tunes

```php
// If you have a GPT-4o fine-tune with same context window:
Mindwave::prompt()
    ->model('gpt-4o')  // Use base model for token limits
    // Then use actual fine-tune name in LLM call
    ->fit()
    ->toMessages(); // Get fitted messages

// Manually send to fine-tune
$llm = Mindwave::llm()->model('ft:gpt-4o:your-fine-tune');
$response = $llm->chat($messages);
```

---

## Quick Reference Summary

### Top Recommendations by Use Case

| Use Case | Recommended Model | Context | Cost | Why |
|----------|------------------|---------|------|-----|
| **Simple tasks** | GPT-4o Mini | 128K | $0.15/$0.60 | Best balance of cost and quality |
| **Complex reasoning** | Claude 3.5 Sonnet | 200K | $3.00/$15.00 | Excellent reasoning, large context |
| **Huge documents** | Gemini 1.5 Pro | 2M | $1.25/$5.00 | Largest context, great value |
| **Budget processing** | Gemini 1.5 Flash | 1M | $0.075/$0.30 | Cheapest with huge context |
| **Code generation** | GPT-4o | 128K | $2.50/$10.00 | Best code quality |
| **Chatbots** | GPT-4o Mini | 128K | $0.15/$0.60 | Fast, affordable, natural |
| **RAG applications** | Command-R | 128K | $0.50/$1.50 | Optimized for retrieval |
| **Premium quality** | Claude 3 Opus | 200K | $15.00/$75.00 | Most capable |

### Model Count

Mindwave supports **36+ models** across 5 providers:
- **OpenAI**: 13 models (including anticipated GPT-5/GPT-4.1)
- **Anthropic**: 7 models
- **Mistral**: 6 models
- **Google**: 3 models
- **Cohere**: 3 models
- **Fallback**: 4,096 tokens for unknown models

### Essential Code Snippets

```php
// Basic usage with auto-fit
Mindwave::prompt()
    ->model('gpt-4o')
    ->reserveOutputTokens(1000)
    ->section('user', $prompt)
    ->fit()
    ->run();

// Check token count
$tokens = Mindwave::prompt()->model('claude-3-5-sonnet')
    ->section('user', $content)
    ->getTokenCount();

// Get available budget
$available = Mindwave::prompt()->model('gpt-4o')
    ->reserveOutputTokens(500)
    ->getAvailableTokens(); // Returns 127,500

// Model comparison
foreach (['gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet'] as $model) {
    $response = Mindwave::prompt()->model($model)->/*...*/->run();
}
```

---

**Need more help?** Check the [PromptComposer guide](/docs/core/prompt-composer) for detailed usage examples.
