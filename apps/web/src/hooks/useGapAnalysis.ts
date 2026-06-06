import { useQuery } from '@tanstack/react-query';
import { aiApi } from '../lib/api';
import type { GapAnalysisResult } from '@talentcircuit/shared-types';

export function useGapAnalysis(postingId: string) {
  return useQuery<GapAnalysisResult & { cached: boolean; analysisId: string }>({
    queryKey: ['gap-analysis', postingId],
    queryFn: () => aiApi.getGapAnalysis(postingId).then((r) => r.data),
    enabled: !!postingId,
    staleTime: 1000 * 60 * 60, // 1 hour — cache is 7 days on server
    retry: 1,
  });
}
