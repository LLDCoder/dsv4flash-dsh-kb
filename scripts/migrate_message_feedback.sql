\set ON_ERROR_STOP on

SELECT :'target_portal' = 'admin' AS target_is_admin,
       current_database() = :'expected_database' AS database_matches,
       inet_server_addr() IS NULL OR inet_server_addr() = inet '127.0.0.1' AS server_is_local
\gset

\if :target_is_admin
\else
  \echo 'Refusing migration: target_portal must be admin.'
  \quit 3
\endif

\if :database_matches
\else
  \echo 'Refusing migration: connected database does not match expected_database.'
  \quit 3
\endif

\if :server_is_local
\else
  \echo 'Refusing migration: server must be reached through a local socket or loopback.'
  \quit 3
\endif

BEGIN;

CREATE TABLE IF NOT EXISTS message_feedback (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL,
  user_id VARCHAR(128) NOT NULL,
  conversation_id VARCHAR(64) NOT NULL,
  assistant_event_seq INTEGER NOT NULL,
  rating VARCHAR(8) NOT NULL CHECK (rating IN ('up', 'down')),
  reason VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_message_feedback_owner_response
    UNIQUE (conversation_id, assistant_event_seq, tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS ix_message_feedback_conversation_id
  ON message_feedback (conversation_id);
CREATE INDEX IF NOT EXISTS ix_message_feedback_owner
  ON message_feedback (tenant_id, user_id, created_at);

ALTER TABLE message_feedback
  ADD COLUMN IF NOT EXISTS reason VARCHAR(64);

COMMIT;
