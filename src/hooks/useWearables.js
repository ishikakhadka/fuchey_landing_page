import { getWearables, getWearablesFor } from "../services/marketplace/catalog";
import { useAsync } from "./useAsync";

export function useWearables(type = null) {
  const { data, loading, error } = useAsync(() => getWearables({ type }), type ?? "all");
  return { wearables: data ?? [], loading, error };
}

export function useCompatibleWearables(characterId) {
  const { data, loading, error } = useAsync(() => getWearablesFor(characterId), characterId);
  return { wearables: data ?? [], loading, error };
}
