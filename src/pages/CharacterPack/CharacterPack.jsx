import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";

import PageHeader from "../../components/marketplace/PageHeader";
import CharacterCard from "../../components/characters/CharacterCard";
import EmptyState from "../../components/collection/EmptyState";
import NetworkBadge from "../../components/wallet/NetworkBadge";
import { usePack } from "../../hooks/useCharacters";
import { useCollection } from "../../hooks/useCollection";

function CharacterPack() {
  const { packId } = useParams();
  const { pack, loading, error } = usePack(packId);
  const { ownsCharacter } = useCollection();

  if (loading) {
    return <div className="container market-page" aria-busy="true" />;
  }

  if (!pack) {
    return (
      <div className="container market-page">
        <EmptyState
          title="This pack wandered off."
          action={
            <Link to="/characters" className="ghost-button">
              <ArrowLeft size={16} /> All packs
            </Link>
          }>
          {error ? "Couldn’t load characters. Try refreshing." : `We couldn’t find a pack called “${packId}”.`}
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="container market-page">
      <Link to="/characters" className="back-link">
        <ArrowLeft size={16} /> All packs
      </Link>

      <PageHeader eyebrow={pack.name.toUpperCase()} title={pack.tagline} aside={<NetworkBadge />}>
        {pack.description}
      </PageHeader>

      <div className="character-grid">
        {pack.items.map((character) => (
          <CharacterCard key={character.id} character={character} owned={ownsCharacter(character.id)} />
        ))}
      </div>
    </div>
  );
}

export default CharacterPack;
