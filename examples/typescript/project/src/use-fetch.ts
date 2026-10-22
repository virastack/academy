import { useEffect, useState } from "react";
import type { FetchState } from "./types";

export function useFetch<T>(load: () => Promise<T>): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({ status: "loading" });

  useEffect(() => {
    let ignore = false;
    load()
      .then((data) => {
        if (!ignore) setState({ status: "success", data });
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "Bilinmeyen hata";
        if (!ignore) setState({ status: "error", message });
      });
    return () => {
      ignore = true;
    };
  }, [load]);

  return state;
}
