/* eslint-disable @typescript-eslint/no-var-requires */
require('ts-node/register/transpile-only');

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://localdev:localdevpassword@localhost:5432/scrapbook';

/** @type {import('knex').Knex.Config} */
const config = {
  client: 'pg',
  connection: connectionString,
  migrations: {
    directory: './migrations',
    extension: 'ts',
    loadExtensions: ['.ts'],
  },
  seeds: {
    directory: './seeds',
    extension: 'ts',
    loadExtensions: ['.ts'],
  },
};

module.exports = config;
