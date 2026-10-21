import { QueryCache, QueryClient } from "@tanstack/react-query";
import { showToast } from "./toast";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30 * 1000 },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Ekranda veri varken başarısız olan arka plan yenilemesi
      if (query.state.data !== undefined) {
        showToast(`Veri güncellenemedi: ${error.message}`);
      }
    },
  }),
});
