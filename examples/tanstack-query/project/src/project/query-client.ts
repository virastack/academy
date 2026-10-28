import { QueryCache, QueryClient } from "@tanstack/react-query";
import { showToast } from "./toast";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30 * 1000 },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      // A background refetch that fails while data is already on screen
      if (query.state.data !== undefined) {
        showToast(`Data could not be updated: ${error.message}`);
      }
    },
  }),
});
