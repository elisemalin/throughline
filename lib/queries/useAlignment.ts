'use client';

import { useMutation } from '@tanstack/react-query';
import { postAlignment } from '@/lib/mock-api';
import type { AlignmentRequest } from '@/contracts/api';

export function useAlignment() {
  return useMutation({
    mutationFn: (req: AlignmentRequest) => postAlignment(req),
  });
}
