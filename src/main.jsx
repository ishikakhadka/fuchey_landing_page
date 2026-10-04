import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import './index.css'
import './marketplace.css'
import { router } from './router.jsx'
import { EditionProvider } from './context/EditionContext.jsx'
import { SolanaWalletProvider } from './context/WalletContext.jsx'
import { MarketplaceProvider } from './context/MarketplaceContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <EditionProvider>
      <SolanaWalletProvider>
        <MarketplaceProvider>
          <RouterProvider router={router} />
        </MarketplaceProvider>
      </SolanaWalletProvider>
    </EditionProvider>
  </StrictMode>,
)
