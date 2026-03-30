import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";

const ACTOR_QUERY_KEY = "actor";

export function useActor() {
  const queryClient = useQueryClient();
  const initializedRef = useRef(false);

  const actorQuery = useQuery<backendInterface>({
    queryKey: [ACTOR_QUERY_KEY],
    queryFn: async () => {
      // Always use anonymous actor - no Internet Identity, no secret method calls
      return await createActorWithConfig();
    },
    staleTime: Number.POSITIVE_INFINITY,
    enabled: true,
  });

  // When actor is first ready, trigger data queries to load
  useEffect(() => {
    if (actorQuery.data && !initializedRef.current) {
      initializedRef.current = true;
      queryClient.invalidateQueries({
        predicate: (query) => !query.queryKey.includes(ACTOR_QUERY_KEY),
      });
    }
  }, [actorQuery.data, queryClient]);

  return {
    actor: actorQuery.data || null,
    isFetching: actorQuery.isFetching,
  };
}
