# Configuring Mindwave

Mindwave is a Laravel package that utilizes
the [driver/manager pattern](https://pineco.de/drivers-and-managers-in-laravel/), akin to Laravel's database and
filesystem configurations. This pattern enables you to configure individual components such as Language Models (LLMs),
Vectorstores, and Embedding APIs separately, and even extend the package with your own implementations to suit your
own specific use case.

## Config Files

Mindwave's configuration is divided into several files, each responsible for different aspects of the library. The
following configuration files are included in the `config` directory:

-   `config/mindwave-embeddings.php`: Configuration for text embeddings.
-   `config/mindwave-vectorstore.php`: Configuration for vector stores.
-   `config/mindwave-llm.php`: Configuration for language models.

Below, you will find detailed explanations for each configuration file.

## Embeddings

```
config/mindwave-embeddings.php
```

The `mindwave-embeddings.php` configuration contains setting and various drivers for text embeddings.

### Configuration Options

-   **openai**
    -   `api_key`: The API key for the OpenAI text embedding API.
    -   `org_id`: The organization ID for the OpenAI API.
    -   `model`: The text embedding model, by default the `text-embedding-ada-002` model is used.

Example configuration:

```php
<?php

return [
    'default' => env('MINDWAVE_EMBEDDINGS', 'openai'),

    'embeddings' => [
        'openai' => [
            'api_key' => env('MINDWAVE_OPENAI_API_KEY'),
            'org_id' => env('MINDWAVE_OPENAI_ORG_ID'),
            'model' => 'text-embedding-ada-002',
        ],
    ],
];
```

## Vectorstore

```
config/mindwave-vectorstore.php
```

The `mindwave-vectorstore.php` configuration file allows you to configure different vector store providers. Vector
stores are used for storing and retrieving vector representations of textual data.

### Configuration Options

-   **array**

    -   No configuration options required.

-   **file**

    -   `path`: The filepath to store the json file

-   **pinecone**

    -   `api_key`: The API key for the Pinecone vector store.
    -   `environment`: The environment for the Pinecone vector store.
    -   `index`: The index to use in the Pinecone vector store.

-   **weaviate**

    -   `api_url`: The API URL for the Weaviate vector store.
    -   `api_token`: The API token for the Weaviate vector store.
    -   `additional_headers`: Additional headers to include in the API requests for the Weaviate vector store.
    -   `index`: The index to use in the Weaviate vector store.

-   **qdrant**
    -   `host`: The hostname for the qdrant service.
    -   `port`: The port for the qdrant service (defaults to 6333)
    -   `api_key`: API key, does not seem to be possible to set an api key yet, might be used for hosted cloud version
    -   `collection`: The name of the collection to store data in.

Example configuration:

```php
<?php

return [
    'default' => env('MINDWAVE_VECTORSTORE', 'pinecone'),

    'vectorstores' => [
        'array' => [],

        'file' => [
            'path' => env('MINDWAVE_VECTORSTORE_PATH', storage_path('mindwave/vectorstore.json')),
        ],

        'pinecone' => [
            'api_key' => env('MINDWAVE_PINECONE_API_KEY'),
            'environment' => env('MINDWAVE_PINECONE_ENVIRONMENT'),
            'index' => 'items',
        ],

        'weaviate' => [
            'api_url' => env('MINDWAVE_WEAVIATE_URL'),
            'api_token' => env('MINDWAVE_WEAVIATE_API_TOKEN'),
            'additional_headers' => [],
            'index' => 'items',
        ],

         'qdrant' => [
            'host' => env('MINDWAVE_QDRANT_HOST', 'localhost'),
            'port' => env('MINDWAVE_QDRANT_PORT', '6333'),
            'api_key' => env('MINDWAVE_QDRANT_API_KEY', ''),
            'collection' => env('MINDWAVE_QDRANT_COLLECTION', 'items'),
        ],
    ],
];
```

## LLM

```
config/mindwave-llm.php
```

The `mindwave-llm.php` configuration file allows you to configure different language models for language generation
tasks.

### Configuration Options

-   **openai_chat**

    -   `api_key`: The API key for the OpenAI language model.
    -   `org_id`: The organization ID for the OpenAI API.
    -   `model`: The name of the language model to use.
    -   `max_tokens`: The maximum number of tokens to generate in a language response.
    -   `temperature`: The temperature value for language response generation.

-   **openai_completion**
    -   Same configuration options as `openai_chat`.

Example configuration:

```php
<?php

return [
    'default' => env('MINDWAVE_LLM', 'openai_chat'),

    'llms' => [
        'openai_chat' => [
            'api_key' => env('MINDWAVE_OPENAI_API_KEY'),
            'org_id' => env('MINDWAVE_OPENAI_ORG_ID'),
            'model' => env('MINDWAVE_OPENAI_MODEL', 'gpt-3.5-turbo'),
            'max_tokens' => 1000,
            'temperature' => 0.4,
        ],
        'openai_completion' => [
            'api_key' => env('MINDWAVE_OPENAI_API_KEY'),
            'org_id' => env('MINDWAVE_OPENAI_ORG_ID'),
            'model' => env('MINDWAVE_OPENAI_MODEL', 'text-davinci-003'),
            'max_tokens' => 1000,
            'temperature' => 0.4,
        ],
    ],
];
```
