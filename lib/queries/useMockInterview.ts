'use client';

import { useMutation } from '@tanstack/react-query';
import { postMockInterviewTurn } from '@/lib/mock-api';
import type { MockInterviewRequest } from '@/contracts/api';

export function useMockInterviewTurn() {
  return useMutation({
    mutationFn: (req: MockInterviewRequest) => postMockInterviewTurn(req),
  });
}
