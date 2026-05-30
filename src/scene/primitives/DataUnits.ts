import type { ActionColor } from '@/types/animation'
import type { 
  SceneNode, 
  SceneCell, 
  SceneEdge, 
  ScenePointer, 
  SceneLabel, 
  SceneEntityState, 
  Point, 
  Size,
  NodeField,
  NodePort
} from '../types'

// ==========================================
// 1. 基础数据单元 (Base Data Units)
// ==========================================

export const DataUnit = {
  /**
   * 创建数组单元 (Array Cell)
   * 数组中的基础格子，支持数值、索引标签、各种高亮颜色和状态
   */
  arrayCell(options: {
    id: string
    value: string | number
    index: number
    role?: SceneEntityState['role']
    color?: ActionColor
    pulse?: boolean
    x?: number
    y?: number
  }): SceneCell {
    return {
      id: options.id,
      type: 'cell',
      position: { x: options.x ?? 0, y: options.y ?? 0 },
      size: { width: 44, height: 44 },
      value: options.value,
      col: options.index,
      state: {
        role: options.role ?? 'idle',
        color: options.color ?? 'muted',
        pulse: options.pulse ?? false,
      }
    }
  },

  /**
   * 创建链表节点单元 (Linked List Node)
   * 支持单向、双向、循环链表结构
   */
  listNode(options: {
    id: string
    value: string | number
    variant?: 'singly' | 'doubly' | 'circular'
    role?: SceneEntityState['role']
    color?: ActionColor
    pulse?: boolean
    x?: number
    y?: number
  }): SceneNode {
    const variant = options.variant ?? 'singly'
    const isDoubly = variant === 'doubly'
    
    const fields: NodeField[] = isDoubly
      ? [
          { id: 'prev', label: 'prev', role: 'pointer_slot' },
          { id: 'data', label: 'data', value: options.value, role: 'data' },
          { id: 'next', label: 'next', role: 'pointer_slot' },
        ]
      : [
          { id: 'data', label: 'data', value: options.value, role: 'data' },
          { id: 'next', label: 'next', role: 'pointer_slot' },
        ]

    const ports: NodePort[] = isDoubly
      ? [
          { id: 'prev', side: 'left', role: 'prev' },
          { id: 'input', side: 'left', role: 'input', visible: false },
          { id: 'next', side: 'right', role: 'next' },
        ]
      : [
          { id: 'input', side: 'left', role: 'input' },
          { id: 'next', side: 'right', role: 'next' },
        ]

    return {
      id: options.id,
      type: 'node',
      variant: `linked_list.${variant}`,
      position: { x: options.x ?? 0, y: options.y ?? 0 },
      size: { width: isDoubly ? 132 : 100, height: 56 },
      fields,
      ports,
      state: {
        role: options.role ?? 'idle',
        color: options.color ?? 'muted',
        pulse: options.pulse ?? false,
      }
    }
  },

  /**
   * 创建树节点单元 (Tree Node)
   * 包含二叉树、二叉搜索树、AVL树、B树、Trie等变体
   */
  treeNode(options: {
    id: string
    value: string | number
    variant?: 'binary' | 'bst' | 'avl' | 'btree' | 'trie'
    role?: SceneEntityState['role']
    color?: ActionColor
    pulse?: boolean
    x?: number
    y?: number
    height?: number
    balanceFactor?: number
  }): SceneNode {
    const variant = options.variant ?? 'binary'
    const fields: NodeField[] = [{ id: 'value', label: 'value', value: options.value, role: 'value' }]
    
    if (variant === 'avl') {
      if (options.height !== undefined) {
        fields.push({ id: 'height', label: 'h', value: options.height, role: 'metadata' })
      }
      if (options.balanceFactor !== undefined) {
        fields.push({ id: 'bf', label: 'bf', value: options.balanceFactor, role: 'metadata' })
      }
    }

    const ports: NodePort[] = [
      { id: 'parent', side: 'top', role: 'parent' },
      { id: 'left', side: 'bottom-left', role: 'left' },
      { id: 'right', side: 'bottom-right', role: 'right' },
      { id: 'child', side: 'bottom', role: 'child' },
    ]

    return {
      id: options.id,
      type: 'node',
      variant: variant === 'bst' ? 'tree.binary' : `tree.${variant}`,
      position: { x: options.x ?? 0, y: options.y ?? 0 },
      size: { width: 86, height: 58 },
      fields,
      ports,
      state: {
        role: options.role ?? 'idle',
        color: options.color ?? 'muted',
        pulse: options.pulse ?? false,
      }
    }
  },

  /**
   * 创建图顶点单元 (Graph Node/Vertex)
   * 带有专属连通端口，支持邻接连线布局
   */
  graphNode(options: {
    id: string
    label: string
    role?: SceneEntityState['role']
    color?: ActionColor
    pulse?: boolean
    x?: number
    y?: number
  }): SceneNode {
    return {
      id: options.id,
      type: 'node',
      variant: 'graph.vertex',
      position: { x: options.x ?? 0, y: options.y ?? 0 },
      size: { width: 64, height: 64 },
      fields: [{ id: 'label', value: options.label, role: 'data' }],
      ports: [{ id: 'center', side: 'center', role: 'custom' }],
      state: {
        role: options.role ?? 'idle',
        color: options.color ?? 'muted',
        pulse: options.pulse ?? false,
      }
    }
  },

  /**
   * 创建矩阵 / DP 表格单元 (Matrix DP Cell)
   * 带有行列坐标，专门用于动态规划的状态转移展示
   */
  matrixCell(options: {
    id: string
    row: number
    col: number
    value: string | number
    role?: SceneEntityState['role']
    color?: ActionColor
    pulse?: boolean
    size?: number
    x?: number
    y?: number
  }): SceneCell {
    const size = options.size ?? 54
    return {
      id: options.id,
      type: 'cell',
      position: { x: options.x ?? 0, y: options.y ?? 0 },
      size: { width: size, height: size },
      value: options.value,
      row: options.row,
      col: options.col,
      state: {
        role: options.role ?? 'idle',
        color: options.color ?? 'muted',
        pulse: options.pulse ?? false,
      }
    }
  }
}

// ==========================================
// 2. 辅助描述单元 (Auxiliary Units)
// ==========================================

export const AuxiliaryUnit = {
  /**
   * 创建箭头连线 (Arrow / Edge)
   * 带有流向控制、虚实、弧线、颜色高亮、过渡等辅助信息
   */
  arrow(options: {
    id: string
    fromEntity: string
    fromPort?: string
    toEntity: string
    toPort?: string
    directed?: boolean
    dashed?: boolean
    curved?: boolean
    thickness?: number
    color?: ActionColor
    label?: string
    pulse?: boolean
    variant?: string
  }): SceneEdge {
    return {
      id: options.id,
      type: 'edge',
      from: { entityId: options.fromEntity, portId: options.fromPort ?? 'next' },
      to: { entityId: options.toEntity, portId: options.toPort ?? 'input' },
      directed: options.directed ?? true,
      label: options.label,
      variant: options.variant,
      style: {
        dashed: options.dashed ?? false,
        curved: options.curved ?? false,
        thickness: options.thickness ?? 2,
        color: options.color ?? 'muted'
      },
      state: {
        role: options.pulse ? 'active' : 'idle',
        color: options.color ?? 'muted',
        pulse: options.pulse ?? false
      }
    }
  },

  /**
   * 创建指针描述 (Pointer / Variable Indicator)
   * e.g., 'head', 'tail', 'cur', 'slow', 'fast' 指向某个基础单元的某个端口
   */
  pointer(options: {
    id: string
    label: string
    targetEntity: string
    targetPort?: string
    color?: ActionColor
    pulse?: boolean
  }): ScenePointer {
    return {
      id: options.id,
      type: 'pointer',
      label: options.label,
      target: { entityId: options.targetEntity, portId: options.targetPort },
      state: {
        role: options.pulse ? 'active' : 'idle',
        color: options.color ?? 'primary',
        pulse: options.pulse ?? false
      }
    }
  },

  /**
   * 创建说明文本/公式标签 (Label / Equation Label)
   * 用于在图表中悬挂展示变量值、转移公式等信息
   */
  label(options: {
    id: string
    text: string
    targetEntity?: string
    targetPort?: string
    color?: ActionColor
    x?: number
    y?: number
  }): SceneLabel {
    return {
      id: options.id,
      type: 'label',
      text: options.text,
      position: { x: options.x ?? 0, y: options.y ?? 0 },
      target: options.targetEntity ? { entityId: options.targetEntity, portId: options.targetPort } : undefined,
      state: {
        role: 'idle',
        color: options.color ?? 'primary'
      }
    }
  }
}

// ==========================================
// 3. 过渡与状态规则 (Transition & Visual Decors)
// ==========================================

export const VisualDecorator = {
  /**
   * 单元高亮：比如设置为当前计算、待选、排序完成、冲突等角色
   */
  highlight(state: SceneEntityState): SceneEntityState {
    return {
      ...state,
      pulse: true
    }
  },

  /**
   * 特殊符号常量，辅助描述特定算法状态
   */
  Symbols: {
    QUEEN: '♛',
    CHECK: '✓',
    CROSS: '✗',
    ARROW_RIGHT: '→',
    INFINITY: '∞'
  }
}
