import pg from 'pg'
import { config } from './config.js'

const { Pool } = pg

export const db = new Pool({
  connectionString: config.databaseUrl,
})

export async function migrate() {
  await db.query(`
    create extension if not exists pgcrypto;

    create table if not exists projects (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      age text not null,
      occasion text not null,
      world text not null,
      tone text not null,
      duration text not null,
      script text not null,
      status text not null default 'draft',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists project_stages (
      id uuid primary key default gen_random_uuid(),
      project_id uuid not null references projects(id) on delete cascade,
      slug text not null,
      title text not null,
      detail text not null,
      progress integer not null default 0,
      status text not null default 'queued',
      sort_order integer not null,
      updated_at timestamptz not null default now(),
      unique(project_id, slug)
    );

    create table if not exists scenes (
      id uuid primary key default gen_random_uuid(),
      project_id uuid not null references projects(id) on delete cascade,
      title text not null,
      prompt text not null,
      gradient text not null,
      sort_order integer not null,
      created_at timestamptz not null default now()
    );
  `)
}

export async function closeDb() {
  await db.end()
}
