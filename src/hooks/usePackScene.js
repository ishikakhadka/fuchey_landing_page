import { useCallback } from "react";
import { useContent } from "../context/ContentContext";
import { packScene } from "../utils/drops";

// (pack) → the pack's backdrop as the rest of the site shows it right now
// (see packScene). Re-renders when the admin's drops reload.
export function usePackScene() {
  const { drops } = useContent();
  return useCallback((pack) => packScene(pack, drops), [drops]);
}
