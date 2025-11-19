# Building a Real-Time Streaming Chat Interface

Build a production-ready chat application with real-time AI responses, message persistence, and multiple frontend implementations. This cookbook walks through creating a complete ChatGPT-style interface using Mindwave's streaming capabilities.

## What You'll Build

A complete chat application featuring:

- **Real-time streaming responses** - See AI responses appear token-by-token
- **Message persistence** - Store conversations and messages in your database
- **Multiple frontend options** - Choose Vanilla JS, Alpine.js, or Vue.js
- **Production features** - Error handling, reconnection, typing indicators
- **Observable architecture** - OpenTelemetry tracing built-in
- **Laravel-native** - Eloquent models, events, and best practices

## Prerequisites

- Mindwave installed and configured (`composer require mindwave/mindwave`)
- OpenAI or Anthropic API key configured
- Laravel 10+ application
- Basic understanding of SSE (Server-Sent Events)

## Architecture Overview

### Data Flow

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │         │    Laravel   │         │  LLM API    │
│  (Frontend) │────────▶│   Backend    │────────▶│ (OpenAI/    │
│             │  POST   │              │  Stream │  Anthropic) │
└─────────────┘         └──────────────┘         └─────────────┘
       │                       │                        │
       │                       │                        │
       │  EventSource (SSE)    │                        │
       │◀──────────────────────┤                        │
       │  event: message       │  Generator<chunk>      │
       │  data: "Hello"        │◀───────────────────────┤
       │                       │                        │
       │  event: message       │                        │
       │  data: " world"       │◀───────────────────────┤
       │                       │                        │
       │  event: done          │                        │
       │◀──────────────────────┤                        │
       │                       │                        │
       │                       ▼                        │
       │              Save to Database                  │
       └───────────────────────────────────────────────┘
```

### Key Components

1. **Database Layer** - Conversations and Messages models
2. **Backend API** - Controller with streaming endpoint
3. **Frontend Client** - EventSource for receiving SSE
4. **Persistence** - Store messages as they stream

## Step 1: Database Setup

### Create Migrations

```bash
php artisan make:migration create_conversations_table
php artisan make:migration create_messages_table
```

### Conversations Migration

```php
// database/migrations/xxxx_xx_xx_create_conversations_table.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title')->nullable();
            $table->json('metadata')->nullable(); // Store model, temperature, etc.
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'last_message_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};
```

### Messages Migration

```php
// database/migrations/xxxx_xx_xx_create_messages_table.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->enum('role', ['user', 'assistant', 'system']);
            $table->text('content');
            $table->json('metadata')->nullable(); // Tokens, cost, model, etc.
            $table->timestamps();

            $table->index(['conversation_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
```

Run migrations:

```bash
php artisan migrate
```

### Create Models

**Conversation Model:**

```php
// app/Models/Conversation.php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conversation extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'metadata',
        'last_message_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'last_message_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class)->orderBy('created_at');
    }

    /**
     * Get the latest messages for context
     */
    public function getRecentMessages(int $limit = 10): array
    {
        return $this->messages()
            ->latest()
            ->limit($limit)
            ->get()
            ->reverse()
            ->map(fn($msg) => [
                'role' => $msg->role,
                'content' => $msg->content,
            ])
            ->toArray();
    }

    /**
     * Auto-generate title from first message
     */
    public function generateTitle(): void
    {
        if ($this->title) {
            return;
        }

        $firstMessage = $this->messages()->where('role', 'user')->first();
        if ($firstMessage) {
            $this->update([
                'title' => \Str::limit($firstMessage->content, 50),
            ]);
        }
    }
}
```

**Message Model:**

```php
// app/Models/Message.php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    use HasFactory;

    protected $fillable = [
        'conversation_id',
        'role',
        'content',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    /**
     * Calculate estimated tokens (rough estimate)
     */
    public function estimateTokens(): int
    {
        // Rough estimate: ~4 characters per token
        return (int) ceil(strlen($this->content) / 4);
    }
}
```

## Step 2: Backend Streaming API

### Create Controller

```bash
php artisan make:controller Api/ChatController
```

### Complete Controller Implementation

```php
// app/Http/Controllers/Api/ChatController.php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\LLM\Streaming\StreamedTextResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ChatController extends Controller
{
    /**
     * Stream a chat response
     *
     * This endpoint:
     * 1. Validates the request
     * 2. Creates/retrieves conversation
     * 3. Stores the user message
     * 4. Streams the AI response in real-time
     * 5. Stores the complete AI response
     */
    public function stream(Request $request): StreamedResponse
    {
        $validated = $request->validate([
            'conversation_id' => 'nullable|exists:conversations,id',
            'message' => 'required|string|max:10000',
            'model' => 'nullable|string',
            'temperature' => 'nullable|numeric|min:0|max:2',
        ]);

        $userId = auth()->id();

        try {
            // Get or create conversation
            $conversation = $this->getOrCreateConversation(
                $validated['conversation_id'] ?? null,
                $userId
            );

            // Store user message
            $userMessage = $conversation->messages()->create([
                'role' => 'user',
                'content' => $validated['message'],
            ]);

            // Update conversation timestamp
            $conversation->update(['last_message_at' => now()]);

            // Generate title if this is the first message
            if ($conversation->messages()->count() === 1) {
                $conversation->generateTitle();
            }

            // Get conversation history for context
            $history = $conversation->getRecentMessages(10);

            // Configure LLM
            $llm = Mindwave::llm()->setOptions([
                'model' => $validated['model'] ?? config('mindwave-llm.providers.openai.model'),
                'temperature' => $validated['temperature'] ?? 0.7,
                'max_tokens' => 2000,
            ]);

            // Build prompt with history
            $prompt = $this->buildPromptWithHistory($history);

            // Start streaming
            $stream = $llm->streamText($prompt);
            $response = new StreamedTextResponse($stream);

            // Accumulate the response for storage
            $fullResponse = '';
            $response->onChunk(function (string $chunk) use (&$fullResponse) {
                $fullResponse .= $chunk;
            });

            // Store the complete response after streaming finishes
            register_shutdown_function(function () use (&$fullResponse, $conversation) {
                if (!empty($fullResponse)) {
                    $conversation->messages()->create([
                        'role' => 'assistant',
                        'content' => $fullResponse,
                        'metadata' => [
                            'tokens' => (int) ceil(strlen($fullResponse) / 4),
                            'streamed' => true,
                        ],
                    ]);

                    $conversation->update(['last_message_at' => now()]);
                }
            });

            // Return SSE stream
            return $response->toStreamedResponse(
                status: 200,
                headers: [
                    'X-Conversation-ID' => (string) $conversation->id,
                    'X-Message-ID' => (string) $userMessage->id,
                ]
            );

        } catch (\Exception $e) {
            Log::error('Chat streaming failed', [
                'error' => $e->getMessage(),
                'user_id' => $userId,
                'conversation_id' => $validated['conversation_id'] ?? null,
            ]);

            return response()->json([
                'error' => 'Failed to generate response',
                'message' => config('app.debug') ? $e->getMessage() : 'Please try again',
            ], 500);
        }
    }

    /**
     * Get conversation history
     */
    public function getConversation(Request $request, int $conversationId)
    {
        $conversation = Conversation::with('messages')
            ->where('user_id', auth()->id())
            ->findOrFail($conversationId);

        return response()->json([
            'conversation' => [
                'id' => $conversation->id,
                'title' => $conversation->title,
                'created_at' => $conversation->created_at,
                'last_message_at' => $conversation->last_message_at,
            ],
            'messages' => $conversation->messages->map(fn($msg) => [
                'id' => $msg->id,
                'role' => $msg->role,
                'content' => $msg->content,
                'created_at' => $msg->created_at,
                'metadata' => $msg->metadata,
            ]),
        ]);
    }

    /**
     * List user's conversations
     */
    public function listConversations(Request $request)
    {
        $conversations = Conversation::where('user_id', auth()->id())
            ->with(['messages' => fn($q) => $q->latest()->limit(1)])
            ->orderBy('last_message_at', 'desc')
            ->paginate(20);

        return response()->json([
            'conversations' => $conversations->map(fn($conv) => [
                'id' => $conv->id,
                'title' => $conv->title ?? 'New Conversation',
                'last_message' => $conv->messages->first()?->content,
                'last_message_at' => $conv->last_message_at,
                'created_at' => $conv->created_at,
            ]),
            'meta' => [
                'current_page' => $conversations->currentPage(),
                'total' => $conversations->total(),
            ],
        ]);
    }

    /**
     * Delete a conversation
     */
    public function deleteConversation(int $conversationId)
    {
        $conversation = Conversation::where('user_id', auth()->id())
            ->findOrFail($conversationId);

        $conversation->delete();

        return response()->json(['message' => 'Conversation deleted']);
    }

    /**
     * Get or create conversation
     */
    private function getOrCreateConversation(?int $conversationId, int $userId): Conversation
    {
        if ($conversationId) {
            return Conversation::where('id', $conversationId)
                ->where('user_id', $userId)
                ->firstOrFail();
        }

        return Conversation::create([
            'user_id' => $userId,
            'last_message_at' => now(),
        ]);
    }

    /**
     * Build prompt with conversation history
     */
    private function buildPromptWithHistory(array $history): string
    {
        if (empty($history)) {
            return '';
        }

        // For a simple implementation, just use the last user message
        // In production, you'd send the full history to the LLM
        $lastMessage = end($history);

        return $lastMessage['content'];
    }
}
```

### Register Routes

```php
// routes/api.php
<?php

use App\Http\Controllers\Api\ChatController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    // Streaming endpoint
    Route::post('/chat/stream', [ChatController::class, 'stream']);

    // Conversation management
    Route::get('/conversations', [ChatController::class, 'listConversations']);
    Route::get('/conversations/{id}', [ChatController::class, 'getConversation']);
    Route::delete('/conversations/{id}', [ChatController::class, 'deleteConversation']);
});
```

## Step 3: Frontend with Vanilla JavaScript

Create a simple, dependency-free chat interface:

```html
<!-- resources/views/chat/vanilla.blade.php -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>AI Chat - Vanilla JS</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #f5f5f5;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .chat-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
            max-width: 900px;
            margin: 0 auto;
            width: 100%;
            background: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }

        .chat-header {
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .chat-header h1 {
            font-size: 24px;
            font-weight: 600;
        }

        .messages-container {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .message {
            display: flex;
            gap: 12px;
            animation: slideIn 0.2s ease-out;
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

        .message.user {
            flex-direction: row-reverse;
        }

        .message-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            flex-shrink: 0;
        }

        .message.user .message-avatar {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .message.assistant .message-avatar {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
        }

        .message-content {
            max-width: 70%;
            padding: 12px 16px;
            border-radius: 16px;
            line-height: 1.5;
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        .message.user .message-content {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-bottom-right-radius: 4px;
        }

        .message.assistant .message-content {
            background: #f5f5f5;
            color: #333;
            border-bottom-left-radius: 4px;
        }

        .typing-indicator {
            display: none;
            align-items: center;
            gap: 12px;
            padding: 0 20px;
        }

        .typing-indicator.active {
            display: flex;
        }

        .typing-dots {
            display: flex;
            gap: 4px;
            padding: 12px 16px;
            background: #f5f5f5;
            border-radius: 16px;
        }

        .typing-dots span {
            width: 8px;
            height: 8px;
            background: #999;
            border-radius: 50%;
            animation: pulse 1.4s infinite ease-in-out;
        }

        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes pulse {
            0%, 80%, 100% { opacity: 0.3; }
            40% { opacity: 1; }
        }

        .input-container {
            padding: 20px;
            background: white;
            border-top: 1px solid #e0e0e0;
        }

        .input-wrapper {
            display: flex;
            gap: 12px;
            align-items: center;
        }

        #messageInput {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 24px;
            font-size: 15px;
            font-family: inherit;
            resize: none;
            max-height: 120px;
            transition: border-color 0.2s;
        }

        #messageInput:focus {
            outline: none;
            border-color: #667eea;
        }

        #sendButton {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            cursor: pointer;
            font-size: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s, opacity 0.2s;
        }

        #sendButton:hover:not(:disabled) {
            transform: scale(1.05);
        }

        #sendButton:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .error-message {
            padding: 12px 16px;
            background: #ffebee;
            color: #c62828;
            border-radius: 8px;
            margin: 0 20px 12px;
            display: none;
        }

        .error-message.active {
            display: block;
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">
            <h1>AI Assistant</h1>
        </div>

        <div class="messages-container" id="messagesContainer"></div>

        <div class="typing-indicator" id="typingIndicator">
            <div class="message-avatar">AI</div>
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>

        <div class="error-message" id="errorMessage"></div>

        <div class="input-container">
            <div class="input-wrapper">
                <textarea
                    id="messageInput"
                    placeholder="Type your message..."
                    rows="1"
                ></textarea>
                <button id="sendButton" title="Send message">
                    ➤
                </button>
            </div>
        </div>
    </div>

    <script>
        class ChatApp {
            constructor() {
                this.messagesContainer = document.getElementById('messagesContainer');
                this.messageInput = document.getElementById('messageInput');
                this.sendButton = document.getElementById('sendButton');
                this.typingIndicator = document.getElementById('typingIndicator');
                this.errorMessage = document.getElementById('errorMessage');

                this.conversationId = null;
                this.eventSource = null;
                this.currentAssistantMessage = null;

                this.init();
            }

            init() {
                // Event listeners
                this.sendButton.addEventListener('click', () => this.sendMessage());
                this.messageInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.sendMessage();
                    }
                });

                // Auto-resize textarea
                this.messageInput.addEventListener('input', () => {
                    this.messageInput.style.height = 'auto';
                    this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
                });
            }

            async sendMessage() {
                const message = this.messageInput.value.trim();
                if (!message || this.eventSource) return;

                // Add user message to UI
                this.addMessage('user', message);

                // Clear input
                this.messageInput.value = '';
                this.messageInput.style.height = 'auto';

                // Hide error
                this.hideError();

                // Show typing indicator
                this.showTyping();

                // Prepare assistant message container
                this.currentAssistantMessage = this.createMessageElement('assistant', '');

                try {
                    await this.streamResponse(message);
                } catch (error) {
                    this.showError('Failed to send message. Please try again.');
                    this.hideTyping();
                    if (this.currentAssistantMessage) {
                        this.currentAssistantMessage.remove();
                    }
                }
            }

            async streamResponse(message) {
                return new Promise((resolve, reject) => {
                    // Build URL with parameters
                    const params = new URLSearchParams({
                        message: message,
                    });

                    if (this.conversationId) {
                        params.append('conversation_id', this.conversationId);
                    }

                    // Create EventSource for SSE
                    this.eventSource = new EventSource(`/api/chat/stream?${params}`);

                    // Handle message chunks
                    this.eventSource.addEventListener('message', (event) => {
                        // Hide typing on first chunk
                        this.hideTyping();

                        // Ensure assistant message is in DOM
                        if (!this.currentAssistantMessage.parentNode) {
                            this.messagesContainer.appendChild(this.currentAssistantMessage);
                        }

                        // Append chunk to message
                        const contentDiv = this.currentAssistantMessage.querySelector('.message-content');
                        contentDiv.textContent += event.data;

                        // Scroll to bottom
                        this.scrollToBottom();
                    });

                    // Handle completion
                    this.eventSource.addEventListener('done', () => {
                        this.cleanup();
                        resolve();
                    });

                    // Handle errors
                    this.eventSource.onerror = (error) => {
                        console.error('SSE Error:', error);
                        this.cleanup();
                        reject(new Error('Stream connection failed'));
                    };

                    // Extract conversation ID from response headers
                    // Note: This is tricky with EventSource, would need a separate request
                });
            }

            addMessage(role, content) {
                const messageEl = this.createMessageElement(role, content);
                this.messagesContainer.appendChild(messageEl);
                this.scrollToBottom();
            }

            createMessageElement(role, content) {
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${role}`;

                const avatar = document.createElement('div');
                avatar.className = 'message-avatar';
                avatar.textContent = role === 'user' ? 'You' : 'AI';

                const contentDiv = document.createElement('div');
                contentDiv.className = 'message-content';
                contentDiv.textContent = content;

                messageDiv.appendChild(avatar);
                messageDiv.appendChild(contentDiv);

                return messageDiv;
            }

            showTyping() {
                this.typingIndicator.classList.add('active');
                this.sendButton.disabled = true;
            }

            hideTyping() {
                this.typingIndicator.classList.remove('active');
                this.sendButton.disabled = false;
            }

            showError(message) {
                this.errorMessage.textContent = message;
                this.errorMessage.classList.add('active');
            }

            hideError() {
                this.errorMessage.classList.remove('active');
            }

            scrollToBottom() {
                this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
            }

            cleanup() {
                if (this.eventSource) {
                    this.eventSource.close();
                    this.eventSource = null;
                }
                this.hideTyping();
                this.currentAssistantMessage = null;
            }
        }

        // Initialize app
        const chat = new ChatApp();
    </script>
</body>
</html>
```

## Step 4: Frontend with Alpine.js

A reactive Alpine.js implementation perfect for Laravel applications:

```html
<!-- resources/views/chat/alpine.blade.php -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>AI Chat - Alpine.js</title>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <style>
        /* Reuse same styles from Vanilla JS example */
        /* ... (copy styles from above) ... */
    </style>
</head>
<body>
    <div class="chat-container" x-data="chatApp()" x-init="init()">
        <div class="chat-header">
            <h1>AI Assistant</h1>
            <div x-show="conversationId" x-text="'Conversation #' + conversationId" style="font-size: 12px; opacity: 0.8; margin-top: 4px;"></div>
        </div>

        <div class="messages-container" x-ref="messagesContainer">
            <template x-for="message in messages" :key="message.id">
                <div :class="'message ' + message.role">
                    <div class="message-avatar" x-text="message.role === 'user' ? 'You' : 'AI'"></div>
                    <div class="message-content" x-text="message.content"></div>
                </div>
            </template>
        </div>

        <div class="typing-indicator" :class="{ active: isStreaming }">
            <div class="message-avatar">AI</div>
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>

        <div class="error-message" :class="{ active: error }" x-text="error"></div>

        <div class="input-container">
            <div class="input-wrapper">
                <textarea
                    x-model="currentMessage"
                    @keydown.enter.prevent="!$event.shiftKey && sendMessage()"
                    :disabled="isStreaming"
                    placeholder="Type your message..."
                    rows="1"
                    x-ref="input"
                ></textarea>
                <button
                    @click="sendMessage()"
                    :disabled="isStreaming || !currentMessage.trim()"
                    title="Send message"
                >
                    ➤
                </button>
            </div>
        </div>
    </div>

    <script>
        function chatApp() {
            return {
                messages: [],
                currentMessage: '',
                conversationId: null,
                isStreaming: false,
                error: '',
                eventSource: null,

                init() {
                    // Load conversation from localStorage if exists
                    const savedConvId = localStorage.getItem('conversationId');
                    if (savedConvId) {
                        this.conversationId = parseInt(savedConvId);
                        this.loadConversation();
                    }
                },

                async loadConversation() {
                    if (!this.conversationId) return;

                    try {
                        const response = await fetch(`/api/conversations/${this.conversationId}`, {
                            headers: {
                                'Authorization': 'Bearer ' + this.getToken(),
                                'Accept': 'application/json',
                            }
                        });

                        if (response.ok) {
                            const data = await response.json();
                            this.messages = data.messages.map((msg, idx) => ({
                                id: msg.id || idx,
                                role: msg.role,
                                content: msg.content,
                            }));
                            this.scrollToBottom();
                        }
                    } catch (error) {
                        console.error('Failed to load conversation:', error);
                    }
                },

                async sendMessage() {
                    if (!this.currentMessage.trim() || this.isStreaming) return;

                    const userMessage = this.currentMessage.trim();

                    // Add user message
                    this.messages.push({
                        id: Date.now(),
                        role: 'user',
                        content: userMessage,
                    });

                    // Clear input
                    this.currentMessage = '';
                    this.error = '';
                    this.scrollToBottom();

                    // Start streaming
                    this.isStreaming = true;

                    try {
                        await this.streamResponse(userMessage);
                    } catch (error) {
                        this.error = 'Failed to send message. Please try again.';
                        this.isStreaming = false;
                    }
                },

                async streamResponse(message) {
                    return new Promise((resolve, reject) => {
                        // Build request body
                        const body = JSON.stringify({
                            message: message,
                            conversation_id: this.conversationId,
                        });

                        // Make POST request to get stream
                        fetch('/api/chat/stream', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'text/event-stream',
                                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                            },
                            body: body,
                        }).then(response => {
                            // Extract conversation ID from headers
                            const convId = response.headers.get('X-Conversation-ID');
                            if (convId && !this.conversationId) {
                                this.conversationId = parseInt(convId);
                                localStorage.setItem('conversationId', convId);
                            }

                            // Read stream
                            const reader = response.body.getReader();
                            const decoder = new TextDecoder();

                            // Create assistant message
                            const assistantMessage = {
                                id: Date.now() + 1,
                                role: 'assistant',
                                content: '',
                            };
                            this.messages.push(assistantMessage);

                            const readChunk = () => {
                                reader.read().then(({ done, value }) => {
                                    if (done) {
                                        this.isStreaming = false;
                                        resolve();
                                        return;
                                    }

                                    // Decode chunk
                                    const chunk = decoder.decode(value);
                                    const lines = chunk.split('\n');

                                    for (const line of lines) {
                                        if (line.startsWith('data: ')) {
                                            const data = line.substring(6);
                                            if (data && data !== '[DONE]') {
                                                assistantMessage.content += data;
                                                this.scrollToBottom();
                                            }
                                        }
                                    }

                                    readChunk();
                                }).catch(reject);
                            };

                            readChunk();
                        }).catch(reject);
                    });
                },

                scrollToBottom() {
                    this.$nextTick(() => {
                        const container = this.$refs.messagesContainer;
                        container.scrollTop = container.scrollHeight;
                    });
                },

                getToken() {
                    // Get auth token from your auth system
                    return localStorage.getItem('auth_token') || '';
                },
            };
        }
    </script>
</body>
</html>
```

## Step 5: Frontend with Vue.js

A modern Vue 3 Composition API implementation:

```vue
<!-- resources/js/components/Chat.vue -->
<template>
  <div class="chat-container">
    <div class="chat-header">
      <h1>AI Assistant</h1>
      <div v-if="conversationId" class="conversation-id">
        Conversation #{{ conversationId }}
      </div>
    </div>

    <div class="messages-container" ref="messagesContainer">
      <div
        v-for="message in messages"
        :key="message.id"
        :class="['message', message.role]"
      >
        <div class="message-avatar">
          {{ message.role === 'user' ? 'You' : 'AI' }}
        </div>
        <div class="message-content">{{ message.content }}</div>
      </div>
    </div>

    <div class="typing-indicator" :class="{ active: isStreaming }">
      <div class="message-avatar">AI</div>
      <div class="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>

    <div v-if="error" class="error-message active">{{ error }}</div>

    <div class="input-container">
      <div class="input-wrapper">
        <textarea
          v-model="currentMessage"
          @keydown.enter.exact.prevent="sendMessage"
          :disabled="isStreaming"
          placeholder="Type your message..."
          rows="1"
          ref="input"
        ></textarea>
        <button
          @click="sendMessage"
          :disabled="isStreaming || !currentMessage.trim()"
          title="Send message"
        >
          ➤
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { useChat } from '../composables/useChat';

interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const messages = ref<Message[]>([]);
const currentMessage = ref('');
const conversationId = ref<number | null>(null);
const isStreaming = ref(false);
const error = ref('');

const messagesContainer = ref<HTMLElement>();
const input = ref<HTMLTextAreaElement>();

const { streamResponse } = useChat();

onMounted(() => {
  // Load saved conversation
  const savedId = localStorage.getItem('conversationId');
  if (savedId) {
    conversationId.value = parseInt(savedId);
    loadConversation();
  }
});

async function loadConversation() {
  if (!conversationId.value) return;

  try {
    const response = await fetch(`/api/conversations/${conversationId.value}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      messages.value = data.messages;
      scrollToBottom();
    }
  } catch (err) {
    console.error('Failed to load conversation:', err);
  }
}

async function sendMessage() {
  if (!currentMessage.value.trim() || isStreaming.value) return;

  const userMessage = currentMessage.value.trim();

  // Add user message
  messages.value.push({
    id: Date.now(),
    role: 'user',
    content: userMessage,
  });

  // Clear input
  currentMessage.value = '';
  error.value = '';
  scrollToBottom();

  // Start streaming
  isStreaming.value = true;

  try {
    // Create assistant message
    const assistantMessage: Message = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '',
    };
    messages.value.push(assistantMessage);

    // Stream response
    await streamResponse({
      message: userMessage,
      conversationId: conversationId.value,
      onChunk: (chunk: string) => {
        assistantMessage.content += chunk;
        scrollToBottom();
      },
      onConversationId: (id: number) => {
        if (!conversationId.value) {
          conversationId.value = id;
          localStorage.setItem('conversationId', id.toString());
        }
      },
    });
  } catch (err) {
    error.value = 'Failed to send message. Please try again.';
    console.error('Stream error:', err);
  } finally {
    isStreaming.value = false;
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}
</script>

<style scoped>
/* Reuse styles from previous examples */
</style>
```

**Vue Composable for Streaming:**

```typescript
// resources/js/composables/useChat.ts
export interface StreamOptions {
  message: string;
  conversationId: number | null;
  onChunk: (chunk: string) => void;
  onConversationId?: (id: number) => void;
}

export function useChat() {
  async function streamResponse(options: StreamOptions): Promise<void> {
    const { message, conversationId, onChunk, onConversationId } = options;

    return new Promise((resolve, reject) => {
      const csrfToken = document.querySelector<HTMLMetaElement>(
        'meta[name="csrf-token"]'
      )?.content;

      fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'X-CSRF-TOKEN': csrfToken || '',
        },
        body: JSON.stringify({
          message,
          conversation_id: conversationId,
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error('Request failed');
          }

          // Extract conversation ID
          const convId = response.headers.get('X-Conversation-ID');
          if (convId && onConversationId) {
            onConversationId(parseInt(convId));
          }

          // Read stream
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('No reader available');
          }

          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              resolve();
              break;
            }

            // Decode and parse SSE
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.substring(6);
                if (data && data !== '[DONE]') {
                  onChunk(data);
                }
              } else if (line.startsWith('event: done')) {
                resolve();
                return;
              }
            }
          }
        })
        .catch(reject);
    });
  }

  return {
    streamResponse,
  };
}
```

## Step 6: Adding Advanced Features

### Feature 1: Conversation Switching

Add a sidebar to switch between conversations:

```php
// Add to ChatController
public function listConversations(Request $request)
{
    $conversations = Conversation::where('user_id', auth()->id())
        ->withCount('messages')
        ->with(['messages' => fn($q) => $q->latest()->limit(1)])
        ->orderBy('last_message_at', 'desc')
        ->get();

    return response()->json([
        'conversations' => $conversations->map(fn($conv) => [
            'id' => $conv->id,
            'title' => $conv->title ?? 'New Conversation',
            'message_count' => $conv->messages_count,
            'last_message' => $conv->messages->first()?->content,
            'last_message_at' => $conv->last_message_at?->diffForHumans(),
        ]),
    ]);
}
```

### Feature 2: Markdown Rendering

Add markdown support to responses:

```bash
npm install marked
```

```javascript
import { marked } from 'marked';

// In your message rendering
function renderMessage(content) {
    return marked.parse(content);
}
```

### Feature 3: Code Syntax Highlighting

Add syntax highlighting for code blocks:

```bash
npm install highlight.js
```

```javascript
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

// Configure marked with highlight.js
marked.setOptions({
    highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
    }
});
```

### Feature 4: Copy to Clipboard

Add copy button for code blocks and messages:

```javascript
function addCopyButtons() {
    document.querySelectorAll('pre code').forEach((block) => {
        const button = document.createElement('button');
        button.className = 'copy-button';
        button.textContent = 'Copy';
        button.onclick = () => {
            navigator.clipboard.writeText(block.textContent);
            button.textContent = 'Copied!';
            setTimeout(() => button.textContent = 'Copy', 2000);
        };
        block.parentElement.appendChild(button);
    });
}
```

## Step 7: Error Handling & Reconnection

### Backend Error Handling

```php
// Enhanced error handling in ChatController
public function stream(Request $request): StreamedResponse
{
    try {
        // ... existing code ...

        $stream = $llm->streamText($prompt);
        $response = new StreamedTextResponse($stream);

        // Add error handling callback
        $response->onChunk(function (string $chunk) {
            if (connection_aborted()) {
                throw new \RuntimeException('Client disconnected');
            }
        });

        return $response->toStreamedResponse();

    } catch (\Mindwave\Mindwave\Exceptions\RateLimitException $e) {
        return response()->json([
            'error' => 'Rate limit exceeded',
            'retry_after' => $e->getRetryAfter(),
        ], 429);

    } catch (\Mindwave\Mindwave\Exceptions\InvalidResponseException $e) {
        Log::error('Invalid LLM response', ['error' => $e->getMessage()]);

        return response()->json([
            'error' => 'Invalid response from AI provider',
        ], 502);

    } catch (\Exception $e) {
        Log::error('Chat streaming failed', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ]);

        return response()->json([
            'error' => 'Failed to generate response',
        ], 500);
    }
}
```

### Frontend Reconnection Logic

```javascript
class RobustStreamClient {
    constructor(maxRetries = 3, retryDelay = 1000) {
        this.maxRetries = maxRetries;
        this.retryDelay = retryDelay;
        this.retryCount = 0;
    }

    async stream(message, conversationId, callbacks) {
        try {
            await this.attemptStream(message, conversationId, callbacks);
            this.retryCount = 0; // Reset on success
        } catch (error) {
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                const delay = this.retryDelay * Math.pow(2, this.retryCount - 1);

                console.log(`Retrying in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`);

                await new Promise(resolve => setTimeout(resolve, delay));
                return this.stream(message, conversationId, callbacks);
            } else {
                throw new Error('Max retry attempts exceeded');
            }
        }
    }

    async attemptStream(message, conversationId, callbacks) {
        // Implementation from previous examples
        // ...
    }
}
```

## Step 8: Testing

### Backend Unit Tests

```php
// tests/Feature/ChatControllerTest.php
<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChatControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_stream_chat_response(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/api/chat/stream', [
                'message' => 'Hello, AI!',
            ]);

        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/event-stream');
    }

    public function test_creates_conversation_on_first_message(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/chat/stream', [
                'message' => 'Hello',
            ]);

        $this->assertDatabaseHas('conversations', [
            'user_id' => $user->id,
        ]);

        $this->assertDatabaseHas('messages', [
            'role' => 'user',
            'content' => 'Hello',
        ]);
    }

    public function test_can_continue_existing_conversation(): void
    {
        $user = User::factory()->create();
        $conversation = Conversation::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)
            ->postJson('/api/chat/stream', [
                'message' => 'Second message',
                'conversation_id' => $conversation->id,
            ]);

        $response->assertOk();

        $this->assertEquals(
            $conversation->id,
            $conversation->messages()->where('content', 'Second message')->first()->conversation_id
        );
    }

    public function test_validates_message_input(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/api/chat/stream', [
                'message' => '',
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['message']);
    }

    public function test_requires_authentication(): void
    {
        $response = $this->postJson('/api/chat/stream', [
            'message' => 'Hello',
        ]);

        $response->assertUnauthorized();
    }
}
```

### Frontend Testing with Pest PHP

```php
// tests/Feature/ChatViewTest.php
<?php

use App\Models\User;

test('chat page loads successfully', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/chat');

    $response->assertOk();
    $response->assertViewIs('chat.vanilla');
});

test('chat page requires authentication', function () {
    $response = $this->get('/chat');

    $response->assertRedirect('/login');
});
```

## Step 9: Production Considerations

### Rate Limiting

```php
// app/Http/Kernel.php
protected $middlewareGroups = [
    'api' => [
        'throttle:api',
        // ...
    ],
];

// config/app.php - Add custom rate limiter
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;

RateLimiter::for('chat-stream', function (Request $request) {
    return Limit::perMinute(10)->by($request->user()?->id ?: $request->ip());
});

// Apply to route
Route::post('/chat/stream', [ChatController::class, 'stream'])
    ->middleware('throttle:chat-stream');
```

### Message Storage Optimization

```php
// Prune old conversations
// app/Console/Commands/PruneOldConversations.php
<?php

namespace App\Console\Commands;

use App\Models\Conversation;
use Illuminate\Console\Command;

class PruneOldConversations extends Command
{
    protected $signature = 'conversations:prune {--days=90}';
    protected $description = 'Prune conversations older than specified days';

    public function handle()
    {
        $days = $this->option('days');

        $deleted = Conversation::where('last_message_at', '<', now()->subDays($days))
            ->delete();

        $this->info("Pruned {$deleted} conversations older than {$days} days");
    }
}
```

### Monitoring

```php
// Add metrics tracking
use Illuminate\Support\Facades\Event;
use Mindwave\Mindwave\Observability\Events\LlmTokenStreamed;

Event::listen(LlmTokenStreamed::class, function (LlmTokenStreamed $event) {
    // Track streaming metrics
    \Illuminate\Support\Facades\Redis::hincrby('llm:metrics', 'total_tokens', $event->cumulativeTokens);

    // Track cost
    $cost = ($event->cumulativeTokens / 1000) * 0.002; // Example pricing
    \Illuminate\Support\Facades\Redis::hincrbyfloat('llm:metrics', 'total_cost', $cost);
});
```

### Scaling Strategies

1. **Database Optimization**
   - Add indexes on frequently queried columns
   - Use database connection pooling
   - Consider read replicas for conversation history

2. **Caching**
   - Cache conversation titles and metadata
   - Use Redis for session management
   - Cache frequently accessed conversations

3. **Queue Processing**
   - Offload message persistence to queues
   - Use Horizon for queue monitoring

4. **Load Balancing**
   - Use sticky sessions for SSE connections
   - Implement connection pooling
   - Consider WebSocket fallback for high-scale

## Summary

You now have a complete, production-ready streaming chat application with:

- **Database persistence** for conversations and messages
- **Real-time streaming** via Server-Sent Events
- **Multiple frontend options** - Vanilla JS, Alpine.js, and Vue.js
- **Error handling** with automatic reconnection
- **Observable architecture** with OpenTelemetry tracing
- **Production features** - rate limiting, monitoring, scaling strategies

### Next Steps

- **[Streaming SSE Documentation](../core/streaming.md)** - Deep dive into streaming concepts
- **[Context Discovery](../rag/overview.md)** - Add RAG for context-aware responses
- **[Observability](../observability/tracing.md)** - Monitor your chat application
- **[Events](../observability/events.md)** - React to chat events in real-time

### Key Takeaways

1. **SSE is perfect for AI streaming** - Browser-native, simple, reliable
2. **Persist as you stream** - Use `onChunk()` to save while streaming
3. **Handle errors gracefully** - Implement retry logic and user feedback
4. **Multiple frameworks** - Choose what fits your stack
5. **Production-ready** - Rate limiting, monitoring, and scaling included
