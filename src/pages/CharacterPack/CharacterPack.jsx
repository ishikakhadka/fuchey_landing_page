import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";

import ItemArt from "../../components/marketplace/ItemArt";
import DropBanner from "../../components/drops/DropBanner";
import CharacterCard from "../../components/characters/CharacterCard";
import EmptyState from "../../components/collection/EmptyState";
import NetworkBadge from "../../components/wallet/NetworkBadge";
import { usePack } from "../../hooks/useCharacters";
import { useCollection } from "../../hooks/useCollection";
import { getRarity } from "../../services/marketplace/catalog";
import { usePackScene } from "../../hooks/usePackScene";

function CharacterPack() {
  const sceneOf = usePackScene();
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

  // Up to three unlocked characters, the rarest in the middle.
  const unlocked = pack.items
    .filter((c) => !c.art.locked)
    .sort((a, b) => getRarity(b.rarity).rank - getRarity(a.rarity).rank)
    .slice(0, 3);
  const lineup = unlocked.length === 3 ? [unlocked[1], unlocked[0], unlocked[2]] : unlocked;

  return (
    <div className="container market-page">
      <Link to="/characters" className="back-link">
        <ArrowLeft size={16} /> All packs
      </Link>

      <section className="pk-hero">
        <img className="pk-hero-bg" src={sceneOf(pack)} alt="" />
        <span className="pk-hero-shade" aria-hidden="true" />
        <div className="pk-hero-copy">
          <span className="eyebrow">{pack.name}</span>
          <h1 className="rd-title">{pack.tagline}</h1>
          <p className="rd-lede">{pack.description}</p>
          <span className="pk-hero-meta">
            {pack.items.length} characters <NetworkBadge />
          </span>
        </div>
        <div className="pk-hero-line" aria-hidden="true">
          <span className="pk-hero-ring" />
          {lineup.map((c) => (
            <ItemArt key={c.id} art={c.art} alt="" itemId={c.id} size="md" />
          ))}
        </div>
      </section>

      <div className="pk-banner">
        <DropBanner pack={pack.id} />
      </div>

      <h2 className="section-title pk-crew-title">Meet the crew</h2>
      <div className="character-grid">
        {pack.items.map((character) => (
          <CharacterCard key={character.id} character={character} owned={ownsCharacter(character.id)} />
        ))}
      </div>
    </div>
  );
}

export default CharacterPack;
