import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App';
import {AuthProvider} from './hooks/useAuth';
import {ThemeProvider} from './theme-provider';
import './index.css';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// A conversational answer is a point-in-time record with an audit row behind
			// it, not a cache entry to be silently refreshed under the user. The reads
			// cached here are the dashboard and history, which are safe to refetch — but
			// not while someone is reading them.
			refetchOnWindowFocus: false,
			retry: 1
		}
	}
});

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<ThemeProvider defaultTheme="system" storageKey="prudentia-theme">
			<QueryClientProvider client={queryClient}>
				{/*
				 * AuthProvider sits ABOVE the router so every route reads one session.
				 * Two components each calling a stateful `useAuth()` hook got two copies
				 * and disagreed about the signed-in role (defect D-25).
				 */}
				<AuthProvider>
					<BrowserRouter>
						<App />
					</BrowserRouter>
				</AuthProvider>
			</QueryClientProvider>
		</ThemeProvider>
	</StrictMode>
);
