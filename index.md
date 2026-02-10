---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

title: 'Mindwave'
titleTemplate: 'Production AI Utilities for Laravel'

hero:
    name: 'Mindwave v1.0'
    text: 'Production AI Utilities'
    tagline: 'The working developer AI toolkit for Laravel - Long prompts, streaming, tracing, and context discovery made simple.'
    image:
        light: /art/logo.svg
        dark: /art/logo-dark.svg
    actions:
        - theme: brand
          text: Get Started
          link: /docs/quick-start
        - theme: alt
          text: View on GitHub
          link: https://github.com/helgesverre/mindwave

features:
    - icon: 📝
      title: Prompt Composer
      details: Auto-fit long prompts to any model's context window with priority-based sections and smart shrinkers.
      link: /docs/core/prompt-composer
    - icon: 🌊
      title: Streaming SSE
      details: Real-time Server-Sent Events streaming in 3 lines of code. Works with Nginx/Apache out of the box.
      link: /docs/core/streaming
    - icon: 📊
      title: OpenTelemetry Tracing
      details: Industry-standard observability with automatic cost tracking, token usage, and OTLP export to Jaeger/Grafana.
      link: /docs/observability/tracing
    - icon: 🔍
      title: Context Discovery
      details: Ad-hoc search over your database and CSV files with TNTSearch. No external services required.
      link: /docs/core/context-discovery
    - icon: 🤖
      title: Multiple LLM Providers
      details: OpenAI, Anthropic Claude, and Mistral AI with a unified interface. Switch providers with one line.
      link: /docs/providers/openai
    - icon: 🧠
      title: RAG & Vector Search
      details: Semantic search with Pinecone, Qdrant, or Weaviate. Built-in document loaders for PDF, Word, and more.
      link: /docs/rag/overview
---
