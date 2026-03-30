"use client";

import { useEffect, useState } from "react";

import type { MediaType } from "@/types/media";
import type { ProviderItem } from "@/types/watch-providers";

type ProviderOptionsState = {
  options: ProviderItem[];
  isLoading: boolean;
  error: string | null;
};

export function useProviderOptions(mediaType: MediaType | "all", regionCode: string) {
  const [state, setState] = useState<ProviderOptionsState>({
    options: [],
    isLoading: true,
    error: null
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadProviderOptions() {
      setState(current => ({ ...current, isLoading: true, error: null }));

      try {
        const params = new URLSearchParams({ mediaType, region: regionCode });
        const response = await fetch(`/api/watch-providers/options?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store"
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof data?.error === "string" ? data.error : "Streamingdienste konnten nicht geladen werden."
          );
        }

        setState({
          options: Array.isArray(data?.providers) ? data.providers : [],
          isLoading: false,
          error: null
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          options: [],
          isLoading: false,
          error: error instanceof Error ? error.message : "Streamingdienste konnten nicht geladen werden."
        });
      }
    }

    if (!regionCode) {
      setState({ options: [], isLoading: false, error: null });
      return () => controller.abort();
    }

    void loadProviderOptions();

    return () => controller.abort();
  }, [mediaType, regionCode]);

  return state;
}
