import { createBrowserRouter } from "react-router";

import App from "./App.jsx";
import Home from "./pages/Home/Home.jsx";
import Marketplace from "./pages/Marketplace/Marketplace.jsx";
import Characters from "./pages/Characters/Characters.jsx";
import CharacterDetails from "./pages/CharacterDetails/CharacterDetails.jsx";
import Wardrobe from "./pages/Wardrobe/Wardrobe.jsx";
import Collection from "./pages/Collection/Collection.jsx";
import AssetDetails from "./pages/AssetDetails/AssetDetails.jsx";
import NotFound from "./pages/NotFound.jsx";

// The admin dashboard is only for admins — keep it out of the main bundle.
const loadAdmin = () => import("./pages/Admin/Admin.jsx").then((m) => ({ Component: m.default }));

// Static hosting needs an SPA fallback (serve index.html for unknown paths)
// so deep links like /characters/yeti work on refresh.
export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "marketplace", element: <Marketplace /> },
      { path: "characters", element: <Characters /> },
      { path: "characters/:id", element: <CharacterDetails /> },
      { path: "wardrobe", element: <Wardrobe /> },
      { path: "collection", element: <Collection /> },
      { path: "collection/:address", element: <AssetDetails /> },
      { path: "admin", lazy: loadAdmin },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
