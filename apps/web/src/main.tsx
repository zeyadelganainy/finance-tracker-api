import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import './i18n';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { SettingsProvider } from './settings/SettingsProvider';

// StrictMode removed: was causing double-firing of mutations/toasts in development.
// ToastProvider inside App already renders <Toaster>, so no duplicate needed here.
createRoot(document.getElementById('root')!).render(
	<I18nextProvider i18n={i18n}>
		<SettingsProvider>
			<App />
		</SettingsProvider>
	</I18nextProvider>
);
