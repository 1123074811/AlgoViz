export interface AlgorithmDefinition {
  id: string; name: string; nameEn: string
  inventor: string; year: string
  definition: string; definitionEn: string
  procedure: string[]; procedureEn: string[]
  timeComplexity: { best: string; average: string; worst: string; explanation: string; explanationEn: string }
  spaceComplexity: { value: string; explanation: string; explanationEn: string }
  properties: { stable: boolean; inPlace: boolean; adaptive: boolean }
  useCases: string; useCasesEn: string
}

const DEF = (id: string, name: string, nameEn: string, inv: string, year: string,
  def: string, defEn: string, proc: string[], procEn: string[],
  tc: [string, string, string, string, string],
  sc: [string, string, string],
  props: [boolean, boolean, boolean],
  use: string, useEn: string): AlgorithmDefinition => ({
  id, name, nameEn, inventor: inv, year, definition: def, definitionEn: defEn,
  procedure: proc, procedureEn: procEn,
  timeComplexity: { best: tc[0], average: tc[1], worst: tc[2], explanation: tc[3], explanationEn: tc[4] },
  spaceComplexity: { value: sc[0], explanation: sc[1], explanationEn: sc[2] },
  properties: { stable: props[0], inPlace: props[1], adaptive: props[2] },
  useCases: use, useCasesEn: useEn,
})

// ---------- 排序算法 ----------
const def_bubble = DEF('bubble_sort', '冒泡排序', 'Bubble Sort', 'Unknown (1956)', '1956',
  '重复遍历数列，比较相邻元素，顺序错误则交换。每轮将最大未排序元素"冒泡"至末尾。', 'Repeatedly steps through the list, compares adjacent elements and swaps them if in wrong order. Each pass bubbles the largest unsorted element to its correct position.',
  ['从首元素开始，比较 arr[j] 和 arr[j+1]', '若 arr[j] > arr[j+1] 则交换', '继续下一对相邻元素', '每轮遍历后最大元素归位，共 n-1 轮', '若某轮无交换则已排序，可提前终止'],
  ['Compare adjacent arr[j] and arr[j+1]', 'Swap if arr[j] > arr[j+1]', 'Move to next pair', 'After each pass, largest element is in place', 'If no swaps in a pass, array is sorted'],
  ['O(n)', 'O(n²)', 'O(n²)', '最好：已排序时仅需一次遍历检测。最坏：逆序需 n(n-1)/2 次比较。', 'Best: one pass with early termination. Worst: n(n-1)/2 comparisons in reverse order.'],
  ['O(1)', '原地排序，仅需常数级交换变量。', 'In-place, only constant extra space for swap temp.'],
  [true, true, true],
  '小规模数据或教学演示。', 'Small datasets, educational purposes.')

const def_selection = DEF('selection_sort', '选择排序', 'Selection Sort', 'Unknown (早期计算机科学)', '1950s',
  '每轮从未排序区间选出最小元素，与未排序区间首元素交换，放到已排序区间末尾。', 'Each pass finds the minimum element from the unsorted part and swaps it with the first unsorted element.',
  ['遍历未排序区间找最小值的索引', '将最小值与未排序区间第一个元素交换', '已排序区间扩大一位，重复上述步骤', '共 n-1 轮，最后元素自动归位'],
  ['Find index of minimum in unsorted portion', 'Swap min with first unsorted element', 'Sorted portion grows by one, repeat', 'After n-1 passes, last element auto-placed'],
  ['O(n²)', 'O(n²)', 'O(n²)', '无论数据分布如何，总是需要 n(n-1)/2 次比较。', 'Always requires n(n-1)/2 comparisons regardless of data distribution.'],
  ['O(1)', '原地排序。', 'In-place sorting.'],
  [false, true, false],
  '写操作少（每轮最多一次交换），适合写成本高的场景。', 'Fewer writes (at most one swap per pass), suitable when writes are expensive.')

const def_insertion = DEF('insertion_sort', '插入排序', 'Insertion Sort', 'Unknown (扑克牌排序法)', '1950s',
  '将未排序元素依次插入已排序序列的合适位置，类似整理扑克牌。适合小规模或近乎有序的数据。', 'Builds the sorted array one item at a time by inserting each new element into its correct position among previously sorted elements.',
  ['从索引 1 开始，将当前元素作为 key', '与已排序区间从右向左比较', '若 key 更小则将比较元素右移', '找到合适位置后插入 key', '重复直到全部有序'],
  ['Start from index 1, current element as key', 'Compare with sorted portion from right to left', 'If key is smaller, shift compared element right', 'Insert key at correct position', 'Repeat until all sorted'],
  ['O(n)', 'O(n²)', 'O(n²)', '最好：已排序时每轮仅一次比较。最坏：逆序时每轮需移动所有已排序元素。', 'Best: one comparison per pass if sorted. Worst: shift all sorted elements each pass.'],
  ['O(1)', '原地排序。', 'In-place sorting.'],
  [true, true, true],
  '小规模数据、近乎有序数据、在线排序（数据流）', 'Small datasets, nearly sorted data, online sorting (streaming).')

const def_shell = DEF('shell_sort', '希尔排序', 'Shell Sort', 'Donald Shell', '1959',
  '插入排序的改进版，通过比较相隔一定间隔(gap)的元素并逐步缩小间隔至 1，使得元素能快速移动到较远位置。', 'An extension of insertion sort that allows exchange of far apart elements by comparing elements with a gap, gradually reducing the gap to 1.',
  ['选择初始间隔 gap = n/2', '对每个 gap 分组进行插入排序', '缩小 gap = gap/2，重复', '直到 gap = 1 时完成最后一次插入排序'],
  ['Choose initial gap = n/2', 'Perform insertion sort on each gap group', 'Reduce gap = gap/2, repeat', 'Final insertion sort when gap = 1'],
  ['O(n log n)', 'O(n^{1.3})', 'O(n²)', '平均复杂度取决于 gap 序列选择。Hibbard 序列可达到 O(n^{1.5})。', 'Average complexity depends on gap sequence. Hibbard sequence achieves O(n^{1.5}).'],
  ['O(1)', '原地排序。', 'In-place sorting.'],
  [false, true, true],
  '中等规模数据，嵌入式系统排序。', 'Medium-sized datasets, embedded systems.')

const def_merge = DEF('merge_sort', '归并排序', 'Merge Sort', 'John von Neumann', '1945',
  '经典的分治排序算法。递归将数组二分至单元素，再自底向上合并有序子数组，保证 O(n log n) 稳定排序。', 'A classic divide-and-conquer algorithm. Recursively divides array into halves, then merges sorted subarrays bottom-up. Guarantees O(n log n) stable sorting.',
  ['若长度≤1 直接返回', '将数组平分为左右两半', '递归对左右归并排序', '合并：双指针遍历，每次取较小者', '剩余元素直接追加'],
  ['Return if length ≤ 1', 'Split into left and right halves', 'Recursively merge-sort each half', 'Merge: two pointers, take smaller each time', 'Append remaining elements'],
  ['O(n log n)', 'O(n log n)', 'O(n log n)', '递归深度 log n，每层合并 O(n)。不受输入数据分布影响。', 'Recursion depth log n, O(n) merge per level. Unaffected by input distribution.'],
  ['O(n)', '合并时需要临时数组。', 'Temporary array needed for merging.'],
  [true, false, false],
  '需要稳定排序的大数据集，外部排序的基础。', 'Large datasets requiring stability, basis of external sorting.')

const def_quick = DEF('quick_sort', '快速排序', 'Quick Sort', 'C. A. R. Hoare', '1959',
  '选取基准元素将数组划分为两部分，递归排序。平均 O(n log n)，实际应用中极为高效。', 'Selects a pivot element to partition the array, then recursively sorts partitions. Averages O(n log n), highly efficient in practice.',
  ['选择基准 pivot', '分区：小于 pivot 的放左边，大于的放右边', 'pivot 归位', '递归排序左右子数组', '子数组长度≤1 时终止'],
  ['Select pivot element', 'Partition: elements < pivot to left, > to right', 'Place pivot at correct position', 'Recursively sort left and right subarrays', 'Stop when subarray length ≤ 1'],
  ['O(n log n)', 'O(n log n)', 'O(n²)', '平均：pivot 大致平分。最坏：pivot 总是极值（如已排序数组取首元素）。随机化 pivot 可避免。', 'Average: pivot roughly splits evenly. Worst: pivot always extreme. Randomized pivot avoids worst case.'],
  ['O(log n)', '递归调用栈深度。', 'Recursion stack depth.'],
  [false, true, false],
  '通用排序首选，多数语言内置排序的基础。', 'Preferred general-purpose sort, basis of most language built-in sorts.')

const def_heap = DEF('heap_sort', '堆排序', 'Heap Sort', 'J. W. J. Williams', '1964',
  '利用最大堆数据结构排序。建堆后反复取堆顶（最大值）与末尾交换并下沉，原地 O(n log n)。', 'Uses a max-heap data structure. After building the heap, repeatedly swaps the root (max) with the last element and sinks. In-place O(n log n).',
  ['建最大堆：从最后非叶节点自底向上堆化', '交换堆顶与末尾元素', '堆大小减 1，堆顶下沉', '重复至堆大小为 1'],
  ['Build max-heap: heapify bottom-up from last non-leaf', 'Swap root with last element', 'Reduce heap size, sink new root', 'Repeat until heap size is 1'],
  ['O(n log n)', 'O(n log n)', 'O(n log n)', '建堆 O(n)，每次堆化 O(log n)，共 n-1 次。', 'Build O(n), each heapify O(log n), n-1 total.'],
  ['O(1)', '原地排序。', 'In-place sorting.'],
  [false, true, false],
  '保证 O(n log n) 且无额外空间的场景，操作系统任务调度。', 'Guaranteed O(n log n) with no extra space, OS task scheduling.')

const def_counting = DEF('counting_sort', '计数排序', 'Counting Sort', 'Harold H. Seward', '1954',
  '非比较排序：统计每个元素的出现次数，再按顺序重建数组。适用于范围较小的整数排序，O(n+k)。', 'Non-comparison sort: counts occurrences of each element, then reconstructs the array in order. Works well for small-range integers, O(n+k).',
  ['找出最大值 k，创建计数数组 count[0..k]', '遍历原数组，count[value]++', '计算前缀和确定每个元素的位置', '反向遍历放置元素到正确位置'],
  ['Find max k, create count array count[0..k]', 'Traverse array, count[value]++', 'Compute prefix sums for positions', 'Place elements backwards for stability'],
  ['O(n+k)', 'O(n+k)', 'O(n+k)', '不受比较下界 Ω(n log n) 限制。k 为数据范围。', 'Not bound by comparison lower bound Ω(n log n). k is data range.'],
  ['O(k)', '需要计数数组。', 'Counting array needed.'],
  [true, false, false],
  '数据范围较小的整数排序。', 'Small-range integer sorting.')

const def_radix = DEF('radix_sort', '基数排序', 'Radix Sort', 'Herman Hollerith (1887)', '1887',
  '按位排序：从最低位到最高位，每位用稳定排序（通常计数排序）。O(d*(n+k))，d 为位数。', 'Digit-by-digit sort from least to most significant digit, using stable sort (usually counting sort) per digit. O(d*(n+k)), d is digit count.',
  ['找出最大值确定位数 d', '从个位开始，每位进行计数排序', '排序结果作为下一位的输入', '最高位排序完成后得到完整排序'],
  ['Find max value to determine digit count d', 'Start from units digit, counting sort per digit', 'Use result as input for next digit', 'After most significant digit, fully sorted'],
  ['O(d*(n+k))', 'O(d*(n+k))', 'O(d*(n+k))', 'd 为位数，k 为基数（通常 10）。', 'd is digit count, k is radix (usually 10).'],
  ['O(n+k)', '每位计数排序需要临时数组。', 'Temporary arrays per digit for counting sort.'],
  [true, false, false],
  '大规模整数/字符串排序，固定长度键值排序。', 'Large-scale integer/string sorting, fixed-length key sorting.')

const def_bucket = DEF('bucket_sort', '桶排序', 'Bucket Sort', 'Unknown (早期分布排序)', '1950s',
  '将元素分布到多个桶中，每个桶内独立排序后合并。在数据均匀分布时接近 O(n)。', 'Distributes elements into buckets, sorts each bucket independently, then concatenates. Approaches O(n) when data is uniformly distributed.',
  ['创建 n 个桶', '遍历数据，根据映射函数放入对应桶', '每个桶内部排序', '按桶顺序合并输出'],
  ['Create n buckets', 'Place each element into its bucket via mapping function', 'Sort each bucket internally', 'Concatenate buckets in order'],
  ['O(n+k)', 'O(n+k)', 'O(n²)', '均匀分布时高效。最坏：所有元素落入同一桶。', 'Efficient when uniform. Worst: all elements in one bucket.'],
  ['O(n+k)', '需要桶的额外空间。', 'Extra space for buckets.'],
  [true, false, false],
  '数据均匀分布的外部排序场景。', 'External sorting when data is uniformly distributed.')

// ---------- 图算法 ----------
const def_bfs = DEF('bfs_graph', '广度优先搜索', 'BFS', 'E. F. Moore', '1959',
  '逐层遍历图节点。使用队列，先访问距离源为 1 的所有节点，再距离为 2 的节点，以此类推。', 'Traverses graph level by level using a queue. Visits all nodes at distance 1 from source, then distance 2, and so on.',
  ['源节点入队，标记已访问', '当队列非空：出队节点 u', '遍历 u 所有邻居 v', '若 v 未访问，标记并入队', '重复直到队列空'],
  ['Enqueue source, mark visited', 'While queue not empty: dequeue node u', 'Iterate all neighbors v of u', 'If v unvisited, mark and enqueue', 'Repeat until queue empty'],
  ['O(V+E)', 'O(V+E)', 'O(V+E)', '每个节点入队一次，每条边检查一次。', 'Each node enqueued once, each edge examined once.'],
  ['O(V)', '队列和 visited 集合。', 'Queue and visited set.'],
  [false, false, false],
  '无权图最短路径、连通分量、Web 爬虫、社交网络推荐。', 'Shortest path in unweighted graphs, connected components, web crawling, social recommendations.')

const def_dfs = DEF('dfs_graph', '深度优先搜索', 'DFS', 'Tarjan (推广)', '1972',
  '尽可能沿一条路径深入到底，然后回溯探索其他分支。是拓扑排序、强连通分量等算法的基础。', 'Explores as far as possible along each branch before backtracking. Basis for topological sort, SCC, and many other graph algorithms.',
  ['从源节点开始，标记为已访问', '对于当前节点的每个未访问邻居，递归 DFS', '所有邻居访问完后回溯', '重复直到所有可达节点已访问'],
  ['Start from source, mark visited', 'For each unvisited neighbor, recursively DFS', 'Backtrack when all neighbors visited', 'Repeat until all reachable nodes visited'],
  ['O(V+E)', 'O(V+E)', 'O(V+E)', '每个节点访问一次，每条边检查一次。', 'Each node visited once, each edge examined once.'],
  ['O(V)', '递归栈深度最坏 O(V)。', 'Recursion stack depth worst case O(V).'],
  [false, false, false],
  '拓扑排序、强连通分量、迷宫生成、环路检测。', 'Topological sort, SCC, maze generation, cycle detection.')

const def_dijkstra = DEF('dijkstra', 'Dijkstra 最短路径', "Dijkstra's Algorithm", 'Edsger W. Dijkstra', '1956',
  '贪心算法：每次选距离最小的未访问节点，更新其邻居距离。用于非负权图的单源最短路径。', 'Greedy algorithm: at each step, select the unvisited node with smallest distance and update its neighbors. Finds single-source shortest paths in graphs with non-negative weights.',
  ['初始化 dist[source]=0, 其余=∞', '最小优先队列入队 (0, source)', '取出最小距离节点 u', '若 u 未访问则标记，更新邻居距离', '队列空时结束'],
  ['Init dist[source]=0, others=∞', 'Enqueue (0, source) into min-PQ', 'Extract node u with min distance', 'If unvisited, mark and update neighbors', 'End when PQ empty'],
  ['O((V+E) log V)', 'O((V+E) log V)', 'O((V+E) log V)', '使用二叉堆优先队列。', 'Using binary heap priority queue.'],
  ['O(V)', '距离数组和优先队列。', 'Distance array and priority queue.'],
  [false, false, false],
  'GPS 导航、网络路由(OSPF)、社交网络分析。要求无负权边。', 'GPS navigation, network routing (OSPF), social network analysis. Requires non-negative weights.')

const def_bellman = DEF('bellman_ford', 'Bellman-Ford', 'Bellman-Ford', 'Bellman, Ford', '1958',
  '动态规划算法：对所有边进行 V-1 轮松弛操作。可处理负权边并检测负环。时间复杂度 O(VE)。', 'DP algorithm: relaxes all edges V-1 times. Handles negative weights and detects negative cycles. O(VE) time complexity.',
  ['初始化 dist[source]=0, 其余=∞', '重复 V-1 次：松弛所有边', '若 dist[u] + w < dist[v] 则更新', '第 V 次检测：若仍可松弛则存在负环'],
  ['Init dist[source]=0, others=∞', 'Repeat V-1 times: relax all edges', 'If dist[u] + w < dist[v], update', 'V-th pass: if any update, negative cycle exists'],
  ['O(VE)', 'O(VE)', 'O(VE)', 'V-1 轮，每轮遍历所有 E 条边。', 'V-1 rounds, each traversing all E edges.'],
  ['O(V)', '距离数组。', 'Distance array.'],
  [false, false, false],
  '含负权边的图、套汇检测(货币兑换)、负环检测。', 'Graphs with negative edges, arbitrage detection, negative cycle detection.')

const def_astar = DEF('a_star', 'A* 搜索', 'A* Search', 'Hart, Nilsson, Raphael', '1968',
  '启发式搜索算法，结合实际代价 g(n) 和预估代价 h(n)，用优先队列选择 f(n)=g(n)+h(n) 最小的路径。', 'Heuristic search combining actual cost g(n) and estimated cost h(n). Uses priority queue to select path with smallest f(n)=g(n)+h(n).',
  ['起点入队，f(start)=h(start)', '取出 f 最小的节点', '若为目标则返回路径', '扩展邻居，更新 g 和 f 值', '重复直到找到目标或队列空'],
  ['Enqueue start, f(start)=h(start)', 'Pop node with min f', 'If goal, return path', 'Expand neighbors, update g and f', 'Repeat until goal found or queue empty'],
  ['O(E)', 'O(E log V)', 'O(E log V)', '取决于启发函数质量。h=0 退化为 Dijkstra。', 'Depends on heuristic quality. h=0 degenerates to Dijkstra.'],
  ['O(V)', '优先队列和 visited 集合。', 'Priority queue and visited set.'],
  [false, false, false],
  '游戏 AI 寻路、机器人路径规划、地图导航。', 'Game AI pathfinding, robot path planning, map navigation.')

const def_floyd = DEF('floyd', 'Floyd-Warshall', 'Floyd-Warshall', 'Floyd, Warshall', '1962',
  '动态规划求所有节点对的最短路径。三重循环 O(V³)，可处理负权边（不含负环）。', 'DP algorithm for all-pairs shortest paths. Triple nested loop O(V³). Handles negative edges (no negative cycles).',
  ['初始化 dist[i][j] = 边权或∞', 'k=0..V-1：以 k 为中间节点', '对于每对 (i,j)，尝试 i→k→j', '若 dist[i][k]+dist[k][j] < dist[i][j] 则更新', '三重循环完成后得到全源最短路径'],
  ['Init dist[i][j] = edge weight or ∞', 'For k=0..V-1: use k as intermediate', 'For each pair (i,j), try i→k→j', 'Update if shorter path found', 'All-pairs shortest paths after triple loop'],
  ['O(V³)', 'O(V³)', 'O(V³)', '三重循环，小图或稠密图适用。', 'Triple loop, suitable for small or dense graphs.'],
  ['O(V²)', '距离矩阵。', 'Distance matrix.'],
  [false, false, false],
  '小规模全源最短路径、传递闭包。', 'Small-scale all-pairs shortest path, transitive closure.')

const def_prim = DEF('prim', 'Prim 最小生成树', "Prim's Algorithm", 'Robert C. Prim', '1957',
  '从任意节点开始，每次选连接已访问集合和未访问集合的最小权重边，加入 MST。', 'Starts from any node, repeatedly adds the minimum-weight edge connecting the visited set to an unvisited node.',
  ['从任意起点开始，标记已访问', '维护最小优先队列存储候选边', '每次选最小权重边', '若目标未访问则加入 MST 并标记', '重复直到所有节点已访问'],
  ['Start from any node, mark visited', 'Maintain min-PQ of candidate edges', 'Select minimum weight edge', 'If target unvisited, add to MST and mark', 'Repeat until all nodes visited'],
  ['O((V+E) log V)', 'O((V+E) log V)', 'O((V+E) log V)', '使用二叉堆。稠密图上效率高。', 'Using binary heap. Efficient on dense graphs.'],
  ['O(V)', 'visited 标记和优先队列。', 'Visited marks and priority queue.'],
  [false, false, false],
  '网络设计、电路布线、聚类分析。稠密图 MST。', 'Network design, circuit wiring, clustering. Dense graph MST.')

const def_kruskal = DEF('kruskal', 'Kruskal 最小生成树', "Kruskal's Algorithm", 'Joseph Kruskal', '1956',
  '所有边按权重排序，依次检查，若连接不同连通分量（不形成环）则加入 MST。使用并查集。', 'Sorts all edges by weight, checks each in order. If an edge connects different components, adds it to MST. Uses Union-Find.',
  ['所有边按权重升序排序', '初始化并查集，每个节点独立', '依次取最小权重边 (u,v)', '若 find(u)≠find(v)，加入MST并union', '重复至 MST 含 V-1 条边'],
  ['Sort all edges by weight ascending', 'Init Union-Find, each node in own set', 'Take min-weight edge (u,v)', 'If find(u)≠find(v), add to MST and union', 'Repeat until MST has V-1 edges'],
  ['O(E log E)', 'O(E log E)', 'O(E log E)', '排序 O(E log E)，并查集近乎 O(1)。稀疏图高效。', 'Sort O(E log E), Union-Find nearly O(1). Efficient on sparse graphs.'],
  ['O(V)', '并查集 parent 数组。', 'Union-Find parent array.'],
  [false, false, false],
  '网络设计、稀疏图 MST。', 'Network design, sparse graph MST.')

const def_topo = DEF('topological_sort', '拓扑排序', 'Topological Sort', 'Kahn (1962)', '1962',
  '对有向无环图(DAG)进行线性排序，使得所有边方向从前到后。使用入度计数 + 队列实现。', 'Linearly orders vertices of a DAG such that all edges go forward. Uses indegree counting + queue.',
  ['计算所有节点入度', '入度为 0 的节点进队列', '出队节点加入拓扑序', '其邻居入度减 1，若变 0 则入队', '队列空时完成（若有剩余则存在环）'],
  ['Compute indegree of all nodes', 'Enqueue nodes with indegree 0', 'Dequeue node, add to topological order', 'Decrement neighbor indegree, enqueue if 0', 'Done when queue empty (remaining nodes = cycle)'],
  ['O(V+E)', 'O(V+E)', 'O(V+E)', '每个节点和边处理一次。', 'Each node and edge processed once.'],
  ['O(V)', '入度数组和队列。', 'Indegree array and queue.'],
  [false, false, false],
  '任务调度、依赖解析、编译器构建顺序。', 'Task scheduling, dependency resolution, compiler build order.')

// ---------- 数据结构 ----------
const def_array = DEF('array', '数组', 'Array', '基础数据结构', '—',
  '连续内存存储，O(1) 随机访问。插入/删除需移动元素 O(n)。最基础的数据结构。', 'Contiguous memory storage with O(1) random access. Insertion/deletion requires shifting elements O(n).',
  ['声明固定大小或动态数组', 'O(1) 下标访问 arr[i]', '插入：目标位置后元素后移 O(n)', '删除：目标位置后元素前移 O(n)'],
  ['Declare fixed or dynamic array', 'O(1) index access arr[i]', 'Insert: shift elements right O(n)', 'Delete: shift elements left O(n)'],
  ['O(1)', 'O(1)', 'O(1)', '访问操作。插入/删除为 O(n)。', 'Access operation. Insert/delete is O(n).'],
  ['O(n)', '存储 n 个元素的连续空间。', 'Contiguous space for n elements.'],
  [false, true, false],
  '需要随机访问的场景，缓存友好的内存布局。', 'Random access needed, cache-friendly memory layout.')

const def_linkedlist = DEF('linked_list', '单向链表', 'Singly Linked List', 'Newell, Shaw, Simon (1956)', '1956',
  '节点包含数据和指向下一节点的指针。头插 O(1)，随机访问 O(n)，无需连续内存。', 'Nodes contain data and a pointer to the next node. Head insert O(1), random access O(n), no contiguous memory needed.',
  ['节点：{val, next}', '头插：newNode.next = head', '删除：prev.next = target.next', '遍历：cur = cur.next 直到 null'],
  ['Node: {val, next}', 'Head insert: newNode.next = head', 'Delete: prev.next = target.next', 'Traverse: cur = cur.next until null'],
  ['O(1)', 'O(n)', 'O(n)', '头插/删 O(1)，查找和随机访问需遍历。', 'Head insert/delete O(1), search and random access require traversal.'],
  ['O(n)', '每个节点额外存储 next 指针。', 'Each node stores extra next pointer.'],
  [false, false, false],
  '频繁头尾插入删除、无随机访问需求的场景。', 'Frequent head/tail insert/delete, no random access needed.')

const def_doubly = DEF('doubly_linked_list', '双向链表', 'Doubly Linked List', '基础数据结构', '—',
  '每个节点有 prev 和 next 两个指针，支持双向遍历。删除节点不需要前驱节点引用。', 'Each node has both prev and next pointers, supporting bidirectional traversal. Delete without predecessor reference.',
  ['节点：{val, prev, next}', '插入：更新前后节点的指针', '删除：prev.next = next; next.prev = prev', '双向遍历：可正向和反向'],
  ['Node: {val, prev, next}', 'Insert: update surrounding node pointers', 'Delete: prev.next = next; next.prev = prev', 'Bidirectional traversal possible'],
  ['O(1)', 'O(n)', 'O(n)', '给定节点引用时插入/删除 O(1)。', 'Insert/delete O(1) given node reference.'],
  ['O(n)', '每个节点存储 prev 和 next 两个指针。', 'Each node stores both prev and next pointers.'],
  [false, false, false],
  '需要双向遍历或 O(1) 删除已知节点的场景，如 LRU 缓存。', 'Bidirectional traversal or O(1) delete of known nodes, e.g. LRU cache.')

const def_stack = DEF('stack', '栈', 'Stack', 'Klaus Samelson, Friedrich L. Bauer (1955)', '1955',
  '后进先出(LIFO)的线性数据结构。push 入栈，pop 出栈，peek 查看栈顶。所有操作 O(1)。', 'Last-In-First-Out (LIFO) linear data structure. push, pop, peek all O(1).',
  ['push(x): 元素入栈顶', 'pop(): 移除并返回栈顶', 'peek(): 查看栈顶不移除', '基操 O(1)'],
  ['push(x): add to top', 'pop(): remove and return top', 'peek(): view top without removing', 'All ops O(1)'],
  ['O(1)', 'O(1)', 'O(1)', '所有基本操作。', 'All basic operations.'],
  ['O(n)', '存储 n 个元素。', 'Storage for n elements.'],
  [false, false, false],
  '函数调用栈、表达式求值、括号匹配、撤销操作。', 'Function call stack, expression evaluation, bracket matching, undo.')

const def_queue = DEF('queue', '队列', 'Queue', '基础数据结构', '—',
  '先进先出(FIFO)的线性数据结构。enqueue 入队，dequeue 出队。所有操作 O(1)。', 'First-In-First-Out (FIFO) linear data structure. enqueue and dequeue both O(1).',
  ['enqueue(x): 元素入队尾', 'dequeue(): 移除队首元素', 'front(): 查看队首不移除', '基操 O(1)'],
  ['enqueue(x): add to rear', 'dequeue(): remove from front', 'front(): view front without removing', 'All ops O(1)'],
  ['O(1)', 'O(1)', 'O(1)', '所有基本操作。', 'All basic operations.'],
  ['O(n)', '存储 n 个元素。', 'Storage for n elements.'],
  [false, false, false],
  'BFS、任务调度、消息队列、打印机队列。', 'BFS, task scheduling, message queues, printer queues.')

const def_bintree = DEF('binary_tree', '二叉树', 'Binary Tree', '基础数据结构', '—',
  '每个节点最多两个子节点（左、右）。遍历方式有先序、中序、后序、层序四种。', 'Each node has at most two children (left, right). Four traversal methods: preorder, inorder, postorder, level-order.',
  ['先序：根→左→右', '中序：左→根→右（BST 输出有序）', '后序：左→右→根', '层序：BFS 逐层遍历'],
  ['Preorder: root→left→right', 'Inorder: left→root→right (sorted for BST)', 'Postorder: left→right→root', 'Level-order: BFS traversal'],
  ['O(n)', 'O(n)', 'O(n)', '遍历访问每个节点一次。', 'Traversal visits each node once.'],
  ['O(h)', '递归栈深度 h。最坏 O(n) 退化为链。', 'Recursion depth h. Worst O(n) for skewed tree.'],
  [false, false, false],
  '表达式树、Huffman 编码、决策树、文件系统。', 'Expression trees, Huffman coding, decision trees, file systems.')

const def_bst = DEF('bst', '二叉搜索树', 'BST', '基础数据结构', '—',
  '左子树所有节点 < 根 < 右子树所有节点。查找/插入/删除平均 O(log n)，最坏 O(n)。', 'All left subtree nodes < root < all right subtree nodes. Search/insert/delete average O(log n), worst O(n).',
  ['查找：与当前节点比较，小则左大则右', '插入：找到空位后插入', '删除：分 0/1/2 子节点三种情况', '中序遍历输出有序序列'],
  ['Search: compare, go left if smaller, right if larger', 'Insert: find empty spot and insert', 'Delete: handle 0/1/2 children cases', 'Inorder traversal yields sorted sequence'],
  ['O(log n)', 'O(log n)', 'O(n)', '平衡时 O(log n)，退化为链表时 O(n)。', 'O(log n) when balanced, O(n) when degenerate.'],
  ['O(n)', '存储 n 个节点。', 'Storage for n nodes.'],
  [false, false, false],
  '需要有序存储和快速查找的场景，如数据库索引。', 'Ordered storage with fast lookup, e.g. database indices.')

const def_avl = DEF('avl_tree', 'AVL 树', 'AVL Tree', 'Adelson-Velsky, Landis', '1962',
  '首个自平衡 BST。任意节点左右子树高度差 ≤ 1。通过旋转（LL/RR/LR/RL）维持平衡，保证 O(log n)。', 'First self-balancing BST. Height difference of any node ≤ 1. Maintains balance via rotations (LL/RR/LR/RL), guaranteeing O(log n).',
  ['插入：标准 BST 插入', '向上检查平衡因子 |bf|', '|bf|>1 时执行旋转', 'LL: 右旋 / RR: 左旋 / LR: 左-右 / RL: 右-左'],
  ['Insert: standard BST insert', 'Check balance factor upward', 'If |bf|>1, perform rotation', 'LL: right rotate / RR: left rotate / LR/RL: double rotate'],
  ['O(log n)', 'O(log n)', 'O(log n)', '严格平衡保证。旋转 O(1)，最多沿路径一次旋转。', 'Strict balance guarantee. Rotation O(1), at most one rotation needed.'],
  ['O(n)', '每个节点额外存储高度。', 'Each node stores extra height.'],
  [false, false, false],
  '需要严格 O(log n) 查找/插入的场景，如数据库索引。', 'Strict O(log n) lookup/insert needed, e.g. database indices.')

const def_rbt = DEF('red_black_tree', '红黑树', 'Red-Black Tree', 'Rudolf Bayer (1972)', '1972',
  '自平衡 BST，节点分红/黑色，满足 5 条性质。通过变色+旋转维持平衡，最坏情况也平衡。', 'Self-balancing BST with red/black nodes satisfying 5 properties. Balance maintained via recoloring + rotations.',
  ['5 条性质：节点红/黑，根黑，叶黑，红子必黑，黑高相等', '插入：先标红，再修复', '删除：根据 case 变色+旋转', '各操作 O(log n)'],
  ['5 properties: nodes red/black, root black, leaves black, red children black, equal black-height', 'Insert: mark red, then fix', 'Delete: recolor + rotate per case', 'All ops O(log n)'],
  ['O(log n)', 'O(log n)', 'O(log n)', '虽不如 AVL 严格平衡，但旋转次数少，插入/删除更高效。', 'Less strictly balanced than AVL but fewer rotations, more efficient insert/delete.'],
  ['O(n)', '每个节点存储颜色位。', 'Each node stores color bit.'],
  [false, false, false],
  'C++ std::map、Java TreeMap、Linux 内核调度器等。', 'C++ std::map, Java TreeMap, Linux kernel scheduler.')

const def_heapds = DEF('heap_ds', '堆', 'Heap', 'J. W. J. Williams (1964)', '1964',
  '完全二叉树，父节点 ≥ 子节点（最大堆）或 ≤（最小堆）。堆顶为最值，插入/删除 O(log n)。', 'Complete binary tree where parent ≥ children (max-heap) or ≤ (min-heap). Root is extreme value, insert/delete O(log n).',
  ['插入：加到末尾，上浮 (bubble-up)', '删除堆顶：末元素移到堆顶，下沉 (sink-down)', 'peek: O(1) 查看堆顶'],
  ['Insert: add to end, bubble-up', 'Delete top: move last to top, sink-down', 'Peek: O(1) view root'],
  ['O(log n)', 'O(log n)', 'O(log n)', '上浮/下沉最多经过树高度 log n 层。', 'Bubble/sink at most log n levels.'],
  ['O(n)', '数组存储完全二叉树。', 'Array-stored complete binary tree.'],
  [false, true, false],
  '优先队列、堆排序、Dijkstra、Top K 问题。', 'Priority queues, heap sort, Dijkstra, Top-K problems.')

const def_trie = DEF('trie', 'Trie 字典树', 'Trie', 'Edward Fredkin (1960)', '1960',
  '前缀树，每个节点代表一个字符，路径代表字符串。插入/查找 O(k)，k 为字符串长度。', 'Prefix tree where each node represents a character and paths represent strings. Insert/search O(k), k is string length.',
  ['插入：逐字符创建/遍历节点', '查找：逐字符匹配路径', '前缀匹配：走到前缀末尾即可', '删除：自底向上删除无子节点'],
  ['Insert: create/traverse nodes per character', 'Search: match path per character', 'Prefix match: walk to prefix end', 'Delete: remove childless nodes bottom-up'],
  ['O(k)', 'O(k)', 'O(k)', 'k 为字符串长度，与数据量无关。', 'k is string length, independent of data size.'],
  ['O(n*k)', '最坏情况每个字符一个节点。', 'Worst case one node per character.'],
  [false, false, false],
  '自动补全、拼写检查、IP 路由（最长前缀匹配）。', 'Autocomplete, spell checking, IP routing (longest prefix match).')

const def_unionfind = DEF('union_find', '并查集', 'Union-Find', 'Galler, Fischer (1964)', '1964',
  '维护不相交集合的数据结构。find 查所属集合，union 合并两集合。路径压缩+按秩合并达到近乎 O(1)。', 'Data structure for disjoint sets. find queries set membership, union merges two sets. Path compression + union by rank achieve near O(1).',
  ['初始化：每个元素指向自己', 'find(x): 沿 parent 链找到根，路径压缩', 'union(x,y): 找到两根，将一个的 parent 指向另一个', '按秩合并优化'],
  ['Init: each element points to itself', 'find(x): follow parent to root, path compression', 'union(x,y): find roots, link one to other', 'Union by rank optimization'],
  ['O(α(n))', 'O(α(n))', 'O(α(n))', 'α(n) 为反 Ackermann 函数，实际可视为常数。', 'α(n) is inverse Ackermann, practically constant.'],
  ['O(n)', 'parent 数组。', 'Parent array.'],
  [false, false, false],
  'Kruskal MST、连通分量、动态连通性。', 'Kruskal MST, connected components, dynamic connectivity.')

const def_hashtable = DEF('hash_table', '哈希表', 'Hash Table', 'H. P. Luhn (1953)', '1953',
  '通过哈希函数将键映射到槽位，O(1) 平均查找。冲突用链地址法或开放定址法解决。', 'Maps keys to slots via hash function. O(1) average lookup. Collision resolution via chaining or open addressing.',
  ['hash(key) → 槽位', 'put: 计算哈希，放入槽位', 'get: 计算哈希，查找槽位', '冲突解决：链表法或线性探测'],
  ['hash(key) → slot', 'put: compute hash, place into slot', 'get: compute hash, search slot', 'Collision: chaining or linear probing'],
  ['O(1)', 'O(1)', 'O(n)', '平均 O(1)。最坏：所有键冲突退化为 O(n)。', 'Average O(1). Worst: all keys collide, O(n).'],
  ['O(n)', '槽位数 + 负载因子的额外空间。', 'Slots + extra for load factor.'],
  [false, false, false],
  '字典/映射、缓存、去重、计数统计。', 'Dictionary/map, caching, dedup, counting.')

// ---------- 动态规划 ----------
const def_knapsack = DEF('knapsack_01', '0/1 背包', '0/1 Knapsack', 'Tobias Dantzig', '1950s',
  'n 件物品各有重量和价值，背包容量 C，每件取或不取。DP 求解最大价值 O(n*C)。', 'n items with weight and value, capacity C, each taken or not. DP finds max value in O(n*C).',
  ['dp[i][j] = 前 i 件容量 j 的最大价值', 'w[i] ≤ j: dp[i][j]=max(不取, 取)', 'w[i] > j: 只能不取', '答案 dp[n][C]'],
  ['dp[i][j] = max value with first i items, capacity j', 'If fit: max(skip, take)', 'If not fit: skip only', 'Answer dp[n][C]'],
  ['O(n*C)', 'O(n*C)', 'O(n*C)', '伪多项式算法。空间可优化至 O(C)。', 'Pseudo-polynomial. Space can optimize to O(C).'],
  ['O(n*C)', 'DP 表。一维优化至 O(C)。', 'DP table. 1D optimization to O(C).'],
  [false, false, false],
  '资源分配、预算规划、投资组合。', 'Resource allocation, budget planning, portfolio optimization.')

const def_unbounded = DEF('unbounded_knapsack', '完全背包', 'Unbounded Knapsack', '基础变体', '—',
  '每件物品可选无限次。与 0/1 背包区别：遍历顺序不同（正向遍历容量）。', 'Each item can be taken unlimited times. Differs from 0/1 in traversal order (forward scan of capacity).',
  ['dp[j] = 容量 j 的最大价值', 'for j=0..C: for each item:', '若 w[i]≤j: dp[j]=max(dp[j], dp[j-w[i]]+v[i])', '答案 dp[C]'],
  ['dp[j] = max value with capacity j', 'for j=0..C: for each item:', 'If fits: dp[j]=max(dp[j], dp[j-w[i]]+v[i])', 'Answer dp[C]'],
  ['O(n*C)', 'O(n*C)', 'O(n*C)', '一维 DP，正向遍历。', '1D DP, forward traversal.'],
  ['O(C)', '一维数组。', '1D array.'],
  [false, false, false],
  '找零问题、硬币兑换、无限资源分配。', 'Coin change, currency exchange, unlimited resource allocation.')

const def_lcs = DEF('lcs', '最长公共子序列', 'LCS', 'Wagner, Fischer', '1974',
  '求两个序列的最长公共子序列（不要求连续）。DP O(m*n)，用于 diff 和生物信息学。', 'Finds longest subsequence common to two sequences (not necessarily contiguous). DP O(m*n), used in diff and bioinformatics.',
  ['dp[i][j] = 前 i,j 字符的 LCS 长度', '若匹配: dp[i][j]=dp[i-1][j-1]+1', '不匹配: dp[i][j]=max(dp[i-1][j], dp[i][j-1])', '回溯 dp 表重建序列'],
  ['dp[i][j] = LCS length of first i,j chars', 'If match: +1 from diagonal', 'No match: max of left/up', 'Backtrack to reconstruct sequence'],
  ['O(m*n)', 'O(m*n)', 'O(m*n)', '填充 m×n DP 表。', 'Fill m×n DP table.'],
  ['O(m*n)', '可优化至 O(min(m,n))。', 'Can optimize to O(min(m,n)).'],
  [false, false, false],
  'Git diff、文件比较、DNA 比对。', 'Git diff, file comparison, DNA alignment.')

const def_lis = DEF('lis', '最长递增子序列', 'LIS', '基础变体', '—',
  '在数组中找到最长的严格递增子序列。DP O(n²)，可优化至 O(n log n) 用二分查找。', 'Finds longest strictly increasing subsequence. DP O(n²), can optimize to O(n log n) with binary search.',
  ['dp[i] = 以 arr[i] 结尾的 LIS 长度', 'for j < i: 若 arr[j] < arr[i] 则 dp[i]=max(dp[i], dp[j]+1)', '答案 = max(dp)'],
  ['dp[i] = LIS length ending at arr[i]', 'For j < i: if arr[j] < arr[i], dp[i]=max(dp[i], dp[j]+1)', 'Answer = max(dp)'],
  ['O(n²)', 'O(n²)', 'O(n²)', '朴素 DP。二分优化可达 O(n log n)。', 'Naive DP. Binary search optimization to O(n log n).'],
  ['O(n)', 'dp 数组。', 'dp array.'],
  [false, false, false],
  '股票交易、序列分析。', 'Stock trading, sequence analysis.')

const def_edit = DEF('edit_distance', '编辑距离', 'Edit Distance', 'Vladimir Levenshtein', '1965',
  '将一个字符串转换为另一个所需的最少操作次数（插入/删除/替换）。DP O(m*n)。', 'Minimum operations (insert/delete/replace) to transform one string into another. DP O(m*n).',
  ['dp[i][j] = word1[0..i) → word2[0..j) 的最小编辑数', '相同字符: dp[i][j]=dp[i-1][j-1]', '不同: dp[i][j]=1+min(删/插/换)', '答案 dp[m][n]'],
  ['dp[i][j] = min edits for word1[0..i) → word2[0..j)', 'Same char: copy diagonal', 'Different: 1+min(delete/insert/replace)', 'Answer dp[m][n]'],
  ['O(m*n)', 'O(m*n)', 'O(m*n)', '填充 m×n DP 表。', 'Fill m×n DP table.'],
  ['O(m*n)', '可优化至 O(min(m,n))。', 'Can optimize to O(min(m,n)).'],
  [false, false, false],
  '拼写检查、DNA 序列比对、模糊搜索。', 'Spell checking, DNA alignment, fuzzy search.')

const def_mchain = DEF('matrix_chain', '矩阵链乘', 'Matrix Chain', '基础变体', '—',
  '给定矩阵序列，求最优括号化方案使得标量乘法次数最少。区间 DP O(n³)。', 'Given a sequence of matrices, find optimal parenthesization to minimize scalar multiplications. Interval DP O(n³).',
  ['dp[i][j] = 矩阵 i..j 的最优乘法次数', '尝试所有分割点 k，dp[i][j]=min(dp[i][k]+dp[k+1][j]+cost)', 'cost = d[i]*d[k+1]*d[j+1]', '答案 dp[0][n-1]'],
  ['dp[i][j] = optimal multiplications for matrices i..j', 'Try all split points k: dp[i][j]=min(dp[i][k]+dp[k+1][j]+cost)', 'cost = d[i]*d[k+1]*d[j+1]', 'Answer dp[0][n-1]'],
  ['O(n³)', 'O(n³)', 'O(n³)', '三重循环：区间长度 × 起点 × 分割点。', 'Triple loop: interval length × start × split point.'],
  ['O(n²)', 'dp 表。', 'dp table.'],
  [false, false, false],
  '编译器优化矩阵乘法顺序。', 'Compiler optimization of matrix multiplication order.')

const def_interval = DEF('interval_dp', '区间 DP', 'Interval DP', '基础变体', '—',
  '将问题划分为小区间，合并区间得到大区间解。典型问题：石子合并、戳气球。', 'Divides problem into small intervals, merges them to get larger interval solutions. Classic: stone merging, burst balloons.',
  ['定义 dp[i][j] = 区间 [i,j] 的最优解', '从小到大枚举区间长度 len', '枚举起点 i 和分割点 k', 'dp[i][j] = min/max(dp[i][k] + dp[k+1][j] + 合并代价)'],
  ['dp[i][j] = optimal solution for interval [i,j]', 'Enumerate interval length from small to large', 'Enumerate start i and split point k', 'dp[i][j] = min/max(dp[i][k] + dp[k+1][j] + merge cost)'],
  ['O(n³)', 'O(n³)', 'O(n³)', '三重循环：长度 × 起点 × 分割点。', 'Triple loop: length × start × split point.'],
  ['O(n²)', 'dp 表。', 'dp table.'],
  [false, false, false],
  '石子合并、戳气球、括号匹配最大化。', 'Stone merging, burst balloons, bracket maximization.')

// ---------- 搜索与回溯 ----------
const def_binary = DEF('binary_search', '二分查找', 'Binary Search', '古代巴比伦数学 (~200 BCE)', '~200 BCE',
  '在有序数组中每次取中间值比较，将搜索范围缩小一半，O(log n)。', 'Repeatedly divides search interval in half by comparing with middle element. O(log n).',
  ['left=0, right=n-1', 'while left≤right: mid=left+(right-left)/2', 'arr[mid]==target → 返回 mid', 'arr[mid]<target → left=mid+1', 'arr[mid]>target → right=mid-1'],
  ['left=0, right=n-1', 'While left≤right: compute mid', 'If match, return mid', 'If too small, search right', 'If too large, search left'],
  ['O(1)', 'O(log n)', 'O(log n)', '每次比较将搜索空间减半。', 'Each comparison halves search space.'],
  ['O(1)', '迭代版本常数空间。', 'Iterative version constant space.'],
  [false, true, false],
  '有序数据的高效查找，数据库索引。', 'Efficient search in sorted data, database indexing.')

const def_backtrack = DEF('backtracking', '回溯算法', 'Backtracking', 'D. H. Lehmer (1950s)', '1950s',
  '系统地搜索所有可能的解。在搜索过程中，若当前路径不可能产生有效解则立即回退，尝试其他选择。', 'Systematically searches all possible solutions. If current path cannot lead to a valid solution, immediately backtracks and tries alternatives.',
  ['定义选择空间和约束条件', '递归尝试每种选择', '若不合法 → 回溯撤销', '若满足结束条件 → 记录解', '穷举所有可能'],
  ['Define choice space and constraints', 'Recursively try each choice', 'If invalid → backtrack', 'If terminal condition met → record solution', 'Exhaust all possibilities'],
  ['O(k^n)', 'O(k^n)', 'O(k^n)', '指数级，但通过剪枝大幅减少实际搜索空间。', 'Exponential, but pruning drastically reduces actual search space.'],
  ['O(n)', '递归栈深度。', 'Recursion stack depth.'],
  [false, false, false],
  '排列组合、N 皇后、数独、子集和问题。', 'Permutations, N-Queens, Sudoku, subset sum.')

const def_nqueens = DEF('n_queens', 'N 皇后', 'N-Queens', 'Max Bezzel (1848)', '1848',
  '在 N×N 棋盘上放置 N 个皇后，使它们互不攻击。经典回溯问题，时间复杂度 O(N!)。', 'Place N queens on an N×N board so no two attack each other. Classic backtracking problem, O(N!).',
  ['逐行放置皇后', '对每列检查是否安全（列/对角线）', '安全则放置，递归下一行', '不安全或无位置则回溯', '放满 N 行找到解'],
  ['Place queens row by row', 'Check if safe (column/diagonal)', 'If safe, place and recurse next row', 'If unsafe or stuck, backtrack', 'Solution found when N rows filled'],
  ['O(N!)', 'O(N!)', 'O(N!)', '实际远小于 N!，剪枝大幅减少搜索。', 'Much less than N! in practice due to pruning.'],
  ['O(N)', '递归栈 + 棋盘。', 'Recursion stack + board.'],
  [false, false, false],
  '经典回溯入门题、约束满足问题。', 'Classic backtracking intro, constraint satisfaction problems.')

const def_sudoku = DEF('sudoku', '数独求解', 'Sudoku Solver', 'Howard Garns (1979)', '1979',
  '用数字 1-9 填充 9×9 网格，每行/每列/每宫不重复。回溯+约束传播求解。', 'Fill a 9×9 grid with digits 1-9 so each row/column/box has no duplicates. Solved via backtracking + constraint propagation.',
  ['找到第一个空格', '尝试数字 1-9', '检查行/列/宫合法性', '合法则填入并递归', '无法填入则回溯'],
  ['Find first empty cell', 'Try digits 1-9', 'Check row/column/box validity', 'If valid, fill and recurse', 'Backtrack if stuck'],
  ['O(1)', 'O(9^m)', 'O(9^m)', 'm 为空单元格数。实际剪枝后远小于上界。', 'm is empty cells. Actual much less due to pruning.'],
  ['O(m)', '递归栈深度。', 'Recursion stack depth.'],
  [false, false, false],
  '逻辑推理、约束求解、AI 推理引擎。', 'Logic reasoning, constraint solving, AI inference engines.')

// ---------- 进阶专题 ----------
const def_kmp = DEF('kmp', 'KMP 字符串匹配', 'KMP', 'Knuth, Morris, Pratt', '1977',
  '利用 LPS 数组避免文本指针回退，线性时间 O(n+m) 完成字符串匹配。', 'Uses LPS array to avoid text pointer backtracking. Linear time O(n+m) string matching.',
  ['预处理：构建模式串的 LPS 数组', '遍历文本串与模式串比较', '匹配：两指针前进', '失配：模式指针 j = lps[j-1]', 'j 达模式长度 → 找到匹配'],
  ['Preprocess: build LPS array for pattern', 'Scan text, compare with pattern', 'Match: advance both pointers', 'Mismatch: j = lps[j-1] (text pointer stays)', 'j reaches pattern length → match found'],
  ['O(n+m)', 'O(n+m)', 'O(n+m)', '每个字符最多比较两次。', 'Each character compared at most twice.'],
  ['O(m)', 'LPS 数组。', 'LPS array.'],
  [false, false, false],
  '文本编辑器查找、网络入侵检测、DNA 搜索。', 'Text editor find, intrusion detection, DNA search.')

const def_manacher = DEF('manacher', 'Manacher 回文', "Manacher's Algorithm", 'Glenn Manacher', '1975',
  '线性时间 O(n) 求最长回文子串。利用已计算的回文信息避免重复扩展。', 'Linear time O(n) longest palindromic substring. Leverages previously computed palindrome info to avoid redundant expansion.',
  ['预处理插入 # 统一奇偶', '维护当前最右回文边界 C 和 R', '利用对称性初始化 P[i]', '尝试扩展回文', '更新 C 和 R'],
  ['Preprocess with # separators', 'Maintain center C and right boundary R', 'Use symmetry to init P[i]', 'Try to expand palindrome', 'Update C and R if expanded'],
  ['O(n)', 'O(n)', 'O(n)', '每个字符最多扩展一次。', 'Each character expanded at most once.'],
  ['O(n)', 'P 数组。', 'P array.'],
  [false, false, false],
  '文本处理、回文检测。', 'Text processing, palindrome detection.')

const def_segtree = DEF('segment_tree', '线段树', 'Segment Tree', 'Jon Louis Bentley (1977)', '1977',
  '支持区间查询和单点/区间更新的树形数据结构。建树 O(n)，查询/更新 O(log n)。', 'Tree structure supporting range queries and point/range updates. Build O(n), query/update O(log n).',
  ['建树：自底向上/自顶向下递归', '区间查询：覆盖则返回，相交则递归', '更新：找到叶节点后向上更新', '懒标记(lazy propagation)实现区间更新'],
  ['Build: top-down/bottom-up recursion', 'Query: if covered return, else recurse', 'Update: find leaf and update upward', 'Lazy propagation for range updates'],
  ['O(log n)', 'O(log n)', 'O(log n)', '每次查询/更新最多访问 O(log n) 个节点。', 'At most O(log n) nodes visited per query/update.'],
  ['O(n)', '4n 大小的树数组。', '4n-sized tree array.'],
  [false, false, false],
  '区间求和/最值、动态数组查询、几何计算。', 'Range sum/min/max, dynamic array queries, computational geometry.')

const def_fenwick = DEF('fenwick_tree', '树状数组', 'Fenwick Tree', 'Peter Fenwick (1994)', '1994',
  '支持前缀和查询和单点更新的简洁数据结构。利用二进制 lowbit 实现 O(log n) 操作。', 'Compact data structure for prefix sum queries and point updates. Uses binary lowbit for O(log n) operations.',
  ['update(i, delta): i += lowbit(i) 向上更新', 'query(i): i -= lowbit(i) 累加前缀和', 'lowbit(x) = x & -x', '空间 O(n)，实现简单'],
  ['update(i, delta): i += lowbit(i), update upward', 'query(i): i -= lowbit(i), accumulate prefix', 'lowbit(x) = x & -x', 'O(n) space, simple implementation'],
  ['O(log n)', 'O(log n)', 'O(log n)', '每次操作最多经过 log n 个节点。', 'At most log n nodes traversed per operation.'],
  ['O(n)', 'n+1 大小数组。', 'n+1 sized array.'],
  [false, false, false],
  '前缀和动态维护、逆序对计数、数组区间操作。', 'Dynamic prefix sum, inversion counting, array range ops.')

const def_monostack = DEF('monotonic_stack', '单调栈', 'Monotonic Stack', '基础技巧', '—',
  '维护栈内元素单调递增或递减，在线性时间内解决"下一个更大/更小元素"类问题，O(n)。', 'Maintains stack with monotonically increasing/decreasing elements. Solves "next greater/smaller element" problems in O(n).',
  ['遍历数组元素', 'while 栈非空且栈顶 < 当前元素 → 弹出', '弹出的元素的下一个更大元素 = 当前元素', '当前元素入栈', '剩余栈中元素无更大元素'],
  ['Traverse array elements', 'While stack non-empty and top < current → pop', 'Popped elements next greater = current', 'Push current onto stack', 'Remaining stack elements have no greater'],
  ['O(n)', 'O(n)', 'O(n)', '每个元素入栈出栈恰好一次。', 'Each element pushed and popped exactly once.'],
  ['O(n)', '栈空间。', 'Stack space.'],
  [false, false, false],
  '下一个更大/更小元素、最大矩形面积、接雨水。', 'Next greater/smaller element, largest rectangle, trapping rain water.')

const def_sliding = DEF('sliding_window', '滑动窗口', 'Sliding Window', '基础技巧', '—',
  '维护一个大小可变的窗口在线性时间内扫描数组。常用于子数组/子串问题，O(n)。', 'Maintains a variable-size window to scan array in linear time. Common for subarray/substring problems, O(n).',
  ['初始化窗口 [0, k-1]', '窗口滑动：移除最左元素，加入最右新元素', '更新窗口内统计信息', '记录/比较窗口结果', 'O(n) 完成遍历'],
  ['Init window [0, k-1]', 'Slide: remove leftmost, add rightmost new', 'Update window statistics', 'Record/compare window result', 'O(n) traversal'],
  ['O(n)', 'O(n)', 'O(n)', '每个元素进入和离开窗口各一次。', 'Each element enters and leaves window once.'],
  ['O(1)', '若只需窗口统计量。', 'If only window statistics needed.'],
  [false, false, false],
  '子数组问题、TCP 滑动窗口、流数据处理。', 'Subarray problems, TCP sliding window, stream processing.')

// ---------- 面试/竞赛 ----------
const def_leetcode = DEF('leetcode_hot100', 'LeetCode Hot 100', 'LeetCode Top 100', 'LeetCode 平台', '2010s',
  '精选 LeetCode 上最高频的 100 道面试题，覆盖数组、字符串、链表、树、DP 等核心题型。', 'Curated top 100 most frequent LeetCode interview problems covering arrays, strings, linked lists, trees, DP, etc.',
  ['两数之和：哈希表 O(n)', '链表反转：迭代/递归', '二叉树遍历：DFS/BFS', '动态规划：背包/子序列'],
  ['Two Sum: hash map O(n)', 'Reverse linked list: iterative/recursive', 'Tree traversal: DFS/BFS', 'DP: knapsack/subsequence'],
  ['—', '—', '—', '各题复杂度不同。', 'Complexity varies per problem.'],
  ['—', '—', '—'],
  [false, false, false],
  '技术面试准备。', 'Technical interview preparation.')

const def_acm = DEF('acm_templates', 'ACM 算法模板', 'ACM Templates', 'ACM/ICPC 竞赛', '1970s',
  'ACM/ICPC 常用算法模板集合：快速幂、素数筛、二分答案、离散化、组合数等。', 'Collection of common ACM/ICPC algorithm templates: fast exponentiation, prime sieve, binary search on answer, discretization, combinatorics.',
  ['快速幂：幂次二分 O(log n)', '素数筛：埃氏筛 O(n log log n)', '二分答案：在单调函数上找最优值', '前缀和/差分数组 O(1) 区间查询'],
  ['Fast pow: binary exponentiation O(log n)', 'Sieve of Eratosthenes O(n log log n)', 'Binary answer: find optimal on monotonic function', 'Prefix sum/difference array O(1) range query'],
  ['—', '—', '—', '模板涵盖多种算法。', 'Templates cover various algorithms.'],
  ['—', '—', '—'],
  [false, false, false],
  '算法竞赛、编程面试快速参考。', 'Programming contests, interview quick reference.')

// ============ Registry ============
export const ALGORITHM_DEFS: Record<string, AlgorithmDefinition> = {}
const defs = [
  def_bubble, def_selection, def_insertion, def_shell, def_merge, def_quick, def_heap, def_counting, def_radix, def_bucket,
  def_bfs, def_dfs, def_dijkstra, def_bellman, def_astar, def_floyd, def_prim, def_kruskal, def_topo,
  def_array, def_linkedlist, def_doubly, def_stack, def_queue, def_bintree, def_bst, def_avl, def_rbt, def_heapds, def_trie, def_unionfind, def_hashtable,
  def_knapsack, def_unbounded, def_lcs, def_lis, def_edit, def_mchain, def_interval,
  def_binary, def_backtrack, def_nqueens, def_sudoku,
  def_kmp, def_manacher, def_segtree, def_fenwick, def_monostack, def_sliding,
  def_leetcode, def_acm,
]
for (const d of defs) ALGORITHM_DEFS[d.id] = d
