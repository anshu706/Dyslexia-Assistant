# ADR 003 — Database Choice: PostgreSQL with In-Memory Development Fallback

**Status:** Accepted  
**Date:** 2026-11-13  
**Authors:** Senior Full-Stack & DevOps Engineering Team

---

## Context

Dyslexia Assistant is designed around a **local-first** architecture. For users who choose to create an account, the backend provides optional cloud persistence for:
1. User identity credentials and hashed passwords.
2. Active user sessions and expiration metadata.
3. Saved text documents and drafts.
4. Spaced repetition flashcards (front, back, interval level, next review timestamp).

Initial prototypes used JavaScript in-memory `Map` objects (`server/authService.js`), causing complete data loss on server restarts and preventing horizontal scalability across multiple containers.

### Options Evaluated

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **In-Memory Maps** | Zero configuration, extremely fast unit tests | Non-persistent across restarts, non-scalable, violates 12-factor app state rules | Rejected for production |
| **SQLite (`better-sqlite3`)** | Single file, simple local storage | File locking challenges on multi-container deployments (ECS tasks sharing EFS/EBS) | Sub-optimal for ECS autoscaling |
| **DynamoDB** | Fully managed serverless on AWS | Proprietary AWS API, complex local mock setup, foreign keys and relational cascades difficult | Overkill for relational document-card schema |
| **PostgreSQL (via `pg`) with In-Memory Fallback** | ACID compliance, standard SQL schema, RDS managed high availability, KMS encryption, seamless fallback when `DATABASE_URL` is omitted | Requires running PostgreSQL container locally or in CI | **Accepted** |

---

## Decision

We chose **PostgreSQL** using the standard `pg` connection pool (`server/db.js`), accompanied by an automatic in-memory fallback when `DATABASE_URL` is not provided:

1. **Schema Definition (`server/schema.sql`):**
   - Clean, normalized DDL with foreign keys and `ON DELETE CASCADE`:
     - `users` (id, email, password_hash, salt, created_at, updated_at)
     - `sessions` (token, user_id, expires_at, created_at)
     - `documents` (id, user_id, title, content, created_at, updated_at)
     - `flashcards` (id, user_id, front, back, srs_level, next_review, times_reviewed, created_at, updated_at)
2. **Resilience & Local Testing (`server/db.js`):**
   - When `DATABASE_URL` is present: establishes connection pool with healthcheck (`SELECT 1`), runs idempotent table migrations (`CREATE TABLE IF NOT EXISTS`), and logs initialization safely.
   - When `DATABASE_URL` is absent: transparently falls back to an in-memory mock backing store with equivalent query semantics, ensuring unit tests and integration tests execute instantaneously without requiring a running Docker daemon.
3. **Production Deployment (`terraform/modules/database/`):**
   - Provisioned via Terraform as an AWS RDS PostgreSQL instance in private database subnets with automated multi-AZ failover, automated backups, and KMS encryption. Master credentials are auto-generated and stored in AWS Secrets Manager.

---

## Consequences

- **Persistence:** User accounts, documents, and flashcard decks are safely preserved across container deployments and restarts.
- **Developer Experience:** Developers and automated CI runners can run `npm test` without needing a live database connection string.
- **Portability:** Follows standard SQL, avoiding proprietary vendor lock-in.
