import type { Knex } from 'knex';
import seedData from '../fixtures/seed-data.json';

export async function seed(knex: Knex): Promise<void> {
  await knex.raw('TRUNCATE sessions, photos, invitations, users, couples RESTART IDENTITY CASCADE');

  await knex('couples').insert({
    id: seedData.couple.id,
    name: seedData.couple.name,
  });

  await knex('users').insert(
    seedData.users.map((u) => ({
      id: u.id,
      email: u.email,
      password_hash: u.passwordHash,
      display_name: u.displayName,
      avatar_url: u.avatarUrl,
      couple_id: u.coupleId,
    })),
  );

  await knex('photos').insert(
    seedData.photos.map((p) => ({
      id: p.id,
      couple_id: p.coupleId,
      uploaded_by_user_id: p.uploadedByUserId,
      blob_name: p.blobName,
      blob_url: p.blobUrl,
      mime_type: p.mimeType,
      size_bytes: p.sizeBytes,
      caption: p.caption,
      caption_status: p.captionStatus,
      taken_at: p.takenAt,
    })),
  );
}
