# Prompt Templates

todo write this

A `PromptTemplate` in Mindwave is a class that allows you to easily provide a text prompt, an `OutputParser`, and input
variables (an array with key-value pairs to replace in the prompt). When the LLM accepts a PromptTemplate as an input,
it replaces the placeholders in the prompt with the provided inputs and attempts to parse the response using
an `OutputParser`.

Here's an example:

```php

$prompt = PromptTemplate::create('Generate 10 keywords for {topic}')
    ->withOutputParser(new JsonListOutputParser())
    ->format([
        'topic' => 'Laravel',
    ]);
```

Outputs the following:

````
Generate 10 keywords for Laravel
RESPONSE FORMAT INSTRUCTIONS
----------------------------
When responding to me please, please output the response in the following format:
```json
{
    "data": array // An array of strings.
}
```

However, above all else, all responses must adhere to the format of RESPONSE FORMAT INSTRUCTIONS.
Remember to respond with a JSON blob with a single key, and NOTHING else.
````
