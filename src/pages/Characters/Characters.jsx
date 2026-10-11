import PageHeader from "../../components/marketplace/PageHeader";
import PackCard from "../../components/characters/PackCard";
import NetworkBadge from "../../components/wallet/NetworkBadge";
import { usePacks } from "../../hooks/useCharacters";
import { useCollection } from "../../hooks/useCollection";

function Characters() {
  const { packs, loading, error } = usePacks();
  const { ownsCharacter } = useCollection();

  return (
    <div className="container market-page">
      <PageHeader eyebrow="CHARACTERS" title="Pick your pack." aside={<NetworkBadge />}>
        Fuchey characters come in packs. Open one to meet its crew — every character is an NFT
        that lives in your wallet.
      </PageHeader>

      {error && <p className="market-error">Couldn’t load characters. Try refreshing.</p>}

      <div className="pack-grid" aria-busy={loading}>
        {packs.map((pack) => (
          <PackCard
            key={pack.id}
            pack={pack}
            ownedCount={pack.items.filter((c) => ownsCharacter(c.id)).length}
          />
        ))}
      </div>
    </div>
  );
}

export default Characters;
