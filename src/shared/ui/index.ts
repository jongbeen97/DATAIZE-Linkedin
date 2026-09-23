/**
 * 공용 UI 컴포넌트 진입점.
 *
 * 화면 코드는 개별 파일 경로 대신 이 배럴에서 가져옵니다.
 *   import { Button, Card, Modal } from '@/shared/ui';
 *
 * 파일을 쪼개거나 합쳐도 사용하는 쪽 import 를 고치지 않아도 되고,
 * "shared/ui 가 무엇을 제공하는가"가 이 파일 하나로 드러납니다.
 *
 * 차트는 성격이 달라(도메인 데이터를 그리는 표현 계층) charts/ 하위에 두고
 * 여기서 함께 내보냅니다.
 */

export { Card, CardTitle } from './Card';
export { Button } from './Button';
export { Badge, type BadgeTone } from './Badge';
export { Modal } from './Modal';
export { Menu, type MenuItem } from './Menu';
export { PageHeader, type Crumb } from './PageHeader';
export { StatStrip, type Stat } from './StatStrip';
export { Skeleton, EmptyState, ErrorState } from './states';

export * from './icons';

export { BarChart } from './charts/BarChart';
export { Sparkline, Delta } from './charts/Sparkline';
export { SegmentedBar, type Segment } from './charts/SegmentedBar';
