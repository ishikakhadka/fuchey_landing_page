-- Admin can choose to show an item's NFT artwork as its picture on the site
-- (cards, stages, carousels). The dressing room keeps drawing the base art,
-- which sits on the 96 x 96 grid wearables are placed on.

alter table public.characters add column if not exists show_nft_art boolean not null default false;
alter table public.wearables add column if not exists show_nft_art boolean not null default false;
