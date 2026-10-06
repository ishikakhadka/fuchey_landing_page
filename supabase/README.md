# Fuchey marketplace backend (Supabase)

The marketplace catalogue (characters and wearables), the art admins upload,
and saved loadouts all live in Supabase. The website reads published items
straight from the database. All writes go through two edge functions, and
each one checks a wallet signature first.

```
admin dashboard (/admin) ──► functions/admin ──► characters, wearables, storage
wardrobe "Save look"      ──► functions/loadout ─► loadouts
public pages              ──► REST (anon key, published rows only)
nft/setup-marketplace.mjs ──► REST (service role) ─► nft[<network>] addresses
```

## Data model

| Table | What it holds |
|---|---|
| `characters` | Identity, base art (`art`), wardrobe slots, listing (`status`, `price`, `supply`, `limit_per_wallet`), `nft` |
| `wearables` | Identity, `type` (slot), `compatible_characters`, listing, `image_url` (NFT image), `nft`, and **`visual`** |
| `loadouts` | `(wallet, character_id) → slots { [slot]: wearableId }`, ids only |
| `admins` | Wallet addresses allowed into the dashboard |
| `listings` | Sale state of a deployed product (price, open/closed, candy machine) |
| `purchases` | Verified purchase transactions |
| `nfts` | One row per minted Core asset: Fuchey asset id, asset address, collection, metadata, mint tx, status |
| `nft_ownership` | Ownership periods per NFT; exactly one `is_current`, earlier ones end as transferred / burned |

### NFT ownership

Solana is the source of truth; `nfts` / `nft_ownership` are a cache of chain
reads (`functions/_shared/nft/ownership.ts`). Four separate identities:

| | Example | Meaning |
|---|---|---|
| Fuchey asset id | `yeti` | Catalogue identity. Many NFTs share one (editions) |
| NFT asset address | `24Ait7…` | The Core asset, unique per NFT |
| Collection address | `Vm6Lqn…` | The product's Core collection |
| Owner wallet | `AcAMBn…` | A Solana address. Never a wallet app |

A listing is the product's sale state and never decides ownership. Owners
are written only right after reading the asset account, by:

- `purchase-verify`: purchase + NFT + first owner, in one transaction
- `inventory`: the wallet's assets, and re-reads NFTs it no longer holds (catches outside transfers)
- admin **Sync ownership** / **Sync all** (`/admin` → NFTs): Sync all also finds copies in Fuchey collections the database hasn't seen

A failed chain read marks the NFT `unverified` and keeps the last confirmed
owner. A cron or webhook can call `syncAllOwnership(db, network)` later.

`nft` is keyed by network:
`{ "devnet": { collection, candyMachine, candyGuard, treasury, metadataUri, imageUri, mintLimitId } }`.
Listing or publishing an item never mints anything. These fields reference
assets created separately (by `nft/setup-marketplace.mjs` or another tool).

`visual` holds everything the renderer (`src/render/visual.js`) needs to draw
a wearable on the character's 96×96 pixel grid:

```jsonc
// built-in pixel art (all seeded items)
{ "kind": "runs", "layer": "hat", "z": 0, "front": [{ "x": 30, "y": -7, "w": 10, "c": "#3f78b5" }], "back": null, "icon": null, "bounds": {…} }
// an uploaded transparent PNG
{ "kind": "image", "layer": "hat", "z": 0, "image": "https://…/cap.png", "backImage": null,
  "width": 24, "height": 8, "x": 32, "y": -2, "scale": 1,
  "perCharacter": { "cyber": { "y": -3 } } }
```

`layer` picks the stacking position. Back to front, the order is: outfit,
backpack, accessory, headwear, hat, held, special. `z` fine-tunes the order
within a layer. Each wearable's `back` image is drawn behind the base art.

## Local setup

```sh
npx supabase start                       # needs Docker; applies migrations + seed.sql
npx supabase functions serve             # runs functions/admin and functions/loadout
npx supabase status                      # prints the API URL, anon key and service-role key
```

`.env.local` for the site (both values are public):

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon key from `supabase status`>
```

Add your admin wallet:

```sh
npx supabase db query "insert into public.admins (wallet) values ('<your wallet address>')"
# or seed it: FUCHEY_ADMINS=<wallet> npm run db:seed && npx supabase db reset
```

Then open `/admin`, connect that wallet and sign in.

## Hosted project

```sh
npx supabase link --project-ref <ref>
npx supabase db push --include-seed      # schema + the original catalogue
npx supabase functions deploy admin loadout inventory purchase-verify
```

Set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in the site's build
environment. **Never** put the service-role key in a `VITE_*` variable: it
bypasses every policy. Only the edge functions (automatically) and
`nft/setup-marketplace.mjs` (from your shell) use it.

## Seed

`seed/` holds the original static catalogue and the pixel-art source
(`wearableArt.js`). `npm run db:seed` regenerates `seed.sql` from them, so a
fresh database looks exactly like the site did before the migration. After
that, the catalogue is edited in the dashboard; the seed files are not
read by the site.

## Tests

```sh
npx supabase start && npx supabase functions serve   # in another terminal
SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=… SUPABASE_SERVICE_ROLE_KEY=… npm run test:api
```
