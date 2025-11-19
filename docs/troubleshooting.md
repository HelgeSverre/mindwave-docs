# Troubleshooting

Your comprehensive guide to diagnosing and fixing common Mindwave issues. This guide helps you resolve problems quickly with systematic debugging approaches and production-ready solutions.

## How to Use This Guide

**Finding Solutions:**
1. **Search by symptom** - Use your browser's find feature (Ctrl/Cmd+F) to search for error messages
2. **Check category** - Navigate to the relevant section based on where the issue occurs
3. **Follow diagnostic steps** - Work through the troubleshooting steps in order
4. **Try multiple solutions** - Some issues have several potential causes

**When to Check What:**
- **Installation/Setup Issues** → Check config files and environment variables
- **Runtime Errors** → Check logs first (`storage/logs/laravel.log`)
- **Performance Issues** → Check traces and database queries
- **Unexpected Behavior** → Enable debug mode and check configuration

**Getting More Help:**
If this guide doesn't solve your problem, see the [Getting Help](#getting-help) section for community resources and how to file effective bug reports.

---

## Installation & Setup Issues

### Issue: Composer Installation Fails

**Symptoms:**
```bash
composer require mindwave/mindwave
# Error: Your requirements could not be resolved...
```

**Common Causes:**

**1. PHP Version Mismatch**

Mindwave requires PHP 8.2, 8.3, or 8.4.

```bash
# Check your PHP version
php -v

# If wrong version, specify correct PHP binary
composer require mindwave/mindwave --with-php-binary=/path/to/php8.3
```

**2. Missing PHP Extensions**

Required extensions: `ext-zip`, `ext-json`, `ext-mbstring`

```bash
# Check installed extensions
php -m | grep -E "zip|json|mbstring"

# Install missing extensions (Ubuntu/Debian)
sudo apt-get install php8.3-zip php8.3-mbstring

# Install missing extensions (macOS with Homebrew)
brew install php@8.3
pecl install zip

# Install missing extensions (Windows)
# Edit php.ini and enable: extension=zip, extension=mbstring
```

**3. Memory Limit Too Low**

```bash
# Increase memory limit temporarily
php -d memory_limit=512M /usr/local/bin/composer require mindwave/mindwave

# Or permanently in php.ini
memory_limit = 512M
```

**4. Composer Version Issues**

```bash
# Update Composer to latest version
composer self-update

# Clear Composer cache
composer clear-cache

# Try again
composer require mindwave/mindwave
```

---

### Issue: Migrations Fail

**Symptoms:**
```bash
php artisan migrate
# SQLSTATE[HY000] [1045] Access denied for user...
```

**Common Causes:**

**1. Database Connection Not Configured**

Check your `.env` file:

```bash
# Verify database credentials
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=your_database
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

Test connection:
```bash
# Try to connect directly
mysql -h 127.0.0.1 -u your_username -p your_database

# Check Laravel can connect
php artisan tinker
>>> DB::connection()->getPdo();
```

**2. Database Doesn't Exist**

```bash
# Create database manually
mysql -u root -p
> CREATE DATABASE your_database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
> GRANT ALL PRIVILEGES ON your_database.* TO 'your_username'@'localhost';
> exit;

# Or use Laravel command (if available)
php artisan db:create
```

**3. Wrong Database Driver**

For PostgreSQL:
```bash
# Install PostgreSQL driver
sudo apt-get install php8.3-pgsql

# Update .env
DB_CONNECTION=pgsql
DB_PORT=5432
```

**4. Migration Already Exists**

```bash
# Check migrations table
php artisan migrate:status

# If needed, reset and re-run
php artisan migrate:fresh  # WARNING: Drops all tables!

# Or rollback specific migration
php artisan migrate:rollback --step=1
```

**5. Permission Issues**

```bash
# Check database user permissions
mysql -u root -p
> SHOW GRANTS FOR 'your_username'@'localhost';
> GRANT ALL PRIVILEGES ON your_database.* TO 'your_username'@'localhost';
> FLUSH PRIVILEGES;
```

---

### Issue: Config Files Not Publishing

**Symptoms:**
```bash
php artisan vendor:publish --tag="mindwave-config"
# No publishable resources for tag [mindwave-config]
```

**Solutions:**

**1. Clear Application Cache**

```bash
# Clear all caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Dump autoload
composer dump-autoload

# Try publishing again
php artisan vendor:publish --tag="mindwave-config"
```

**2. Check Package Installation**

```bash
# Verify Mindwave is installed
composer show mindwave/mindwave

# If not found, reinstall
composer require mindwave/mindwave
```

**3. Manually Publish Specific Files**

```bash
# List all publishable tags
php artisan vendor:publish --all

# Publish with provider
php artisan vendor:publish --provider="Mindwave\Mindwave\MindwaveServiceProvider"
```

**4. Copy Files Manually (Last Resort)**

```bash
# Copy from vendor to config directory
cp vendor/mindwave/mindwave/config/mindwave-llm.php config/
cp vendor/mindwave/mindwave/config/mindwave-tracing.php config/
cp vendor/mindwave/mindwave/config/mindwave-context.php config/
cp vendor/mindwave/mindwave/config/mindwave-embeddings.php config/
cp vendor/mindwave/mindwave/config/mindwave-vectorstore.php config/
```

---

## LLM Integration Issues

### Issue: "API Key Not Configured"

**Symptoms:**
```php
// Error: API key is required but not configured
InvalidArgumentException: OpenAI API key is required
```

**Solutions:**

**1. Set API Key in .env File**

```bash
# Add to .env (create if it doesn't exist)
MINDWAVE_OPENAI_API_KEY=sk-proj-...
MINDWAVE_MISTRAL_API_KEY=...
MINDWAVE_ANTHROPIC_API_KEY=...

# Clear config cache after changing .env
php artisan config:clear
```

**2. Verify Environment Variables Load**

```bash
# Check if .env is loaded
php artisan tinker
>>> env('MINDWAVE_OPENAI_API_KEY')
# Should output your key (or null if not set)

# Check config value
>>> config('mindwave-llm.llms.openai.api_key')
```

**3. Cached Configuration Issue**

```bash
# If using config:cache, you must recache after .env changes
php artisan config:clear
php artisan config:cache

# In production, always recache after deploying .env changes
```

**4. Wrong Environment File**

```bash
# Check which .env file Laravel is using
php artisan env

# Verify file location
ls -la .env
cat .env | grep MINDWAVE_OPENAI_API_KEY

# Common mistake: editing .env.example instead of .env
```

**5. Programmatic Configuration**

If .env doesn't work, set directly in `config/mindwave-llm.php`:

```php
// NOT RECOMMENDED FOR PRODUCTION (use .env instead)
'openai' => [
    'api_key' => 'sk-proj-YOUR-KEY-HERE',  // Hardcoded (dev only)
    // ...
],
```

---

### Issue: "Model Not Found"

**Symptoms:**
```php
// Error: The model 'gpt-4-latest' does not exist
OpenAI\Exceptions\ErrorException: Model not found
```

**Solutions:**

**1. Use Correct Model Name**

Check available models for each provider:

**OpenAI Models:**
```bash
# Valid model names
gpt-4-turbo
gpt-4-1106-preview
gpt-4-0125-preview
gpt-4
gpt-3.5-turbo
gpt-3.5-turbo-1106
gpt-3.5-turbo-0125
```

**Mistral Models:**
```bash
mistral-large-latest
mistral-medium-latest
mistral-small-latest
mistral-tiny
```

**Anthropic Models:**
```bash
claude-3-opus-20240229
claude-3-sonnet-20240229
claude-3-haiku-20240307
claude-sonnet-4-5-20250929
```

**2. Update Model in Configuration**

```bash
# In .env
MINDWAVE_OPENAI_MODEL=gpt-4-turbo

# Or in code
Mindwave::llm('openai')
    ->model('gpt-4-turbo')
    ->generateText('Hello');
```

**3. Check Provider Access**

```bash
# Some models require special access (GPT-4 API access)
# Verify on provider's dashboard:
# - OpenAI: https://platform.openai.com/account/limits
# - Anthropic: https://console.anthropic.com/
# - Mistral: https://console.mistral.ai/
```

**4. Model Name Changed**

```bash
# Providers sometimes rename/deprecate models
# Check provider's documentation for latest names
# Update your config accordingly
```

---

### Issue: "Connection Timeout"

**Symptoms:**
```php
// Error: cURL error 28: Operation timed out after 30000 milliseconds
GuzzleHttp\Exception\ConnectException: Connection timeout
```

**Solutions:**

**1. Increase Timeout in Configuration**

For OpenAI in `config/mindwave-llm.php`:

```php
'openai' => [
    'api_key' => env('MINDWAVE_OPENAI_API_KEY'),
    'timeout' => 60, // Increase from default 30 seconds
    // ...
],
```

Or programmatically:

```php
use Mindwave\Mindwave\Facades\Mindwave;

Mindwave::llm('openai')
    ->timeout(120) // 2 minutes
    ->generateText($prompt);
```

**2. Check Network Connectivity**

```bash
# Test connection to OpenAI
curl -I https://api.openai.com

# Test connection to Anthropic
curl -I https://api.anthropic.com

# Test connection to Mistral
curl -I https://api.mistral.ai

# Check firewall/proxy settings
```

**3. Behind Corporate Proxy**

Configure proxy in `config/mindwave-llm.php`:

```php
'openai' => [
    'api_key' => env('MINDWAVE_OPENAI_API_KEY'),
    'proxy' => env('HTTP_PROXY', null), // e.g., 'http://proxy.company.com:8080'
    // ...
],
```

**4. Server-Side Issues**

```bash
# Provider might be experiencing outages
# Check status pages:
# - OpenAI: https://status.openai.com/
# - Anthropic: https://status.anthropic.com/
# - Mistral: Check Twitter/Discord for updates

# Retry with exponential backoff
```

**5. Large Prompts Causing Delays**

```php
// For very large prompts, increase timeout
Mindwave::prompt()
    ->section('context', $largeDocument)
    ->timeout(300) // 5 minutes
    ->run();

// Or enable streaming for long responses
Mindwave::stream($prompt)
    ->timeout(300)
    ->respond();
```

---

### Issue: "Rate Limit Exceeded"

**Symptoms:**
```php
// Error: Rate limit reached for requests
OpenAI\Exceptions\RateLimitException: Rate limit exceeded
// Or: 429 Too Many Requests
```

**Solutions:**

**1. Implement Retry Logic**

```php
use Illuminate\Support\Facades\Http;

$maxRetries = 3;
$retryDelay = 5; // seconds

for ($i = 0; $i < $maxRetries; $i++) {
    try {
        $response = Mindwave::llm()->generateText($prompt);
        break;
    } catch (\Exception $e) {
        if (str_contains($e->getMessage(), 'rate limit') && $i < $maxRetries - 1) {
            sleep($retryDelay * ($i + 1)); // Exponential backoff
            continue;
        }
        throw $e;
    }
}
```

**2. Check Your Rate Limits**

```bash
# View your rate limits:
# - OpenAI: https://platform.openai.com/account/limits
# - Check requests per minute (RPM) and tokens per minute (TPM)
# - Upgrade tier if needed (OpenAI Tier 1, 2, 3, etc.)
```

**3. Implement Rate Limiting in Your Application**

```php
use Illuminate\Support\Facades\RateLimiter;

// Limit LLM calls per user
RateLimiter::for('llm-calls', function ($request) {
    return Limit::perMinute(10)->by($request->user()?->id ?: $request->ip());
});

// In controller
if (RateLimiter::tooManyAttempts('llm-calls:'.$userId, 10)) {
    return response()->json(['error' => 'Too many requests'], 429);
}

RateLimiter::hit('llm-calls:'.$userId);
```

**4. Use Queues for Batch Processing**

```php
use Illuminate\Bus\Queueable;

class ProcessLLMRequest implements ShouldQueue
{
    use Queueable;

    public function __construct(private string $prompt) {}

    public function handle()
    {
        // Queue workers process at a controlled rate
        $response = Mindwave::llm()->generateText($this->prompt);
        // ...
    }
}

// Dispatch to queue instead of processing immediately
ProcessLLMRequest::dispatch($prompt);
```

**5. Switch to Higher Tier or Different Model**

```bash
# OpenAI: Upgrade your organization tier
# Mistral: Contact support for higher limits
# Anthropic: Check your plan limits

# Or use cheaper/faster models for less critical tasks
MINDWAVE_OPENAI_MODEL=gpt-3.5-turbo  # Higher RPM limits
```

---

### Issue: "Context Length Exceeded"

**Symptoms:**
```php
// Error: This model's maximum context length is 8192 tokens
OpenAI\Exceptions\InvalidRequestException: Context length exceeded
```

**Solutions:**

**1. Use PromptComposer with Auto-Fitting**

```php
use Mindwave\Mindwave\Facades\Mindwave;

Mindwave::prompt()
    ->reserveOutputTokens(1000) // Reserve space for response
    ->section('system', $systemPrompt, priority: 100) // Keep this
    ->section('context', $largeDocument, priority: 50, shrinker: 'summarize')
    ->section('history', $conversation, priority: 75, shrinker: 'truncate_end')
    ->section('user', $userMessage, priority: 100) // Always keep
    ->fit() // Auto-trim to model's context window
    ->run();
```

**2. Choose Appropriate Shrinkers**

```php
// Available shrinkers:
// - 'truncate_start': Remove content from beginning
// - 'truncate_end': Remove content from end
// - 'truncate_middle': Keep start and end, remove middle
// - 'summarize': Use LLM to summarize content (costs extra tokens)

// Example: Smart context handling
Mindwave::prompt()
    ->section('documentation', $docs, priority: 40, shrinker: 'summarize')
    ->section('code', $codeSnippet, priority: 60, shrinker: 'truncate_middle')
    ->section('chat_history', $history, priority: 30, shrinker: 'truncate_start')
    ->fit()
    ->run();
```

**3. Use Models with Larger Context Windows**

```bash
# Switch to models with larger context windows
MINDWAVE_OPENAI_MODEL=gpt-4-turbo  # 128k tokens
# vs gpt-3.5-turbo (16k tokens)

# Anthropic Claude 3
MINDWAVE_ANTHROPIC_MODEL=claude-3-opus-20240229  # 200k tokens

# Mistral
MINDWAVE_MISTRAL_MODEL=mistral-large-latest  # 32k tokens
```

**4. Split Long Documents**

```php
use Mindwave\Mindwave\TextSplitters\RecursiveCharacterTextSplitter;

// Split large document into chunks
$splitter = new RecursiveCharacterTextSplitter(
    chunkSize: 2000,
    chunkOverlap: 200
);

$chunks = $splitter->split($largeDocument);

// Process each chunk separately
foreach ($chunks as $chunk) {
    $result = Mindwave::llm()->generateText(
        "Analyze this section:\n\n{$chunk}"
    );
    // Aggregate results...
}
```

**5. Use Context Discovery Instead of Full Documents**

```php
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;

// Instead of including entire document, search for relevant parts
$contextSource = TntSearchSource::fromCsv('large-document.csv');

Mindwave::prompt()
    ->context($contextSource, limit: 5) // Only include top 5 relevant chunks
    ->section('user', $userQuestion)
    ->run();
```

---

## PromptComposer Issues

### Issue: Prompt Doesn't Fit Even After Auto-Fit

**Symptoms:**
```php
// Error: Cannot fit prompt within token budget even after shrinking all sections
RuntimeException: Unable to fit prompt within model's context window
```

**Solutions:**

**1. Reserve Fewer Output Tokens**

```php
// Default reserves 1000 tokens for output
// Reduce if you need shorter responses
Mindwave::prompt()
    ->reserveOutputTokens(500) // Frees up 500 more input tokens
    ->section('context', $content)
    ->fit()
    ->run();
```

**2. Adjust Section Priorities**

```php
// Lower priority = trimmed first
Mindwave::prompt()
    ->section('system', $system, priority: 100) // Never trim
    ->section('examples', $examples, priority: 20) // Trim first
    ->section('context', $context, priority: 50) // Trim second
    ->section('user', $user, priority: 100) // Never trim
    ->fit()
    ->run();
```

**3. Use More Aggressive Shrinkers**

```php
// Start with summarization, fall back to truncation
Mindwave::prompt()
    ->section('context', $longContext,
        priority: 50,
        shrinker: 'truncate_middle' // More aggressive than 'summarize'
    )
    ->fit()
    ->run();
```

**4. Switch to Larger Context Model**

```php
// Use model with bigger context window
Mindwave::prompt()
    ->model('gpt-4-turbo') // 128k tokens vs 8k
    ->section('context', $content)
    ->fit()
    ->run();
```

**5. Pre-Process Content Before Adding**

```php
// Compress content before adding to prompt
$compressed = strip_tags($html); // Remove HTML tags
$compressed = preg_replace('/\s+/', ' ', $compressed); // Normalize whitespace
$compressed = substr($compressed, 0, 10000); // Hard limit

Mindwave::prompt()
    ->section('context', $compressed)
    ->fit()
    ->run();
```

---

### Issue: Important Content Being Truncated

**Symptoms:**
```php
// LLM response indicates it didn't see crucial information
// "I don't have information about..." when it was in the prompt
```

**Solutions:**

**1. Increase Section Priority**

```php
// Set priority to 100 (max) for critical content
Mindwave::prompt()
    ->section('critical_info', $importantData, priority: 100) // Won't be trimmed
    ->section('nice_to_have', $extraContext, priority: 30) // Will be trimmed first
    ->fit()
    ->run();
```

**2. Mark Section as Non-Shrinkable**

```php
// Don't provide a shrinker for sections that must not be modified
Mindwave::prompt()
    ->section('system', $systemPrompt) // No shrinker = can't be reduced
    ->section('context', $context, priority: 50, shrinker: 'truncate_end')
    ->fit()
    ->run();
```

**3. Reorder Sections**

```php
// Put most important content first (closer to user message)
Mindwave::prompt()
    ->section('system', $system)
    ->section('important_context', $critical) // Add this first
    ->section('background', $nice_to_have) // Less important
    ->section('user', $userMessage) // Always last
    ->fit()
    ->run();
```

**4. Use Smaller Background Context**

```php
// Reduce size of less important sections
Mindwave::prompt()
    ->section('system', $system, priority: 100)
    ->section('critical', $important, priority: 100) // Full content
    ->section('background', substr($background, 0, 1000), priority: 50) // Pre-truncated
    ->section('user', $user, priority: 100)
    ->fit()
    ->run();
```

---

### Issue: Token Count Mismatch

**Symptoms:**
```php
// Prompt fits in testing but fails in production
// Token counts don't match between estimation and actual API call
```

**Solutions:**

**1. Use Provider-Specific Tokenizers**

```php
// Different providers use different tokenizers
// OpenAI uses tiktoken, Claude uses different tokenization

// Configure correct tokenizer for your model
use Yethee\Tiktoken\Encoder;
use Yethee\Tiktoken\EncoderProvider;

$provider = new EncoderProvider();
$encoder = $provider->get('gpt-4'); // Use correct model

$tokenCount = count($encoder->encode($text));
```

**2. Add Buffer to Reserved Tokens**

```php
// Reserve extra tokens for estimation errors
Mindwave::prompt()
    ->reserveOutputTokens(1200) // Reserve 1000 + 200 buffer
    ->section('context', $content)
    ->fit()
    ->run();
```

**3. Test with Actual Model**

```php
// Don't rely on estimates, test with real API calls
try {
    $response = Mindwave::prompt()
        ->section('context', $content)
        ->fit()
        ->run();
} catch (\Exception $e) {
    if (str_contains($e->getMessage(), 'context length')) {
        // Reduce content size and retry
        $content = substr($content, 0, strlen($content) / 2);
        // Retry...
    }
}
```

**4. Account for Message Formatting**

```php
// API adds tokens for message structure (roles, JSON formatting)
// Each message adds ~4 tokens for structure
// Add buffer for this overhead

$structureOverhead = 4 * $numberOfMessages;
Mindwave::prompt()
    ->reserveOutputTokens(1000 + $structureOverhead)
    ->fit()
    ->run();
```

---

## Streaming Issues

### Issue: Streaming Not Working

**Symptoms:**
```php
// Browser shows "Loading..." forever
// No data received from EventSource
// Connection established but no messages
```

**Solutions:**

**1. Check Server-Sent Events Headers**

```php
// Ensure proper SSE headers are sent
return response()->stream(function () use ($stream) {
    foreach ($stream as $chunk) {
        echo "data: {$chunk}\n\n";
        ob_flush();
        flush();
    }
}, 200, [
    'Content-Type' => 'text/event-stream',
    'Cache-Control' => 'no-cache',
    'Connection' => 'keep-alive',
    'X-Accel-Buffering' => 'no', // Disable Nginx buffering
]);
```

**2. Disable Output Buffering**

```php
// At the start of your streaming route
if (ob_get_level()) {
    ob_end_clean();
}

// Or configure in php.ini
output_buffering = Off
```

**3. Configure Nginx for Streaming**

```nginx
# In your Nginx config
location / {
    proxy_pass http://127.0.0.1:8000;
    proxy_buffering off;
    proxy_cache off;
    proxy_set_header Connection '';
    proxy_http_version 1.1;
    chunked_transfer_encoding off;
}
```

**4. Configure Apache for Streaming**

```apache
# In .htaccess or Apache config
SetEnv no-gzip 1
<IfModule mod_headers.c>
    Header set Cache-Control "no-cache"
    Header set X-Accel-Buffering "no"
</IfModule>
```

**5. Test Direct Connection**

```bash
# Test streaming endpoint directly with curl
curl -N http://localhost:8000/api/stream

# Should see data chunks appear progressively
# If nothing appears, server-side issue
# If all appears at once, buffering issue
```

**6. JavaScript EventSource Setup**

```javascript
// Frontend code
const eventSource = new EventSource('/api/stream?message=' + encodeURIComponent(query));

eventSource.onmessage = function(event) {
    console.log('Received:', event.data);
    output.textContent += event.data;
};

eventSource.onerror = function(error) {
    console.error('EventSource error:', error);
    eventSource.close();
};

eventSource.addEventListener('done', function() {
    console.log('Stream complete');
    eventSource.close();
});
```

---

### Issue: Connection Drops Mid-Stream

**Symptoms:**
```javascript
// EventSource fires 'error' event before completion
// Partial response received, then connection lost
```

**Solutions:**

**1. Increase Timeouts**

```php
// In your streaming route
set_time_limit(300); // 5 minutes
ini_set('max_execution_time', 300);

// Configure in php.ini for all scripts
max_execution_time = 300
```

```nginx
# Nginx timeout configuration
proxy_read_timeout 300s;
proxy_connect_timeout 300s;
proxy_send_timeout 300s;
```

**2. Implement Reconnection Logic**

```javascript
let reconnectAttempts = 0;
const maxReconnects = 3;

function connectStream() {
    const eventSource = new EventSource('/api/stream?message=' + message);

    eventSource.onerror = function(error) {
        eventSource.close();

        if (reconnectAttempts < maxReconnects) {
            reconnectAttempts++;
            console.log(`Reconnecting... Attempt ${reconnectAttempts}`);
            setTimeout(connectStream, 1000 * reconnectAttempts);
        } else {
            console.error('Max reconnection attempts reached');
        }
    };

    eventSource.onmessage = function(event) {
        reconnectAttempts = 0; // Reset on successful message
        handleMessage(event.data);
    };
}

connectStream();
```

**3. Send Periodic Heartbeats**

```php
// Keep connection alive with periodic comments
return response()->stream(function () use ($stream) {
    $lastHeartbeat = time();

    foreach ($stream as $chunk) {
        echo "data: {$chunk}\n\n";
        ob_flush();
        flush();

        // Send heartbeat every 15 seconds
        if (time() - $lastHeartbeat > 15) {
            echo ": heartbeat\n\n";
            ob_flush();
            flush();
            $lastHeartbeat = time();
        }
    }
}, 200, [...]);
```

**4. Check Reverse Proxy Timeouts**

```bash
# Nginx
proxy_read_timeout 300s;

# Apache
Timeout 300

# Load balancers (AWS ALB, Cloudflare)
# Increase idle timeout in load balancer settings
```

**5. Monitor Connection State**

```php
// Detect client disconnect
register_shutdown_function(function() {
    if (connection_status() != CONNECTION_NORMAL) {
        // Client disconnected, cleanup resources
        Log::warning('Client disconnected during streaming');
    }
});

// Check during streaming
foreach ($stream as $chunk) {
    if (connection_aborted()) {
        break; // Stop processing if client disconnected
    }

    echo "data: {$chunk}\n\n";
    ob_flush();
    flush();
}
```

---

### Issue: No Data Received

**Symptoms:**
```javascript
// EventSource.readyState = 1 (open) but no messages
// Browser developer tools show connection but no data
```

**Solutions:**

**1. Flush Output Buffers**

```php
// Essential for streaming to work
return response()->stream(function () use ($stream) {
    // Disable all output buffering
    while (ob_get_level() > 0) {
        ob_end_clean();
    }

    foreach ($stream as $chunk) {
        echo "data: {$chunk}\n\n";

        // Both required for streaming
        ob_flush(); // Flush PHP buffer
        flush();    // Flush system buffer
    }
}, 200, [...]);
```

**2. Check Response Format**

```php
// Correct SSE format: "data: " prefix and double newline
echo "data: Hello\n\n";  // ✓ Correct

// Common mistakes:
echo "Hello\n";           // ✗ Missing "data: " prefix
echo "data: Hello\n";     // ✗ Single newline (won't send)
echo "data:Hello\n\n";    // ✗ No space after colon
```

**3. Verify Streaming Response**

```php
// Use Mindwave's built-in streaming
use Mindwave\Mindwave\Facades\Mindwave;

return Mindwave::stream($prompt)
    ->model('gpt-4-turbo')
    ->respond(); // Handles all SSE formatting automatically
```

**4. Test with Simple Stream**

```php
// Minimal test endpoint
Route::get('/test-stream', function () {
    return response()->stream(function () {
        for ($i = 1; $i <= 10; $i++) {
            echo "data: Message {$i}\n\n";
            ob_flush();
            flush();
            sleep(1);
        }
        echo "event: done\ndata: Complete\n\n";
        ob_flush();
        flush();
    }, 200, [
        'Content-Type' => 'text/event-stream',
        'Cache-Control' => 'no-cache',
        'X-Accel-Buffering' => 'no',
    ]);
});
```

**5. Check Browser Console**

```javascript
// Debug in browser console
const eventSource = new EventSource('/api/stream');

eventSource.onopen = function() {
    console.log('Connection opened');
};

eventSource.onmessage = function(event) {
    console.log('Message:', event.data);
};

eventSource.onerror = function(error) {
    console.error('Error:', error);
    console.log('ReadyState:', eventSource.readyState);
    // 0 = CONNECTING, 1 = OPEN, 2 = CLOSED
};
```

---

## Context Discovery Issues

### Issue: TNTSearch Index Not Found

**Symptoms:**
```php
// Error: Index file not found: storage/mindwave/tnt-indexes/users_xxx.index
RuntimeException: TNTSearch index does not exist
```

**Solutions:**

**1. Create Storage Directory**

```bash
# Create required directories
mkdir -p storage/mindwave/tnt-indexes

# Set proper permissions
chmod -R 775 storage/mindwave
chown -R www-data:www-data storage/mindwave  # Linux
chown -R _www:_www storage/mindwave          # macOS
```

**2. Verify Storage Path in Config**

```php
// config/mindwave-context.php
'tntsearch' => [
    'storage_path' => storage_path('mindwave/tnt-indexes'),
    // Path must exist and be writable
],
```

**3. Let Mindwave Create Index Automatically**

```php
// Mindwave creates ephemeral indexes automatically
$source = TntSearchSource::fromEloquent(
    User::query(),
    fn($u) => "Name: {$u->name}"
);

// Index is created when context is first accessed
Mindwave::prompt()
    ->context($source)
    ->ask('Find users...');
```

**4. Check Disk Space**

```bash
# Verify sufficient disk space
df -h

# Check storage directory size
du -sh storage/mindwave/tnt-indexes/
```

**5. Clear Old Indexes**

```bash
# Clear old indexes (default: older than 24 hours)
php artisan mindwave:clear-indexes

# Force clear all indexes
php artisan mindwave:clear-indexes --force

# Check index statistics
php artisan mindwave:index-stats
```

---

### Issue: Vector Store Connection Failed

**Symptoms:**
```php
// Error: Could not connect to vector store
ConnectionException: Connection to Qdrant failed
```

**Solutions:**

**1. Verify Vector Store is Running**

For Qdrant (Docker):
```bash
# Start Qdrant
docker run -p 6333:6333 qdrant/qdrant

# Check if running
curl http://localhost:6333/collections

# Or use Docker Compose
docker-compose up -d qdrant
```

For Pinecone:
```bash
# Verify API key
curl -i https://controller.YOUR-ENV.pinecone.io/actions/whoami \
  -H 'Api-Key: YOUR-API-KEY'
```

**2. Configure Connection Settings**

```bash
# In .env
MINDWAVE_VECTORSTORE_DRIVER=qdrant
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_API_KEY=  # Leave empty for local

# For Pinecone
MINDWAVE_VECTORSTORE_DRIVER=pinecone
PINECONE_API_KEY=your-key-here
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=mindwave
```

**3. Check Network Connectivity**

```bash
# Test connection
telnet localhost 6333

# Or with curl
curl -v http://localhost:6333/collections

# Check firewall rules
sudo ufw status  # Linux
```

**4. Verify Collection/Index Exists**

```php
// Create collection if it doesn't exist
use Mindwave\Mindwave\Vectorstore\Facades\VectorStore;

try {
    $results = VectorStore::search('test query', limit: 1);
} catch (\Exception $e) {
    // Collection doesn't exist, create it
    VectorStore::createCollection('mindwave', dimensions: 1536);
}
```

**5. Check Authentication**

```bash
# Qdrant with API key
QDRANT_API_KEY=your-secret-key

# Pinecone authentication
PINECONE_API_KEY=xxxxx-xxx-xxx

# Test authentication
curl http://localhost:6333/collections \
  -H "api-key: your-secret-key"
```

---

### Issue: No Relevant Context Found

**Symptoms:**
```php
// Context search returns empty or irrelevant results
// LLM says "I don't have information..." when data exists
```

**Solutions:**

**1. Tune Search Threshold**

```php
// Lower threshold for more results (less relevant)
Mindwave::prompt()
    ->context($source, limit: 10, minScore: 0.3) // Default: 0.5
    ->ask('Find users...');
```

**2. Improve Query Extraction**

```php
// Manually specify search query instead of auto-extraction
$pipeline = (new ContextPipeline)
    ->addSource($source)
    ->search('specific keywords to search for');

Mindwave::prompt()
    ->context($pipeline)
    ->ask($userQuestion);
```

**3. Index More Searchable Content**

```php
// Include more fields in indexed content
TntSearchSource::fromEloquent(
    Product::query(),
    function($product) {
        // Include all relevant searchable text
        return implode(' ', [
            $product->name,
            $product->description,
            $product->category,
            $product->tags,
            $product->sku,
        ]);
    }
);
```

**4. Use Better Text Formatting**

```php
// Structure content for better search matching
TntSearchSource::fromEloquent(
    User::query(),
    function($user) {
        return "User Profile: " .
               "Name: {$user->name}, " .
               "Email: {$user->email}, " .
               "Skills: {$user->skills}, " .
               "Bio: {$user->bio}";
    }
);
```

**5. Increase Result Limit**

```php
// Return more results to increase chances of finding relevant content
Mindwave::prompt()
    ->context($source, limit: 20) // Default: 10
    ->ask($question);
```

---

### Issue: Slow Context Retrieval

**Symptoms:**
```php
// Context search takes several seconds
// Application becomes unresponsive during context discovery
```

**Solutions:**

**1. Cache Indexes**

```php
// Increase TTL for frequently used indexes
// config/mindwave-context.php
'tntsearch' => [
    'ttl_hours' => 72, // Keep indexes for 3 days (default: 24)
],
```

**2. Limit Query Size**

```php
// Reduce number of records indexed
TntSearchSource::fromEloquent(
    Product::where('active', true)
        ->where('created_at', '>', now()->subYear()) // Only recent products
        ->limit(10000), // Limit total records
    fn($p) => "..."
);
```

**3. Use Database Indexes**

```sql
-- Add indexes to frequently searched columns
ALTER TABLE users ADD INDEX idx_name (name);
ALTER TABLE products ADD INDEX idx_active_created (active, created_at);

-- Composite indexes for filtered queries
ALTER TABLE products ADD INDEX idx_category_price (category, price);
```

**4. Optimize Content Transformer**

```php
// Avoid expensive operations in transformer
TntSearchSource::fromEloquent(
    User::query()
        ->select(['id', 'name', 'email', 'skills']) // Select only needed columns
        ->without(['posts', 'comments']), // Avoid loading relations
    fn($user) => "{$user->name} {$user->email} {$user->skills}" // Simple concatenation
);
```

**5. Use Queue for Index Creation**

```php
// Create indexes asynchronously
dispatch(function() use ($data) {
    $source = TntSearchSource::fromArray($data);
    // Index created in background
});
```

**6. Monitor Index Size**

```bash
# Check index statistics
php artisan mindwave:index-stats

# Clear oversized indexes
php artisan mindwave:clear-indexes --max-size=100  # MB
```

---

## Tracing & Observability Issues

### Issue: Traces Not Appearing in Database

**Symptoms:**
```php
// Trace::all() returns empty collection
// No traces stored after LLM calls
```

**Solutions:**

**1. Enable Tracing in Configuration**

```bash
# In .env
MINDWAVE_TRACING_ENABLED=true
MINDWAVE_TRACE_DATABASE=true

# Clear config cache
php artisan config:clear
```

**2. Run Migrations**

```bash
# Verify migrations ran
php artisan migrate:status | grep mindwave

# Run migrations if missing
php artisan migrate

# If tables exist but schema changed
php artisan migrate:fresh  # WARNING: Drops all tables!
```

**3. Check Database Connection**

```php
// Test in tinker
php artisan tinker
>>> use Mindwave\Mindwave\Observability\Models\Trace;
>>> Trace::count()  // Should return 0, not error
>>> DB::table('mindwave_traces')->count()
```

**4. Verify Exporter Configuration**

```php
// config/mindwave-tracing.php
'database' => [
    'enabled' => true,  // Must be true
    'connection' => null, // null = default connection
],
```

**5. Check Instrumentation Settings**

```php
// config/mindwave-tracing.php
'instrumentation' => [
    'llm' => true,  // Must be enabled
    'tools' => true,
    'vectorstore' => true,
],
```

**6. Test Tracing Manually**

```php
// Create test trace
use Mindwave\Mindwave\Facades\Mindwave;

$response = Mindwave::llm()->generateText('Hello!');

// Check if trace was created
use Mindwave\Mindwave\Observability\Models\Trace;
$trace = Trace::latest()->first();
dd($trace);
```

---

### Issue: OTLP Export Failing

**Symptoms:**
```php
// Logs show: Failed to export traces via OTLP
// No traces appearing in Jaeger/Grafana
```

**Solutions:**

**1. Verify OTLP Endpoint**

```bash
# In .env
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Test endpoint
curl http://localhost:4318/v1/traces

# For Jaeger
docker run -d --name jaeger \
  -p 4318:4318 \
  -p 16686:16686 \
  jaegertracing/all-in-one:latest
```

**2. Check Protocol Configuration**

```bash
# config/mindwave-tracing.php or .env
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf  # or 'grpc'

# HTTP endpoint typically uses port 4318
# gRPC endpoint typically uses port 4317
```

**3. Configure Authentication**

```bash
# For services requiring authentication (Honeycomb, etc.)
OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=YOUR_API_KEY"

# Or in config file
'otlp' => [
    'headers' => [
        'x-honeycomb-team' => env('HONEYCOMB_API_KEY'),
    ],
],
```

**4. Check Network Connectivity**

```bash
# Test OTLP endpoint
curl -v -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{"resourceSpans":[]}'

# Should return 200 OK or 400 (not connection error)
```

**5. Enable Debug Logging**

```php
// config/mindwave-tracing.php
'debug' => env('MINDWAVE_TRACE_DEBUG', true),

// Check logs
tail -f storage/logs/laravel.log | grep -i otlp
```

**6. Verify Batch Configuration**

```php
// config/mindwave-tracing.php
'batch' => [
    'max_queue_size' => 2048,
    'scheduled_delay_ms' => 5000,  // Export every 5 seconds
    'export_timeout_ms' => 512,    // Timeout for export
],

// Reduce delay for faster exports during testing
'scheduled_delay_ms' => 1000,  // Export every 1 second
```

---

### Issue: High Memory Usage from Tracing

**Symptoms:**
```bash
# PHP memory limit exceeded
PHP Fatal error: Allowed memory size of 134217728 bytes exhausted
```

**Solutions:**

**1. Implement Sampling**

```bash
# In .env - only trace 10% of requests
MINDWAVE_TRACE_SAMPLER=traceidratio
MINDWAVE_TRACE_SAMPLE_RATIO=0.1

# Clear config cache
php artisan config:clear
```

**2. Reduce Batch Size**

```php
// config/mindwave-tracing.php
'batch' => [
    'max_queue_size' => 512,  // Reduce from 2048
    'max_export_batch_size' => 64,  // Reduce from 256
],
```

**3. Disable Message Capture**

```bash
# Messages consume significant memory
MINDWAVE_TRACE_CAPTURE_MESSAGES=false

# config/mindwave-tracing.php
'capture_messages' => false,
```

**4. Export More Frequently**

```php
// Export batches faster to free memory
'batch' => [
    'scheduled_delay_ms' => 1000,  // Export every 1 second (default: 5000)
],
```

**5. Increase PHP Memory Limit**

```bash
# In .env
PHP_MEMORY_LIMIT=256M

# Or in php.ini
memory_limit = 256M

# Or programmatically
ini_set('memory_limit', '256M');
```

**6. Prune Old Traces Regularly**

```bash
# Add to scheduler (app/Console/Kernel.php)
$schedule->command('mindwave:prune-traces --older-than=7days')->daily();

# Or run manually
php artisan mindwave:prune-traces --older-than=7days
```

---

### Issue: Cost Estimates Incorrect

**Symptoms:**
```php
// Trace shows $0.00 cost when it should have cost
// Or incorrect cost calculation
```

**Solutions:**

**1. Enable Cost Estimation**

```bash
# In .env
MINDWAVE_COST_ESTIMATION_ENABLED=true

# Verify in config
php artisan tinker
>>> config('mindwave-tracing.cost_estimation.enabled')
```

**2. Update Pricing Configuration**

```php
// config/mindwave-tracing.php
'cost_estimation' => [
    'enabled' => true,
    'pricing' => [
        'openai' => [
            'gpt-4-turbo' => [
                'input' => 0.01,   // USD per 1000 tokens
                'output' => 0.03,
            ],
            // Add your model if not listed
            'your-model-name' => [
                'input' => 0.005,
                'output' => 0.015,
            ],
        ],
    ],
],
```

**3. Verify Model Name Matches**

```php
// Check exact model name in traces
use Mindwave\Mindwave\Observability\Models\Span;

$span = Span::latest()->first();
dd($span->request_model); // Should match config key exactly

// Common issues:
// Config: 'gpt-4-turbo'
// Actual: 'gpt-4-turbo-2024-04-09'  ← Won't match!

// Add all model variants to config
```

**4. Check Token Counts**

```php
// Verify tokens are being recorded
$span = Span::latest()->first();
dd([
    'input_tokens' => $span->input_tokens,
    'output_tokens' => $span->output_tokens,
]);

// Should not be null or 0
```

**5. Calculate Cost Manually**

```php
// Debug cost calculation
$span = Span::latest()->first();
$pricing = config("mindwave-tracing.cost_estimation.pricing.{$span->provider_name}.{$span->request_model}");

$inputCost = ($span->input_tokens / 1000) * $pricing['input'];
$outputCost = ($span->output_tokens / 1000) * $pricing['output'];
$totalCost = $inputCost + $outputCost;

dd([
    'pricing' => $pricing,
    'input_cost' => $inputCost,
    'output_cost' => $outputCost,
    'total_cost' => $totalCost,
    'stored_cost' => $span->cost_usd,
]);
```

---

## Performance Issues

### Issue: Slow LLM Responses

**Symptoms:**
```php
// LLM calls take 30+ seconds
// User experiences long wait times
```

**Diagnosis Steps:**

```php
// 1. Check if it's network or processing
use Illuminate\Support\Facades\Log;

$start = microtime(true);
$response = Mindwave::llm()->generateText($prompt);
$duration = (microtime(true) - $start) * 1000; // ms

Log::info("LLM call duration: {$duration}ms");

// 2. Query traces for performance data
use Mindwave\Mindwave\Observability\Models\Span;

$slowSpans = Span::where('duration', '>', 30_000_000_000) // 30 seconds in nanoseconds
    ->orderByDesc('duration')
    ->limit(10)
    ->get();

foreach ($slowSpans as $span) {
    dump([
        'model' => $span->request_model,
        'duration' => $span->getDurationInMilliseconds() . 'ms',
        'tokens' => $span->input_tokens + $span->output_tokens,
    ]);
}
```

**Solutions:**

**1. Use Faster Models**

```php
// Switch from gpt-4 to gpt-3.5-turbo or gpt-4-turbo
Mindwave::llm()
    ->model('gpt-3.5-turbo')  // Much faster than gpt-4
    ->generateText($prompt);

// Or use smaller Mistral models
Mindwave::llm('mistral')
    ->model('mistral-small-latest')  // Faster than mistral-large
    ->generateText($prompt);
```

**2. Reduce Prompt Size**

```php
// Shorter prompts = faster responses
Mindwave::prompt()
    ->reserveOutputTokens(500)  // Limit response length
    ->section('context', substr($context, 0, 2000))  // Limit input
    ->fit()
    ->run();
```

**3. Enable Streaming**

```php
// Stream responses for better perceived performance
return Mindwave::stream($prompt)
    ->model('gpt-4-turbo')
    ->respond();

// User sees partial results immediately instead of waiting for full response
```

**4. Implement Caching**

```php
use Illuminate\Support\Facades\Cache;

$cacheKey = 'llm:' . md5($prompt);

$response = Cache::remember($cacheKey, now()->addHour(), function () use ($prompt) {
    return Mindwave::llm()->generateText($prompt);
});
```

**5. Use Queue for Non-Interactive Responses**

```php
// For email summaries, batch processing, etc.
use App\Jobs\ProcessLLMRequest;

ProcessLLMRequest::dispatch($prompt, $userId);

// Process in background, notify user when done
```

**6. Optimize Prompt Structure**

```php
// Put most important content first
// LLM can start generating before reading entire prompt
Mindwave::prompt()
    ->section('user', $question)  // Most important first
    ->section('context', $background)  // Supporting context
    ->run();
```

---

### Issue: High Memory Usage

**Symptoms:**
```bash
# Application uses excessive RAM
# Memory limit errors during processing
```

**Diagnosis:**

```php
// Monitor memory usage
function logMemory($label) {
    $memory = memory_get_usage(true) / 1024 / 1024; // MB
    Log::info("{$label}: {$memory}MB");
}

logMemory('Start');
$response = Mindwave::llm()->generateText($prompt);
logMemory('After LLM call');
```

**Solutions:**

**1. Process Large Datasets in Chunks**

```php
// Instead of loading all records at once
// BAD:
$users = User::all();  // Loads everything into memory

// GOOD:
User::chunk(1000, function ($users) {
    foreach ($users as $user) {
        // Process one chunk at a time
    }
});
```

**2. Use Lazy Collections**

```php
// For context discovery with large datasets
User::lazy()->each(function ($user) {
    // Process one at a time, frees memory between iterations
});
```

**3. Unset Large Variables**

```php
$largeData = file_get_contents('large-file.txt');
$response = Mindwave::llm()->generateText($largeData);

unset($largeData);  // Free memory immediately
gc_collect_cycles();  // Force garbage collection
```

**4. Limit Context Discovery Results**

```php
// Don't index huge datasets
Mindwave::prompt()
    ->context($source, limit: 5)  // Only 5 results, not 1000
    ->ask($question);
```

**5. Configure PHP Memory Limit**

```bash
# In .env
PHP_MEMORY_LIMIT=256M

# Or in php.ini
memory_limit = 256M

# Check current limit
php -i | grep memory_limit
```

**6. Disable Tracing for High-Volume Operations**

```php
// Temporarily disable tracing for memory-intensive tasks
config(['mindwave-tracing.enabled' => false]);

// Process large batch
// ...

// Re-enable
config(['mindwave-tracing.enabled' => true]);
```

---

### Issue: Database Queries Slow

**Symptoms:**
```php
// Trace queries take several seconds
// Application sluggish when viewing traces
```

**Solutions:**

**1. Add Database Indexes**

```sql
-- Add indexes to frequently queried columns
ALTER TABLE mindwave_traces ADD INDEX idx_created_at (created_at);
ALTER TABLE mindwave_traces ADD INDEX idx_cost (estimated_cost);
ALTER TABLE mindwave_traces ADD INDEX idx_status (status);

ALTER TABLE mindwave_spans ADD INDEX idx_trace_id (trace_id);
ALTER TABLE mindwave_spans ADD INDEX idx_provider (provider_name);
ALTER TABLE mindwave_spans ADD INDEX idx_operation (operation_name);

-- Composite indexes for common queries
ALTER TABLE mindwave_traces ADD INDEX idx_cost_created (estimated_cost, created_at);
ALTER TABLE mindwave_spans ADD INDEX idx_provider_model (provider_name, request_model);
```

**2. Use Query Optimization**

```php
// Instead of loading all relations
// BAD:
$traces = Trace::with('spans')->get();

// GOOD: Only load what you need
$traces = Trace::select(['trace_id', 'estimated_cost', 'created_at'])
    ->where('created_at', '>', now()->subDay())
    ->orderByDesc('estimated_cost')
    ->limit(100)
    ->get();
```

**3. Implement Pagination**

```php
// Don't load all traces at once
$traces = Trace::orderByDesc('created_at')
    ->paginate(50);  // Load 50 at a time

// In Livewire/Blade
{{ $traces->links() }}
```

**4. Use Aggregation Queries**

```php
// For dashboards, aggregate in database
$stats = Trace::selectRaw('
    DATE(created_at) as date,
    COUNT(*) as total_traces,
    SUM(estimated_cost) as total_cost,
    AVG(estimated_cost) as avg_cost
')
->where('created_at', '>', now()->subWeek())
->groupBy('date')
->get();
```

**5. Enable Query Caching**

```php
use Illuminate\Support\Facades\Cache;

// Cache expensive queries
$expensiveTraces = Cache::remember('expensive_traces', 300, function () {
    return Trace::expensive(0.10)
        ->with('spans')
        ->orderByDesc('estimated_cost')
        ->limit(100)
        ->get();
});
```

**6. Prune Old Data Regularly**

```bash
# Schedule in app/Console/Kernel.php
$schedule->command('mindwave:prune-traces --older-than=30days')->daily();

# Keeps database size manageable
```

---

## Production Issues

### Issue: Intermittent Failures

**Symptoms:**
```php
// LLM calls succeed sometimes, fail other times
// No consistent error pattern
```

**Diagnosis:**

```bash
# 1. Check application logs
tail -f storage/logs/laravel.log

# 2. Query failed traces
php artisan tinker
>>> use Mindwave\Mindwave\Observability\Models\Trace;
>>> Trace::where('status', 'error')->latest()->limit(10)->get()

# 3. Check for patterns
>>> Span::whereNotNull('status_description')
>>>     ->groupBy('status_description')
>>>     ->selectRaw('status_description, COUNT(*) as count')
>>>     ->orderByDesc('count')
>>>     ->get()
```

**Solutions:**

**1. Implement Retry Logic with Exponential Backoff**

```php
use Illuminate\Support\Facades\Log;

function callLLMWithRetry($prompt, $maxRetries = 3) {
    $attempt = 0;
    $delay = 1; // Start with 1 second

    while ($attempt < $maxRetries) {
        try {
            return Mindwave::llm()->generateText($prompt);
        } catch (\Exception $e) {
            $attempt++;

            if ($attempt >= $maxRetries) {
                throw $e;
            }

            Log::warning("LLM call failed, retry {$attempt}/{$maxRetries}", [
                'error' => $e->getMessage(),
            ]);

            sleep($delay);
            $delay *= 2; // Exponential backoff
        }
    }
}
```

**2. Implement Circuit Breaker Pattern**

```php
use Illuminate\Support\Facades\Cache;

class LLMCircuitBreaker
{
    private string $key = 'llm_circuit_breaker';
    private int $failureThreshold = 5;
    private int $timeout = 60; // seconds

    public function call(callable $callback)
    {
        if ($this->isOpen()) {
            throw new \RuntimeException('Circuit breaker is open, LLM calls suspended');
        }

        try {
            $result = $callback();
            $this->recordSuccess();
            return $result;
        } catch (\Exception $e) {
            $this->recordFailure();
            throw $e;
        }
    }

    private function isOpen(): bool
    {
        $failures = Cache::get("{$this->key}:failures", 0);
        return $failures >= $this->failureThreshold;
    }

    private function recordFailure(): void
    {
        $failures = Cache::get("{$this->key}:failures", 0);
        Cache::put("{$this->key}:failures", $failures + 1, $this->timeout);
    }

    private function recordSuccess(): void
    {
        Cache::forget("{$this->key}:failures");
    }
}

// Usage
$breaker = new LLMCircuitBreaker();
$response = $breaker->call(fn() => Mindwave::llm()->generateText($prompt));
```

**3. Add Health Checks**

```php
// routes/web.php or api.php
Route::get('/health/llm', function () {
    try {
        $start = microtime(true);
        $response = Mindwave::llm()->generateText('Hello');
        $duration = (microtime(true) - $start) * 1000;

        return response()->json([
            'status' => 'healthy',
            'duration_ms' => round($duration, 2),
            'timestamp' => now()->toIso8601String(),
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'unhealthy',
            'error' => $e->getMessage(),
            'timestamp' => now()->toIso8601String(),
        ], 503);
    }
});
```

**4. Monitor Provider Status**

```php
// Set up alerts for provider outages
// Check status pages:
// - OpenAI: https://status.openai.com/
// - Anthropic: https://status.anthropic.com/
// - Mistral: Check their status page

// Implement fallback to different provider
try {
    return Mindwave::llm('openai')->generateText($prompt);
} catch (\Exception $e) {
    Log::warning('OpenAI failed, falling back to Mistral');
    return Mindwave::llm('mistral')->generateText($prompt);
}
```

---

### Issue: Cost Overruns

**Symptoms:**
```php
// Monthly LLM costs higher than expected
// Budget exceeded
```

**Diagnosis:**

```bash
# 1. Analyze costs by time period
php artisan tinker
>>> use Mindwave\Mindwave\Observability\Models\Trace;
>>> Trace::selectRaw('DATE(created_at) as date, SUM(estimated_cost) as daily_cost')
>>>     ->groupBy('date')
>>>     ->orderByDesc('date')
>>>     ->limit(30)
>>>     ->get()

# 2. Find most expensive operations
>>> Trace::orderByDesc('estimated_cost')->limit(10)->get()

# 3. Analyze by model
>>> Span::selectRaw('request_model, COUNT(*) as calls, SUM(cost_usd) as total_cost')
>>>     ->groupBy('request_model')
>>>     ->orderByDesc('total_cost')
>>>     ->get()
```

**Solutions:**

**1. Set Cost Budgets**

```php
use Illuminate\Support\Facades\Cache;

class LLMCostMonitor
{
    public function checkBudget(float $dailyLimit = 10.00): void
    {
        $today = now()->format('Y-m-d');
        $spent = Cache::remember("llm_cost:{$today}", 3600, function () use ($today) {
            return Trace::whereDate('created_at', $today)
                ->sum('estimated_cost');
        });

        if ($spent >= $dailyLimit) {
            throw new \RuntimeException(
                "Daily LLM budget of \${$dailyLimit} exceeded (spent: \${$spent})"
            );
        }
    }
}

// Before expensive operations
$monitor = new LLMCostMonitor();
$monitor->checkBudget(10.00);  // $10/day limit
```

**2. Use Cheaper Models**

```php
// Analyze which operations can use cheaper models
// GPT-4 → GPT-3.5 Turbo (saves ~95%)
// Claude Opus → Claude Haiku (saves ~98%)

// High-value operations: Use GPT-4
Mindwave::llm()->model('gpt-4-turbo')->generateText($criticalPrompt);

// Routine operations: Use GPT-3.5
Mindwave::llm()->model('gpt-3.5-turbo')->generateText($routinePrompt);
```

**3. Implement Caching Aggressively**

```php
use Illuminate\Support\Facades\Cache;

function getCachedLLMResponse(string $prompt, int $ttl = 3600): string
{
    $cacheKey = 'llm:' . hash('sha256', $prompt);

    return Cache::remember($cacheKey, $ttl, function () use ($prompt) {
        return Mindwave::llm()->generateText($prompt);
    });
}

// Cache common queries for 1 hour
$response = getCachedLLMResponse($userQuestion, 3600);
```

**4. Optimize Prompts for Token Efficiency**

```php
// Reduce system prompts
// BAD: 500 tokens of instructions
$system = "You are a helpful assistant. You should always be polite...";

// GOOD: 50 tokens, same effect
$system = "Answer concisely and accurately.";

// Use PromptComposer to limit output
Mindwave::prompt()
    ->reserveOutputTokens(200)  // Shorter responses = lower cost
    ->section('user', $question)
    ->run();
```

**5. Export and Analyze Cost Reports**

```bash
# Generate monthly cost report
php artisan mindwave:export-traces \
    --since="first day of last month" \
    --until="last day of last month" \
    --format=csv \
    --output=costs-$(date +%Y-%m).csv

# Analyze in Excel/Numbers to find optimization opportunities
```

**6. Set Up Cost Alerts**

```php
// In scheduler (app/Console/Kernel.php)
$schedule->call(function () {
    $today = now()->format('Y-m-d');
    $spent = Trace::whereDate('created_at', $today)
        ->sum('estimated_cost');

    if ($spent > 50.00) {  // Alert threshold
        Mail::to('admin@example.com')->send(
            new CostAlertMail($spent)
        );
    }
})->hourly();
```

---

### Issue: Queue Jobs Failing

**Symptoms:**
```bash
# Queue workers show errors
# Jobs stuck in "failed_jobs" table
```

**Solutions:**

**1. Increase Job Timeout**

```php
// In job class
class ProcessLLMRequest implements ShouldQueue
{
    public $timeout = 300; // 5 minutes (default: 60)

    // Or retry with increasing timeout
    public $backoff = [60, 120, 300];  // Seconds between retries
}
```

**2. Configure Worker Settings**

```bash
# Increase worker timeout
php artisan queue:work --timeout=300

# Increase memory limit
php artisan queue:work --memory=256

# Supervisor config (production)
[program:laravel-worker]
command=php /path/to/artisan queue:work --sleep=3 --tries=3 --max-time=3600 --timeout=300
```

**3. Handle LLM Failures Gracefully**

```php
class ProcessLLMRequest implements ShouldQueue
{
    public $tries = 3;

    public function handle()
    {
        try {
            $response = Mindwave::llm()->generateText($this->prompt);
            // Process response...
        } catch (\Exception $e) {
            // Log but don't fail job for rate limits
            if (str_contains($e->getMessage(), 'rate limit')) {
                $this->release(60); // Retry in 60 seconds
                return;
            }

            throw $e; // Fail job for other errors
        }
    }

    public function failed(\Throwable $exception)
    {
        // Notify user or admin
        Log::error('LLM job failed', [
            'prompt' => $this->prompt,
            'error' => $exception->getMessage(),
        ]);
    }
}
```

**4. Monitor Queue Health**

```bash
# Check failed jobs
php artisan queue:failed

# Retry failed jobs
php artisan queue:retry all

# Clear old failed jobs
php artisan queue:flush
```

---

## Error Messages Reference

Quick reference for common error messages and their solutions:

| Error Message | Likely Cause | Quick Fix |
|---------------|--------------|-----------|
| `Unauthenticated` | Invalid/missing API key | Check `MINDWAVE_OPENAI_API_KEY` in `.env` |
| `Model not found` | Invalid model name | Use correct model name (e.g., `gpt-4-turbo`) |
| `Rate limit exceeded` | Too many requests | Implement retry logic, upgrade tier |
| `Context length exceeded` | Prompt too long | Use PromptComposer with `fit()` |
| `Connection timeout` | Network/timeout issue | Increase timeout, check network |
| `API key is required` | Missing config | Run `php artisan config:clear` |
| `Index file not found` | TNTSearch storage missing | Create `storage/mindwave/tnt-indexes` |
| `SQLSTATE[HY000] [1045]` | Database connection failed | Check database credentials in `.env` |
| `Could not create Class` | Vector store connection | Verify vector store is running |
| `Maximum context length` | Token limit exceeded | Reduce prompt size or use larger model |
| `Invalid Request Exception` | Malformed API request | Check prompt format, model parameters |
| `502 Bad Gateway` | Provider outage | Check provider status page, retry later |
| `Memory limit exhausted` | PHP memory too low | Increase `memory_limit` in php.ini |
| `Class not found` | Autoload issue | Run `composer dump-autoload` |
| `Cannot modify header` | Headers already sent | Check for output before streaming |

---

## Debugging Tools

### Laravel Telescope

Install Telescope for advanced debugging:

```bash
composer require laravel/telescope --dev
php artisan telescope:install
php artisan migrate
```

**View in browser:** `http://localhost:8000/telescope`

**Useful features:**
- HTTP requests and responses
- Database queries (slow query detection)
- Queue jobs monitoring
- Exception tracking
- Log entries

### Clockwork

Browser extension for Laravel debugging:

```bash
composer require itsgoingd/clockwork --dev
```

**Features:**
- Request timeline
- Database queries
- Events fired
- Memory usage
- Routes called

### Log Files

```bash
# Watch Laravel logs in real-time
tail -f storage/logs/laravel.log

# Filter for Mindwave-specific logs
tail -f storage/logs/laravel.log | grep -i mindwave

# Filter for errors only
tail -f storage/logs/laravel.log | grep ERROR

# View last 100 lines
tail -n 100 storage/logs/laravel.log
```

### Artisan Commands for Debugging

```bash
# View all Mindwave commands
php artisan list mindwave

# Trace statistics
php artisan mindwave:trace-stats

# Export recent traces
php artisan mindwave:export-traces --since=yesterday --format=json

# Index statistics
php artisan mindwave:index-stats

# Check configuration
php artisan tinker
>>> config('mindwave-llm')
>>> config('mindwave-tracing')
```

### Database Queries

```php
// In tinker (php artisan tinker)
use Mindwave\Mindwave\Observability\Models\Trace;
use Mindwave\Mindwave\Observability\Models\Span;

// Recent traces
Trace::latest()->limit(10)->get()

// Expensive traces
Trace::expensive(0.10)->get()

// Slow traces
Trace::slow(5000)->get()  // >5 seconds

// Failed traces
Trace::where('status', 'error')->get()

// Traces by date
Trace::whereDate('created_at', today())->get()

// Spans with errors
Span::whereNotNull('status_description')->get()

// Cost by provider
Span::selectRaw('provider_name, SUM(cost_usd) as total')
    ->groupBy('provider_name')
    ->get()
```

### Debug Mode

```bash
# Enable debug mode in .env
APP_DEBUG=true
LOG_LEVEL=debug

# WARNING: Never enable in production!
```

### Query Logging

```php
// Enable query logging
DB::enableQueryLog();

// Perform operations
$response = Mindwave::llm()->generateText('Hello');

// View queries
dd(DB::getQueryLog());
```

---

## Getting Help

### Before Asking for Help

1. **Search this guide** - Use Ctrl/Cmd+F to find your error message
2. **Check logs** - Look at `storage/logs/laravel.log` for errors
3. **Review traces** - Query the `mindwave_traces` and `mindwave_spans` tables
4. **Check provider status** - Visit OpenAI/Anthropic/Mistral status pages
5. **Try the solution** - Follow troubleshooting steps in this guide

### Where to Get Help

**1. GitHub Issues**

Best for bug reports and feature requests:
- **URL:** https://github.com/mindwave/mindwave/issues
- **Before posting:** Search existing issues
- **Include:** Error messages, stack traces, config files (redact API keys!)

**2. Documentation**

Search official docs first:
- **URL:** https://mindwave.no/docs
- **Covers:** Installation, configuration, API reference, examples

**3. Stack Overflow**

For general Laravel and PHP questions:
- **Tag:** `mindwave` `laravel` `php`
- **Search first:** Your question may already be answered

**4. Discord/Community Forums**

For discussions and quick questions:
- Join the Mindwave community Discord
- Active community members can help

### How to Write a Good Bug Report

**Include these details:**

```markdown
## Environment
- Mindwave version: 1.0.0
- Laravel version: 11.x
- PHP version: 8.3
- Database: MySQL 8.0
- OS: Ubuntu 22.04

## Expected Behavior
What you expected to happen...

## Actual Behavior
What actually happened...

## Steps to Reproduce
1. Install Mindwave
2. Configure OpenAI API key
3. Call Mindwave::llm()->generateText('Hello')
4. Observe error...

## Error Message
```
Full error message and stack trace here...
```

## Configuration (redact API keys!)
```php
// config/mindwave-llm.php
'default' => 'openai',
'llms' => [
    'openai' => [
        'api_key' => 'sk-...xxx', // Redacted
        'model' => 'gpt-4-turbo',
    ],
],
```

## Code Sample
```php
// Minimal reproducible example
$response = Mindwave::llm()->generateText('Hello');
```

## Additional Context
Any other relevant information...
```

### What NOT to Include

- **API Keys** - Redact all sensitive credentials
- **Personal data** - Remove user emails, names, etc.
- **Entire log files** - Just include relevant error sections
- **Unrelated code** - Provide minimal reproducible examples

---

## Summary

This troubleshooting guide covers the most common issues you'll encounter with Mindwave:

- **Installation & Setup** - Composer, migrations, configuration
- **LLM Integration** - API keys, models, timeouts, rate limits, context windows
- **PromptComposer** - Auto-fitting, priorities, shrinkers, token management
- **Streaming** - SSE setup, buffering, connection handling
- **Context Discovery** - TNTSearch indexes, vector stores, search optimization
- **Tracing** - Database storage, OTLP export, memory usage, cost tracking
- **Performance** - Speed optimization, memory management, database queries
- **Production** - Intermittent failures, cost control, queue jobs

**Remember:**
1. Check logs first
2. Verify configuration
3. Test with simple examples
4. Search existing issues
5. Ask for help with complete information

**Still stuck?** File an issue on GitHub with a detailed bug report.

Happy debugging!
