import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import './index.css'
import './marketplace.css'
import './experience.css'
import './redesign.css'
import { router } from './router.jsx'
import { EditionProvider } from './context/EditionContext.jsx'
import { SolanaWalletProvider } from './context/WalletContext.jsx'
import { MarketplaceProvider } from './context/MarketplaceContext.jsx'
import { CatalogProvider } from './context/CatalogContext.jsx'
import { ContentProvider } from './context/ContentContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <EditionProvider>
      <SolanaWalletProvider>
        <CatalogProvider>
          <ContentProvider>
            <MarketplaceProvider>
              <RouterProvider router={router} />
            </MarketplaceProvider>
          </ContentProvider>
        </CatalogProvider>
      </SolanaWalletProvider>
    </EditionProvider>
  </StrictMode>,
)
