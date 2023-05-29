# Extending Mindwave

Since Mindwave uses the Manager pattern for its major components, it is simple to extend it with your own custom implementations,

## Custom LLM Implementation

If you have a custom LLM inference API that you want to use, but Mindwave currently dont support,
you can simply extend the LLMManager with your own LLM implementation like so:

Put this in your `AppServiceProvider`:

```php
<?php

namespace App\Providers;

use App\LLM\CustomLLM;
use Illuminate\Support\ServiceProvider;
use Mindwave\Mindwave\Facades\LLM;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        LLM::extend("custom-llm", function($app) {
            return new CustomLLM(env("CUSTOM_LLM_API_KEY"))
        });
    }
}
```

And implemnent your custom LLM class by implementing the `Mindwave\Mindwave\Contracts\LLM` interace, here is an example:

```php
<?php


namespace Mindwave\Mindwave\LLM\Drivers;

use Illuminate\Support\Facades\Http;
use Mindwave\Mindwave\Contracts\LLM;

class CustomLLM implements LLM
{
    protected string $apiKey;

    public function __construct(string $apiKey)
    {
        $this->apiKey = $apiKey;
    }

    public function predict(string $prompt): ?string
    {
        return Http::withToken($this->apiKey)
            ->get("https://my-custom-llm.com/predict", [
                "prompt" => $prompt,
            ])
            ->json("response.text");
    }
}

```
