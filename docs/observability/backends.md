# Observability Backends

Comprehensive guide to observability backends supported by Mindwave, including setup instructions, configuration examples, and best practices for Jaeger, Grafana Tempo, Honeycomb, Datadog, and other platforms.

## Overview

Mindwave supports two types of trace storage:

1. **Database Storage** - Store traces in your application database (MySQL, PostgreSQL, etc.)
2. **OTLP Export** - Send traces to any OTLP-compatible observability platform

You can use both simultaneously for maximum flexibility.

## Supported Backends

### Database (Eloquent)

Store traces directly in your application database for local querying.

**Pros:**

-   No external dependencies
-   Fast local queries with Eloquent
-   Complete control over data
-   Cost-effective

**Cons:**

-   Limited to single application
-   No distributed tracing
-   Database growth over time

**Setup:**

```bash
# Publish and run migrations
php artisan vendor:publish --tag=mindwave-migrations
php artisan migrate
```

**Configuration:**

```dotenv
MINDWAVE_TRACE_DATABASE=true
MINDWAVE_TRACE_DB_CONNECTION=mysql
```

**Query traces:**

```php
use Mindwave\Mindwave\Observability\Models\Trace;

$traces = Trace::with('spans')
    ->orderBy('created_at', 'desc')
    ->limit(10)
    ->get();
```

**Learn more:** [Querying Traces](/docs/observability/querying)

---

### Jaeger

Open-source distributed tracing platform originally developed by Uber.

**Pros:**

-   Open source and free
-   Excellent trace visualization
-   Service dependency graphs
-   Active community

**Cons:**

-   Requires infrastructure setup
-   Limited long-term storage
-   Basic querying capabilities

**Quick Start (Docker):**

```bash
docker run -d --name jaeger \
  -p 4317:4317 \
  -p 4318:4318 \
  -p 16686:16686 \
  jaegertracing/all-in-one:latest
```

**Configuration:**

```dotenv
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

**Access UI:**

Open http://localhost:16686

**Kubernetes Deployment:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
    name: jaeger
spec:
    replicas: 1
    selector:
        matchLabels:
            app: jaeger
    template:
        metadata:
            labels:
                app: jaeger
        spec:
            containers:
                - name: jaeger
                  image: jaegertracing/all-in-one:latest
                  ports:
                      - containerPort: 4318
                      - containerPort: 16686
```

---

### Grafana Tempo

High-scale, cost-effective distributed tracing backend from Grafana Labs.

**Pros:**

-   Extremely cost-effective (object storage)
-   Scales to petabytes
-   Integrates with Grafana dashboards
-   Multi-tenant support

**Cons:**

-   Limited querying (no full-text search)
-   Requires Grafana for visualization
-   TraceQL learning curve

**Docker Compose:**

```yaml
version: '3'
services:
    tempo:
        image: grafana/tempo:latest
        command: ['-config.file=/etc/tempo.yaml']
        volumes:
            - ./tempo.yaml:/etc/tempo.yaml
            - ./tempo-data:/tmp/tempo
        ports:
            - '3200:3200'
            - '4317:4317'
            - '4318:4318'

    grafana:
        image: grafana/grafana:latest
        volumes:
            - ./grafana-datasources.yaml:/etc/grafana/provisioning/datasources/datasources.yaml
        ports:
            - '3000:3000'
```

**Tempo Configuration (tempo.yaml):**

```yaml
server:
    http_listen_port: 3200

distributor:
    receivers:
        otlp:
            protocols:
                http:
                grpc:

storage:
    trace:
        backend: local
        local:
            path: /tmp/tempo/blocks
```

**Mindwave Configuration:**

```dotenv
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

**Multi-Tenant:**

```dotenv
OTEL_EXPORTER_OTLP_HEADERS=X-Scope-OrgID=tenant-1
```

---

### Honeycomb

Modern observability platform designed for high-cardinality data and powerful querying.

**Pros:**

-   Best-in-class query interface
-   Excellent for debugging
-   Great visualizations
-   Generous free tier

**Cons:**

-   Cost can scale with usage
-   Proprietary platform
-   Requires account signup

**Setup:**

1. Sign up at https://honeycomb.io
2. Get your API key
3. Create a dataset

**Configuration:**

```dotenv
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io:443
OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=YOUR_API_KEY,x-honeycomb-dataset=mindwave
```

**Environment-Specific Datasets:**

```dotenv
# Development
HONEYCOMB_DATASET=mindwave-dev

# Production
HONEYCOMB_DATASET=mindwave-production
```

**Query Examples:**

```
# Find expensive operations
AVG(gen_ai.usage.total_tokens) > 1000

# Monitor error rate
COUNT WHERE otel.status_code = "ERROR"
```

---

### Datadog

Full-stack monitoring and analytics platform.

**Pros:**

-   Complete observability suite
-   APM, logs, metrics in one place
-   Strong alerting and dashboards
-   Enterprise support

**Cons:**

-   Expensive at scale
-   Complex pricing model
-   Learning curve

**Via Datadog Agent:**

Install and configure the Datadog Agent with OTLP support:

```yaml
# datadog.yaml
otlp_config:
    receiver:
        protocols:
            http:
                endpoint: 0.0.0.0:4318
            grpc:
                endpoint: 0.0.0.0:4317
```

**Mindwave Configuration:**

```dotenv
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

**Via OpenTelemetry Collector:**

```yaml
# otel-collector.yaml
exporters:
    datadog:
        api:
            key: ${DD_API_KEY}
            site: datadoghq.com

service:
    pipelines:
        traces:
            receivers: [otlp]
            exporters: [datadog]
```

---

### New Relic

Application performance monitoring with distributed tracing.

**Pros:**

-   Comprehensive APM features
-   Business analytics integration
-   Good documentation
-   AI-powered insights

**Cons:**

-   Expensive
-   Complex UI
-   Vendor lock-in

**Configuration:**

```dotenv
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.nr-data.net:4318
OTEL_EXPORTER_OTLP_HEADERS=api-key=YOUR_LICENSE_KEY
```

**EU Region:**

```dotenv
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.eu01.nr-data.net:4318
```

---

### OpenTelemetry Collector

Vendor-agnostic telemetry pipeline that receives, processes, and exports traces.

**Pros:**

-   Centralized configuration
-   Advanced processing
-   Multi-backend export
-   Buffering and retry logic

**Cons:**

-   Additional infrastructure
-   Configuration complexity
-   Operational overhead

**Basic Configuration:**

```yaml
# otel-collector.yaml
receivers:
    otlp:
        protocols:
            http:
                endpoint: 0.0.0.0:4318
            grpc:
                endpoint: 0.0.0.0:4317

processors:
    batch:
        timeout: 10s
    memory_limiter:
        check_interval: 1s
        limit_mib: 512

exporters:
    otlp/jaeger:
        endpoint: jaeger:4317
        tls:
            insecure: true
    otlp/tempo:
        endpoint: tempo:4317
        tls:
            insecure: true

service:
    pipelines:
        traces:
            receivers: [otlp]
            processors: [memory_limiter, batch]
            exporters: [otlp/jaeger, otlp/tempo]
```

**Docker:**

```bash
docker run -d --name otel-collector \
  -p 4317:4317 \
  -p 4318:4318 \
  -v $(pwd)/otel-collector.yaml:/etc/otel-collector.yaml \
  otel/opentelemetry-collector:latest \
  --config=/etc/otel-collector.yaml
```

**Mindwave Configuration:**

```dotenv
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
```

**Learn more:** [OTLP & Exporters](/docs/observability/otlp)

---

## Comparison Matrix

| Feature              | Database | Jaeger | Tempo  | Honeycomb | Datadog | New Relic |
| -------------------- | -------- | ------ | ------ | --------- | ------- | --------- |
| **Cost**             | Free     | Free   | Low    | Medium    | High    | High      |
| **Setup Complexity** | Easy     | Medium | Medium | Easy      | Medium  | Easy      |
| **Scalability**      | Limited  | Medium | High   | High      | High    | High      |
| **Query Power**      | High     | Medium | Low    | High      | High    | High      |
| **Visualization**    | None     | Good   | Good   | Excellent | Good    | Good      |
| **Multi-Service**    | No       | Yes    | Yes    | Yes       | Yes     | Yes       |
| **Self-Hosted**      | Yes      | Yes    | Yes    | No        | No      | No        |

## Choosing a Backend

### For Startups

**Recommended:** Database + Honeycomb

-   Database for local development
-   Honeycomb free tier for production
-   Easy to get started
-   Scale as you grow

### For Small Teams

**Recommended:** Jaeger + Database

-   Self-hosted, no ongoing costs
-   Good visualization
-   Database for custom queries
-   Full control over data

### For Medium Companies

**Recommended:** Grafana Tempo + Grafana

-   Cost-effective at scale
-   Integrates with existing Grafana
-   Object storage keeps costs low
-   Open source ecosystem

### For Enterprises

**Recommended:** Datadog or New Relic

-   Full observability suite
-   Enterprise support
-   Advanced analytics
-   Compliance features

## Multi-Backend Setup

Use multiple backends simultaneously for different purposes:

```dotenv
# Local queries
MINDWAVE_TRACE_DATABASE=true

# Production monitoring
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
```

**Benefits:**

-   Database for fast local debugging
-   OTLP for distributed production tracing
-   Redundancy and backup
-   Flexibility during migrations

## Best Practices

### 1. Start Simple

Begin with database storage, add OTLP later:

```dotenv
# Week 1: Database only
MINDWAVE_TRACE_DATABASE=true

# Week 4: Add Jaeger
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318
```

### 2. Use OpenTelemetry Collector in Production

The collector provides:

-   Centralized configuration
-   Buffering and retry
-   Multi-backend export
-   Advanced filtering

### 3. Match Backend to Use Case

-   **Debugging:** Honeycomb or Jaeger
-   **Cost Optimization:** Tempo
-   **Compliance:** Datadog or New Relic
-   **Open Source:** Jaeger or Tempo

### 4. Plan for Data Retention

Configure retention based on backend:

-   **Database:** Prune regularly
-   **Jaeger:** Limited storage
-   **Tempo:** Long-term object storage
-   **Honeycomb:** Configure per dataset

### 5. Monitor Your Monitoring

Track collector health:

```yaml
extensions:
    health_check:
        endpoint: 0.0.0.0:13133
    zpages:
        endpoint: 0.0.0.0:55679
```

## Troubleshooting

### Connection Issues

**Test endpoint:**

```bash
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/x-protobuf" \
  -d ''
```

**Check logs:**

```bash
tail -f storage/logs/laravel.log | grep -i otlp
```

### Backend Not Receiving Traces

1. Verify endpoint configuration
2. Check firewall rules
3. Validate authentication headers
4. Review backend logs

### High Memory Usage

Use sampling to reduce volume:

```dotenv
MINDWAVE_TRACE_SAMPLER=traceidratio
MINDWAVE_TRACE_SAMPLE_RATIO=0.1
```

## Related Documentation

-   [Observability Overview](/docs/observability/overview) - Introduction
-   [Configuration](/docs/observability/configuration) - Complete configuration reference
-   [OTLP & Exporters](/docs/observability/otlp) - Detailed OTLP setup
-   [Querying](/docs/observability/querying) - Query traces in different backends
