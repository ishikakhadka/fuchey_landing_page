-- Catalogue prices can be set in SOL or USD (Admin → Characters/Wearables).
-- The on-chain sale is always paid in SOL: for a USD price the admin converts
-- at today's rate when opening or updating the sale, and `listings.price`
-- keeps holding the SOL amount the candy guard charges.

alter table public.characters
  add column if not exists price_currency text not null default 'sol'
    check (price_currency in ('sol', 'usd'));

alter table public.wearables
  add column if not exists price_currency text not null default 'sol'
    check (price_currency in ('sol', 'usd'));
