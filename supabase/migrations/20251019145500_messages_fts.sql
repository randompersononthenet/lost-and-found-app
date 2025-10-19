-- Full-text search for messages
-- Adds a tsvector column for message content, indexes it, and keeps it updated via trigger

-- 1) Add tsvector column
alter table public.messages
  add column if not exists content_tsv tsvector;

-- 2) Backfill existing rows
update public.messages
set content_tsv = to_tsvector('simple', coalesce(content, ''))
where content_tsv is null;

-- 3) Index
create index if not exists messages_content_tsv_idx
  on public.messages using gin (content_tsv);

-- 4) Trigger function to keep it updated
create or replace function public.messages_tsvector_update()
returns trigger as $$
begin
  new.content_tsv := to_tsvector('simple', coalesce(new.content, ''));
  return new;
end
$$ language plpgsql;

-- 5) Trigger
create trigger trg_messages_tsv_update
before insert or update of content on public.messages
for each row execute procedure public.messages_tsvector_update();
