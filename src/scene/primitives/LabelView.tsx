import type { SceneLabel } from '../types'

interface LabelViewProps {
  label: SceneLabel
}

export default function LabelView({ label }: LabelViewProps) {
  return <text x={label.position.x} y={label.position.y} textAnchor="middle" className="fill-slate-600 text-sm">{label.text}</text>
}
