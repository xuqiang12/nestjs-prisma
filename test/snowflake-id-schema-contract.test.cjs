const assert = require('assert')
const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const schema = fs.readFileSync(path.join(rootDir, 'prisma/schema.prisma'), 'utf8')
const migrationDir = path.join(rootDir, 'prisma/migrations/20260729010000_use_snowflake_ids')
const migrationSql = fs.existsSync(path.join(migrationDir, 'migration.sql'))
  ? fs.readFileSync(path.join(migrationDir, 'migration.sql'), 'utf8')
  : ''

assert(!schema.includes('@default(cuid())'), 'schema should not use cuid ids')
assert(!schema.includes('@default(autoincrement())'), 'schema should not use autoincrement ids')
assert(schema.includes('dbgenerated("next_snowflake_id()")'), 'schema should use database snowflake id default')
assert(migrationSql.includes('next_snowflake_id'), 'migration should create and use snowflake id generator')
assert(migrationSql.includes('id_mapping'), 'migration should map historical ids before changing primary keys')
assert(migrationSql.includes('replace_json_text_values'), 'migration should rewrite JSON references to migrated ids')

process.stdout.write('ok - snowflake id schema contract\n')
