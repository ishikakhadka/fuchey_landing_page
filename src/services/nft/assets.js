import { getReadUmi } from "../solana/umi";

// Reads Fuchey NFTs from the chain.
//
// An asset counts as a Fuchey asset only if it belongs to one of the
// collections created by the marketplace deployment — names and images are
// not trusted, since anyone can mint an asset called "Fuchey Yeti".
//
// index: { [collectionAddress]: itemId } from config/deployment.js.

function toOwnedAsset(asset, index) {
  const ua = asset.updateAuthority;
  const itemId = ua?.type === "Collection" ? index[ua.address.toString()] : undefined;
  if (!itemId) return null;

  return {
    address: asset.publicKey.toString(),
    owner: asset.owner.toString(),
    collection: ua.address.toString(),
    name: asset.name,
    uri: asset.uri,
    itemId,
  };
}

// Uses getProgramAccounts filtered by owner, which the public devnet RPC
// supports. For mainnet scale, swap in a DAS-capable RPC here.
export async function fetchOwnedFucheyAssets(owner, index) {
  if (!owner || !Object.keys(index).length) return [];

  const umi = await getReadUmi();
  const { fetchAssetsByOwner } = await import("@metaplex-foundation/mpl-core");
  const assets = await fetchAssetsByOwner(umi, owner, { skipDerivePlugins: true });

  return assets.map((a) => toOwnedAsset(a, index)).filter(Boolean);
}

export async function fetchFucheyAsset(address, index) {
  const umi = await getReadUmi();
  const [{ safeFetchAssetV1 }, { publicKey, isPublicKey }] = await Promise.all([
    import("@metaplex-foundation/mpl-core"),
    import("@metaplex-foundation/umi"),
  ]);
  if (!isPublicKey(address)) return null;

  const asset = await safeFetchAssetV1(umi, publicKey(address));
  return asset ? toOwnedAsset(asset, index) : null;
}

// Off-chain JSON metadata (name, image, attributes).
export async function fetchMetadata(uri) {
  const response = await fetch(uri);
  if (!response.ok) throw new Error(`Metadata request failed (${response.status})`);
  return response.json();
}
