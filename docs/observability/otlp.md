# OTLP & Exporters

Mindwave's OpenTelemetry Protocol (OTLP) exporters enable you to send trace data to a wide variety of observability backends, including Jaeger, Grafana Tempo, Honeycomb, Datadog, and any other OTLP-compatible platform. This vendor-neutral approach gives you the flexibility to switch backends without changing your application code.

## Overview

### What is OTLP?

OTLP (OpenTelemetry Protocol) is the standard protocol for transmitting telemetry data (traces, metrics, logs) in the OpenTelemetry ecosystem. It provides:

-   **Vendor Neutrality** - Switch between observability backends without code changes
-   **Protocol Flexibility** - Supports both HTTP/Protobuf and gRPC transports
-   **Wide Compatibility** - Works with major observability platforms
-   **Future-Proof** - Industry-standard protocol with long-term support

### Why Use OTLP?

**Avoid Vendor Lock-in**
Switch from Jaeger to Honeycomb to Datadog simply by changing configuration—no code changes required.

**Unified Data Model**
All backends receive the same rich trace data following OpenTelemetry semantic conventions.

**Multi-Backend Support**
Send traces to multiple destinations simultaneously for redundancy, testing, or multi-region deployments.

**Production-Ready**
Battle-tested protocol used by organizations worldwide for mission-critical observability.

### Supported Exporters

Mindwave provides built-in support for:

-   **Jaeger** - Open-source distributed tracing platform
-   **Grafana Tempo** - High-scale distributed tracing backend
-   **Honeycomb** - Modern observability platform
-   **Datadog** - Full-stack monitoring and analytics
-   **New Relic** - Application performance monitoring
-   **OpenTelemetry Collector** - Vendor-agnostic telemetry pipeline
-   **Any OTLP-compatible backend** - Standard protocol support

## Quick Start

### Basic Configuration

Enable OTLP export in your `.env` file:

```dotenv
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

### Configuration File

Configure OTLP in `config/mindwave-tracing.php`:

```php
return [
    'otlp' => [
        'enabled' => env('MINDWAVE_TRACE_OTLP_ENABLED', false),
        'endpoint' => env('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://localhost:4318'),
        'protocol' => env('OTEL_EXPORTER_OTLP_PROTOCOL', 'http/protobuf'),
        'headers' => [],
        'timeout_ms' => 10000,
    ],
];
```

## Supported Backends

### Jaeger

Jaeger is a popular open-source distributed tracing platform originally developed by Uber.

#### Local Setup with Docker

1. **Start Jaeger with OTLP support:**

```bash
docker run -d --name jaeger \
  -p 4317:4317 \
  -p 4318:4318 \
  -p 16686:16686 \
  jaegertracing/all-in-one:latest
```

**Ports:**

-   `4317` - OTLP gRPC receiver
-   `4318` - OTLP HTTP receiver
-   `16686` - Jaeger UI

2. **Configure Mindwave:**

```dotenv
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

3. **View traces:**

Open http://localhost:16686 in your browser and select your service from the dropdown.

#### Kubernetes Setup

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
                        name: otlp-http
                      - containerPort: 4317
                        name: otlp-grpc
                      - containerPort: 16686
                        name: ui
---
apiVersion: v1
kind: Service
metadata:
    name: jaeger
spec:
    selector:
        app: jaeger
    ports:
        - name: otlp-http
          port: 4318
        - name: otlp-grpc
          port: 4317
        - name: ui
          port: 16686
          nodePort: 30686
    type: NodePort
```

Configure your Laravel app:

```dotenv
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318
```

#### Cloud-Hosted Jaeger

For production deployments, consider managed Jaeger services:

-   **Jaeger Operator** (Kubernetes) - Automated Jaeger deployments
-   **Grafana Cloud** - Includes hosted Jaeger
-   **AWS X-Ray** - Compatible via OpenTelemetry Collector

#### Jaeger UI Overview

**Service Map**
Visualize service dependencies and request flow.

**Trace Search**
Query traces by service, operation, tags, duration, and time range.

**Trace Timeline**
See detailed span timing with parent-child relationships.

**Dependencies Graph**
Understand system architecture and bottlenecks.

### Grafana Tempo

Grafana Tempo is a high-scale, cost-effective distributed tracing backend.

#### Local Setup

1. **Create `tempo.yaml`:**

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

compactor:
    compaction:
        block_retention: 48h
```

2. **Start Tempo:**

```bash
docker run -d --name tempo \
  -p 3200:3200 \
  -p 4317:4317 \
  -p 4318:4318 \
  -v $(pwd)/tempo.yaml:/etc/tempo.yaml \
  grafana/tempo:latest \
  -config.file=/etc/tempo.yaml
```

3. **Configure Mindwave:**

```dotenv
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

#### Multi-Tenant Setup

Tempo supports multi-tenancy via the `X-Scope-OrgID` header:

```dotenv
OTEL_EXPORTER_OTLP_HEADERS=X-Scope-OrgID=tenant-1
```

Or in config:

```php
'otlp' => [
    'enabled' => true,
    'endpoint' => 'http://tempo:4318',
    'headers' => [
        'X-Scope-OrgID' => env('TEMPO_TENANT_ID', 'default'),
    ],
],
```

#### Grafana Integration

1. **Add Tempo as a data source in Grafana:**

```yaml
apiVersion: 1
datasources:
    - name: Tempo
      type: tempo
      access: proxy
      url: http://tempo:3200
```

2. **Query traces in Grafana:**
    - Use TraceQL to search traces
    - Correlate with metrics and logs
    - Build dashboards with trace metrics

#### Cloud Setup

**Grafana Cloud Tempo:**

```dotenv
OTEL_EXPORTER_OTLP_ENDPOINT=https://tempo-prod-us-central-0.grafana.net:443
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic <base64-encoded-credentials>
```

### Honeycomb

Honeycomb is a modern observability platform designed for high-cardinality data.

#### Account Setup

1. Sign up at https://honeycomb.io
2. Create a team and get your API key
3. Create a dataset (e.g., "mindwave-production")

#### Configuration

```dotenv
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io:443
OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=YOUR_API_KEY,x-honeycomb-dataset=mindwave-production
```

Or in config file:

```php
'otlp' => [
    'enabled' => true,
    'endpoint' => 'https://api.honeycomb.io:443',
    'protocol' => 'http/protobuf',
    'headers' => [
        'x-honeycomb-team' => env('HONEYCOMB_API_KEY'),
        'x-honeycomb-dataset' => env('HONEYCOMB_DATASET', 'mindwave'),
    ],
],
```

#### Environment-Specific Datasets

**Development:**

```dotenv
HONEYCOMB_DATASET=mindwave-dev
```

**Staging:**

```dotenv
HONEYCOMB_DATASET=mindwave-staging
```

**Production:**

```dotenv
HONEYCOMB_DATASET=mindwave-production
```

#### Query Examples

**Find expensive LLM calls:**

```
AVG(gen_ai.usage.total_tokens) > 1000
```

**Identify slow operations:**

```
duration_ms > 5000
```

**Track specific models:**

```
gen_ai.request.model = "gpt-4"
```

**Monitor error rates:**

```
COUNT WHERE otel.status_code = "ERROR"
```

#### Best Practices

-   Use separate datasets for environments
-   Set up Service Level Objectives (SLOs)
-   Create dashboards for key metrics
-   Configure alerts for anomalies
-   Use BubbleUp for root cause analysis

### Datadog

Datadog provides full-stack observability with APM, logs, and infrastructure monitoring.

#### Via Datadog Agent (Recommended)

The Datadog Agent can receive OTLP data and forward it to Datadog.

1. **Configure Datadog Agent (`datadog.yaml`):**

```yaml
otlp_config:
    receiver:
        protocols:
            http:
                endpoint: 0.0.0.0:4318
            grpc:
                endpoint: 0.0.0.0:4317
```

2. **Restart Datadog Agent:**

```bash
sudo systemctl restart datadog-agent
```

3. **Configure Mindwave:**

```dotenv
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

#### Via OpenTelemetry Collector

For more advanced pipelines, use the OpenTelemetry Collector:

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

exporters:
    datadog:
        api:
            key: ${DD_API_KEY}
            site: datadoghq.com

service:
    pipelines:
        traces:
            receivers: [otlp]
            processors: [batch]
            exporters: [datadog]
```

#### Kubernetes with Datadog Operator

```yaml
apiVersion: datadoghq.com/v2alpha1
kind: DatadogAgent
metadata:
    name: datadog
spec:
    global:
        credentials:
            apiKey: <your-api-key>
    features:
        otlp:
            receiver:
                protocols:
                    http:
                        enabled: true
                        endpoint: 0.0.0.0:4318
```

### New Relic

New Relic supports OTLP ingestion for distributed tracing.

#### Configuration

```dotenv
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.nr-data.net:4318
OTEL_EXPORTER_OTLP_HEADERS=api-key=YOUR_NEW_RELIC_LICENSE_KEY
```

Or in config:

```php
'otlp' => [
    'enabled' => true,
    'endpoint' => 'https://otlp.nr-data.net:4318',
    'protocol' => 'http/protobuf',
    'headers' => [
        'api-key' => env('NEW_RELIC_LICENSE_KEY'),
    ],
],
```

#### EU Region

For EU data centers:

```dotenv
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.eu01.nr-data.net:4318
```

### OpenTelemetry Collector

The OpenTelemetry Collector is a vendor-agnostic telemetry pipeline that can receive, process, and export telemetry data to multiple backends.

#### Why Use the Collector?

-   **Centralized Configuration** - Manage exporters in one place
-   **Advanced Processing** - Filter, sample, and transform spans
-   **Multi-Backend Export** - Send to multiple platforms simultaneously
-   **Buffering & Retry** - Handle backend outages gracefully
-   **Reduced Application Complexity** - Offload export logic

#### Basic Setup

1. **Create `otel-collector.yaml`:**

```yaml
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
        send_batch_size: 1024

    memory_limiter:
        check_interval: 1s
        limit_mib: 512

    resource:
        attributes:
            - key: deployment.environment
              value: ${env:ENVIRONMENT}
              action: upsert

exporters:
    otlp/jaeger:
        endpoint: jaeger:4317
        tls:
            insecure: true

    otlp/tempo:
        endpoint: tempo:4317
        tls:
            insecure: true

    logging:
        loglevel: info

service:
    pipelines:
        traces:
            receivers: [otlp]
            processors: [memory_limiter, batch, resource]
            exporters: [otlp/jaeger, otlp/tempo, logging]
```

2. **Run the collector:**

```bash
docker run -d --name otel-collector \
  -p 4317:4317 \
  -p 4318:4318 \
  -v $(pwd)/otel-collector.yaml:/etc/otel-collector.yaml \
  -e ENVIRONMENT=production \
  otel/opentelemetry-collector:latest \
  --config=/etc/otel-collector.yaml
```

3. **Configure Mindwave:**

```dotenv
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
```

#### Advanced Pipeline

```yaml
receivers:
    otlp:
        protocols:
            http:
            grpc:

processors:
    # Batch spans for efficient export
    batch:
        timeout: 10s
        send_batch_size: 1024

    # Prevent memory overload
    memory_limiter:
        check_interval: 1s
        limit_mib: 512

    # Add additional attributes
    resource:
        attributes:
            - key: environment
              value: production
              action: upsert

    # Sample high-volume traces
    probabilistic_sampler:
        sampling_percentage: 10

    # Filter out health checks
    filter:
        spans:
            exclude:
                match_type: regexp
                span_names:
                    - '^/health.*'

exporters:
    # Production backend
    otlp/production:
        endpoint: tempo-prod:4317
        tls:
            cert_file: /certs/cert.pem
            key_file: /certs/key.pem

    # Backup backend
    otlp/backup:
        endpoint: jaeger-backup:4317

    # Cloud observability
    otlp/honeycomb:
        endpoint: api.honeycomb.io:443
        headers:
            x-honeycomb-team: ${env:HONEYCOMB_API_KEY}

    # Local debugging
    logging:
        loglevel: debug

service:
    pipelines:
        traces:
            receivers: [otlp]
            processors: [memory_limiter, filter, batch, resource]
            exporters: [otlp/production, otlp/backup, otlp/honeycomb]

        # Debug pipeline (full sampling)
        traces/debug:
            receivers: [otlp]
            processors: [memory_limiter, batch]
            exporters: [logging]
```

#### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
    name: otel-collector
spec:
    replicas: 2
    selector:
        matchLabels:
            app: otel-collector
    template:
        metadata:
            labels:
                app: otel-collector
        spec:
            containers:
                - name: otel-collector
                  image: otel/opentelemetry-collector:latest
                  args:
                      - --config=/conf/otel-collector.yaml
                  ports:
                      - containerPort: 4317
                        name: otlp-grpc
                      - containerPort: 4318
                        name: otlp-http
                  volumeMounts:
                      - name: config
                        mountPath: /conf
                  resources:
                      limits:
                          memory: 512Mi
                          cpu: 500m
                      requests:
                          memory: 256Mi
                          cpu: 100m
            volumes:
                - name: config
                  configMap:
                      name: otel-collector-config
---
apiVersion: v1
kind: Service
metadata:
    name: otel-collector
spec:
    selector:
        app: otel-collector
    ports:
        - name: otlp-grpc
          port: 4317
        - name: otlp-http
          port: 4318
```

## Exporter Types

### HTTP/Protobuf (Recommended)

The HTTP/Protobuf transport is the most widely supported OTLP transport.

**Configuration:**

```php
'otlp' => [
    'protocol' => 'http/protobuf',
    'endpoint' => 'http://localhost:4318',
],
```

**Advantages:**

-   Works everywhere (no special extensions needed)
-   Firewall-friendly (standard HTTP/HTTPS)
-   Easy to debug with HTTP tools
-   Better compatibility with proxies and load balancers

**Endpoint Format:**

The endpoint should NOT include the path—Mindwave automatically appends `/v1/traces`:

```
http://localhost:4318  → http://localhost:4318/v1/traces
```

### gRPC

gRPC provides better performance and streaming capabilities.

**Requirements:**

Install the gRPC PHP extension:

```bash
pecl install grpc
```

Enable in `php.ini`:

```ini
extension=grpc.so
```

**Configuration:**

```php
'otlp' => [
    'protocol' => 'grpc',
    'endpoint' => 'localhost:4317',
],
```

**Advantages:**

-   Better performance (binary protocol)
-   Lower latency
-   Bi-directional streaming
-   Built-in flow control

**Trade-offs:**

-   Requires gRPC extension
-   More complex troubleshooting
-   May have firewall issues

### Console Exporter (Development)

For local development and debugging, log spans to the console.

**Usage:**

```php
use OpenTelemetry\SDK\Trace\SpanExporter\ConsoleSpanExporter;

// In a service provider or bootstrap file
$exporter = new ConsoleSpanExporter();
```

This is not configured via OTLP—use the MultiExporter to combine console output with other exporters.

### File Exporter (Testing)

Export spans to a file for testing and CI/CD pipelines.

**Usage:**

```php
use OpenTelemetry\SDK\Trace\SpanExporter\InMemoryExporter;

$exporter = new InMemoryExporter();

// After test execution
$spans = $exporter->getSpans();
file_put_contents('traces.json', json_encode($spans));
```

## Security

### TLS Configuration

For production deployments, always use TLS to encrypt trace data.

**HTTPS Endpoint:**

```dotenv
OTEL_EXPORTER_OTLP_ENDPOINT=https://secure-backend:4318
```

**gRPC with TLS:**

The OpenTelemetry PHP SDK automatically uses TLS for `https://` endpoints.

**Custom Certificates:**

For self-signed certificates or custom CAs, configure the gRPC extension:

```php
// Not directly supported in Mindwave config
// Use OpenTelemetry Collector as a proxy for complex TLS scenarios
```

### Authentication

Most observability platforms require authentication via API keys or tokens.

#### API Key in Headers

```dotenv
OTEL_EXPORTER_OTLP_HEADERS=x-api-key=your-secret-api-key
```

**Config file:**

```php
'otlp' => [
    'headers' => [
        'x-api-key' => env('OTLP_API_KEY'),
    ],
],
```

#### Bearer Token Authentication

```dotenv
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer your-jwt-token
```

#### Basic Authentication

For basic auth, encode credentials:

```bash
echo -n "username:password" | base64
# Output: dXNlcm5hbWU6cGFzc3dvcmQ=
```

```dotenv
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic dXNlcm5hbWU6cGFzc3dvcmQ=
```

#### Multiple Headers

Separate multiple headers with commas:

```dotenv
OTEL_EXPORTER_OTLP_HEADERS=x-api-key=secret,x-tenant-id=acme,x-region=us-west
```

### Network Security

**Private Networking**

Deploy exporters in private networks accessible only to your application:

```dotenv
# Internal VPC endpoint
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector.internal:4318
```

**Firewall Rules**

Restrict access to OTLP receivers:

```bash
# Allow only application servers
iptables -A INPUT -p tcp --dport 4318 -s 10.0.1.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 4318 -j DROP
```

**VPN or VPC Peering**

For cloud deployments, use VPN or VPC peering to keep trace data within your network.

### Data Privacy

**Sensitive Data Redaction**

By default, Mindwave does NOT capture message content:

```php
'capture_messages' => env('MINDWAVE_TRACE_CAPTURE_MESSAGES', false),
```

**PII Redaction:**

Configure attributes to redact:

```php
'pii_redact' => [
    'gen_ai.input.messages',
    'gen_ai.output.messages',
    'gen_ai.system_instructions',
    'gen_ai.tool.call.arguments',
    'gen_ai.tool.call.result',
],
```

**Data Retention Policies**

Set retention limits in your observability backend:

-   Jaeger: Configure storage settings
-   Tempo: Set `block_retention` in config
-   Honeycomb: Configure in dataset settings
-   Datadog: Use retention filters

### Secure Configuration

**Never commit secrets to version control:**

```dotenv
# .env (not committed)
HONEYCOMB_API_KEY=your-secret-key
NEW_RELIC_LICENSE_KEY=your-license-key
```

**Use secret management:**

```php
'otlp' => [
    'headers' => [
        'x-api-key' => env('OTLP_API_KEY') ?: app('secret-manager')->get('otlp-api-key'),
    ],
],
```

## Performance Tuning

### Batch Configuration

Control how spans are batched before export:

```php
'batch' => [
    'max_queue_size' => 2048,          // Buffer up to 2048 spans
    'scheduled_delay_ms' => 5000,      // Export every 5 seconds
    'export_timeout_ms' => 512,        // 512ms timeout per export
    'max_export_batch_size' => 256,    // Max 256 spans per batch
],
```

**Recommendations:**

| Environment | Queue Size | Delay (ms) | Batch Size |
| ----------- | ---------- | ---------- | ---------- |
| Development | 256        | 1000       | 64         |
| Staging     | 1024       | 3000       | 128        |
| Production  | 2048       | 5000       | 256        |
| High-Volume | 4096       | 10000      | 512        |

### Export Timeouts

Set appropriate timeouts based on network latency:

```php
'otlp' => [
    'timeout_ms' => 10000,  // 10 second timeout
],
```

**Guidelines:**

-   **Local (Docker):** 1000-5000ms
-   **Same Region:** 5000-10000ms
-   **Cross-Region:** 10000-30000ms
-   **Satellite/High Latency:** 30000ms+

### Sampling

Reduce trace volume with sampling:

```php
'sampler' => [
    'type' => 'traceidratio',
    'ratio' => 0.1,  // Sample 10% of traces
],
```

**Sampling Strategies:**

| Strategy     | Ratio | Use Case                  |
| ------------ | ----- | ------------------------- |
| always_on    | 1.0   | Development, staging      |
| traceidratio | 0.5   | Medium traffic production |
| traceidratio | 0.1   | High traffic production   |
| traceidratio | 0.01  | Very high traffic         |
| always_off   | 0.0   | Disable tracing           |

**Head-Based vs. Tail-Based:**

Mindwave uses head-based sampling (decision made at trace start). For tail-based sampling (sample after seeing the trace), use the OpenTelemetry Collector.

### Resource Limits

**Memory Limits:**

Configure the batch processor queue size to prevent memory exhaustion:

```php
'batch' => [
    'max_queue_size' => 2048,  // ~8MB for 4KB average span
],
```

**CPU Optimization:**

-   Use gRPC for better CPU efficiency
-   Increase batch delay to reduce export frequency
-   Sample traces in high-throughput scenarios

**Network Bandwidth:**

Monitor bandwidth usage:

```bash
# Average span size: 4-8 KB
# 1000 spans/second × 6 KB = 6 MB/second = 48 Mbps
```

Optimize:

-   Disable message capture in production
-   Use sampling to reduce volume
-   Use local OpenTelemetry Collector for buffering

### Monitoring Export Performance

Track exporter metrics:

```php
// In your application monitoring
Log::info('OTLP export stats', [
    'queue_size' => $tracer->getQueueSize(),
    'export_count' => $tracer->getExportCount(),
    'failed_exports' => $tracer->getFailedExports(),
]);
```

## Multiple Exporters

Send traces to multiple backends simultaneously for redundancy, multi-region support, or A/B testing.

### Configuration

Mindwave automatically uses multiple exporters when both database and OTLP are enabled:

```dotenv
# Database export (local queries)
MINDWAVE_TRACE_DATABASE=true

# OTLP export (distributed tracing)
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318
```

### Custom Multi-Exporter Setup

For advanced scenarios, create a custom configuration:

```php
use Mindwave\Mindwave\Observability\Tracing\Exporters\OtlpExporterFactory;
use Mindwave\Mindwave\Observability\Tracing\Exporters\MultiExporter;
use Mindwave\Mindwave\Observability\Tracing\Exporters\DatabaseSpanExporter;

$factory = new OtlpExporterFactory(logger());

$exporters = [
    // Primary backend
    $factory->createHttpExporter(
        endpoint: 'http://tempo-primary:4318',
        headers: ['X-Scope-OrgID' => 'production']
    ),

    // Backup backend
    $factory->createHttpExporter(
        endpoint: 'http://tempo-backup:4318',
        headers: ['X-Scope-OrgID' => 'production']
    ),

    // Cloud observability
    $factory->createHttpExporter(
        endpoint: 'https://api.honeycomb.io:443',
        headers: ['x-honeycomb-team' => env('HONEYCOMB_API_KEY')]
    ),

    // Local database
    new DatabaseSpanExporter(),
];

$multiExporter = new MultiExporter(
    exporters: $exporters,
    logger: logger(),
    failOnAllErrors: false  // Continue even if some backends fail
);
```

### Use Cases

**Primary + Backup:**
Send to both production and backup backends for high availability.

**Dev + Staging + Prod:**
Export to environment-specific backends based on configuration.

**Multi-Region:**
Send to regional observability platforms for compliance or latency.

**Migration:**
Run old and new backends in parallel during platform migrations.

**Cost Optimization:**
Send full traces to database, sampled traces to expensive cloud platform.

### Failure Handling

By default, export succeeds if ANY backend succeeds:

```php
$multiExporter = new MultiExporter(
    exporters: $exporters,
    failOnAllErrors: false  // Default: lenient mode
);
```

**Strict mode** (fails if all backends fail):

```php
$multiExporter = new MultiExporter(
    exporters: $exporters,
    failOnAllErrors: true
);
```

### Performance Considerations

Each exporter adds overhead:

-   **2 exporters:** ~2x export time
-   **3 exporters:** ~3x export time

Mitigate with:

-   Longer batch delays
-   Async export (built-in with BatchSpanProcessor)
-   Use OpenTelemetry Collector to fan-out

## Testing & Debugging

### Console Exporter

For local development, view spans in the console:

```php
use OpenTelemetry\SDK\Trace\SpanExporter\ConsoleSpanExporter;
use Mindwave\Mindwave\Observability\Tracing\Exporters\MultiExporter;

$exporters = [
    new ConsoleSpanExporter(),
    new DatabaseSpanExporter(),
];

$multiExporter = new MultiExporter($exporters);
```

Output:

```json
{
    "name": "chat gpt-4",
    "context": {
        "trace_id": "5b8aa5a2d2c872e8321cf37308d69df2",
        "span_id": "051581bf3cb55c13"
    },
    "kind": "CLIENT",
    "start": 1699564800000,
    "end": 1699564802000,
    "attributes": {
        "gen_ai.operation.name": "chat",
        "gen_ai.provider.name": "openai",
        "gen_ai.request.model": "gpt-4",
        "gen_ai.usage.input_tokens": 120,
        "gen_ai.usage.output_tokens": 85
    }
}
```

### Verifying Exports

**Check Jaeger:**

```bash
# List services
curl http://localhost:16686/api/services

# Get traces
curl http://localhost:16686/api/traces?service=mindwave-app&limit=10
```

**Check Tempo:**

```bash
# Query trace by ID
curl http://localhost:3200/api/traces/<trace-id>
```

**Check Honeycomb:**

Use the Honeycomb UI or API to verify trace ingestion.

### Troubleshooting Connection Issues

**Enable debug logging:**

```php
use Monolog\Logger;
use Monolog\Handler\StreamHandler;

$logger = new Logger('otlp');
$logger->pushHandler(new StreamHandler('php://stdout', Logger::DEBUG));

$factory = new OtlpExporterFactory($logger);
```

**Test connectivity:**

```bash
# HTTP
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/x-protobuf" \
  -d ''

# gRPC (requires grpcurl)
grpcurl -plaintext localhost:4317 list
```

**Common connection errors:**

| Error              | Cause                       | Solution                                                 |
| ------------------ | --------------------------- | -------------------------------------------------------- |
| Connection refused | Exporter not running        | Start Jaeger/Tempo/Collector                             |
| Timeout            | Network latency or firewall | Check firewall, increase timeout                         |
| Invalid endpoint   | Wrong URL                   | Verify endpoint format                                   |
| SSL/TLS error      | Certificate issue           | Use correct certificate or `http://` for testing         |
| 404 Not Found      | Missing path                | Ensure endpoint includes/excludes `/v1/traces` correctly |

### Force Flush for Testing

Immediately export spans without waiting for batch delay:

```php
use Mindwave\Mindwave\Facades\Trace;

// Generate some traces
$span = Trace::startSpan('test-operation');
$span->end();

// Force export
Trace::forceFlush();

// Now check your backend
```

### Integration Tests

Test OTLP export in CI/CD:

```php
use OpenTelemetry\SDK\Trace\SpanExporter\InMemoryExporter;

class OtlpExportTest extends TestCase
{
    public function test_exports_to_otlp()
    {
        $exporter = new InMemoryExporter();

        // Configure tracer with in-memory exporter
        $tracer = new TracerManager(exporters: [$exporter]);

        // Generate trace
        $span = $tracer->startSpan('test-span');
        $span->setAttribute('test.attribute', 'value');
        $span->end();

        // Force export
        $tracer->forceFlush();

        // Verify spans
        $spans = $exporter->getSpans();
        $this->assertCount(1, $spans);
        $this->assertEquals('test-span', $spans[0]->getName());
        $this->assertEquals('value', $spans[0]->getAttributes()->get('test.attribute'));
    }
}
```

## Production Deployment

### High-Availability Setup

**Redundant Collectors:**

Deploy multiple OpenTelemetry Collectors with load balancing:

```dotenv
# Use load balancer DNS
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector.internal:4318
```

**Backend Redundancy:**

```yaml
# OpenTelemetry Collector with multiple backends
exporters:
    otlp/primary:
        endpoint: tempo-primary:4317
        retry_on_failure:
            enabled: true
            max_elapsed_time: 300s

    otlp/secondary:
        endpoint: tempo-secondary:4317
        retry_on_failure:
            enabled: true
```

### Collector Deployment Patterns

**Sidecar Pattern:**

Deploy collector as a sidecar container in each pod:

```yaml
spec:
    containers:
        - name: app
          image: myapp:latest
          env:
              - name: OTEL_EXPORTER_OTLP_ENDPOINT
                value: http://localhost:4318

        - name: otel-collector
          image: otel/opentelemetry-collector:latest
          ports:
              - containerPort: 4318
```

**Gateway Pattern:**

Deploy centralized collector(s) as a cluster service:

```yaml
apiVersion: v1
kind: Service
metadata:
    name: otel-collector
spec:
    type: LoadBalancer
    selector:
        app: otel-collector
    ports:
        - port: 4318
```

**Agent Pattern:**

Deploy collector as a DaemonSet on each node:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
    name: otel-collector-agent
spec:
    selector:
        matchLabels:
            app: otel-collector-agent
    template:
        spec:
            hostNetwork: true
            containers:
                - name: otel-collector
                  image: otel/opentelemetry-collector:latest
```

### Monitoring the Monitoring System

Track collector health:

```yaml
# OpenTelemetry Collector metrics
extensions:
    health_check:
        endpoint: 0.0.0.0:13133

    zpages:
        endpoint: 0.0.0.0:55679

service:
    extensions: [health_check, zpages]
```

**Prometheus metrics:**

```yaml
exporters:
    prometheus:
        endpoint: 0.0.0.0:8888

service:
    pipelines:
        metrics:
            receivers: [otlp]
            exporters: [prometheus]
```

**Key metrics to monitor:**

-   `otelcol_receiver_accepted_spans` - Spans received
-   `otelcol_exporter_sent_spans` - Spans exported
-   `otelcol_exporter_send_failed_spans` - Export failures
-   `otelcol_processor_batch_batch_send_size` - Batch sizes
-   `otelcol_processor_queued_retry_queue_length` - Retry queue

### Backup and Failover

**File Export for Backup:**

```yaml
exporters:
    file:
        path: /backup/traces.json

    otlp/primary:
        endpoint: tempo:4317

service:
    pipelines:
        traces:
            receivers: [otlp]
            exporters: [otlp/primary, file]
```

**Automatic Failover:**

```yaml
exporters:
    otlp/primary:
        endpoint: tempo-primary:4317
        retry_on_failure:
            enabled: true
            initial_interval: 5s
            max_interval: 30s
            max_elapsed_time: 300s

    # If primary fails for 5 minutes, secondary takes over via routing processor
    otlp/secondary:
        endpoint: tempo-secondary:4317
```

### Scaling Considerations

**Horizontal Scaling:**

Scale OpenTelemetry Collectors horizontally:

```bash
kubectl scale deployment otel-collector --replicas=5
```

**Vertical Scaling:**

Increase collector resources:

```yaml
resources:
    limits:
        memory: 2Gi
        cpu: 1000m
    requests:
        memory: 1Gi
        cpu: 500m
```

**Partitioning:**

Route traces to different pipelines based on attributes:

```yaml
processors:
    routing:
        from_attribute: environment
        table:
            - value: production
              exporters: [otlp/production]
            - value: staging
              exporters: [otlp/staging]
```

## Best Practices

### Backend Selection Criteria

**For Startups/Small Teams:**

-   **Grafana Cloud** - Free tier, easy setup, integrated with metrics/logs
-   **Honeycomb** - Generous free tier, excellent UX for debugging

**For Medium-Sized Companies:**

-   **Grafana Tempo** (self-hosted) - Cost-effective, scales well
-   **Jaeger** - Open source, battle-tested, good ecosystem

**For Enterprises:**

-   **Datadog** - Full-stack observability, enterprise support
-   **New Relic** - APM integration, business analytics
-   **Dynatrace** - AI-powered insights, automatic instrumentation

**For Cost-Sensitive:**

-   **Grafana Tempo** (self-hosted) - Cheapest object storage costs
-   **OpenTelemetry Collector + S3** - Ultra-low cost archival

### When to Use Collector vs. Direct Export

**Use Direct Export When:**

-   Simple single-backend setup
-   Low traffic (<1000 traces/minute)
-   Tight latency requirements
-   Minimal infrastructure

**Use OpenTelemetry Collector When:**

-   Multiple backends
-   High traffic (sampling, buffering needed)
-   Advanced processing (filtering, transforming)
-   Decoupling application from backend
-   Cross-region deployments

### Security Hardening

**1. Use TLS Everywhere:**

```dotenv
OTEL_EXPORTER_OTLP_ENDPOINT=https://secure-backend:4318
```

**2. Rotate API Keys Regularly:**

```bash
# Use secret management
kubectl create secret generic otlp-secrets \
  --from-literal=api-key=new-rotated-key
```

**3. Network Segmentation:**

Deploy collectors in a separate network segment with restricted access.

**4. Principle of Least Privilege:**

Grant minimal permissions to service accounts:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
    name: otel-collector
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
    name: otel-collector
rules:
    - apiGroups: ['']
      resources: ['configmaps']
      verbs: ['get', 'list']
```

**5. Audit Logging:**

Enable audit logs for trace access:

```yaml
# Jaeger
--query.log-level=info
```

### Cost Optimization

**1. Smart Sampling:**

Sample based on trace characteristics:

```yaml
# OpenTelemetry Collector
processors:
    tail_sampling:
        policies:
            - name: errors
              type: status_code
              status_code: { status_codes: [ERROR] }
            - name: slow
              type: latency
              latency: { threshold_ms: 5000 }
            - name: random
              type: probabilistic
              probabilistic: { sampling_percentage: 10 }
```

**2. Retention Policies:**

Set aggressive retention for low-value traces:

```yaml
# Tempo
compactor:
    compaction:
        block_retention: 48h # Keep only 2 days
```

**3. Compress Exports:**

Use gzip compression (built-in with OTLP):

```yaml
exporters:
    otlp:
        endpoint: backend:4317
        compression: gzip # Reduces bandwidth by ~70%
```

**4. Use Cheaper Storage:**

For long-term retention, use object storage:

```yaml
# Tempo with S3
storage:
    trace:
        backend: s3
        s3:
            bucket: traces-archive
            storage_class: STANDARD_IA # Infrequent access
```

**5. Disable Message Capture:**

Reduce span size by 50-80%:

```dotenv
MINDWAVE_TRACE_CAPTURE_MESSAGES=false
```

### Development Workflow

**Local Development:**

```dotenv
# .env.local
MINDWAVE_TRACE_DATABASE=true
MINDWAVE_TRACE_OTLP_ENABLED=false
MINDWAVE_TRACE_SAMPLE_RATIO=1.0
MINDWAVE_CAPTURE_MESSAGES=true  # Debug with full context
```

**Staging:**

```dotenv
# .env.staging
MINDWAVE_TRACE_DATABASE=true
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger-staging:4318
MINDWAVE_TRACE_SAMPLE_RATIO=0.5
MINDWAVE_CAPTURE_MESSAGES=false
```

**Production:**

```dotenv
# .env.production
MINDWAVE_TRACE_DATABASE=false  # Use OTLP only
MINDWAVE_TRACE_OTLP_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
MINDWAVE_TRACE_SAMPLE_RATIO=0.1
MINDWAVE_CAPTURE_MESSAGES=false
```

### Observability Maturity Path

**Level 1: Getting Started**

-   Enable database export
-   View traces in database
-   No external dependencies

**Level 2: Local Observability**

-   Add Jaeger locally (Docker)
-   Visualize distributed traces
-   Debug production issues in staging

**Level 3: Production Ready**

-   Deploy OpenTelemetry Collector
-   Integrate with Grafana/Tempo
-   Set up sampling and retention
-   Monitor collector health

**Level 4: Advanced**

-   Multi-region deployments
-   Tail-based sampling
-   Cost optimization
-   SLO/SLI tracking
-   Correlation with metrics/logs

**Level 5: Enterprise**

-   AI-powered insights
-   Predictive alerting
-   Business metrics correlation
-   Compliance and audit trails
-   Chaos engineering integration

## Next Steps

-   **[Querying Traces](./querying)** - Query and analyze trace data
-   **[Cost Tracking](./cost-tracking)** - Monitor LLM costs with traces
