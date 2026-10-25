import { useEffect } from "react";
import { Outlet, ScrollRestoration, useLocation } from "react-router";

import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import WalletModal from "./components/wallet/WalletModal.jsx";
import WalletToast from "./components/wallet/WalletToast.jsx";
import PurchaseDialog from "./components/marketplace/PurchaseDialog.jsx";

// Shared shell for every route: theme, navbar, footer. The site has one
// layout; only the device showcase switches between Dev and Companion.
function App() {
  const { pathname, hash } = useLocation();

  // Links like "/#waitlist" from other pages land at the top by default —
  // scroll to the section once the home page has rendered.
  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [pathname, hash]);

  return (
    <div className="app theme-companion">
      <Navbar />

      <main>
        <Outlet />
      </main>

      <Footer />

      <WalletModal />
      <WalletToast />
      <PurchaseDialog />
      <ScrollRestoration />
    </div>
  );
}

export default App;
