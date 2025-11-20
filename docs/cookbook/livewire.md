# Livewire Integration

Build reactive, full-stack Laravel chat components with LLM streaming using Livewire 3. This cookbook demonstrates how to create production-ready conversational interfaces without writing JavaScript, leveraging Livewire's `wire:stream` directive for real-time updates.

## What We're Building

A complete chat interface featuring:

-   **Real-time streaming** - LLM responses appear progressively
-   **Multi-turn conversations** - Context-aware message history
-   **File uploads** - Image and document processing with vision APIs
-   **Typing indicators** - Live status updates
-   **Multiple components** - Modular, reusable architecture
-   **Full observability** - OpenTelemetry tracing integration

## Prerequisites

-   Laravel 10+ with Livewire 3 installed
-   Mindwave package configured
-   Basic understanding of Livewire components

## Architecture Overview

### Livewire Component Structure

Livewire 3 components combine PHP backend logic with reactive frontend updates:

```
app/Livewire/
├── ChatInterface.php      # Main chat component
├── ChatSidebar.php        # Conversation list
├── ChatHeader.php         # Model selector
└── ChatInput.php          # Advanced input handling
```

### The wire:stream Directive

Livewire 3's `wire:stream` directive enables server-sent events (SSE) streaming directly in Blade templates:

```blade
<div wire:stream="streamResponse">
    {{ $response }}
</div>
```

When the `streamResponse` method yields chunks, Livewire automatically:

-   Updates the DOM progressively
-   Handles connection management
-   Provides automatic reconnection
-   Maintains component state

### Event-Driven Updates

Livewire's reactive properties and events create a seamless experience:

```php
// Backend automatically syncs to frontend
public string $response = '';

// Events trigger component updates
$this->dispatch('message-received', content: $chunk);
```

## Step 1: Livewire Setup

### Install Livewire 3

```bash
composer require livewire/livewire:^3.0
```

### Configure Assets

Publish Livewire assets:

```bash
php artisan livewire:publish --config
```

### Create Base Layout

Create `resources/views/layouts/app.blade.php`:

```blade
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ config('app.name') }} - AI Chat</title>

    @vite(['resources/css/app.css', 'resources/js/app.js'])
    @livewireStyles
</head>
<body class="bg-gray-50">
    {{ $slot }}

    @livewireScripts
</body>
</html>
```

### Create Chat Route

Add to `routes/web.php`:

```php
use App\Livewire\ChatInterface;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::get('/chat', ChatInterface::class)->name('chat');
});
```

## Step 2: Chat Component

### Generate Component

```bash
php artisan make:livewire ChatInterface
```

### Component Implementation

Update `app/Livewire/ChatInterface.php`:

```php
<?php

namespace App\Livewire;

use Livewire\Component;
use Livewire\Attributes\Layout;
use Livewire\Attributes\On;
use Mindwave\Mindwave\Facades\Mindwave;
use Illuminate\Support\Facades\Auth;
use App\Models\ChatMessage;

class ChatInterface extends Component
{
    // Component state
    public string $prompt = '';
    public string $currentResponse = '';
    public bool $isStreaming = false;
    public array $messages = [];
    public string $model = 'gpt-4-turbo';
    public float $temperature = 0.7;

    // Conversation tracking
    public ?int $conversationId = null;

    /**
     * Initialize component
     */
    public function mount(): void
    {
        $this->loadRecentMessages();
    }

    /**
     * Load recent conversation history
     */
    public function loadRecentMessages(): void
    {
        $this->messages = ChatMessage::query()
            ->where('user_id', Auth::id())
            ->latest()
            ->take(50)
            ->get()
            ->reverse()
            ->map(fn ($msg) => [
                'role' => 'user',
                'content' => $msg->prompt,
                'timestamp' => $msg->created_at,
            ])
            ->merge(
                ChatMessage::query()
                    ->where('user_id', Auth::id())
                    ->latest()
                    ->take(50)
                    ->get()
                    ->reverse()
                    ->map(fn ($msg) => [
                        'role' => 'assistant',
                        'content' => $msg->response,
                        'timestamp' => $msg->created_at,
                    ])
            )
            ->sortBy('timestamp')
            ->values()
            ->toArray();
    }

    /**
     * Send message and stream response
     */
    public function sendMessage(): void
    {
        // Validate input
        $this->validate([
            'prompt' => 'required|string|max:5000',
        ]);

        if ($this->isStreaming) {
            return;
        }

        // Add user message to display
        $this->messages[] = [
            'role' => 'user',
            'content' => $this->prompt,
            'timestamp' => now(),
        ];

        // Clear response and set streaming state
        $this->currentResponse = '';
        $this->isStreaming = true;

        // Dispatch event to scroll to bottom
        $this->dispatch('scroll-to-bottom');

        // Stream will be handled by streamResponse() method
        $this->stream(
            to: 'streamResponse',
            content: $this->prompt,
        );
    }

    /**
     * Stream LLM response using wire:stream
     *
     * This generator method is called by Livewire's streaming system
     * Each yielded value updates the component progressively
     */
    public function streamResponse(string $userPrompt): \Generator
    {
        try {
            // Configure LLM
            $llm = Mindwave::llm()
                ->setOptions([
                    'model' => $this->model,
                    'temperature' => $this->temperature,
                    'max_tokens' => 2000,
                ]);

            // Build context from conversation history
            $context = $this->buildConversationContext();

            // Create streaming generator
            $stream = $llm->streamText($userPrompt, [
                'system' => $context,
            ]);

            // Stream chunks to frontend
            foreach ($stream as $chunk) {
                $this->currentResponse .= $chunk;

                // Yield updates the component on each chunk
                yield;

                // Small delay for smooth rendering
                usleep(10000); // 10ms
            }

            // Store complete exchange
            $this->storeMessage($userPrompt, $this->currentResponse);

            // Add assistant response to messages
            $this->messages[] = [
                'role' => 'assistant',
                'content' => $this->currentResponse,
                'timestamp' => now(),
            ];

        } catch (\Exception $e) {
            $this->currentResponse = 'Error: ' . $e->getMessage();
            logger()->error('Chat streaming error', [
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
            ]);
        } finally {
            $this->isStreaming = false;
            $this->prompt = '';
        }
    }

    /**
     * Build conversation context for multi-turn chat
     */
    protected function buildConversationContext(): string
    {
        $recentMessages = array_slice($this->messages, -6); // Last 3 exchanges

        $context = "You are a helpful AI assistant. ";
        $context .= "Previous conversation:\n\n";

        foreach ($recentMessages as $msg) {
            $role = ucfirst($msg['role']);
            $context .= "{$role}: {$msg['content']}\n";
        }

        return $context;
    }

    /**
     * Store message in database
     */
    protected function storeMessage(string $prompt, string $response): void
    {
        ChatMessage::create([
            'user_id' => Auth::id(),
            'conversation_id' => $this->conversationId,
            'prompt' => $prompt,
            'response' => $response,
            'model' => $this->model,
            'metadata' => [
                'temperature' => $this->temperature,
                'timestamp' => now()->toISOString(),
            ],
        ]);
    }

    /**
     * Clear conversation
     */
    public function clearConversation(): void
    {
        $this->messages = [];
        $this->currentResponse = '';
        $this->conversationId = null;

        $this->dispatch('conversation-cleared');
    }

    /**
     * Update model configuration
     */
    public function updateModel(string $model): void
    {
        $this->model = $model;
        $this->dispatch('model-updated', model: $model);
    }

    #[Layout('layouts.app')]
    public function render()
    {
        return view('livewire.chat-interface');
    }
}
```

### Component View

Create `resources/views/livewire/chat-interface.blade.php`:

```blade
<div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
    <div class="max-w-5xl mx-auto p-6">
        {{-- Header --}}
        <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div class="flex items-center justify-between">
                <h1 class="text-2xl font-bold text-gray-900">AI Chat</h1>

                <div class="flex items-center gap-4">
                    {{-- Model selector --}}
                    <select
                        wire:model.live="model"
                        class="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    >
                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                        <option value="claude-3-opus">Claude 3 Opus</option>
                        <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                    </select>

                    {{-- Clear button --}}
                    <button
                        wire:click="clearConversation"
                        class="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                    >
                        Clear Chat
                    </button>
                </div>
            </div>
        </div>

        {{-- Messages container --}}
        <div
            class="bg-white rounded-lg shadow-sm p-6 mb-6 min-h-[500px] max-h-[600px] overflow-y-auto"
            x-data="{ scrollToBottom() { this.$el.scrollTop = this.$el.scrollHeight; } }"
            x-init="scrollToBottom()"
            @scroll-to-bottom.window="scrollToBottom()"
        >
            {{-- Message history --}}
            @foreach($messages as $message)
                <div class="mb-4 {{ $message['role'] === 'user' ? 'text-right' : 'text-left' }}">
                    <div class="inline-block max-w-[80%] p-4 rounded-lg {{
                        $message['role'] === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                    }}">
                        <div class="text-xs opacity-70 mb-1">
                            {{ $message['role'] === 'user' ? 'You' : 'AI' }}
                            · {{ $message['timestamp']->diffForHumans() }}
                        </div>
                        <div class="whitespace-pre-wrap">{{ $message['content'] }}</div>
                    </div>
                </div>
            @endforeach

            {{-- Streaming response --}}
            @if($isStreaming && $currentResponse)
                <div class="mb-4 text-left">
                    <div class="inline-block max-w-[80%] p-4 rounded-lg bg-gray-100 text-gray-900">
                        <div class="text-xs opacity-70 mb-1">AI · Streaming...</div>
                        <div
                            wire:stream="streamResponse"
                            class="whitespace-pre-wrap"
                        >{{ $currentResponse }}</div>
                        <div class="mt-2 flex items-center gap-1">
                            <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                            <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                        </div>
                    </div>
                </div>
            @endif

            {{-- Empty state --}}
            @if(empty($messages) && !$isStreaming)
                <div class="flex items-center justify-center h-full text-gray-400">
                    <div class="text-center">
                        <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        <p class="text-lg font-medium">Start a conversation</p>
                        <p class="text-sm mt-1">Type a message below to begin</p>
                    </div>
                </div>
            @endif
        </div>

        {{-- Input area --}}
        <div class="bg-white rounded-lg shadow-sm p-4">
            <form wire:submit="sendMessage" class="flex items-end gap-4">
                <div class="flex-1">
                    <textarea
                        wire:model="prompt"
                        placeholder="Type your message..."
                        rows="3"
                        class="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
                        :disabled="$isStreaming"
                        @keydown.enter.prevent="$wire.sendMessage()"
                    ></textarea>
                    @error('prompt')
                        <span class="text-red-600 text-sm">{{ $message }}</span>
                    @enderror
                </div>

                <button
                    type="submit"
                    wire:loading.attr="disabled"
                    wire:loading.class="opacity-50 cursor-not-allowed"
                    class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium"
                >
                    <span wire:loading.remove>Send</span>
                    <span wire:loading>
                        <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </span>
                </button>
            </form>

            {{-- Status indicator --}}
            <div class="mt-2 text-sm text-gray-500">
                @if($isStreaming)
                    <span class="flex items-center gap-2">
                        <span class="relative flex h-3 w-3">
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        AI is typing...
                    </span>
                @else
                    <span>Ready to chat</span>
                @endif
            </div>
        </div>
    </div>
</div>
```

## Step 3: Streaming with wire:stream

### Understanding wire:stream

The `wire:stream` directive is Livewire 3's built-in streaming mechanism:

```blade
<div wire:stream="streamResponse">
    {{ $currentResponse }}
</div>
```

**How it works:**

1. When you call `$this->stream()` in your component
2. Livewire calls your generator method
3. Each `yield` sends an SSE update
4. The DOM updates automatically
5. No JavaScript required

### Optimized Streaming Method

For production-grade streaming with better control:

```php
public function streamResponse(string $userPrompt): \Generator
{
    try {
        // Initialize streaming
        $this->currentResponse = '';
        $buffer = '';
        $chunkCount = 0;
        $startTime = microtime(true);

        // Configure LLM with context
        $llm = Mindwave::llm()
            ->setOptions([
                'model' => $this->model,
                'temperature' => $this->temperature,
                'max_tokens' => 2000,
                'stream' => true,
            ]);

        // Create stream with conversation context
        $context = $this->buildConversationContext();
        $stream = $llm->streamText($userPrompt, [
            'system' => $context,
        ]);

        // Process each chunk
        foreach ($stream as $chunk) {
            $this->currentResponse .= $chunk;
            $buffer .= $chunk;
            $chunkCount++;

            // Batch updates every 5 chunks or 100ms
            if ($chunkCount % 5 === 0 || strlen($buffer) > 50) {
                yield; // Send update to frontend
                $buffer = '';
                usleep(10000); // 10ms delay for smooth rendering
            }
        }

        // Final update if buffer has content
        if (!empty($buffer)) {
            yield;
        }

        // Calculate metrics
        $duration = microtime(true) - $startTime;
        $tokensPerSecond = strlen($this->currentResponse) / max($duration, 0.001);

        // Store message with metrics
        $this->storeMessage($userPrompt, $this->currentResponse, [
            'duration_seconds' => round($duration, 2),
            'tokens_per_second' => round($tokensPerSecond, 2),
            'chunk_count' => $chunkCount,
        ]);

        // Update message history
        $this->messages[] = [
            'role' => 'assistant',
            'content' => $this->currentResponse,
            'timestamp' => now(),
        ];

        // Dispatch completion event
        $this->dispatch('stream-completed', [
            'duration' => $duration,
            'chunks' => $chunkCount,
        ]);

    } catch (\Exception $e) {
        logger()->error('Streaming error', [
            'user_id' => Auth::id(),
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ]);

        $this->currentResponse = "I encountered an error processing your request. Please try again.";
        yield;

    } finally {
        $this->isStreaming = false;
        $this->prompt = '';

        // Dispatch event to scroll to bottom
        $this->dispatch('scroll-to-bottom');
    }
}
```

### Handling Stream Interruption

Allow users to cancel streaming:

```php
public bool $shouldCancelStream = false;

public function cancelStream(): void
{
    $this->shouldCancelStream = true;
    $this->isStreaming = false;
}

public function streamResponse(string $userPrompt): \Generator
{
    $this->shouldCancelStream = false;

    foreach ($stream as $chunk) {
        // Check for cancellation
        if ($this->shouldCancelStream) {
            $this->currentResponse .= "\n\n[Cancelled by user]";
            yield;
            break;
        }

        $this->currentResponse .= $chunk;
        yield;
    }
}
```

Add cancel button to the view:

```blade
@if($isStreaming)
    <button
        wire:click="cancelStream"
        class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
    >
        Cancel
    </button>
@endif
```

## Step 4: Message History

### Database Schema

Create migration for chat messages:

```bash
php artisan make:migration create_chat_messages_table
```

```php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('conversation_id')->nullable()->constrained()->cascadeOnDelete();
            $table->text('prompt');
            $table->longText('response');
            $table->string('model', 100)->default('gpt-4-turbo');
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index('conversation_id');
        });

        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title')->nullable();
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'last_message_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chat_messages');
        Schema::dropIfExists('conversations');
    }
};
```

### Model Classes

Create `app/Models/ChatMessage.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatMessage extends Model
{
    protected $fillable = [
        'user_id',
        'conversation_id',
        'prompt',
        'response',
        'model',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }
}
```

Create `app/Models/Conversation.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conversation extends Model
{
    protected $fillable = [
        'user_id',
        'title',
        'last_message_at',
    ];

    protected $casts = [
        'last_message_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class);
    }

    /**
     * Auto-generate title from first message
     */
    public function generateTitle(): void
    {
        if ($this->title) {
            return;
        }

        $firstMessage = $this->messages()->oldest()->first();
        if ($firstMessage) {
            $this->title = \Illuminate\Support\Str::limit($firstMessage->prompt, 50);
            $this->save();
        }
    }
}
```

### Load History with Pagination

Update the component to support pagination:

```php
use Livewire\WithPagination;

class ChatInterface extends Component
{
    use WithPagination;

    public int $messagesPerPage = 50;

    /**
     * Load paginated messages
     */
    public function loadMessages(): void
    {
        $query = ChatMessage::query()
            ->where('user_id', Auth::id());

        if ($this->conversationId) {
            $query->where('conversation_id', $this->conversationId);
        }

        $messages = $query
            ->with('conversation')
            ->latest()
            ->take($this->messagesPerPage)
            ->get()
            ->reverse();

        $this->messages = [];

        foreach ($messages as $msg) {
            // Add user message
            $this->messages[] = [
                'role' => 'user',
                'content' => $msg->prompt,
                'timestamp' => $msg->created_at,
                'id' => $msg->id,
            ];

            // Add assistant response
            $this->messages[] = [
                'role' => 'assistant',
                'content' => $msg->response,
                'timestamp' => $msg->created_at,
                'id' => $msg->id,
            ];
        }
    }

    /**
     * Load more messages (infinite scroll)
     */
    public function loadMoreMessages(): void
    {
        $this->messagesPerPage += 20;
        $this->loadMessages();

        $this->dispatch('messages-loaded');
    }
}
```

### Scroll to Bottom with Alpine.js

Enhanced scrolling in the view:

```blade
<div
    class="bg-white rounded-lg shadow-sm p-6 mb-6 min-h-[500px] max-h-[600px] overflow-y-auto"
    x-data="{
        scrollToBottom() {
            this.$el.scrollTop = this.$el.scrollHeight;
        },
        atBottom() {
            return Math.abs(this.$el.scrollHeight - this.$el.clientHeight - this.$el.scrollTop) < 10;
        }
    }"
    x-init="
        scrollToBottom();
        $watch('$wire.messages.length', () => {
            setTimeout(() => scrollToBottom(), 100);
        });
    "
    @scroll-to-bottom.window="scrollToBottom()"
    @messages-loaded.window="console.log('Messages loaded')"
>
    {{-- Load more button at top --}}
    @if(count($messages) >= $messagesPerPage)
        <div class="text-center mb-4">
            <button
                wire:click="loadMoreMessages"
                class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
                Load Earlier Messages
            </button>
        </div>
    @endif

    {{-- Messages... --}}
</div>
```

## Step 5: Advanced Features

### Feature 1: Multi-turn Conversation Context

Implement intelligent context management:

```php
/**
 * Build conversation context with sliding window
 */
protected function buildConversationContext(): string
{
    // Configuration
    $maxContextMessages = 10; // Last 5 exchanges
    $maxContextTokens = 3000; // Approximate token limit

    // Get recent messages
    $recentMessages = array_slice($this->messages, -$maxContextMessages);

    // Build context with token estimation
    $context = "You are a helpful AI assistant with expertise in Laravel development. ";
    $context .= "Be concise, accurate, and provide code examples when relevant.\n\n";
    $context .= "Recent conversation:\n\n";

    $estimatedTokens = strlen($context) / 4; // Rough estimation

    foreach ($recentMessages as $msg) {
        $messageText = "{$msg['role']}: {$msg['content']}\n\n";
        $messageTokens = strlen($messageText) / 4;

        // Stop if exceeding token limit
        if ($estimatedTokens + $messageTokens > $maxContextTokens) {
            break;
        }

        $context .= $messageText;
        $estimatedTokens += $messageTokens;
    }

    return $context;
}

/**
 * Summarize conversation for long-term context
 */
protected function summarizeConversation(): string
{
    if (count($this->messages) < 20) {
        return '';
    }

    // Take first half of messages for summary
    $messagesToSummarize = array_slice($this->messages, 0, count($this->messages) / 2);

    $summaryPrompt = "Summarize the following conversation in 2-3 sentences:\n\n";

    foreach ($messagesToSummarize as $msg) {
        $summaryPrompt .= "{$msg['role']}: {$msg['content']}\n";
    }

    try {
        $summary = Mindwave::llm()
            ->setOptions(['model' => 'gpt-3.5-turbo', 'max_tokens' => 150])
            ->generateText($summaryPrompt);

        return "Previous conversation summary: " . $summary . "\n\n";
    } catch (\Exception $e) {
        logger()->warning('Failed to summarize conversation', [
            'error' => $e->getMessage(),
        ]);

        return '';
    }
}
```

### Feature 2: Typing Indicator with wire:loading

Enhanced loading states:

```blade
{{-- In the message container --}}
@if($isStreaming && empty($currentResponse))
    <div class="mb-4 text-left">
        <div class="inline-block p-4 rounded-lg bg-gray-100">
            <div class="flex items-center gap-2">
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
                <span class="ml-2 text-sm text-gray-500">AI is thinking...</span>
            </div>
        </div>
    </div>
@endif

{{-- Advanced status indicator --}}
<div class="mt-2 text-sm">
    <div wire:loading wire:target="sendMessage" class="flex items-center gap-2 text-blue-600">
        <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Processing your message...</span>
    </div>

    <div wire:loading.remove wire:target="sendMessage">
        @if($isStreaming)
            <div class="flex items-center gap-2 text-green-600">
                <span class="relative flex h-3 w-3">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span>Streaming response... ({{ strlen($currentResponse) }} characters)</span>
            </div>
        @else
            <span class="text-gray-500">Ready to chat with {{ $model }}</span>
        @endif
    </div>
</div>
```

### Feature 3: File Upload for Vision APIs

Add file upload capability for images and documents:

```php
use Livewire\WithFileUploads;
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;

class ChatInterface extends Component
{
    use WithFileUploads;

    public ?TemporaryUploadedFile $uploadedFile = null;
    public array $attachments = [];

    /**
     * Handle file upload
     */
    public function updatedUploadedFile(): void
    {
        $this->validate([
            'uploadedFile' => 'required|file|max:10240|mimes:jpg,jpeg,png,pdf,txt,doc,docx',
        ]);

        // Store file temporarily
        $path = $this->uploadedFile->store('chat-uploads', 'local');

        $this->attachments[] = [
            'path' => $path,
            'name' => $this->uploadedFile->getClientOriginalName(),
            'type' => $this->uploadedFile->getMimeType(),
            'size' => $this->uploadedFile->getSize(),
        ];

        // Reset upload
        $this->uploadedFile = null;

        $this->dispatch('file-uploaded');
    }

    /**
     * Remove attachment
     */
    public function removeAttachment(int $index): void
    {
        if (isset($this->attachments[$index])) {
            // Delete file
            \Storage::disk('local')->delete($this->attachments[$index]['path']);

            // Remove from array
            array_splice($this->attachments, $index, 1);
        }
    }

    /**
     * Send message with attachments (including images)
     */
    public function sendMessageWithAttachments(): void
    {
        $this->validate([
            'prompt' => 'required|string|max:5000',
        ]);

        // Process attachments for vision API
        $attachmentData = [];

        foreach ($this->attachments as $attachment) {
            $fullPath = storage_path('app/' . $attachment['path']);

            // Handle images for vision API
            if (str_starts_with($attachment['type'], 'image/')) {
                $base64 = base64_encode(file_get_contents($fullPath));
                $attachmentData[] = [
                    'type' => 'image',
                    'data' => "data:{$attachment['type']};base64,{$base64}",
                    'name' => $attachment['name'],
                ];
            }
            // Handle text documents
            elseif (str_starts_with($attachment['type'], 'text/')) {
                $content = file_get_contents($fullPath);
                $attachmentData[] = [
                    'type' => 'text',
                    'data' => $content,
                    'name' => $attachment['name'],
                ];
            }
        }

        // Add message to history with attachments
        $this->messages[] = [
            'role' => 'user',
            'content' => $this->prompt,
            'attachments' => $attachmentData,
            'timestamp' => now(),
        ];

        $this->isStreaming = true;
        $this->currentResponse = '';

        // Stream with attachment context
        $this->stream(
            to: 'streamResponseWithAttachments',
            content: $this->prompt,
            attachments: $attachmentData,
        );
    }

    /**
     * Stream response with vision/document context
     */
    public function streamResponseWithAttachments(
        string $userPrompt,
        array $attachments = []
    ): \Generator {
        try {
            // Build prompt with attachment descriptions
            $enhancedPrompt = $userPrompt;

            if (!empty($attachments)) {
                $enhancedPrompt .= "\n\nAttachments:\n";

                foreach ($attachments as $i => $attachment) {
                    $enhancedPrompt .= ($i + 1) . ". {$attachment['name']} ({$attachment['type']})\n";

                    // For vision models, include image data
                    if ($attachment['type'] === 'image' &&
                        in_array($this->model, ['gpt-4-vision-preview', 'claude-3-opus'])) {
                        $enhancedPrompt .= "   [Image data attached]\n";
                    }

                    // For text, include content
                    if ($attachment['type'] === 'text') {
                        $enhancedPrompt .= "   Content: " . $attachment['data'] . "\n";
                    }
                }
            }

            // Stream with enhanced prompt
            $llm = Mindwave::llm()->setOptions([
                'model' => $this->model,
                'temperature' => $this->temperature,
            ]);

            $stream = $llm->streamText($enhancedPrompt);

            foreach ($stream as $chunk) {
                $this->currentResponse .= $chunk;
                yield;
                usleep(10000);
            }

            // Store and cleanup
            $this->storeMessage($userPrompt, $this->currentResponse);
            $this->messages[] = [
                'role' => 'assistant',
                'content' => $this->currentResponse,
                'timestamp' => now(),
            ];

            // Clear attachments
            foreach ($this->attachments as $attachment) {
                \Storage::disk('local')->delete($attachment['path']);
            }
            $this->attachments = [];

        } catch (\Exception $e) {
            $this->currentResponse = 'Error processing attachments: ' . $e->getMessage();
            yield;
        } finally {
            $this->isStreaming = false;
            $this->prompt = '';
        }
    }
}
```

File upload UI:

```blade
{{-- File upload section --}}
<div class="mb-4">
    <label class="flex items-center justify-center w-full px-4 py-3 bg-gray-50 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-100 transition">
        <div class="flex items-center gap-2 text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <span>Attach file (image, document)</span>
        </div>
        <input
            type="file"
            wire:model="uploadedFile"
            class="hidden"
            accept="image/*,.pdf,.txt,.doc,.docx"
        />
    </label>

    @error('uploadedFile')
        <span class="text-red-600 text-sm">{{ $message }}</span>
    @enderror

    {{-- File upload progress --}}
    <div wire:loading wire:target="uploadedFile" class="mt-2 text-sm text-blue-600">
        Uploading...
    </div>
</div>

{{-- Attachments preview --}}
@if(!empty($attachments))
    <div class="mb-4 flex flex-wrap gap-2">
        @foreach($attachments as $index => $attachment)
            <div class="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span class="text-sm">{{ $attachment['name'] }}</span>
                <button
                    wire:click="removeAttachment({{ $index }})"
                    class="text-blue-900 hover:text-red-600"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        @endforeach
    </div>
@endif
```

## Step 6: Multiple Components

### Chat Sidebar Component

Create conversation list sidebar:

```bash
php artisan make:livewire ChatSidebar
```

`app/Livewire/ChatSidebar.php`:

```php
<?php

namespace App\Livewire;

use Livewire\Component;
use Livewire\Attributes\On;
use App\Models\Conversation;
use Illuminate\Support\Facades\Auth;

class ChatSidebar extends Component
{
    public array $conversations = [];
    public ?int $activeConversationId = null;

    public function mount(?int $conversationId = null): void
    {
        $this->activeConversationId = $conversationId;
        $this->loadConversations();
    }

    /**
     * Load user's conversations
     */
    public function loadConversations(): void
    {
        $this->conversations = Conversation::query()
            ->where('user_id', Auth::id())
            ->orderBy('last_message_at', 'desc')
            ->limit(50)
            ->get()
            ->map(fn ($conv) => [
                'id' => $conv->id,
                'title' => $conv->title ?? 'New Conversation',
                'last_message_at' => $conv->last_message_at,
                'message_count' => $conv->messages()->count(),
            ])
            ->toArray();
    }

    /**
     * Create new conversation
     */
    public function createConversation(): void
    {
        $conversation = Conversation::create([
            'user_id' => Auth::id(),
            'last_message_at' => now(),
        ]);

        $this->activeConversationId = $conversation->id;
        $this->loadConversations();

        $this->dispatch('conversation-selected', conversationId: $conversation->id);
    }

    /**
     * Select conversation
     */
    public function selectConversation(int $conversationId): void
    {
        $this->activeConversationId = $conversationId;
        $this->dispatch('conversation-selected', conversationId: $conversationId);
    }

    /**
     * Delete conversation
     */
    public function deleteConversation(int $conversationId): void
    {
        Conversation::where('id', $conversationId)
            ->where('user_id', Auth::id())
            ->delete();

        $this->loadConversations();

        if ($this->activeConversationId === $conversationId) {
            $this->activeConversationId = null;
            $this->dispatch('conversation-deleted');
        }
    }

    /**
     * Listen for new messages
     */
    #[On('message-sent')]
    public function onMessageSent(): void
    {
        $this->loadConversations();
    }

    public function render()
    {
        return view('livewire.chat-sidebar');
    }
}
```

`resources/views/livewire/chat-sidebar.blade.php`:

```blade
<div class="w-64 bg-white border-r border-gray-200 h-full overflow-y-auto">
    {{-- Header --}}
    <div class="p-4 border-b border-gray-200">
        <button
            wire:click="createConversation"
            class="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium"
        >
            + New Chat
        </button>
    </div>

    {{-- Conversations list --}}
    <div class="p-2">
        @forelse($conversations as $conversation)
            <div
                wire:key="conversation-{{ $conversation['id'] }}"
                class="group relative mb-1"
            >
                <button
                    wire:click="selectConversation({{ $conversation['id'] }})"
                    class="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition {{
                        $activeConversationId === $conversation['id']
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700'
                    }}"
                >
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex-1 min-w-0">
                            <div class="font-medium truncate text-sm">
                                {{ $conversation['title'] }}
                            </div>
                            <div class="text-xs text-gray-500 mt-1">
                                {{ $conversation['last_message_at']->diffForHumans() }}
                            </div>
                        </div>

                        <span class="text-xs bg-gray-200 px-2 py-1 rounded">
                            {{ $conversation['message_count'] }}
                        </span>
                    </div>
                </button>

                {{-- Delete button (visible on hover) --}}
                <button
                    wire:click="deleteConversation({{ $conversation['id'] }})"
                    wire:confirm="Delete this conversation?"
                    class="absolute right-2 top-2 p-1 bg-red-100 text-red-600 rounded opacity-0 group-hover:opacity-100 transition"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        @empty
            <div class="text-center text-gray-400 py-8">
                <p class="text-sm">No conversations yet</p>
                <p class="text-xs mt-1">Start a new chat above</p>
            </div>
        @endforelse
    </div>
</div>
```

### Chat Header Component

Model selector and settings:

```bash
php artisan make:livewire ChatHeader
```

`app/Livewire/ChatHeader.php`:

```php
<?php

namespace App\Livewire;

use Livewire\Component;

class ChatHeader extends Component
{
    public string $model = 'gpt-4-turbo';
    public float $temperature = 0.7;
    public int $maxTokens = 2000;
    public bool $showSettings = false;

    public array $availableModels = [
        'gpt-4-turbo' => ['name' => 'GPT-4 Turbo', 'provider' => 'OpenAI'],
        'gpt-3.5-turbo' => ['name' => 'GPT-3.5 Turbo', 'provider' => 'OpenAI'],
        'claude-3-opus' => ['name' => 'Claude 3 Opus', 'provider' => 'Anthropic'],
        'claude-3-sonnet' => ['name' => 'Claude 3 Sonnet', 'provider' => 'Anthropic'],
        'claude-3-haiku' => ['name' => 'Claude 3 Haiku', 'provider' => 'Anthropic'],
    ];

    public function updatedModel(): void
    {
        $this->dispatch('model-changed', model: $this->model);
    }

    public function updatedTemperature(): void
    {
        $this->dispatch('temperature-changed', temperature: $this->temperature);
    }

    public function updatedMaxTokens(): void
    {
        $this->dispatch('max-tokens-changed', maxTokens: $this->maxTokens);
    }

    public function toggleSettings(): void
    {
        $this->showSettings = !$this->showSettings;
    }

    public function render()
    {
        return view('livewire.chat-header');
    }
}
```

`resources/views/livewire/chat-header.blade.php`:

```blade
<div class="bg-white border-b border-gray-200 p-4">
    <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
            <h1 class="text-xl font-bold text-gray-900">AI Chat</h1>

            {{-- Model selector --}}
            <select
                wire:model.live="model"
                class="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
                @foreach($availableModels as $value => $info)
                    <option value="{{ $value }}">
                        {{ $info['name'] }} ({{ $info['provider'] }})
                    </option>
                @endforeach
            </select>
        </div>

        <div class="flex items-center gap-2">
            {{-- Settings toggle --}}
            <button
                wire:click="toggleSettings"
                class="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>
        </div>
    </div>

    {{-- Settings panel --}}
    @if($showSettings)
        <div class="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
            {{-- Temperature --}}
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    Temperature: {{ $temperature }}
                    <span class="text-xs text-gray-500">(0 = focused, 2 = creative)</span>
                </label>
                <input
                    type="range"
                    wire:model.live="temperature"
                    min="0"
                    max="2"
                    step="0.1"
                    class="w-full"
                />
            </div>

            {{-- Max tokens --}}
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    Max Tokens: {{ $maxTokens }}
                </label>
                <input
                    type="range"
                    wire:model.live="maxTokens"
                    min="100"
                    max="4000"
                    step="100"
                    class="w-full"
                />
            </div>
        </div>
    @endif
</div>
```

## Step 7: Testing Livewire Components

### Setup Test Environment

Install dependencies:

```bash
composer require --dev livewire/livewire
```

### Component Tests

Create `tests/Feature/Livewire/ChatInterfaceTest.php`:

```php
<?php

namespace Tests\Feature\Livewire;

use Tests\TestCase;
use App\Livewire\ChatInterface;
use App\Models\User;
use App\Models\ChatMessage;
use Livewire\Livewire;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mindwave\Mindwave\Facades\Mindwave;

class ChatInterfaceTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->actingAs($this->user);
    }

    /** @test */
    public function it_renders_successfully(): void
    {
        Livewire::test(ChatInterface::class)
            ->assertStatus(200)
            ->assertSee('AI Chat');
    }

    /** @test */
    public function it_loads_recent_messages(): void
    {
        // Create test messages
        ChatMessage::factory()->count(5)->create([
            'user_id' => $this->user->id,
        ]);

        Livewire::test(ChatInterface::class)
            ->assertSet('messages', function ($messages) {
                return count($messages) === 10; // 5 user + 5 assistant
            });
    }

    /** @test */
    public function it_validates_prompt_before_sending(): void
    {
        Livewire::test(ChatInterface::class)
            ->set('prompt', '')
            ->call('sendMessage')
            ->assertHasErrors(['prompt' => 'required']);

        Livewire::test(ChatInterface::class)
            ->set('prompt', str_repeat('a', 5001))
            ->call('sendMessage')
            ->assertHasErrors(['prompt' => 'max']);
    }

    /** @test */
    public function it_sends_message_successfully(): void
    {
        Livewire::test(ChatInterface::class)
            ->set('prompt', 'Hello AI')
            ->call('sendMessage')
            ->assertSet('isStreaming', true)
            ->assertSet('prompt', '') // Cleared after sending
            ->assertDispatched('scroll-to-bottom');
    }

    /** @test */
    public function it_stores_message_after_streaming(): void
    {
        // Mock Mindwave LLM
        Mindwave::shouldReceive('llm')
            ->once()
            ->andReturnSelf();

        Mindwave::shouldReceive('setOptions')
            ->once()
            ->andReturnSelf();

        Mindwave::shouldReceive('streamText')
            ->once()
            ->andReturn(new \ArrayIterator(['Hello ', 'there!']));

        Livewire::test(ChatInterface::class)
            ->set('prompt', 'Test prompt')
            ->call('sendMessage');

        // Assert message was stored
        $this->assertDatabaseHas('chat_messages', [
            'user_id' => $this->user->id,
            'prompt' => 'Test prompt',
        ]);
    }

    /** @test */
    public function it_clears_conversation(): void
    {
        Livewire::test(ChatInterface::class)
            ->set('messages', [
                ['role' => 'user', 'content' => 'Test'],
            ])
            ->call('clearConversation')
            ->assertSet('messages', [])
            ->assertSet('currentResponse', '')
            ->assertDispatched('conversation-cleared');
    }

    /** @test */
    public function it_updates_model_selection(): void
    {
        Livewire::test(ChatInterface::class)
            ->set('model', 'gpt-3.5-turbo')
            ->assertSet('model', 'gpt-3.5-turbo')
            ->assertDispatched('model-updated');
    }

    /** @test */
    public function it_handles_streaming_errors_gracefully(): void
    {
        // Mock exception during streaming
        Mindwave::shouldReceive('llm')
            ->once()
            ->andThrow(new \Exception('API Error'));

        Livewire::test(ChatInterface::class)
            ->set('prompt', 'Test')
            ->call('sendMessage')
            ->assertSet('isStreaming', false)
            ->assertSee('Error');
    }
}
```

### Stream Testing

Test streaming behavior:

```php
/** @test */
public function it_streams_response_progressively(): void
{
    // Mock streaming chunks
    $chunks = ['Hello', ' ', 'world', '!'];

    Mindwave::shouldReceive('llm->setOptions->streamText')
        ->once()
        ->andReturn(new \ArrayIterator($chunks));

    $component = Livewire::test(ChatInterface::class)
        ->set('prompt', 'Test prompt');

    // Call streaming method
    $generator = $component->call('streamResponse', 'Test prompt');

    // Iterate through stream
    $responses = [];
    foreach ($generator as $chunk) {
        $responses[] = $component->get('currentResponse');
    }

    // Assert progressive updates
    $this->assertCount(4, $responses);
    $this->assertEquals('Hello', $responses[0]);
    $this->assertEquals('Hello ', $responses[1]);
    $this->assertEquals('Hello world', $responses[2]);
    $this->assertEquals('Hello world!', $responses[3]);
}
```

### Integration Tests

Test full chat flow:

```php
/** @test */
public function it_handles_full_conversation_flow(): void
{
    Livewire::test(ChatInterface::class)
        // Send first message
        ->set('prompt', 'What is Laravel?')
        ->call('sendMessage')
        ->assertSet('isStreaming', true)

        // Wait for completion (in real test, mock streaming)
        ->assertSet('isStreaming', false)

        // Verify message added
        ->assertSet('messages', function ($messages) {
            return count($messages) >= 2; // User + assistant
        })

        // Send follow-up
        ->set('prompt', 'Tell me more')
        ->call('sendMessage')

        // Verify context includes previous messages
        ->assertSet('messages', function ($messages) {
            return count($messages) >= 4;
        });
}
```

## Best Practices

### Component Organization

**Keep components focused:**

```php
// Good: Single responsibility
class ChatInterface extends Component { /* Handles chat only */ }
class ChatSidebar extends Component { /* Handles navigation */ }
class ChatHeader extends Component { /* Handles settings */ }

// Bad: God component
class ChatComponent extends Component { /* Everything */ }
```

**Use events for communication:**

```php
// Parent → Child
$this->dispatch('conversation-selected', conversationId: $id);

// Child → Parent
$this->dispatch('message-sent')->up();

// Global
$this->dispatch('notification', message: 'Saved!');
```

### State Management

**Minimize reactive properties:**

```php
// Good: Only essential state
public string $prompt = '';
public bool $isStreaming = false;

// Bad: Everything public
public string $tempValue1 = '';
public string $tempValue2 = '';
public array $cache = [];
```

**Use computed properties:**

```php
public function getMessageCountProperty(): int
{
    return count($this->messages);
}

// In view: {{ $this->messageCount }}
```

### Performance Optimization

**Lazy load conversations:**

```php
public function mount(): void
{
    // Don't load immediately
    $this->skipRender();
}

public function hydrate(): void
{
    // Load on first interaction
    if (empty($this->messages)) {
        $this->loadMessages();
    }
}
```

**Debounce expensive operations:**

```blade
<input wire:model.debounce.500ms="searchQuery" />
```

**Use wire:key for lists:**

```blade
@foreach($messages as $message)
    <div wire:key="message-{{ $message['id'] }}">
        {{-- Content --}}
    </div>
@endforeach
```

### Security Considerations

**Always validate input:**

```php
public function sendMessage(): void
{
    $this->validate([
        'prompt' => [
            'required',
            'string',
            'max:5000',
            'not_regex:/(?:script|javascript|onerror)/i', // XSS protection
        ],
    ]);
}
```

**Authorize actions:**

```php
public function deleteConversation(int $id): void
{
    $conversation = Conversation::findOrFail($id);

    $this->authorize('delete', $conversation);

    $conversation->delete();
}
```

**Rate limit streaming:**

```php
use Illuminate\Support\Facades\RateLimiter;

public function sendMessage(): void
{
    $key = 'chat:' . Auth::id();

    if (RateLimiter::tooManyAttempts($key, 10)) {
        $this->addError('prompt', 'Too many requests. Please wait.');
        return;
    }

    RateLimiter::hit($key, 60);

    // Continue...
}
```

## Production Considerations

### Rate Limiting Per Session

Implement granular rate limiting:

```php
use Illuminate\Support\Facades\RateLimiter;

class ChatInterface extends Component
{
    protected function checkRateLimit(): bool
    {
        $key = 'chat:' . Auth::id();

        if (RateLimiter::tooManyAttempts($key, 20)) {
            $seconds = RateLimiter::availableIn($key);

            $this->addError('prompt',
                "Rate limit exceeded. Try again in {$seconds} seconds."
            );

            return false;
        }

        RateLimiter::hit($key, 60);
        return true;
    }

    public function sendMessage(): void
    {
        if (!$this->checkRateLimit()) {
            return;
        }

        // Continue...
    }
}
```

### Memory Management

Prevent memory leaks in long-running streams:

```php
public function streamResponse(string $userPrompt): \Generator
{
    // Use generator pattern (already memory-efficient)
    $stream = Mindwave::llm()->streamText($userPrompt);

    foreach ($stream as $chunk) {
        $this->currentResponse .= $chunk;
        yield;

        // Limit response size
        if (strlen($this->currentResponse) > 10000) {
            $this->currentResponse .= "\n\n[Response truncated]";
            break;
        }

        // Clear output buffer
        if (ob_get_level() > 0) {
            ob_flush();
        }
    }
}
```

### WebSocket Alternative

For high-concurrency, consider WebSockets with Laravel Echo:

```bash
composer require pusher/pusher-php-server
```

```php
use Illuminate\Support\Facades\Broadcast;

public function streamResponse(string $userPrompt): void
{
    $channel = 'chat.' . Auth::id();

    $stream = Mindwave::llm()->streamText($userPrompt);

    foreach ($stream as $chunk) {
        Broadcast::event(new StreamChunk($channel, $chunk));
        usleep(10000);
    }

    Broadcast::event(new StreamComplete($channel));
}
```

Frontend with Echo:

```javascript
Echo.private(`chat.${userId}`)
    .listen('StreamChunk', (e) => {
        // Update UI
    })
    .listen('StreamComplete', (e) => {
        // Finalize
    });
```

### Deployment Tips

**Environment configuration:**

```dotenv
# .env
MINDWAVE_STREAM_TIMEOUT=300
LIVEWIRE_ASSET_URL=/livewire
SESSION_DRIVER=database  # More reliable than file for streaming
QUEUE_CONNECTION=redis   # For async operations
```

**Server configuration (nginx):**

```nginx
location /livewire {
    proxy_pass http://localhost:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;

    # Streaming support
    proxy_buffering off;
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;
    chunked_transfer_encoding on;
}
```

**Monitoring:**

```php
use Illuminate\Support\Facades\Log;

public function streamResponse(string $userPrompt): \Generator
{
    $startTime = microtime(true);
    $chunkCount = 0;

    try {
        foreach ($stream as $chunk) {
            $chunkCount++;
            $this->currentResponse .= $chunk;
            yield;
        }

        Log::info('Stream completed', [
            'user_id' => Auth::id(),
            'duration' => microtime(true) - $startTime,
            'chunks' => $chunkCount,
            'tokens' => strlen($this->currentResponse),
        ]);

    } catch (\Exception $e) {
        Log::error('Stream failed', [
            'user_id' => Auth::id(),
            'error' => $e->getMessage(),
            'duration' => microtime(true) - $startTime,
        ]);

        throw $e;
    }
}
```

## Next Steps

-   **[SSE Streaming](../core/streaming.md)** - Deep dive into server-sent events
-   **[Observability](../observability/tracing.md)** - Monitor chat performance with OpenTelemetry
-   **[Context Discovery](../core/context-discovery.md)** - Enhance conversations with contextual data
-   **[Prompt Engineering](../advanced/prompt-templates.md)** - Optimize prompts for better responses
-   **[RAG Integration](../rag/overview.md)** - Add knowledge retrieval to your chat
