'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteWatchlistCompany,
  getDiscovery,
  getWatchlist,
  patchDiscoveryStatus,
  postDiscoveryPoll,
  postWatchlistAdd,
} from '@/lib/mock-api';
import type {
  DiscoveryUpdateRequest,
  WatchlistAddRequest,
} from '@/contracts/api';
import { QK } from './keys';

export function useDiscovery() {
  return useQuery({
    queryKey: QK.discovery,
    queryFn: getDiscovery,
  });
}

export function useWatchlist() {
  return useQuery({
    queryKey: QK.watchlist,
    queryFn: getWatchlist,
  });
}

export function useAddWatchlistCompany() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (req: WatchlistAddRequest) => postWatchlistAdd(req),
    onSuccess: () => client.invalidateQueries({ queryKey: QK.watchlist }),
  });
}

export function useRemoveWatchlistCompany() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWatchlistCompany(id),
    onSuccess: () => client.invalidateQueries({ queryKey: QK.watchlist }),
  });
}

export function usePollDiscovery() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => postDiscoveryPoll(),
    onSuccess: () => client.invalidateQueries({ queryKey: QK.discovery }),
  });
}

export function useUpdateDiscoveryStatus() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: DiscoveryUpdateRequest }) =>
      patchDiscoveryStatus(id, req),
    onSuccess: () => client.invalidateQueries({ queryKey: QK.discovery }),
  });
}
