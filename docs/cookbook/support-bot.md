# Customer Support Bot

Build an intelligent, production-ready customer support bot using Mindwave's RAG capabilities, streaming responses, and observability features. This cookbook demonstrates a complete implementation that searches historical tickets, provides context-aware answers, and streams responses in real-time.

## What We're Building

An AI-powered support bot that:

- **Searches past tickets** - Finds similar resolved issues using TNTSearch
- **Provides context-aware answers** - Uses ticket resolutions to inform responses
- **Streams responses** - Real-time SSE streaming for immediate feedback
- **Tracks performance** - Built-in OpenTelemetry tracing and cost monitoring
- **Handles escalation** - Knows when to route to human agents
- **Supports multiple channels** - API endpoint for web, mobile, and chat integrations

## What You'll Learn

- Setting up TNTSearch for ticket indexing
- Building a RAG-powered support service
- Streaming responses to users
- Testing and cost optimization
- Production deployment patterns

## Prerequisites

- Laravel 10+ application
- Mindwave installed and configured
- OpenAI API key (or other supported LLM provider)
- Basic understanding of Eloquent models

```bash
composer require mindwave/mindwave
php artisan vendor:publish --tag="mindwave-config"
php artisan migrate
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Question                            │
│              "My password reset isn't working"               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────┐
│               SupportBotController                          │
│          (validates, rate limits, authenticates)            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────┐
│               SupportBotService                             │
│  1. Search similar tickets (TNTSearch)                      │
│  2. Build prompt with context (PromptComposer)              │
│  3. Generate response (LLM)                                 │
│  4. Stream to user (SSE)                                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ↓             ↓             ↓
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│  TNTSearch   │ │ Prompt   │ │   OpenAI     │
│   (BM25)     │ │Composer  │ │   API        │
└──────────────┘ └──────────┘ └──────────────┘
        │             │             │
        └─────────────┼─────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────────┐
│            OpenTelemetry Tracing                            │
│     (tracks costs, tokens, search performance)              │
└─────────────────────────────────────────────────────────────┘
```

## Step 1: Database Setup

### Migration

Create the support tickets table:

```bash
php artisan make:migration create_support_tickets_table
```

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            // Ticket details
            $table->string('ticket_number')->unique();
            $table->string('subject');
            $table->text('description');
            $table->enum('status', ['open', 'in_progress', 'resolved', 'closed'])->default('open');
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
            $table->string('category')->nullable();

            // Resolution details
            $table->text('resolution')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->integer('rating')->nullable(); // 1-5 stars

            // Assignment
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('assigned_at')->nullable();

            // Metadata
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['status', 'rating']);
            $table->index('category');
            $table->index('resolved_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_tickets');
    }
};
```

### Model

Create the SupportTicket model:

```bash
php artisan make:model SupportTicket
```

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class SupportTicket extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'ticket_number',
        'subject',
        'description',
        'status',
        'priority',
        'category',
        'resolution',
        'resolved_at',
        'resolved_by',
        'rating',
        'assigned_to',
        'assigned_at',
        'metadata',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
        'assigned_at' => 'datetime',
        'metadata' => 'array',
        'rating' => 'integer',
    ];

    /**
     * User who created the ticket
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Agent assigned to the ticket
     */
    public function assignedAgent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * Agent who resolved the ticket
     */
    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    /**
     * Scope for high-quality resolved tickets (good for training)
     */
    public function scopeHighQualityResolved($query)
    {
        return $query->where('status', 'resolved')
            ->where('rating', '>=', 4)
            ->whereNotNull('resolution');
    }

    /**
     * Scope for recent tickets
     */
    public function scopeRecent($query, int $days = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Scope by category
     */
    public function scopeCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Format ticket for context in prompts
     */
    public function toContextString(): string
    {
        return sprintf(
            "Ticket #%s [%s]\nSubject: %s\nIssue: %s\nResolution: %s\nCategory: %s\nRating: %s/5",
            $this->ticket_number,
            $this->status,
            $this->subject,
            $this->description,
            $this->resolution ?? 'N/A',
            $this->category ?? 'General',
            $this->rating ?? 'N/A'
        );
    }

    /**
     * Format ticket for search indexing
     */
    public function toSearchableString(): string
    {
        return sprintf(
            "%s %s %s %s",
            $this->subject,
            $this->description,
            $this->resolution ?? '',
            $this->category ?? ''
        );
    }
}
```

### Seeder

Create sample data for testing:

```bash
php artisan make:seeder SupportTicketSeeder
```

```php
<?php

namespace Database\Seeders;

use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Database\Seeder;

class SupportTicketSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first();
        $agent = User::where('email', 'agent@example.com')->first() ?? $user;

        $tickets = [
            [
                'subject' => 'Password reset email not received',
                'description' => 'I requested a password reset 30 minutes ago but haven\'t received the email. I checked spam folder.',
                'category' => 'Authentication',
                'priority' => 'high',
                'resolution' => 'Issue was caused by typo in email address. Corrected email and resent reset link. Also added email verification step to prevent this in future.',
                'rating' => 5,
            ],
            [
                'subject' => 'Unable to upload files larger than 5MB',
                'description' => 'When I try to upload files larger than 5MB, I get an error message. Smaller files work fine.',
                'category' => 'File Upload',
                'priority' => 'medium',
                'resolution' => 'Increased upload_max_filesize in php.ini to 20MB. Also updated nginx client_max_body_size. User can now upload files up to 20MB.',
                'rating' => 5,
            ],
            [
                'subject' => 'Two-factor authentication not working',
                'description' => 'The 2FA codes from Google Authenticator are not being accepted. I\'ve tried multiple times.',
                'category' => 'Security',
                'priority' => 'urgent',
                'resolution' => 'Server time was out of sync with NTP. Synchronized server time and 2FA codes now work correctly. Implemented automated time sync monitoring.',
                'rating' => 4,
            ],
            [
                'subject' => 'Dashboard loading slowly',
                'description' => 'The main dashboard takes over 10 seconds to load. Other pages load fine.',
                'category' => 'Performance',
                'priority' => 'medium',
                'resolution' => 'Added database indexes on frequently queried columns and implemented Redis caching for dashboard widgets. Load time reduced to under 2 seconds.',
                'rating' => 5,
            ],
            [
                'subject' => 'Email notifications not being sent',
                'description' => 'I\'m not receiving any email notifications for new messages or updates.',
                'category' => 'Notifications',
                'priority' => 'high',
                'resolution' => 'Queue worker was stopped. Restarted queue worker and added supervisor monitoring to prevent future issues. Also implemented failed job alerts.',
                'rating' => 4,
            ],
            [
                'subject' => 'API rate limit too restrictive',
                'description' => 'The 100 requests per hour rate limit is too low for our use case. We need at least 500.',
                'category' => 'API',
                'priority' => 'medium',
                'resolution' => 'Upgraded user to premium tier with 1000 requests/hour. Also documented rate limits in API documentation more clearly.',
                'rating' => 5,
            ],
            [
                'subject' => 'Cannot delete old projects',
                'description' => 'When I try to delete projects, I get a "Permission denied" error even though I\'m the owner.',
                'category' => 'Permissions',
                'priority' => 'high',
                'resolution' => 'Bug in permission check for soft-deleted related resources. Fixed the check to handle soft deletes properly. Deployed fix and verified deletion works.',
                'rating' => 5,
            ],
            [
                'subject' => 'Mobile app crashes on login',
                'description' => 'iOS app crashes immediately when I try to log in. Using iPhone 12, iOS 17.',
                'category' => 'Mobile',
                'priority' => 'urgent',
                'resolution' => 'Memory leak in authentication flow. Released hotfix v2.1.1 with fix. User confirmed app now works correctly.',
                'rating' => 4,
            ],
            [
                'subject' => 'Export to CSV missing columns',
                'description' => 'When exporting data to CSV, several columns are missing that appear in the UI.',
                'category' => 'Export',
                'priority' => 'medium',
                'resolution' => 'Export query was not including related data. Updated export logic to join necessary tables. All columns now export correctly.',
                'rating' => 5,
            ],
            [
                'subject' => 'Webhook endpoints returning 500 errors',
                'description' => 'Our webhook integration has been failing since yesterday with 500 errors.',
                'category' => 'Integration',
                'priority' => 'urgent',
                'resolution' => 'Recent deployment introduced bug in webhook signature verification. Rolled back changes and implemented proper testing for webhook endpoints.',
                'rating' => 4,
            ],
            [
                'subject' => 'Search not returning relevant results',
                'description' => 'The search feature returns completely unrelated results. Searching for "invoice" shows user profiles.',
                'category' => 'Search',
                'priority' => 'high',
                'resolution' => 'Search index was corrupted. Rebuilt Elasticsearch index with proper mapping. Search now returns accurate results. Added index health monitoring.',
                'rating' => 5,
            ],
            [
                'subject' => 'Timezone issues in reports',
                'description' => 'Reports show times in UTC instead of my local timezone. Settings are configured correctly.',
                'category' => 'Reports',
                'priority' => 'medium',
                'resolution' => 'Report generation was not respecting user timezone preference. Updated report service to apply timezone conversion. Reports now show correct local times.',
                'rating' => 4,
            ],
        ];

        foreach ($tickets as $index => $ticketData) {
            SupportTicket::create([
                'user_id' => $user->id,
                'ticket_number' => 'TICK-' . str_pad($index + 1, 6, '0', STR_PAD_LEFT),
                'subject' => $ticketData['subject'],
                'description' => $ticketData['description'],
                'category' => $ticketData['category'],
                'priority' => $ticketData['priority'],
                'status' => 'resolved',
                'resolution' => $ticketData['resolution'],
                'resolved_at' => now()->subDays(rand(1, 30)),
                'resolved_by' => $agent->id,
                'rating' => $ticketData['rating'],
            ]);
        }

        $this->command->info('Created ' . count($tickets) . ' sample support tickets');
    }
}
```

Run the seeder:

```bash
php artisan db:seed --class=SupportTicketSeeder
```

## Step 2: Building the Service

Create the core support bot service:

```bash
php artisan make:class Services/SupportBotService
```

```php
<?php

namespace App\Services;

use App\Models\SupportTicket;
use Illuminate\Support\Collection;
use Mindwave\Mindwave\Context\Sources\TntSearch\TntSearchSource;
use Mindwave\Mindwave\Context\Sources\StaticSource;
use Mindwave\Mindwave\Context\ContextPipeline;
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\LLM\Streaming\StreamedTextResponse;
use Mindwave\Mindwave\Observability\Models\Trace;

class SupportBotService
{
    /**
     * Categories that require human escalation
     */
    private const ESCALATION_KEYWORDS = [
        'refund',
        'billing issue',
        'cancel subscription',
        'legal',
        'complaint',
        'lawsuit',
        'data breach',
        'security vulnerability',
    ];

    /**
     * Answer a support question with streaming response
     */
    public function answerStream(string $question, ?int $userId = null): StreamedTextResponse
    {
        // Build the prompt with context
        $prompt = $this->buildPrompt($question, $userId);

        // Stream the response
        $stream = Mindwave::llm()
            ->setOptions([
                'model' => 'gpt-4o',
                'temperature' => 0.7,
                'max_tokens' => 800,
            ])
            ->streamText($prompt);

        return new StreamedTextResponse($stream);
    }

    /**
     * Answer a support question (non-streaming)
     */
    public function answer(string $question, ?int $userId = null): array
    {
        // Build the prompt with context
        $prompt = $this->buildPrompt($question, $userId);

        // Generate response
        $response = Mindwave::llm()
            ->setOptions([
                'model' => 'gpt-4o',
                'temperature' => 0.7,
                'max_tokens' => 800,
            ])
            ->generateText($prompt);

        // Get trace for cost tracking
        $trace = Trace::latest()->first();

        // Find similar tickets for source attribution
        $similarTickets = $this->searchSimilarTickets($question);

        return [
            'answer' => $response,
            'sources' => $similarTickets->map(fn($ticket) => [
                'ticket_number' => $ticket->ticket_number,
                'subject' => $ticket->subject,
                'category' => $ticket->category,
            ])->toArray(),
            'requires_escalation' => $this->requiresEscalation($question),
            'cost' => $trace?->estimated_cost ?? 0,
            'tokens' => [
                'input' => $trace?->total_input_tokens ?? 0,
                'output' => $trace?->total_output_tokens ?? 0,
                'total' => $trace?->total_tokens ?? 0,
            ],
        ];
    }

    /**
     * Build the complete prompt with context
     */
    private function buildPrompt(string $question, ?int $userId = null): string
    {
        // Create context pipeline with multiple sources
        $pipeline = $this->buildContextPipeline();

        // Build prompt with PromptComposer
        return Mindwave::prompt()
            ->model('gpt-4o')
            ->reserveOutputTokens(800)

            // System instructions (highest priority)
            ->section('system', $this->getSystemPrompt(), priority: 100)

            // Static company policies (high priority)
            ->context($this->getCompanyPolicies(), priority: 85)

            // Similar resolved tickets (medium priority, searchable)
            ->context($pipeline, query: $question, priority: 70, limit: 5)

            // User's question (highest priority)
            ->section('user', $question, priority: 100)

            ->fit()
            ->toText();
    }

    /**
     * Build context pipeline with ticket search
     */
    private function buildContextPipeline(): ContextPipeline
    {
        // Create TNTSearch source from high-quality resolved tickets
        $ticketSource = TntSearchSource::fromEloquent(
            query: SupportTicket::highQualityResolved()
                ->recent(days: 90)
                ->orderByDesc('rating')
                ->limit(500),
            transformer: fn(SupportTicket $ticket) => $ticket->toContextString(),
            name: 'resolved-tickets'
        );

        $pipeline = new ContextPipeline();
        $pipeline->addSource($ticketSource);
        $pipeline->deduplicate(true);
        $pipeline->rerank(true);

        return $pipeline;
    }

    /**
     * Get static company policies as context source
     */
    private function getCompanyPolicies(): StaticSource
    {
        return StaticSource::fromItems([
            [
                'content' => 'Refund Policy: Full refunds within 30 days, partial refunds up to 60 days. Contact billing@example.com for refund requests.',
                'keywords' => ['refund', 'money back', 'return', 'billing'],
            ],
            [
                'content' => 'Support Hours: Monday-Friday 9 AM - 6 PM EST. Emergency support available 24/7 for Enterprise customers. Ticket response time: 24 hours standard, 4 hours priority.',
                'keywords' => ['hours', 'support', 'available', 'response time', 'emergency'],
            ],
            [
                'content' => 'Password Reset: Use the "Forgot Password" link on the login page. Check spam folder if email doesn\'t arrive within 5 minutes. Password reset links expire after 1 hour.',
                'keywords' => ['password', 'reset', 'forgot', 'login', 'authentication'],
            ],
            [
                'content' => 'Data Export: You can export all your data in JSON or CSV format from Settings > Data Export. Processing time is typically 5-10 minutes for standard accounts.',
                'keywords' => ['export', 'data', 'download', 'backup', 'gdpr'],
            ],
            [
                'content' => 'Account Security: We recommend enabling 2FA for all accounts. Use the Security tab in Settings. We support Google Authenticator and Authy.',
                'keywords' => ['security', '2fa', 'two-factor', 'authentication', 'authenticator'],
            ],
        ]);
    }

    /**
     * Get system prompt for the support bot
     */
    private function getSystemPrompt(): string
    {
        return <<<'PROMPT'
You are a helpful customer support assistant for our SaaS platform. Your role is to help users resolve issues by providing clear, accurate, and friendly responses.

Guidelines:
- Use past ticket resolutions provided in the context to inform your answers
- Be concise but thorough - aim for 2-4 sentences unless more detail is needed
- If you find a similar resolved ticket, reference it (e.g., "This is similar to a previous issue...")
- Always suggest next steps or follow-up actions
- If the issue requires billing, legal, or security escalation, clearly state this
- Be empathetic and acknowledge the user's frustration
- Use simple language, avoid technical jargon unless necessary
- If you're unsure, it's better to escalate than to provide incorrect information

Format your response with:
1. Direct answer to the question
2. Step-by-step instructions if applicable
3. Additional helpful information or preventive tips
4. Next steps or escalation if needed
PROMPT;
    }

    /**
     * Search for similar resolved tickets
     */
    public function searchSimilarTickets(string $query, int $limit = 5): Collection
    {
        $source = TntSearchSource::fromEloquent(
            query: SupportTicket::highQualityResolved()
                ->recent(days: 90)
                ->limit(500),
            transformer: fn(SupportTicket $ticket) => $ticket->toSearchableString(),
            name: 'ticket-search'
        );

        // Initialize and search
        $source->initialize();
        $results = $source->search($query, $limit);

        // Map results back to tickets
        return $results->map(function ($result) {
            // Extract ticket number from content
            preg_match('/Ticket #(TICK-\d+)/', $result->content, $matches);
            $ticketNumber = $matches[1] ?? null;

            if ($ticketNumber) {
                return SupportTicket::where('ticket_number', $ticketNumber)->first();
            }

            return null;
        })->filter();
    }

    /**
     * Check if question requires human escalation
     */
    public function requiresEscalation(string $question): bool
    {
        $lowerQuestion = strtolower($question);

        foreach (self::ESCALATION_KEYWORDS as $keyword) {
            if (str_contains($lowerQuestion, $keyword)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get cost analytics for support bot usage
     */
    public function getCostAnalytics(int $days = 7): array
    {
        $traces = Trace::where('created_at', '>=', now()->subDays($days))
            ->orderBy('created_at', 'desc')
            ->get();

        return [
            'period_days' => $days,
            'total_queries' => $traces->count(),
            'total_cost' => round($traces->sum('estimated_cost'), 4),
            'avg_cost_per_query' => round($traces->avg('estimated_cost'), 4),
            'total_tokens' => $traces->sum('total_tokens'),
            'avg_tokens_per_query' => round($traces->avg('total_tokens'), 0),
            'most_expensive_queries' => $traces->sortByDesc('estimated_cost')
                ->take(5)
                ->map(fn($trace) => [
                    'id' => $trace->id,
                    'cost' => $trace->estimated_cost,
                    'tokens' => $trace->total_tokens,
                    'timestamp' => $trace->created_at->toISOString(),
                ])
                ->values()
                ->toArray(),
        ];
    }

    /**
     * Get support bot statistics
     */
    public function getStatistics(int $days = 30): array
    {
        $tickets = SupportTicket::where('created_at', '>=', now()->subDays($days));

        return [
            'total_tickets' => $tickets->count(),
            'resolved_tickets' => (clone $tickets)->where('status', 'resolved')->count(),
            'avg_rating' => round((clone $tickets)->where('status', 'resolved')->avg('rating'), 2),
            'by_category' => (clone $tickets)
                ->selectRaw('category, COUNT(*) as count')
                ->groupBy('category')
                ->pluck('count', 'category')
                ->toArray(),
            'by_priority' => (clone $tickets)
                ->selectRaw('priority, COUNT(*) as count')
                ->groupBy('priority')
                ->pluck('count', 'priority')
                ->toArray(),
            'resolution_time_hours' => round(
                (clone $tickets)
                    ->where('status', 'resolved')
                    ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) as avg_hours')
                    ->value('avg_hours'),
                1
            ),
        ];
    }
}
```

## Step 3: Controller Implementation

Create the API endpoint:

```bash
php artisan make:controller Api/SupportBotController
```

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SupportBotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SupportBotController extends Controller
{
    public function __construct(
        private readonly SupportBotService $supportBot
    ) {}

    /**
     * Answer a support question with streaming response
     */
    public function stream(Request $request): StreamedResponse|JsonResponse
    {
        // Validate input
        $validated = $request->validate([
            'question' => 'required|string|min:10|max:500',
        ]);

        // Rate limiting
        $key = 'support-bot:' . ($request->user()?->id ?? $request->ip());
        if (RateLimiter::tooManyAttempts($key, 20)) {
            return response()->json([
                'error' => 'Too many requests. Please try again later.',
                'retry_after' => RateLimiter::availableIn($key),
            ], 429);
        }

        RateLimiter::hit($key, 60); // 20 requests per minute

        try {
            // Check if escalation is needed
            $requiresEscalation = $this->supportBot->requiresEscalation($validated['question']);

            if ($requiresEscalation) {
                return response()->json([
                    'requires_escalation' => true,
                    'message' => 'This question requires assistance from our support team. A ticket has been created and an agent will respond shortly.',
                ], 200);
            }

            // Stream the response
            $streamedResponse = $this->supportBot->answerStream(
                question: $validated['question'],
                userId: $request->user()?->id
            );

            // Log the interaction
            Log::info('Support bot stream started', [
                'user_id' => $request->user()?->id,
                'question' => $validated['question'],
                'ip' => $request->ip(),
            ]);

            return $streamedResponse->toStreamedResponse();
        } catch (\Exception $e) {
            Log::error('Support bot stream failed', [
                'error' => $e->getMessage(),
                'question' => $validated['question'],
            ]);

            return response()->json([
                'error' => 'Failed to generate response. Please try again or contact support.',
            ], 500);
        }
    }

    /**
     * Answer a support question (non-streaming)
     */
    public function answer(Request $request): JsonResponse
    {
        // Validate input
        $validated = $request->validate([
            'question' => 'required|string|min:10|max:500',
        ]);

        // Rate limiting
        $key = 'support-bot:' . ($request->user()?->id ?? $request->ip());
        if (RateLimiter::tooManyAttempts($key, 20)) {
            return response()->json([
                'error' => 'Too many requests. Please try again later.',
                'retry_after' => RateLimiter::availableIn($key),
            ], 429);
        }

        RateLimiter::hit($key, 60);

        try {
            $result = $this->supportBot->answer(
                question: $validated['question'],
                userId: $request->user()?->id
            );

            Log::info('Support bot answered', [
                'user_id' => $request->user()?->id,
                'question' => $validated['question'],
                'cost' => $result['cost'],
                'requires_escalation' => $result['requires_escalation'],
            ]);

            return response()->json($result);
        } catch (\Exception $e) {
            Log::error('Support bot answer failed', [
                'error' => $e->getMessage(),
                'question' => $validated['question'],
            ]);

            return response()->json([
                'error' => 'Failed to generate response. Please try again or contact support.',
            ], 500);
        }
    }

    /**
     * Search similar tickets
     */
    public function searchTickets(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'query' => 'required|string|min:3|max:200',
            'limit' => 'nullable|integer|min:1|max:10',
        ]);

        $tickets = $this->supportBot->searchSimilarTickets(
            query: $validated['query'],
            limit: $validated['limit'] ?? 5
        );

        return response()->json([
            'tickets' => $tickets->map(fn($ticket) => [
                'ticket_number' => $ticket->ticket_number,
                'subject' => $ticket->subject,
                'category' => $ticket->category,
                'status' => $ticket->status,
                'rating' => $ticket->rating,
                'resolved_at' => $ticket->resolved_at?->toISOString(),
            ]),
        ]);
    }

    /**
     * Get cost analytics
     */
    public function analytics(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'days' => 'nullable|integer|min:1|max:90',
        ]);

        $analytics = $this->supportBot->getCostAnalytics($validated['days'] ?? 7);

        return response()->json($analytics);
    }

    /**
     * Get support bot statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'days' => 'nullable|integer|min:1|max:90',
        ]);

        $stats = $this->supportBot->getStatistics($validated['days'] ?? 30);

        return response()->json($stats);
    }
}
```

### Routes

Add routes to `routes/api.php`:

```php
use App\Http\Controllers\Api\SupportBotController;

Route::prefix('support-bot')->group(function () {
    // Public endpoints (with rate limiting)
    Route::get('/stream', [SupportBotController::class, 'stream']);
    Route::post('/answer', [SupportBotController::class, 'answer']);
    Route::post('/search', [SupportBotController::class, 'searchTickets']);

    // Admin endpoints (require authentication)
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/analytics', [SupportBotController::class, 'analytics']);
        Route::get('/statistics', [SupportBotController::class, 'statistics']);
    });
});
```

## Step 4: Frontend Integration

### Simple HTML/JS Chat Interface

Create a simple chat interface at `resources/views/support-chat.blade.php`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>AI Support Assistant</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .chat-container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            width: 100%;
            max-width: 800px;
            height: 600px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .chat-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            text-align: center;
        }

        .chat-header h1 {
            font-size: 24px;
            font-weight: 600;
        }

        .chat-header p {
            font-size: 14px;
            opacity: 0.9;
            margin-top: 4px;
        }

        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            background: #f8f9fa;
        }

        .message {
            margin-bottom: 16px;
            animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .message-user {
            text-align: right;
        }

        .message-bot {
            text-align: left;
        }

        .message-content {
            display: inline-block;
            padding: 12px 16px;
            border-radius: 12px;
            max-width: 80%;
            word-wrap: break-word;
        }

        .message-user .message-content {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .message-bot .message-content {
            background: white;
            color: #333;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .message-time {
            font-size: 11px;
            opacity: 0.6;
            margin-top: 4px;
        }

        .typing-indicator {
            display: none;
            align-items: center;
            gap: 4px;
            padding: 12px 16px;
            background: white;
            border-radius: 12px;
            display: inline-flex;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .typing-indicator.active {
            display: inline-flex;
        }

        .typing-dot {
            width: 8px;
            height: 8px;
            background: #667eea;
            border-radius: 50%;
            animation: typing 1.4s infinite;
        }

        .typing-dot:nth-child(2) {
            animation-delay: 0.2s;
        }

        .typing-dot:nth-child(3) {
            animation-delay: 0.4s;
        }

        @keyframes typing {
            0%, 60%, 100% {
                opacity: 0.3;
                transform: scale(0.8);
            }
            30% {
                opacity: 1;
                transform: scale(1);
            }
        }

        .chat-input-container {
            padding: 20px;
            background: white;
            border-top: 1px solid #e0e0e0;
        }

        .chat-input-wrapper {
            display: flex;
            gap: 12px;
        }

        .chat-input {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 15px;
            outline: none;
            transition: border-color 0.2s;
        }

        .chat-input:focus {
            border-color: #667eea;
        }

        .chat-send-btn {
            padding: 12px 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, opacity 0.2s;
        }

        .chat-send-btn:hover:not(:disabled) {
            transform: translateY(-2px);
        }

        .chat-send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .error-message {
            background: #fee;
            color: #c33;
            padding: 12px 16px;
            border-radius: 8px;
            margin: 10px 20px;
            text-align: center;
        }

        .escalation-notice {
            background: #fef3cd;
            color: #856404;
            padding: 12px 16px;
            border-radius: 8px;
            margin: 10px 20px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">
            <h1>AI Support Assistant</h1>
            <p>Ask me anything about our platform</p>
        </div>

        <div class="chat-messages" id="chatMessages">
            <div class="message message-bot">
                <div class="message-content">
                    Hi! I'm your AI support assistant. I can help you with:
                    <br><br>
                    • Password and login issues
                    <br>• Account settings and features
                    <br>• Technical problems
                    <br>• General questions
                    <br><br>
                    What can I help you with today?
                </div>
            </div>
        </div>

        <div class="chat-input-container">
            <div class="chat-input-wrapper">
                <input
                    type="text"
                    id="chatInput"
                    class="chat-input"
                    placeholder="Type your question here..."
                    autocomplete="off"
                />
                <button id="sendBtn" class="chat-send-btn">
                    Send
                </button>
            </div>
        </div>
    </div>

    <script>
        const chatMessages = document.getElementById('chatMessages');
        const chatInput = document.getElementById('chatInput');
        const sendBtn = document.getElementById('sendBtn');
        let eventSource = null;
        let isStreaming = false;

        // Add message to chat
        function addMessage(content, isUser = false) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${isUser ? 'message-user' : 'message-bot'}`;

            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.textContent = content;

            messageDiv.appendChild(contentDiv);
            chatMessages.appendChild(messageDiv);
            scrollToBottom();

            return contentDiv;
        }

        // Add bot message with streaming support
        function addBotMessage() {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message message-bot';

            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.textContent = '';

            messageDiv.appendChild(contentDiv);
            chatMessages.appendChild(messageDiv);
            scrollToBottom();

            return contentDiv;
        }

        // Show typing indicator
        function showTyping() {
            const typingDiv = document.createElement('div');
            typingDiv.id = 'typingIndicator';
            typingDiv.className = 'message message-bot';
            typingDiv.innerHTML = `
                <div class="typing-indicator active">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            `;
            chatMessages.appendChild(typingDiv);
            scrollToBottom();
        }

        // Hide typing indicator
        function hideTyping() {
            const typingDiv = document.getElementById('typingIndicator');
            if (typingDiv) {
                typingDiv.remove();
            }
        }

        // Show error message
        function showError(message) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = message;
            chatMessages.appendChild(errorDiv);
            scrollToBottom();

            setTimeout(() => errorDiv.remove(), 5000);
        }

        // Show escalation notice
        function showEscalation(message) {
            const noticeDiv = document.createElement('div');
            noticeDiv.className = 'escalation-notice';
            noticeDiv.textContent = message;
            chatMessages.appendChild(noticeDiv);
            scrollToBottom();
        }

        // Scroll to bottom
        function scrollToBottom() {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // Send message
        async function sendMessage() {
            const question = chatInput.value.trim();

            if (!question || isStreaming) return;

            // Add user message
            addMessage(question, true);
            chatInput.value = '';

            // Show typing indicator
            showTyping();

            // Disable input
            isStreaming = true;
            sendBtn.disabled = true;
            chatInput.disabled = true;

            try {
                // Create bot message container
                hideTyping();
                const botMessageDiv = addBotMessage();

                // Start streaming
                const url = `/api/support-bot/stream?question=${encodeURIComponent(question)}`;
                eventSource = new EventSource(url);

                // Handle message chunks
                eventSource.addEventListener('message', (event) => {
                    botMessageDiv.textContent += event.data;
                    scrollToBottom();
                });

                // Handle completion
                eventSource.addEventListener('done', () => {
                    cleanup();
                });

                // Handle errors
                eventSource.onerror = (error) => {
                    console.error('Stream error:', error);
                    hideTyping();

                    // Check if it's an escalation response
                    fetch(url.replace('/stream', '/answer'), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                        },
                        body: JSON.stringify({ question }),
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.requires_escalation) {
                            showEscalation(data.message);
                        } else {
                            showError('Connection error. Please try again.');
                        }
                    })
                    .catch(() => {
                        showError('Connection error. Please try again.');
                    });

                    cleanup();
                };
            } catch (error) {
                console.error('Send message error:', error);
                hideTyping();
                showError('Failed to send message. Please try again.');
                cleanup();
            }
        }

        // Cleanup
        function cleanup() {
            if (eventSource) {
                eventSource.close();
                eventSource = null;
            }
            isStreaming = false;
            sendBtn.disabled = false;
            chatInput.disabled = false;
            chatInput.focus();
        }

        // Event listeners
        sendBtn.addEventListener('click', sendMessage);

        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Cleanup on page unload
        window.addEventListener('beforeunload', cleanup);

        // Focus input on load
        chatInput.focus();
    </script>
</body>
</html>
```

Add a route for the chat interface in `routes/web.php`:

```php
Route::get('/support-chat', function () {
    return view('support-chat');
});
```

## Step 5: Testing

Create comprehensive tests:

```bash
php artisan make:test SupportBotServiceTest --unit
php artisan make:test SupportBotControllerTest
```

### Unit Tests

```php
<?php

namespace Tests\Unit;

use App\Models\SupportTicket;
use App\Models\User;
use App\Services\SupportBotService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SupportBotServiceTest extends TestCase
{
    use RefreshDatabase;

    private SupportBotService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new SupportBotService();
    }

    /** @test */
    public function it_searches_similar_tickets()
    {
        // Arrange
        $user = User::factory()->create();

        SupportTicket::factory()->create([
            'subject' => 'Password reset not working',
            'description' => 'Cannot reset my password',
            'status' => 'resolved',
            'resolution' => 'Reset the password manually',
            'rating' => 5,
        ]);

        SupportTicket::factory()->create([
            'subject' => 'File upload issue',
            'description' => 'Cannot upload large files',
            'status' => 'resolved',
            'resolution' => 'Increased upload limit',
            'rating' => 4,
        ]);

        // Act
        $results = $this->service->searchSimilarTickets('password reset');

        // Assert
        $this->assertGreaterThan(0, $results->count());
        $this->assertStringContainsString('password', $results->first()->subject, '', true);
    }

    /** @test */
    public function it_detects_escalation_keywords()
    {
        // Test refund request
        $this->assertTrue($this->service->requiresEscalation('I want a refund'));

        // Test billing issue
        $this->assertTrue($this->service->requiresEscalation('Billing issue with my account'));

        // Test normal question
        $this->assertFalse($this->service->requiresEscalation('How do I reset my password?'));
    }

    /** @test */
    public function it_generates_answer_with_context()
    {
        // Arrange
        $user = User::factory()->create();

        SupportTicket::factory()->create([
            'subject' => 'Password reset email not received',
            'description' => 'Requested password reset but no email',
            'status' => 'resolved',
            'resolution' => 'Check spam folder and verify email address',
            'rating' => 5,
            'resolved_at' => now(),
        ]);

        // Act
        $result = $this->service->answer('How do I reset my password?', $user->id);

        // Assert
        $this->assertIsArray($result);
        $this->assertArrayHasKey('answer', $result);
        $this->assertArrayHasKey('sources', $result);
        $this->assertArrayHasKey('cost', $result);
        $this->assertArrayHasKey('tokens', $result);
        $this->assertIsString($result['answer']);
        $this->assertNotEmpty($result['answer']);
    }

    /** @test */
    public function it_tracks_cost_analytics()
    {
        // Note: This test requires actual traces from LLM calls
        // In a real scenario, you'd make some LLM calls first

        $analytics = $this->service->getCostAnalytics(7);

        $this->assertIsArray($analytics);
        $this->assertArrayHasKey('total_queries', $analytics);
        $this->assertArrayHasKey('total_cost', $analytics);
        $this->assertArrayHasKey('avg_cost_per_query', $analytics);
    }

    /** @test */
    public function it_provides_statistics()
    {
        // Arrange
        SupportTicket::factory()->count(5)->create([
            'status' => 'resolved',
            'rating' => 5,
        ]);

        SupportTicket::factory()->count(3)->create([
            'status' => 'open',
        ]);

        // Act
        $stats = $this->service->getStatistics(30);

        // Assert
        $this->assertEquals(8, $stats['total_tickets']);
        $this->assertEquals(5, $stats['resolved_tickets']);
        $this->assertArrayHasKey('by_category', $stats);
        $this->assertArrayHasKey('by_priority', $stats);
    }
}
```

### Feature Tests

```php
<?php

namespace Tests\Feature;

use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SupportBotControllerTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function it_requires_valid_question()
    {
        $response = $this->postJson('/api/support-bot/answer', [
            'question' => 'Hi', // Too short
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('question');
    }

    /** @test */
    public function it_answers_support_question()
    {
        // Arrange
        SupportTicket::factory()->create([
            'subject' => 'Password reset issue',
            'status' => 'resolved',
            'resolution' => 'Check spam folder',
            'rating' => 5,
        ]);

        // Act
        $response = $this->postJson('/api/support-bot/answer', [
            'question' => 'How do I reset my password?',
        ]);

        // Assert
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'answer',
            'sources',
            'requires_escalation',
            'cost',
            'tokens' => ['input', 'output', 'total'],
        ]);
    }

    /** @test */
    public function it_handles_escalation_requests()
    {
        $response = $this->postJson('/api/support-bot/answer', [
            'question' => 'I want a refund for my subscription',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'requires_escalation' => true,
        ]);
    }

    /** @test */
    public function it_rate_limits_requests()
    {
        // Make 21 requests (limit is 20 per minute)
        for ($i = 0; $i < 21; $i++) {
            $response = $this->postJson('/api/support-bot/answer', [
                'question' => "Test question number {$i}. This is a unique question to test rate limiting.",
            ]);

            if ($i < 20) {
                $response->assertStatus(200);
            } else {
                $response->assertStatus(429);
                $response->assertJsonStructure(['error', 'retry_after']);
            }
        }
    }

    /** @test */
    public function it_searches_similar_tickets()
    {
        // Arrange
        SupportTicket::factory()->create([
            'subject' => 'Password reset not working',
            'status' => 'resolved',
            'rating' => 5,
        ]);

        // Act
        $response = $this->postJson('/api/support-bot/search', [
            'query' => 'password',
            'limit' => 5,
        ]);

        // Assert
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'tickets' => [
                '*' => [
                    'ticket_number',
                    'subject',
                    'category',
                    'status',
                    'rating',
                ],
            ],
        ]);
    }

    /** @test */
    public function it_provides_analytics_to_authenticated_users()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/support-bot/analytics?days=7');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'period_days',
            'total_queries',
            'total_cost',
            'avg_cost_per_query',
            'total_tokens',
            'avg_tokens_per_query',
            'most_expensive_queries',
        ]);
    }

    /** @test */
    public function it_provides_statistics()
    {
        SupportTicket::factory()->count(10)->create([
            'status' => 'resolved',
            'rating' => 5,
        ]);

        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/support-bot/statistics?days=30');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'total_tickets',
            'resolved_tickets',
            'avg_rating',
            'by_category',
            'by_priority',
            'resolution_time_hours',
        ]);
    }
}
```

Run the tests:

```bash
php artisan test --filter=SupportBot
```

## Enhancements

### 1. Add User Context

Personalize responses based on user history:

```php
// In SupportBotService::buildPrompt()

if ($userId) {
    $user = User::with(['tickets' => fn($q) => $q->latest()->limit(5)])->find($userId);

    if ($user && $user->tickets->isNotEmpty()) {
        $userContext = sprintf(
            "User Context:\nName: %s\nPlan: %s\nRecent Tickets: %s",
            $user->name,
            $user->subscription?->plan ?? 'Free',
            $user->tickets->pluck('subject')->join(', ')
        );

        $composer->section('user-context', $userContext, priority: 80);
    }
}
```

### 2. Multi-Language Support

Add language detection and translation:

```php
// In SupportBotService

use Illuminate\Support\Facades\Http;

private function detectLanguage(string $text): string
{
    // Use a language detection service or library
    // For example, using Google Cloud Translation API
    $response = Http::post('https://translation.googleapis.com/language/translate/v2/detect', [
        'key' => config('services.google.translation_key'),
        'q' => $text,
    ]);

    return $response->json()['data']['detections'][0][0]['language'] ?? 'en';
}

public function answer(string $question, ?int $userId = null): array
{
    $language = $this->detectLanguage($question);

    // Update system prompt to respond in detected language
    $systemPrompt = $this->getSystemPrompt($language);

    // ... rest of the method
}

private function getSystemPrompt(string $language = 'en'): string
{
    $prompts = [
        'en' => 'You are a helpful customer support assistant...',
        'es' => 'Eres un asistente de soporte al cliente útil...',
        'fr' => 'Vous êtes un assistant de support client utile...',
        // Add more languages
    ];

    return $prompts[$language] ?? $prompts['en'];
}
```

### 3. Escalation to Human Agent

Create tickets for complex issues:

```php
// In SupportBotService

public function escalateToHuman(string $question, ?int $userId): SupportTicket
{
    return SupportTicket::create([
        'user_id' => $userId,
        'ticket_number' => 'TICK-' . str_pad(SupportTicket::max('id') + 1, 6, '0', STR_PAD_LEFT),
        'subject' => 'Escalated from AI: ' . Str::limit($question, 50),
        'description' => $question,
        'status' => 'open',
        'priority' => 'high',
        'category' => 'Escalation',
        'metadata' => [
            'escalated_from' => 'ai_bot',
            'escalation_reason' => 'Complex issue requiring human assistance',
            'timestamp' => now()->toISOString(),
        ],
    ]);
}

// In SupportBotController

public function answer(Request $request): JsonResponse
{
    // ... existing validation

    $result = $this->supportBot->answer(
        question: $validated['question'],
        userId: $request->user()?->id
    );

    if ($result['requires_escalation']) {
        $ticket = $this->supportBot->escalateToHuman(
            question: $validated['question'],
            userId: $request->user()?->id
        );

        return response()->json([
            'requires_escalation' => true,
            'ticket_number' => $ticket->ticket_number,
            'message' => "This question has been escalated. Ticket #{$ticket->ticket_number} created.",
        ]);
    }

    return response()->json($result);
}
```

### 4. Analytics and Tracking

Track bot performance and user satisfaction:

```php
// Create a new model for bot interactions
php artisan make:model BotInteraction -m

// Migration
public function up(): void
{
    Schema::create('bot_interactions', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
        $table->text('question');
        $table->text('answer');
        $table->boolean('was_helpful')->nullable();
        $table->integer('rating')->nullable();
        $table->text('feedback')->nullable();
        $table->boolean('escalated')->default(false);
        $table->decimal('cost_usd', 10, 6);
        $table->integer('tokens_used');
        $table->timestamps();

        $table->index(['user_id', 'created_at']);
        $table->index('was_helpful');
    });
}

// In SupportBotService
public function trackInteraction(array $data): void
{
    BotInteraction::create($data);
}

// Add feedback endpoint to controller
public function feedback(Request $request): JsonResponse
{
    $validated = $request->validate([
        'interaction_id' => 'required|exists:bot_interactions,id',
        'was_helpful' => 'required|boolean',
        'rating' => 'nullable|integer|min:1|max:5',
        'feedback' => 'nullable|string|max:500',
    ]);

    $interaction = BotInteraction::find($validated['interaction_id']);
    $interaction->update([
        'was_helpful' => $validated['was_helpful'],
        'rating' => $validated['rating'] ?? null,
        'feedback' => $validated['feedback'] ?? null,
    ]);

    return response()->json(['message' => 'Feedback recorded']);
}

// Add satisfaction metrics
public function getSatisfactionMetrics(int $days = 30): array
{
    $interactions = BotInteraction::where('created_at', '>=', now()->subDays($days));

    return [
        'total_interactions' => $interactions->count(),
        'helpful_percentage' => $interactions->where('was_helpful', true)->count() / max($interactions->count(), 1) * 100,
        'avg_rating' => $interactions->whereNotNull('rating')->avg('rating'),
        'escalation_rate' => $interactions->where('escalated', true)->count() / max($interactions->count(), 1) * 100,
    ];
}
```

### 5. Sentiment Analysis

Detect frustrated users and prioritize escalation:

```php
// In SupportBotService

private function analyzeSentiment(string $text): array
{
    // Use OpenAI for sentiment analysis
    $response = Mindwave::llm()
        ->setOptions(['model' => 'gpt-4o-mini', 'temperature' => 0])
        ->generateText(
            "Analyze the sentiment of this support question. Respond with JSON: {\"sentiment\": \"positive|neutral|negative\", \"frustration_level\": 0-10, \"urgency\": 0-10}\n\nText: {$text}"
        );

    return json_decode($response, true);
}

public function answer(string $question, ?int $userId = null): array
{
    $sentiment = $this->analyzeSentiment($question);

    // Auto-escalate highly frustrated users
    if ($sentiment['frustration_level'] > 7 || $sentiment['urgency'] > 8) {
        return [
            'answer' => 'I understand this is urgent. Let me connect you with a human agent right away.',
            'requires_escalation' => true,
            'sentiment' => $sentiment,
        ];
    }

    // ... continue with normal flow
}
```

## Production Considerations

### 1. Rate Limiting

Implement tiered rate limits:

```php
// In config/services.php
'support_bot' => [
    'rate_limits' => [
        'free' => 10, // 10 requests per hour
        'basic' => 50,
        'premium' => 200,
        'enterprise' => 1000,
    ],
],

// In SupportBotController
private function getRateLimit(Request $request): int
{
    $user = $request->user();

    if (!$user) {
        return 10; // Anonymous users
    }

    $plan = $user->subscription?->plan ?? 'free';
    return config("services.support_bot.rate_limits.{$plan}", 10);
}

public function stream(Request $request): StreamedResponse|JsonResponse
{
    $limit = $this->getRateLimit($request);
    $key = 'support-bot:' . ($request->user()?->id ?? $request->ip());

    if (RateLimiter::tooManyAttempts($key, $limit)) {
        return response()->json([
            'error' => "Rate limit exceeded. Limit: {$limit} requests per hour.",
            'retry_after' => RateLimiter::availableIn($key),
        ], 429);
    }

    RateLimiter::hit($key, 3600); // 1 hour

    // ... rest of the method
}
```

### 2. Caching Strategies

Cache common questions:

```php
// In SupportBotService

use Illuminate\Support\Facades\Cache;

public function answer(string $question, ?int $userId = null): array
{
    // Generate cache key from normalized question
    $cacheKey = 'support-bot:' . md5(strtolower(trim($question)));

    // Check cache for common questions (only if no user context)
    if (!$userId) {
        $cached = Cache::get($cacheKey);
        if ($cached) {
            return array_merge($cached, [
                'cached' => true,
                'cost' => 0, // No cost for cached responses
            ]);
        }
    }

    // Generate fresh response
    $result = $this->generateAnswer($question, $userId);

    // Cache non-user-specific responses
    if (!$userId && !$result['requires_escalation']) {
        Cache::put($cacheKey, $result, now()->addHours(24));
    }

    return $result;
}
```

### 3. Cost Monitoring

Set up cost alerts:

```php
// Create a scheduled command
php artisan make:command MonitorSupportBotCosts

// In app/Console/Commands/MonitorSupportBotCosts.php
public function handle(SupportBotService $supportBot): void
{
    $analytics = $supportBot->getCostAnalytics(days: 1);

    // Daily cost threshold: $10
    if ($analytics['total_cost'] > 10.00) {
        // Send alert via email/Slack
        Mail::to('admin@example.com')->send(
            new SupportBotCostAlert($analytics)
        );
    }

    // Log daily stats
    Log::info('Support bot daily costs', $analytics);
}

// Register in app/Console/Kernel.php
protected function schedule(Schedule $schedule): void
{
    $schedule->command('support:monitor-costs')->daily();
}
```

### 4. Queue-Based Indexing

Index tickets asynchronously:

```php
// Create a job for indexing
php artisan make:job IndexSupportTickets

// In app/Jobs/IndexSupportTickets.php
public function handle(): void
{
    $tickets = SupportTicket::where('status', 'resolved')
        ->where('updated_at', '>=', now()->subHours(24))
        ->get();

    // Rebuild TNTSearch index with recent tickets
    $source = TntSearchSource::fromEloquent(
        SupportTicket::highQualityResolved()->limit(1000),
        fn($ticket) => $ticket->toContextString(),
        name: 'resolved-tickets'
    );

    $source->initialize();

    Log::info('Indexed ' . $tickets->count() . ' support tickets');
}

// Schedule in app/Console/Kernel.php
protected function schedule(Schedule $schedule): void
{
    $schedule->job(new IndexSupportTickets())->hourly();
}
```

### 5. Deployment Tips

**Environment Variables:**

```bash
# .env
MINDWAVE_LLM_DRIVER=openai
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=gpt-4o

MINDWAVE_TRACING_ENABLED=true
MINDWAVE_TRACE_CAPTURE_MESSAGES=false  # PII protection

# Support bot settings
SUPPORT_BOT_RATE_LIMIT_FREE=10
SUPPORT_BOT_RATE_LIMIT_PREMIUM=200
SUPPORT_BOT_CACHE_TTL=24  # hours
SUPPORT_BOT_COST_ALERT_THRESHOLD=10.00  # USD per day
```

**Monitoring:**

```php
// Set up health check endpoint
Route::get('/health/support-bot', function (SupportBotService $bot) {
    $startTime = microtime(true);

    try {
        // Test search functionality
        $results = $bot->searchSimilarTickets('test query', 1);

        $responseTime = (microtime(true) - $startTime) * 1000;

        return response()->json([
            'status' => 'healthy',
            'response_time_ms' => round($responseTime, 2),
            'tickets_indexed' => $results->count(),
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'status' => 'unhealthy',
            'error' => $e->getMessage(),
        ], 500);
    }
});
```

**Performance Optimization:**

```php
// Optimize ticket queries with eager loading
SupportTicket::query()
    ->with(['user', 'assignedAgent', 'resolver'])
    ->highQualityResolved()
    ->recent(90)
    ->limit(500);

// Use database indexes (already in migration)
// Add composite index for common queries
Schema::table('support_tickets', function (Blueprint $table) {
    $table->index(['status', 'rating', 'resolved_at']);
});
```

## Next Steps

Explore related Mindwave features:

- **[PromptComposer](/docs/core/prompt-composer)** - Advanced prompt management and token optimization
- **[Streaming](/docs/core/streaming)** - Production SSE streaming patterns
- **[Observability](/docs/observability/overview)** - Cost tracking and performance monitoring
- **[TNTSearch](/docs/rag/tntsearch-source)** - Full-text search configuration and optimization
- **[Context Pipeline](/docs/rag/context-pipeline)** - Multi-source context aggregation

## Resources

- [Example Code Repository](https://github.com/mindwave/examples/tree/main/support-bot)
- [API Reference](/docs/reference/api)
- [Community Discord](https://discord.gg/mindwave)
- [Production RAG Patterns](/docs/advanced/rag-patterns)

---

Built with Mindwave v1.0 - Production AI Utilities for Laravel
