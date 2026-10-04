import { getCharacter, getCharacters } from "../services/marketplace/catalog";
import { useAsync } from "./useAsync";

export function useCharacters() {
  const { data, loading, error } = useAsync(() => getCharacters(), "all");
  return { characters: data ?? [], loading, error };
}

export function useCharacter(id) {
  const { data, loading, error } = useAsync(() => getCharacter(id), id);
  return { character: data ?? null, loading, error };
}
