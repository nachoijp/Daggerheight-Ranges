import { DistanceMetric } from "../engine/types";

const SIZE = 96;
const CENTER = SIZE / 2;

const ringProps = {
  fill: "none",
  stroke: "currentColor",
  strokeOpacity: 0.6,
  strokeDasharray: "3 3",
};

export function MetricDiagram({ metric }: { metric: DistanceMetric }) {
  if (metric === "spherical") {
    return (
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {[38, 26, 14].map((r) => (
          <circle key={r} cx={CENTER} cy={CENTER} r={r} {...ringProps} />
        ))}
        <circle cx={CENTER} cy={CENTER} r={2.5} fill="currentColor" />
      </svg>
    );
  }

  if (metric === "cubic") {
    return (
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {[38, 26, 14].map((r) => (
          <rect
            key={r}
            x={CENTER - r}
            y={CENTER - r}
            width={r * 2}
            height={r * 2}
            {...ringProps}
          />
        ))}
        <circle cx={CENTER} cy={CENTER} r={2.5} fill="currentColor" />
      </svg>
    );
  }

  // Cylindrical: a top-down horizontal radius on the left, and a separate
  // vertical "floors" ladder on the right to show height is its own axis.
  const originX = 26;
  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      {[28, 18].map((r) => (
        <circle key={r} cx={originX} cy={CENTER} r={r} {...ringProps} />
      ))}
      <circle cx={originX} cy={CENTER} r={2.5} fill="currentColor" />
      <line
        x1={76}
        y1={10}
        x2={76}
        y2={86}
        stroke="currentColor"
        strokeOpacity={0.6}
      />
      {[24, 40, 56, 72].map((y) => (
        <line
          key={y}
          x1={70}
          y1={y}
          x2={82}
          y2={y}
          stroke="currentColor"
          strokeOpacity={0.6}
        />
      ))}
    </svg>
  );
}
