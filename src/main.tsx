import { createRoot } from 'react-dom/client';
import { App } from './App';
import { startDiscovery } from './lib/wallets';
import './styles/app.css';
import './styles/motion.css';
import './styles/nft.css';

const root = document.getElementById('root');
if (root) {
  root.textContent = '';
  createRoot(root).render(<App />);
  startDiscovery();
}

import './styles/hooks.css';
