# Configuring Mindwave

todo

```php
<?php

// Configuration file example here
return [


    "default_llm" => env("MINDWAVE_LLM", "openai_chat")
    "default_vectorstore" => env("MINDWAVE_VECTORSTORE", "pinecone")

    "llms" => [
        "openai_chat" => [
            "api_key" => env("OPENAI_KEY")
            "model" => "gpt-3.5-turbo"
            "max_tokens" => 800
            "temperature" => 0.5
        ],
        "openai_complete" => [
            "api_key" => env("OPENAI_KEY")
            "model" => "text-davinci-003"
            "max_tokens" => 800
            "temperature" => 0.5
        ]

        // Cohere
        // Anthropic
        // Hugginface?

    ],


    "vectorstores" => [
        "pinecone" => [
            "api_key" => env("MINDWAVE_PINECONE_API_KEY"),
            "environment" => env("MINDWAVE_PINECONE_ENVIRONMENT"),
            "index" => env("MINDWAVE_PINECONE_INDEX"),
        ],

        // Weaviate
        // PGVector
        // testing
        // etc..
    ]
];
```
