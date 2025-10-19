-- RPC for faster ranked search within a conversation
-- Requires messages.content_tsv and its GIN index

create or replace function public.search_messages(
  conv uuid,
  q text,
  lim integer default 50,
  off integer default 0
)
returns setof public.messages
language sql
stable
as $$
  select m.*
  from public.messages m
  where m.conversation_id = conv
    and m.is_deleted = false
    and m.message_type = 'text'
    and m.content_tsv @@ websearch_to_tsquery('simple', q)
  order by ts_rank_cd(m.content_tsv, websearch_to_tsquery('simple', q)) desc, m.created_at desc
  limit greatest(lim, 1)
  offset greatest(off, 0)
$$;

-- Optional: grant execute to anon/authenticated if needed
-- grant execute on function public.search_messages(uuid, text, integer, integer) to anon, authenticated;
