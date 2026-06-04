import type { SceneLabel } from '../types'
import { truncateToWidth } from '../textMetrics'

interface LabelViewProps {
  label: SceneLabel
}

// Max on-screen width for a label before it gets truncated (px).
const MAX_LABEL_WIDTH = 260
const LABEL_FONT_SIZE = 14

export default function LabelView({ label }: LabelViewProps) {
  const text = truncateToWidth(label.text, MAX_LABEL_WIDTH, LABEL_FONT_SIZE)
  return (
    <text x={label.position.x} y={label.position.y} textAnchor="middle" className="fill-slate-600 text-sm">
      {text !== label.text && <title>{label.text}</title>}
      {text}
    </text>
  )
}
