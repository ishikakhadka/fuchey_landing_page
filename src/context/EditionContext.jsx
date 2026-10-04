import { createContext, useContext, useState } from "react";
import { editions } from "../data/editions";

const EditionContext = createContext(null);

export function EditionProvider({ children }) {
  const [edition, setEdition] = useState("companion");

  return (
    <EditionContext.Provider value={{ edition, setEdition, current: editions[edition] }}>
      {children}
    </EditionContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEdition() {
  return useContext(EditionContext);
}
