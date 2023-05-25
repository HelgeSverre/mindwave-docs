# Using Weaviate with Laravel Sail

This documentation provides instructions on how to integrate Weaviate with Laravel Sail. Before proceeding with the Weaviate setup, ensure that you have installed and configured [Laravel Sail](https://laravel.com/docs/10.x/sail).

## Adding Weaviate Database

To add Weaviate to your application, follow these steps:

1. Open your `docker-compose.yml` file.
2. Locate the `services` section and add the following service definition for Weaviate:

```yaml
version: '3'
services:
    # Your existing services here...

    # Add this:
    weaviate:
        image: semitechnologies/weaviate:latest
        networks:
            - sail
        ports:
            - '${FORWARD_WEAVIATE_PORT:-8080}:8080'
            - '6060:6060'
        restart: on-failure
        volumes:
            - 'sail-weaviate:/var/lib/weaviate'
        environment:
            QUERY_DEFAULTS_LIMIT: 25
            AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED: 'true'
            AUTHENTICATION_APIKEY_ENABLED: 'true'
            AUTHENTICATION_APIKEY_ALLOWED_KEYS: 'password'
            AUTHENTICATION_APIKEY_USERS: 'sail'
            PERSISTENCE_DATA_PATH: '/var/lib/weaviate'
            DEFAULT_VECTORIZER_MODULE: 'none'
            CLUSTER_HOSTNAME: 'mindwave'
            ORIGIN: 'https://localhost:${FORWARD_WEAVIATE_PORT:-8080}'
```

3. Add the following code to the `volumes` section:

```yml
volumes:
    # Your existing volumes here...

    # Add this:
    sail-weaviate:
        driver: local
```

4. After completing the above steps, Weaviate will be accessible at `http://localhost:8080` once you run `sail up -d`.

## Adding Weaviate Console UI

If you want to use the Weaviate console (fancy version of GraphiQL), follow these steps:

1. Open your `docker-compose.yml` file.
2. Add the following service definition for the Weaviate console:

```yaml
version: '3'
services:
    # Your existing services here...

    # Add this:
    weaviate-console:
        image: semitechnologies/weaviate-console:latest
        networks:
            - sail
        ports:
            - '${FORWARD_WEAVIATE_CONSOLE:-8081}:80'
        depends_on:
            - weaviate
```

## Environment Configuration

You can modify the port mappings for the `weaviate` and `weaviate-console` services on your local machine. By default, the ports are set as follows:

```dotenv
FORWARD_WEAVIATE_CONSOLE=8081
FORWARD_WEAVIATE_PORT=8080
```

Feel free to change these values if you are already using these ports for other purposes.

## Complete Example

Below is a complete example of a `docker-compose.yml` file for an application that includes MySQL, MinIO, Weaviate, and Weaviate Console:

```yaml
version: '3'
services:
    laravel.test:
        build:
            context: ./vendor/laravel/sail/runtimes/8.2
            dockerfile: Dockerfile
            args:
                WWWGROUP: '${WWWGROUP}'
        image: sail-8.2/app
        extra_hosts:
            - 'host.docker.internal:host-gateway'
        ports:
            - '${APP_PORT:-80}:80'
            - '${VITE_PORT:-5173}:${VITE_PORT:-5173}'
        environment:
            WWWUSER: '${WWWUSER}'
            LARAVEL_SAIL: 1
            XDEBUG_MODE: '${SAIL_XDEBUG_MODE:-off}'
            XDEBUG_CONFIG: '${SAIL_XDEBUG_CONFIG:-client_host=host.docker.internal}'
            IGNITION_LOCAL_SITES_PATH: '${PWD}'
        volumes:
            - '.:/var/www/html'
        networks:
            - sail
        depends_on:
            - mysql
            - minio
    mysql:
        image: 'mysql/mysql-server:8.0'
        ports:
            - '${FORWARD_DB_PORT:-3306}:3306'
        environment:
            MYSQL_ROOT_PASSWORD: '${DB_PASSWORD}'
            MYSQL_ROOT_HOST: '%'
            MYSQL_DATABASE: '${DB_DATABASE}'
            MYSQL_USER: '${DB_USERNAME}'
            MYSQL_PASSWORD: '${DB_PASSWORD}'
            MYSQL_ALLOW_EMPTY_PASSWORD: 1
        volumes:
            - 'sail-mysql:/var/lib/mysql'
            - './vendor/laravel/sail/database/mysql/create-testing-database.sh:/docker-entrypoint-initdb.d/10-create-testing-database.sh'
        networks:
            - sail
        healthcheck:
            test:
                - CMD
                - mysqladmin
                - ping
                - '-p${DB_PASSWORD}'
            retries: 3
            timeout: 5s
    minio:
        image: 'minio/minio:latest'
        ports:
            - '${FORWARD_MINIO_PORT:-9000}:9000'
            - '${FORWARD_MINIO_CONSOLE_PORT:-8900}:8900'
        environment:
            MINIO_ROOT_USER: sail
            MINIO_ROOT_PASSWORD: password
        volumes:
            - 'sail-minio:/data/minio'
        networks:
            - sail
        command: 'minio server /data/minio --console-address ":8900"'
        healthcheck:
            test:
                - CMD
                - curl
                - '-f'
                - 'http://localhost:9000/minio/health/live'
            retries: 3
            timeout: 5s
    weaviate-console:
        image: semitechnologies/weaviate-console:latest
        networks:
            - sail
        ports:
            - '${FORWARD_WEAVIATE_CONSOLE:-8081}:80'
        depends_on:
            - weaviate
    weaviate:
        image: semitechnologies/weaviate:latest
        networks:
            - sail
        ports:
            - '${FORWARD_WEAVIATE_PORT:-8080}:8080'
            - '6060:6060'
        restart: on-failure
        volumes:
            - 'sail-weaviate:/var/lib/weaviate'
        environment:
            QUERY_DEFAULTS_LIMIT: 25
            AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED: 'true'
            AUTHENTICATION_APIKEY_ENABLED: 'true'
            AUTHENTICATION_APIKEY_ALLOWED_KEYS: 'password'
            AUTHENTICATION_APIKEY_USERS: 'sail'
            PERSISTENCE_DATA_PATH: '/var/lib/weaviate'
            DEFAULT_VECTORIZER_MODULE: 'none'
            CLUSTER_HOSTNAME: 'mindwave'
            ORIGIN: 'https://localhost:${FORWARD_WEAVIATE_PORT:-8080}'
networks:
    sail:
        driver: bridge
volumes:
    sail-mysql:
        driver: local
    sail-minio:
        driver: local
    sail-weaviate:
        driver: local
```

Make sure to adjust the environment variables and ports according to your specific requirements.

### Additional Links

-   [Docker Desktop](https://www.docker.com/products/docker-desktop/)
-   [Laravel Sail Documentation](https://laravel.com/docs/10.x/sail)
-   [Weaviate Docker Compose Installation Guide](https://weaviate.io/developers/weaviate/installation/docker-compose)
-   [Weaviate Docker Compose Environment Configuration](https://weaviate.io/developers/weaviate/config-refs/env-vars)
