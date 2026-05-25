export interface AlgorithmDefinition {
  id: string
  name: string
  nameEn: string
  inventor: string
  year: string
  reference: string
  definition: string
  definitionEn: string
  procedure: string[]
  procedureEn: string[]
  timeComplexity: { best: string; average: string; worst: string; explanation: string; explanationEn: string }
  spaceComplexity: { value: string; explanation: string; explanationEn: string }
  properties: { stable: boolean; inPlace: boolean; adaptive: boolean }
  useCases: string
  useCasesEn: string
}

export const ALGORITHM_DEFS: Record<string, AlgorithmDefinition> = {
  bubble_sort: {
    id: 'bubble_sort', name: '冒泡排序', nameEn: 'Bubble Sort',
    inventor: 'Unknown (最早记载于 1956 年)',
    year: '1956',
    reference: 'Knuth, D. E. "The Art of Computer Programming, Vol. 3: Sorting and Searching." (1973)',
    definition: '冒泡排序是一种简单的比较排序算法。它重复遍历待排序数列，依次比较相邻的两个元素，如果它们的顺序错误就交换它们的位置。遍历数列的工作重复进行，直到没有需要交换的元素为止。该算法得名于较小的元素会像气泡一样逐渐"浮"到数列的顶端。',
    definitionEn: 'Bubble Sort is a simple comparison-based sorting algorithm. It repeatedly steps through the list, compares adjacent elements, and swaps them if they are in the wrong order. The pass through the list is repeated until no swaps are needed, indicating the list is sorted. The algorithm gets its name because smaller elements "bubble" to the top of the list.',
    procedure: ['从第一个元素开始，比较相邻元素 arr[j] 和 arr[j+1]', '如果 arr[j] > arr[j+1]，交换它们', '移动到下一对相邻元素，重复比较', '每轮遍历后，最大的未排序元素会"冒泡"到正确位置', '重复以上步骤，共进行 n-1 轮', '如果某一轮没有发生任何交换，说明已排序，可提前终止'],
    procedureEn: ['Start from first element, compare adjacent arr[j] and arr[j+1]', 'If arr[j] > arr[j+1], swap them', 'Move to next adjacent pair, repeat comparison', 'After each pass, the largest unsorted element "bubbles" to its correct position', 'Repeat for n-1 passes', 'If a pass has no swaps, the array is sorted — early termination'],
    timeComplexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', explanation: '最好情况：数组已排序，仅需一次遍历检测（加入优化标志）。最坏情况：数组逆序，需要 n(n-1)/2 次比较和交换。', explanationEn: 'Best: already sorted, one pass with optimization flag. Worst: reverse order, n(n-1)/2 comparisons and swaps.' },
    spaceComplexity: { value: 'O(1)', explanation: '原地排序，仅使用常数级额外空间（交换临时变量）', explanationEn: 'In-place sorting, only constant extra space (swap temp variable)' },
    properties: { stable: true, inPlace: true, adaptive: true },
    useCases: '适合小规模数据或教学演示。对于大规模数据效率低下。',
    useCasesEn: 'Suitable for small datasets or educational purposes. Inefficient for large datasets.',
  },
  quick_sort: {
    id: 'quick_sort', name: '快速排序', nameEn: 'Quick Sort',
    inventor: 'C. A. R. Hoare',
    year: '1959',
    reference: 'Hoare, C. A. R. "Quicksort." The Computer Journal 5.1 (1962): 10-16.',
    definition: '快速排序是一种分治算法。它选择一个"基准"（pivot）元素，将数组划分为两部分：小于基准的元素和大于基准的元素，然后递归地对两部分进行排序。快速排序平均性能优秀，是实际应用中最常用的排序算法之一。',
    definitionEn: 'Quick Sort is a divide-and-conquer algorithm. It selects a "pivot" element, partitions the array into elements less than and greater than the pivot, then recursively sorts the partitions. Quick Sort has excellent average performance and is one of the most widely used sorting algorithms in practice.',
    procedure: ['选择基准元素 pivot（通常取第一个或最后一个元素）', '分区：将小于 pivot 的元素移到左边，大于 pivot 的移到右边', '将 pivot 放到正确位置', '递归地对左子数组和右子数组进行快速排序', '当子数组长度 ≤ 1 时递归终止'],
    procedureEn: ['Select pivot element (typically first or last element)', 'Partition: move elements < pivot to left, > pivot to right', 'Place pivot at its correct position', 'Recursively quick-sort left and right subarrays', 'Recursion terminates when subarray length ≤ 1'],
    timeComplexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)', explanation: '平均情况：每次分区将数组大致平分，递归深度 log n，每层 O(n)。最坏情况：每次 pivot 是最大/最小值（如已排序数组取首元素）。', explanationEn: 'Average: pivot roughly splits array in half, recursion depth log n, O(n) per level. Worst: pivot is always min/max (e.g., sorted array with first element pivot).' },
    spaceComplexity: { value: 'O(log n)', explanation: '递归调用栈深度。尾递归优化可降至 O(log n)', explanationEn: 'Recursion call stack depth. Tail recursion optimization reduces to O(log n).' },
    properties: { stable: false, inPlace: true, adaptive: false },
    useCases: '通用排序的首选算法，C 标准库 qsort() 及多数语言内置排序的基础。不适合需要稳定排序的场景。',
    useCasesEn: 'Preferred general-purpose sorting algorithm, basis of C stdlib qsort() and most language built-in sorts. Not suitable when stability is required.',
  },
  dijkstra: {
    id: 'dijkstra', name: 'Dijkstra 最短路径', nameEn: "Dijkstra's Algorithm",
    inventor: 'Edsger W. Dijkstra',
    year: '1956',
    reference: 'Dijkstra, E. W. "A note on two problems in connexion with graphs." Numerische Mathematik 1.1 (1959): 269-271.',
    definition: 'Dijkstra 算法用于在加权图中找到从单个源节点到所有其他节点的最短路径。它使用贪心策略，每次选择当前距离最小的未访问节点，然后更新其邻居的距离。要求所有边的权重为非负。',
    definitionEn: "Dijkstra's algorithm finds the shortest paths from a single source node to all other nodes in a weighted graph. It uses a greedy strategy, selecting the unvisited node with the smallest tentative distance at each step, then updating its neighbors' distances. All edge weights must be non-negative.",
    procedure: ['初始化：dist[source]=0，其他节点 dist=∞', '创建优先队列（最小堆），将 (0, source) 入队', '从优先队列中取出距离最小的节点 u', '若 u 已访问则跳过，否则标记为已访问', '对于 u 的每个邻居 v：若 dist[u] + weight(u,v) < dist[v]，更新 dist[v]', '将 (dist[v], v) 入队，重复步骤 3-5', '优先队列为空时算法结束'],
    procedureEn: ['Init: dist[source]=0, others dist=∞', 'Create min-priority queue, enqueue (0, source)', 'Extract node u with minimum distance from PQ', 'Skip if u already visited, otherwise mark visited', 'For each neighbor v of u: if dist[u] + weight(u,v) < dist[v], update dist[v]', 'Enqueue (dist[v], v), repeat steps 3-5', 'Algorithm ends when PQ is empty'],
    timeComplexity: { best: 'O((V+E) log V)', average: 'O((V+E) log V)', worst: 'O((V+E) log V)', explanation: '使用二叉堆实现优先队列。每个节点最多入队一次，每条边最多执行一次松弛操作。', explanationEn: 'Using binary heap for PQ. Each node enqueued at most once, each edge relaxed at most once.' },
    spaceComplexity: { value: 'O(V)', explanation: '存储距离数组和优先队列', explanationEn: 'Storage for distance array and priority queue.' },
    properties: { stable: false, inPlace: false, adaptive: false },
    useCases: 'GPS 导航、网络路由协议（OSPF）、社交网络最短路径分析。要求无负权边。',
    useCasesEn: 'GPS navigation, network routing (OSPF), social network shortest path. Requires non-negative edge weights.',
  },
  binary_search: {
    id: 'binary_search', name: '二分查找', nameEn: 'Binary Search',
    inventor: 'Unknown (最早记载于公元前 200 年巴比伦数学)',
    year: '~200 BCE',
    reference: 'Knuth, D. E. "The Art of Computer Programming, Vol. 3: Sorting and Searching." (1973), Section 6.2.1.',
    definition: '二分查找是一种在有序数组中查找特定元素的高效算法。它通过反复将搜索范围缩小一半来工作：比较目标值与数组中间元素，根据比较结果将搜索范围缩小到左半部分或右半部分。时间复杂度为 O(log n)。',
    definitionEn: 'Binary Search is an efficient algorithm for finding a target value within a sorted array. It works by repeatedly dividing the search interval in half: compare the target with the middle element, then narrow the search to the left or right half based on the comparison. Time complexity is O(log n).',
    procedure: ['设 left=0, right=n-1', 'while left ≤ right：计算 mid = left + (right-left)/2', '若 arr[mid] == target，返回 mid', '若 arr[mid] < target，left = mid + 1（搜索右半部分）', '若 arr[mid] > target，right = mid - 1（搜索左半部分）', '循环结束仍未找到，返回 -1'],
    procedureEn: ['Set left=0, right=n-1', 'While left ≤ right: compute mid = left + (right-left)/2', 'If arr[mid] == target, return mid', 'If arr[mid] < target, left = mid + 1 (search right half)', 'If arr[mid] > target, right = mid - 1 (search left half)', 'If loop ends without finding, return -1'],
    timeComplexity: { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)', explanation: '每次比较将搜索范围缩小一半，最多需 log₂(n) 次比较。', explanationEn: 'Each comparison halves the search space, at most log₂(n) comparisons needed.' },
    spaceComplexity: { value: 'O(1)', explanation: '迭代版本仅使用常数级额外空间', explanationEn: 'Iterative version uses only constant extra space.' },
    properties: { stable: false, inPlace: true, adaptive: false },
    useCases: '有序数据的高效查找，数据库索引查找，字典搜索。要求数据预先排序。',
    useCasesEn: 'Efficient search in sorted data, database index lookup, dictionary search. Requires pre-sorted data.',
  },
  bfs_graph: {
    id: 'bfs_graph', name: '广度优先搜索', nameEn: 'Breadth-First Search',
    inventor: 'Konrad Zuse (1945), 后由 E. F. Moore (1959) 形式化',
    year: '1959',
    reference: 'Moore, E. F. "The shortest path through a maze." Proc. Int. Symp. on the Theory of Switching (1959).',
    definition: '广度优先搜索是一种图遍历算法，从给定的源节点开始，逐层遍历图中的节点。它使用队列数据结构，先访问距离源节点为 1 的所有节点，然后是距离为 2 的节点，以此类推。BFS 可以找到无权图中从源节点到所有其他节点的最短路径。',
    definitionEn: 'Breadth-First Search is a graph traversal algorithm that explores nodes level by level from a source node. Using a queue, it visits all nodes at distance 1 from the source, then distance 2, and so on. BFS finds the shortest path in unweighted graphs.',
    procedure: ['将源节点加入队列并标记为已访问', '当队列非空：取出队首节点 u', '遍历 u 的所有邻居 v', '若 v 未访问，标记为已访问并加入队列', '重复直到队列为空'],
    procedureEn: ['Enqueue source node and mark visited', 'While queue is not empty: dequeue node u', 'Iterate through all neighbors v of u', 'If v is unvisited, mark visited and enqueue', 'Repeat until queue is empty'],
    timeComplexity: { best: 'O(V+E)', average: 'O(V+E)', worst: 'O(V+E)', explanation: '每个节点入队一次，每条边检查一次。', explanationEn: 'Each node enqueued once, each edge examined once.' },
    spaceComplexity: { value: 'O(V)', explanation: '队列和 visited 集合', explanationEn: 'Queue and visited set storage.' },
    properties: { stable: false, inPlace: false, adaptive: false },
    useCases: '无权图最短路径、连通分量检测、Web 爬虫、社交网络好友推荐。',
    useCasesEn: 'Shortest path in unweighted graphs, connected components, web crawling, social network friend suggestions.',
  },
  dfs_graph: {
    id: 'dfs_graph', name: '深度优先搜索', nameEn: 'Depth-First Search',
    inventor: 'Charles Pierre Trémaux (19世纪), 后由 Tarjan (1972) 推广',
    year: '1972',
    reference: 'Tarjan, R. "Depth-first search and linear graph algorithms." SIAM Journal on Computing 1.2 (1972): 146-160.',
    definition: '深度优先搜索是一种图遍历算法，从给定的源节点开始，尽可能沿着一条路径深入，直到无法继续，然后回溯到上一个分支点，探索其他路径。DFS 是许多重要图算法的基础，包括拓扑排序、强连通分量、桥检测等。',
    definitionEn: 'Depth-First Search is a graph traversal algorithm that explores as far as possible along each branch before backtracking. Starting from a source node, it goes deep, backtracks when stuck, and explores alternative paths. DFS forms the basis of many important graph algorithms.',
    procedure: ['从源节点开始，标记为已访问', '对于当前节点的每个未访问邻居，递归进行 DFS', '当所有邻居都已访问时，回溯到上一层', '重复直到所有可达节点都被访问'],
    procedureEn: ['Start from source node, mark visited', 'For each unvisited neighbor of current node, recursively DFS', 'When all neighbors visited, backtrack to previous level', 'Repeat until all reachable nodes are visited'],
    timeComplexity: { best: 'O(V+E)', average: 'O(V+E)', worst: 'O(V+E)', explanation: '每个节点访问一次，每条边检查一次。', explanationEn: 'Each node visited once, each edge examined once.' },
    spaceComplexity: { value: 'O(V)', explanation: '递归调用栈深度最坏为 O(V)', explanationEn: 'Recursion stack depth worst case O(V).' },
    properties: { stable: false, inPlace: false, adaptive: false },
    useCases: '拓扑排序、强连通分量（Tarjan/Kosaraju）、迷宫生成与求解、环路检测。',
    useCasesEn: 'Topological sorting, SCC (Tarjan/Kosaraju), maze generation/solving, cycle detection.',
  },
}
