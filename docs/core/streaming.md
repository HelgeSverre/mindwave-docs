# Streaming SSE

Server-Sent Events (SSE) streaming enables real-time LLM response delivery to your users. Instead of waiting for the entire response to generate, users see text appear progressively as it's being generated - just like ChatGPT's interface.

## Why Stream LLM Responses?

**Real-time User Experience**
Streaming provides immediate feedback. Users see the response start appearing within milliseconds instead of waiting 5-30 seconds for a complete response. This dramatically improves perceived performance.

**Progressive Rendering**
Long-form content becomes readable immediately. Users can start processing information while the LLM is still generating, creating a more natural conversation flow.

**Cost Transparency**
Users see the value being generated in real-time. For token-heavy operations, this creates trust by showing active work happening rather than a blank loading spinner.

**Better Error Handling**
If an error occurs mid-stream, users already have partial results. The initial chunks provide context even if the stream fails partway through.

## When to Use Streaming

**Ideal Use Cases:**

-   Chat interfaces and conversational UIs
-   Long-form content generation (articles, documentation, emails)
-   Real-time analysis with progressive results
-   Interactive AI assistants
-   Content that users consume as it's generated

**When NOT to Stream:**

-   Short responses (< 100 tokens) where overhead isn't worth it
-   Batch processing or background jobs
-   API responses that need complete data before processing
-   Content requiring post-processing (validation, formatting)
-   Mobile apps with unreliable connections (consider polling instead)

## Basic Implementation

### Backend Setup

The simplest controller implementation requires just two lines of code:

```php
use Illuminate\Http\Request;
use Mindwave\Mindwave\Facades\Mindwave;

Route::get('/api/chat/stream', function (Request $request) {
    $prompt = $request->input('prompt');

    return Mindwave::stream($prompt)->toStreamedResponse();
});
```

This returns a properly formatted SSE response with:

-   `Content-Type: text/event-stream` header
-   `Cache-Control: no-cache` to prevent caching
-   `X-Accel-Buffering: no` to disable nginx buffering
-   Automatic flushing of output buffers

### Advanced Controller Options

For more control over the streaming process:

```php
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\LLM\Streaming\StreamedTextResponse;

Route::post('/api/chat/stream', function (Request $request) {
    $validated = $request->validate([
        'prompt' => 'required|string|max:5000',
        'model' => 'nullable|string',
        'temperature' => 'nullable|numeric|min:0|max:2',
    ]);

    // Configure LLM with custom options
    $llm = Mindwave::llm()
        ->setOptions([
            'model' => $validated['model'] ?? 'gpt-4-turbo',
            'temperature' => $validated['temperature'] ?? 0.7,
            'max_tokens' => 2000,
        ]);

    // Get the streaming generator
    $stream = $llm->streamText($validated['prompt']);

    // Create response with custom headers
    $response = new StreamedTextResponse($stream);

    return $response->toStreamedResponse(
        status: 200,
        headers: [
            'X-Request-ID' => (string) Str::uuid(),
        ]
    );
});
```

### Processing Chunks with Callbacks

Use `onChunk()` to perform side effects during streaming:

```php
use Illuminate\Support\Facades\Log;

Route::get('/api/chat/stream', function (Request $request) {
    $prompt = $request->input('prompt');
    $sessionId = $request->session()->getId();

    $stream = Mindwave::llm()->streamText($prompt);
    $response = new StreamedTextResponse($stream);

    // Log each chunk for debugging or analytics
    $response->onChunk(function (string $chunk) use ($sessionId) {
        Log::debug('Streamed chunk', [
            'session_id' => $sessionId,
            'length' => strlen($chunk),
            'content' => $chunk,
        ]);
    });

    return $response->toStreamedResponse();
});
```

### Storing Complete Responses

Collect the full response while streaming to users:

```php
use App\Models\ChatMessage;

Route::post('/api/chat/stream', function (Request $request) {
    $prompt = $request->input('prompt');
    $userId = auth()->id();

    $fullResponse = '';
    $stream = Mindwave::llm()->streamText($prompt);
    $response = new StreamedTextResponse($stream);

    // Accumulate the complete response
    $response->onChunk(function (string $chunk) use (&$fullResponse) {
        $fullResponse .= $chunk;
    });

    // Store after stream completes
    // Note: This won't execute until the stream is fully consumed
    register_shutdown_function(function () use (&$fullResponse, $userId, $prompt) {
        ChatMessage::create([
            'user_id' => $userId,
            'prompt' => $prompt,
            'response' => $fullResponse,
        ]);
    });

    return $response->toStreamedResponse();
});
```

### Error Handling

Wrap streaming in try-catch for production reliability:

```php
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\StreamedResponse;

Route::post('/api/chat/stream', function (Request $request) {
    $prompt = $request->input('prompt');

    try {
        $stream = Mindwave::llm()->streamText($prompt);
        $response = new StreamedTextResponse($stream);

        return $response->toStreamedResponse();
    } catch (\BadMethodCallException $e) {
        // Driver doesn't support streaming
        Log::warning('Streaming not supported', ['driver' => config('mindwave-llm.default')]);

        return response()->json([
            'error' => 'Streaming not available, try non-streaming endpoint',
        ], 501);
    } catch (\Exception $e) {
        // LLM provider error
        Log::error('Streaming failed', [
            'error' => $e->getMessage(),
            'prompt' => substr($prompt, 0, 100),
        ]);

        return response()->json([
            'error' => 'Failed to generate response',
        ], 500);
    }
});
```

### Rate Limiting

Protect your streaming endpoints:

```php
use Illuminate\Support\Facades\RateLimiter;

Route::post('/api/chat/stream', function (Request $request) {
    $key = 'stream:' . $request->ip();

    if (RateLimiter::tooManyAttempts($key, 10)) {
        return response()->json([
            'error' => 'Too many requests',
            'retry_after' => RateLimiter::availableIn($key),
        ], 429);
    }

    RateLimiter::hit($key, 60); // 10 requests per minute

    $stream = Mindwave::llm()->streamText($request->input('prompt'));
    return (new StreamedTextResponse($stream))->toStreamedResponse();
})->middleware('auth');
```

## Frontend Integration

### Vanilla JavaScript

The simplest client using the native EventSource API:

```html
<!DOCTYPE html>
<html>
    <head>
        <title>Mindwave Streaming Chat</title>
        <meta name="csrf-token" content="{{ csrf_token() }}" />
        <style>
            body {
                font-family: system-ui, -apple-system, sans-serif;
                max-width: 800px;
                margin: 40px auto;
                padding: 20px;
            }

            #prompt {
                width: 100%;
                padding: 12px;
                font-size: 16px;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                margin-bottom: 12px;
            }

            button {
                padding: 12px 24px;
                font-size: 16px;
                background: #4caf50;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
            }

            button:disabled {
                background: #ccc;
                cursor: not-allowed;
            }

            #output {
                margin-top: 20px;
                padding: 20px;
                background: #f5f5f5;
                border-radius: 8px;
                white-space: pre-wrap;
                word-wrap: break-word;
                min-height: 100px;
            }

            .error {
                background: #ffebee;
                color: #c62828;
                padding: 16px;
                border-radius: 8px;
                margin-top: 12px;
            }
        </style>
    </head>
    <body>
        <h1>AI Chat</h1>

        <input
            type="text"
            id="prompt"
            placeholder="Ask me anything..."
            onkeypress="if(event.key === 'Enter') startStreaming()"
        />

        <button id="sendBtn" onclick="startStreaming()">Send</button>

        <div id="output"></div>
        <div id="errorContainer"></div>

        <script>
            let eventSource = null;

            function startStreaming() {
                const prompt = document.getElementById('prompt').value.trim();
                const output = document.getElementById('output');
                const errorContainer =
                    document.getElementById('errorContainer');
                const sendBtn = document.getElementById('sendBtn');

                if (!prompt) return;

                // Clear previous output and errors
                output.textContent = '';
                errorContainer.innerHTML = '';

                // Disable input during streaming
                sendBtn.disabled = true;
                sendBtn.textContent = 'Streaming...';

                // Close any existing connection
                if (eventSource) {
                    eventSource.close();
                }

                // Create new SSE connection
                const csrfToken = document.querySelector(
                    'meta[name="csrf-token"]'
                ).content;
                const url = `/api/chat/stream?prompt=${encodeURIComponent(
                    prompt
                )}`;

                eventSource = new EventSource(url);

                // Listen for message events (content chunks)
                eventSource.addEventListener('message', (event) => {
                    // Append each chunk to the output
                    output.textContent += event.data;
                });

                // Listen for done event (stream complete)
                eventSource.addEventListener('done', (event) => {
                    console.log('Stream completed');
                    cleanup();
                });

                // Handle errors
                eventSource.onerror = (error) => {
                    console.error('SSE Error:', error);

                    errorContainer.innerHTML = `
                    <div class="error">
                        Connection error. Please try again.
                    </div>
                `;

                    cleanup();
                };
            }

            function cleanup() {
                if (eventSource) {
                    eventSource.close();
                    eventSource = null;
                }

                const sendBtn = document.getElementById('sendBtn');
                sendBtn.disabled = false;
                sendBtn.textContent = 'Send';
            }

            // Clean up on page unload
            window.addEventListener('beforeunload', cleanup);
        </script>
    </body>
</html>
```

### Alpine.js Integration

Perfect for Laravel applications using Alpine.js:

```html
<!DOCTYPE html>
<html>
    <head>
        <title>Mindwave Chat with Alpine.js</title>
        <script
            defer
            src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"
        ></script>
        <style>
            /* Tailwind CSS recommended, but here's vanilla CSS */
            .chat-container {
                max-width: 800px;
                margin: 40px auto;
                padding: 20px;
            }

            .input-group {
                display: flex;
                gap: 12px;
                margin-bottom: 20px;
            }

            input {
                flex: 1;
                padding: 12px;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                font-size: 16px;
            }

            button {
                padding: 12px 24px;
                background: #4caf50;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
            }

            button:disabled {
                background: #ccc;
                cursor: not-allowed;
            }

            .response {
                padding: 20px;
                background: #f5f5f5;
                border-radius: 8px;
                white-space: pre-wrap;
                word-wrap: break-word;
                min-height: 100px;
            }

            .error {
                padding: 16px;
                background: #ffebee;
                color: #c62828;
                border-radius: 8px;
                margin-top: 12px;
            }

            .typing-indicator {
                color: #666;
                font-style: italic;
                margin-top: 8px;
            }
        </style>
    </head>
    <body>
        <div class="chat-container" x-data="chatApp()">
            <h1>AI Assistant</h1>

            <div class="input-group">
                <input
                    type="text"
                    x-model="prompt"
                    @keyup.enter="sendMessage"
                    :disabled="isStreaming"
                    placeholder="Ask me anything..."
                />
                <button
                    @click="sendMessage"
                    :disabled="isStreaming || !prompt.trim()"
                >
                    <span x-show="!isStreaming">Send</span>
                    <span x-show="isStreaming">Streaming...</span>
                </button>
            </div>

            <div x-show="response" class="response" x-text="response"></div>

            <div x-show="isStreaming" class="typing-indicator">
                AI is typing...
            </div>

            <div x-show="error" class="error" x-text="error"></div>
        </div>

        <script>
            function chatApp() {
                return {
                    prompt: '',
                    response: '',
                    error: '',
                    isStreaming: false,
                    eventSource: null,

                    sendMessage() {
                        // Validation
                        if (!this.prompt.trim() || this.isStreaming) return;

                        // Reset state
                        this.response = '';
                        this.error = '';
                        this.isStreaming = true;

                        // Close any existing connection
                        this.closeConnection();

                        // Build URL with query parameters
                        const encodedPrompt = encodeURIComponent(this.prompt);
                        const url = `/api/chat/stream?prompt=${encodedPrompt}`;

                        // Create SSE connection
                        this.eventSource = new EventSource(url);

                        // Handle message chunks
                        this.eventSource.addEventListener(
                            'message',
                            (event) => {
                                this.response += event.data;
                            }
                        );

                        // Handle completion
                        this.eventSource.addEventListener('done', () => {
                            this.isStreaming = false;
                            this.closeConnection();
                        });

                        // Handle errors
                        this.eventSource.onerror = () => {
                            this.error = 'Connection error. Please try again.';
                            this.isStreaming = false;
                            this.closeConnection();
                        };
                    },

                    closeConnection() {
                        if (this.eventSource) {
                            this.eventSource.close();
                            this.eventSource = null;
                        }
                    },

                    // Alpine.js lifecycle hook
                    init() {
                        // Cleanup on component destroy
                        this.$watch('$el', (value) => {
                            if (!value) {
                                this.closeConnection();
                            }
                        });
                    },
                };
            }
        </script>
    </body>
</html>
```

### Vue.js Composition API

Modern Vue 3 component with TypeScript support:

```vue
<template>
    <div class="chat-component">
        <h1>AI Chat</h1>

        <div class="input-container">
            <input
                v-model="prompt"
                @keyup.enter="sendMessage"
                :disabled="isStreaming"
                placeholder="Ask me anything..."
                class="chat-input"
            />
            <button
                @click="sendMessage"
                :disabled="isStreaming || !prompt.trim()"
                class="send-button"
            >
                {{ isStreaming ? 'Streaming...' : 'Send' }}
            </button>
        </div>

        <div v-if="response" class="response-container">
            <div class="response" v-html="formattedResponse"></div>
        </div>

        <div v-if="isStreaming" class="typing-indicator">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
        </div>

        <div v-if="error" class="error-message">
            {{ error }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';

const prompt = ref('');
const response = ref('');
const error = ref('');
const isStreaming = ref(false);
let eventSource: EventSource | null = null;

const formattedResponse = computed(() => {
    // Escape HTML and preserve newlines
    return response.value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
});

function sendMessage() {
    if (!prompt.value.trim() || isStreaming.value) return;

    // Reset state
    response.value = '';
    error.value = '';
    isStreaming.value = true;

    // Close existing connection
    closeConnection();

    // Create new SSE connection
    const encodedPrompt = encodeURIComponent(prompt.value);
    eventSource = new EventSource(`/api/chat/stream?prompt=${encodedPrompt}`);

    // Handle message chunks
    eventSource.addEventListener('message', (event: MessageEvent) => {
        response.value += event.data;
    });

    // Handle completion
    eventSource.addEventListener('done', () => {
        isStreaming.value = false;
        closeConnection();
    });

    // Handle errors
    eventSource.onerror = () => {
        error.value = 'Failed to connect to the server. Please try again.';
        isStreaming.value = false;
        closeConnection();
    };
}

function closeConnection() {
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
}

// Cleanup on component unmount
onUnmounted(() => {
    closeConnection();
});
</script>

<style scoped>
.chat-component {
    max-width: 800px;
    margin: 40px auto;
    padding: 20px;
    font-family: system-ui, -apple-system, sans-serif;
}

.input-container {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
}

.chat-input {
    flex: 1;
    padding: 12px;
    font-size: 16px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
}

.chat-input:focus {
    outline: none;
    border-color: #4caf50;
}

.send-button {
    padding: 12px 24px;
    font-size: 16px;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
}

.send-button:hover:not(:disabled) {
    background: #45a049;
}

.send-button:disabled {
    background: #ccc;
    cursor: not-allowed;
}

.response-container {
    margin-top: 20px;
}

.response {
    padding: 20px;
    background: #f5f5f5;
    border-radius: 8px;
    white-space: pre-wrap;
    word-wrap: break-word;
    min-height: 100px;
}

.typing-indicator {
    display: flex;
    gap: 4px;
    padding: 16px;
    align-items: center;
}

.dot {
    width: 8px;
    height: 8px;
    background: #666;
    border-radius: 50%;
    animation: pulse 1.4s infinite ease-in-out;
}

.dot:nth-child(2) {
    animation-delay: 0.2s;
}

.dot:nth-child(3) {
    animation-delay: 0.4s;
}

@keyframes pulse {
    0%,
    80%,
    100% {
        opacity: 0.3;
    }
    40% {
        opacity: 1;
    }
}

.error-message {
    padding: 16px;
    background: #ffebee;
    color: #c62828;
    border-radius: 8px;
    margin-top: 12px;
}
</style>
```

### React with Hooks

Modern React component using hooks:

```tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';

interface ChatStreamProps {
    apiEndpoint?: string;
}

export default function ChatStream({
    apiEndpoint = '/api/chat/stream',
}: ChatStreamProps) {
    const [prompt, setPrompt] = useState('');
    const [response, setResponse] = useState('');
    const [error, setError] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const eventSourceRef = useRef<EventSource | null>(null);

    // Close connection helper
    const closeConnection = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
    }, []);

    // Send message handler
    const sendMessage = useCallback(() => {
        if (!prompt.trim() || isStreaming) return;

        // Reset state
        setResponse('');
        setError('');
        setIsStreaming(true);

        // Close existing connection
        closeConnection();

        // Create new SSE connection
        const encodedPrompt = encodeURIComponent(prompt);
        const eventSource = new EventSource(
            `${apiEndpoint}?prompt=${encodedPrompt}`
        );
        eventSourceRef.current = eventSource;

        // Handle message chunks
        eventSource.addEventListener('message', (event: MessageEvent) => {
            setResponse((prev) => prev + event.data);
        });

        // Handle completion
        eventSource.addEventListener('done', () => {
            setIsStreaming(false);
            closeConnection();
        });

        // Handle errors
        eventSource.onerror = () => {
            setError('Connection error. Please try again.');
            setIsStreaming(false);
            closeConnection();
        };
    }, [prompt, isStreaming, apiEndpoint, closeConnection]);

    // Handle Enter key
    const handleKeyPress = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        },
        [sendMessage]
    );

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            closeConnection();
        };
    }, [closeConnection]);

    return (
        <div className="chat-stream">
            <h1>AI Assistant</h1>

            <div className="input-container">
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isStreaming}
                    placeholder="Ask me anything..."
                    className="chat-input"
                />
                <button
                    onClick={sendMessage}
                    disabled={isStreaming || !prompt.trim()}
                    className="send-button"
                >
                    {isStreaming ? 'Streaming...' : 'Send'}
                </button>
            </div>

            {response && (
                <div className="response-container">
                    <div className="response">{response}</div>
                </div>
            )}

            {isStreaming && (
                <div className="typing-indicator">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                </div>
            )}

            {error && <div className="error-message">{error}</div>}

            <style jsx>{`
                .chat-stream {
                    max-width: 800px;
                    margin: 40px auto;
                    padding: 20px;
                    font-family: system-ui, -apple-system, sans-serif;
                }

                .input-container {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 20px;
                }

                .chat-input {
                    flex: 1;
                    padding: 12px;
                    font-size: 16px;
                    border: 2px solid #e0e0e0;
                    border-radius: 8px;
                }

                .chat-input:focus {
                    outline: none;
                    border-color: #4caf50;
                }

                .send-button {
                    padding: 12px 24px;
                    font-size: 16px;
                    background: #4caf50;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .send-button:hover:not(:disabled) {
                    background: #45a049;
                }

                .send-button:disabled {
                    background: #ccc;
                    cursor: not-allowed;
                }

                .response-container {
                    margin-top: 20px;
                }

                .response {
                    padding: 20px;
                    background: #f5f5f5;
                    border-radius: 8px;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    min-height: 100px;
                }

                .typing-indicator {
                    display: flex;
                    gap: 4px;
                    padding: 16px;
                    align-items: center;
                }

                .dot {
                    width: 8px;
                    height: 8px;
                    background: #666;
                    border-radius: 50%;
                    animation: pulse 1.4s infinite ease-in-out;
                }

                .dot:nth-child(2) {
                    animation-delay: 0.2s;
                }

                .dot:nth-child(3) {
                    animation-delay: 0.4s;
                }

                @keyframes pulse {
                    0%,
                    80%,
                    100% {
                        opacity: 0.3;
                    }
                    40% {
                        opacity: 1;
                    }
                }

                .error-message {
                    padding: 16px;
                    background: #ffebee;
                    color: #c62828;
                    border-radius: 8px;
                    margin-top: 12px;
                }
            `}</style>
        </div>
    );
}
```

### TypeScript SSE Client

Production-ready TypeScript client with reconnection logic:

```typescript
/**
 * Production-ready SSE streaming client for Mindwave
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Type-safe callbacks
 * - Connection health monitoring
 * - Proper cleanup and error handling
 */

interface StreamingOptions {
    apiUrl: string;
    maxRetries?: number;
    retryDelay?: number;
    retryMultiplier?: number;
    onMessage: (chunk: string) => void;
    onComplete?: () => void;
    onError?: (error: Error) => void;
    onRetry?: (attempt: number) => void;
}

interface SSEEvent {
    event: string;
    data: string;
}

export class MindwaveStreamingClient {
    private eventSource: EventSource | null = null;
    private retryCount = 0;
    private retryTimeoutId: number | null = null;
    private isManualClose = false;

    private readonly maxRetries: number;
    private readonly retryDelay: number;
    private readonly retryMultiplier: number;

    constructor(private readonly options: StreamingOptions) {
        this.maxRetries = options.maxRetries ?? 3;
        this.retryDelay = options.retryDelay ?? 1000;
        this.retryMultiplier = options.retryMultiplier ?? 2;
    }

    /**
     * Start streaming with the given prompt
     */
    public stream(prompt: string): void {
        this.close(true); // Close any existing connection
        this.isManualClose = false;
        this.retryCount = 0;

        const encodedPrompt = encodeURIComponent(prompt);
        const url = `${this.options.apiUrl}?prompt=${encodedPrompt}`;

        this.connect(url);
    }

    /**
     * Close the streaming connection
     */
    public close(manual = true): void {
        this.isManualClose = manual;

        if (this.retryTimeoutId !== null) {
            clearTimeout(this.retryTimeoutId);
            this.retryTimeoutId = null;
        }

        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
    }

    /**
     * Check if currently streaming
     */
    public isStreaming(): boolean {
        return (
            this.eventSource !== null &&
            this.eventSource.readyState !== EventSource.CLOSED
        );
    }

    /**
     * Internal: Establish SSE connection
     */
    private connect(url: string): void {
        try {
            this.eventSource = new EventSource(url);

            // Handle message events (content chunks)
            this.eventSource.addEventListener(
                'message',
                (event: MessageEvent) => {
                    this.retryCount = 0; // Reset on successful message
                    this.options.onMessage(event.data);
                }
            );

            // Handle done event (stream complete)
            this.eventSource.addEventListener('done', () => {
                this.options.onComplete?.();
                this.close(true);
            });

            // Handle errors
            this.eventSource.onerror = (error: Event) => {
                console.error('SSE connection error:', error);

                // Don't retry if manually closed
                if (this.isManualClose) {
                    return;
                }

                // Attempt reconnection
                if (this.retryCount < this.maxRetries) {
                    this.retryCount++;
                    this.options.onRetry?.(this.retryCount);

                    const delay =
                        this.retryDelay *
                        Math.pow(this.retryMultiplier, this.retryCount - 1);
                    console.log(
                        `Retrying connection in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`
                    );

                    this.close(false);
                    this.retryTimeoutId = window.setTimeout(() => {
                        this.connect(url);
                    }, delay);
                } else {
                    // Max retries exceeded
                    const err = new Error(
                        `Connection failed after ${this.maxRetries} attempts`
                    );
                    this.options.onError?.(err);
                    this.close(true);
                }
            };
        } catch (error) {
            const err =
                error instanceof Error
                    ? error
                    : new Error('Failed to create EventSource');
            this.options.onError?.(err);
            this.close(true);
        }
    }
}

// Usage Example
const client = new MindwaveStreamingClient({
    apiUrl: '/api/chat/stream',
    maxRetries: 3,
    retryDelay: 1000,
    retryMultiplier: 2,

    onMessage: (chunk) => {
        console.log('Received chunk:', chunk);
        document.getElementById('output')!.textContent += chunk;
    },

    onComplete: () => {
        console.log('Stream completed successfully');
    },

    onError: (error) => {
        console.error('Stream error:', error);
        alert('Failed to stream response: ' + error.message);
    },

    onRetry: (attempt) => {
        console.log(`Reconnecting... (attempt ${attempt})`);
    },
});

// Start streaming
client.stream('Tell me a story about Laravel');

// Later: Stop streaming
// client.close()
```

## Configuration

### Server Timeouts

Streaming responses can take longer than typical requests. Configure your server accordingly:

**PHP Configuration** (php.ini or .env):

```ini
# Maximum execution time for streaming endpoints
max_execution_time=300

# Keep output buffer disabled for real-time streaming
output_buffering=Off
```

**Laravel Configuration**:

```php
// config/mindwave-llm.php
return [
    'streaming' => [
        // Maximum streaming duration in seconds
        'timeout' => env('MINDWAVE_STREAM_TIMEOUT', 300),

        // Chunk flush interval (set to 0 for immediate)
        'flush_interval' => env('MINDWAVE_STREAM_FLUSH_INTERVAL', 0),
    ],
];
```

### Nginx Configuration

Disable buffering for streaming endpoints:

```nginx
location /api/chat/stream {
    proxy_pass http://127.0.0.1:8000;

    # Disable buffering for SSE
    proxy_buffering off;
    proxy_cache off;

    # Set appropriate headers
    proxy_set_header Connection '';
    proxy_http_version 1.1;
    chunked_transfer_encoding on;

    # Extend timeouts for long-running streams
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;

    # Required for SSE
    proxy_set_header X-Accel-Buffering no;
}
```

### Apache Configuration

Enable mod_proxy and configure streaming:

```apache
<Location /api/chat/stream>
    ProxyPass http://127.0.0.1:8000
    ProxyPassReverse http://127.0.0.1:8000

    # Disable buffering
    SetEnv proxy-nokeepalive 1
    SetEnv proxy-initial-not-pooled 1

    # Extend timeout
    ProxyTimeout 300
</Location>
```

## Advanced Topics

### OpenTelemetry Integration

Mindwave automatically instruments streaming operations with OpenTelemetry tracing:

```php
use Illuminate\Support\Facades\Event;
use Mindwave\Mindwave\Observability\Events\LlmTokenStreamed;

// Listen for token streaming events
Event::listen(LlmTokenStreamed::class, function (LlmTokenStreamed $event) {
    logger()->info('Token streamed', [
        'delta' => $event->delta,
        'cumulative_tokens' => $event->cumulativeTokens,
        'span_id' => $event->spanId,
        'trace_id' => $event->traceId,
        'timestamp' => $event->getTimestampInMilliseconds(),
        'is_final' => $event->isFinal(),
    ]);
});

// Stream with automatic tracing
$stream = Mindwave::llm()->streamText('Hello world');
return (new StreamedTextResponse($stream))->toStreamedResponse();
```

Each streamed chunk fires an `LlmTokenStreamed` event with:

-   `delta` - The content chunk
-   `cumulativeTokens` - Total tokens streamed so far
-   `spanId` - OpenTelemetry span ID for correlation
-   `traceId` - OpenTelemetry trace ID for end-to-end tracking
-   `timestamp` - High-precision timestamp in nanoseconds
-   `metadata` - Additional provider-specific data

### Progress Tracking

Track streaming progress in real-time:

```php
use Mindwave\Mindwave\Observability\Events\LlmTokenStreamed;

Route::post('/api/chat/stream', function (Request $request) {
    $prompt = $request->input('prompt');
    $sessionId = $request->session()->getId();

    $tokenCount = 0;
    $startTime = microtime(true);

    Event::listen(LlmTokenStreamed::class, function ($event) use (&$tokenCount, $startTime) {
        $tokenCount = $event->cumulativeTokens;
        $elapsed = microtime(true) - $startTime;
        $tokensPerSecond = $tokenCount / $elapsed;

        // Broadcast progress to frontend via websockets
        broadcast(new StreamProgress(
            sessionId: session()->getId(),
            tokens: $tokenCount,
            tokensPerSecond: round($tokensPerSecond, 2),
            elapsed: round($elapsed, 2),
        ));
    });

    $stream = Mindwave::llm()->streamText($prompt);
    return (new StreamedTextResponse($stream))->toStreamedResponse();
});
```

### Cost Estimation During Streaming

Calculate costs in real-time as tokens are generated:

```php
use Mindwave\Mindwave\Observability\Events\LlmTokenStreamed;

Route::post('/api/chat/stream', function (Request $request) {
    $model = 'gpt-4-turbo';
    $inputCostPer1k = 0.01; // $0.01 per 1K input tokens
    $outputCostPer1k = 0.03; // $0.03 per 1K output tokens

    $estimatedInputTokens = 100; // Approximate from prompt length

    Event::listen(LlmTokenStreamed::class, function ($event) use ($inputCostPer1k, $outputCostPer1k, $estimatedInputTokens) {
        $inputCost = ($estimatedInputTokens / 1000) * $inputCostPer1k;
        $outputCost = ($event->cumulativeTokens / 1000) * $outputCostPer1k;
        $totalCost = $inputCost + $outputCost;

        // Log or broadcast cost updates
        logger()->debug('Streaming cost update', [
            'cumulative_tokens' => $event->cumulativeTokens,
            'estimated_cost' => number_format($totalCost, 4),
        ]);
    });

    $stream = Mindwave::llm()->streamText($request->input('prompt'));
    return (new StreamedTextResponse($stream))->toStreamedResponse();
});
```

### Reconnection Handling

Implement robust reconnection on the frontend:

```typescript
class RobustStreamingClient {
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private baseDelay = 1000;
    private eventSource: EventSource | null = null;

    stream(
        prompt: string,
        callbacks: {
            onChunk: (chunk: string) => void;
            onComplete: () => void;
            onError: (error: Error) => void;
        }
    ) {
        this.connect(
            `/api/chat/stream?prompt=${encodeURIComponent(prompt)}`,
            callbacks
        );
    }

    private connect(url: string, callbacks: any) {
        this.eventSource = new EventSource(url);

        this.eventSource.addEventListener('message', (event) => {
            this.reconnectAttempts = 0; // Reset on success
            callbacks.onChunk(event.data);
        });

        this.eventSource.addEventListener('done', () => {
            callbacks.onComplete();
            this.close();
        });

        this.eventSource.onerror = () => {
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                const delay =
                    this.baseDelay * Math.pow(2, this.reconnectAttempts - 1);

                console.log(
                    `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`
                );

                this.close();
                setTimeout(() => this.connect(url, callbacks), delay);
            } else {
                callbacks.onError(
                    new Error('Max reconnection attempts exceeded')
                );
                this.close();
            }
        };
    }

    close() {
        this.eventSource?.close();
        this.eventSource = null;
    }
}
```

### Heartbeat for Long Streams

For very long streams, implement heartbeat to detect stale connections:

```php
Route::get('/api/chat/stream', function (Request $request) {
    $callback = function () use ($request) {
        $stream = Mindwave::llm()->streamText($request->input('prompt'));
        $lastChunkTime = time();
        $heartbeatInterval = 15; // seconds

        foreach ($stream as $chunk) {
            echo "event: message\n";
            echo "data: {$chunk}\n\n";
            flush();
            $lastChunkTime = time();
        }

        // Send heartbeat if no chunks for a while
        if (time() - $lastChunkTime > $heartbeatInterval) {
            echo "event: heartbeat\n";
            echo "data: {\"status\":\"alive\"}\n\n";
            flush();
        }

        echo "event: done\n";
        echo "data: {\"status\":\"complete\"}\n\n";
        flush();
    };

    return response()->stream($callback, 200, [
        'Content-Type' => 'text/event-stream',
        'Cache-Control' => 'no-cache',
        'X-Accel-Buffering' => 'no',
    ]);
});
```

Client-side heartbeat handling:

```javascript
eventSource.addEventListener('heartbeat', (event) => {
    console.log('Connection alive:', event.data);
    lastHeartbeat = Date.now();
});

// Monitor for stale connection
setInterval(() => {
    if (Date.now() - lastHeartbeat > 30000) {
        console.warn('No heartbeat for 30s, reconnecting...');
        eventSource.close();
        reconnect();
    }
}, 5000);
```

## Troubleshooting

### Common Issues

**Problem: Stream stops after a few seconds**

This is usually caused by server timeouts or buffering.

Solution:

```nginx
# nginx.conf
proxy_buffering off;
proxy_read_timeout 300s;
```

```ini
# php.ini
max_execution_time=300
output_buffering=Off
```

**Problem: Chunks arrive all at once instead of progressively**

This indicates buffering is enabled somewhere in the stack.

Solution:

```php
// Ensure headers are set correctly
return response()->stream($callback, 200, [
    'Content-Type' => 'text/event-stream',
    'Cache-Control' => 'no-cache',
    'X-Accel-Buffering' => 'no', // Disable nginx buffering
]);
```

**Problem: EventSource immediately closes with error**

Check for CORS issues or authentication failures.

Solution:

```php
// config/cors.php
'paths' => ['api/*', 'api/chat/stream'],
'supports_credentials' => true,
```

**Problem: "Streaming is not supported by the driver"**

You're using a driver that doesn't implement streaming.

Solution:

```php
// Only OpenAI driver currently supports streaming
// Check config/mindwave-llm.php
'default' => 'openai', // Use OpenAI driver
```

**Problem: Memory leaks on long streams**

The generator accumulates memory over time.

Solution:

```php
// Don't store chunks in memory
$response->onChunk(function ($chunk) {
    // Process immediately, don't accumulate
    echo $chunk;
    flush();
});
```

### Debugging Tips

**Enable verbose logging:**

```php
use Illuminate\Support\Facades\Log;

$stream = Mindwave::llm()->streamText($prompt);
$response = new StreamedTextResponse($stream);

$chunkCount = 0;
$response->onChunk(function ($chunk) use (&$chunkCount) {
    $chunkCount++;
    Log::debug("Chunk {$chunkCount}", [
        'length' => strlen($chunk),
        'content' => substr($chunk, 0, 50),
    ]);
});

return $response->toStreamedResponse();
```

**Monitor network in browser DevTools:**

1. Open DevTools → Network tab
2. Send request
3. Look for `/api/chat/stream` request
4. Check "Response" tab - you should see data appearing progressively
5. Check "Headers" tab - verify `Content-Type: text/event-stream`

**Test SSE connection directly:**

```bash
curl -N http://localhost:8000/api/chat/stream?prompt=Hello

# Expected output:
# event: message
# data: Hello
#
# event: message
# data:  there
#
# event: done
# data: {"status":"complete"}
```

### Browser Compatibility

SSE is supported in all modern browsers:

| Browser | Support | Notes                       |
| ------- | ------- | --------------------------- |
| Chrome  | ✅ Full | Excellent support           |
| Firefox | ✅ Full | Excellent support           |
| Safari  | ✅ Full | iOS 13+ for mobile          |
| Edge    | ✅ Full | Chromium-based              |
| IE 11   | ❌ No   | Use polyfill or alternative |

**Polyfill for older browsers:**

```html
<!-- Include polyfill for IE11 support -->
<script src="https://cdn.jsdelivr.net/npm/event-source-polyfill@1.0.31/src/eventsource.min.js"></script>
```

### Production Checklist

Before deploying streaming to production:

-   [ ] Test with slow network conditions (throttle to 3G)
-   [ ] Verify nginx/Apache buffering is disabled
-   [ ] Configure appropriate timeouts (300s recommended)
-   [ ] Implement reconnection logic on frontend
-   [ ] Add rate limiting to prevent abuse
-   [ ] Set up monitoring for stream failures
-   [ ] Test error handling (invalid prompts, API failures)
-   [ ] Verify HTTPS is enabled (required for SSE in production)
-   [ ] Test concurrent streams from same user
-   [ ] Implement proper CORS if frontend is on different domain
-   [ ] Add logging for debugging production issues
-   [ ] Test mobile browser compatibility
-   [ ] Set up alerts for high error rates
-   [ ] Document expected latency and token rates
-   [ ] Test graceful degradation when streaming fails

## Next Steps

-   **[Prompt Engineering](./prompts.md)** - Optimize prompts for better streaming results
-   **[Context Discovery](./context.md)** - Provide relevant context to LLM streams
-   **[Observability](../observability/tracing.md)** - Monitor streaming performance with OpenTelemetry
-   **[Error Handling](../guides/error-handling.md)** - Production-grade error handling patterns
