import { HooksPage } from './pages/hooks';
import { VaultsPage } from './pages/vaults';
import { Component, type ReactNode, useEffect, useRef, useState } from 'react';
import { Footer, Header } from './components/shell';
import { WalletModal } from './components/wallet';
import { LaunchNotice } from './components/tx';
import { Intro, shouldShowIntro } from './components/intro';
import { usePath, takePendingAnchor, scrollToAnchor, navigate } from './lib/router';
import { metaFor } from './routes-meta';
import { HowItWorksPage, DocsPage } from './pages/main';
import { HomePage } from './pages/home';
import { introActive } from './lib/motion';
import { ActivityPage, BurnPage, FundingPage, IdentityPage, LiquidityPage, WeatherPage } from './pages/token';
import { MarketplacePage, RewardsPage } from './pages/nft';
import { HigherLowerPage, RisingTidePage } from './pages/play';
import { ClunkPage, NotebookPage, NotFoundPage } from './pages/evidence';

const PAGES: Record<string, () => ReactNode> = {
  '/': HomePage,
  '/hooks': HooksPage,
  '/funding': FundingPage,
  '/burn': BurnPage,
  '/liquidity': LiquidityPage,
  '/weather': WeatherPage,
  '/activity': ActivityPage,
  '/identity': IdentityPage,
  '/vaults': VaultsPage,
  '/rewards': RewardsPage,
  '/marketplace': MarketplacePage,
  '/rising-tide': RisingTidePage,
  '/higher-or-lower': HigherLowerPage,
  '/clunk': ClunkPage,
  '/notebook': NotebookPage,
  '/how-it-works': HowItWorksPage,
  '/docs': DocsPage,
};

class PageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="container" style={{ paddingBlock: 64 }}>
        <div className="result result--error" role="alert">
          <h1 className="result__title" tabIndex={-1}>This page hit a problem</h1>
          <p>Something went wrong while drawing it. The rest of the site still works.</p>
          <div className="result__actions">
            <button type="button" className="btn" onClick={() => this.setState({ failed: false })}>Try again</button>
            <button type="button" className="btn" onClick={() => navigate('/')}>Go home</button>
          </div>
        </div>
      </div>
    );
  }
}

export function App() {
  const path = usePath();
  const [intro, setIntro] = useState(() => {
    const show = shouldShowIntro();
    introActive.set(show);
    return show;
  });
  const first = useRef(true);
  const Page = PAGES[path] ?? NotFoundPage;

  useEffect(() => {
    const meta = metaFor(path);
    document.title = meta && path !== '/' ? `${meta.title} · Clunk` : PAGES[path] ? 'Clunk: one token, plenty of ideas' : 'Page not found · Clunk';
    const anchor = takePendingAnchor();
    if (anchor) {
      requestAnimationFrame(() => scrollToAnchor(anchor) || window.scrollTo(0, 0));
    } else if (!first.current) {
      window.scrollTo(0, 0);
      (document.querySelector('.route-focus') as HTMLElement | null)?.focus({ preventScroll: true });
    }
    first.current = false;
  }, [path]);

  return (
    <>
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); scrollToAnchor('main'); }}>Skip to content</a>
      <div inert={intro || undefined}>
        <Header />
        <main id="main" className="site-main" tabIndex={-1}>
          <PageBoundary key={path}>
            <Page />
          </PageBoundary>
        </main>
        <Footer />
      </div>
      <WalletModal />
      <LaunchNotice />
      {intro && <Intro onDone={() => { introActive.set(false); setIntro(false); }} />}
    </>
  );
}
