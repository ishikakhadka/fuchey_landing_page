// Permanent storage for NFT artwork and metadata, behind a small interface so
// the provider can change without touching the NFT code. Today: Pinata (IPFS).
//
//   PINATA_JWT       API key (Supabase secret)
//   PINATA_GATEWAY   optional dedicated gateway host, e.g. "fuchey.mypinata.cloud"
//                    (default: Pinata's shared gateway — fine for testing,
//                    rate-limited; set a dedicated one before launch)
//
// Every stored object comes back as { cid, uri: "ipfs://<cid>", url: gateway URL }.

import { HttpError } from "../http.ts";

export type Stored = { cid: string; uri: string; url: string };

export interface NftStorage {
  readonly provider: string;
  readonly configured: boolean;
  putFile(bytes: Uint8Array, name: string, contentType: string): Promise<Stored>;
  putJson(value: unknown, name: string): Promise<Stored>;
}

function gatewayUrl(cid: string) {
  const host = Deno.env.get("PINATA_GATEWAY");
  return `https://${(host ?? "gateway.pinata.cloud").replace(/^https?:\/\//, "").replace(/\/$/, "")}/ipfs/${cid}`;
}

const stored = (cid: string): Stored => ({ cid, uri: `ipfs://${cid}`, url: gatewayUrl(cid) });

class PinataStorage implements NftStorage {
  readonly provider = "pinata";
  constructor(private jwt: string | undefined) {}

  get configured() {
    return Boolean(this.jwt);
  }

  private async call(path: string, init: RequestInit) {
    if (!this.jwt) {
      throw new HttpError(503, "NFT storage isn’t configured. Set the PINATA_JWT secret on the Supabase project.");
    }
    const response = await fetch(`https://api.pinata.cloud${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.jwt}`, ...(init.headers ?? {}) },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.IpfsHash) {
      throw new HttpError(502, `IPFS upload failed (${response.status}): ${body.error?.details ?? body.error ?? "unknown error"}`);
    }
    return stored(body.IpfsHash as string);
  }

  putFile(bytes: Uint8Array, name: string, contentType: string) {
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: contentType }), name);
    form.append("pinataMetadata", JSON.stringify({ name }));
    return this.call("/pinning/pinFileToIPFS", { method: "POST", body: form });
  }

  putJson(value: unknown, name: string) {
    return this.call("/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinataContent: value, pinataMetadata: { name } }),
    });
  }
}

export function nftStorage(): NftStorage {
  return new PinataStorage(Deno.env.get("PINATA_JWT"));
}
