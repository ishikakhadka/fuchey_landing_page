-- Animated GIFs in the admin: uploads accept GIF (and up to 8 MB), and a
-- character or wearable can have its own website picture (e.g. an animated
-- GIF) separate from its NFT artwork. When set, the site shows it on cards,
-- stages, carousels and pages; the dressing room keeps the base art.

update storage.buckets
set file_size_limit = 8388608,
    allowed_mime_types = array['image/png', 'image/webp', 'image/gif']
where id = 'catalog-art';

alter table public.characters add column if not exists display_url text;
alter table public.wearables add column if not exists display_url text;
