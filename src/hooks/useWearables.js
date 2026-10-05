import { useMemo } from "react";
import { useCatalog } from "../context/CatalogContext";
import { fitsCharacter } from "../services/marketplace/catalog";

export function useWearables(type = null) {
  const { wearables, loading, error } = useCatalog();
  const list = useMemo(() => (type ? wearables.filter((w) => w.type === type) : wearables), [wearables, type]);
  return { wearables: list, loading, error };
}

export function useCompatibleWearables(characterId) {
  const { wearables, loading, error } = useCatalog();
  const list = useMemo(() => wearables.filter((w) => fitsCharacter(w, characterId)), [wearables, characterId]);
  return { wearables: list, loading, error };
}
