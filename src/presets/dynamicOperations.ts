import type { AnimationScript, AnimationStep } from '@/types/animation'
import { makeStep } from './utils'

// ============================================================================
// 1. Single Linked List Dynamic Operations
// ============================================================================

export function generateDynamicLinkedListOp(
  opId: 'insert' | 'delete' | 'search',
  arr: number[],
  param: number
): AnimationScript {
  const steps: AnimationStep[] = []
  let sid = 1
  const variant = 'singly'

  const nodes = arr.map((val, idx) => ({ id: `n${idx}`, value: val }))
  const headId = nodes[0]?.id || ''

  // 1. Initial State
  if (opId === 'insert') {
    steps.push({
      ...makeStep(sid++, 0,
        `初始单链表: ${arr.join(' → ')}，准备在合适位置插入新值 ${param}`,
        `Initial list: ${arr.join(' → ')}, prepare to insert new value ${param}`,
        'highlight', [], 'primary', 0, 0, 0
      ),
      events: [{ type: 'linked_list.create', variant, nodes, headId }]
    })

    // Let's insert after the middle node
    const insertAfterIdx = Math.max(0, Math.floor((arr.length - 1) / 2))
    const prevNodeId = `n${insertAfterIdx}`
    const prevVal = arr[insertAfterIdx]
    const newNodeId = `n_new`

    steps.push({
      ...makeStep(sid++, 2,
        `分配新节点 ${param} 的内存空间并初始化其值为 ${param}`,
        `Allocate memory for new node ${param} and initialize its value`,
        'highlight', [], 'primary', 0, 0, 1,
        { variables: { 'new_value': param } }
      ),
      events: [
        { type: 'scene.highlight', entityId: prevNodeId, role: 'active', color: 'warning' },
        { type: 'scene.note', text: `分配新节点 ${param} 内存` },
        { type: 'linked_list.insert_after', targetNodeId: prevNodeId, newNode: { id: newNodeId, value: param } }
      ]
    })

    steps.push({
      ...makeStep(sid++, 4,
        `执行插入完毕！链表成功更新，新节点 ${param} 已插入到节点 ${prevVal} 后面`,
        `Insertion finished! New node ${param} inserted after node ${prevVal}`,
        'highlight', [], 'primary', 0, 0, 2
      ),
      events: [
        { type: 'scene.clear_highlight' },
        { type: 'scene.highlight', entityId: newNodeId, role: 'current', color: 'success' }
      ]
    })

  } else if (opId === 'delete') {
    steps.push({
      ...makeStep(sid++, 0,
        `初始链表: ${arr.join(' → ')}，准备删除数值为 ${param} 的节点`,
        `Initial list: ${arr.join(' → ')}, prepare to delete node with value ${param}`,
        'highlight', [], 'primary', 0, 0, 0
      ),
      events: [{ type: 'linked_list.create', variant, nodes, headId }]
    })

    const deleteIdx = arr.indexOf(param)
    if (deleteIdx !== -1) {
      const deleteNodeId = `n${deleteIdx}`
      const prevNodeId = deleteIdx > 0 ? `n${deleteIdx - 1}` : ''

      if (deleteIdx === 0) {
        // Delete head
        steps.push({
          ...makeStep(sid++, 3,
            `删除首节点 ${param}，更新头指针 head 指向下一个节点`,
            `Delete head node ${param}, update head pointer to next`,
            'highlight', [], 'primary', 0, 0, 1
          ),
          events: [
            { type: 'scene.highlight', entityId: deleteNodeId, role: 'active', color: 'danger' },
            { type: 'linked_list.delete', nodeId: deleteNodeId }
          ]
        })
      } else {
        // Delete middle or tail
        steps.push({
          ...makeStep(sid++, 4,
            `找到节点 ${param}，将其前驱节点 ${arr[deleteIdx - 1]} 的 next 指针指向 ${param} 的后继节点`,
            `Found node ${param}, point predecessor ${arr[deleteIdx - 1]} next to successor`,
            'highlight', [], 'primary', 0, 0, 1
          ),
          events: [
            { type: 'scene.highlight', entityId: prevNodeId, role: 'active', color: 'warning' },
            { type: 'linked_list.delete', nodeId: deleteNodeId }
          ]
        })
      }

      steps.push({
        ...makeStep(sid++, 5,
          `删除成功！节点已安全移除`,
          `Deleted successfully! Node safely removed`,
          'highlight', [], 'primary', 0, 0, 2
        ),
        events: [
          { type: 'scene.clear_highlight' }
        ]
      })
    } else {
      // Node not found
      steps.push({
        ...makeStep(sid++, 3,
          `遍历链表未找到数值为 ${param} 的节点，无需进行删除`,
          `Traversed list, node with value ${param} not found. No deletion needed`,
          'highlight', [], 'primary', 0, 0, 1
        ),
        events: [
          { type: 'scene.note', text: `未找到节点 ${param}` }
        ]
      })
    }

  } else {
    // Search
    steps.push({
      ...makeStep(sid++, 0,
        `初始链表: ${arr.join(' → ')}，开始检索目标值 ${param}`,
        `Initial list: ${arr.join(' → ')}, search target value ${param}`,
        'highlight', [], 'primary', 0, 0, 0
      ),
      events: [{ type: 'linked_list.create', variant, nodes, headId }]
    })

    let found = false
    for (let i = 0; i < arr.length; i++) {
      const nodeId = `n${i}`
      const val = arr[i]

      if (val === param) {
        steps.push({
          ...makeStep(sid++, 4,
            `节点值 ${val} === ${param} 匹配成功！检索完毕并返回该节点`,
            `Node value ${val} === ${param} matched! Search completes`,
            'highlight', [], 'primary', 0, 0, i + 1,
            { variables: { 'target': param, 'current': val } }
          ),
          events: [
            { type: 'linked_list.visit', nodeId, pointerId: 'cur' },
            { type: 'scene.highlight', entityId: nodeId, role: 'safe', color: 'success' }
          ]
        })
        found = true
        break
      } else {
        steps.push({
          ...makeStep(sid++, 3,
            `比较节点值 ${val} !== ${param}，继续向后遍历`,
            `Compare node value ${val} !== ${param}, move forward`,
            'highlight', [], 'primary', 0, 0, i + 1,
            { variables: { 'target': param, 'current': val } }
          ),
          events: [
            { type: 'linked_list.visit', nodeId, pointerId: 'cur' }
          ]
        })
      }
    }

    if (!found) {
      steps.push({
        ...makeStep(sid++, 6,
          `已遍历到链表末尾，未找到数值为 ${param} 的节点，检索返回 null`,
          `Reached end of list, value ${param} not found. Return null`,
          'highlight', [], 'primary', 0, 0, arr.length + 1
        ),
        events: [
          { type: 'scene.note', text: `检索未找到 ${param}` }
        ]
      })
    }
  }

  return {
    algorithm: 'linked_list',
    complexity: { time: { best: 'O(1)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' },
    presentation: { engine: 'scene', module: 'linked_list', variant },
    initialState: { type: 'linked_list', data: arr },
    steps
  }
}

// ============================================================================
// 2. BST Tree Dynamic Operations
// ============================================================================

interface TreeNode {
  id: string
  value: number
  left: TreeNode | null
  right: TreeNode | null
  parentId: string | null
}

function buildBST(arr: number[]): {
  root: TreeNode | null
  nodes: { id: string; value: number }[]
  edges: { parentId: string; childId: string; port: 'left' | 'right' }[]
} {
  const nodes: { id: string; value: number }[] = []
  const edges: { parentId: string; childId: string; port: 'left' | 'right' }[] = []
  const nodeMap = new Map<string, TreeNode>()
  let root: TreeNode | null = null

  let nodeCounter = 0
  function insertNode(rootNode: TreeNode | null, val: number): TreeNode {
    if (!rootNode) {
      const id = String(nodeCounter++)
      const node: TreeNode = { id, value: val, left: null, right: null, parentId: null }
      nodeMap.set(id, node)
      return node
    }

    if (val < rootNode.value) {
      if (rootNode.left) {
        insertNode(rootNode.left, val)
      } else {
        const id = String(nodeCounter++)
        const node: TreeNode = { id, value: val, left: null, right: null, parentId: rootNode.id }
        rootNode.left = node
        nodeMap.set(id, node)
        edges.push({ parentId: rootNode.id, childId: id, port: 'left' })
      }
    } else {
      if (rootNode.right) {
        insertNode(rootNode.right, val)
      } else {
        const id = String(nodeCounter++)
        const node: TreeNode = { id, value: val, left: null, right: null, parentId: rootNode.id }
        rootNode.right = node
        nodeMap.set(id, node)
        edges.push({ parentId: rootNode.id, childId: id, port: 'right' })
      }
    }
    return rootNode
  }

  for (const v of arr) {
    if (v === null || v === undefined) continue
    if (!root) {
      root = insertNode(null, v)
    } else {
      insertNode(root, v)
    }
  }

  // Populate list of nodes
  for (const [id, node] of nodeMap) {
    nodes.push({ id, value: node.value })
  }

  return { root, nodes, edges }
}

export function generateDynamicBSTOp(
  opId: 'insert' | 'delete' | 'search',
  arr: number[],
  param: number
): AnimationScript {
  const steps: AnimationStep[] = []
  let sid = 1

  const { root, nodes, edges } = buildBST(arr)

  // 1. Initial State
  if (opId === 'insert') {
    steps.push({
      ...makeStep(sid++, 0,
        `初始 BST 树，准备插入新值 ${param}`,
        `Initial BST, prepare to insert new value ${param}`,
        'highlight', [], 'primary', 0, 0, 0
      ),
      events: [{ type: 'tree.create', variant: 'bst', rootId: root?.id || '0', nodes, edges }]
    })

    let curr = root
    if (!curr) {
      // Empty tree
      steps.push({
        ...makeStep(sid++, 3,
          `树为空，直接将 ${param} 插入为根节点`,
          `Tree is empty, insert ${param} as root node directly`,
          'insert', [], 'success', 0, 0, 1
        ),
        events: [{ type: 'tree.create', variant: 'bst', rootId: '0', nodes: [{ id: '0', value: param }], edges: [] }]
      })
    } else {
      while (curr) {
        const val = curr.value
        
        if (param < val) {
          steps.push({
            ...makeStep(sid++, 4,
              `${param} < ${val}，向左走，比较左孩子节点`,
              `${param} < ${val}, go left to compare with left child`,
              'highlight', [], 'warning', 0, 0, sid
            ),
            events: [{ type: 'tree.compare', nodeId: curr.id, value: param, result: 'less' }]
          })
          if (curr.left) {
            curr = curr.left
          } else {
            // Insert here!
            const newId = `new_node`
            const step = makeStep(sid++, 3,
              `成功将节点 ${param} 插入为节点 ${val} 的左孩子！插入完毕`,
              `Successfully inserted node ${param} as left child of ${val}!`,
              'insert', [arr.length], 'success', 0, 0, sid
            )
            step.action.value = param
            step.action.to = arr.length
            steps.push({
              ...step,
              events: [{ type: 'tree.insert', parentId: curr.id, node: { id: newId, value: param }, side: 'left' }]
            })
            break
          }
        } else {
          steps.push({
            ...makeStep(sid++, 6,
              `${param} ≥ ${val}，向右走，比较右孩子节点`,
              `${param} ≥ ${val}, go right to compare with right child`,
              'highlight', [], 'warning', 0, 0, sid
            ),
            events: [{ type: 'tree.compare', nodeId: curr.id, value: param, result: 'greater' }]
          })
          if (curr.right) {
            curr = curr.right
          } else {
            // Insert here!
            const newId = `new_node`
            const step = makeStep(sid++, 3,
              `成功将节点 ${param} 插入为节点 ${val} 的右孩子！插入完毕`,
              `Successfully inserted node ${param} as right child of ${val}!`,
              'insert', [arr.length], 'success', 0, 0, sid
            )
            step.action.value = param
            step.action.to = arr.length
            steps.push({
              ...step,
              events: [{ type: 'tree.insert', parentId: curr.id, node: { id: newId, value: param }, side: 'right' }]
            })
            break
          }
        }
      }
    }

  } else if (opId === 'delete') {
    steps.push({
      ...makeStep(sid++, 0,
        `初始 BST 树，准备删除值为 ${param} 的节点`,
        `Initial BST, prepare to delete node with value ${param}`,
        'highlight', [], 'primary', 0, 0, 0
      ),
      events: [{ type: 'tree.create', variant: 'bst', rootId: root?.id || '0', nodes, edges }]
    })

    let curr = root
    let foundNode: TreeNode | null = null
    while (curr) {
      const val = curr.value
      if (param === val) {
        foundNode = curr
        break
      } else if (param < val) {
        steps.push({
          ...makeStep(sid++, 3,
            `比较 ${param} < ${val}，向左子树搜寻待删除节点`,
            `Compare ${param} < ${val}, go left`,
            'highlight', [], 'warning', 0, 0, sid
          ),
          events: [{ type: 'tree.compare', nodeId: curr.id, value: param, result: 'less' }]
        })
        curr = curr.left
      } else {
        steps.push({
          ...makeStep(sid++, 3,
            `比较 ${param} > ${val}，向右子树搜寻待删除节点`,
            `Compare ${param} > ${val}, go right`,
            'highlight', [], 'warning', 0, 0, sid
          ),
          events: [{ type: 'tree.compare', nodeId: curr.id, value: param, result: 'greater' }]
        })
        curr = curr.right
      }
    }

    if (foundNode) {
      steps.push({
        ...makeStep(sid++, 7,
          `找到待删除节点 ${param}，准备执行删除操作`,
          `Found target node ${param}, prepare to delete`,
          'highlight', [], 'danger', 0, 0, sid
        ),
        events: [{ type: 'scene.highlight', entityId: foundNode.id, role: 'active', color: 'danger' }]
      })

      if (!foundNode.left || !foundNode.right) {
        const step = makeStep(sid++, 8,
          `该节点至多只有一个孩子，断开与其双亲节点的连接，直接将其释放`,
          `Node has at most one child, disconnect from parent and remove`,
          'delete', [arr.indexOf(param)], 'success', 0, 0, sid
        )
        steps.push({
          ...step,
          events: [{ type: 'tree.delete', nodeId: foundNode.id }]
        })
      } else {
        let succ = foundNode.right
        while (succ.left) succ = succ.left
        
        steps.push({
          ...makeStep(sid++, 10,
            `该节点有两个孩子。找到右子树中的最小后继节点 ${succ.value} 替换当前节点，然后将后继节点删除`,
            `Node has two children. Find successor ${succ.value} in right subtree to replace it, then delete successor`,
            'highlight', [], 'primary', 0, 0, sid
          ),
          events: [
            { type: 'scene.highlight', entityId: succ.id, role: 'active', color: 'warning' }
          ]
        })

        const step = makeStep(sid++, 11,
          `拷贝后继节点值并物理移除后继节点`,
          `Copy successor value and remove successor node`,
          'delete', [arr.indexOf(param)], 'success', 0, 0, sid
        )
        steps.push({
          ...step,
          events: [
            { type: 'tree.delete', nodeId: succ.id }
          ]
        })
      }
    } else {
      steps.push({
        ...makeStep(sid++, 3,
          `未在树中找到值为 ${param} 的节点，无需删除`,
          `Value ${param} not found. No deletion needed`,
          'highlight', [], 'primary', 0, 0, sid
        ),
        events: [{ type: 'scene.note', text: `未找到节点 ${param}` }]
      })
    }

  } else {
    // Search
    steps.push({
      ...makeStep(sid++, 0,
        `初始 BST 树，开始检索目标值 ${param}`,
        `Initial BST, search for target=${param}`,
        'highlight', [], 'primary', 0, 0, 0
      ),
      events: [{ type: 'tree.create', variant: 'bst', rootId: root?.id || '0', nodes, edges }]
    })

    let curr = root
    let found = false
    while (curr) {
      const val = curr.value
      if (param === val) {
        steps.push({
          ...makeStep(sid++, 2,
            `节点值 ${val} === ${param} 匹配成功！检索完毕并返回该节点`,
            `Compare ${val} == ${param}: Match! Return target node ${val}`,
            'highlight', [], 'success', 0, 0, sid
          ),
          events: [
            { type: 'tree.visit', nodeId: curr.id },
            { type: 'scene.highlight', entityId: curr.id, role: 'safe', color: 'success' }
          ]
        })
        found = true
        break
      } else if (param < val) {
        steps.push({
          ...makeStep(sid++, 4,
            `比较 ${param} < ${val}，向左子树搜寻`,
            `Compare ${param} < ${val}, go left`,
            'highlight', [], 'warning', 0, 0, sid
          ),
          events: [{ type: 'tree.compare', nodeId: curr.id, value: param, result: 'less' }]
        })
        curr = curr.left
      } else {
        steps.push({
          ...makeStep(sid++, 5,
            `比较 ${param} > ${val}，向右子树搜寻`,
            `Compare ${param} > ${val}, go right`,
            'highlight', [], 'warning', 0, 0, sid
          ),
          events: [{ type: 'tree.compare', nodeId: curr.id, value: param, result: 'greater' }]
        })
        curr = curr.right
      }
    }

    if (!found) {
      steps.push({
        ...makeStep(sid++, 3,
          `未在二叉搜索树中找到值为 ${param} 的节点`,
          `Value ${param} not found in the BST`,
          'highlight', [], 'primary', 0, 0, sid
        ),
        events: [{ type: 'scene.note', text: `检索未找到 ${param}` }]
      })
    }
  }

  return {
    algorithm: 'bst',
    complexity: { time: { best: 'O(1)', average: 'O(log n)', worst: 'O(n)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'tree', variant: 'bst' },
    initialState: { type: 'tree', data: arr },
    steps
  }
}

// ============================================================================
// 3. B-Tree Dynamic Operations (t=2)
// ============================================================================

interface BTreeNode {
  id: string
  keys: number[]
  children: string[]
  leaf: boolean
}

function buildBTree(arr: number[]): {
  root: BTreeNode | null
  nodeMap: Map<string, BTreeNode>
} {
  const T = 2
  let counter = 0
  const map = new Map<string, BTreeNode>()

  function mkNode(leaf: boolean): BTreeNode {
    const n: BTreeNode = { id: String(counter++), keys: [], children: [], leaf }
    map.set(n.id, n)
    return n
  }

  function splitChild(parent: BTreeNode, i: number) {
    const y = map.get(parent.children[i])!
    const z = mkNode(y.leaf)
    // y had 2*T-1 = 3 keys: [k0, k1, k2]
    // After split: y→[k0], mid=k1→parent, z→[k2]
    z.keys = y.keys.splice(T)       // z gets [k2]
    const mid = y.keys.pop()!       // mid = k1
    if (!y.leaf) z.children = y.children.splice(T)
    parent.keys.splice(i, 0, mid)
    parent.children.splice(i + 1, 0, z.id)
  }

  function insertNonFull(node: BTreeNode, key: number) {
    let i = node.keys.length - 1
    if (node.leaf) {
      while (i >= 0 && key < node.keys[i]) i--
      node.keys.splice(i + 1, 0, key)
    } else {
      while (i >= 0 && key < node.keys[i]) i--
      i++
      let child = map.get(node.children[i])!
      if (child.keys.length === 2 * T - 1) {
        splitChild(node, i)
        if (key > node.keys[i]) i++
        child = map.get(node.children[i])!
      }
      insertNonFull(child, key)
    }
  }

  let root: BTreeNode | null = null
  for (const key of arr) {
    if (key === null || key === undefined || isNaN(key)) continue
    if (!root) {
      root = mkNode(true)
      root.keys.push(key)
    } else {
      if (root.keys.length === 2 * T - 1) {
        const nr = mkNode(false)
        nr.children.push(root.id)
        // split old root
        const y = root
        const z = mkNode(y.leaf)
        z.keys = y.keys.splice(T)
        const mid = y.keys.pop()!
        if (!y.leaf) z.children = y.children.splice(T)
        nr.keys.push(mid)
        nr.children.push(z.id)
        root = nr
      }
      insertNonFull(root, key)
    }
  }
  return { root, nodeMap: map }
}

/** Convert internal B-tree to animation node/edge lists */
function btreeToAnim(nodeMap: Map<string, BTreeNode>) {
  const nodes: { id: string; value: string }[] = []
  const edges: { parentId: string; childId: string; port: string }[] = []
  for (const [id, n] of nodeMap) {
    nodes.push({ id, value: `[${n.keys.join(', ')}]` })
    n.children.forEach((cid, idx) => edges.push({ parentId: id, childId: cid, port: `child_${idx}` }))
  }
  return { nodes, edges }
}

export function generateDynamicBTreeOp(
  opId: 'insert' | 'search',
  arr: number[],
  param: number
): AnimationScript | undefined {
  const T = 2
  if (arr.length === 0) arr = [10, 20, 30, 3, 7, 13, 17, 23, 27, 33, 37]
  const { root, nodeMap } = buildBTree(arr)
  if (!root) return undefined

  const { nodes, edges } = btreeToAnim(nodeMap)
  const steps: AnimationStep[] = []
  let sid = 1

  if (opId === 'search') {
    steps.push({
      ...makeStep(sid++, 0,
        `B树初始状态 (t=${T})，检索 key=${param}`,
        `Initial B-Tree (t=${T}), search for key=${param}`,
        'highlight', [], 'primary', 0, 0, 0
      ),
      events: [{ type: 'tree.create', variant: 'btree', rootId: root.id, nodes, edges }],
    })

    let curr: BTreeNode | null = root
    while (curr) {
      let i = 0
      while (i < curr.keys.length && param > curr.keys[i]) i++
      if (i < curr.keys.length && curr.keys[i] === param) {
        steps.push({
          ...makeStep(sid++, 5,
            `节点 [${curr.keys}] 中 keys[${i}]==${param} 命中！`,
            `Node [${curr.keys}]: keys[${i}]==${param}, match!`,
            'highlight', [], 'success', i + 1, 0, sid
          ),
          events: [{ type: 'tree.visit', nodeId: curr.id }],
        })
        break
      }
      if (curr.leaf) {
        steps.push({
          ...makeStep(sid++, 7,
            `到达叶子 [${curr.keys}]，未找到 ${param}`,
            `Reached leaf [${curr.keys}], ${param} not found`,
            'highlight', [], 'primary', i + 1, 0, sid
          ),
          events: [{ type: 'tree.visit', nodeId: curr.id }, { type: 'scene.note', text: `未找到 ${param}` }],
        })
        break
      }
      steps.push({
        ...makeStep(sid++, 2,
          `节点 [${curr.keys}] 中比较，进入 child_${i}`,
          `Node [${curr.keys}]: descend to child_${i}`,
          'highlight', [], 'primary', i + 1, 0, sid
        ),
        events: [{ type: 'tree.visit', nodeId: curr.id }],
      })
      curr = nodeMap.get(curr.children[i])!
    }
  } else {
    // insert: build tree without param, then show insertion walk
    const baseArr = arr.filter(k => k !== param)
    const pre = buildBTree(baseArr.length > 0 ? baseArr : [10, 20, 30, 3, 7, 13, 17, 23, 27, 33, 37])
    const preRoot = pre.root!
    const preNodes = btreeToAnim(pre.nodeMap)

    steps.push({
      ...makeStep(sid++, 0,
        `B树初始状态 (t=${T})，准备插入 key=${param}`,
        `Initial B-Tree (t=${T}), prepare to insert key=${param}`,
        'highlight', [], 'primary', 0, 0, 0
      ),
      events: [{ type: 'tree.create', variant: 'btree', rootId: preRoot.id, nodes: preNodes.nodes, edges: preNodes.edges }],
    })

    // Walk to leaf
    let curr: BTreeNode | null = preRoot
    while (curr && !curr.leaf) {
      let i = 0
      while (i < curr.keys.length && param > curr.keys[i]) i++
      steps.push({
        ...makeStep(sid++, 17,
          `节点 [${curr.keys}] 中比较，进入 child_${i}`,
          `Node [${curr.keys}]: descend to child_${i}`,
          'highlight', [], 'primary', i + 1, 0, sid
        ),
        events: [{ type: 'tree.visit', nodeId: curr.id }],
      })
      curr = pre.nodeMap.get(curr.children[i])!
    }
    if (curr && curr.leaf) {
      steps.push({
        ...makeStep(sid++, 13,
          `到达叶子 [${curr.keys}]，插入 ${param} → [${[...curr.keys, param].sort((a,b)=>a-b)}]`,
          `Arrived at leaf [${curr.keys}], insert ${param} → [${[...curr.keys, param].sort((a,b)=>a-b)}]`,
          'insert', [], 'success', 0, 0, sid
        ),
        events: [
          { type: 'tree.visit', nodeId: curr.id },
          { type: 'tree.update_metadata', nodeId: curr.id, metadata: { keys: `[${[...curr.keys, param].sort((a,b)=>a-b).join(', ')}]` } },
        ],
      })
      // Show final state
      steps.push({
        ...makeStep(sid++, 8,
          `插入完成, B树保持平衡`,
          `Insert complete, B-Tree stays balanced`,
          'mark', [], 'success', 0, 0, 0
        ),
        events: [{ type: 'scene.clear_highlight' }],
      })
    }
  }

  return {
    algorithm: 'btree',
    complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(n)' },
    presentation: { engine: 'scene', module: 'tree', variant: 'btree' },
    initialState: { type: 'tree', data: arr },
    steps,
  }
}

// ============================================================================
// 4. B+ Tree Dynamic Operations
// ============================================================================

interface BPNode {
  id: string; keys: number[]; children: string[]; leaf: boolean; next: string | null
}

function buildBPlusTree(arr: number[]): { root: BPNode; map: Map<string, BPNode> } {
  const sorted = [...new Set(arr.filter(k => !isNaN(k)))].sort((a, b) => a - b)
  if (sorted.length === 0) sorted.push(10, 20, 30, 35, 40, 45, 50, 60)

  let ctr = 0
  const nextId = (p: string) => `${p}_${ctr++}`
  const map = new Map<string, BPNode>()

  // Build leaves (max 3 keys each)
  const leafNodes: BPNode[] = []
  for (let i = 0; i < sorted.length; i += 3) {
    const ln: BPNode = { id: nextId('leaf'), keys: sorted.slice(i, i + 3), children: [], leaf: true, next: null }
    map.set(ln.id, ln)
    leafNodes.push(ln)
  }
  for (let i = 0; i < leafNodes.length - 1; i++) leafNodes[i].next = leafNodes[i + 1].id

  // Build internal levels bottom-up
  let level = leafNodes
  while (level.length > 1) {
    const parents: BPNode[] = []
    for (let i = 0; i < level.length; i += 3) {
      const grp = level.slice(i, i + 3)
      const p: BPNode = {
        id: nextId('int'),
        keys: grp.slice(1).map(g => g.keys[0]),
        children: grp.map(g => g.id),
        leaf: false,
        next: null,
      }
      map.set(p.id, p)
      parents.push(p)
    }
    level = parents
  }

  return { root: level[0], map }
}

function bpToAnim(map: Map<string, BPNode>) {
  const nodes: { id: string; value: string }[] = []
  const edges: { parentId: string; childId: string; port: string }[] = []
  for (const [id, n] of map) {
    nodes.push({ id, value: `[${n.keys.join(', ')}]` })
    n.children.forEach((cid, idx) => edges.push({ parentId: id, childId: cid, port: `child_${idx}` }))
  }
  return { nodes, edges }
}

export function generateDynamicBPlusTreeOp(
  opId: 'search' | 'range_query',
  arr: number[],
  param: number | string
): AnimationScript | undefined {
  const { root, map } = buildBPlusTree(arr)
  const { nodes, edges } = bpToAnim(map)
  const steps: AnimationStep[] = []
  let sid = 1

  if (opId === 'search') {
    const key = typeof param === 'number' ? param : parseInt(String(param)) || map.get(root.id)!.keys[0] || 30
    steps.push({
      ...makeStep(sid++, 0,
        `B+树初始状态，搜索 key=${key}`,
        `Initial B+ Tree, search for key=${key}`,
        'highlight', [], 'primary', 0, 0, 0
      ),
      events: [{ type: 'tree.create', variant: 'btree', rootId: root.id, nodes, edges }],
    })

    let curr: BPNode | null = root
    while (curr && !curr.leaf) {
      let i = 0
      while (i < curr.keys.length && key >= curr.keys[i]) i++
      steps.push({
        ...makeStep(sid++, 4,
          `内部节点 [${curr.keys}] 中比较，进入 child_${i}`,
          `Internal [${curr.keys}]: descend to child_${i}`,
          'highlight', [], 'primary', i + 1, 0, sid
        ),
        events: [{ type: 'tree.visit', nodeId: curr.id }],
      })
      curr = map.get(curr.children[i])!
    }

    if (curr && curr.leaf) {
      const found = curr.keys.includes(key)
      steps.push({
        ...makeStep(sid++, found ? 10 : 16,
          found ? `叶子 [${curr.keys}] 中找到 ${key}！命中` : `叶子 [${curr.keys}] 中未找到 ${key}`,
          found ? `Found ${key} in leaf [${curr.keys}]!` : `${key} not found in leaf [${curr.keys}]`,
          found ? 'highlight' : 'highlight', [], found ? 'success' : 'primary', found ? 2 : 2, 0, sid
        ),
        events: [
          { type: 'tree.visit', nodeId: curr.id },
          ...(found ? [] : [{ type: 'scene.note' as const, text: `未找到 ${key}` }]),
        ],
      })
    }
  } else {
    const rangeStr = typeof param === 'string' ? param : '20, 50'
    const parts = rangeStr.split(',').map(s => parseInt(s.trim()))
    const low = parts[0], high = parts[1]
    steps.push({
      ...makeStep(sid++, 0,
        `B+树初始状态，范围查询 [${low}, ${high}]`,
        `Initial B+ Tree, range query [${low}, ${high}]`,
        'highlight', [], 'primary', 0, 0, 0
      ),
      events: [{ type: 'tree.create', variant: 'btree', rootId: root.id, nodes, edges }],
    })

    // Navigate to start leaf
    let curr: BPNode | null = root
    while (curr && !curr.leaf) {
      let i = 0
      while (i < curr.keys.length && low >= curr.keys[i]) i++
      steps.push({
        ...makeStep(sid++, 4,
          `内部 [${curr.keys}] 定位 low=${low}，进入 child_${i}`,
          `Internal [${curr.keys}]: locate low=${low}, descend child_${i}`,
          'highlight', [], 'primary', i + 1, 0, sid
        ),
        events: [{ type: 'tree.visit', nodeId: curr.id }],
      })
      curr = map.get(curr.children[i])!
    }

    // Scan leaf chain
    const visited: string[] = []
    let scan: BPNode | null = curr
    while (scan) {
      const inRange = scan.keys.filter(k => k >= low && k <= high)
      if (inRange.length > 0) {
        visited.push(scan.id)
      }
      if (scan.keys.length > 0 && scan.keys[scan.keys.length - 1] > high) break
      scan = scan.next ? map.get(scan.next) ?? null : null
    }

    steps.push({
      ...makeStep(sid++, 10,
        `沿叶子链表扫描: ${visited.map(id => `[${map.get(id)!.keys}]`).join(' → ')}，查询完成`,
        `Scan leaf chain: ${visited.map(id => `[${map.get(id)!.keys}]`).join(' → ')}, done`,
        'highlight', [], 'success', 0, 0, visited.reduce((s, id) => s + map.get(id)!.keys.length, 0)
      ),
      events: [
        ...visited.map(id => ({ type: 'tree.visit' as const, nodeId: id })),
        { type: 'scene.clear_highlight' as const },
      ],
    })
  }

  return {
    algorithm: 'bplus_tree',
    complexity: { time: { best: 'O(log n)', average: 'O(log n + k)', worst: 'O(log n + k)' }, space: 'O(k)' },
    presentation: { engine: 'scene', module: 'tree', variant: 'btree' },
    initialState: { type: 'tree', data: arr },
    steps,
  }
}
