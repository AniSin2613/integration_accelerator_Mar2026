-- Cogniviti Bridge — PostgreSQL initialisation
-- This file runs once when the container is first created.
-- The actual schema is managed by Prisma migrations.

-- Enable UUID extension (used as fallback, cuid is the primary ID strategy)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
