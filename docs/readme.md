# Mindwave: AI Chatbots, Agents & Document Q&A in Laravel Simplified.

## What is Mindwave?

Mindwave is a Laravel package that lets you easily build AI-powered chatbots, agents, and document question and
answering (Q&A) functionality into your application.

## Example

![Code Example](/art/code.png)

```php
<?php

use Illuminate\Support\Facades\File;
use Mindwave\Mindwave\Facades\DocumentLoader;
use Mindwave\Mindwave\Facades\Mindwave;
use Mindwave\Mindwave\Memory\ConversationBufferMemory;

$agent = Mindwave::agent(
    memory: ConversationBufferMemory::fromMessages([])
);

Mindwave::brain()
    ->consume(
        DocumentLoader::fromPdf(
            data: File::get("uploads/important-document.pdf"),
            meta: ["name" => "Important document"],
        )
    )
    ->consume(
        DocumentLoader::fromUrl(
            data: "https://mindwave.no/",
            meta: ["name" => "Mindwave Documentation"],
        )
    )
    ->consume(
        DocumentLoader::make("My name is Helge Sverre")
    );


$agent->ask("List the top 3 most important things in 'important document'");
$agent->ask("What is mindwave?");
$agent->ask("What is my name?");
```

## Use Cases

-   💬 **Chatbots**: Building AI-powered chatbots to provide support to customers.
-   🤖 **Agents**: Developing intelligent agents to automate tasks within an application.
-   ❓ **Document Q&A**: Creating document question and answering (Q&A) systems to extract insights from text.

## Technical

-   Mindwave makes it easy to generate embeddings for many types of documents (text, pdf, html, csv, json, etc), store
    those embeddings in a Vector database.
-   Using pre-made prompts you can instruct an Agent to run custom "tools" that can perform an action in your codebase,
    lookup specific information from an external source, search your vector database for semantically similar information
    and use the result of that action to generate an answer.

## Support

Mindwave is "driver" oriented, this means you can swap out the parts to suite your needs and use-cases.

### Vector databases

| Name     | Supported?   |
| -------- | ------------ |
| Pinecone | Yes          |
| Weaviate | No (planned) |
| Qdrant   | No (planned) |
| Milvus   | No (planned) |
| pgvector | No (planned) |

### LLMs

| Name               | Supported?        |
| ------------------ | ----------------- |
| OpenAI Chat models | Yes (Recommended) |
| OpenAI Completion  | Yes               |
| Cohere AI          | No (planned)      |
| Anthropic Claude   | No (planned)      |

### Embeddings

| Name                | Supported?        |
| ------------------- | ----------------- |
| OpenAI text-ada-002 | Yes (Recommended) |

## Known Limitations

While Mindwave offers powerful AI capabilities, there are some limitations to keep in mind:

| Limitation      | Description                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Hallucination   | Large language models (LLMs) like OpenAI's GPT models can occasionally produce nonsensical responses or "hallucinate".          |
| English-Centric | While you can configure Mindwave to respond in different languages, it may not always be accurate or natural-sounding.          |
| Context Length  | OpenAI's GPT models have a hard limit on the length of the input context they can process, which varies depending on the model. |

Here are the current context length limits for some of the OpenAI models supported by Mindwave:

| Model ID         | Max Tokens |
| ---------------- | ---------- |
| text-davinci-003 | 4,097      |
| gpt-3.5-turbo    | 4,096      |
| gpt-4            | 4,096      |

It's important to keep these limitations in mind when building applications with Mindwave, and to test and evaluate the
results carefully to ensure the desired outcomes are being achieved.

## Credits

-   [Helge Sverre](https://twitter.com/helgesverre)
-   [Probots.io](https://github.com/probots-io) for the [Pinecone PHP Client](https://github.com/probots-io/pinecone-php)
-   [Tim Kleyersburg](https://github.com/timkley) for the [Weaviate PHP Client](https://github.com/timkley/weaviate-php)
-   [PGVector team](https://github.com/pgvector/pgvector-php/graphs/contributors) for
    the [PGVector PHP package](https://github.com/pgvector/pgvector-php)
-   [Yethee](https://github.com/yethee) for the [Tiktoken PHP Package](https://github.com/yethee/tiktoken-php)
-   [Yethee](https://github.com/yethee) for the [Tiktoken PHP Package](https://github.com/yethee/tiktoken-php)
