import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { openShareLinkFromHash } from './sharing/shareLink';

// Must run before the app renders: a share link that applies immediately should already be in the
// editor/compiler-options stores by the time MonacoEditor mounts and reads them.
openShareLinkFromHash();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
