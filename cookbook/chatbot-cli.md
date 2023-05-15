# Simple Command line Chatbot

This guide will walk you through building a basic chatbot using Laravel. We'll create the simplest chatbot possible
without any fancy features. Let's get started!

## Step 1: Generate a new Artisan command

To begin, open your terminal or command prompt and run the following command to generate a new Artisan command:

```shell
php artisan make:command Chatbot
```

This command will create a new file named `Chatbot.php` in the `app/Console/Commands` directory.

## Step 2: Write the code

Now, open the `Chatbot.php` file you just created and replace the existing code with the following:

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Mindwave\Mindwave\Agents\Agent;
use Mindwave\Mindwave\LLM\OpenAIChat;
use Mindwave\Mindwave\Memory\ChatMessageHistory;
use OpenAI;

class Chatbot extends Command
{
    public $signature = 'chat';

    public function handle()
    {
        $agent = new Agent(
            llm: new OpenAIChat(OpenAI::client(env('OPENAI_API_KEY'))),
            messageHistory: ChatMessageHistory::fromMessages([]),
            tools: [],
        );

        while (true) {
            $this->comment($agent->ask($this->ask('Prompt')));
        }
    }
}
```

This code sets up the chatbot command, initializes the chatbot agent, and creates a loop to continuously ask for user
input and prints out the agent's response.

## Step 3: Start the chatbot

To start the chatbot, go back to your terminal or command prompt and run the following command:

```shell
php artisan chat
```

**Congratulations!**

You've created an AI chatbot using Laravel. Now you can interact with the chatbot by entering prompts
and receiving responses.

Now let's step it up a notch shall we?
