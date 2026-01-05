import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// StrictMode removed: was causing double-firing of mutations/toasts in development.
// ToastProvider inside App already renders <Toaster>, so no duplicate needed here.
createRoot(document.getElementById('root')!).render(<App />);
