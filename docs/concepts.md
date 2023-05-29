# Concept

## LLMs

[Detailed documentation](/docs/guide/llm)

Large Language Model

todo: write the rest

## Embeddings

[Detailed documentation](/docs/guide/embeddings)

Tokens n stuff
todo: write the rest

## Brains

[Detailed documentation](/docs/guide/brain)

A Brain in Mindwave can be thought of as a database of knowledge. And is implemented as an abstraction around a
configurable vector
database and an embedding function.

### Vector database

[Detailed documentation](/docs/guide/vectorstore)

In Mindwave, Knoweldge vector database in Mindwave is a storage system that stores vector representations of knowledge.
It serves as the
underlying data structure for the Brain. The vector database allows efficient storage and retrieval of vector embeddings
associated with different pieces of knowledge.

Mindwave currently ships with 2 Vector database drivers:

-   [Pinecone](https://www.pinecone.io/)
-   [Weaviate](https://weaviate.io/)

### Embedding

[Detailed documentation](/docs/guide/embeddings)

Embedding refers to the process of converting a piece of knowledge into a dense vector representation. This vector
representation captures the semantic meaning of the knowledge and enables various operations like similarity calculation
and pattern recognition. The embedding function maps the knowledge to a high-dimensional vector space, where similar
pieces of knowledge are closer together.

Mindwave ships with Embedding support for `text-embedding-ada-002`
via [OpenAI's Embedding API](https://platform.openai.com/docs/guides/embeddings/), but support for more
embedding options are planned.

## Documents

[Detailed documentation](/docs/guide/documents)

Documents in Mindwave is the information or data that you want to use in your AI application. In order to be useful,
documents needs to be consumed by a Brain.

## Agents

[Detailed documentation](/docs/guide/agents)

Agents in Mindwave are entities that interact with the knowledge stored in one or multiple Brains.

They can perform tasks such as querying the knowledge, retrieving relevant information, and providing responses based on
the available knowledge.

Agents utilize the vector database and the embedding function to make intelligent decisions and generate appropriate
outputs.

## Prompt Templates

[Detailed documentation](/docs/guide/prompt-templates)

A `PromptTemplate` in Mindwave is a class that allows you to easily provide a text prompt, an `OutputParser`, and input
variables (an array with key-value pairs to replace in the prompt). When the LLM accepts a PromptTemplate as an input,
it replaces the placeholders in the prompt with the provided inputs and attempts to parse the response using
an `OutputParser`.

## Output Parsers

[Detailed documentation](/docs/guide/output-parsers)

An `OutputParser` is a class that provides formatting instructions for the LLM in the form of a string. It also has
a `parse()` method that takes the response from the LLM and attempts to parse it into the desired format.

## Tools

[Detailed documentation](/docs/guide/tools)

Tools in Mindwave are essentially a function that has a name and description that is injected into the context of the
prompt fed into an agent's underlying LLM.

Based on the query, an agent can choose to use a certain tool to lookup information to generate an answer.

When a Tool is used by the agent, the "handle" method in the Tool class is called, which can perform arbitrary actions,
and return an output.

The Tool output is then fed back into the agent and the agent can then use that data to generate a response or take
further action.

## Chat History

[Detailed documentation](/docs/guide/chat-history)

todo: write summary
