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
import { team } from './team.ts';
import { org } from './org.ts';
import { orgMember } from './user.ts';

export const roleScope = pgEnum('role_scope', ['org', 'team']);

/**
 * Role definitions. System roles have org_id IS NULL and are visible to all
 * tenants via tenant_or_system policy. Custom org-defined roles (Phase 3)
 * have org_id set.
 */
export const role = pgTable(
  'role',
  {
    id: id(),
    /** NULL = system role, visible to all tenants. */
    orgId: uuid('org_id').references(() => org.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    name: jsonb('name').notNull(),
    scope: roleScope('scope').notNull(),
    isSystem: boolean('is_system').notNull().default(false),
    ...timestamps,
  },
  (t) => [
    unique('role_key_per_scope').on(t.orgId, t.key),
    check(
      'role_system_implies_null_org',
      sql`(${t.isSystem} = false) OR (${t.orgId} IS NULL)`,
    ),
    tenantOrSystemPolicy('role'),
  ],
).enableRLS();

export const rolePermission = pgTable(
  'role_permission',
  {
    id: id(),
    /** Denormalized from role — NULL for system role permissions. */
    orgId: uuid('org_id').references(() => org.id, { onDelete: 'cascade' }),
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
 * Multi-role: one org_member can hold N (role, team, title) combinations.
 * `team_id` required when role.scope='team' (CHECK enforced via app code
 * today; Phase 3 may move to a function-based check).
 */
export const memberRole = pgTable(
  'member_role',
  {
    id: id(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => org.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => orgMember.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'restrict' }),
    teamId: uuid('team_id').references(() => team.id, { onDelete: 'cascade' }),
    /** Descriptive UI metadata only — "Obmann", "Captain", "Cheftrainer". NOT authz. */
    title: text('title'),
    ...timestamps,
  },
  (t) => [
    unique('member_role_unique').on(t.memberId, t.roleId, t.teamId),
    tenantPolicy('member_role'),
  ],
).enableRLS();
