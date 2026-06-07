/**
 * 数据结构类别提示词：栈 / 队列 / 双端队列 / 哈希 / 集合 / 位集
 * （并附链表与纯数学变量面板等通用结构）。
 */
export const PROMPT: string = `### 链表
- \`b.listCreate('singly'|'doubly'|'circular', nodes, headId?)\`；nodes=[{id,value}]
- \`b.listVisit(id)\` / \`b.listInsertAfter(targetId, {id,value})\` / \`b.listDelete(id)\` / \`b.movePointer(pointerId, toNodeId)\`

### 栈（单调栈、括号匹配、接雨水等，@type 用 array）
- \`b.stackCreate(values?)\` 创建栈（可空）/ \`b.stackPush(value)\` 入栈 / \`b.stackPop()\` 出栈 / \`b.stackPeek(index)\` 看某位置
- 单调栈算法：每次 while 弹栈、压栈都发对应 stackPop/stackPush，并 b.desc 说明为什么弹/压

### 队列 / 双端队列（BFS、滑动窗口，@type 用 array）
- 队列：\`b.queueCreate(values?)\` / \`b.queueEnqueue(value)\` / \`b.queueDequeue()\` / \`b.queuePeekFront(index)\`
- 双端队列：\`b.dequeCreate(values?)\` / \`b.dequePushFront(value)\` / \`b.dequePushBack(value)\` / \`b.dequePopFront()\` / \`b.dequePopBack()\`

### 哈希表（hash map / hash set，@type 用 array）
- \`b.hashCreate(capacity)\` 第一步必调，创建桶数组，capacity=桶数（如 8）
- \`b.hashPut(key, value, bucket, collision?)\` 插入；bucket=hash(key)%capacity，collision=该桶已有元素时传 true
- \`b.hashGet(key, bucket, found)\` 查找
- \`b.hashRemove(key, bucket)\` 删除
要点：自己用简单 hash（如字符串各字符码之和 % capacity）算出 bucket；冲突用链地址法，同一 bucket 再 put 时把 collision 传 true。key 用字符串，value 用数字或字符串。

### 集合（set，@type 用 array）
强调集合三大语义：**去重、无序、成员判定**。元素装在一个"集合容器（{ }）"里展示。
- \`b.setCreate(values)\` 第一步必调，传入初始元素数组（重复值会自动去重）
- \`b.setAdd(value)\` 添加；若已存在则标黄提示"去重忽略"，否则高亮新增（绿色脉冲）
- \`b.setRemove(value)\` 删除；命中则淡出移除，不存在则提示
- \`b.setContains(value, found)\` 成员判定；found=true 命中标绿、false 未命中标红
要点：集合无序、无下标，按值操作（不要传 index）；配合 b.desc 说明语义。

### 位集 / 状压（bitmask，@type 用 array）
状压 DP / 子集枚举：用一排 0/1 位格（带下标）展示一个 bitmask 的位。
- \`b.bitsetCreate(bits, label?)\` 第一步必调，bits=位数（全 0 初始），label 可选（默认 "Bitmask"）
- \`b.bitsetSet(index, value)\` 置位：把第 index 位设为 0 或 1 并高亮（下标从 0 起、低位在左）
- \`b.bitsetHighlight(index)\` 仅高亮某位（不改值），用于强调"正在检视此位"
要点：下标从 0 起、低位在左；每次状态位变化都要 bitsetSet 反映。配合 b.desc 说明这一位代表什么。

### 纯数学 / 变量面板（无数据结构的算法，@type 用 array）
适用于 GCD、快速幂、费波那契、数位 DP 等——没有数组/链表/树，只是追踪一组变量的演变。用横排的"寄存器面板"展示各变量当前值。
- \`b.varInit([{name, value}, ...])\` 第一步必调，列出算法用到的所有变量及初值（如 GCD 的 a、b、r）
- \`b.varSet(name, value)\` 每当某变量改变就发一次，更新对应寄存器的值并高亮；首次出现的变量名会自动新建一格
- \`b.varHighlight(name)\` 仅高亮某变量（不改值），用于强调"正在读取/比较此变量"
要点：每一步关键计算都要 varSet 反映变量变化，不要只 b.note 文字；变量名用短标识（a、b、r、result）。配合 b.desc 说明这一步在做什么。`
