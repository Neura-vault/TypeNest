-- Typing preferences live in one jsonb column so new options never need a
-- new column. The theme check is widened for the new themes.
alter table public.user_settings add column if not exists typing_prefs jsonb not null default '{}'::jsonb;
alter table public.user_settings drop constraint if exists user_settings_theme_check;
alter table public.user_settings add constraint user_settings_theme_check
  check (theme in ('aurora', 'midnight', 'cyber', 'ocean', 'forest', 'sunset', 'graphite', 'paper', 'rose', 'lavender', 'mint', 'sand', 'slate', 'ink'));
