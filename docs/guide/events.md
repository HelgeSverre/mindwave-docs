# Events

Mindwave dispatches events that allow you to hook into various parts of the system

todo write this:

## LLM events

-   `mindwave.llm.start`
-   `mindwave.llm.end`
-   `mindwave.llm.error`

## Vectorstore events

-   `mindwave.vectorstore.insert`
-   `mindwave.vectorstore.upsert`
-   `mindwave.vectorstore.find`

## Brain events

-   `mindwave.brain.consuming`
-   `mindwave.brain.consumed`
-   `mindwave.brain.error`
-   `mindwave.brain.lookup`

## Chain events

-   `mindwave.chain.start`
-   `mindwave.chain.end`
-   `mindwave.chain.error`

## Tool events

-   `mindwave.tool.start`
-   `mindwave.tool.end`
-   `mindwave.tool.error`

## Prompt Template events

-   `mindwave.template.instructing`
-   `mindwave.template.parsing`
-   `mindwave.template.parsed`
-   `mindwave.template.error`

## Agent events

-   `mindwave.agent.action`
-   `mindwave.agent.error`
-   `mindwave.agent.finish`
