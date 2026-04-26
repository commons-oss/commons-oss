import { jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { id, tenantPolicy, timestamps } from './_helpers.ts';
import { user } from './user.ts';
import { org } from './org.ts';

/**
 * §21.1 Phase 1 deliverable: schema only, no UI, no middleware writes yet.
 * Hono middleware in Phase 2 onward writes one row per logical mutation
 * (not per HTTP request — sync handlers write N rows for N entries).
 *
 * `diff` shape: { before: {field: oldVal}, after: {field: newVal} }, capped at 4 KB.
 * PII redaction applied before write per `defineModule({ auditRedact: [...] })`.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: id(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
    actorUserId: uuid('actor_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    action: text('action').notNull(),
    targetTable: text('target_table').notNull(),
    targetId: text('target_id').notNull(),
    diff: jsonb('diff'),
    occurredAt: timestamps.createdAt,
  },
  () => [tenantPolicy('audit_log')],
).enableRLS();
