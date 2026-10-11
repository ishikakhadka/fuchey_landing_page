import { useMemo } from "react";
import { useCatalog } from "../context/CatalogContext";
import { groupByPack } from "../data/packs";

export function useCharacters() {
  const { characters, loading, error } = useCatalog();
  return { characters, loading, error };
}

export function useCharacter(id) {
  const { characters, loading, error } = useCatalog();
  return { character: characters.find((c) => c.id === id) ?? null, loading, error };
}

// Packs that have at least one character, each with its characters as `items`.
export function usePacks() {
  const { characters, loading, error } = useCatalog();
  const grouped = useMemo(() => groupByPack(characters), [characters]);
  return { packs: grouped, loading, error };
}

export function usePack(id) {
  const { packs: grouped, loading, error } = usePacks();
  return { pack: grouped.find((p) => p.id === id) ?? null, loading, error };
}
