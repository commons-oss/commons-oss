import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  jsonb,
  pgEnum,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { id, tenantOrSystemPolicy, tenantPolicy, timestamps } from './_helpers.ts';
import { mannschaft } from './mannschaft.ts';
import { verein } from './verein.ts';
import { vereinUser } from './user.ts';

export const roleScope = pgEnum('role_scope', ['verein', 'mannschaft']);

/**
 * Role definitions. System roles have verein_id IS NULL and are visible to all tenants
 * via tenant_or_system policy. Custom Verein-defined roles (Phase 3) have verein_id set.
 */
export const role = pgTable(
  'role',
  {
    id: id(),
    /** NULL = system role, visible to all tenants. */
    vereinId: uuid('verein_id').references(() => verein.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    name: jsonb('name').notNull(),
    scope: roleScope('scope').notNull(),
    isSystem: boolean('is_system').notNull().default(false),
    ...timestamps,
  },
  (t) => [
    unique('role_key_per_scope').on(t.vereinId, t.key),
    check(
      'role_system_implies_null_verein',
      sql`(${t.isSystem} = false) OR (${t.vereinId} IS NULL)`,
    ),
    tenantOrSystemPolicy('role'),
  ],
).enableRLS();

export const rolePermission = pgTable(
  'role_permission',
  {
    id: id(),
    /** Denormalized from role — NULL for system role permissions. */
    vereinId: uuid('verein_id').references(() => verein.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    permission: text('permission').notNull(),
    ...timestamps,
  },
  (t) => [
    unique('role_permission_unique').on(t.roleId, t.permission),
    tenantOrSystemPolicy('role_permission'),
  ],
).enableRLS();

/**
 * Multi-role: one verein_user can hold N (role, mannschaft, title)
 * combinations. mannschaft_id required when role.scope='mannschaft' (CHECK enforced
 * via app code today; Phase 3 may move to a function-based check).
 */
export const vereinUserRole = pgTable(
  'verein_user_role',
  {
    id: id(),
    vereinId: uuid('verein_id')
      .notNull()
      .references(() => verein.id, { onDelete: 'cascade' }),
    vereinUserId: uuid('verein_user_id')
      .notNull()
      .references(() => vereinUser.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'restrict' }),
    mannschaftId: uuid('mannschaft_id').references(() => mannschaft.id, {
      onDelete: 'cascade',
    }),
    /** Descriptive UI metadata only — "Obmann", "Captain", "Cheftrainer". NOT authz. */
    title: text('title'),
    ...timestamps,
  },
  (t) => [
    unique('verein_user_role_unique').on(
      t.vereinUserId,
      t.roleId,
      t.mannschaftId,
    ),
    tenantPolicy('verein_user_role'),
  ],
).enableRLS();
