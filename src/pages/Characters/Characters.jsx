import PageHeader from "../../components/marketplace/PageHeader";
import CharacterCard from "../../components/characters/CharacterCard";
import NetworkBadge from "../../components/wallet/NetworkBadge";
import { useCharacters } from "../../hooks/useCharacters";
import { useCollection } from "../../hooks/useCollection";

function Characters() {
  const { characters, loading, error } = useCharacters();
  const { ownsCharacter } = useCollection();

  return (
    <div className="container market-page">
      <PageHeader eyebrow="CHARACTERS" title="Pick your Fuchey." aside={<NetworkBadge />}>
        Every character is an NFT that lives in your wallet. Many people can own a Yeti; each
        copy is yours alone.
      </PageHeader>

      {error && <p className="market-error">Couldn’t load characters. Try refreshing.</p>}

      <div className="character-grid" aria-busy={loading}>
        {characters.map((character) => (
          <CharacterCard
            key={character.id}
            character={character}
            owned={ownsCharacter(character.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default Characters;
