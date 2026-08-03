-- Article rich-text source of truth (CKEditor) alongside blocks cache

alter table public.articles
  add column if not exists content_html text;

-- Optional SQL helper for one-shot backfill (also available via scripts/backfill-content-html.ts)
create or replace function public.blocks_to_html(blocks jsonb)
returns text
language plpgsql
immutable
as $$
declare
  el jsonb;
  result text := '';
  li text;
  items text;
  src text;
  alt text;
begin
  if blocks is null or jsonb_typeof(blocks) <> 'array' then
    return null;
  end if;

  for el in select value from jsonb_array_elements(blocks)
  loop
    if el->>'type' = 'heading' and coalesce(trim(el->>'text'), '') <> '' then
      result := result || '<h2>' || replace(replace(replace(el->>'text', '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</h2>';
    elsif el->>'type' = 'paragraph' and coalesce(trim(el->>'text'), '') <> '' then
      result := result || '<p>' || replace(replace(replace(el->>'text', '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</p>';
    elsif el->>'type' = 'list' and jsonb_typeof(el->'items') = 'array' then
      items := '';
      for li in select value #>> '{}' from jsonb_array_elements(el->'items')
      loop
        if coalesce(trim(li), '') <> '' then
          items := items || '<li>' || replace(replace(replace(li, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</li>';
        end if;
      end loop;
      if items <> '' then
        result := result || '<ul>' || items || '</ul>';
      end if;
    elsif el->>'type' = 'image' and coalesce(trim(el->>'src'), '') <> '' then
      src := replace(replace(el->>'src', '&', '&amp;'), '"', '&quot;');
      alt := replace(replace(replace(coalesce(el->>'alt', ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
      if alt <> '' then
        result := result || '<figure><img src="' || src || '" alt="' || replace(alt, '"', '&quot;') || '" /><figcaption>' || alt || '</figcaption></figure>';
      else
        result := result || '<figure><img src="' || src || '" alt="" /></figure>';
      end if;
    end if;
  end loop;

  if result = '' then
    return null;
  end if;
  return result;
end;
$$;

-- update public.articles
-- set content_html = public.blocks_to_html(blocks)
-- where (content_html is null or content_html = '')
--   and blocks is not null
--   and jsonb_array_length(blocks) > 0;
