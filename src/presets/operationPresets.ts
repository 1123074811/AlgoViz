import type { AnimationScript, AnimationStep, ActionColor } from '@/types/animation'
import { makeStep } from './utils'
import { createLinkedListNode, createTreeNode } from '@/scene/variants/nodeVariants'
import { createGraphNode } from '@/scene/variants/graphNodeVariants'
import { createEdge } from '@/scene/variants/edgeVariants'

export interface OperationDef {
  id: 'insert' | 'delete' | 'update' | 'search' | 'range_query'
  label: string
  labelEn: string
  code: Record<string, string>
  script: AnimationScript
}

function edgeId(from: string, port: string, to: string) {
  return `e_${from}_${port}_${to}`
}

function graphEdgeId(source: string, target: string) {
  return `e_${source}_center_${target}`
}

export const DATA_STRUCTURE_OPERATIONS: Record<string, OperationDef[]> = {
  linked_list: [
    {
      id: 'insert',
      label: '插入节点 (增)',
      labelEn: 'Insert Node (Add)',
      code: {
        python: `def insert_after(prev_node, new_value):
    if prev_node is None: return
    new_node = ListNode(new_value)
    new_node.next = prev_node.next
    prev_node.next = new_node`,
        javascript: `function insertAfter(prevNode, newValue) {
    if (!prevNode) return;
    const newNode = new ListNode(newValue);
    newNode.next = prevNode.next;
    prevNode.next = newNode;
}`,
        cpp: `void insertAfter(Node* prevNode, int newValue) {
    if (prevNode == nullptr) return;
    Node* newNode = new Node(newValue);
    newNode->next = prevNode->next;
    prevNode->next = newNode;
}`,
        java: `public void insertAfter(Node prevNode, int newValue) {
    if (prevNode == null) return;
    Node newNode = new Node(newValue);
    newNode.next = prevNode.next;
    prevNode.next = newNode;
}`
      },
      script: {
        algorithm: 'linked_list',
        complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(1)' },
        presentation: { engine: 'scene', module: 'linked_list', variant: 'singly' },
        initialState: { type: 'linked_list', data: [1, 2, 3] },
        steps: [
          {
            stepId: 1, codeLine: 0,
            description: { zh: '初始单链表: 1 → 2 → 3', en: 'Initial list: 1 → 2 → 3' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'linked_list.create', variant: 'singly', nodes: [{ id: 'n1', value: 1 }, { id: 'n2', value: 2 }, { id: 'n3', value: 3 }], headId: 'n1' }
            ],
            stats: { comparisons: 0, swaps: 0, accesses: 0 }
          },
          {
            stepId: 2, codeLine: 2,
            description: { zh: '分配新节点 5 的内存空间并初始化其值为 5', en: 'Allocate memory for new node 5 and initialize its value' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'scene.highlight', entityId: 'n2', role: 'active', color: 'warning' },
              { type: 'scene.note', text: '分配新节点 5 内存' },
              { type: 'linked_list.insert_after', targetNodeId: 'n2', newNode: { id: 'n5', value: 5 } }
            ],
            stats: { comparisons: 0, swaps: 0, accesses: 1 }
          },
          {
            stepId: 3, codeLine: 4,
            description: { zh: '执行插入完毕！链表成功更新为: 1 → 2 → 5 → 3', en: 'Insertion finished! List updated to: 1 → 2 → 5 → 3' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'scene.clear_highlight' },
              { type: 'scene.highlight', entityId: 'n5', role: 'current', color: 'success' }
            ],
            stats: { comparisons: 0, swaps: 0, accesses: 1 }
          }
        ]
      }
    },
    {
      id: 'delete',
      label: '删除节点 (删)',
      labelEn: 'Delete Node (Delete)',
      code: {
        python: `def delete_node(prev_node):
    if prev_node is None or prev_node.next is None:
        return
    target = prev_node.next
    prev_node.next = target.next
    # target memory is freed`,
        javascript: `function deleteNode(prevNode) {
    if (!prevNode || !prevNode.next) return;
    const target = prevNode.next;
    prevNode.next = target.next;
}`,
        cpp: `void deleteNode(Node* prevNode) {
    if (prevNode == nullptr || prevNode->next == nullptr) return;
    Node* target = prevNode->next;
    prevNode->next = target->next;
    delete target;
}`,
        java: `public void deleteNode(Node prevNode) {
    if (prevNode == null || prevNode.next == null) return;
    Node target = prevNode.next;
    prevNode.next = target.next;
}`
      },
      script: {
        algorithm: 'linked_list',
        complexity: { time: { best: 'O(1)', average: 'O(1)', worst: 'O(1)' }, space: 'O(1)' },
        presentation: { engine: 'scene', module: 'linked_list', variant: 'singly' },
        initialState: { type: 'linked_list', data: [1, 2, 3] },
        steps: [
          {
            stepId: 1, codeLine: 0,
            description: { zh: '初始链表: 1 → 2 → 3，准备删除节点 2 后面的节点 3', en: 'Initial list: 1 → 2 → 3, prepare to delete node 3 after 2' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'linked_list.create', variant: 'singly', nodes: [{ id: 'n1', value: 1 }, { id: 'n2', value: 2 }, { id: 'n3', value: 3 }], headId: 'n1' }
            ],
            stats: { comparisons: 0, swaps: 0, accesses: 0 }
          },
          {
            stepId: 2, codeLine: 4,
            description: { zh: '更新指针：将节点 2 的 next 指向目标节点 3 的 next (null)', en: 'Update pointer: point node 2 next to target node 3 next (null)' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'scene.highlight', entityId: 'n2', role: 'active', color: 'warning' },
              { type: 'linked_list.delete', nodeId: 'n3' }
            ],
            stats: { comparisons: 0, swaps: 0, accesses: 1 }
          },
          {
            stepId: 3, codeLine: 5,
            description: { zh: '删除成功！节点已移除，链表更新为: 1 → 2', en: 'Deleted successfully! Node removed, list: 1 → 2' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'scene.clear_highlight' }
            ],
            stats: { comparisons: 0, swaps: 0, accesses: 1 }
          }
        ]
      }
    },
    {
      id: 'update',
      label: '修改数值 (改)',
      labelEn: 'Update Value (Update)',
      code: {
        python: `def update_value(head, target_val, new_val):
    cur = head
    while cur is not None:
        if cur.value == target_val:
            cur.value = new_val
            return True
        cur = cur.next
    return False`,
        javascript: `function updateValue(head, targetVal, newVal) {
    let cur = head;
    while (cur !== null) {
        if (cur.value === targetVal) {
            cur.value = newVal;
            return true;
        }
        cur = cur.next;
    }
    return false;
}`,
        cpp: `bool updateValue(Node* head, int targetVal, int newVal) {
    Node* cur = head;
    while (cur != nullptr) {
        if (cur->value == targetVal) {
            cur->value = newVal;
            return true;
        }
        cur = cur->next;
    }
    return false;
}`,
        java: `public boolean updateValue(Node head, int targetVal, int newVal) {
    Node cur = head;
    while (cur != null) {
        if (cur.value == targetVal) {
            cur.value = newVal;
            return true;
        }
        cur = cur.next;
    }
    return false;
}`
      },
      script: {
        algorithm: 'linked_list',
        complexity: { time: { best: 'O(1)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' },
        presentation: { engine: 'scene', module: 'linked_list', variant: 'singly' },
        initialState: { type: 'linked_list', data: [1, 2, 3] },
        steps: [
          {
            stepId: 1, codeLine: 0,
            description: { zh: '初始链表: 1 → 2 → 3，准备将节点 2 的值修改为 99', en: 'Initial list: 1 → 2 → 3, prepare to update value of node 2 to 99' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'linked_list.create', variant: 'singly', nodes: [{ id: 'n1', value: 1 }, { id: 'n2', value: 2 }, { id: 'n3', value: 3 }], headId: 'n1' }
            ],
            stats: { comparisons: 0, swaps: 0, accesses: 0 }
          },
          {
            stepId: 2, codeLine: 3,
            description: { zh: '查找节点：指针 cur 指向节点 1', en: 'Search node: pointer cur pointing to node 1' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'linked_list.visit', nodeId: 'n1', pointerId: 'cur' }
            ],
            stats: { comparisons: 1, swaps: 0, accesses: 1 }
          },
          {
            stepId: 3, codeLine: 3,
            description: { zh: '未找到，cur 移动到节点 2', en: 'Not found, move cur to node 2' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'linked_list.visit', nodeId: 'n2', pointerId: 'cur' }
            ],
            stats: { comparisons: 2, swaps: 0, accesses: 2 }
          },
          {
            stepId: 4, codeLine: 5,
            description: { zh: '找到目标节点！执行赋值修改，将数值更新为 99', en: 'Target node found! Overwrite and update value to 99' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'scene.clear_highlight' },
              { type: 'scene.highlight', entityId: 'n2', role: 'current', color: 'primary' },
              { type: 'scene.note', text: '更新节点值为 99' }
            ],
            stats: { comparisons: 2, swaps: 0, accesses: 3 }
          }
        ]
      }
    },
    {
      id: 'search',
      label: '查找节点 (查)',
      labelEn: 'Search Node (Search)',
      code: {
        python: `def search_list(head, target):
    cur = head
    while cur is not None:
        if cur.value == target:
            return cur  # Found
        cur = cur.next
    return None  # Not Found`,
        javascript: `function searchList(head, target) {
    let cur = head;
    while (cur !== null) {
        if (cur.value === target) {
            return cur; // Found
        }
        cur = cur.next;
    }
    return null; // Not Found
}`,
        cpp: `Node* searchList(Node* head, int target) {
    Node* cur = head;
    while (cur != nullptr) {
        if (cur->value == target) {
            return cur; // Found
        }
        cur = cur->next;
    }
    return nullptr; // Not Found
}`,
        java: `public Node searchList(Node head, int target) {
    Node cur = head;
    while (cur != null) {
        if (cur.value == target) {
            return cur; // Found
        }
        cur = cur.next;
    }
    return null; // Not Found
}`
      },
      script: {
        algorithm: 'linked_list',
        complexity: { time: { best: 'O(1)', average: 'O(n)', worst: 'O(n)' }, space: 'O(1)' },
        presentation: { engine: 'scene', module: 'linked_list', variant: 'singly' },
        initialState: { type: 'linked_list', data: [1, 2, 3] },
        steps: [
          {
            stepId: 1, codeLine: 0,
            description: { zh: '初始链表: 1 → 2 → 3，开始检索目标值 3', en: 'Initial list: 1 → 2 → 3, search target value 3' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'linked_list.create', variant: 'singly', nodes: [{ id: 'n1', value: 1 }, { id: 'n2', value: 2 }, { id: 'n3', value: 3 }], headId: 'n1' }
            ],
            stats: { comparisons: 0, swaps: 0, accesses: 0 }
          },
          {
            stepId: 2, codeLine: 3,
            description: { zh: '比较首节点 1 != 3，继续向后遍历', en: 'Compare node 1 != 3, move forward' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'linked_list.visit', nodeId: 'n1', pointerId: 'cur' }
            ],
            stats: { comparisons: 1, swaps: 0, accesses: 1 }
          },
          {
            stepId: 3, codeLine: 3,
            description: { zh: '比较第二节点 2 != 3，继续向后遍历', en: 'Compare node 2 != 3, move forward' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'linked_list.visit', nodeId: 'n2', pointerId: 'cur' }
            ],
            stats: { comparisons: 2, swaps: 0, accesses: 2 }
          },
          {
            stepId: 4, codeLine: 4,
            description: { zh: '节点 3 == 3 匹配成功！检索完毕并返回节点 3', en: 'Compare node 3 == 3: match success! Search completes' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'linked_list.visit', nodeId: 'n3', pointerId: 'cur' },
              { type: 'scene.highlight', entityId: 'n3', role: 'safe', color: 'success' }
            ],
            stats: { comparisons: 3, swaps: 0, accesses: 3 }
          }
        ]
      }
    }
  ],
  bst: [
    {
      id: 'insert',
      label: '插入节点 (增)',
      labelEn: 'Insert Node (Add)',
      code: {
        python: `def insert(root, val):
    if root is None:
        return TreeNode(val)
    if val < root.val:
        root.left = insert(root.left, val)
    else:
        root.right = insert(root.right, val)
    return root`,
        javascript: `function insert(root, val) {
    if (root === null) return new TreeNode(val);
    if (val < root.val) {
        root.left = insert(root.left, val);
    } else {
        root.right = insert(root.right, val);
    }
    return root;
}`,
        cpp: `TreeNode* insert(TreeNode* root, int val) {
    if (root == nullptr) return new TreeNode(val);
    if (val < root->val) root->left = insert(root->left, val);
    else root->right = insert(root->right, val);
    return root;
}`,
        java: `public TreeNode insert(TreeNode root, int val) {
    if (root == null) return new TreeNode(val);
    if (val < root.val) root.left = insert(root.left, val);
    else root.right = insert(root.right, val);
    return root;
}`
      },
      script: {
        algorithm: 'bst',
        complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(n)' }, space: 'O(n)' },
        presentation: { engine: 'scene', module: 'tree', variant: 'bst' },
        initialState: { type: 'tree', data: [8, 3, 10, 1, 6, 0, 14] },
        steps: [
          {
            stepId: 1, codeLine: 0,
            description: { zh: '初始 BST 树，准备插入新值 5', en: 'Initial BST, prepare to insert new value 5' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'tree.create', variant: 'bst', rootId: '0', nodes: [{ id: '0', value: 8 }, { id: '1', value: 3 }, { id: '2', value: 10 }, { id: '3', value: 1 }, { id: '4', value: 6 }, { id: '6', value: 14 }], edges: [{ parentId: '0', childId: '1', port: 'left' }, { parentId: '0', childId: '2', port: 'right' }, { parentId: '1', childId: '3', port: 'left' }, { parentId: '1', childId: '4', port: 'right' }, { parentId: '2', childId: '6', port: 'right' }] }
            ],
            stats: { comparisons: 0, swaps: 0, accesses: 0 }
          },
          {
            stepId: 2, codeLine: 4,
            description: { zh: '5 < 8，向左走，进入左孩子节点 3', en: '5 < 8, go left to node 3' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'tree.compare', nodeId: '0', value: 5, result: 'less' }
            ],
            stats: { comparisons: 1, swaps: 0, accesses: 1 }
          },
          {
            stepId: 3, codeLine: 6,
            description: { zh: '5 > 3，向右走，进入右孩子节点 6', en: '5 > 3, go right to node 6' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'tree.compare', nodeId: '1', value: 5, result: 'greater' }
            ],
            stats: { comparisons: 2, swaps: 0, accesses: 2 }
          },
          {
            stepId: 4, codeLine: 4,
            description: { zh: '5 < 6，向左走。检测到节点 6 的左孩子为空，执行插入', en: '5 < 6, go left. Found empty left child of 6, perform insert' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'tree.compare', nodeId: '4', value: 5, result: 'less' }
            ],
            stats: { comparisons: 3, swaps: 0, accesses: 3 }
          },
          {
            stepId: 5, codeLine: 3,
            description: { zh: '成功将节点 5 插入为节点 6 的左孩子！插入完毕', en: 'Successfully inserted node 5 as left child of 6!' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'tree.insert', parentId: '4', node: { id: '9', value: 5 }, side: 'left' }
            ],
            stats: { comparisons: 3, swaps: 0, accesses: 4 }
          }
        ]
      }
    },
    {
      id: 'delete',
      label: '删除节点 (删)',
      labelEn: 'Delete Node (Delete)',
      code: {
        python: `def delete_node(root, key):
    if root is None: return root
    if key < root.val:
        root.left = delete_node(root.left, key)
    elif key > root.val:
        root.right = delete_node(root.right, key)
    else:
        # Case 1 & 2: 1 child or leaf
        if root.left is None: return root.right
        if root.right is None: return root.left
        # Case 3: 2 children, get successor
        temp = min_value_node(root.right)
        root.val = temp.val
        root.right = delete_node(root.right, temp.val)
    return root`,
        javascript: `function deleteNode(root, key) {
    if (root === null) return null;
    if (key < root.val) root.left = deleteNode(root.left, key);
    else if (key > root.val) root.right = deleteNode(root.right, key);
    else {
        if (root.left === null) return root.right;
        if (root.right === null) return root.left;
        let temp = minValueNode(root.right);
        root.val = temp.val;
        root.right = deleteNode(root.right, temp.val);
    }
    return root;
}`,
        cpp: `TreeNode* deleteNode(TreeNode* root, int key) {
    if (root == nullptr) return root;
    if (key < root->val) root->left = deleteNode(root->left, key);
    else if (key > root->val) root->right = deleteNode(root->right, key);
    else {
        if (root->left == nullptr) return root->right;
        if (root->right == nullptr) return root->left;
        TreeNode* temp = minValueNode(root->right);
        root->val = temp->val;
        root->right = deleteNode(root->right, temp->val);
    }
    return root;
}`,
        java: `public TreeNode deleteNode(TreeNode root, int key) {
    if (root == null) return null;
    if (key < root.val) root.left = deleteNode(root.left, key);
    else if (key > root.val) root.right = deleteNode(root.right, key);
    else {
        if (root.left == null) return root.right;
        if (root.right == null) return root.left;
        TreeNode temp = minValueNode(root.right);
        root.val = temp.val;
        root.right = deleteNode(root.right, temp.val);
    }
    return root;
}`
      },
      script: {
        algorithm: 'bst',
        complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(n)' }, space: 'O(n)' },
        presentation: { engine: 'scene', module: 'tree', variant: 'bst' },
        initialState: { type: 'tree', data: [8, 3, 10, 1, 6, 0, 14] },
        steps: [
          {
            stepId: 1, codeLine: 0,
            description: { zh: '初始 BST 树，准备删除叶子节点 14', en: 'Initial BST, prepare to delete leaf node 14' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'tree.create', variant: 'bst', rootId: '0', nodes: [{ id: '0', value: 8 }, { id: '1', value: 3 }, { id: '2', value: 10 }, { id: '3', value: 1 }, { id: '4', value: 6 }, { id: '6', value: 14 }], edges: [{ parentId: '0', childId: '1', port: 'left' }, { parentId: '0', childId: '2', port: 'right' }, { parentId: '1', childId: '3', port: 'left' }, { parentId: '1', childId: '4', port: 'right' }, { parentId: '2', childId: '6', port: 'right' }] }
            ],
            stats: { comparisons: 0, swaps: 0, accesses: 0 }
          },
          {
            stepId: 2, codeLine: 5,
            description: { zh: '14 > 8，向右走进入节点 10', en: '14 > 8, go right to node 10' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'tree.compare', nodeId: '0', value: 14, result: 'greater' }
            ],
            stats: { comparisons: 1, swaps: 0, accesses: 1 }
          },
          {
            stepId: 3, codeLine: 5,
            description: { zh: '14 > 10，向右走找到目标节点 14', en: '14 > 10, go right to target node 14' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'tree.compare', nodeId: '2', value: 14, result: 'greater' }
            ],
            stats: { comparisons: 2, swaps: 0, accesses: 2 }
          },
          {
            stepId: 4, codeLine: 8,
            description: { zh: '由于节点 14 是叶子节点，断开与其双亲 10 的连线并将其物理释放', en: 'Since node 14 is a leaf, disconnect parent edge and remove' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'tree.delete', nodeId: '6' }
            ],
            stats: { comparisons: 2, swaps: 0, accesses: 3 }
          }
        ]
      }
    },
    {
      id: 'search',
      label: '查找节点 (查)',
      labelEn: 'Search Node (Search)',
      code: {
        python: `def search(root, key):
    if root is None or root.val == key:
        return root
    if key < root.val:
        return search(root.left, key)
    return search(root.right, key)`,
        javascript: `function search(root, key) {
    if (root === null || root.val === key) return root;
    if (key < root.val) return search(root.left, key);
    return search(root.right, key);
}`,
        cpp: `TreeNode* search(TreeNode* root, int key) {
    if (root == nullptr || root->val == key) return root;
    if (key < root->val) return search(root->left, key);
    return search(root->right, key);
}`,
        java: `public TreeNode search(TreeNode root, int key) {
    if (root == null || root.val == key) return root;
    if (key < root.val) return search(root.left, key);
    return search(root.right, key);
}`
      },
      script: {
        algorithm: 'bst',
        complexity: { time: { best: 'O(1)', average: 'O(log n)', worst: 'O(n)' }, space: 'O(n)' },
        presentation: { engine: 'scene', module: 'tree', variant: 'bst' },
        initialState: { type: 'tree', data: [8, 3, 10, 1, 6, 0, 14] },
        steps: [
          {
            stepId: 1, codeLine: 0,
            description: { zh: '初始 BST 树，检索 target=10', en: 'Initial BST, search for target=10' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'tree.create', variant: 'bst', rootId: '0', nodes: [{ id: '0', value: 8 }, { id: '1', value: 3 }, { id: '2', value: 10 }, { id: '3', value: 1 }, { id: '4', value: 6 }, { id: '6', value: 14 }], edges: [{ parentId: '0', childId: '1', port: 'left' }, { parentId: '0', childId: '2', port: 'right' }, { parentId: '1', childId: '3', port: 'left' }, { parentId: '1', childId: '4', port: 'right' }, { parentId: '2', childId: '6', port: 'right' }] }
            ],
            stats: { comparisons: 0, swaps: 0, accesses: 0 }
          },
          {
            stepId: 2, codeLine: 4,
            description: { zh: '比较 10 > 8，向右走进入右孩子节点 10', en: 'Compare 10 > 8, go right to node 10' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'tree.compare', nodeId: '0', value: 10, result: 'greater' }
            ],
            stats: { comparisons: 1, swaps: 0, accesses: 1 }
          },
          {
            stepId: 3, codeLine: 2,
            description: { zh: '节点值 10 == 10 命中！检索成功并返回节点 10', en: 'Compare 10 == 10: Match! Return target node 10' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'tree.visit', nodeId: '2' },
              { type: 'scene.highlight', entityId: '2', role: 'safe', color: 'success' }
            ],
            stats: { comparisons: 2, swaps: 0, accesses: 2 }
          }
        ]
      }
    }
  ],
  btree: [
    {
      id: 'search',
      label: '查找关键码 (查)',
      labelEn: 'Search Key (Search)',
      code: {
        python: `def search(node, key):
    i = 0
    while i < len(node.keys) and key > node.keys[i]:
        i += 1
    if i < len(node.keys) and node.keys[i] == key:
        return (node, i)
    if node.leaf:
        return None
    return search(node.children[i], key)`,
        javascript: `function search(node, key) {
    let i = 0;
    while (i < node.keys.length && key > node.keys[i]) i++;
    if (i < node.keys.length && node.keys[i] === key)
        return { node, i };
    if (node.leaf) return null;
    return search(node.children[i], key);
}`,
        cpp: `pair<BTreeNode*, int> search(BTreeNode* node, int key) {
    int i = 0;
    while (i < node->keys.size() && key > node->keys[i]) i++;
    if (i < node->keys.size() && node->keys[i] == key)
        return {node, i};
    if (node->leaf) return {nullptr, -1};
    return search(node->children[i], key);
}`,
        java: `public int[] search(BTreeNode node, int key) {
    int i = 0;
    while (i < node.keys.size() && key > node.keys.get(i)) i++;
    if (i < node.keys.size() && node.keys.get(i) == key)
        return new int[]{i};
    if (node.leaf) return null;
    return search(node.children.get(i), key);
}`
      },
      script: {
        algorithm: 'btree',
        complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(1)' },
        presentation: { engine: 'scene', module: 'tree', variant: 'btree' },
        initialState: { type: 'tree', data: [] },
        steps: [
          {
            stepId: 1, codeLine: 0,
            description: { zh: 'B树 — 多路平衡搜索树。搜索 key=17', en: 'B-Tree — multi-way balanced search tree. Search key=17' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [{
              type: 'tree.create', variant: 'btree', rootId: 'root',
              nodes: [
                { id: 'root', value: '[10, 20, 30]' },
                { id: 'child0', value: '[3, 7]' },
                { id: 'child1', value: '[13, 17]' },
                { id: 'child2', value: '[23, 27]' },
                { id: 'child3', value: '[33, 37]' },
              ],
              edges: [
                { parentId: 'root', childId: 'child0', port: 'child_0' },
                { parentId: 'root', childId: 'child1', port: 'child_1' },
                { parentId: 'root', childId: 'child2', port: 'child_2' },
                { parentId: 'root', childId: 'child3', port: 'child_3' },
              ],
            }],
            stats: { comparisons: 0, swaps: 0, accesses: 0 },
          },
          {
            stepId: 2, codeLine: 2,
            description: { zh: '根节点 [10,20,30] 中比较: 10 ≤ 17 < 20，进入 child_1', en: 'In root [10,20,30]: 10 ≤ 17 < 20, descend to child_1' },
            action: { type: 'highlight', targets: [0], color: 'primary' },
            events: [{ type: 'tree.visit', nodeId: 'root' }],
            stats: { comparisons: 2, swaps: 0, accesses: 1 },
          },
          {
            stepId: 3, codeLine: 5,
            description: { zh: 'child_1 [13,17] 中比较: keys[1]==17 命中！返回 (child_1, 1)', en: 'Child [13,17]: keys[1]==17 match! Return (child_1, 1)' },
            action: { type: 'highlight', targets: [2], color: 'success' },
            events: [{ type: 'tree.visit', nodeId: 'child1' }],
            stats: { comparisons: 2, swaps: 0, accesses: 1 },
          },
        ],
      },
    },
    {
      id: 'insert',
      label: '插入关键码 (增)',
      labelEn: 'Insert Key (Add)',
      code: {
        python: `def insert(root, key):
    if len(root.keys) == 2 * root.t - 1:
        new_root = BTreeNode(root.t)
        new_root.children.append(root)
        split_child(new_root, 0)
        insert_non_full(new_root, key)
        return new_root
    else:
        insert_non_full(root, key)
        return root

def insert_non_full(node, key):
    i = len(node.keys) - 1
    if node.leaf:
        while i >= 0 and key < node.keys[i]:
            i -= 1
        node.keys.insert(i + 1, key)
    else:
        while i >= 0 and key < node.keys[i]:
            i -= 1
        i += 1
        if len(node.children[i].keys) == 2 * node.t - 1:
            split_child(node, i)
            if key > node.keys[i]:
                i += 1
        insert_non_full(node.children[i], key)`,
        javascript: `function insert(root, key) {
    if (root.keys.length === 2 * root.t - 1) {
        const newRoot = new BTreeNode(root.t);
        newRoot.children.push(root);
        splitChild(newRoot, 0);
        insertNonFull(newRoot, key);
        return newRoot;
    } else {
        insertNonFull(root, key);
        return root;
    }
}

function insertNonFull(node, key) {
    let i = node.keys.length - 1;
    if (node.leaf) {
        while (i >= 0 && key < node.keys[i]) i--;
        node.keys.splice(i + 1, 0, key);
    } else {
        while (i >= 0 && key < node.keys[i]) i--;
        i++;
        if (node.children[i].keys.length === 2 * node.t - 1) {
            splitChild(node, i);
            if (key > node.keys[i]) i++;
        }
        insertNonFull(node.children[i], key);
    }
}`,
        cpp: `BTreeNode* insert(BTreeNode* root, int key) {
    if (root->keys.size() == 2 * root->t - 1) {
        BTreeNode* newRoot = new BTreeNode(root->t);
        newRoot->children.push_back(root);
        splitChild(newRoot, 0);
        insertNonFull(newRoot, key);
        return newRoot;
    } else {
        insertNonFull(root, key);
        return root;
    }
}

void insertNonFull(BTreeNode* node, int key) {
    int i = node->keys.size() - 1;
    if (node->leaf) {
        while (i >= 0 && key < node->keys[i]) i--;
        node->keys.insert(node->keys.begin() + i + 1, key);
    } else {
        while (i >= 0 && key < node->keys[i]) i--;
        i++;
        if (node->children[i]->keys.size() == 2 * node->t - 1) {
            splitChild(node, i);
            if (key > node->keys[i]) i++;
        }
        insertNonFull(node->children[i], key);
    }
}`,
        java: `public BTreeNode insert(BTreeNode root, int key) {
    if (root.keys.size() == 2 * root.t - 1) {
        BTreeNode newRoot = new BTreeNode(root.t, false);
        newRoot.children.add(root);
        splitChild(newRoot, 0);
        insertNonFull(newRoot, key);
        return newRoot;
    } else {
        insertNonFull(root, key);
        return root;
    }
}

void insertNonFull(BTreeNode node, int key) {
    int i = node.keys.size() - 1;
    if (node.leaf) {
        while (i >= 0 && key < node.keys.get(i)) i--;
        node.keys.add(i + 1, key);
    } else {
        while (i >= 0 && key < node.keys.get(i)) i--;
        i++;
        if (node.children.get(i).keys.size() == 2 * node.t - 1) {
            splitChild(node, i);
            if (key > node.keys.get(i)) i++;
        }
        insertNonFull(node.children.get(i), key);
    }
}`
      },
      script: {
        algorithm: 'btree',
        complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(1)' },
        presentation: { engine: 'scene', module: 'tree', variant: 'btree' },
        initialState: { type: 'tree', data: [] },
        steps: [
          {
            stepId: 1, codeLine: 0,
            description: { zh: 'B树初始状态，准备插入 key=15', en: 'Initial B-Tree, prepare to insert key=15' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [{
              type: 'tree.create', variant: 'btree', rootId: 'root',
              nodes: [
                { id: 'root', value: '[10, 20, 30]' },
                { id: 'child0', value: '[3, 7]' },
                { id: 'child1', value: '[13, 17]' },
                { id: 'child2', value: '[23, 27]' },
                { id: 'child3', value: '[33, 37]' },
              ],
              edges: [
                { parentId: 'root', childId: 'child0', port: 'child_0' },
                { parentId: 'root', childId: 'child1', port: 'child_1' },
                { parentId: 'root', childId: 'child2', port: 'child_2' },
                { parentId: 'root', childId: 'child3', port: 'child_3' },
              ],
            }],
            stats: { comparisons: 0, swaps: 0, accesses: 0 },
          },
          {
            stepId: 2, codeLine: 2,
            description: { zh: '检查根节点是否已满: len([10,20,30])=3 < 2*t-1=3，根刚好满，需要分裂', en: 'Root full? len([10,20,30])=3 == 2*t-1=3, need to split root' },
            action: { type: 'highlight', targets: [0], color: 'warning' },
            events: [{ type: 'tree.visit', nodeId: 'root' }],
            stats: { comparisons: 1, swaps: 0, accesses: 1 },
          },
          {
            stepId: 3, codeLine: 3,
            description: { zh: '创建新根，split_child 后根变为 [20]，插入 15 到左孩子 [10] 所属的 child_1', en: 'Create new root, after split_child root=[20], insert 15 into left subtree' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'tree.update_metadata', nodeId: 'root', metadata: { keys: '[20]' } },
              { type: 'tree.update_metadata', nodeId: 'child0', metadata: { keys: '[3, 7]' } },
              { type: 'tree.update_metadata', nodeId: 'child1', metadata: { keys: '[10]' } },
              { type: 'tree.update_metadata', nodeId: 'child2', metadata: { keys: '[23, 27]' } },
              { type: 'tree.update_metadata', nodeId: 'child3', metadata: { keys: '[33, 37]' } },
              { type: 'tree.update_metadata', nodeId: 'child1_new', metadata: { keys: '[13, 15, 17]' } },
            ],
            stats: { comparisons: 2, swaps: 2, accesses: 4 },
          },
          {
            stepId: 4, codeLine: 13,
            description: { zh: 'insert_non_full: 15 < 20 进入 child_1，在 [13,17] 中找到位置插入 15 → [13,15,17]', en: 'insert_non_full: 15 < 20, go to child_1, insert 15 at correct position → [13,15,17]' },
            action: { type: 'insert', targets: [], color: 'success' },
            events: [{ type: 'tree.visit', nodeId: 'child1' }],
            stats: { comparisons: 3, swaps: 0, accesses: 2 },
          },
          {
            stepId: 5, codeLine: 8,
            description: { zh: '插入完成，B树保持平衡，所有叶子在同一层', en: 'Insert complete, B-Tree stays balanced' },
            action: { type: 'mark', targets: [], color: 'success' },
            events: [{ type: 'scene.clear_highlight' }],
            stats: { comparisons: 0, swaps: 0, accesses: 0 },
          },
        ],
      },
    },
  ],
  bplus_tree: [
    {
      id: 'search',
      label: '查找关键码 (查)',
      labelEn: 'Search Key (Search)',
      code: {
        python: `def search(root, key):
    node = root
    while not node.leaf:
        i = 0
        while i < len(node.keys) and key >= node.keys[i]:
            i += 1
        node = node.children[i]
    lo, hi = 0, len(node.keys) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if node.keys[mid] == key:
            return node.children[mid]
        elif key < node.keys[mid]:
            hi = mid - 1
        else:
            lo = mid + 1
    return None`,
        javascript: `function search(root, key) {
    let node = root;
    while (!node.leaf) {
        let i = 0;
        while (i < node.keys.length && key >= node.keys[i]) i++;
        node = node.children[i];
    }
    let lo = 0, hi = node.keys.length - 1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (node.keys[mid] === key) return node.children[mid];
        if (key < node.keys[mid]) hi = mid - 1;
        else lo = mid + 1;
    }
    return null;
}`,
        cpp: `int search(BPlusNode* root, int key) {
    BPlusNode* node = root;
    while (!node->leaf) {
        int i = 0;
        while (i < node->keys.size() && key >= node->keys[i]) i++;
        node = node->children[i];
    }
    int lo = 0, hi = node->keys.size() - 1;
    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        if (node->keys[mid] == key) return mid;
        if (key < node->keys[mid]) hi = mid - 1;
        else lo = mid + 1;
    }
    return -1;
}`,
        java: `public int search(BPlusNode root, int key) {
    BPlusNode node = root;
    while (!node.leaf) {
        int i = 0;
        while (i < node.keys.size() && key >= node.keys.get(i)) i++;
        node = node.children.get(i);
    }
    int lo = 0, hi = node.keys.size() - 1;
    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        if (node.keys.get(mid) == key) return mid;
        if (key < node.keys.get(mid)) hi = mid - 1;
        else lo = mid + 1;
    }
    return -1;
}`
      },
      script: {
        algorithm: 'bplus_tree',
        complexity: { time: { best: 'O(log n)', average: 'O(log n)', worst: 'O(log n)' }, space: 'O(1)' },
        presentation: { engine: 'scene', module: 'tree', variant: 'btree' },
        initialState: { type: 'tree', data: [] },
        steps: [
          {
            stepId: 1, codeLine: 0,
            description: { zh: 'B+树 — 内部节点存路由，数据全在叶子。搜索 key=45', en: 'B+ Tree — internal nodes route, data in leaves. Search key=45' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [{
              type: 'tree.create', variant: 'btree', rootId: 'internal_0',
              nodes: [
                { id: 'internal_0', value: '[30, 60]' },
                { id: 'internal_1', value: '[10, 20]' },
                { id: 'internal_2', value: '[40, 50]' },
                { id: 'leaf_0', value: '[10, 20]' },
                { id: 'leaf_1', value: '[30, 35]' },
                { id: 'leaf_2', value: '[40, 45]' },
                { id: 'leaf_3', value: '[50, 60]' },
              ],
              edges: [
                { parentId: 'internal_0', childId: 'internal_1', port: 'child_0' },
                { parentId: 'internal_0', childId: 'internal_2', port: 'child_1' },
                { parentId: 'internal_1', childId: 'leaf_0', port: 'child_0' },
                { parentId: 'internal_1', childId: 'leaf_1', port: 'child_1' },
                { parentId: 'internal_2', childId: 'leaf_2', port: 'child_0' },
                { parentId: 'internal_2', childId: 'leaf_3', port: 'child_1' },
              ],
            }],
            stats: { comparisons: 0, swaps: 0, accesses: 0 },
          },
          {
            stepId: 2, codeLine: 3,
            description: { zh: '从根 [30,60] 开始: 30 ≤ 45 < 60，进入 child_1 → internal_2 [40,50]', en: 'From root [30,60]: 30 ≤ 45 < 60, go child_1 → internal_2 [40,50]' },
            action: { type: 'highlight', targets: [0], color: 'primary' },
            events: [{ type: 'tree.visit', nodeId: 'internal_0' }],
            stats: { comparisons: 2, swaps: 0, accesses: 1 },
          },
          {
            stepId: 3, codeLine: 4,
            description: { zh: 'internal_2 [40,50] 中 40 ≤ 45 < 50，进入 leaf_2', en: 'In internal_2 [40,50]: 40 ≤ 45 < 50, go to leaf_2' },
            action: { type: 'highlight', targets: [2], color: 'primary' },
            events: [{ type: 'tree.visit', nodeId: 'internal_2' }],
            stats: { comparisons: 2, swaps: 0, accesses: 1 },
          },
          {
            stepId: 4, codeLine: 7,
            description: { zh: '在叶子 leaf_2 中二分查找: keys[1]==45，命中！返回 children[1]', en: 'Binary search in leaf_2: keys[1]==45, match! Return children[1]' },
            action: { type: 'highlight', targets: [5], color: 'success' },
            events: [{ type: 'tree.visit', nodeId: 'leaf_2' }],
            stats: { comparisons: 2, swaps: 0, accesses: 1 },
          },
        ],
      },
    },
    {
      id: 'range_query',
      label: '范围查询 (查)',
      labelEn: 'Range Query (Search)',
      code: {
        python: `def range_query(root, low, high):
    node = root
    while not node.leaf:
        i = 0
        while i < len(node.keys) and low >= node.keys[i]:
            i += 1
        node = node.children[i]
    result = []
    while node:
        for i in range(len(node.keys)):
            k = node.keys[i]
            if k > high: return result
            if k >= low:
                result.append((k, node.children[i]))
        node = node.next
    return result`,
        javascript: `function rangeQuery(root, low, high) {
    let node = root;
    while (!node.leaf) {
        let i = 0;
        while (i < node.keys.length && low >= node.keys[i]) i++;
        node = node.children[i];
    }
    const result = [];
    while (node) {
        for (let i = 0; i < node.keys.length; i++) {
            const k = node.keys[i];
            if (k > high) return result;
            if (k >= low) result.push([k, node.children[i]]);
        }
        node = node.next;
    }
    return result;
}`,
        cpp: `vector<pair<int,int>> rangeQuery(BPlusNode* root, int low, int high) {
    BPlusNode* node = root;
    while (!node->leaf) {
        int i = 0;
        while (i < node->keys.size() && low >= node->keys[i]) i++;
        node = node->children[i];
    }
    vector<pair<int,int>> result;
    while (node) {
        for (int i = 0; i < node->keys.size(); i++) {
            int k = node->keys[i];
            if (k > high) return result;
            if (k >= low) result.push_back({k, i});
        }
        node = node->next;
    }
    return result;
}`,
        java: `public List<int[]> rangeQuery(BPlusNode root, int low, int high) {
    BPlusNode node = root;
    while (!node.leaf) {
        int i = 0;
        while (i < node.keys.size() && low >= node.keys.get(i)) i++;
        node = node.children.get(i);
    }
    List<int[]> result = new ArrayList<>();
    while (node != null) {
        for (int i = 0; i < node.keys.size(); i++) {
            int k = node.keys.get(i);
            if (k > high) return result;
            if (k >= low) result.add(new int[]{k, i});
        }
        node = node.next;
    }
    return result;
}`
      },
      script: {
        algorithm: 'bplus_tree',
        complexity: { time: { best: 'O(log n + k)', average: 'O(log n + k)', worst: 'O(log n + k)' }, space: 'O(k)' },
        presentation: { engine: 'scene', module: 'tree', variant: 'btree' },
        initialState: { type: 'tree', data: [] },
        steps: [
          {
            stepId: 1, codeLine: 0,
            description: { zh: 'B+树 — 范围查询 range_query(30, 60)', en: 'B+ Tree — Range query range_query(30, 60)' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [{
              type: 'tree.create', variant: 'btree', rootId: 'internal_0',
              nodes: [
                { id: 'internal_0', value: '[30, 60]' },
                { id: 'internal_1', value: '[10, 20]' },
                { id: 'internal_2', value: '[40, 50]' },
                { id: 'leaf_0', value: '[10, 20]' },
                { id: 'leaf_1', value: '[30, 35]' },
                { id: 'leaf_2', value: '[40, 45]' },
                { id: 'leaf_3', value: '[50, 60]' },
              ],
              edges: [
                { parentId: 'internal_0', childId: 'internal_1', port: 'child_0' },
                { parentId: 'internal_0', childId: 'internal_2', port: 'child_1' },
                { parentId: 'internal_1', childId: 'leaf_0', port: 'child_0' },
                { parentId: 'internal_1', childId: 'leaf_1', port: 'child_1' },
                { parentId: 'internal_2', childId: 'leaf_2', port: 'child_0' },
                { parentId: 'internal_2', childId: 'leaf_3', port: 'child_1' },
              ],
            }],
            stats: { comparisons: 0, swaps: 0, accesses: 0 },
          },
          {
            stepId: 2, codeLine: 2,
            description: { zh: '定位起始叶子: 根 [30,60] → low=30 ≥ 30，进入 internal_2 → 40 ≥ 30，进入 leaf_1', en: 'Locate start leaf: root [30,60] → low=30, go to leaf_1 [30,35]' },
            action: { type: 'highlight', targets: [0, 1], color: 'primary' },
            events: [
              { type: 'tree.visit', nodeId: 'internal_0' },
              { type: 'tree.visit', nodeId: 'internal_1' },
            ],
            stats: { comparisons: 3, swaps: 0, accesses: 2 },
          },
          {
            stepId: 3, codeLine: 9,
            description: { zh: '从 leaf_1 [30,35] 开始，沿 next 链表顺序扫描', en: 'Starting from leaf_1 [30,35], follow next linked list' },
            action: { type: 'highlight', targets: [4], color: 'success' },
            events: [{ type: 'tree.visit', nodeId: 'leaf_1' }],
            stats: { comparisons: 0, swaps: 0, accesses: 2 },
          },
          {
            stepId: 4, codeLine: 10,
            description: { zh: '扫描 leaf_2 [40,45]: 40,45 均在 [30,60] 内，加入结果', en: 'Scan leaf_2 [40,45]: 40,45 both in [30,60], added to result' },
            action: { type: 'highlight', targets: [5], color: 'success' },
            events: [{ type: 'tree.visit', nodeId: 'leaf_2' }],
            stats: { comparisons: 0, swaps: 0, accesses: 2 },
          },
          {
            stepId: 5, codeLine: 10,
            description: { zh: '扫描 leaf_3 [50,60]: 50,60 均在 [30,60] 内，加入结果。查询完成', en: 'Scan leaf_3 [50,60]: 50,60 both in range. Done. Result: [30,35,40,45,50,60]' },
            action: { type: 'mark', targets: [], color: 'success' },
            events: [
              { type: 'tree.visit', nodeId: 'leaf_3' },
              { type: 'scene.clear_highlight' },
            ],
            stats: { comparisons: 0, swaps: 0, accesses: 2 },
          },
        ],
      },
    },
  ],
  bfs_graph: [
    {
      id: 'search',
      label: '广度优先搜索 (查)',
      labelEn: 'BFS Traversal (Search)',
      code: {
        python: `def bfs(graph, start):
    visited = set([start])
    queue = deque([start])
    while queue:
        node = queue.popleft()
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)`,
        javascript: `function bfs(graph, start) {
    const visited = new Set([start]);
    const queue = [start];
    while (queue.length) {
        const node = queue.shift();
        for (const neighbor of graph[node]) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        }
    }
}`,
        cpp: `void bfs(int start, vector<vector<int>>& adj) {
    vector<bool> visited(adj.size(), false);
    queue<int> q;
    visited[start] = true; q.push(start);
    while(!q.empty()) {
        int u = q.front(); q.pop();
        for(int v : adj[u]) {
            if(!visited[v]) {
                visited[v] = true; q.push(v);
            }
        }
    }
}`,
        java: `public void bfs(int start, List<List<Integer>> adj) {
    boolean[] visited = new boolean[adj.size()];
    Queue<Integer> q = new LinkedList<>();
    visited[start] = true; q.add(start);
    while(!q.isEmpty()) {
        int u = q.poll();
        for(int v : adj.get(u)) {
            if(!visited[v]) {
                visited[v] = true; q.add(v);
            }
        }
    }
}`
      },
      script: {
        algorithm: 'bfs_graph',
        complexity: { time: { best: 'O(V+E)', average: 'O(V+E)', worst: 'O(V+E)' }, space: 'O(V)' },
        presentation: { engine: 'scene', module: 'graph', layout: 'composite' },
        initialState: {
          type: 'graph',
          data: [],
          nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }],
          edges: [
            { source: 'A', target: 'B' },
            { source: 'B', target: 'C' },
            { source: 'C', target: 'D' },
            { source: 'D', target: 'A' }
          ]
        },
        steps: [
          {
            stepId: 1, codeLine: 0,
            description: { zh: '初始化简单环状有向图 A → B → C → D', en: 'Initial cyclic directed graph: A → B → C → D' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'graph.create', nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' }], edges: [{ id: 'e_A_B', source: 'A', target: 'B' }, { id: 'e_B_C', source: 'B', target: 'C' }, { id: 'e_C_D', source: 'C', target: 'D' }, { id: 'e_D_A', source: 'D', target: 'A' }], directed: true }
            ],
            stats: { comparisons: 0, swaps: 0, accesses: 0 }
          },
          {
            stepId: 2, codeLine: 2,
            description: { zh: '源节点 A 标记为已访问并加入队列 Q', en: 'Source node A marked visited and added to Queue Q' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'graph.enqueue', nodeId: 'A' }
            ],
            stats: { comparisons: 0, swaps: 0, accesses: 1 }
          },
          {
            stepId: 3, codeLine: 5,
            description: { zh: '节点 A 出队，并开始探索 A 的出边', en: 'Node A dequeued, explore A out-edges' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'graph.dequeue', nodeId: 'A' }
            ],
            stats: { comparisons: 0, swaps: 0, accesses: 2 }
          },
          {
            stepId: 4, codeLine: 6,
            description: { zh: '沿着 A → B 进行探索。发现邻居 B 未访问，将其入队 Q', en: 'Explore path A → B. Node B unvisited, enqueue B' },
            action: { type: 'highlight', targets: [], color: 'primary' },
            events: [
              { type: 'graph.visit_edge', source: 'A', target: 'B' },
              { type: 'graph.enqueue', nodeId: 'B' }
            ],
            stats: { comparisons: 1, swaps: 0, accesses: 3 }
          }
        ]
      }
    }
  ]
}

export function getOperationsForAlgo(algoId: string): OperationDef[] | undefined {
  // Map aliases and new operation-level IDs to families
  let key = algoId
  if (algoId === 'doubly_linked_list' || algoId.startsWith('linked_list_')) {
    key = 'linked_list'
  } else if (algoId === 'avl_tree' || algoId === 'red_black_tree' || algoId.startsWith('bst_') || algoId === 'avl_insert') {
    key = 'bst'
  } else if (algoId === 'btree') {
    key = 'btree'
  } else if (algoId === 'bplus_tree') {
    key = 'bplus_tree'
  } else {
    return undefined
  }

  return DATA_STRUCTURE_OPERATIONS[key]
}
