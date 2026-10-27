
-- GatewayX: Idempotency records for client requests

CREATE TABLE idempotency_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    client_id UUID NOT NULL
        REFERENCES clients(id)
        ON DELETE CASCADE,

    idempotency_key VARCHAR(255) NOT NULL,

    request_fingerprint CHAR(64) NOT NULL,

    response_status INTEGER,
    response_body JSONB,

    status VARCHAR(20) NOT NULL DEFAULT 'PROCESSING'
        CHECK (status IN ('PROCESSING', 'COMPLETED')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    expires_at TIMESTAMPTZ NOT NULL
        DEFAULT (NOW() + INTERVAL '24 hours'),

    CONSTRAINT uq_idempotency_client_key
        UNIQUE (client_id, idempotency_key),

    CONSTRAINT chk_idempotency_response_status
        CHECK (
            response_status IS NULL
            OR response_status BETWEEN 100 AND 599
        )
);

CREATE INDEX idx_idempotency_records_expires_at
    ON idempotency_records(expires_at);

CREATE INDEX idx_idempotency_records_client_id
    ON idempotency_records(client_id);
