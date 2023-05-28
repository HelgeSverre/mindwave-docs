# Concept

## LLMs

Large Language Model

todo: write the rest

## Embeddings

Tokens n stuff
todo: write the rest

## Brains

A Brain in Mindwave can be thought of as a database of knowledge. And is implemented as an abstraction around a
configurable vector
database and an embedding function.

### Vector database

In Mindwave, Knoweldge vector database in Mindwave is a storage system that stores vector representations of knowledge.
It serves as the
underlying data structure for the Brain. The vector database allows efficient storage and retrieval of vector embeddings
associated with different pieces of knowledge.

Mindwave currently ships with 2 Vector database drivers:

-   [Pinecone](https://www.pinecone.io/)
-   [Weaviate](https://weaviate.io/)

### Embedding

Embedding refers to the process of converting a piece of knowledge into a dense vector representation. This vector
representation captures the semantic meaning of the knowledge and enables various operations like similarity calculation
and pattern recognition. The embedding function maps the knowledge to a high-dimensional vector space, where similar
pieces of knowledge are closer together.

Mindwave ships with Embedding support for `text-embedding-ada-002`
via [OpenAI's Embedding API](https://platform.openai.com/docs/guides/embeddings/), but support for more
embedding options are planned.

## Document

Document in Mindwave is the information or data that you want to use in your AI application. In order to be useful,
documents needs to be consumed by a Brain.

Document Consumption involves breaking down the underlying text representation of a piece of data into smaller
parts, creating an embedding vector for the data, then storing both the data and embedding in a vector database.

```php
DocumentLoader::fromPdf(
    data: File::get("uploads/important-document.pdf"),
    meta: ["name" => "Important document"],
);

DocumentLoader::fromUrl(
    data: "https://mindwave.no/",
    meta: ["name" => "Mindwave Documentation"],
);

DocumentLoader::make("My name is Helge Sverre");
```

### Supported filetypes

Mindwave can create knowledge from the following filetypes.

-   Plain Text (csv, markdown, etc)
-   PDF
-   HTML
-   doc, docx (Word documents)

With planned support for the following formats in the future:

-   ppt, pptx (Powerpoint files)
-   xls, xlsx (Excel files)
-   EML files (raw email)
-   MBOX (mailbox file, ex: export from gmail)

## Agents

Agents in Mindwave are entities that interact with the knowledge stored in one or multiple Brains.

They can perform tasks such as querying the knowledge, retrieving relevant information, and providing responses based on
the available knowledge.

Agents utilize the vector database and the embedding function to make intelligent decisions and generate appropriate
outputs.

## Tools

Tools in Mindwave are essentially a function that has a name and description that is injected into the context of the
prompt fed into an agent's underlying LLM.

Based on the query, an agent can choose to use a certain tool to lookup information to generate an answer.

When a Tool is used by the agent, the "handle" method in the Tool class is called, which can perform arbitrary actions,
and return an output.

The Tool output is then fed back into the agent and the agent can then use that data to generate a response or take
further action.

## Chat History

todo: write
