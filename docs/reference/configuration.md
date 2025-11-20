# Configuration Reference

This page provides a quick reference to Mindwave's configuration. For detailed explanations and examples, see the [Complete Configuration Guide](/docs/configuration.md).

## Configuration Files

Mindwave uses five configuration files:

| File | Purpose | Documentation |
|------|---------|---------------|
| `mindwave-llm.php` | LLM provider settings | [Configuration Guide](/docs/configuration.md#llm-configuration) |
| `mindwave-tracing.php` | OpenTelemetry tracing | [Configuration Guide](/docs/configuration.md#tracing-configuration) |
| `mindwave-embeddings.php` | Embedding providers | [Configuration Guide](/docs/configuration.md#embeddings-configuration) |
| `mindwave-vectorstore.php` | Vector databases | [Configuration Guide](/docs/configuration.md#vector-store-configuration) |
| `mindwave-context.php` | Context discovery | [Configuration Guide](/docs/configuration.md#context-configuration) |

## Quick Reference

### LLM Configuration

```bash
# Provider Selection
MINDWAVE_LLM=openai

# OpenAI
MINDWAVE_OPENAI_API_KEY=sk-proj-...
MINDWAVE_OPENAI_MODEL=gpt-4-turbo
MINDWAVE_OPENAI_TEMPERATURE=0.7
MINDWAVE_OPENAI_MAX_TOKENS=2000

# Anthropic
MINDWAVE_ANTHROPIC_API_KEY=sk-ant-...
MINDWAVE_ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
MINDWAVE_ANTHROPIC_MAX_TOKENS=4096

# Mistral
MINDWAVE_MISTRAL_API_KEY=...
MINDWAVE_MISTRAL_MODEL=mistral-large-latest
```

[See full LLM configuration](/docs/configuration.md#llm-configuration)

### Tracing Configuration

```bash
# Core Settings
MINDWAVE_TRACING_ENABLED=true
MINDWAVE_SERVICE_NAME=my-app

# Database Storage
MINDWAVE_TRACE_DATABASE=true

# OTLP Export
MINDWAVE_TRACE_OTLP_ENABLED=false
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Privacy
MINDWAVE_TRACE_CAPTURE_MESSAGES=false

# Sampling
MINDWAVE_TRACE_SAMPLER=always_on
MINDWAVE_TRACE_SAMPLE_RATIO=1.0
```

[See full tracing configuration](/docs/configuration.md#tracing-configuration)

### Embeddings Configuration

```bash
MINDWAVE_EMBEDDINGS=openai
MINDWAVE_OPENAI_API_KEY=sk-proj-...
```

[See full embeddings configuration](/docs/configuration.md#embeddings-configuration)

### Vector Store Configuration

```bash
# Default Provider
MINDWAVE_VECTORSTORE=pinecone

# Pinecone
MINDWAVE_PINECONE_API_KEY=...
MINDWAVE_PINECONE_ENVIRONMENT=us-east1-gcp
MINDWAVE_PINECONE_INDEX=mindwave

# Qdrant
MINDWAVE_QDRANT_HOST=localhost
MINDWAVE_QDRANT_PORT=6333
MINDWAVE_QDRANT_COLLECTION=mindwave

# Weaviate
MINDWAVE_WEAVIATE_URL=http://localhost:8080/v1
MINDWAVE_WEAVIATE_API_TOKEN=password
MINDWAVE_WEAVIATE_INDEX=items
```

[See full vector store configuration](/docs/configuration.md#vector-store-configuration)

### Context Discovery Configuration

```bash
# TNTSearch
MINDWAVE_TNT_INDEX_TTL=24
MINDWAVE_TNT_MAX_INDEX_SIZE=100

# Tracing
MINDWAVE_CONTEXT_TRACING=true
```

[See full context configuration](/docs/configuration.md#context-configuration)

## Complete Documentation

For detailed information including:
- Configuration examples for each environment
- Security best practices
- Performance tuning
- Troubleshooting

See the **[Complete Configuration Guide](/docs/configuration.md)**.

## Related Documentation

- [API Reference](/docs/reference/api.md) - Core API reference
- [Installation Guide](/docs/installation.md) - Setup instructions
- [Observability Configuration](/docs/observability/configuration.md) - Advanced tracing options
