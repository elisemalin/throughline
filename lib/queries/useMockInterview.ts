'use client';

import { useMutation } from '@tanstack/react-query';
import { postMockInterviewTurn } from '@/lib/api-client';
import { readByokKeyOrThrow } from '@/stores/useByokKey';
import type { MockInterviewRequest } from '@/contracts/api';

export function useMockInterviewTurn() {
  return useMutation({
    mutationFn: (req: MockInterviewRequest) => {
      const apiKey = readByokKeyOrThrow();
      return postMockInterviewTurn(req, apiKey);
    },
  });
}
