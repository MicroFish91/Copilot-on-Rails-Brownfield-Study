import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS invitations_pending_code_idx
     ON invitations (code) WHERE status = 'pending';`,
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS invitations_pending_code_idx');
}
