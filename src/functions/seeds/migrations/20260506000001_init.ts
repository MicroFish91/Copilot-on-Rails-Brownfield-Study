import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pgcrypto');

  await knex.raw(`
    CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.schema.createTable('couples', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('name').notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.check('length(name) BETWEEN 1 AND 80', undefined, 'couples_name_len_chk');
    t.index(['created_at'], 'couples_created_at_idx');
  });
  await knex.raw(
    `CREATE TRIGGER couples_set_updated_at BEFORE UPDATE ON couples
     FOR EACH ROW EXECUTE FUNCTION set_updated_at();`,
  );

  await knex.schema.createTable('users', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('email').notNullable().unique();
    t.text('password_hash').notNullable();
    t.text('display_name').notNullable();
    t.text('avatar_url').nullable();
    t.uuid('couple_id')
      .nullable()
      .references('id')
      .inTable('couples')
      .onDelete('SET NULL');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.check(
      'length(display_name) BETWEEN 1 AND 80',
      undefined,
      'users_display_name_len_chk',
    );
  });
  await knex.raw(
    `CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
     FOR EACH ROW EXECUTE FUNCTION set_updated_at();`,
  );

  await knex.schema.createTable('invitations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('couple_id')
      .notNullable()
      .references('id')
      .inTable('couples')
      .onDelete('CASCADE');
    t.uuid('created_by_user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    t.text('code').notNullable().unique();
    t.text('status').notNullable().defaultTo('pending');
    t.timestamp('expires_at', { useTz: true }).notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.check(
      "status IN ('pending','accepted','revoked','expired')",
      undefined,
      'invitations_status_chk',
    );
  });

  await knex.schema.createTable('photos', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('couple_id')
      .notNullable()
      .references('id')
      .inTable('couples')
      .onDelete('CASCADE');
    t.uuid('uploaded_by_user_id')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    t.text('blob_name').notNullable();
    t.text('blob_url').notNullable();
    t.text('mime_type').notNullable();
    t.bigInteger('size_bytes').notNullable();
    t.text('caption').notNullable().defaultTo('');
    t.text('caption_status').notNullable().defaultTo('pending');
    t.timestamp('taken_at', { useTz: true }).nullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['couple_id', 'blob_name'], { indexName: 'photos_couple_blob_name_uniq' });
    t.check(
      'size_bytes > 0 AND size_bytes <= 10485760',
      undefined,
      'photos_size_bytes_chk',
    );
    t.check(
      "caption_status IN ('pending','ready','failed')",
      undefined,
      'photos_caption_status_chk',
    );
    t.index(['couple_id', 'created_at'], 'photos_couple_created_at_idx');
  });
  await knex.raw(
    `CREATE TRIGGER photos_set_updated_at BEFORE UPDATE ON photos
     FOR EACH ROW EXECUTE FUNCTION set_updated_at();`,
  );

  await knex.schema.createTable('sessions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    t.text('token_hash').notNullable().unique();
    t.timestamp('expires_at', { useTz: true }).notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(['expires_at'], 'sessions_expires_at_idx');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sessions');
  await knex.schema.dropTableIfExists('photos');
  await knex.schema.dropTableIfExists('invitations');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('couples');
  await knex.raw('DROP FUNCTION IF EXISTS set_updated_at()');
}
