import { env } from '@/shared/config/env';
import type { MetricsProvider } from './provider';
import { LinkedInApiMetricsProvider } from './linkedinProvider';
import { SampleMetricsProvider } from './sampleProvider';

export type { MetricsProvider, RawPostMetrics } from './provider';

/** 환경변수 한 줄로 실연동 ↔ 대체 데이터를 전환 */
export function getMetricsProvider(): MetricsProvider {
  return env().METRICS_PROVIDER === 'linkedin'
    ? new LinkedInApiMetricsProvider()
    : new SampleMetricsProvider();
}
