import type { AnimationScript, AnimationStep, ActionColor } from '@/types/animation'
import { makeStep } from './utils'
import { createLinkedListNode, createTreeNode } from '@/scene/variants/nodeVariants'
import { createGraphNode } from '@/scene/variants/graphNodeVariants'
import { createEdge } from '@/scene/variants/edgeVariants'

export interface OperationDef {
  id: 'insert' | 'delete' | 'update' | 'search'
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
        presentation: { engine: 'scene', module: 'graph' },
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
  } else {
    return undefined
  }
  
  return DATA_STRUCTURE_OPERATIONS[key]
}
