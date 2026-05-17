'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteDocument,
  getDocuments,
  postCoverLetter,
  postDossier,
  postNinetyDayPlan,
  postResume,
} from '@/lib/api-client';
import { readByokKeyOrThrow } from '@/stores/useByokKey';
import type {
  CoverLetterRequest,
  DossierRequest,
  NinetyDayRequest,
  ResumeRequest,
} from '@/contracts/api';
import { QK } from './keys';

export function useDocuments() {
  return useQuery({
    queryKey: QK.documents,
    queryFn: getDocuments,
  });
}

export function useGenerateResume() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (req: ResumeRequest) => {
      const apiKey = readByokKeyOrThrow();
      return postResume(req, apiKey);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: QK.documents }),
  });
}

export function useGenerateCoverLetter() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (req: CoverLetterRequest) => {
      const apiKey = readByokKeyOrThrow();
      return postCoverLetter(req, apiKey);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: QK.documents }),
  });
}

export function useGenerateNinetyDay() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (req: NinetyDayRequest) => {
      const apiKey = readByokKeyOrThrow();
      return postNinetyDayPlan(req, apiKey);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: QK.documents }),
  });
}

export function useGenerateDossier() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (req: DossierRequest) => {
      const apiKey = readByokKeyOrThrow();
      return postDossier(req, apiKey);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: QK.documents }),
  });
}

export function useDeleteDocument() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => client.invalidateQueries({ queryKey: QK.documents }),
  });
}
