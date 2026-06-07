/**
 * 树类别提示词：树（BST/二叉树/AVL 遍历与旋转）+ 堆 / 优先队列。
 */
export const PROMPT: string = `### 树
- \`b.treeCreate('bst'|'binary'|'avl', rootId, nodes, edges)\`；nodes=[{id,value}]，edges=[{parentId,childId}]
- \`b.treeVisit(id)\` / \`b.treeInsert(parentId, {id,value}, side?)\` / \`b.treeCompare(nodeId, value)\` / \`b.treeRotate(rotation, pivotId)\`

### 堆 / 优先队列（heap / priority queue，@type 用 array）
优先队列底层用堆。堆按**完全二叉树**展示：节点 i 的父为 \`floor((i-1)/2)\`、左右子为 \`2i+1\`/\`2i+2\`，下标从 0 起；底部附带"层序数组镜像"。适用于 Dijkstra/Prim 的优先队列、堆排序、Top-K 等。
- \`b.heapCreate(values, variant?)\` 第一步必调，传入初始数组（已满足堆序），variant='min'（默认）或 'max'，决定标题与语义
- \`b.heapPush(value)\` 入堆：把新值追加到末尾 index，并连好父子边（随后用 heapSift 上浮）
- \`b.heapPop()\` 出堆：弹出堆顶（index 0），把末尾元素补到根、移除末尾节点（随后用 heapSift 下沉）
- \`b.heapSift(from, to)\` 上浮/下沉的一次比较交换：交换 index from 与 to 两个槽位的值并高亮（from/to 是数组下标）
- \`b.heapPeek(index)\` 高亮某下标节点（如读取堆顶 index 0）
要点：push 后自己算上浮路径、逐步 heapSift(child, parent)；pop 后自己算下沉路径、逐步 heapSift(parent, child)。下标全程从 0 起、父 i 子 2i+1/2i+2。配合 b.desc 说明每步在比较/交换谁。`
