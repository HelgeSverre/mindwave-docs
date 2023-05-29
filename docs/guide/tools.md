# Tools

todo write this

## SimpleTool

Simpletool is a class that accepts the tool name, description and a callback closure to easily allow you to build quick
and dirty tools.

```php
$tool = new SimpleTool(
    name: 'Lookup',
    description: 'Use this to lookup information you dont know',
    callback: fn ($input) => "The secret word is 'mindwave_rocks_123'",
);
```

This can be useful when you want to provide an [Agent](/docs/guide/agents) with a simple tool to do a simple action,
like searching for data, perform a request toan external data source etcl

todo : expand this with a realworld example

## Custom Tools

Generate a tool using the [mindwave:tool](/docs/guide/commands) command or make a new class that implements
the `Mindwave\Mindwave\Contracts\Tool` interface:

```php
<?php

namespace Mindwave\Mindwave\Tools;

use Mindwave\Mindwave\Contracts\Tool;

class RandomStringTool implements Tool
{
    public function name(): string
    {
        return "Random String Generator";
    }

    public function description(): string
    {
        return "This tool provides a random string";
    }

    public function run($input): string
    {
        return return Str::random(20);
    }
}

```

### Handling inputs

todo: write explanation

```php
<?php

namespace Mindwave\Mindwave\Tools;

use Mindwave\Mindwave\Contracts\Tool;

class RandomStringTool implements Tool
{
    public function name(): string
    {
        return "Random String Generator";
    }

    public function description(): string
    {
        return "This tool provides a random string, input should be a number of how many charachters to generate";
    }

    public function run($input): string
    {

        $length = intval($input)
        return return Str::random($length);

    }
}
```
