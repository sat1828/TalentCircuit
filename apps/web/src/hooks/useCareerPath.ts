import { useQuery } from '@tanstack/react-query';
import { aiApi } from '../lib/api';
import type { CareerPathData } from '@talentcircuit/shared-types';

export function useCareerPath() {
  return useQuery<CareerPathData>({
    queryKey: ['career-path'],
    queryFn: () => aiApi.getCareerPath().then((r) => r.data),
  });
}
