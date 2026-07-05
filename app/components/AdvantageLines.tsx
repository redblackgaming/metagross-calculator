import { useEffect, useRef, useState } from 'react';
import { TypeName } from '@/lib/typeChart';

export type LineMode = 'invisible' | 'hover' | 'all';

export interface AdvantageLine {
  /** index into the output slots array */
  outputIndex: number;
  /** index into the input slots array */
  inputIndex: number;
  /** the STAB type that is super-effective */
  type: TypeName;
}

interface Props {
  mode: LineMode;
  hoveredOutputIndex: number | null;
  lines: AdvantageLine[];
  outputRefs: React.RefObject<HTMLDivElement>[];
  inputRefs: React.RefObject<HTMLDivElement>[];
  containerRef: React.RefObject<HTMLDivElement>;
}

export const TYPE_COLORS: Record<TypeName, string> = {
  normal:   '#A8A878',
  fire:     '#F08030',
  water:    '#6890F0',
  electric: '#F8D030',
  grass:    '#78C850',
  ice:      '#98D8D8',
  fighting: '#C03028',
  poison:   '#A040A0',
  ground:   '#E0C068',
  flying:   '#A890F0',
  psychic:  '#F85888',
  bug:      '#A8B820',
  rock:     '#B8A038',
  ghost:    '#705898',
  dragon:   '#7038F8',
  dark:     '#705848',
  steel:    '#B8B8D0',
  fairy:    '#EE99AC',
};

function getRightEdge(el: HTMLElement, container: HTMLElement): { x: number; y: number } {
  const eRect = el.getBoundingClientRect();
  const cRect = container.getBoundingClientRect();
  return {
    x: eRect.right - cRect.left,
    y: eRect.top - cRect.top + eRect.height / 2,
  };
}

function getLeftEdge(el: HTMLElement, container: HTMLElement): { x: number; y: number } {
  const eRect = el.getBoundingClientRect();
  const cRect = container.getBoundingClientRect();
  return {
    x: eRect.left - cRect.left,
    y: eRect.top - cRect.top + eRect.height / 2,
  };
}

interface Curve {
  d: string;
  color: string;
  type: TypeName | 'both';
  secondColor?: string;
  key: string;
}

export default function AdvantageLines({
  mode,
  hoveredOutputIndex,
  lines,
  outputRefs,
  inputRefs,
  containerRef,
}: Props) {
  const [curves, setCurves] = useState<Curve[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    function recalc() {
      const container = containerRef.current;
      if (!container) return;

      // don't draw lines on mobile — columns are stacked vertically
      if (window.innerWidth < 768) {
        setCurves([]);
        return;
      }

      const { width, height } = container.getBoundingClientRect();
      setSize({ w: width, h: height });

      const activeLines =
        mode === 'invisible' || hoveredOutputIndex === null
          ? []
          : lines.filter(l => l.outputIndex === hoveredOutputIndex);

      // collapse duplicate output→input pairs into a single "both types" line
      const grouped = new Map<string, typeof activeLines[number][]>();
      for (const line of activeLines) {
        const key = `${line.outputIndex}-${line.inputIndex}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(line);
      }

      const next: Curve[] = [];

      for (const [, group] of grouped) {
        const line  = group[0];
        const outEl = outputRefs[line.outputIndex]?.current;
        const inEl  = inputRefs[line.inputIndex]?.current;
        if (!outEl || !inEl) continue;

        const from = getRightEdge(outEl, container);
        const to   = getLeftEdge(inEl, container);

        const dx = Math.abs(to.x - from.x) * 0.55;
        const d  = `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;

        const isBoth      = group.length > 1;
        const type        = isBoth ? 'both' : line.type;
        const color       = TYPE_COLORS[line.type];
        const secondColor = isBoth ? TYPE_COLORS[group[1].type] : undefined;

        next.push({
          d,
          color,
          type,
          secondColor,
          key: `${line.outputIndex}-${line.inputIndex}-${type}`,
        });
      }

      setCurves(next);
    }

    recalc();

    const ro = new ResizeObserver(recalc);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('scroll', recalc, true);
    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', recalc, true);
    };
  }, [mode, hoveredOutputIndex, lines, outputRefs, inputRefs, containerRef]);

  if (mode === 'invisible' || curves.length === 0) return null;

  // one marker per unique type present in active curves (skip 'both' — uses white)
  const activeTypes = [...new Set(curves.filter(c => c.type !== 'both').map(c => c.type as TypeName))];

  return (
    <svg
      className="pointer-events-none absolute inset-0 overflow-visible"
      width={size.w}
      height={size.h}
      style={{ zIndex: 10 }}
    >
      <defs>
        {activeTypes.map(type => (
          <marker
            key={type}
            id={`arrow-${type}`}
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L8,3 z" fill={TYPE_COLORS[type]} />
          </marker>
        ))}
        <marker
          id="arrow-both"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L8,3 z" fill="#f0abfc" />
        </marker>
        {/* per-curve markers for the dotted 'both' lines */}
        {curves.filter(c => c.type === 'both' && c.secondColor).map(c => (
          <marker
            key={`arrow-both-${c.key}`}
            id={`arrow-both-${c.key}`}
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L8,3 z" fill={c.secondColor} />
          </marker>
        ))}
      </defs>
      {curves.map(c => (
        <g key={c.key}>
          {/* solid line — first type color (or only type) */}
          <path
            d={c.d}
            stroke={c.color}
            strokeWidth={2.5}
            strokeOpacity={0.9}
            fill="none"
            strokeLinecap="round"
            markerEnd={c.type !== 'both' ? `url(#arrow-${c.type})` : undefined}
          />
          {/* dotted line on top — second type color, only for 'both' case */}
          {c.type === 'both' && c.secondColor && (
            <path
              d={c.d}
              stroke={c.secondColor}
              strokeWidth={2.5}
              strokeOpacity={0.9}
              strokeDasharray="5 4"
              fill="none"
              strokeLinecap="round"
              markerEnd={`url(#arrow-both-${c.key})`}
            />
          )}

        </g>
      ))}
    </svg>
  );
}
