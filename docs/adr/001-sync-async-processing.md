# ADR-001: Separate Synchronous and Asynchronous Processing

## Status

Accepted

## Context

GatewayX is an educational fintech-oriented API gateway and usage analytics platform. Requests must be handled efficiently while logging, analytics, alerts, and AI-generated insights may require additional processing time.

Making clients wait for all these operations would increase response latency and couple request availability to background processing.

## Decision

GatewayX will separate request handling into synchronous and asynchronous paths.

The synchronous path will authenticate and authorize requests, apply idempotency and rate-limiting controls, route requests to registered services, and return their responses.

The asynchronous path will publish events to BullMQ for background processing. Workers will persist events in PostgreSQL and support analytics, alert evaluation, and mock-LLM insights.

Queue publishing will not wait for background-job completion. Queue failures will be logged and measured without automatically failing an otherwise successful request.

## Alternatives Considered

1. Perform all logging, analytics, and alert processing inside the request path.
2. Perform all event processing through synchronous database writes.
3. Separate request handling from background processing using a queue and worker.

Option 3 was selected because it reduces coupling between request latency and background processing.

## Consequences

* API responses are not delayed by background-job completion.
* Background workers can process events independently of the API process.
* Queue and worker failures require explicit handling and monitoring.
* Events may be lost if publishing fails or the gateway crashes before an event is accepted by the queue.
* The initial implementation does not guarantee exactly-once event delivery.
* A transactional outbox is documented as future work.

## Scope and Limitations

GatewayX is an educational, single-node project using simulated financial services. This decision does not establish production-grade availability or guarantee delivery of every event.
