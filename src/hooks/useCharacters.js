import { useCatalog } from "../context/CatalogContext";

export function useCharacters() {
  const { characters, loading, error } = useCatalog();
  return { characters, loading, error };
}

export function useCharacter(id) {
  const { characters, loading, error } = useCatalog();
  return { character: characters.find((c) => c.id === id) ?? null, loading, error };
}
