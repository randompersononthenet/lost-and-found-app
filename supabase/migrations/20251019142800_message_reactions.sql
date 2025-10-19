-- Message reactions schema
create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (char_length(reaction) > 0),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (message_id, user_id)
);

-- Maintain updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_message_reactions_updated
before update on public.message_reactions
for each row execute procedure public.set_updated_at();

-- RLS
alter table public.message_reactions enable row level security;

-- Allow read to conversation participants only
create policy "reactions select for participants" on public.message_reactions
for select to authenticated
using (
  exists (
    select 1 from public.messages m
    join public.conversation_participants cp on cp.conversation_id = m.conversation_id
    where m.id = message_reactions.message_id and cp.user_id = auth.uid()
  )
);

-- Allow insert by participants
create policy "reactions insert for participants" on public.message_reactions
for insert to authenticated
with check (
  exists (
    select 1 from public.messages m
    join public.conversation_participants cp on cp.conversation_id = m.conversation_id
    where m.id = message_reactions.message_id and cp.user_id = auth.uid()
  )
);

-- Allow update by owners (change emoji)
create policy "reactions update by owner" on public.message_reactions
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Allow delete by owners
create policy "reactions delete by owner" on public.message_reactions
for delete to authenticated
using (user_id = auth.uid());
