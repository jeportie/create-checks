import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';

import App from './App.tsx';
import './index.css';

export function AppSetup() {
  return (
    <StrictMode>
      <ErrorBoundary fallback={<p className="text-red-600">An Error has occurred.</p>}>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
}

const root = document.getElementById('root');

if (!root) throw new Error('Root element not found');

createRoot(root).render(<AppSetup />);
