'use client';

import { useMutation } from '@tanstack/react-query';
import { postAlignment } from '@/lib/api-client';
import { readByokKeyOrThrow } from '@/stores/useByokKey';
import type { AlignmentRequest } from '@/contracts/api';

export function useAlignment() {
  return useMutation({
    mutationFn: (req: AlignmentRequest) => {
      const apiKey = readByokKeyOrThrow();
      return postAlignment(req, apiKey);
    },
  });
}
