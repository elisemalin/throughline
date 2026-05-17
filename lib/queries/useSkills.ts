'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSkills, postSkillsIngest, putSkills } from '@/lib/api-client';
import { readByokKeyOrThrow } from '@/stores/useByokKey';
import type { SkillsIngestRequest, SkillsUpdate } from '@/contracts/api';
import { QK } from './keys';

export function useSkills() {
  return useQuery({
    queryKey: QK.skills,
    queryFn: getSkills,
  });
}

export function useIngestSkills() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (req: SkillsIngestRequest) => {
      const apiKey = readByokKeyOrThrow();
      return postSkillsIngest(req, apiKey);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: QK.skills }),
  });
}

export function useUpdateSkills() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (req: SkillsUpdate) => putSkills(req),
    onSuccess: () => client.invalidateQueries({ queryKey: QK.skills }),
  });
}
