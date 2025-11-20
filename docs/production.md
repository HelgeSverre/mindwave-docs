# Production Deployment Guide

Comprehensive guide for deploying Mindwave-powered Laravel applications to production with security, performance, and reliability best practices.

## Overview

Deploying AI-powered applications requires careful attention to:

-   **Security** - Protecting API keys and sensitive data
-   **Performance** - Optimizing for LLM latency and throughput
-   **Cost Control** - Managing LLM API expenses
-   **Observability** - Monitoring AI operations and debugging issues
-   **Reliability** - Ensuring uptime with proper failover strategies

This guide covers everything from pre-deployment checklists to platform-specific deployment patterns.

### What's Different from Development

Production deployments of Mindwave applications require:

-   **API key management** - Secure storage using secrets managers
-   **Caching layers** - Redis for embeddings, responses, and session data
-   **Queue workers** - Background processing for async LLM calls
-   **Observability** - OpenTelemetry exporters to monitoring platforms
-   **Rate limiting** - Protecting against API quota exhaustion
-   **Database optimization** - Indexes and partitioning for trace tables
-   **Web server tuning** - SSE streaming configuration
-   **Cost monitoring** - Tracking and alerting on LLM spend

### Prerequisites

Before deploying, ensure you have:

-   [ ] Laravel 11.0+ application with Mindwave installed
-   [ ] Production server or hosting platform account
-   [ ] LLM provider API keys (OpenAI, Anthropic, Mistral)
-   [ ] Redis server for caching and queues
-   [ ] Database server (PostgreSQL, MySQL, SQLite)
-   [ ] SSL certificate for HTTPS
-   [ ] Domain name configured
-   [ ] Backup strategy in place

---

## Pre-Deployment Checklist

Use this comprehensive checklist to ensure production readiness.

### Security

-   [ ] API keys stored in secure vault (AWS Secrets Manager, HashiCorp Vault, 1Password)
-   [ ] Environment variables not committed to version control
-   [ ] `.env.production` file secured with proper permissions (600)
-   [ ] SSL/TLS enabled for all endpoints
-   [ ] CORS configured for allowed origins only
-   [ ] Rate limiting enabled on all public endpoints
-   [ ] Input validation implemented for user-submitted prompts
-   [ ] PII redaction configured in tracing (`capture_messages=false`)
-   [ ] Database credentials rotated and secured
-   [ ] Firewall rules configured (allow only necessary ports)

### Performance

-   [ ] Redis configured for caching and queues
-   [ ] OPcache enabled for PHP
-   [ ] Config cached (`php artisan config:cache`)
-   [ ] Routes cached (`php artisan route:cache`)
-   [ ] Views cached (`php artisan view:cache`)
-   [ ] Database indexes created for trace tables
-   [ ] Database connection pooling configured
-   [ ] CDN configured for static assets
-   [ ] Nginx/Apache tuned for SSE streaming
-   [ ] Queue workers configured with Supervisor

### Cost Control

-   [ ] LLM cost estimation enabled in tracing config
-   [ ] Cost alerts configured (email/Slack when threshold exceeded)
-   [ ] Caching strategy implemented to reduce API calls
-   [ ] Model selection optimized (use cheaper models when appropriate)
-   [ ] Rate limiting prevents runaway costs
-   [ ] Daily/monthly budget limits enforced
-   [ ] Cost monitoring dashboard created

### Observability

-   [ ] OpenTelemetry database storage enabled
-   [ ] OTLP exporter configured (Jaeger, Honeycomb, Grafana Tempo)
-   [ ] Application logs aggregated (Papertrail, LogDNA, CloudWatch)
-   [ ] Error tracking enabled (Sentry, Bugsnag, Flare)
-   [ ] Health check endpoint implemented
-   [ ] Uptime monitoring configured (UptimeRobot, Pingdom)
-   [ ] Performance metrics dashboards created
-   [ ] Alert rules configured for errors and latency

### Data Management

-   [ ] Database migrations tested in staging
-   [ ] Backup automation configured (daily minimum)
-   [ ] Backup restoration tested
-   [ ] Trace retention policy configured (30 days default)
-   [ ] Automated trace pruning scheduled
-   [ ] Vector store backups configured (if using)
-   [ ] TNTSearch index cleanup scheduled

### Infrastructure

-   [ ] Production database provisioned
-   [ ] Redis server provisioned
-   [ ] Web server configured (Nginx/Apache)
-   [ ] Queue workers running (Supervisor/systemd)
-   [ ] Cron jobs scheduled (trace pruning, backups)
-   [ ] Load balancer configured (if using multiple servers)
-   [ ] Auto-scaling configured (if using cloud platform)
-   [ ] Disaster recovery plan documented

---

## Environment Configuration

### Production .env Template

Create a production-ready `.env` file with all required variables:

```bash
# Application
APP_NAME="Your App"
APP_ENV=production
APP_KEY=base64:YOUR_APP_KEY
APP_DEBUG=false
APP_URL=https://yourdomain.com

# Database
DB_CONNECTION=pgsql
DB_HOST=db.example.com
DB_PORT=5432
DB_DATABASE=your_database
DB_USERNAME=your_user
DB_PASSWORD=your_secure_password

# Redis (Caching & Queues)
REDIS_HOST=redis.example.com
REDIS_PASSWORD=your_redis_password
REDIS_PORT=6379
CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis

# ============================================
# MINDWAVE - LLM CONFIGURATION
# ============================================

# Default LLM Provider
MINDWAVE_LLM=openai

# OpenAI
MINDWAVE_OPENAI_API_KEY=sk-proj-XXXXXXXXXXXX
MINDWAVE_OPENAI_ORG_ID=org-XXXXXXXXXXXX
MINDWAVE_OPENAI_MODEL=gpt-4-turbo
MINDWAVE_OPENAI_MAX_TOKENS=1000
MINDWAVE_OPENAI_TEMPERATURE=0.7

# Anthropic Claude
MINDWAVE_ANTHROPIC_API_KEY=sk-ant-XXXXXXXXXXXX
MINDWAVE_ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
MINDWAVE_ANTHROPIC_MAX_TOKENS=4096
MINDWAVE_ANTHROPIC_TEMPERATURE=1.0

# Mistral AI
MINDWAVE_MISTRAL_API_KEY=XXXXXXXXXXXX
MINDWAVE_MISTRAL_MODEL=mistral-large-latest
MINDWAVE_MISTRAL_MAX_TOKENS=1000
MINDWAVE_MISTRAL_TEMPERATURE=0.4

# ============================================
# MINDWAVE - TRACING & OBSERVABILITY
# ============================================

# Tracing
MINDWAVE_TRACING_ENABLED=true
MINDWAVE_SERVICE_NAME="YourApp Production"

# Database Storage
MINDWAVE_TRACE_DATABASE=true
MINDWAVE_TRACE_DB_CONNECTION=pgsql

# OTLP Export (Jaeger, Honeycomb, Grafana)
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=YOUR_API_KEY"

# Sampling (1.0 = 100%, 0.1 = 10%)
MINDWAVE_TRACE_SAMPLER=traceidratio
MINDWAVE_TRACE_SAMPLE_RATIO=1.0

# Privacy & Security
MINDWAVE_TRACE_CAPTURE_MESSAGES=false  # IMPORTANT: Keep false in production
MINDWAVE_TRACE_RETENTION_DAYS=30

# Cost Estimation
MINDWAVE_COST_ESTIMATION_ENABLED=true

# ============================================
# MINDWAVE - EMBEDDINGS & VECTOR STORES
# ============================================

# Embeddings Provider
MINDWAVE_EMBEDDINGS=openai

# Qdrant Vector Store
MINDWAVE_VECTORSTORE=qdrant
MINDWAVE_QDRANT_HOST=qdrant.example.com
MINDWAVE_QDRANT_PORT=6333
MINDWAVE_QDRANT_API_KEY=your_qdrant_key
MINDWAVE_QDRANT_COLLECTION=production_vectors

# Pinecone Vector Store (Alternative)
# MINDWAVE_VECTORSTORE=pinecone
# MINDWAVE_PINECONE_API_KEY=your_pinecone_key
# MINDWAVE_PINECONE_ENVIRONMENT=us-east1-gcp
# MINDWAVE_PINECONE_INDEX=production-index

# Weaviate Vector Store (Alternative)
# MINDWAVE_VECTORSTORE=weaviate
# MINDWAVE_WEAVIATE_URL=https://weaviate.example.com/v1
# MINDWAVE_WEAVIATE_API_TOKEN=your_weaviate_token
# MINDWAVE_WEAVIATE_INDEX=production_items

# ============================================
# MINDWAVE - CONTEXT DISCOVERY
# ============================================

# TNTSearch Configuration
MINDWAVE_TNT_INDEX_TTL=24  # Hours
MINDWAVE_TNT_MAX_INDEX_SIZE=100  # MB
MINDWAVE_CONTEXT_TRACING=true

# ============================================
# ERROR TRACKING & MONITORING
# ============================================

# Sentry
SENTRY_LARAVEL_DSN=https://xxx@sentry.io/xxx
SENTRY_TRACES_SAMPLE_RATE=0.1

# Log Channels
LOG_CHANNEL=stack
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=error  # production: error, staging: debug

# ============================================
# MAIL & NOTIFICATIONS
# ============================================

MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your_username
MAIL_PASSWORD=your_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@yourdomain.com"
MAIL_FROM_NAME="${APP_NAME}"

# ============================================
# SESSION & SECURITY
# ============================================

SESSION_LIFETIME=120
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
```

### Security Best Practices for .env

```bash
# Set strict permissions
chmod 600 .env

# Never commit to version control
echo ".env" >> .gitignore

# Use different keys per environment
# Generate new APP_KEY for production:
php artisan key:generate --show

# Rotate API keys regularly (quarterly minimum)
# Document key rotation procedures in runbook
```

### Config Caching

After deploying, cache configuration for performance:

```bash
# Cache all config files
php artisan config:cache

# Cache routes
php artisan route:cache

# Cache views
php artisan view:cache

# Optimize autoloader
composer install --optimize-autoloader --no-dev

# IMPORTANT: Re-cache after any config changes
php artisan config:clear && php artisan config:cache
```

---

## Database Optimization

### Run Migrations

```bash
# Test migrations in staging first
php artisan migrate --pretend

# Run in production
php artisan migrate --force

# Verify tables created
php artisan db:show
```

### Create Database Indexes

Add indexes for common trace queries:

```sql
-- PostgreSQL indexes for traces table
CREATE INDEX idx_traces_created_at ON mindwave_traces(created_at DESC);
CREATE INDEX idx_traces_estimated_cost ON mindwave_traces(estimated_cost DESC);
CREATE INDEX idx_traces_status ON mindwave_traces(status_code);
CREATE INDEX idx_traces_service ON mindwave_traces(service_name);

-- Composite index for cost queries
CREATE INDEX idx_traces_cost_date ON mindwave_traces(created_at DESC, estimated_cost DESC);

-- Indexes for spans table
CREATE INDEX idx_spans_trace_id ON mindwave_spans(trace_id);
CREATE INDEX idx_spans_operation ON mindwave_spans(operation_name);
CREATE INDEX idx_spans_duration ON mindwave_spans(duration DESC);
CREATE INDEX idx_spans_cost ON mindwave_spans(cost_usd DESC);

-- Composite index for LLM span queries
CREATE INDEX idx_spans_llm_lookup ON mindwave_spans(operation_name, trace_id, created_at DESC);
```

**MySQL Equivalents:**

```sql
-- MySQL indexes
ALTER TABLE mindwave_traces ADD INDEX idx_traces_created_at (created_at DESC);
ALTER TABLE mindwave_traces ADD INDEX idx_traces_estimated_cost (estimated_cost DESC);
ALTER TABLE mindwave_traces ADD INDEX idx_traces_status (status_code);
ALTER TABLE mindwave_traces ADD INDEX idx_traces_cost_date (created_at DESC, estimated_cost DESC);

ALTER TABLE mindwave_spans ADD INDEX idx_spans_trace_id (trace_id);
ALTER TABLE mindwave_spans ADD INDEX idx_spans_operation (operation_name);
ALTER TABLE mindwave_spans ADD INDEX idx_spans_duration (duration DESC);
ALTER TABLE mindwave_spans ADD INDEX idx_spans_llm_lookup (operation_name, trace_id, created_at DESC);
```

### Connection Pooling

**For PostgreSQL (pgBouncer):**

```ini
# /etc/pgbouncer/pgbouncer.ini
[databases]
your_database = host=localhost port=5432 dbname=your_database

[pgbouncer]
pool_mode = transaction
max_client_conn = 100
default_pool_size = 25
reserve_pool_size = 5
reserve_pool_timeout = 3
```

**Laravel Database Config:**

```php
// config/database.php
'pgsql' => [
    'driver' => 'pgsql',
    'host' => env('DB_HOST', '127.0.0.1'),
    'port' => env('DB_PORT', '6432'), // pgBouncer port
    'database' => env('DB_DATABASE', 'forge'),
    'username' => env('DB_USERNAME', 'forge'),
    'password' => env('DB_PASSWORD', ''),
    'charset' => 'utf8',
    'prefix' => '',
    'prefix_indexes' => true,
    'search_path' => 'public',
    'sslmode' => 'prefer',

    // Connection pooling
    'options' => [
        PDO::ATTR_PERSISTENT => true,
    ],
],
```

### Query Optimization

```php
// Use eager loading for trace queries
$traces = Trace::with(['spans' => fn($q) => $q->orderBy('start_time')])
    ->where('created_at', '>', now()->subWeek())
    ->orderByDesc('estimated_cost')
    ->limit(100)
    ->get();

// Use database aggregations for cost summaries
$dailyCosts = Trace::query()
    ->selectRaw('DATE(created_at) as date, SUM(estimated_cost) as total_cost')
    ->where('created_at', '>', now()->subMonth())
    ->groupBy('date')
    ->orderByDesc('date')
    ->get();
```

### Trace Table Partitioning (High Volume)

For applications with millions of traces, consider partitioning:

```sql
-- PostgreSQL partitioning by month
CREATE TABLE mindwave_traces_2025_01 PARTITION OF mindwave_traces
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE mindwave_traces_2025_02 PARTITION OF mindwave_traces
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Automate partition creation
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
    partition_date DATE := DATE_TRUNC('month', CURRENT_DATE);
    next_month DATE := partition_date + INTERVAL '1 month';
    partition_name TEXT := 'mindwave_traces_' || TO_CHAR(partition_date, 'YYYY_MM');
BEGIN
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF mindwave_traces FOR VALUES FROM (%L) TO (%L)',
        partition_name, partition_date, next_month);
END;
$$ LANGUAGE plpgsql;

-- Schedule via pg_cron or application scheduler
SELECT cron.schedule('create-partition', '0 0 1 * *', 'SELECT create_monthly_partition()');
```

---

## Queue Configuration

Mindwave operations can be queued for background processing. Proper queue configuration is critical for production.

### Supervisor Configuration

**Install Supervisor:**

```bash
# Ubuntu/Debian
sudo apt-get install supervisor

# CentOS/RHEL
sudo yum install supervisor
```

**Create Worker Config:**

```ini
# /etc/supervisor/conf.d/mindwave-worker.conf
[program:mindwave-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/your-app/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600 --timeout=300
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=4
redirect_stderr=true
stdout_logfile=/var/www/your-app/storage/logs/worker.log
stopwaitsecs=3600
```

**Start Workers:**

```bash
# Reload Supervisor config
sudo supervisorctl reread
sudo supervisorctl update

# Start workers
sudo supervisorctl start mindwave-worker:*

# Check status
sudo supervisorctl status

# View logs
sudo supervisorctl tail -f mindwave-worker:mindwave-worker_00 stdout
```

### Queue Priorities

Configure multiple queues for different priorities:

```php
// config/queue.php
'connections' => [
    'redis' => [
        'driver' => 'redis',
        'connection' => 'default',
        'queue' => env('REDIS_QUEUE', 'default'),
        'retry_after' => 300,
        'block_for' => null,
        'after_commit' => false,
    ],
],
```

**Supervisor Config with Priorities:**

```ini
# High priority worker (user-facing requests)
[program:mindwave-high]
command=php /var/www/your-app/artisan queue:work redis --queue=high --sleep=1 --tries=3
numprocs=4

# Default priority worker
[program:mindwave-default]
command=php /var/www/your-app/artisan queue:work redis --queue=default --sleep=3 --tries=3
numprocs=2

# Low priority worker (batch processing)
[program:mindwave-low]
command=php /var/www/your-app/artisan queue:work redis --queue=low --sleep=5 --tries=3
numprocs=1
```

**Dispatch to Specific Queues:**

```php
// High priority (user-facing)
ProcessUserPrompt::dispatch($user, $prompt)->onQueue('high');

// Low priority (batch analysis)
AnalyzeDocuments::dispatch($documents)->onQueue('low');
```

### Worker Scaling

**Horizontal Scaling (Multiple Servers):**

```bash
# Server 1: High priority
php artisan queue:work redis --queue=high --tries=3

# Server 2: Default priority
php artisan queue:work redis --queue=default --tries=3

# Server 3: Low priority + batch
php artisan queue:work redis --queue=low,batch --tries=3
```

**Auto-Scaling Based on Queue Depth:**

```bash
# Monitor queue size
php artisan queue:monitor redis:high,redis:default --max=100

# Scale workers based on queue length (pseudo-code)
QUEUE_SIZE=$(redis-cli LLEN "queues:default")
if [ $QUEUE_SIZE -gt 100 ]; then
    # Scale up to 8 workers
    supervisorctl scale mindwave-worker 8
elif [ $QUEUE_SIZE -lt 20 ]; then
    # Scale down to 2 workers
    supervisorctl scale mindwave-worker 2
fi
```

### Failed Job Handling

```bash
# List failed jobs
php artisan queue:failed

# Retry specific job
php artisan queue:retry {id}

# Retry all failed jobs
php artisan queue:retry all

# Flush failed jobs
php artisan queue:flush
```

**Monitor Failed Jobs:**

```php
// app/Console/Kernel.php
protected function schedule(Schedule $schedule)
{
    // Alert on failed jobs
    $schedule->call(function () {
        $failedCount = DB::table('failed_jobs')->count();
        if ($failedCount > 10) {
            Notification::route('mail', 'admin@example.com')
                ->notify(new FailedJobsAlert($failedCount));
        }
    })->hourly();
}
```

### Redis vs Database Queues

**Redis (Recommended):**

**Pros:**

-   Fast in-memory operations
-   Low latency for job dispatch/retrieval
-   Handles high throughput

**Cons:**

-   Jobs lost if Redis crashes (use persistence)
-   Requires additional infrastructure

```bash
# Redis persistence in redis.conf
appendonly yes
appendfsync everysec
save 900 1
save 300 10
save 60 10000
```

**Database Queues:**

**Pros:**

-   No additional infrastructure
-   Jobs persisted by default
-   Suitable for low-volume queues

**Cons:**

-   Higher latency
-   Database load increases

```php
// Use database for critical, low-volume jobs
'connections' => [
    'database-critical' => [
        'driver' => 'database',
        'table' => 'jobs',
        'queue' => 'critical',
        'retry_after' => 300,
    ],
],
```

---

## Caching Strategy

Aggressive caching is essential to reduce LLM API costs and improve performance.

### Redis Setup

**Install Redis:**

```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf

# Production settings:
maxmemory 2gb
maxmemory-policy allkeys-lru
appendonly yes
appendfsync everysec

# Restart Redis
sudo systemctl restart redis
```

**Laravel Cache Config:**

```php
// config/cache.php
'default' => env('CACHE_DRIVER', 'redis'),

'stores' => [
    'redis' => [
        'driver' => 'redis',
        'connection' => 'cache',
        'lock_connection' => 'default',
    ],
],

// config/database.php
'redis' => [
    'cache' => [
        'url' => env('REDIS_URL'),
        'host' => env('REDIS_HOST', '127.0.0.1'),
        'password' => env('REDIS_PASSWORD'),
        'port' => env('REDIS_PORT', '6379'),
        'database' => 1,  // Separate DB for cache
    ],
],
```

### What to Cache

**1. LLM Responses:**

```php
use Illuminate\Support\Facades\Cache;
use Mindwave\Mindwave\Facades\Mindwave;

// Cache LLM responses (1 hour TTL)
$cacheKey = 'llm:' . md5($userPrompt);
$response = Cache::remember($cacheKey, 3600, function () use ($userPrompt) {
    return Mindwave::llm()->generateText($userPrompt);
});
```

**2. Embeddings:**

```php
// Cache embeddings (24 hours)
$embedding = Cache::remember('embedding:' . md5($text), 86400, function () use ($text) {
    return Mindwave::embeddings()->create($text);
});
```

**3. Context Discovery Results:**

```php
// Cache TNTSearch results (1 hour)
$results = Cache::remember('search:' . md5($query), 3600, function () use ($query) {
    return TntSearchSource::fromEloquent(Product::query(), fn($p) => $p->description)
        ->search($query)
        ->take(10)
        ->get();
});
```

**4. Prompt Templates:**

```php
// Cache compiled prompts (indefinite, clear on template update)
$prompt = Cache::rememberForever('prompt:template:' . $templateId, function () use ($templateId) {
    return PromptTemplate::find($templateId)->compile();
});
```

### Cache Warming

Pre-populate cache with common queries:

```php
// app/Console/Commands/WarmCache.php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class WarmCache extends Command
{
    protected $signature = 'cache:warm';
    protected $description = 'Pre-populate cache with common queries';

    public function handle()
    {
        $this->info('Warming cache...');

        // Warm common LLM prompts
        $commonQueries = [
            'What are your business hours?',
            'How do I reset my password?',
            'What is your return policy?',
        ];

        foreach ($commonQueries as $query) {
            $cacheKey = 'llm:' . md5($query);
            if (!Cache::has($cacheKey)) {
                $response = Mindwave::llm()->generateText($query);
                Cache::put($cacheKey, $response, 86400);
                $this->info("Cached: {$query}");
            }
        }

        $this->info('Cache warming complete!');
    }
}
```

**Schedule Cache Warming:**

```php
// app/Console/Kernel.php
protected function schedule(Schedule $schedule)
{
    $schedule->command('cache:warm')->daily();
}
```

### Cache Invalidation

```php
// Clear specific cache keys
Cache::forget('llm:' . md5($userPrompt));

// Clear cache tags (requires Redis)
Cache::tags(['llm', 'user:' . $userId])->flush();

// Clear all cache
php artisan cache:clear

// Production cache clear (atomic)
php artisan config:clear && php artisan cache:clear && php artisan config:cache
```

---

## LLM Provider Setup

### API Keys Management

**Development (Not Recommended for Production):**

```bash
# .env file
MINDWAVE_OPENAI_API_KEY=sk-proj-XXXX
```

**Production - AWS Secrets Manager:**

```php
// config/services.php
'mindwave' => [
    'openai_key' => env('APP_ENV') === 'production'
        ? aws_secret('mindwave/openai-api-key')
        : env('MINDWAVE_OPENAI_API_KEY'),
],

// Helper function
function aws_secret(string $name): string
{
    $client = new Aws\SecretsManager\SecretsManagerClient([
        'region' => 'us-east-1',
        'version' => 'latest',
    ]);

    $result = $client->getSecretValue(['SecretId' => $name]);
    return $result['SecretString'];
}
```

**Production - HashiCorp Vault:**

```php
// Fetch from Vault
use Vault\Client;

$client = new Client(env('VAULT_ADDR'));
$client->setToken(env('VAULT_TOKEN'));

$secret = $client->read('secret/data/mindwave/openai');
$apiKey = $secret['data']['data']['api_key'];

config(['mindwave-llm.llms.openai.api_key' => $apiKey]);
```

**Production - Laravel Vapor:**

```bash
# Store secrets in Vapor
vapor secret put mindwave-openai-key sk-proj-XXXX

# Access in application
MINDWAVE_OPENAI_API_KEY=$VAPOR_SECRET_MINDWAVE_OPENAI_KEY
```

### Key Rotation

```php
// app/Console/Commands/RotateApiKeys.php
namespace App\Console\Commands;

use Illuminate\Console\Command;

class RotateApiKeys extends Command
{
    protected $signature = 'keys:rotate {provider}';

    public function handle()
    {
        $provider = $this->argument('provider');

        // 1. Generate new key via provider dashboard
        $newKey = $this->ask("Enter new {$provider} API key:");

        // 2. Update in secrets manager
        aws_secret_put("mindwave/{$provider}-api-key", $newKey);

        // 3. Test new key
        $this->info('Testing new key...');
        config(["mindwave-llm.llms.{$provider}.api_key" => $newKey]);

        try {
            Mindwave::llm($provider)->generateText('test');
            $this->info('New key validated successfully!');
        } catch (\Exception $e) {
            $this->error('Key validation failed: ' . $e->getMessage());
            return 1;
        }

        // 4. Revoke old key (manual step)
        $this->warn('MANUAL STEP: Revoke old key in provider dashboard');

        return 0;
    }
}
```

### Rate Limiting

**Provider Limits:**

| Provider  | Tier   | Requests/Min | Tokens/Min |
| --------- | ------ | ------------ | ---------- |
| OpenAI    | Free   | 3            | 40,000     |
| OpenAI    | Tier 1 | 500          | 90,000     |
| OpenAI    | Tier 5 | 10,000       | 30,000,000 |
| Anthropic | Free   | 5            | 25,000     |
| Anthropic | Build  | 50           | 100,000    |
| Mistral   | Free   | 5            | 1,000,000  |
| Mistral   | Pro    | 100          | 2,000,000  |

**Application-Level Rate Limiting:**

```php
// app/Http/Middleware/ThrottleLlmRequests.php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Cache\RateLimiter;
use Illuminate\Http\Request;

class ThrottleLlmRequests
{
    public function __construct(protected RateLimiter $limiter)
    {
    }

    public function handle(Request $request, Closure $next)
    {
        $key = 'llm:' . ($request->user()?->id ?? $request->ip());

        if ($this->limiter->tooManyAttempts($key, 10)) {  // 10 requests per minute
            return response()->json([
                'error' => 'Rate limit exceeded. Try again later.'
            ], 429);
        }

        $this->limiter->hit($key, 60);

        return $next($request);
    }
}
```

**Handling 429 Errors:**

```php
use Mindwave\Mindwave\Facades\Mindwave;

try {
    $response = Mindwave::llm()->generateText($prompt);
} catch (\Exception $e) {
    if (str_contains($e->getMessage(), '429') || str_contains($e->getMessage(), 'rate limit')) {
        // Exponential backoff retry
        $retries = 3;
        $delay = 2; // seconds

        for ($i = 0; $i < $retries; $i++) {
            sleep($delay * ($i + 1));  // 2s, 4s, 6s

            try {
                $response = Mindwave::llm()->generateText($prompt);
                break;
            } catch (\Exception $retryException) {
                if ($i === $retries - 1) {
                    throw $retryException;  // Final retry failed
                }
            }
        }
    } else {
        throw $e;
    }
}
```

### Failover & Circuit Breakers

**Multi-Provider Failover:**

```php
namespace App\Services;

use Mindwave\Mindwave\Facades\Mindwave;

class ResilientLlmService
{
    protected array $providers = ['openai', 'anthropic', 'mistral'];
    protected int $currentProvider = 0;

    public function generateText(string $prompt): string
    {
        foreach ($this->providers as $provider) {
            try {
                return Mindwave::llm($provider)->generateText($prompt);
            } catch (\Exception $e) {
                \Log::warning("LLM provider {$provider} failed", [
                    'error' => $e->getMessage(),
                    'provider' => $provider,
                ]);

                // Try next provider
                continue;
            }
        }

        throw new \Exception('All LLM providers failed');
    }
}
```

**Circuit Breaker Pattern:**

```php
namespace App\Services;

use Illuminate\Support\Facades\Cache;

class LlmCircuitBreaker
{
    protected int $failureThreshold = 5;
    protected int $timeout = 60; // seconds

    public function call(callable $callback)
    {
        $key = 'circuit:llm';

        // Check if circuit is open
        if (Cache::get($key . ':state') === 'open') {
            $openedAt = Cache::get($key . ':opened_at');

            if (now()->timestamp - $openedAt < $this->timeout) {
                throw new \Exception('Circuit breaker is OPEN');
            }

            // Try half-open state
            Cache::put($key . ':state', 'half-open', 300);
        }

        try {
            $result = $callback();

            // Success - reset failures
            Cache::forget($key . ':failures');
            Cache::put($key . ':state', 'closed', 300);

            return $result;
        } catch (\Exception $e) {
            // Increment failure count
            $failures = Cache::increment($key . ':failures');

            if ($failures >= $this->failureThreshold) {
                Cache::put($key . ':state', 'open', 300);
                Cache::put($key . ':opened_at', now()->timestamp, 300);
            }

            throw $e;
        }
    }
}

// Usage
$breaker = new LlmCircuitBreaker();
$response = $breaker->call(fn() => Mindwave::llm()->generateText($prompt));
```

---

## Observability Setup

### OpenTelemetry Configuration

**Jaeger (Self-Hosted):**

```bash
# Docker Compose for Jaeger
# docker-compose.yml
version: '3.8'
services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # UI
      - "4318:4318"    # OTLP HTTP
      - "4317:4317"    # OTLP gRPC
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    volumes:
      - jaeger-data:/badger

volumes:
  jaeger-data:
```

```bash
# .env
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

**Honeycomb (SaaS):**

```bash
# .env
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=YOUR_API_KEY"
```

**Grafana Tempo:**

```bash
# .env
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

**Datadog:**

```bash
# .env
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://trace.agent.datadoghq.com
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_HEADERS="DD-API-KEY=YOUR_DD_API_KEY"
```

### Sampling Strategies

**Production Sampling (10%):**

```bash
# .env - Sample 10% of traces to reduce costs
MINDWAVE_TRACE_SAMPLER=traceidratio
MINDWAVE_TRACE_SAMPLE_RATIO=0.1
```

**Error-Only Sampling:**

```php
// Custom sampler - only sample errors
namespace App\Telemetry;

use OpenTelemetry\SDK\Trace\Sampler;
use OpenTelemetry\SDK\Trace\SamplingResult;

class ErrorSampler implements Sampler
{
    public function shouldSample(
        Context $parentContext,
        string $traceId,
        string $spanName,
        int $spanKind,
        Attributes $attributes,
        array $links
    ): SamplingResult {
        // Sample all error traces
        if ($attributes->get('error') === true) {
            return new SamplingResult(SamplingResult::RECORD_AND_SAMPLE);
        }

        // Sample 1% of successful traces
        if (rand(1, 100) === 1) {
            return new SamplingResult(SamplingResult::RECORD_AND_SAMPLE);
        }

        return new SamplingResult(SamplingResult::DROP);
    }
}
```

**Cost-Based Sampling:**

```php
// Sample all traces above $0.10 cost
namespace App\Telemetry;

class CostBasedSampler implements Sampler
{
    public function shouldSample(...$args): SamplingResult
    {
        $estimatedCost = $attributes->get('estimated_cost') ?? 0;

        // Always sample expensive traces
        if ($estimatedCost > 0.10) {
            return new SamplingResult(SamplingResult::RECORD_AND_SAMPLE);
        }

        // Sample 5% of cheap traces
        if (rand(1, 20) === 1) {
            return new SamplingResult(SamplingResult::RECORD_AND_SAMPLE);
        }

        return new SamplingResult(SamplingResult::DROP);
    }
}
```

### Logging

**Production Log Configuration:**

```php
// config/logging.php
'channels' => [
    'stack' => [
        'driver' => 'stack',
        'channels' => ['single', 'sentry'],
        'ignore_exceptions' => false,
    ],

    'single' => [
        'driver' => 'single',
        'path' => storage_path('logs/laravel.log'),
        'level' => env('LOG_LEVEL', 'error'),
    ],

    'sentry' => [
        'driver' => 'sentry',
        'level' => 'error',
    ],

    'papertrail' => [
        'driver' => 'monolog',
        'level' => env('LOG_LEVEL', 'error'),
        'handler' => SyslogUdpHandler::class,
        'handler_with' => [
            'host' => env('PAPERTRAIL_URL'),
            'port' => env('PAPERTRAIL_PORT'),
        ],
    ],
],
```

**Structured Logging for LLM Operations:**

```php
use Illuminate\Support\Facades\Log;

Log::info('LLM request', [
    'provider' => 'openai',
    'model' => 'gpt-4-turbo',
    'prompt_tokens' => 150,
    'completion_tokens' => 75,
    'total_cost_usd' => 0.0033,
    'latency_ms' => 1250,
    'user_id' => $user->id,
    'trace_id' => $traceId,
]);
```

### Error Tracking

**Sentry Integration:**

```bash
composer require sentry/sentry-laravel
```

```php
// config/sentry.php
'dsn' => env('SENTRY_LARAVEL_DSN'),
'traces_sample_rate' => (float) env('SENTRY_TRACES_SAMPLE_RATE', 0.1),
'profiles_sample_rate' => (float) env('SENTRY_PROFILES_SAMPLE_RATE', 0.1),

'before_send' => function (\Sentry\Event $event) {
    // Redact sensitive data
    if ($event->getRequest()) {
        $request = $event->getRequest();
        unset($request['headers']['Authorization']);
    }

    return $event;
},
```

**Flare Integration:**

```bash
composer require spatie/laravel-ignition
```

```php
// .env
FLARE_KEY=your_flare_key
```

### Metrics

**Custom LLM Metrics:**

```php
namespace App\Metrics;

use Illuminate\Support\Facades\Cache;

class LlmMetrics
{
    public static function recordRequest(string $provider, float $cost, int $tokens)
    {
        $date = now()->format('Y-m-d');

        // Increment request count
        Cache::increment("metrics:{$date}:llm:{$provider}:requests");

        // Sum costs
        Cache::increment("metrics:{$date}:llm:{$provider}:cost_cents", (int)($cost * 100));

        // Sum tokens
        Cache::increment("metrics:{$date}:llm:{$provider}:tokens", $tokens);
    }

    public static function getDailyMetrics(string $date): array
    {
        $providers = ['openai', 'anthropic', 'mistral'];
        $metrics = [];

        foreach ($providers as $provider) {
            $metrics[$provider] = [
                'requests' => Cache::get("metrics:{$date}:llm:{$provider}:requests", 0),
                'cost_usd' => Cache::get("metrics:{$date}:llm:{$provider}:cost_cents", 0) / 100,
                'tokens' => Cache::get("metrics:{$date}:llm:{$provider}:tokens", 0),
            ];
        }

        return $metrics;
    }
}
```

**Prometheus Metrics (Advanced):**

```bash
composer require jimdo/prometheus-client-php
```

```php
namespace App\Http\Controllers;

use Prometheus\CollectorRegistry;
use Prometheus\RenderTextFormat;

class MetricsController extends Controller
{
    public function __invoke(CollectorRegistry $registry)
    {
        $renderer = new RenderTextFormat();
        return response($renderer->render($registry->getMetricFamilySamples()))
            ->header('Content-Type', RenderTextFormat::MIME_TYPE);
    }
}

// Record metrics
$counter = $registry->getOrRegisterCounter('app', 'llm_requests_total', 'Total LLM requests', ['provider', 'model']);
$counter->incBy(1, ['openai', 'gpt-4-turbo']);

$histogram = $registry->getOrRegisterHistogram('app', 'llm_cost_usd', 'LLM request cost', ['provider']);
$histogram->observe($cost, ['openai']);
```

---

## Vector Store Deployment

### Qdrant

**Docker Compose (Single Node):**

```yaml
# docker-compose.yml
version: '3.8'
services:
    qdrant:
        image: qdrant/qdrant:latest
        ports:
            - '6333:6333'
            - '6334:6334'
        volumes:
            - qdrant_storage:/qdrant/storage
        environment:
            - QDRANT__SERVICE__API_KEY=${QDRANT_API_KEY}
        restart: unless-stopped

volumes:
    qdrant_storage:
```

**Kubernetes Deployment:**

```yaml
# qdrant-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
    name: qdrant
spec:
    replicas: 3
    selector:
        matchLabels:
            app: qdrant
    template:
        metadata:
            labels:
                app: qdrant
        spec:
            containers:
                - name: qdrant
                  image: qdrant/qdrant:latest
                  ports:
                      - containerPort: 6333
                      - containerPort: 6334
                  env:
                      - name: QDRANT__SERVICE__API_KEY
                        valueFrom:
                            secretKeyRef:
                                name: qdrant-secret
                                key: api-key
                  volumeMounts:
                      - name: qdrant-storage
                        mountPath: /qdrant/storage
            volumes:
                - name: qdrant-storage
                  persistentVolumeClaim:
                      claimName: qdrant-pvc
---
apiVersion: v1
kind: Service
metadata:
    name: qdrant
spec:
    selector:
        app: qdrant
    ports:
        - name: http
          port: 6333
        - name: grpc
          port: 6334
    type: ClusterIP
```

**Backups:**

```bash
# Backup Qdrant data
docker exec qdrant tar -czf /tmp/qdrant-backup.tar.gz /qdrant/storage
docker cp qdrant:/tmp/qdrant-backup.tar.gz ./backups/qdrant-$(date +%Y%m%d).tar.gz

# Restore
docker cp ./backups/qdrant-20250119.tar.gz qdrant:/tmp/
docker exec qdrant tar -xzf /tmp/qdrant-20250119.tar.gz -C /
docker restart qdrant
```

### Pinecone

**Production Configuration:**

```bash
# .env
MINDWAVE_VECTORSTORE=pinecone
MINDWAVE_PINECONE_API_KEY=your-production-key
MINDWAVE_PINECONE_ENVIRONMENT=us-east1-gcp
MINDWAVE_PINECONE_INDEX=production-vectors
```

**Index Configuration:**

```php
// Create production index (one-time setup)
use Pinecone\Client as PineconeClient;

$client = new PineconeClient(env('MINDWAVE_PINECONE_API_KEY'), env('MINDWAVE_PINECONE_ENVIRONMENT'));

$client->createIndex([
    'name' => 'production-vectors',
    'dimension' => 1536,  // OpenAI ada-002 dimensions
    'metric' => 'cosine',
    'pods' => 1,
    'replicas' => 2,  // For high availability
    'pod_type' => 'p1.x1',  // Production pod type
]);
```

**Scaling:**

```php
// Scale index pods
$client->configureIndex('production-vectors', [
    'replicas' => 3,
    'pods' => 2,
]);
```

**Backups:**

```php
// Export vectors for backup
use Mindwave\Mindwave\Facades\Mindwave;

$vectorstore = Mindwave::vectorstore('pinecone');
$allVectors = $vectorstore->fetch(['ids' => $allIds]);

// Store in S3
Storage::disk('s3')->put(
    'backups/vectors/' . now()->format('Y-m-d') . '.json',
    json_encode($allVectors)
);
```

### Weaviate

**Docker Compose:**

```yaml
version: '3.8'
services:
    weaviate:
        image: semitechnologies/weaviate:latest
        ports:
            - '8080:8080'
        environment:
            - AUTHENTICATION_APIKEY_ENABLED=true
            - AUTHENTICATION_APIKEY_ALLOWED_KEYS=${WEAVIATE_API_KEY}
            - PERSISTENCE_DATA_PATH=/var/lib/weaviate
            - QUERY_DEFAULTS_LIMIT=25
            - DEFAULT_VECTORIZER_MODULE=none
            - ENABLE_MODULES=backup-s3
            - BACKUP_S3_BUCKET=my-weaviate-backups
            - BACKUP_S3_ENDPOINT=s3.amazonaws.com
            - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
            - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
        volumes:
            - weaviate_data:/var/lib/weaviate
        restart: unless-stopped

volumes:
    weaviate_data:
```

**Replication:**

```bash
# Set replication factor when creating schema
curl -X POST "http://localhost:8080/v1/schema" \
  -H "Content-Type: application/json" \
  -d '{
    "class": "ProductionVectors",
    "replicationConfig": {
      "factor": 3
    },
    "vectorizer": "none"
  }'
```

---

## Web Server Configuration

### Nginx

SSE streaming requires special Nginx configuration:

```nginx
# /etc/nginx/sites-available/your-app
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root /var/www/your-app/public;
    index index.php index.html;

    # Increase timeouts for LLM requests
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    fastcgi_send_timeout 300s;
    fastcgi_read_timeout 300s;

    # SSE Streaming Configuration
    location /api/stream {
        proxy_pass http://127.0.0.1:8000;

        # Disable buffering for SSE
        proxy_buffering off;
        proxy_cache off;

        # Set SSE headers
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding on;

        # Pass headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # No timeout for SSE
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # Regular PHP requests
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;

        # Increase buffer size for large responses
        fastcgi_buffers 16 16k;
        fastcgi_buffer_size 32k;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

**Test Configuration:**

```bash
# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Apache

```apache
# /etc/apache2/sites-available/your-app.conf
<VirtualHost *:80>
    ServerName yourdomain.com
    Redirect permanent / https://yourdomain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName yourdomain.com
    DocumentRoot /var/www/your-app/public

    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/yourdomain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/yourdomain.com/privkey.pem

    # Enable required modules
    # a2enmod proxy proxy_http headers rewrite ssl

    <Directory /var/www/your-app/public>
        AllowOverride All
        Require all granted
    </Directory>

    # SSE Streaming Proxy
    ProxyPreserveHost On
    ProxyTimeout 300

    <Location /api/stream>
        ProxyPass http://127.0.0.1:8000/api/stream
        ProxyPassReverse http://127.0.0.1:8000/api/stream

        # Disable buffering for SSE
        SetEnv proxy-nokeepalive 1
        SetEnv proxy-sendchunked 1
        SetEnv proxy-sendcl 0
    </Location>

    # Security Headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"

    # Logging
    ErrorLog ${APACHE_LOG_DIR}/your-app-error.log
    CustomLog ${APACHE_LOG_DIR}/your-app-access.log combined
</VirtualHost>
```

**Enable and Reload:**

```bash
# Enable site
sudo a2ensite your-app

# Enable required modules
sudo a2enmod proxy proxy_http headers rewrite ssl

# Test config
sudo apache2ctl configtest

# Reload Apache
sudo systemctl reload apache2
```

---

## Security Hardening

### API Key Protection

```php
// Never expose keys in responses
return response()->json([
    'status' => 'success',
    // 'api_key' => config('mindwave-llm.llms.openai.api_key'), // NEVER DO THIS
]);

// Use environment variables
config(['mindwave-llm.llms.openai.api_key' => env('MINDWAVE_OPENAI_API_KEY')]);

// Rotate keys quarterly
// Document rotation procedure in runbook
```

### Input Validation

```php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ChatRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'message' => [
                'required',
                'string',
                'max:4000',  // Prevent excessive token usage
                'min:1',
            ],
            'context' => [
                'nullable',
                'array',
                'max:10',  // Limit context items
            ],
            'context.*' => [
                'string',
                'max:2000',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'message.max' => 'Message must not exceed 4000 characters',
            'context.max' => 'Maximum 10 context items allowed',
        ];
    }
}
```

### Rate Limiting

```php
// app/Http/Kernel.php
protected $middlewareGroups = [
    'api' => [
        \App\Http\Middleware\ThrottleRequests::class.':api',
        // ...
    ],
];

// config/app.php - Define rate limits
RateLimiter::for('api', function (Request $request) {
    return $request->user()
        ? Limit::perMinute(60)->by($request->user()->id)
        : Limit::perMinute(10)->by($request->ip());
});

// Per-endpoint limits
Route::middleware('throttle:llm')->group(function () {
    Route::post('/chat', [ChatController::class, 'chat']);
});

RateLimiter::for('llm', function (Request $request) {
    return $request->user()
        ? Limit::perMinute(10)->by($request->user()->id)
        : Limit::perMinute(3)->by($request->ip());
});
```

### CORS Configuration

```php
// config/cors.php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE'],
    'allowed_origins' => explode(',', env('CORS_ALLOWED_ORIGINS', 'https://yourdomain.com')),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Content-Type', 'X-Requested-With', 'Authorization'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
```

### PII Handling

```php
// config/mindwave-tracing.php
'capture_messages' => false,  // CRITICAL: Keep false in production

'pii_redact' => [
    'gen_ai.input.messages',
    'gen_ai.output.messages',
    'gen_ai.system_instructions',
],

// Custom PII redaction
namespace App\Services;

class PiiRedactor
{
    public function redact(string $text): string
    {
        // Email addresses
        $text = preg_replace('/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/', '[EMAIL]', $text);

        // Phone numbers (US)
        $text = preg_replace('/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/', '[PHONE]', $text);

        // Credit cards (basic pattern)
        $text = preg_replace('/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/', '[CREDIT_CARD]', $text);

        // SSN
        $text = preg_replace('/\b\d{3}-\d{2}-\d{4}\b/', '[SSN]', $text);

        return $text;
    }
}

// Use before sending to LLM
$redactor = new PiiRedactor();
$cleanPrompt = $redactor->redact($userInput);
```

### SQL Injection Prevention

```php
// ALWAYS use parameter binding
$users = DB::table('users')
    ->where('email', $request->input('email'))  // Safe
    ->get();

// NEVER concatenate user input
// $users = DB::select("SELECT * FROM users WHERE email = '{$email}'");  // VULNERABLE!

// With Eloquent (safe by default)
$products = Product::where('name', 'LIKE', "%{$search}%")->get();

// Context sources - use parameter binding
$source = TntSearchSource::fromEloquent(
    User::where('active', true),  // Safe
    fn($u) => "Name: {$u->name}"
);
```

---

## Performance Optimization

### OPcache Configuration

```ini
; /etc/php/8.3/fpm/conf.d/10-opcache.ini
[opcache]
opcache.enable=1
opcache.memory_consumption=256
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=20000
opcache.revalidate_freq=0
opcache.validate_timestamps=0  ; Disable in production
opcache.save_comments=1
opcache.fast_shutdown=1
opcache.enable_cli=0

; Preload (Laravel 11+)
opcache.preload=/var/www/your-app/preload.php
opcache.preload_user=www-data
```

**Preload File:**

```php
// preload.php (Laravel 11)
<?php

require __DIR__ . '/vendor/autoload.php';

// Laravel will handle preloading
\Illuminate\Foundation\Application::configure(basePath: __DIR__)
    ->create();
```

### Database Query Optimization

```php
// AVOID N+1 queries
// BAD:
foreach ($traces as $trace) {
    echo $trace->spans->count();  // N+1 query
}

// GOOD:
$traces = Trace::withCount('spans')->get();
foreach ($traces as $trace) {
    echo $trace->spans_count;
}

// Use specific columns
Trace::select(['id', 'estimated_cost', 'created_at'])
    ->where('estimated_cost', '>', 0.10)
    ->get();

// Use chunks for large datasets
Trace::where('created_at', '<', now()->subMonths(3))
    ->chunkById(1000, function ($traces) {
        foreach ($traces as $trace) {
            // Process trace
        }
    });
```

### Asset Compilation

```bash
# Production asset build
npm run build

# Or with Vite
npm run build

# Minify and version assets
php artisan optimize

# Serve static assets via CDN
# Upload public/build/* to CloudFront/CloudFlare
```

### Response Caching

```php
// Cache expensive queries
use Illuminate\Support\Facades\Cache;

Route::get('/api/cost-summary', function () {
    return Cache::remember('cost-summary:' . now()->format('Y-m-d'), 3600, function () {
        return [
            'daily_cost' => Trace::whereDate('created_at', today())->sum('estimated_cost'),
            'monthly_cost' => Trace::whereMonth('created_at', now()->month)->sum('estimated_cost'),
            'top_models' => Span::select('model', DB::raw('SUM(cost_usd) as total_cost'))
                ->groupBy('model')
                ->orderByDesc('total_cost')
                ->limit(5)
                ->get(),
        ];
    });
});
```

---

## Monitoring & Alerts

### Health Checks

```php
// routes/web.php
Route::get('/health', function () {
    $checks = [
        'database' => fn() => DB::connection()->getPdo() !== null,
        'redis' => fn() => Cache::store('redis')->get('health-check') !== false,
        'llm' => fn() => config('mindwave-llm.llms.openai.api_key') !== null,
        'queue' => fn() => Queue::size() < 1000,  // Queue not backed up
    ];

    $results = [];
    $healthy = true;

    foreach ($checks as $name => $check) {
        try {
            $results[$name] = $check() ? 'ok' : 'failed';
            if ($results[$name] === 'failed') {
                $healthy = false;
            }
        } catch (\Exception $e) {
            $results[$name] = 'error: ' . $e->getMessage();
            $healthy = false;
        }
    }

    return response()->json([
        'status' => $healthy ? 'healthy' : 'unhealthy',
        'checks' => $results,
        'timestamp' => now()->toIso8601String(),
    ], $healthy ? 200 : 503);
});
```

### Uptime Monitoring

**UptimeRobot:**

-   Monitor: `https://yourdomain.com/health`
-   Interval: 5 minutes
-   Alert: Email/Slack on failure

**Pingdom:**

```bash
# Create HTTP check
# URL: https://yourdomain.com/health
# Check: "status" contains "healthy"
# Interval: 1 minute
```

### Cost Alerts

```php
// app/Console/Commands/CheckCostThreshold.php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;
use App\Notifications\CostThresholdExceeded;

class CheckCostThreshold extends Command
{
    protected $signature = 'costs:check-threshold';

    public function handle()
    {
        $dailyCost = Trace::whereDate('created_at', today())->sum('estimated_cost');
        $threshold = 50.00;  // $50/day threshold

        if ($dailyCost > $threshold) {
            Notification::route('mail', config('app.admin_email'))
                ->route('slack', config('services.slack.webhook'))
                ->notify(new CostThresholdExceeded($dailyCost, $threshold));
        }
    }
}

// Schedule hourly
// app/Console/Kernel.php
protected function schedule(Schedule $schedule)
{
    $schedule->command('costs:check-threshold')->hourly();
}
```

### Performance Alerts

```php
// Alert on slow LLM requests
namespace App\Observers;

use Mindwave\Mindwave\Observability\Models\Span;

class SpanObserver
{
    public function created(Span $span)
    {
        // Alert on requests > 10 seconds
        if ($span->duration > 10_000_000_000) {  // nanoseconds
            \Log::warning('Slow LLM request detected', [
                'span_id' => $span->span_id,
                'operation' => $span->operation_name,
                'duration_seconds' => $span->duration / 1_000_000_000,
                'model' => $span->attributes['gen_ai.request.model'] ?? 'unknown',
            ]);
        }
    }
}
```

### Alert Rules

**Error Rate Alert:**

```php
// Alert if error rate > 5% in last hour
$totalRequests = Trace::where('created_at', '>', now()->subHour())->count();
$errorRequests = Trace::where('created_at', '>', now()->subHour())
    ->where('status_code', '!=', 'OK')
    ->count();

$errorRate = $totalRequests > 0 ? ($errorRequests / $totalRequests) * 100 : 0;

if ($errorRate > 5) {
    // Send alert
}
```

**Budget Alert:**

```php
// Alert if monthly budget exceeded
$monthlyBudget = 500.00;
$monthlySpend = Trace::whereMonth('created_at', now()->month)->sum('estimated_cost');

if ($monthlySpend > $monthlyBudget) {
    // Send critical alert
    // Consider disabling LLM features
}
```

---

## Backup & Recovery

### Database Backups

**Daily Automated Backups:**

```bash
#!/bin/bash
# /usr/local/bin/backup-database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/mindwave"
DB_NAME="your_database"
DB_USER="your_user"

# Create backup directory
mkdir -p $BACKUP_DIR

# PostgreSQL backup
pg_dump -U $DB_USER -d $DB_NAME -F c -f $BACKUP_DIR/db_$DATE.dump

# Compress
gzip $BACKUP_DIR/db_$DATE.dump

# Upload to S3
aws s3 cp $BACKUP_DIR/db_$DATE.dump.gz s3://your-backup-bucket/databases/

# Keep only last 7 days locally
find $BACKUP_DIR -name "db_*.dump.gz" -mtime +7 -delete

echo "Backup completed: db_$DATE.dump.gz"
```

**Schedule via Cron:**

```bash
# crontab -e
0 2 * * * /usr/local/bin/backup-database.sh >> /var/log/backup.log 2>&1
```

**Laravel Backup Package:**

```bash
composer require spatie/laravel-backup
```

```php
// config/backup.php
'backup' => [
    'name' => env('APP_NAME', 'laravel-backup'),
    'source' => [
        'files' => [
            'include' => [
                base_path(),
            ],
            'exclude' => [
                base_path('vendor'),
                base_path('node_modules'),
            ],
        ],
        'databases' => ['pgsql'],
    ],
    'destination' => [
        'disks' => ['s3'],
    ],
],

// Schedule
$schedule->command('backup:clean')->daily()->at('01:00');
$schedule->command('backup:run')->daily()->at('02:00');
```

### Vector Store Backups

```bash
# Qdrant backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
docker exec qdrant tar -czf /tmp/qdrant-$DATE.tar.gz /qdrant/storage
docker cp qdrant:/tmp/qdrant-$DATE.tar.gz /var/backups/qdrant/
aws s3 cp /var/backups/qdrant/qdrant-$DATE.tar.gz s3://your-backup-bucket/qdrant/
```

### Recovery Procedures

**Database Recovery:**

```bash
# PostgreSQL restore
gunzip /var/backups/mindwave/db_20250119_020000.dump.gz
pg_restore -U your_user -d your_database -c /var/backups/mindwave/db_20250119_020000.dump

# Verify
psql -U your_user -d your_database -c "SELECT COUNT(*) FROM mindwave_traces;"
```

**Application Recovery:**

```bash
# 1. Restore codebase from git
git clone https://github.com/your-org/your-app.git
cd your-app
git checkout production-tag-v1.2.3

# 2. Install dependencies
composer install --no-dev --optimize-autoloader
npm ci && npm run build

# 3. Restore .env from secure backup
# (Copy from secrets manager or encrypted backup)

# 4. Restore database
pg_restore -U user -d database backup.dump

# 5. Clear and rebuild cache
php artisan config:clear
php artisan cache:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 6. Restart services
sudo supervisorctl restart mindwave-worker:*
sudo systemctl restart php8.3-fpm
sudo systemctl reload nginx

# 7. Verify health
curl https://yourdomain.com/health
```

### Disaster Recovery Plan

**RTO (Recovery Time Objective): 2 hours**
**RPO (Recovery Point Objective): 24 hours**

1. **Immediate (0-15 mins)**

    - Assess incident scope
    - Notify team via Slack
    - Switch to maintenance mode

2. **Short-term (15-60 mins)**

    - Restore database from latest backup
    - Restore application code from git
    - Restore .env from secrets manager
    - Verify backups integrity

3. **Recovery (60-120 mins)**

    - Deploy to new infrastructure if needed
    - Restore vector store data
    - Rebuild caches
    - Run smoke tests
    - Switch traffic to recovered environment

4. **Validation (120+ mins)**
    - Monitor error rates
    - Verify all services healthy
    - Communicate status to users
    - Document incident

---

## Scaling Strategies

### Horizontal Scaling (Load Balancing)

**Nginx Load Balancer:**

```nginx
# /etc/nginx/nginx.conf
upstream app_servers {
    least_conn;  # or ip_hash for sticky sessions
    server 10.0.1.10:8000 weight=3;
    server 10.0.1.11:8000 weight=3;
    server 10.0.1.12:8000 weight=2;
    server 10.0.1.13:8000 backup;  # Failover server
}

server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://app_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # Health check
        proxy_next_upstream error timeout http_502 http_503 http_504;
    }
}
```

**Health Checks:**

```nginx
# Nginx Plus (commercial)
upstream app_servers {
    server 10.0.1.10:8000;
    server 10.0.1.11:8000;

    health_check interval=10s fails=3 passes=2 uri=/health;
}
```

### Vertical Scaling (Server Resources)

**Recommended Production Specs:**

| Traffic Level              | CPU       | RAM    | Storage | Workers |
| -------------------------- | --------- | ------ | ------- | ------- |
| Small (< 1k req/day)       | 2 cores   | 4 GB   | 50 GB   | 2       |
| Medium (< 10k req/day)     | 4 cores   | 8 GB   | 100 GB  | 4       |
| Large (< 100k req/day)     | 8 cores   | 16 GB  | 200 GB  | 8       |
| Enterprise (100k+ req/day) | 16+ cores | 32+ GB | 500 GB  | 16+     |

**PHP-FPM Tuning:**

```ini
; /etc/php/8.3/fpm/pool.d/www.conf
pm = dynamic
pm.max_children = 50        ; Max workers
pm.start_servers = 10       ; Initial workers
pm.min_spare_servers = 5
pm.max_spare_servers = 20
pm.max_requests = 500       ; Restart worker after N requests (prevent memory leaks)

; Resource limits
php_admin_value[memory_limit] = 256M
php_admin_value[max_execution_time] = 300
```

### Database Scaling

**Read Replicas:**

```php
// config/database.php
'connections' => [
    'pgsql' => [
        'write' => [
            'host' => env('DB_HOST_WRITE', '127.0.0.1'),
        ],
        'read' => [
            [
                'host' => env('DB_HOST_READ_1', '127.0.0.1'),
            ],
            [
                'host' => env('DB_HOST_READ_2', '127.0.0.1'),
            ],
        ],
        'sticky' => true,
    ],
],

// Usage (automatic)
// Writes go to write server
Trace::create([...]);

// Reads distributed across read replicas
$traces = Trace::where('estimated_cost', '>', 0.10)->get();
```

**Database Sharding (Advanced):**

```php
// Shard by user_id for multi-tenant apps
namespace App\Models;

class Trace extends Model
{
    public function getConnectionName()
    {
        $userId = $this->attributes['user_id'] ?? auth()->id();
        $shardId = $userId % 4;  // 4 shards

        return "pgsql_shard_{$shardId}";
    }
}

// config/database.php
'connections' => [
    'pgsql_shard_0' => ['host' => 'db-shard-0.example.com', ...],
    'pgsql_shard_1' => ['host' => 'db-shard-1.example.com', ...],
    'pgsql_shard_2' => ['host' => 'db-shard-2.example.com', ...],
    'pgsql_shard_3' => ['host' => 'db-shard-3.example.com', ...],
],
```

### Queue Worker Scaling

**Auto-Scaling Workers:**

```bash
#!/bin/bash
# /usr/local/bin/scale-workers.sh

QUEUE_SIZE=$(redis-cli -h $REDIS_HOST LLEN "queues:default")
CURRENT_WORKERS=$(supervisorctl status mindwave-worker:* | grep RUNNING | wc -l)

if [ $QUEUE_SIZE -gt 100 ] && [ $CURRENT_WORKERS -lt 8 ]; then
    echo "Scaling up workers (queue: $QUEUE_SIZE)"
    supervisorctl start mindwave-worker:mindwave-worker_0{4,5,6,7}
elif [ $QUEUE_SIZE -lt 20 ] && [ $CURRENT_WORKERS -gt 2 ]; then
    echo "Scaling down workers (queue: $QUEUE_SIZE)"
    supervisorctl stop mindwave-worker:mindwave-worker_0{4,5,6,7}
fi
```

**Kubernetes HPA (Horizontal Pod Autoscaler):**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
    name: mindwave-worker-hpa
spec:
    scaleTargetRef:
        apiVersion: apps/v1
        kind: Deployment
        name: mindwave-worker
    minReplicas: 2
    maxReplicas: 10
    metrics:
        - type: External
          external:
              metric:
                  name: redis_queue_length
              target:
                  type: AverageValue
                  averageValue: '50'
```

### Vector Store Scaling

**Qdrant Horizontal Scaling:**

```yaml
# Kubernetes StatefulSet
apiVersion: apps/v1
kind: StatefulSet
metadata:
    name: qdrant
spec:
    replicas: 3
    serviceName: qdrant
    selector:
        matchLabels:
            app: qdrant
    template:
        spec:
            containers:
                - name: qdrant
                  image: qdrant/qdrant:latest
                  env:
                      - name: QDRANT__CLUSTER__ENABLED
                        value: 'true'
                      - name: QDRANT__CLUSTER__CONSENSUS__TICK_PERIOD_MS
                        value: '100'
```

---

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
    push:
        branches:
            - main
    workflow_dispatch:

jobs:
    tests:
        runs-on: ubuntu-latest
        services:
            postgres:
                image: postgres:15
                env:
                    POSTGRES_DB: testing
                    POSTGRES_USER: user
                    POSTGRES_PASSWORD: password
                options: >-
                    --health-cmd pg_isready
                    --health-interval 10s
                    --health-timeout 5s
                    --health-retries 5
            redis:
                image: redis:7
                options: >-
                    --health-cmd "redis-cli ping"
                    --health-interval 10s
                    --health-timeout 5s
                    --health-retries 5

        steps:
            - uses: actions/checkout@v4

            - name: Setup PHP
              uses: shivammathur/setup-php@v2
              with:
                  php-version: '8.3'
                  extensions: pdo, pgsql, redis
                  coverage: none

            - name: Install Dependencies
              run: composer install --prefer-dist --no-progress

            - name: Run Tests
              env:
                  DB_CONNECTION: pgsql
                  DB_HOST: localhost
                  DB_PORT: 5432
                  DB_DATABASE: testing
                  DB_USERNAME: user
                  DB_PASSWORD: password
                  REDIS_HOST: localhost
              run: php artisan test

            - name: Run Pint (Code Style)
              run: ./vendor/bin/pint --test

    deploy:
        needs: tests
        runs-on: ubuntu-latest
        if: github.ref == 'refs/heads/main'

        steps:
            - uses: actions/checkout@v4

            - name: Setup SSH
              uses: webfactory/ssh-agent@v0.8.0
              with:
                  ssh-private-key: ${{ secrets.DEPLOY_KEY }}

            - name: Deploy to Production
              run: |
                  ssh ${{ secrets.PRODUCTION_USER }}@${{ secrets.PRODUCTION_HOST }} << 'EOF'
                    cd /var/www/your-app

                    # Enable maintenance mode
                    php artisan down --message="Deploying updates..." --retry=60

                    # Pull latest code
                    git pull origin main

                    # Install dependencies
                    composer install --no-dev --optimize-autoloader
                    npm ci && npm run build

                    # Run migrations
                    php artisan migrate --force

                    # Clear and rebuild cache
                    php artisan config:clear
                    php artisan cache:clear
                    php artisan config:cache
                    php artisan route:cache
                    php artisan view:cache

                    # Restart services
                    sudo supervisorctl restart mindwave-worker:*
                    sudo systemctl reload php8.3-fpm

                    # Disable maintenance mode
                    php artisan up

                    # Health check
                    curl -f http://localhost/health || exit 1
                  EOF

            - name: Notify Deployment
              uses: 8398a7/action-slack@v3
              with:
                  status: ${{ job.status }}
                  text: 'Production deployment ${{ job.status }}'
                  webhook_url: ${{ secrets.SLACK_WEBHOOK }}
              if: always()
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
    - test
    - build
    - deploy

variables:
    POSTGRES_DB: testing
    POSTGRES_USER: user
    POSTGRES_PASSWORD: password

test:
    stage: test
    image: php:8.3-cli
    services:
        - postgres:15
        - redis:7
    before_script:
        - apt-get update && apt-get install -y git unzip libpq-dev
        - docker-php-ext-install pdo pdo_pgsql
        - curl -sS https://getcomposer.org/installer | php
        - mv composer.phar /usr/local/bin/composer
        - composer install --prefer-dist --no-progress
    script:
        - php artisan test
        - ./vendor/bin/pint --test

build:
    stage: build
    image: node:20
    script:
        - npm ci
        - npm run build
    artifacts:
        paths:
            - public/build/
        expire_in: 1 day

deploy:
    stage: deploy
    image: alpine:latest
    only:
        - main
    before_script:
        - apk add --no-cache openssh-client
        - eval $(ssh-agent -s)
        - echo "$SSH_PRIVATE_KEY" | tr -d '\r' | ssh-add -
        - mkdir -p ~/.ssh
        - chmod 700 ~/.ssh
    script:
        - ssh $PRODUCTION_USER@$PRODUCTION_HOST "cd /var/www/your-app && bash deploy.sh"
```

### Zero-Downtime Deployment

```bash
#!/bin/bash
# deploy.sh - Zero-downtime deployment script

set -e

APP_DIR="/var/www/your-app"
RELEASE_DIR="/var/www/releases/$(date +%Y%m%d%H%M%S)"
CURRENT_LINK="/var/www/current"
SHARED_DIR="/var/www/shared"

echo "Starting deployment..."

# 1. Create new release directory
mkdir -p $RELEASE_DIR
cd $RELEASE_DIR

# 2. Clone latest code
git clone git@github.com:your-org/your-app.git .
git checkout $CI_COMMIT_SHA

# 3. Link shared files
ln -s $SHARED_DIR/.env .env
ln -s $SHARED_DIR/storage storage

# 4. Install dependencies
composer install --no-dev --optimize-autoloader
npm ci && npm run build

# 5. Warm cache
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 6. Run migrations (zero-downtime migrations only!)
php artisan migrate --force

# 7. Switch symlink atomically
ln -sfn $RELEASE_DIR $CURRENT_LINK

# 8. Reload PHP-FPM (no downtime)
sudo systemctl reload php8.3-fpm

# 9. Restart workers gracefully
sudo supervisorctl restart mindwave-worker:*

# 10. Health check
sleep 5
curl -f http://localhost/health || {
    echo "Health check failed! Rolling back..."
    # Rollback to previous release
    PREVIOUS_RELEASE=$(ls -t /var/www/releases | sed -n 2p)
    ln -sfn /var/www/releases/$PREVIOUS_RELEASE $CURRENT_LINK
    sudo systemctl reload php8.3-fpm
    exit 1
}

# 11. Cleanup old releases (keep last 5)
cd /var/www/releases
ls -t | tail -n +6 | xargs rm -rf

echo "Deployment successful!"
```

### Rollback Procedure

```bash
#!/bin/bash
# rollback.sh

RELEASES_DIR="/var/www/releases"
CURRENT_LINK="/var/www/current"

# Get previous release
PREVIOUS_RELEASE=$(ls -t $RELEASES_DIR | sed -n 2p)

if [ -z "$PREVIOUS_RELEASE" ]; then
    echo "No previous release found!"
    exit 1
fi

echo "Rolling back to $PREVIOUS_RELEASE..."

# Switch symlink
ln -sfn $RELEASES_DIR/$PREVIOUS_RELEASE $CURRENT_LINK

# Reload services
sudo systemctl reload php8.3-fpm
sudo supervisorctl restart mindwave-worker:*

# Run migrations down (if needed)
cd $CURRENT_LINK
# php artisan migrate:rollback --force

echo "Rollback complete!"
```

---

## Cost Optimization

### LLM Cost Monitoring

```php
// app/Console/Commands/CostReport.php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use Mindwave\Mindwave\Observability\Models\Trace;
use Mindwave\Mindwave\Observability\Models\Span;

class CostReport extends Command
{
    protected $signature = 'costs:report {--period=today}';

    public function handle()
    {
        $period = $this->option('period');

        $query = Trace::query();

        match($period) {
            'today' => $query->whereDate('created_at', today()),
            'week' => $query->where('created_at', '>', now()->subWeek()),
            'month' => $query->where('created_at', '>', now()->subMonth()),
            default => $query->whereDate('created_at', today()),
        };

        $totalCost = $query->sum('estimated_cost');
        $totalTokens = $query->sum('total_input_tokens') + $query->sum('total_output_tokens');
        $totalRequests = $query->count();

        // Cost by model
        $byModel = Span::query()
            ->selectRaw('
                attributes->"$.gen_ai.request.model" as model,
                COUNT(*) as requests,
                SUM(cost_usd) as total_cost,
                AVG(cost_usd) as avg_cost
            ')
            ->where('operation_name', 'chat')
            ->groupBy('model')
            ->orderByDesc('total_cost')
            ->get();

        $this->info("Cost Report - {$period}");
        $this->info(str_repeat('=', 50));
        $this->info("Total Cost: \${$totalCost}");
        $this->info("Total Tokens: " . number_format($totalTokens));
        $this->info("Total Requests: {$totalRequests}");
        $this->info("Avg Cost/Request: \$" . ($totalRequests > 0 ? $totalCost / $totalRequests : 0));
        $this->newLine();

        $this->table(
            ['Model', 'Requests', 'Total Cost', 'Avg Cost'],
            $byModel->map(fn($row) => [
                $row->model,
                $row->requests,
                '$' . number_format($row->total_cost, 4),
                '$' . number_format($row->avg_cost, 4),
            ])
        );
    }
}
```

### Model Selection Strategy

````php
namespace App\Services;

use Mindwave\Mindwave\Facades\Mindwave;

class SmartLlmRouter
{
    public function route(string $prompt, string $complexity = 'auto'): string
    {
        if ($complexity === 'auto') {
            $complexity = $this->detectComplexity($prompt);
        }

        return match($complexity) {
            'simple' => $this->useSimpleModel($prompt),
            'medium' => $this->useMediumModel($prompt),
            'complex' => $this->useComplexModel($prompt),
            default => $this->useMediumModel($prompt),
        };
    }

    protected function detectComplexity(string $prompt): string
    {
        $length = strlen($prompt);
        $hasCode = str_contains($prompt, '```') || str_contains($prompt, 'function');
        $hasMath = preg_match('/\d+\s*[\+\-\*\/]\s*\d+/', $prompt);

        if ($length > 2000 || $hasCode || $hasMath) {
            return 'complex';
        }

        if ($length > 500) {
            return 'medium';
        }

        return 'simple';
    }

    protected function useSimpleModel(string $prompt): string
    {
        // Use cheaper model for simple queries
        return Mindwave::llm('openai')
            ->model('gpt-3.5-turbo')  // $0.0005/$0.0015 per 1K tokens
            ->generateText($prompt);
    }

    protected function useMediumModel(string $prompt): string
    {
        return Mindwave::llm('openai')
            ->model('gpt-4-turbo')  // $0.01/$0.03 per 1K tokens
            ->generateText($prompt);
    }

    protected function useComplexModel(string $prompt): string
    {
        return Mindwave::llm('openai')
            ->model('gpt-4')  // $0.03/$0.06 per 1K tokens
            ->generateText($prompt);
    }
}
````

### Caching to Reduce Calls

```php
// Aggressive caching for similar queries
use Illuminate\Support\Facades\Cache;

class CachedLlmService
{
    public function generateText(string $prompt, int $ttl = 3600): string
    {
        // Normalize prompt to improve cache hits
        $normalizedPrompt = $this->normalizePrompt($prompt);
        $cacheKey = 'llm:' . md5($normalizedPrompt);

        return Cache::remember($cacheKey, $ttl, function () use ($prompt) {
            return Mindwave::llm()->generateText($prompt);
        });
    }

    protected function normalizePrompt(string $prompt): string
    {
        // Convert to lowercase
        $prompt = strtolower($prompt);

        // Remove extra whitespace
        $prompt = preg_replace('/\s+/', ' ', $prompt);

        // Remove punctuation variations
        $prompt = trim($prompt, ' .!?');

        return $prompt;
    }
}

// Cache hit rate: ~40-60% depending on use case
// Cost savings: 40-60% reduction in API calls
```

### Budget Enforcement

```php
namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Mindwave\Mindwave\Observability\Models\Trace;

class BudgetEnforcer
{
    protected float $dailyLimit = 50.00;  // $50/day
    protected float $monthlyLimit = 1000.00;  // $1000/month

    public function canMakeRequest(): bool
    {
        $dailySpend = $this->getDailySpend();
        $monthlySpend = $this->getMonthlySpend();

        if ($dailySpend >= $this->dailyLimit) {
            \Log::warning('Daily budget limit reached', ['spend' => $dailySpend]);
            return false;
        }

        if ($monthlySpend >= $this->monthlyLimit) {
            \Log::error('Monthly budget limit reached', ['spend' => $monthlySpend]);
            return false;
        }

        return true;
    }

    protected function getDailySpend(): float
    {
        return Cache::remember('budget:daily:' . today()->format('Y-m-d'), 300, function () {
            return Trace::whereDate('created_at', today())->sum('estimated_cost');
        });
    }

    protected function getMonthlySpend(): float
    {
        return Cache::remember('budget:monthly:' . now()->format('Y-m'), 300, function () {
            return Trace::whereMonth('created_at', now()->month)->sum('estimated_cost');
        });
    }
}

// Usage in controllers
public function chat(Request $request, BudgetEnforcer $budget)
{
    if (!$budget->canMakeRequest()) {
        return response()->json([
            'error' => 'Budget limit reached. Please try again later.'
        ], 429);
    }

    // Process request...
}
```

### Cost Reporting Dashboard

```php
// routes/web.php
Route::get('/admin/costs', function () {
    return view('admin.costs', [
        'dailyCosts' => Trace::selectRaw('
                DATE(created_at) as date,
                SUM(estimated_cost) as total_cost,
                COUNT(*) as requests,
                SUM(total_input_tokens + total_output_tokens) as tokens
            ')
            ->where('created_at', '>', now()->subMonth())
            ->groupBy('date')
            ->orderByDesc('date')
            ->get(),

        'modelBreakdown' => Span::selectRaw('
                attributes->"$.gen_ai.request.model" as model,
                SUM(cost_usd) as total_cost,
                COUNT(*) as requests
            ')
            ->where('created_at', '>', now()->subMonth())
            ->groupBy('model')
            ->orderByDesc('total_cost')
            ->get(),

        'userCosts' => Trace::selectRaw('
                user_id,
                SUM(estimated_cost) as total_cost,
                COUNT(*) as requests
            ')
            ->whereNotNull('user_id')
            ->where('created_at', '>', now()->subMonth())
            ->groupBy('user_id')
            ->orderByDesc('total_cost')
            ->limit(10)
            ->get(),
    ]);
})->middleware(['auth', 'admin']);
```

---

## Deployment Platforms

### Laravel Forge

**Setup:**

1. Connect Forge to your server (DigitalOcean, AWS, Linode)
2. Create new site: `yourdomain.com`
3. Deploy from GitHub/GitLab
4. Configure environment variables in Forge UI
5. Enable SSL (LetsEncrypt)

**Deployment Script:**

```bash
# Forge deployment script (auto-generated, customize as needed)
cd /home/forge/yourdomain.com

# Activate maintenance mode
php artisan down --message="Deploying updates..." --retry=60

# Pull latest code
git pull origin $FORGE_SITE_BRANCH

# Install/update composer dependencies
composer install --no-dev --optimize-autoloader

# Run migrations
php artisan migrate --force

# Clear and rebuild cache
php artisan config:clear
php artisan cache:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Restart queue workers
php artisan queue:restart

# Deactivate maintenance mode
php artisan up

# Health check
curl -f http://localhost/health || exit 1
```

**Scheduled Jobs:**

```bash
# Forge > Scheduled Jobs
# Add cron entries:
php artisan schedule:run  # Every minute
php artisan costs:check-threshold  # Hourly
php artisan mindwave:prune-traces --older-than=30days  # Daily
```

### Laravel Vapor

**vapor.yml:**

```yaml
id: 12345
name: your-app
environments:
    production:
        domain: yourdomain.com
        memory: 1024
        cli-memory: 512
        runtime: php-8.3
        database: your-app-production
        cache: your-app-redis

        build:
            - 'COMPOSER_MIRROR_PATH_REPOS=1 composer install --no-dev --optimize-autoloader'
            - 'npm ci && npm run build'
            - 'php artisan config:cache'
            - 'php artisan route:cache'
            - 'php artisan view:cache'

        deploy:
            - 'php artisan migrate --force'
            - 'php artisan queue:restart'

        queues:
            - name: default
              connections: 10
              timeout: 300
            - name: high
              connections: 5
              timeout: 180

        environment:
            MINDWAVE_TRACING_ENABLED: true
            MINDWAVE_TRACE_OTLP_ENABLED: true
            OTEL_EXPORTER_OTLP_ENDPOINT: ${HONEYCOMB_ENDPOINT}
            OTEL_EXPORTER_OTLP_HEADERS: 'x-honeycomb-team=${HONEYCOMB_API_KEY}'
```

**Deploy:**

```bash
# Install Vapor CLI
composer require laravel/vapor-cli

# Deploy to production
vapor deploy production
```

**Serverless Considerations:**

-   Use Redis for session/cache (not file-based)
-   Database must be Aurora Serverless or RDS
-   Queue workers run as Lambda functions
-   Cold starts (100-300ms first request)
-   Consider Lambda timeout limits (15 min max)

### AWS (Manual Setup)

**Architecture:**

```
┌─────────────┐
│   Route 53  │ (DNS)
└─────┬───────┘
      │
┌─────▼──────────┐
│  CloudFront    │ (CDN)
└─────┬──────────┘
      │
┌─────▼──────────┐
│  ALB (Load     │
│  Balancer)     │
└─────┬──────────┘
      │
┌─────▼──────────┐     ┌──────────────┐
│  EC2 App       │────▶│  RDS         │
│  Servers (x3)  │     │  PostgreSQL  │
└─────┬──────────┘     └──────────────┘
      │
┌─────▼──────────┐     ┌──────────────┐
│  ElastiCache   │     │  S3 Storage  │
│  Redis         │     │  (Backups)   │
└────────────────┘     └──────────────┘
```

**Terraform Configuration:**

```hcl
# main.tf
provider "aws" {
  region = "us-east-1"
}

# EC2 instances
resource "aws_instance" "app" {
  count         = 3
  ami           = "ami-0c55b159cbfafe1f0"  # Ubuntu 22.04
  instance_type = "t3.medium"

  tags = {
    Name = "mindwave-app-${count.index}"
  }

  user_data = file("${path.module}/scripts/setup-app.sh")
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier        = "mindwave-db"
  engine            = "postgres"
  engine_version    = "15.4"
  instance_class    = "db.t3.medium"
  allocated_storage = 100

  db_name  = "mindwave"
  username = var.db_username
  password = var.db_password

  backup_retention_period = 7
  multi_az               = true

  tags = {
    Name = "mindwave-postgres"
  }
}

# ElastiCache Redis
resource "aws_elasticache_cluster" "redis" {
  cluster_id      = "mindwave-redis"
  engine          = "redis"
  node_type       = "cache.t3.medium"
  num_cache_nodes = 1
  port            = 6379
}

# Application Load Balancer
resource "aws_lb" "app" {
  name               = "mindwave-alb"
  internal           = false
  load_balancer_type = "application"

  enable_deletion_protection = true
}
```

### Docker/Kubernetes

**Dockerfile:**

```dockerfile
# Dockerfile
FROM php:8.3-fpm

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpq-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    && docker-php-ext-install pdo pdo_pgsql pgsql mbstring

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Copy application files
COPY . .

# Install dependencies
RUN composer install --no-dev --optimize-autoloader

# Set permissions
RUN chown -R www-data:www-data /var/www

CMD ["php-fpm"]
```

**docker-compose.yml:**

```yaml
version: '3.8'
services:
    app:
        build: .
        volumes:
            - .:/var/www
            - ./storage:/var/www/storage
        environment:
            - APP_ENV=production
            - DB_HOST=postgres
            - REDIS_HOST=redis
        depends_on:
            - postgres
            - redis

    nginx:
        image: nginx:alpine
        ports:
            - '80:80'
            - '443:443'
        volumes:
            - ./nginx.conf:/etc/nginx/nginx.conf
            - .:/var/www
        depends_on:
            - app

    postgres:
        image: postgres:15
        environment:
            POSTGRES_DB: mindwave
            POSTGRES_USER: user
            POSTGRES_PASSWORD: password
        volumes:
            - postgres_data:/var/lib/postgresql/data

    redis:
        image: redis:7-alpine
        volumes:
            - redis_data:/data

    worker:
        build: .
        command: php artisan queue:work redis --sleep=3 --tries=3
        depends_on:
            - app
            - redis

volumes:
    postgres_data:
    redis_data:
```

**Kubernetes Manifests:**

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
    name: mindwave-app
spec:
    replicas: 3
    selector:
        matchLabels:
            app: mindwave
    template:
        metadata:
            labels:
                app: mindwave
        spec:
            containers:
                - name: app
                  image: your-registry/mindwave:latest
                  ports:
                      - containerPort: 9000
                  env:
                      - name: APP_ENV
                        value: 'production'
                      - name: DB_HOST
                        valueFrom:
                            secretKeyRef:
                                name: mindwave-secrets
                                key: db-host
                      - name: MINDWAVE_OPENAI_API_KEY
                        valueFrom:
                            secretKeyRef:
                                name: mindwave-secrets
                                key: openai-api-key
                  resources:
                      requests:
                          memory: '512Mi'
                          cpu: '500m'
                      limits:
                          memory: '1Gi'
                          cpu: '1000m'
---
apiVersion: v1
kind: Service
metadata:
    name: mindwave-service
spec:
    selector:
        app: mindwave
    ports:
        - protocol: TCP
          port: 80
          targetPort: 9000
    type: LoadBalancer
```

---

## Post-Deployment

### Smoke Tests

```bash
#!/bin/bash
# smoke-tests.sh - Run after deployment

set -e

BASE_URL="https://yourdomain.com"

echo "Running smoke tests..."

# 1. Health check
echo -n "Health check... "
curl -f $BASE_URL/health > /dev/null
echo "✓"

# 2. Homepage loads
echo -n "Homepage... "
curl -f $BASE_URL > /dev/null
echo "✓"

# 3. API endpoints
echo -n "API health... "
curl -f $BASE_URL/api/health > /dev/null
echo "✓"

# 4. Database connection
echo -n "Database... "
php artisan tinker --execute="DB::connection()->getPdo();"
echo "✓"

# 5. Redis connection
echo -n "Redis... "
php artisan tinker --execute="Cache::store('redis')->get('test');"
echo "✓"

# 6. Queue workers
echo -n "Queue workers... "
WORKERS=$(supervisorctl status mindwave-worker:* | grep RUNNING | wc -l)
if [ $WORKERS -lt 2 ]; then
    echo "✗ (only $WORKERS workers running)"
    exit 1
fi
echo "✓ ($WORKERS workers)"

# 7. LLM connectivity
echo -n "LLM API... "
php artisan tinker --execute="
use Mindwave\Mindwave\Facades\Mindwave;
Mindwave::llm()->generateText('test');
"
echo "✓"

echo "All smoke tests passed!"
```

### Monitoring First 24 Hours

**Checklist:**

-   [ ] Monitor error rates (should be < 1%)
-   [ ] Check response times (API endpoints < 500ms)
-   [ ] Verify LLM API calls working
-   [ ] Check queue depth (should drain within minutes)
-   [ ] Monitor memory usage (should stabilize after 1 hour)
-   [ ] Check disk space (ensure backups running)
-   [ ] Verify tracing data being exported
-   [ ] Review cost metrics (compare to expectations)
-   [ ] Check for any security alerts
-   [ ] Verify SSL certificate valid

**Automated Monitoring:**

```php
// app/Console/Commands/MonitorDeployment.php
namespace App\Console\Commands;

use Illuminate\Console\Command;

class MonitorDeployment extends Command
{
    protected $signature = 'deploy:monitor';

    public function handle()
    {
        $this->info('Deployment Health Check');

        // Error rate
        $totalRequests = Trace::where('created_at', '>', now()->subHour())->count();
        $errors = Trace::where('created_at', '>', now()->subHour())
            ->where('status_code', '!=', 'OK')
            ->count();
        $errorRate = $totalRequests > 0 ? ($errors / $totalRequests) * 100 : 0;
        $this->info("Error Rate: {$errorRate}% " . ($errorRate < 1 ? '✓' : '✗'));

        // Response time
        $avgDuration = Span::where('created_at', '>', now()->subHour())
            ->avg('duration');
        $avgMs = $avgDuration / 1_000_000;
        $this->info("Avg Response Time: {$avgMs}ms " . ($avgMs < 500 ? '✓' : '✗'));

        // Queue depth
        $queueSize = Queue::size('default');
        $this->info("Queue Depth: {$queueSize} " . ($queueSize < 100 ? '✓' : '✗'));

        // Cost
        $hourlyCost = Trace::where('created_at', '>', now()->subHour())->sum('estimated_cost');
        $this->info("Hourly Cost: \${$hourlyCost}");
    }
}

// Run every 15 minutes for first 24 hours
$schedule->command('deploy:monitor')->everyFifteenMinutes();
```

### Performance Baselines

Record baseline metrics post-deployment:

```php
// Create baseline snapshot
$baseline = [
    'timestamp' => now(),
    'metrics' => [
        'avg_response_time_ms' => Span::where('created_at', '>', now()->subHour())->avg('duration') / 1_000_000,
        'p95_response_time_ms' => /* calculate p95 */,
        'error_rate_percent' => /* calculate error rate */,
        'requests_per_minute' => Trace::where('created_at', '>', now()->subHour())->count() / 60,
        'avg_llm_latency_ms' => /* calculate LLM latency */,
        'cache_hit_rate_percent' => /* calculate cache hits */,
        'queue_processing_time_ms' => /* calculate queue time */,
    ],
];

Storage::put('baselines/' . now()->format('Y-m-d') . '.json', json_encode($baseline));
```

Use baselines to detect performance regressions.

---

## Maintenance

### Regular Tasks

**Daily:**

-   [ ] Check error logs for critical issues
-   [ ] Review cost reports (compare to budget)
-   [ ] Monitor queue depth (ensure not backing up)
-   [ ] Verify backups completed successfully
-   [ ] Check disk space (ensure > 20% free)

**Weekly:**

-   [ ] Review performance metrics (compare to baseline)
-   [ ] Analyze slow queries (optimize if needed)
-   [ ] Check for failed jobs (retry or investigate)
-   [ ] Review security alerts
-   [ ] Update dependencies (security patches)

**Monthly:**

-   [ ] Rotate API keys (if policy requires)
-   [ ] Review and prune old traces (beyond retention)
-   [ ] Analyze cost trends (optimize model selection)
-   [ ] Review and update alert thresholds
-   [ ] Test backup restoration procedure
-   [ ] Update documentation (runbooks, architecture)

**Quarterly:**

-   [ ] Security audit (dependencies, configurations)
-   [ ] Performance review (identify bottlenecks)
-   [ ] Capacity planning (forecast growth)
-   [ ] Disaster recovery drill (test full recovery)
-   [ ] Review and update SLAs

### Incident Response Plan

**Severity Levels:**

| Level | Description                       | Response Time | Example             |
| ----- | --------------------------------- | ------------- | ------------------- |
| P0    | Critical - Service down           | 15 minutes    | Complete outage     |
| P1    | High - Major functionality broken | 1 hour        | LLM API failures    |
| P2    | Medium - Partial degradation      | 4 hours       | Slow response times |
| P3    | Low - Minor issues                | 24 hours      | Non-critical errors |

**Response Procedure:**

1. **Detection** (0-5 min)

    - Alert triggered (PagerDuty, Slack, email)
    - On-call engineer notified

2. **Assessment** (5-15 min)

    - Determine severity level
    - Identify affected components
    - Estimate user impact

3. **Communication** (15-30 min)

    - Post status update (status page)
    - Notify stakeholders
    - Create incident channel (Slack)

4. **Mitigation** (30-120 min)

    - Implement immediate fix or workaround
    - Rollback if deployment-related
    - Scale resources if capacity issue

5. **Resolution** (variable)

    - Implement permanent fix
    - Verify resolution
    - Post-mortem scheduled

6. **Post-Incident** (24-48 hours)
    - Write post-mortem document
    - Identify root cause
    - Create prevention tasks
    - Update runbooks

**Incident Communication Template:**

```
INCIDENT: [TITLE]
Status: INVESTIGATING / IDENTIFIED / MONITORING / RESOLVED
Severity: P0 / P1 / P2 / P3
Started: 2025-01-19 14:23 UTC
Impact: [Brief description of user impact]

Timeline:
14:23 - Incident detected
14:30 - Team investigating
14:45 - Root cause identified
15:00 - Mitigation in progress
15:30 - Service restored

Updates will be posted every 30 minutes.
```

### On-Call Procedures

**On-Call Responsibilities:**

-   Monitor alerts (PagerDuty, email, Slack)
-   Respond to incidents within SLA
-   Escalate if unable to resolve
-   Document all actions taken
-   Hand off to next on-call with context

**On-Call Runbook:**

````markdown
## Common Issues

### Issue: LLM API Rate Limited (429 Errors)

**Symptoms:**

-   Increased 429 errors in logs
-   Failed LLM requests
-   User complaints about timeouts

**Diagnosis:**

-   Check Sentry/logs for rate limit errors
-   Review LLM API dashboard (provider website)
-   Check request volume spike

**Resolution:**

1. Enable aggressive caching: `php artisan cache:warm`
2. Reduce concurrent requests (scale down workers)
3. Switch to backup LLM provider if available
4. Contact provider support for quota increase
5. Notify users of temporary degradation

**Prevention:**

-   Implement request throttling
-   Monitor usage against quotas
-   Set up alerts at 80% quota usage

---

### Issue: Database Connection Pool Exhausted

**Symptoms:**

-   "Too many connections" errors
-   Slow response times
-   Failed health checks

**Diagnosis:**

-   Check active connections: `SELECT count(*) FROM pg_stat_activity;`
-   Review connection pool settings
-   Check for connection leaks in code

**Resolution:**

1. Restart PHP-FPM: `sudo systemctl restart php8.3-fpm`
2. Kill idle connections:
    ```sql
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE state = 'idle'
    AND state_change < now() - interval '5 minutes';
    ```
````

3. Increase max_connections if needed
4. Scale up database instance

**Prevention:**

-   Enable connection pooling (pgBouncer)
-   Monitor connection usage
-   Fix connection leaks in code

---

### Issue: Queue Workers Stopped

**Symptoms:**

-   Queue depth increasing
-   Delayed background jobs
-   Supervisor shows workers stopped

**Diagnosis:**

-   Check Supervisor: `sudo supervisorctl status`
-   Review worker logs: `/var/www/your-app/storage/logs/worker.log`
-   Check for OOM kills: `dmesg | grep -i kill`

**Resolution:**

1. Restart workers: `sudo supervisorctl restart mindwave-worker:*`
2. If memory issue, reduce worker count or increase server memory
3. Clear stuck jobs: `php artisan queue:flush`

**Prevention:**

-   Monitor worker health
-   Set memory limits in Supervisor config
-   Auto-restart workers on failure

```

---

## Conclusion

You've now configured a production-ready Mindwave deployment with:

- ✅ Secure API key management
- ✅ Optimized database with indexes
- ✅ Queue workers with Supervisor
- ✅ Redis caching layer
- ✅ OpenTelemetry observability
- ✅ Web server tuned for SSE streaming
- ✅ Security hardening
- ✅ Cost monitoring and optimization
- ✅ Automated backups
- ✅ CI/CD pipeline
- ✅ Comprehensive monitoring

### Next Steps

1. **Test thoroughly** - Run smoke tests and load tests
2. **Monitor closely** - Watch first 24 hours carefully
3. **Iterate** - Optimize based on real usage patterns
4. **Document** - Keep runbooks updated
5. **Scale** - Adjust resources as traffic grows

### Getting Help

- **Documentation:** [https://mindwave.no/docs](https://mindwave.no/docs)
- **GitHub Issues:** [https://github.com/mindwave/mindwave/issues](https://github.com/mindwave/mindwave/issues)
- **Discord Community:** [https://discord.gg/mindwave](https://discord.gg/mindwave)

### Additional Resources

- [Laravel Deployment Documentation](https://laravel.com/docs/deployment)
- [OpenTelemetry Best Practices](https://opentelemetry.io/docs/best-practices/)
- [LLM Cost Optimization Guide](https://platform.openai.com/docs/guides/cost-optimization)
- [Kubernetes Production Checklist](https://kubernetes.io/docs/setup/best-practices/)

**Happy Deploying!** 🚀
```
