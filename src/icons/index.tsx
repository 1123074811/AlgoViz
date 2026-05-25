import {
  // Navigation
  Home,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  FastForward,
  Settings,
  Search,
  Globe,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,

  // Algorithm categories
  ArrowUpDown,
  GitGraph,
  Database,
  Hash,
  Binary,
  TreePine,
  Network,
  Route,
  Filter,
  Brain,

  // Difficulty
  Circle,
  Triangle,
  Diamond,

  // Actions
  Code2,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertCircle,
  Info,
  Zap,
  Loader2,
} from 'lucide-react'

import type { LucideIcon } from 'lucide-react'

const iconSize = 20
const iconStroke = 1.5

export type IconName =
  | 'home' | 'play' | 'pause' | 'skip-back' | 'skip-forward'
  | 'rotate-ccw' | 'fast-forward' | 'settings' | 'search' | 'globe'
  | 'menu' | 'x' | 'chevron-left' | 'chevron-right' | 'chevron-down'
  | 'arrow-up-down' | 'git-graph' | 'database' | 'hash' | 'binary'
  | 'tree-pine' | 'network' | 'route' | 'filter' | 'brain'
  | 'circle' | 'triangle' | 'diamond'
  | 'code2' | 'eye' | 'eye-off' | 'copy' | 'check'
  | 'alert-circle' | 'info' | 'zap' | 'loader2'

const iconMap: Record<IconName, LucideIcon> = {
  home: Home,
  play: Play,
  pause: Pause,
  'skip-back': SkipBack,
  'skip-forward': SkipForward,
  'rotate-ccw': RotateCcw,
  'fast-forward': FastForward,
  settings: Settings,
  search: Search,
  globe: Globe,
  menu: Menu,
  x: X,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  'arrow-up-down': ArrowUpDown,
  'git-graph': GitGraph,
  database: Database,
  hash: Hash,
  binary: Binary,
  'tree-pine': TreePine,
  network: Network,
  route: Route,
  filter: Filter,
  brain: Brain,
  circle: Circle,
  triangle: Triangle,
  diamond: Diamond,
  code2: Code2,
  eye: Eye,
  'eye-off': EyeOff,
  copy: Copy,
  check: Check,
  'alert-circle': AlertCircle,
  info: Info,
  zap: Zap,
  loader2: Loader2,
}

export interface IconProps {
  name: IconName
  size?: number
  className?: string
}

export function Icon({ name, size = iconSize, className }: IconProps) {
  const LucideIconComponent = iconMap[name]
  if (!LucideIconComponent) return null
  return (
    <LucideIconComponent
      size={size}
      strokeWidth={iconStroke}
      className={className}
    />
  )
}

export const categoryIcons: Record<string, IconName> = {
  sorting: 'arrow-up-down',
  graph: 'git-graph',
  'data-structure': 'database',
  dp: 'hash',
  'search-backtrack': 'search',
  advanced: 'brain',
  interview: 'zap',
  contest: 'filter',
}
