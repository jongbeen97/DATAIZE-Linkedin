import { formatNumber } from '@/shared/lib/format';

/**
 * 스파크라인 — 축·격자 없이 추세만 보여주는 초소형 꺾은선.
 *
 * 좁은 자리에 "늘고 있는가"만 답하면 되는 용도라 SVG 로 직접 그립니다.
 * (BarChart 와 달리 값을 읽는 차트가 아니므로 눈금을 두지 않았습니다)
 */
export function Sparkline({
  values,
  width = 260,
  height = 44,
  label,
}: {
  values: number[];
  width?: number;
  height?: number;
  label: string;
}) {
  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const stepX = width / (values.length - 1);

  // 위아래 2px 여백을 두어 선이 잘리지 않게 합니다
  const toY = (v: number) => height - 2 - ((v - min) / span) * (height - 4);
  const points = values.map((v, i) => `${i * stepX},${toY(v)}`);
  const line = `M ${points.join(' L ')}`;
  const area = `${line} L ${width},${height} L 0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label={`${label} — ${formatNumber(values[0])}에서 ${formatNumber(values[values.length - 1])}로 변화`}
    >
      <path d={area} fill="var(--color-brand-500)" opacity="0.12" />
      <path
        d={line}
        fill="none"
        stroke="var(--color-brand-500)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={(values.length - 1) * stepX}
        cy={toY(values[values.length - 1])}
        r="2.5"
        fill="var(--color-brand-500)"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * 증감 표시 — "지금 몇인가"보다 "늘고 있는가"가 운영자에게 더 중요한 정보입니다.
 * 변화가 없으면 아무것도 렌더링하지 않아 화면을 어지럽히지 않습니다.
 */
export function Delta({ value, className }: { value: number; className?: string }) {
  if (value === 0) return null;
  const up = value > 0;
  return (
    <span
      className={className}
      style={{ color: up ? 'var(--status-published)' : 'var(--ink-muted)' }}
      title={up ? `직전 수집 대비 ${formatNumber(value)} 증가` : `직전 수집 대비 ${formatNumber(Math.abs(value))} 감소`}
    >
      {up ? '▲' : '▼'} {formatNumber(Math.abs(value))}
    </span>
  );
}
