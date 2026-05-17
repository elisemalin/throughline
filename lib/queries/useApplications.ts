'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteApplication,
  getApplicationEvents,
  getApplications,
  patchApplication,
  postApplication,
  postApplicationAlignment,
} from '@/lib/api-client';
import { readByokKeyOrThrow } from '@/stores/useByokKey';
import type {
  ApplicationCreate,
  ApplicationUpdate,
} from '@/contracts/api';
import { QK } from './keys';

export function useApplications() {
  return useQuery({
    queryKey: QK.applications,
    queryFn: getApplications,
  });
}

export function useApplicationEvents(id: string | null | undefined) {
  return useQuery({
    queryKey: id ? QK.applicationEvents(id) : ['applications', 'noop', 'events'],
    queryFn: () => getApplicationEvents(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateApplication() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (req: ApplicationCreate) => postApplication(req),
    onSuccess: () => client.invalidateQueries({ queryKey: QK.applications }),
  });
}

export function useUpdateApplication() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ApplicationUpdate }) =>
      patchApplication(id, patch),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: QK.applications });
      client.invalidateQueries({ queryKey: QK.applicationEvents(variables.id) });
    },
  });
}

export function useDeleteApplication() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteApplication(id),
    onSuccess: () => client.invalidateQueries({ queryKey: QK.applications }),
  });
}

export function useRecomputeAlignment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      const apiKey = readByokKeyOrThrow();
      return postApplicationAlignment(id, apiKey);
    },
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: QK.applications });
      client.invalidateQueries({ queryKey: QK.applicationEvents(id) });
    },
  });
}
