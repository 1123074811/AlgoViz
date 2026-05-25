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
  Table2,
  Braces,
  Workflow,
  ListTree,
  Boxes,
} from 'lucide-react'

import type { LucideIcon } from 'lucide-react'

const iconSize = 20
const iconStroke = 1.5

export const ICON_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
} as const

export type IconName =
  | 'home' | 'play' | 'pause' | 'skip-back' | 'skip-forward'
  | 'rotate-ccw' | 'fast-forward' | 'settings' | 'search' | 'globe'
  | 'menu' | 'x' | 'chevron-left' | 'chevron-right' | 'chevron-down'
  | 'arrow-up-down' | 'git-graph' | 'database' | 'hash' | 'binary'
  | 'tree-pine' | 'network' | 'route' | 'filter' | 'brain'
  | 'circle' | 'triangle' | 'diamond'
  | 'code2' | 'eye' | 'eye-off' | 'copy' | 'check'
  | 'alert-circle' | 'info' | 'zap' | 'loader2'
  | 'table2' | 'braces' | 'workflow' | 'list-tree' | 'boxes'

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
  table2: Table2,
  braces: Braces,
  workflow: Workflow,
  'list-tree': ListTree,
  boxes: Boxes,
}

export interface IconProps {
  name: IconName
  size?: number
  presetSize?: keyof typeof ICON_SIZES
  className?: string
}

export function Icon({ name, size, presetSize, className }: IconProps) {
  const LucideIconComponent = iconMap[name]
  if (!LucideIconComponent) return null
  const resolvedSize = size ?? (presetSize ? ICON_SIZES[presetSize] : iconSize)
  return (
    <LucideIconComponent
      size={resolvedSize}
      strokeWidth={iconStroke}
      className={className}
    />
  )
}

export const categoryIcons: Record<string, IconName> = {
  sorting: 'arrow-up-down',
  graph: 'git-graph',
  'data-structure': 'database',
  dp: 'table2',
  'search-backtrack': 'search',
  advanced: 'brain',
  interview: 'zap',
  contest: 'filter',
}

export const algorithmTypeIcons: Record<string, IconName> = {
  bubble_sort: 'arrow-up-down',
  selection_sort: 'arrow-up-down',
  insertion_sort: 'arrow-up-down',
  shell_sort: 'arrow-up-down',
  merge_sort: 'arrow-up-down',
  quick_sort: 'arrow-up-down',
  heap_sort: 'arrow-up-down',
  counting_sort: 'boxes',
  radix_sort: 'boxes',
  bucket_sort: 'boxes',
  bfs_graph: 'git-graph',
  dfs_graph: 'git-graph',
  dijkstra: 'route',
  bellman_ford: 'route',
  a_star: 'route',
  floyd: 'workflow',
  prim: 'network',
  kruskal: 'network',
  topological_sort: 'workflow',
  array: 'database',
  linked_list: 'list-tree',
  doubly_linked_list: 'list-tree',
  stack: 'database',
  queue: 'database',
  binary_tree: 'tree-pine',
  bst: 'tree-pine',
  avl_tree: 'tree-pine',
  red_black_tree: 'tree-pine',
  heap_ds: 'tree-pine',
  trie: 'tree-pine',
  union_find: 'network',
  hash_table: 'hash',
  knapsack_01: 'table2',
  unbounded_knapsack: 'table2',
  lcs: 'table2',
  lis: 'table2',
  edit_distance: 'table2',
  matrix_chain: 'table2',
  interval_dp: 'table2',
  binary_search: 'search',
  backtracking: 'workflow',
  n_queens: 'workflow',
  sudoku: 'table2',
  kmp: 'braces',
  manacher: 'braces',
  segment_tree: 'tree-pine',
  fenwick_tree: 'tree-pine',
  monotonic_stack: 'database',
  sliding_window: 'filter',
  leetcode_hot100: 'zap',
  acm_templates: 'filter',
}
