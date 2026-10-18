import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			staleTime: 5 * 60 * 1000,      // Data is fresh for 5 minutes — no re-fetch on re-mount
			gcTime: 10 * 60 * 1000,         // Keep unused data in cache for 10 minutes
		},
	},
});