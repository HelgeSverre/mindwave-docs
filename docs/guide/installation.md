# Installing Mindwave

You can install the package via composer:

```bash
composer require mindwave/mindwave
```

You can publish and run the migrations with:

```bash
php artisan vendor:publish --tag="mindwave-migrations"
php artisan migrate
```

You can publish the config file with:

```bash
php artisan vendor:publish --tag="mindwave-config"
```
