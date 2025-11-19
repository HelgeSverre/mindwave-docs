# Artisan Commands Reference

Complete reference for all Mindwave Artisan commands. This guide covers trace management, index maintenance, code generation, and automation strategies for production environments.

## Overview

Mindwave provides 6 powerful Artisan commands for managing your AI application infrastructure:

| Category | Commands | Purpose |
|----------|----------|---------|
| **Tracing** | `export-traces`, `prune-traces`, `trace-stats` | Manage and analyze LLM traces |
| **Indexes** | `index-stats`, `clear-indexes` | Maintain TNTSearch context indexes |
| **Code Generation** | `tool` | Generate tool classes |

### Quick Command Reference

```bash
# View all Mindwave commands
php artisan list mindwave

# Get help for any command
php artisan help mindwave:export-traces
```

---

## Tracing Commands

### mindwave:export-traces

Export trace data to JSON, CSV, or NDJSON format for analysis, backup, or integration with external tools.

**Signature:**
```bash
php artisan mindwave:export-traces [options]
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--since` | string | - | Export traces from this date (e.g., "yesterday", "2024-01-01") |
| `--until` | string | - | Export traces until this date |
| `--format` | string | `json` | Output format: `csv`, `json`, or `ndjson` |
| `--output` | string | stdout | Output file path |
| `--provider` | string | - | Filter by provider name (e.g., "openai", "anthropic") |
| `--min-cost` | float | - | Filter by minimum cost in USD |
| `--slow` | int | - | Filter by minimum duration in milliseconds |

**Examples:**

```bash
# Export all traces to JSON
php artisan mindwave:export-traces --format=json --output=traces.json

# Export to CSV
php artisan mindwave:export-traces --format=csv --output=traces.csv

# Export to NDJSON (newline-delimited JSON)
php artisan mindwave:export-traces --format=ndjson --output=traces.ndjson

# Export only OpenAI traces from yesterday
php artisan mindwave:export-traces \
    --provider=openai \
    --since=yesterday \
    --format=json \
    --output=openai-traces.json

# Export expensive traces (>$0.10)
php artisan mindwave:export-traces \
    --min-cost=0.10 \
    --format=csv \
    --output=expensive-traces.csv

# Export slow requests (>5 seconds)
php artisan mindwave:export-traces \
    --slow=5000 \
    --format=json \
    --output=slow-traces.json

# Date range export
php artisan mindwave:export-traces \
    --since="2025-01-01" \
    --until="2025-01-31" \
    --format=csv \
    --output=january-traces.csv

# Combine multiple filters
php artisan mindwave:export-traces \
    --provider=openai \
    --since="last week" \
    --min-cost=0.05 \
    --slow=2000 \
    --format=json
```

**Output to stdout:**
```bash
# Pipe to other tools
php artisan mindwave:export-traces --format=json | jq '.[] | .trace_id'

# Compress while exporting
php artisan mindwave:export-traces --format=json | gzip > traces.json.gz
```

**CSV Output Format:**

```csv
trace_id,service_name,start_time,end_time,duration_ms,status,total_spans,total_input_tokens,total_output_tokens,total_tokens,estimated_cost,created_at
01234567-89ab-cdef,mindwave-app,2025-01-15 10:30:00,2025-01-15 10:30:02,2000,ok,3,150,300,450,0.0045,2025-01-15T10:30:02+00:00
```

**JSON Output Format:**

```json
[
  {
    "trace_id": "01234567-89ab-cdef-0123-456789abcdef",
    "service_name": "mindwave-app",
    "start_time": "2025-01-15 10:30:00",
    "end_time": "2025-01-15 10:30:02",
    "duration_ms": 2000,
    "status": "ok",
    "total_spans": 3,
    "total_input_tokens": 150,
    "total_output_tokens": 300,
    "total_tokens": 450,
    "estimated_cost": 0.0045,
    "metadata": {},
    "created_at": "2025-01-15T10:30:02+00:00",
    "spans": [
      {
        "span_id": "abc123",
        "parent_span_id": null,
        "name": "chat.completion",
        "kind": "llm",
        "operation_name": "chat",
        "provider_name": "openai",
        "request_model": "gpt-4-turbo",
        "response_model": "gpt-4-turbo",
        "input_tokens": 150,
        "output_tokens": 300,
        "temperature": 0.7,
        "max_tokens": 500,
        "status_code": 200
      }
    ]
  }
]
```

**NDJSON Output Format:**

Each line is a complete JSON object (one trace per line):

```json
{"trace_id":"01234567-89ab-cdef","service_name":"mindwave-app","spans":[...]}
{"trace_id":"98765432-fedc-ba98","service_name":"mindwave-app","spans":[...]}
```

**Use Cases:**

- **Backup traces** before pruning old data
- **Cost analysis** in spreadsheet applications
- **Data pipeline integration** with analytics tools
- **Compliance reporting** for AI usage audits
- **Performance analysis** in external monitoring systems

**Exit Codes:**

- `0` - Success
- `1` - Invalid format, date parsing error, or file I/O error

---

### mindwave:prune-traces

Delete old traces from the database to manage storage and comply with data retention policies.

**Signature:**
```bash
php artisan mindwave:prune-traces [options]
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--older-than` | int | `30` | Delete traces older than this many days |
| `--dry-run` | flag | - | Show what would be deleted without actually deleting |
| `--keep-errors` | flag | - | Keep traces with error status |
| `--batch-size` | int | `500` | Number of traces to delete per batch |
| `--force` | flag | - | Skip confirmation prompt |

**Examples:**

```bash
# Delete traces older than 30 days (default)
php artisan mindwave:prune-traces

# Delete traces older than 90 days
php artisan mindwave:prune-traces --older-than=90

# Dry run - see what would be deleted
php artisan mindwave:prune-traces --older-than=30 --dry-run

# Keep error traces for debugging
php artisan mindwave:prune-traces --older-than=30 --keep-errors

# Skip confirmation (for automation)
php artisan mindwave:prune-traces --older-than=30 --force

# Custom batch size for large datasets
php artisan mindwave:prune-traces --older-than=30 --batch-size=1000

# Combine options
php artisan mindwave:prune-traces \
    --older-than=60 \
    --keep-errors \
    --batch-size=200 \
    --force
```

**Example Output:**

```
Traces older than 30 days (before 2024-12-16):
┌──────────────────────────┬────────────┐
│ Metric                   │ Count      │
├──────────────────────────┼────────────┤
│ Traces to delete         │ 1,234      │
│ Related spans to delete  │ 3,456      │
└──────────────────────────┴────────────┘

Delete 1,234 traces and 3,456 spans? (yes/no) [no]:
> yes

Deleting traces...
 1234/1234 [▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓] 100%

Successfully deleted 1,234 traces and their related spans.
```

**Dry Run Output:**

```
Traces older than 30 days (before 2024-12-16):
┌──────────────────────────┬────────────┐
│ Metric                   │ Count      │
├──────────────────────────┼────────────┤
│ Traces to delete         │ 1,234      │
│ Related spans to delete  │ 3,456      │
└──────────────────────────┴────────────┘

DRY RUN - No data will be deleted.

Sample traces to be deleted:
┌──────────────────┬─────────────┬────────────┬────────┬───────┬─────────┐
│ Trace ID         │ Service     │ Created At │ Status │ Spans │ Cost    │
├──────────────────┼─────────────┼────────────┼────────┼───────┼─────────┤
│ 01234567-89ab... │ mindwave-app│ 2024-11-15 │ ok     │ 3     │ $0.0045 │
│ 98765432-fedc... │ mindwave-app│ 2024-11-14 │ ok     │ 2     │ $0.0032 │
└──────────────────┴─────────────┴────────────┴────────┴───────┴─────────┘
```

**Use Cases:**

- **Storage management** - Free up database space
- **Compliance** - Meet data retention policies (GDPR, etc.)
- **Performance** - Keep trace tables lean and queries fast
- **Cost optimization** - Reduce database storage costs
- **Debugging** - Keep error traces while removing successful ones

**Best Practices:**

1. **Always dry-run first** to verify what will be deleted
2. **Export before pruning** to maintain backups
3. **Keep errors longer** for debugging (`--keep-errors`)
4. **Schedule regularly** to maintain consistent database size
5. **Monitor batch size** - adjust for large deletions

**Exit Codes:**

- `0` - Success
- `1` - Invalid parameters (negative days or batch size)

---

### mindwave:trace-stats

Display comprehensive trace statistics and analytics with visual charts.

**Signature:**
```bash
php artisan mindwave:trace-stats [options]
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--since` | string | - | Show statistics from this date (e.g., "yesterday", "2024-01-01") |
| `--provider` | string | - | Filter by provider name |
| `--model` | string | - | Filter by model name |

**Examples:**

```bash
# View all trace statistics
php artisan mindwave:trace-stats

# Statistics since yesterday
php artisan mindwave:trace-stats --since=yesterday

# Statistics for specific date
php artisan mindwave:trace-stats --since="2025-01-01"

# Filter by provider
php artisan mindwave:trace-stats --provider=openai

# Filter by model
php artisan mindwave:trace-stats --model=gpt-4-turbo

# Combine filters
php artisan mindwave:trace-stats \
    --since="last week" \
    --provider=openai \
    --model=gpt-4-turbo
```

**Example Output:**

```
Mindwave Trace Statistics

Overall Statistics
┌──────────────────────┬──────────┐
│ Metric               │ Value    │
├──────────────────────┼──────────┤
│ Total Traces         │ 1,234    │
│ Total Spans          │ 3,456    │
│ Completed Traces     │ 1,200    │
│ Avg Spans per Trace  │ 2.80     │
└──────────────────────┴──────────┘

Token Usage
┌─────────────────────┬───────────┐
│ Metric              │ Value     │
├─────────────────────┼───────────┤
│ Total Input Tokens  │ 150,000   │
│ Total Output Tokens │ 300,000   │
│ Total Tokens        │ 450,000   │
│ Avg Input Tokens    │ 121.55    │
│ Avg Output Tokens   │ 243.09    │
└─────────────────────┴───────────┘

Token Distribution:
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
Input: 33.3% | Output: 66.7%

Cost Analysis
┌──────────────┬──────────┐
│ Metric       │ Value    │
├──────────────┼──────────┤
│ Total Cost   │ $45.6789 │
│ Average Cost │ $0.0370  │
│ Min Cost     │ $0.0001  │
│ Max Cost     │ $1.2345  │
└──────────────┴──────────┘

Performance Metrics
┌──────────────┬─────────┐
│ Metric       │ Value   │
├──────────────┼─────────┤
│ Avg Duration │ 1234.56 ms │
│ Min Duration │ 100.23 ms  │
│ Max Duration │ 9876.54 ms │
└──────────────┴─────────┘

Top Models by Usage
┌────────────────────┬────────┬──────────────┬────────────────────────────────┐
│ Model              │ Uses   │ Total Tokens │ Chart                          │
├────────────────────┼────────┼──────────────┼────────────────────────────────┤
│ gpt-4-turbo        │ 800    │ 360,000      │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ gpt-3.5-turbo      │ 300    │ 60,000       │ ▓▓▓▓▓▓▓▓▓▓▓                     │
│ claude-3-opus      │ 100    │ 25,000       │ ▓▓▓▓                            │
│ mistral-large      │ 34     │ 5,000        │ ▓▓                              │
└────────────────────┴────────┴──────────────┴────────────────────────────────┘

Top Models by Cost
┌────────────────────┬────────┬───────────┬────────────────────────────────┐
│ Model              │ Uses   │ Avg Cost  │ Chart                          │
├────────────────────┼────────┼───────────┼────────────────────────────────┤
│ gpt-4-turbo        │ 800    │ $0.0450   │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ claude-3-opus      │ 100    │ $0.0380   │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓       │
│ gpt-3.5-turbo      │ 300    │ $0.0020   │ ▓▓                              │
│ mistral-large      │ 34     │ $0.0015   │ ▓                               │
└────────────────────┴────────┴───────────┴────────────────────────────────┘

Error Analysis
┌─────────────┬────────┐
│ Metric      │ Value  │
├─────────────┼────────┤
│ Total Errors│ 34     │
│ Error Rate  │ 2.75%  │
└─────────────┴────────┘

Success vs Errors:
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
Success: 97.25% | Errors: 2.75%
```

**Use Cases:**

- **Daily monitoring** - Check usage and costs
- **Performance analysis** - Identify slow models
- **Cost optimization** - Compare provider costs
- **Quality assurance** - Monitor error rates
- **Capacity planning** - Analyze usage trends
- **Budget reporting** - Generate usage summaries

**Integration with Monitoring:**

```bash
# Daily stats email
php artisan mindwave:trace-stats --since=yesterday | mail -s "Daily AI Stats" team@company.com

# Export stats to log
php artisan mindwave:trace-stats --since=yesterday >> /var/log/mindwave-stats.log

# Prometheus metrics (parse output)
php artisan mindwave:trace-stats | grep "Total Cost" | awk '{print $4}'
```

**Exit Codes:**

- `0` - Success
- `1` - Invalid date format

---

## Index Management Commands

### mindwave:index-stats

Display statistics about TNTSearch context indexes used by Context Discovery.

**Signature:**
```bash
php artisan mindwave:index-stats
```

**No Options** - This command displays current index statistics.

**Examples:**

```bash
# View index statistics
php artisan mindwave:index-stats
```

**Example Output:**

```
📊 TNTSearch Index Statistics

┌─────────────────────┬──────────────────────────────────────────┐
│ Metric              │ Value                                    │
├─────────────────────┼──────────────────────────────────────────┤
│ Total Indexes       │ 12                                       │
│ Total Size (MB)     │ 45.67                                    │
│ Total Size (Bytes)  │ 47,894,528                               │
│ Storage Path        │ /app/storage/mindwave/tnt-indexes        │
└─────────────────────┴──────────────────────────────────────────┘

💡 Tip: Run "php artisan mindwave:clear-indexes" to remove old indexes
```

**Use Cases:**

- **Monitor disk usage** - Track index storage consumption
- **Identify cleanup needs** - See when indexes should be cleared
- **Troubleshooting** - Verify indexes are being created
- **Capacity planning** - Monitor index growth over time

**Integration:**

```bash
# Check if indexes exceed threshold
SIZE=$(php artisan mindwave:index-stats | grep "Total Size (MB)" | awk '{print $5}')
if (( $(echo "$SIZE > 100" | bc -l) )); then
    php artisan mindwave:clear-indexes --force
fi
```

**Exit Codes:**

- `0` - Success

---

### mindwave:clear-indexes

Clear old TNTSearch context indexes to free up disk space.

**Signature:**
```bash
php artisan mindwave:clear-indexes [options]
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--ttl` | int | `24` | Time to live in hours (indexes older than this are deleted) |
| `--force` | flag | - | Skip confirmation prompt |

**Examples:**

```bash
# Clear indexes older than 24 hours (default)
php artisan mindwave:clear-indexes

# Clear indexes older than 12 hours
php artisan mindwave:clear-indexes --ttl=12

# Clear indexes older than 1 hour
php artisan mindwave:clear-indexes --ttl=1

# Skip confirmation (for automation)
php artisan mindwave:clear-indexes --force

# Aggressive cleanup
php artisan mindwave:clear-indexes --ttl=1 --force
```

**Example Output:**

```
🔍 Found 12 index(es) (45.67 MB)
⏰ Clearing indexes older than 24 hours

Do you want to proceed? (yes/no) [yes]:
> yes

✅ Cleared 8 index(es)
💾 Freed 32.45 MB

ℹ️  4 active index(es) remaining
```

**With --force flag:**

```
🔍 Found 12 index(es) (45.67 MB)
⏰ Clearing indexes older than 24 hours

✅ Cleared 8 index(es)
💾 Freed 32.45 MB

ℹ️  4 active index(es) remaining
```

**No indexes to clear:**

```
✨ No indexes to clear
```

**Use Cases:**

- **Regular maintenance** - Clear ephemeral indexes automatically
- **Disk space management** - Free up storage space
- **Performance optimization** - Remove unused index files
- **Testing cleanup** - Clear test indexes after development

**Best Practices:**

1. **Check stats first** - Run `mindwave:index-stats` to see current usage
2. **Conservative TTL** - Default 24 hours works well for most applications
3. **Schedule regularly** - Add to daily maintenance cron jobs
4. **Monitor active indexes** - Don't clear too aggressively if indexes are in use

**Exit Codes:**

- `0` - Success

---

## Code Generation Commands

### mindwave:tool

Generate a new tool class for use with Mindwave's tool/function calling features.

**Signature:**
```bash
php artisan mindwave:tool {name} [options]
```

**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `name` | string | The name of the tool class |

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--description`, `-d` | string | - | Description of the tool |
| `--force`, `-f` | flag | - | Create the class even if the tool already exists |

**Examples:**

```bash
# Generate a basic tool
php artisan mindwave:tool WeatherTool

# Generate with description
php artisan mindwave:tool WeatherTool --description="Get current weather information"

# Short option
php artisan mindwave:tool WeatherTool -d "Get current weather"

# Force overwrite existing tool
php artisan mindwave:tool WeatherTool --force

# Combine options
php artisan mindwave:tool CalculatorTool -d "Perform mathematical calculations" -f
```

**Generated File Location:**

```
app/Mindwave/Tools/WeatherTool.php
```

**Generated Class Structure:**

```php
<?php

namespace App\Mindwave\Tools;

class WeatherTool
{
    /**
     * Get current weather information
     */
    public function __invoke(): mixed
    {
        // Tool implementation
    }
}
```

**Use Cases:**

- **Rapid scaffolding** - Quickly generate tool boilerplate
- **Consistent structure** - Follow Mindwave conventions
- **Team productivity** - Standardize tool creation across team

**Exit Codes:**

- `0` - Success
- `1` - Tool already exists (without `--force`)

---

## Automation & Scheduling

### Laravel Scheduler Integration

Schedule Mindwave commands to run automatically using Laravel's task scheduler.

**Add to `app/Console/Kernel.php`:**

```php
<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    protected function schedule(Schedule $schedule): void
    {
        // Prune old traces daily at 2 AM
        $schedule->command('mindwave:prune-traces --older-than=30 --force')
            ->daily()
            ->at('02:00')
            ->onSuccess(function () {
                Log::info('Successfully pruned old traces');
            })
            ->onFailure(function () {
                Log::error('Failed to prune traces');
            });

        // Clear old indexes every 6 hours
        $schedule->command('mindwave:clear-indexes --ttl=24 --force')
            ->everySixHours()
            ->withoutOverlapping();

        // Daily stats report at 9 AM
        $schedule->command('mindwave:trace-stats --since=yesterday')
            ->dailyAt('09:00')
            ->sendOutputTo(storage_path('logs/daily-stats.txt'));

        // Weekly export every Sunday at midnight
        $schedule->command('mindwave:export-traces --since="last week" --format=json --output=weekly-backup.json')
            ->weekly()
            ->sundays()
            ->at('00:00');

        // Monthly cost report
        $schedule->command('mindwave:trace-stats --since="last month"')
            ->monthly()
            ->sendOutputTo(storage_path('reports/monthly-stats.txt'))
            ->emailOutputTo('team@company.com');
    }
}
```

### Cron Examples

**Direct cron scheduling:**

```bash
# Add to crontab (crontab -e)

# Prune traces daily at 2 AM
0 2 * * * cd /var/www/app && php artisan mindwave:prune-traces --older-than=30 --force >> /var/log/mindwave-prune.log 2>&1

# Clear indexes every 6 hours
0 */6 * * * cd /var/www/app && php artisan mindwave:clear-indexes --force >> /var/log/mindwave-indexes.log 2>&1

# Daily stats at 9 AM
0 9 * * * cd /var/www/app && php artisan mindwave:trace-stats --since=yesterday >> /var/log/mindwave-stats.log 2>&1

# Weekly export on Sunday at midnight
0 0 * * 0 cd /var/www/app && php artisan mindwave:export-traces --since="last week" --format=json --output=/backups/weekly-$(date +\%Y\%m\%d).json

# Monthly cleanup on first day of month
0 3 1 * * cd /var/www/app && php artisan mindwave:prune-traces --older-than=90 --force
```

### Production Automation Patterns

#### Pattern 1: Data Retention Lifecycle

```php
// Export, then prune - data retention with backup
$schedule->command('mindwave:export-traces --since="31 days ago" --until="30 days ago" --format=json --output=archive-$(date +\%Y\%m).json')
    ->daily()
    ->at('01:00');

$schedule->command('mindwave:prune-traces --older-than=30 --force')
    ->daily()
    ->at('01:30');
```

#### Pattern 2: Cost Monitoring with Alerts

```php
// Daily cost check with custom logic
$schedule->call(function () {
    $output = Artisan::output();
    Artisan::call('mindwave:trace-stats --since=yesterday');

    // Parse output and check thresholds
    $stats = Artisan::output();
    if (preg_match('/Total Cost.*\$([\d.]+)/', $stats, $matches)) {
        $cost = (float) $matches[1];

        if ($cost > 100.00) {
            // Send alert
            Mail::to('alerts@company.com')->send(new HighCostAlert($cost));
        }
    }
})->dailyAt('08:00');
```

#### Pattern 3: Conditional Cleanup

```php
// Only clear indexes if storage exceeds threshold
$schedule->call(function () {
    Artisan::call('mindwave:index-stats');
    $output = Artisan::output();

    if (preg_match('/Total Size \(MB\)\s+│\s+([\d.]+)/', $output, $matches)) {
        $sizeMB = (float) $matches[1];

        if ($sizeMB > 100) {
            Artisan::call('mindwave:clear-indexes --force');
            Log::info("Cleared indexes: {$sizeMB} MB exceeded threshold");
        }
    }
})->hourly();
```

#### Pattern 4: Multi-Environment Scheduling

```php
// Different schedules for different environments
if (app()->environment('production')) {
    // Production: conservative retention
    $schedule->command('mindwave:prune-traces --older-than=90 --keep-errors --force')
        ->weekly();
} else {
    // Development/Staging: aggressive cleanup
    $schedule->command('mindwave:prune-traces --older-than=7 --force')
        ->daily();
}
```

### Health Check Integration

```php
// Monitor command execution health
$schedule->command('mindwave:trace-stats --since=yesterday')
    ->daily()
    ->pingBefore('https://healthchecks.io/xxx/start')
    ->thenPing('https://healthchecks.io/xxx');
```

### Slack Notifications

```php
use Illuminate\Support\Facades\Notification;
use App\Notifications\TraceStatsNotification;

$schedule->call(function () {
    Artisan::call('mindwave:trace-stats --since=yesterday');
    $stats = Artisan::output();

    Notification::route('slack', env('SLACK_WEBHOOK_URL'))
        ->notify(new TraceStatsNotification($stats));
})->dailyAt('09:00');
```

---

## Advanced Usage

### Chaining Commands

```bash
# Export before pruning
php artisan mindwave:export-traces --since="31 days ago" --format=json --output=backup.json && \
php artisan mindwave:prune-traces --older-than=30 --force

# Check stats, then conditional cleanup
COST=$(php artisan mindwave:trace-stats --since=yesterday | grep "Total Cost" | awk '{print $4}' | tr -d '$') && \
if (( $(echo "$COST > 50" | bc -l) )); then \
    echo "High cost detected: \$$COST" | mail -s "AI Cost Alert" team@company.com; \
fi
```

### Output Redirection

```bash
# Capture output to file
php artisan mindwave:trace-stats > stats.txt

# Append to log
php artisan mindwave:trace-stats >> /var/log/mindwave-stats.log

# Separate stdout and stderr
php artisan mindwave:prune-traces --force > prune-output.log 2> prune-errors.log

# Discard output
php artisan mindwave:clear-indexes --force > /dev/null 2>&1
```

### Piping and Processing

```bash
# JSON parsing with jq
php artisan mindwave:export-traces --format=json | jq '.[] | select(.estimated_cost > 0.10)'

# CSV to Excel
php artisan mindwave:export-traces --format=csv | ssconvert - report.xlsx

# Count expensive traces
php artisan mindwave:export-traces --format=json | jq '[.[] | select(.estimated_cost > 0.10)] | length'

# Extract trace IDs
php artisan mindwave:export-traces --format=json | jq -r '.[].trace_id' > trace-ids.txt
```

### Exit Code Handling

```bash
# Check exit code
php artisan mindwave:prune-traces --force
if [ $? -eq 0 ]; then
    echo "Prune successful"
else
    echo "Prune failed"
    exit 1
fi

# Conditional execution
php artisan mindwave:export-traces --format=json --output=backup.json && \
php artisan mindwave:prune-traces --force || \
echo "Export or prune failed" | mail -s "Mindwave Error" admin@company.com
```

### Environment-Specific Commands

```bash
# Development
php artisan mindwave:trace-stats --since=yesterday

# Staging with specific provider
php artisan mindwave:trace-stats --provider=openai --since="last week"

# Production with filters
php artisan mindwave:trace-stats --min-cost=0.10 --since="last month"
```

---

## Troubleshooting

### Command Not Found

**Problem:** `Command "mindwave:xxx" is not defined.`

**Solutions:**

```bash
# 1. Clear cache
php artisan cache:clear
php artisan config:clear

# 2. Verify package installation
composer show mindwave/mindwave

# 3. Check service provider is registered
# In config/app.php, verify:
# Mindwave\Mindwave\MindwaveServiceProvider::class is in 'providers' array

# 4. Re-discover packages
composer dump-autoload
php artisan package:discover
```

### Permission Issues

**Problem:** `Permission denied` when writing exports or clearing indexes.

**Solutions:**

```bash
# 1. Check storage permissions
ls -la storage/

# 2. Fix permissions
chmod -R 775 storage/
chown -R www-data:www-data storage/

# 3. Create missing directories
mkdir -p storage/mindwave/tnt-indexes
chmod 775 storage/mindwave/tnt-indexes

# 4. Use custom output path with permissions
php artisan mindwave:export-traces --output=/tmp/traces.json
```

### Memory Limits

**Problem:** `Allowed memory size exhausted` when exporting or pruning large datasets.

**Solutions:**

```bash
# 1. Increase PHP memory limit temporarily
php -d memory_limit=512M artisan mindwave:export-traces --format=json --output=traces.json

# 2. Use smaller batch sizes
php artisan mindwave:prune-traces --batch-size=100 --force

# 3. Export in smaller chunks
php artisan mindwave:export-traces --since="2025-01-01" --until="2025-01-07" --output=week1.json
php artisan mindwave:export-traces --since="2025-01-08" --until="2025-01-14" --output=week2.json

# 4. Update php.ini
# memory_limit = 512M
```

### Database Connection Issues

**Problem:** `SQLSTATE[HY000]` or connection timeout errors.

**Solutions:**

```bash
# 1. Verify database connection
php artisan tinker
>>> DB::connection()->getPdo();

# 2. Check .env configuration
cat .env | grep DB_

# 3. Test trace table exists
php artisan tinker
>>> DB::table('mindwave_traces')->count();

# 4. Run migrations if missing
php artisan migrate

# 5. Use specific connection
DB_CONNECTION=mysql php artisan mindwave:trace-stats
```

### Export Format Errors

**Problem:** `Invalid format: xyz. Must be csv, json, or ndjson.`

**Solutions:**

```bash
# Use valid formats only
php artisan mindwave:export-traces --format=json   # ✓
php artisan mindwave:export-traces --format=csv    # ✓
php artisan mindwave:export-traces --format=ndjson # ✓
php artisan mindwave:export-traces --format=xml    # ✗ Invalid
```

### Date Parsing Errors

**Problem:** `Invalid since date: xyz`

**Solutions:**

```bash
# Valid date formats
php artisan mindwave:export-traces --since="2025-01-01"        # ISO date
php artisan mindwave:export-traces --since="yesterday"         # Relative
php artisan mindwave:export-traces --since="last week"         # Relative
php artisan mindwave:export-traces --since="2025-01-01 10:30"  # With time

# Invalid formats
php artisan mindwave:export-traces --since="01/01/2025"        # ✗ Wrong format
php artisan mindwave:export-traces --since="Jan 1 2025"        # ✗ Wrong format
```

### No Traces Found

**Problem:** `No traces found matching the criteria.`

**Solutions:**

```bash
# 1. Check if tracing is enabled
php artisan tinker
>>> config('mindwave-tracing.enabled');

# 2. Verify traces exist
php artisan tinker
>>> \Mindwave\Mindwave\Observability\Models\Trace::count();

# 3. Remove filters to see all traces
php artisan mindwave:trace-stats  # Without filters

# 4. Check date range
php artisan mindwave:export-traces --since="2020-01-01"  # Wider range
```

### Scheduler Not Running

**Problem:** Scheduled commands don't execute.

**Solutions:**

```bash
# 1. Verify scheduler cron is set up
crontab -l | grep schedule:run
# Should show: * * * * * cd /path-to-app && php artisan schedule:run >> /dev/null 2>&1

# 2. Add scheduler cron
crontab -e
# Add: * * * * * cd /var/www/app && php artisan schedule:run >> /dev/null 2>&1

# 3. Test scheduler manually
php artisan schedule:run

# 4. Check schedule list
php artisan schedule:list

# 5. Test specific command
php artisan schedule:test
```

### Index Cleanup Issues

**Problem:** `clear-indexes` doesn't free space or errors.

**Solutions:**

```bash
# 1. Check index stats first
php artisan mindwave:index-stats

# 2. Verify storage path exists
ls -la storage/mindwave/tnt-indexes/

# 3. Manual cleanup
rm -rf storage/mindwave/tnt-indexes/*.index

# 4. Check disk space
df -h

# 5. Force cleanup with short TTL
php artisan mindwave:clear-indexes --ttl=0 --force
```

---

## Command Summary

### Quick Reference Table

| Command | Purpose | Common Options | Frequency |
|---------|---------|----------------|-----------|
| `export-traces` | Export trace data | `--format`, `--since`, `--provider` | Weekly/Monthly |
| `prune-traces` | Delete old traces | `--older-than`, `--force`, `--keep-errors` | Daily/Weekly |
| `trace-stats` | View analytics | `--since`, `--provider`, `--model` | Daily |
| `index-stats` | Check index usage | - | As needed |
| `clear-indexes` | Clean up indexes | `--ttl`, `--force` | Daily/6h |
| `tool` | Generate tool class | `--description`, `--force` | As needed |

### Recommended Daily Workflow

```bash
# Morning: Check yesterday's stats
php artisan mindwave:trace-stats --since=yesterday

# Monitor index growth
php artisan mindwave:index-stats

# Automated (scheduled):
# - Prune old traces: 2 AM daily
# - Clear indexes: Every 6 hours
# - Weekly backup: Sunday midnight
```

### Production Checklist

- [ ] Schedule `prune-traces` to run daily/weekly
- [ ] Schedule `clear-indexes` to run every 6-24 hours
- [ ] Set up weekly/monthly exports for backups
- [ ] Configure monitoring for `trace-stats` output
- [ ] Set up alerts for high costs or error rates
- [ ] Document retention policies for compliance
- [ ] Test all scheduled commands in staging first
- [ ] Monitor disk space and database growth
- [ ] Configure proper logging and error handling
- [ ] Set up health checks for critical commands

---

## Additional Resources

- [Tracing Documentation](/docs/observability/tracing) - OpenTelemetry tracing guide
- [Context Discovery](/docs/context-discovery/overview) - TNTSearch context indexes
- [Configuration Reference](/docs/reference/configuration) - All config options
- [API Reference](/docs/reference/api) - Programmatic access to traces

---

**Last Updated:** 2025-01-19
**Mindwave Version:** 1.0
**Total Commands Documented:** 6
