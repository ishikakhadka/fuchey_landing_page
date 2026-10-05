import { Link } from "react-router";
import { ArrowRight, BadgeCheck, PenLine, Wallet } from "lucide-react";

import ItemArt from "../../components/marketplace/ItemArt";
import WearableIcon from "../../components/wardrobe/WearableIcon";
import CharacterCard from "../../components/characters/CharacterCard";
import WearableCard from "../../components/wardrobe/WearableCard";
import NetworkBadge from "../../components/wallet/NetworkBadge";

import { useEdition } from "../../context/EditionContext";
import { useCharacters } from "../../hooks/useCharacters";
import { useWearables } from "../../hooks/useWearables";
import { useCollection } from "../../hooks/useCollection";

const STEPS = [
  {
    icon: Wallet,
    title: "Connect your wallet",
    desc: "Solflare and other Solana wallets. Your keys never leave it.",
  },
  {
    icon: PenLine,
    title: "Approve in your wallet",
    desc: "You review the transaction and sign it yourself.",
  },
  {
    icon: BadgeCheck,
    title: "It’s yours, on-chain",
    desc: "Once Solana confirms it, the NFT shows up in your collection.",
  },
];

// The copy for each edition lives here rather than in data/editions.jsx
// because it is marketplace-only.
const HERO = {
  companion: {
    featured: "yeti",
    title: "Adopt a Fuchey.",
    accent: "Dress it up.",
    lede: "Characters and wearables you truly own — collected in your wallet, worn on your desk.",
  },
  dev: {
    featured: "cyber",
    title: "Ship with a",
    accent: "sidekick.",
    lede: "Dev Edition characters and gear for builders. Owned on-chain, rendered on your Fuchey.",
  },
};

function Marketplace() {
  const { edition } = useEdition();
  const { characters, error } = useCharacters();
  const { wearables } = useWearables();
  const { ownsCharacter, ownsWearable } = useCollection();

  const hero = HERO[edition];
  const featured = characters.find((c) => c.id === hero.featured);
  const orbit = featured
    ? wearables.filter((w) => w.compatibleCharacters.includes(featured.id)).slice(0, 3)
    : [];

  return (
    <div className="market-page market-home">
      {error && (
        <div className="container">
          <p className="market-error">Couldn’t load the marketplace catalogue. Try refreshing in a moment.</p>
        </div>
      )}
      <section className="container market-hero">
        <div className="market-hero-copy" key={edition}>
          <p className="pill">
            <span className="pulse" aria-hidden="true" />
            FUCHEY MARKETPLACE
          </p>

          <h1>
            {hero.title} <span className="accent">{hero.accent}</span>
          </h1>

          <p className="hero-description">{hero.lede}</p>

          <div className="hero-actions">
            {featured && (
              <Link to={`/characters/${featured.id}`} className="primary-button">
                Meet {featured.name}
                <ArrowRight size={18} strokeWidth={2.2} />
              </Link>
            )}
            <Link to="/wardrobe" className="ghost-button">
              Browse wardrobe
            </Link>
          </div>

          <NetworkBadge />
        </div>

        {featured && (
          <div className={`market-hero-stage character-stage stage-${featured.edition}`}>
            <ItemArt art={featured.art} alt={featured.title} itemId={featured.id} size="lg" />
            <span className="stage-floor" aria-hidden="true" />

            {orbit.map((w, i) => (
              <Link
                key={w.id}
                to={`/wardrobe?item=${w.id}`}
                className={`orbit-item orbit-${i}`}
                aria-label={w.name}>
                <WearableIcon id={w.id} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="container market-section">
        <div className="row-heading">
          <div>
            <p className="eyebrow">CHARACTERS</p>
            <h2>Choose your companion</h2>
          </div>
          <Link to="/characters" className="text-link">
            All characters →
          </Link>
        </div>

        <div className="character-grid">
          {characters.map((c) => (
            <CharacterCard key={c.id} character={c} owned={ownsCharacter(c.id)} />
          ))}
        </div>
      </section>

      <section className="container market-section">
        <div className="row-heading">
          <div>
            <p className="eyebrow">WARDROBE</p>
            <h2>Fresh off the rack</h2>
          </div>
          <Link to="/wardrobe" className="text-link">
            Full wardrobe →
          </Link>
        </div>

        <div className="wearable-grid">
          {wearables.slice(0, 4).map((w) => (
            <WearableCard key={w.id} wearable={w} owned={ownsWearable(w.id)} />
          ))}
        </div>
      </section>

      <section className="container market-section">
        <ol className="ownership-steps">
          {STEPS.map(({ icon: Icon, title, desc }, i) => (
            <li key={title}>
              <span className="ownership-step-num">0{i + 1}</span>
              <Icon size={22} strokeWidth={1.8} />
              <h3>{title}</h3>
              <p>{desc}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

export default Marketplace;
