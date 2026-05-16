'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteDocument,
  getDocuments,
  postCoverLetter,
  postDossier,
  postNinetyDayPlan,
  postResume,
} from '@/lib/mock-api';
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
    mutationFn: (req: ResumeRequest) => postResume(req),
    onSuccess: () => client.invalidateQueries({ queryKey: QK.documents }),
  });
}

export function useGenerateCoverLetter() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (req: CoverLetterRequest) => postCoverLetter(req),
    onSuccess: () => client.invalidateQueries({ queryKey: QK.documents }),
  });
}

export function useGenerateNinetyDay() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (req: NinetyDayRequest) => postNinetyDayPlan(req),
    onSuccess: () => client.invalidateQueries({ queryKey: QK.documents }),
  });
}

export function useGenerateDossier() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (req: DossierRequest) => postDossier(req),
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
