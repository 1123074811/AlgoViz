export type CodeLang = 'python' | 'javascript' | 'cpp' | 'java'

const CODE_TEMPLATES: Record<string, Partial<Record<CodeLang, string>>> = {
  bubble_sort: {
    python: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(n - 1 - i):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr`,
    javascript: `function bubbleSort(arr) {
    const n = arr.length;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) {
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
            }
        }
    }
    return arr;
}`,
    cpp: `#include <vector>
using namespace std;

vector<int> bubbleSort(vector<int>& arr) {
    int n = arr.size();
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) {
                swap(arr[j], arr[j + 1]);
            }
        }
    }
    return arr;
}`,
    java: `public class BubbleSort {
    public static int[] bubbleSort(int[] arr) {
        int n = arr.length;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n - 1 - i; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                }
            }
        }
        return arr;
    }
}`,
  },
  selection_sort: {
    python: `def selection_sort(arr):
    n = len(arr)
    for i in range(n):
        min_idx = i
        for j in range(i + 1, n):
            if arr[j] < arr[min_idx]:
                min_idx = j
        arr[i], arr[min_idx] = arr[min_idx], arr[i]
    return arr`,
    javascript: `function selectionSort(arr) {
    const n = arr.length;
    for (let i = 0; i < n; i++) {
        let minIdx = i;
        for (let j = i + 1; j < n; j++) {
            if (arr[j] < arr[minIdx]) {
                minIdx = j;
            }
        }
        [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
    }
    return arr;
}`,
    cpp: `#include <vector>
using namespace std;

vector<int> selectionSort(vector<int>& arr) {
    int n = arr.size();
    for (int i = 0; i < n; i++) {
        int minIdx = i;
        for (int j = i + 1; j < n; j++) {
            if (arr[j] < arr[minIdx]) {
                minIdx = j;
            }
        }
        swap(arr[i], arr[minIdx]);
    }
    return arr;
}`,
    java: `public class SelectionSort {
    public static int[] selectionSort(int[] arr) {
        int n = arr.length;
        for (int i = 0; i < n; i++) {
            int minIdx = i;
            for (int j = i + 1; j < n; j++) {
                if (arr[j] < arr[minIdx]) {
                    minIdx = j;
                }
            }
            int temp = arr[i];
            arr[i] = arr[minIdx];
            arr[minIdx] = temp;
        }
        return arr;
    }
}`,
  },
  binary_search: {
    python: `def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if arr[mid] == target: return mid
        elif arr[mid] < target: left = mid + 1
        else: right = mid - 1
    return -1`,
    javascript: `function binarySearch(arr, target) {
    let left = 0, right = arr.length - 1;
    while (left <= right) {
        const mid = left + Math.floor((right - left) / 2);
        if (arr[mid] === target) return mid;
        else if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}`,
    cpp: `#include <vector>
using namespace std;

int binarySearch(vector<int>& arr, int target) {
    int left = 0, right = arr.size() - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (arr[mid] == target) return mid;
        else if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}`,
    java: `public class BinarySearch {
    public static int binarySearch(int[] arr, int target) {
        int left = 0, right = arr.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (arr[mid] == target) return mid;
            else if (arr[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }
}`,
  },
  insertion_sort: {
    python: `def insertion_sort(arr):
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
    return arr`,
    javascript: `function insertionSort(arr) {
    for (let i = 1; i < arr.length; i++) {
        const key = arr[i];
        let j = i - 1;
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;
    }
    return arr;
}`,
    cpp: `#include <vector>
using namespace std;

vector<int> insertionSort(vector<int>& arr) {
    for (int i = 1; i < arr.size(); i++) {
        int key = arr[i];
        int j = i - 1;
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;
    }
    return arr;
}`,
    java: `public class InsertionSort {
    public static int[] insertionSort(int[] arr) {
        for (int i = 1; i < arr.length; i++) {
            int key = arr[i];
            int j = i - 1;
            while (j >= 0 && arr[j] > key) {
                arr[j + 1] = arr[j];
                j--;
            }
            arr[j + 1] = key;
        }
        return arr;
    }
}`,
  },
  merge_sort: {
    python: `def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)

def merge(left, right):
    result, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i]); i += 1
        else:
            result.append(right[j]); j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result`,
    javascript: `function mergeSort(arr) {
    if (arr.length <= 1) return arr;
    const mid = Math.floor(arr.length / 2);
    const left = mergeSort(arr.slice(0, mid));
    const right = mergeSort(arr.slice(mid));
    return merge(left, right);
}
function merge(left, right) {
    const result = [];
    let i = 0, j = 0;
    while (i < left.length && j < right.length) {
        if (left[i] <= right[j]) result.push(left[i++]);
        else result.push(right[j++]);
    }
    return [...result, ...left.slice(i), ...right.slice(j)];
}`,
    cpp: `#include <vector>
using namespace std;

vector<int> merge(vector<int>& left, vector<int>& right) {
    vector<int> result;
    int i = 0, j = 0;
    while (i < left.size() && j < right.size()) {
        if (left[i] <= right[j]) result.push_back(left[i++]);
        else result.push_back(right[j++]);
    }
    while (i < left.size()) result.push_back(left[i++]);
    while (j < right.size()) result.push_back(right[j++]);
    return result;
}
vector<int> mergeSort(vector<int>& arr) {
    if (arr.size() <= 1) return arr;
    int mid = arr.size() / 2;
    vector<int> left(arr.begin(), arr.begin() + mid);
    vector<int> right(arr.begin() + mid, arr.end());
    left = mergeSort(left);
    right = mergeSort(right);
    return merge(left, right);
}`,
    java: `public class MergeSort {
    public static int[] mergeSort(int[] arr) {
        if (arr.length <= 1) return arr;
        int mid = arr.length / 2;
        int[] left = java.util.Arrays.copyOfRange(arr, 0, mid);
        int[] right = java.util.Arrays.copyOfRange(arr, mid, arr.length);
        return merge(mergeSort(left), mergeSort(right));
    }
    private static int[] merge(int[] left, int[] right) {
        int[] result = new int[left.length + right.length];
        int i = 0, j = 0, k = 0;
        while (i < left.length && j < right.length) {
            if (left[i] <= right[j]) result[k++] = left[i++];
            else result[k++] = right[j++];
        }
        while (i < left.length) result[k++] = left[i++];
        while (j < right.length) result[k++] = right[j++];
        return result;
    }
}`,
  },
  quick_sort: {
    python: `def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[0]
    left = [x for x in arr[1:] if x <= pivot]
    right = [x for x in arr[1:] if x > pivot]
    return quick_sort(left) + [pivot] + quick_sort(right)`,
    javascript: `function quickSort(arr) {
    if (arr.length <= 1) return arr;
    const pivot = arr[0];
    const left = arr.slice(1).filter(x => x <= pivot);
    const right = arr.slice(1).filter(x => x > pivot);
    return [...quickSort(left), pivot, ...quickSort(right)];
}`,
    cpp: `#include <vector>
using namespace std;

vector<int> quickSort(vector<int>& arr) {
    if (arr.size() <= 1) return arr;
    int pivot = arr[0];
    vector<int> left, right;
    for (int i = 1; i < arr.size(); i++) {
        if (arr[i] <= pivot) left.push_back(arr[i]);
        else right.push_back(arr[i]);
    }
    left = quickSort(left);
    right = quickSort(right);
    left.push_back(pivot);
    left.insert(left.end(), right.begin(), right.end());
    return left;
}`,
    java: `public class QuickSort {
    public static java.util.List<Integer> quickSort(java.util.List<Integer> arr) {
        if (arr.size() <= 1) return arr;
        int pivot = arr.get(0);
        java.util.List<Integer> left = new java.util.ArrayList<>();
        java.util.List<Integer> right = new java.util.ArrayList<>();
        for (int i = 1; i < arr.size(); i++) {
            if (arr.get(i) <= pivot) left.add(arr.get(i));
            else right.add(arr.get(i));
        }
        left = quickSort(left);
        right = quickSort(right);
        java.util.List<Integer> result = new java.util.ArrayList<>(left);
        result.add(pivot);
        result.addAll(right);
        return result;
    }
}`,
  },
  bfs_graph: {
    python: `from collections import deque

def bfs(graph, start):
    visited = set()
    queue = deque([start])
    visited.add(start)
    while queue:
        node = queue.popleft()
        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)
    return visited`,
    javascript: `function bfs(graph, start) {
    const visited = new Set();
    const queue = [start];
    visited.add(start);
    while (queue.length) {
        const node = queue.shift();
        for (const neighbor of graph[node]) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        }
    }
    return visited;
}`,
    cpp: `#include <queue>
#include <unordered_set>
using namespace std;

void bfs(vector<vector<int>>& graph, int start) {
    unordered_set<int> visited;
    queue<int> q;
    q.push(start);
    visited.insert(start);
    while (!q.empty()) {
        int node = q.front(); q.pop();
        for (int neighbor : graph[node]) {
            if (!visited.count(neighbor)) {
                visited.insert(neighbor);
                q.push(neighbor);
            }
        }
    }
}`,
    java: `public static void bfs(List<List<Integer>> graph, int start) {
    Set<Integer> visited = new HashSet<>();
    Queue<Integer> queue = new LinkedList<>();
    queue.add(start);
    visited.add(start);
    while (!queue.isEmpty()) {
        int node = queue.poll();
        for (int neighbor : graph.get(node)) {
            if (!visited.contains(neighbor)) {
                visited.add(neighbor);
                queue.add(neighbor);
            }
        }
    }
}`,
  },
  dfs_graph: {
    python: `def dfs(graph, node, visited=None):
    if visited is None:
        visited = set()
    visited.add(node)
    for neighbor in graph[node]:
        if neighbor not in visited:
            dfs(graph, neighbor, visited)
    return visited`,
    javascript: `function dfs(graph, node, visited = new Set()) {
    visited.add(node);
    for (const neighbor of graph[node]) {
        if (!visited.has(neighbor)) {
            dfs(graph, neighbor, visited);
        }
    }
    return visited;
}`,
    cpp: `#include <vector>
#include <unordered_set>
using namespace std;

void dfs(vector<vector<int>>& graph, int node, unordered_set<int>& visited) {
    visited.insert(node);
    for (int neighbor : graph[node]) {
        if (!visited.count(neighbor)) {
            dfs(graph, neighbor, visited);
        }
    }
}`,
    java: `public static void dfs(List<List<Integer>> graph, int node, Set<Integer> visited) {
    visited.add(node);
    for (int neighbor : graph.get(node)) {
        if (!visited.contains(neighbor)) {
            dfs(graph, neighbor, visited);
        }
    }
}`,
  },
  shell_sort: {
    python: `def shell_sort(arr):
    n = len(arr)
    gap = n // 2
    while gap > 0:
        for i in range(gap, n):
            temp = arr[i]
            j = i
            while j >= gap and arr[j - gap] > temp:
                arr[j] = arr[j - gap]
                j -= gap
            arr[j] = temp
        gap //= 2
    return arr`,
    javascript: `function shellSort(arr) {
    const n = arr.length;
    for (let gap = Math.floor(n/2); gap > 0; gap = Math.floor(gap/2)) {
        for (let i = gap; i < n; i++) {
            const temp = arr[i]; let j = i;
            while (j >= gap && arr[j-gap] > temp) { arr[j] = arr[j-gap]; j -= gap; }
            arr[j] = temp;
        }
    }
    return arr;
}`,
    cpp: `vector<int> shellSort(vector<int> arr) {
    int n = arr.size();
    for (int gap = n/2; gap > 0; gap /= 2)
        for (int i = gap; i < n; i++) {
            int temp = arr[i], j = i;
            while (j >= gap && arr[j-gap] > temp) { arr[j] = arr[j-gap]; j -= gap; }
            arr[j] = temp;
        }
    return arr;
}`,
    java: `public static int[] shellSort(int[] arr) {
    int n = arr.length;
    for (int gap = n/2; gap > 0; gap /= 2)
        for (int i = gap; i < n; i++) {
            int temp = arr[i], j = i;
            while (j >= gap && arr[j-gap] > temp) { arr[j] = arr[j-gap]; j -= gap; }
            arr[j] = temp;
        }
    return arr;
}`,
  },
  heap_sort: {
    python: `def heapify(arr, n, i):
    largest = i
    l, r = 2 * i + 1, 2 * i + 2
    if l < n and arr[l] > arr[largest]: largest = l
    if r < n and arr[r] > arr[largest]: largest = r
    if largest != i:
        arr[i], arr[largest] = arr[largest], arr[i]
        heapify(arr, n, largest)

def heap_sort(arr):
    n = len(arr)
    for i in range(n // 2 - 1, -1, -1):
        heapify(arr, n, i)
    for i in range(n - 1, 0, -1):
        arr[i], arr[0] = arr[0], arr[i]
        heapify(arr, i, 0)
    return arr`,
    javascript: `function heapify(arr, n, i) {
    let largest = i;
    const l = 2 * i + 1;
    const r = 2 * i + 2;
    
    if (l < n && arr[l] > arr[largest]) {
        largest = l;
    }
    if (r < n && arr[r] > arr[largest]) {
        largest = r;
    }
    if (largest !== i) {
        [arr[i], arr[largest]] = [arr[largest], arr[i]];
        heapify(arr, n, largest);
    }
}

function heapSort(arr) {
    const n = arr.length;
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
        heapify(arr, n, i);
    }
    for (let i = n - 1; i > 0; i--) {
        [arr[0], arr[i]] = [arr[i], arr[0]];
        heapify(arr, i, 0);
    }
    return arr;
}`,
    cpp: `void heapify(vector<int>& arr, int n, int i) {
    int largest = i;
    int l = 2 * i + 1;
    int r = 2 * i + 2;
    
    if (l < n && arr[l] > arr[largest]) {
        largest = l;
    }
    if (r < n && arr[r] > arr[largest]) {
        largest = r;
    }
    if (largest != i) {
        swap(arr[i], arr[largest]);
        heapify(arr, n, largest);
    }
}

vector<int> heapSort(vector<int> arr) {
    int n = arr.size();
    for (int i = n / 2 - 1; i >= 0; i--) {
        heapify(arr, n, i);
    }
    for (int i = n - 1; i > 0; i--) {
        swap(arr[0], arr[i]);
        heapify(arr, i, 0);
    }
    return arr;
}`,
    java: `static void heapify(int[] arr, int n, int i) {
    int largest = i;
    int l = 2 * i + 1;
    int r = 2 * i + 2;
    
    if (l < n && arr[l] > arr[largest]) {
        largest = l;
    }
    if (r < n && arr[r] > arr[largest]) {
        largest = r;
    }
    if (largest != i) {
        int temp = arr[i];
        arr[i] = arr[largest];
        arr[largest] = temp;
        heapify(arr, n, largest);
    }
}

static int[] heapSort(int[] arr) {
    int n = arr.length;
    for (int i = n / 2 - 1; i >= 0; i--) {
        heapify(arr, n, i);
    }
    for (int i = n - 1; i > 0; i--) {
        int temp = arr[0];
        arr[0] = arr[i];
        arr[i] = temp;
        heapify(arr, i, 0);
    }
    return arr;
}`,
  },
  counting_sort: {
    python: `def counting_sort(arr):
    if not arr: return arr
    max_val = max(arr)
    count = [0] * (max_val + 1)
    for num in arr: count[num] += 1
    result = []
    for i, c in enumerate(count):
        result.extend([i] * c)
    return result`,
    javascript: `function countingSort(arr) {
    if (!arr.length) return arr;
    const max = Math.max(...arr);
    const count = new Array(max + 1).fill(0);
    for (const n of arr) {
        count[n]++;
    }
    const res = [];
    for (let i = 0; i <= max; i++) {
        while (count[i]-- > 0) {
            res.push(i);
        }
    }
    return res;
}`,
    cpp: `vector<int> countingSort(vector<int>& arr) {
    if (arr.empty()) return arr;
    int mx = *max_element(arr.begin(), arr.end());
    vector<int> count(mx + 1, 0), res;
    for (int x : arr) {
        count[x]++;
    }
    for (int i = 0; i <= mx; i++) {
        while (count[i]--) {
            res.push_back(i);
        }
    }
    return res;
}`,
    java: `static int[] countingSort(int[] arr) {
    if (arr.length == 0) return arr;
    int max = Arrays.stream(arr).max().getAsInt();
    int[] count = new int[max + 1];
    for (int x : arr) {
        count[x]++;
    }
    int[] res = new int[arr.length];
    int idx = 0;
    for (int i = 0; i <= max; i++) {
        while (count[i]-- > 0) {
            res[idx++] = i;
        }
    }
    return res;
}`,
  },
  radix_sort: {
    python: `def counting_sort_for_radix(arr, exp):
    n = len(arr); output = [0] * n; count = [0] * 10
    for i in range(n): count[(arr[i] // exp) % 10] += 1
    for i in range(1, 10): count[i] += count[i - 1]
    for i in range(n - 1, -1, -1):
        digit = (arr[i] // exp) % 10
        output[count[digit] - 1] = arr[i]; count[digit] -= 1
    return output

def radix_sort(arr):
    if not arr: return arr
    max_val = max(arr); exp = 1
    while max_val // exp > 0:
        arr = counting_sort_for_radix(arr, exp); exp *= 10
    return arr`,
    javascript: `function radixSort(arr) {
    const max = Math.max(...arr);
    for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
        const out = new Array(arr.length);
        const cnt = new Array(10).fill(0);
        
        for (let i = 0; i < arr.length; i++) {
            cnt[Math.floor(arr[i] / exp) % 10]++;
        }
        for (let i = 1; i < 10; i++) {
            cnt[i] += cnt[i - 1];
        }
        for (let i = arr.length - 1; i >= 0; i--) {
            const d = Math.floor(arr[i] / exp) % 10;
            out[--cnt[d]] = arr[i];
        }
        arr = [...out];
    }
    return arr;
}`,
    cpp: `vector<int> radixSort(vector<int> arr) {
    int mx = *max_element(arr.begin(), arr.end());
    for (int exp = 1; mx / exp > 0; exp *= 10) {
        vector<int> out(arr.size());
        int cnt[10] = {0};
        
        for (int x : arr) {
            cnt[(x / exp) % 10]++;
        }
        for (int i = 1; i < 10; i++) {
            cnt[i] += cnt[i - 1];
        }
        for (int i = arr.size() - 1; i >= 0; i--) {
            out[--cnt[(arr[i] / exp) % 10]] = arr[i];
        }
        arr = out;
    }
    return arr;
}`,
    java: `static int[] radixSort(int[] arr) {
    int max = Arrays.stream(arr).max().getAsInt();
    for (int exp = 1; max / exp > 0; exp *= 10) {
        int[] out = new int[arr.length];
        int[] cnt = new int[10];
        
        for (int x : arr) {
            cnt[(x / exp) % 10]++;
        }
        for (int i = 1; i < 10; i++) {
            cnt[i] += cnt[i - 1];
        }
        for (int i = arr.length - 1; i >= 0; i--) {
            out[--cnt[(arr[i] / exp) % 10]] = arr[i];
        }
        arr = out;
    }
    return arr;
}`,
  },
  bucket_sort: {
    python: `def bucket_sort(arr):
    if not arr: return arr
    n = len(arr); buckets = [[] for _ in range(n)]
    for num in arr:
        idx = min(int(n * num / (max(arr) + 1)), n - 1)
        buckets[idx].append(num)
    for b in buckets: b.sort()
    return [x for b in buckets for x in b]`,
    javascript: `function bucketSort(arr) {
    if (!arr.length) return arr;
    const n = arr.length;
    const max = Math.max(...arr);
    const buckets = Array.from({ length: n }, () => []);
    
    for (const num of arr) {
        const idx = Math.min(Math.floor(n * num / (max + 1)), n - 1);
        buckets[idx].push(num);
    }
    for (const b of buckets) {
        b.sort((a, b) => a - b);
    }
    return buckets.flat();
}`,
    cpp: `vector<int> bucketSort(vector<int> arr) {
    if (arr.empty()) return arr;
    int n = arr.size();
    int mx = *max_element(arr.begin(), arr.end());
    vector<vector<int>> buckets(n);
    
    for (int x : arr) {
        buckets[min((int)(n * 1.0 * x / (mx + 1)), n - 1)].push_back(x);
    }
    vector<int> res;
    for (auto& b : buckets) {
        sort(b.begin(), b.end());
        res.insert(res.end(), b.begin(), b.end());
    }
    return res;
}`,
    java: `static int[] bucketSort(int[] arr) {
    if (arr.length == 0) return arr;
    int n = arr.length;
    int max = Arrays.stream(arr).max().getAsInt();
    List<Integer>[] buckets = new List[n];
    
    for (int i = 0; i < n; i++) {
        buckets[i] = new ArrayList<>();
    }
    for (int x : arr) {
        buckets[Math.min((int)(n * 1.0 * x / (max + 1)), n - 1)].add(x);
    }
    List<Integer> res = new ArrayList<>();
    for (List<Integer> b : buckets) {
        Collections.sort(b);
        res.addAll(b);
    }
    return res.stream().mapToInt(i -> i).toArray();
}`,
  },
  dijkstra: {
    python: `import heapq
def dijkstra(graph, start):
    dist = {node: float('inf') for node in graph}
    dist[start] = 0; pq = [(0, start)]
    while pq:
        d, node = heapq.heappop(pq)
        if d > dist[node]: continue
        for neighbor, weight in graph[node]:
            nd = d + weight
            if nd < dist[neighbor]:
                dist[neighbor] = nd
                heapq.heappush(pq, (nd, neighbor))
    return dist`,
    javascript: `function dijkstra(graph, start) {
    const dist = {};
    for (const n in graph) {
        dist[n] = Infinity;
    }
    dist[start] = 0;
    const pq = [[0, start]];
    
    while (pq.length) {
        pq.sort((a, b) => a[0] - b[0]);
        const [d, node] = pq.shift();
        
        if (d > dist[node]) continue;
        for (const [nbr, w] of graph[node]) {
            const nd = d + w;
            if (nd < dist[nbr]) {
                dist[nbr] = nd;
                pq.push([nd, nbr]);
            }
        }
    }
    return dist;
}`,
    cpp: `#include <vector>
#include <queue>
#include <unordered_map>
using namespace std;

unordered_map<int, int> dijkstra(unordered_map<int, vector<pair<int, int>>>& graph, int start) {
    unordered_map<int, int> dist;
    for (auto& pair : graph) {
        dist[pair.first] = 1e9;
    }
    dist[start] = 0;
    
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;
    pq.push({0, start});
    
    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();
        
        if (d > dist[u]) continue;
        for (auto& edge : graph[u]) {
            int v = edge.first;
            int w = edge.second;
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.push({dist[v], v});
            }
        }
    }
    return dist;
}`,
    java: `import java.util.*;

public class Dijkstra {
    public static Map<Integer, Integer> dijkstra(Map<Integer, List<int[]>> graph, int start) {
        Map<Integer, Integer> dist = new HashMap<>();
        for (int node : graph.keySet()) {
            dist.put(node, Integer.MAX_VALUE);
        }
        dist.put(start, 0);
        
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[1] - b[1]);
        pq.offer(new int[]{start, 0});
        
        while (!pq.isEmpty()) {
            int[] curr = pq.poll();
            int u = curr[0];
            int d = curr[1];
            
            if (d > dist.get(u)) continue;
            for (int[] edge : graph.getOrDefault(u, new ArrayList<>())) {
                int v = edge[0];
                int w = edge[1];
                if (dist.get(u) + w < dist.get(v)) {
                    dist.put(v, dist.get(u) + w);
                    pq.offer(new int[]{v, dist.get(v)});
                }
            }
        }
        return dist;
    }
}`,
  },
  bellman_ford: {
    python: `def bellman_ford(edges, n, start):
    dist = [float('inf')] * n; dist[start] = 0
    for _ in range(n - 1):
        for u, v, w in edges:
            if dist[u] != float('inf') and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
    for u, v, w in edges:
        if dist[u] != float('inf') and dist[u] + w < dist[v]:
            return None  # negative cycle detected
    return dist`,
    javascript: `function bellmanFord(edges, n, start) {
    const dist = new Array(n).fill(Infinity);
    dist[start] = 0;
    
    for (let i = 0; i < n - 1; i++) {
        for (const [u, v, w] of edges) {
            if (dist[u] !== Infinity && dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
            }
        }
    }
    return dist;
}`,
    cpp: `#include <vector>
#include <tuple>
using namespace std;

vector<int> bellmanFord(vector<tuple<int, int, int>>& edges, int n, int start) {
    vector<int> dist(n, 1e9);
    dist[start] = 0;
    
    for (int i = 0; i < n - 1; i++) {
        for (auto& [u, v, w] : edges) {
            if (dist[u] != 1e9 && dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
            }
        }
    }
    return dist;
}`,
    java: `import java.util.*;

public class BellmanFord {
    public static int[] bellmanFord(List<int[]> edges, int n, int start) {
        int[] dist = new int[n];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[start] = 0;
        
        for (int i = 0; i < n - 1; i++) {
            for (int[] e : edges) {
                int u = e[0];
                int v = e[1];
                int w = e[2];
                if (dist[u] != Integer.MAX_VALUE && dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                }
            }
        }
        return dist;
    }
}`,
  },
  a_star: {
    python: `import heapq
def heuristic(a, b): return abs(a[0]-b[0]) + abs(a[1]-b[1])
def a_star(grid, start, goal):
    rows, cols = len(grid), len(grid[0])
    open_set = [(0, start)]; g_score = {start: 0}
    while open_set:
        _, cur = heapq.heappop(open_set)
        if cur == goal: return g_score[cur]
        for dx, dy in [(0,1),(0,-1),(1,0),(-1,0)]:
            nb = (cur[0]+dx, cur[1]+dy)
            if 0<=nb[0]<rows and 0<=nb[1]<cols:
                tg = g_score[cur] + 1
                if nb not in g_score or tg < g_score[nb]:
                    g_score[nb] = tg
                    heapq.heappush(open_set, (tg + heuristic(nb, goal), nb))
    return -1`,
    javascript: `function aStar(grid, start, goal) {
    const h = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
    const R = grid.length;
    const C = grid[0].length;
    const open = [[0, start[0], start[1]]];
    const g = {};
    g[start] = 0;
    
    while (open.length) {
        open.sort((a, b) => a[0] - b[0]);
        const [, r, c] = open.shift();
        if (r === goal[0] && c === goal[1]) {
            return g[[r, c]];
        }
        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < R && nc >= 0 && nc < C) {
                const tg = (g[[r, c]] || 0) + 1;
                const k = [nr, nc];
                if (tg < (g[k] ?? Infinity)) {
                    g[k] = tg;
                    open.push([tg + h([nr, nc], goal), nr, nc]);
                }
            }
        }
    }
    return -1;
}`,
    cpp: `#include <vector>
#include <queue>
#include <cmath>
#include <map>
using namespace std;

struct Node {
    int r, c, f, g;
    bool operator>(const Node& other) const { return f > other.f; }
};

int aStar(vector<vector<int>>& grid, pair<int, int> start, pair<int, int> goal) {
    int R = grid.size(), C = grid[0].size();
    auto h = [](pair<int, int> a, pair<int, int> b) {
        return abs(a.first - b.first) + abs(a.second - b.second);
    };
    
    priority_queue<Node, vector<Node>, greater<Node>> open;
    map<pair<int, int>, int> g;
    
    open.push({start.first, start.second, h(start, goal), 0});
    g[start] = 0;
    
    while (!open.empty()) {
        auto [r, c, f, curr_g] = open.top();
        open.pop();
        
        if (r == goal.first && c == goal.second) return g[goal];
        
        int dr[] = {0, 0, 1, -1};
        int dc[] = {1, -1, 0, 0};
        for (int i = 0; i < 4; i++) {
            int nr = r + dr[i], nc = c + dc[i];
            if (nr >= 0 && nr < R && nc >= 0 && nc < C) {
                int tg = curr_g + 1;
                pair<int, int> neighbor = {nr, nc};
                if (g.find(neighbor) == g.end() || tg < g[neighbor]) {
                    g[neighbor] = tg;
                    open.push({nr, nc, tg + h(neighbor, goal), tg});
                }
            }
        }
    }
    return -1;
}`,
    java: `import java.util.*;

public class AStar {
    static class Node implements Comparable<Node> {
        int r, c, f, g;
        Node(int r, int c, int f, int g) {
            this.r = r; this.c = c; this.f = f; this.g = g;
        }
        public int compareTo(Node o) { return Integer.compare(this.f, o.f); }
    }
    
    public static int aStar(int[][] grid, int[] start, int[] goal) {
        int R = grid.length, C = grid[0].length;
        PriorityQueue<Node> open = new PriorityQueue<>();
        Map<String, Integer> g = new HashMap<>();
        
        open.offer(new Node(start[0], start[1], Math.abs(start[0]-goal[0]) + Math.abs(start[1]-goal[1]), 0));
        g.put(start[0] + "," + start[1], 0);
        
        while (!open.isEmpty()) {
            Node curr = open.poll();
            if (curr.r == goal[0] && curr.c == goal[1]) return curr.g;
            
            int[][] dirs = {{0, 1}, {0, -1}, {1, 0}, {-1, 0}};
            for (int[] d : dirs) {
                int nr = curr.r + d[0], nc = curr.c + d[1];
                if (nr >= 0 && nr < R && nc >= 0 && nc < C) {
                    int tg = curr.g + 1;
                    String key = nr + "," + nc;
                    if (tg < g.getOrDefault(key, Integer.MAX_VALUE)) {
                        g.put(key, tg);
                        open.offer(new Node(nr, nc, tg + Math.abs(nr-goal[0]) + Math.abs(nc-goal[1]), tg));
                    }
                }
            }
        }
        return -1;
    }
}`,
  },
  floyd: {
    python: `def floyd_warshall(graph):
    n = len(graph)
    dist = [row[:] for row in graph]
    for k in range(n):
        for i in range(n):
            for j in range(n):
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]
    return dist`,
    javascript: `function floydWarshall(graph) {
    const n = graph.length;
    const dist = graph.map(r => [...r]);
    for (let k = 0; k < n; k++) {
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (dist[i][k] + dist[k][j] < dist[i][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];
                }
            }
        }
    }
    return dist;
}`,
    cpp: `vector<vector<int>> floydWarshall(vector<vector<int>> g) {
    int n = g.size();
    for (int k = 0; k < n; k++) {
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                if (g[i][k] != 1e9 && g[k][j] != 1e9 && g[i][k] + g[k][j] < g[i][j]) {
                    g[i][j] = g[i][k] + g[k][j];
                }
            }
        }
    }
    return g;
}`,
    java: `static int[][] floydWarshall(int[][] g) {
    int n = g.length;
    int[][] d = new int[n][n];
    for (int i = 0; i < n; i++) {
        d[i] = g[i].clone();
    }
    for (int k = 0; k < n; k++) {
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                if (d[i][k] != Integer.MAX_VALUE && d[k][j] != Integer.MAX_VALUE && d[i][k] + d[k][j] < d[i][j]) {
                    d[i][j] = d[i][k] + d[k][j];
                }
            }
        }
    }
    return d;
}`,
  },
  prim: {
    python: `import heapq
def prim(graph, n):
    visited = [False] * n; pq = [(0, 0, -1)]; mst = []
    while pq and len(mst) < n - 1:
        w, u, prev = heapq.heappop(pq)
        if visited[u]: continue
        visited[u] = True
        if prev != -1: mst.append((prev, u, w))
        for v, weight in graph[u]:
            if not visited[v]: heapq.heappush(pq, (weight, v, u))
    return mst`,
    javascript: `function prim(graph, n) {
    const vis = new Array(n).fill(false);
    const pq = [[0, 0, -1]];
    const mst = [];
    
    while (pq.length && mst.length < n - 1) {
        pq.sort((a, b) => a[0] - b[0]);
        const [w, u, p] = pq.shift();
        if (vis[u]) continue;
        vis[u] = true;
        if (p !== -1) mst.push([p, u, w]);
        for (const [v, wt] of graph[u]) {
            if (!vis[v]) pq.push([wt, v, u]);
        }
    }
    return mst;
}`,
    cpp: `#include <vector>
#include <queue>
using namespace std;

vector<pair<int, int>> prim(vector<vector<pair<int, int>>>& graph, int n) {
    vector<bool> vis(n, false);
    priority_queue<tuple<int, int, int>, vector<tuple<int, int, int>>, greater<tuple<int, int, int>>> pq;
    vector<pair<int, int>> mst;
    
    pq.push({0, 0, -1});
    
    while (!pq.empty() && mst.size() < n - 1) {
        auto [w, u, p] = pq.top();
        pq.pop();
        
        if (vis[u]) continue;
        vis[u] = true;
        if (p != -1) mst.push_back({p, u});
        
        for (auto& edge : graph[u]) {
            int v = edge.first;
            int wt = edge.second;
            if (!vis[v]) pq.push({wt, v, u});
        }
    }
    return mst;
}`,
    java: `import java.util.*;

public class Prim {
    public static List<int[]> prim(List<List<int[]>> graph, int n) {
        boolean[] vis = new boolean[n];
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);
        List<int[]> mst = new ArrayList<>();
        
        pq.offer(new int[]{0, 0, -1});
        
        while (!pq.isEmpty() && mst.size() < n - 1) {
            int[] curr = pq.poll();
            int w = curr[0];
            int u = curr[1];
            int p = curr[2];
            
            if (vis[u]) continue;
            vis[u] = true;
            if (p != -1) mst.add(new int[]{p, u, w});
            
            for (int[] edge : graph.get(u)) {
                int v = edge[0];
                int wt = edge[1];
                if (!vis[v]) pq.offer(new int[]{wt, v, u});
            }
        }
        return mst;
    }
}`,
  },
  kruskal: {
    python: `def find(parent, x):
    if parent[x] != x: parent[x] = find(parent, parent[x])
    return parent[x]

def kruskal(edges, n):
    edges.sort(key=lambda x: x[2])
    parent = list(range(n)); mst = []
    for u, v, w in edges:
        pu, pv = find(parent, u), find(parent, v)
        if pu != pv: parent[pu] = pv; mst.append((u, v, w))
    return mst`,
    javascript: `function kruskal(edges, n) {
    edges.sort((a, b) => a[2] - b[2]);
    const p = Array.from({ length: n }, (_, i) => i);
    const find = x => p[x] === x ? x : p[x] = find(p[x]);
    const mst = [];
    
    for (const [u, v, w] of edges) {
        const pu = find(u);
        const pv = find(v);
        if (pu !== pv) {
            p[pu] = pv;
            mst.push([u, v, w]);
        }
    }
    return mst;
}`,
    cpp: `#include <vector>
#include <algorithm>
using namespace std;

struct Edge {
    int u, v, w;
    bool operator<(const Edge& other) const { return w < other.w; }
};

int findParent(vector<int>& parent, int i) {
    if (parent[i] == i) return i;
    return parent[i] = findParent(parent, parent[i]);
}

vector<Edge> kruskal(vector<Edge>& edges, int n) {
    sort(edges.begin(), edges.end());
    vector<int> parent(n);
    for (int i = 0; i < n; i++) parent[i] = i;
    
    vector<Edge> mst;
    for (auto& edge : edges) {
        int pu = findParent(parent, edge.u);
        int pv = findParent(parent, edge.v);
        if (pu != pv) {
            parent[pu] = pv;
            mst.push_back(edge);
        }
    }
    return mst;
}`,
    java: `import java.util.*;

public class Kruskal {
    static class Edge implements Comparable<Edge> {
        int u, v, w;
        Edge(int u, int v, int w) { this.u = u; this.v = v; this.w = w; }
        public int compareTo(Edge o) { return Integer.compare(this.w, o.w); }
    }
    
    private static int find(int[] parent, int i) {
        if (parent[i] == i) return i;
        return parent[i] = find(parent, parent[i]);
    }
    
    public static List<Edge> kruskal(List<Edge> edges, int n) {
        Collections.sort(edges);
        int[] parent = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;
        
        List<Edge> mst = new ArrayList<>();
        for (Edge edge : edges) {
            int pu = find(parent, edge.u);
            int pv = find(parent, edge.v);
            if (pu != pv) {
                parent[pu] = pv;
                mst.add(edge);
            }
        }
        return mst;
    }
}`,
  },
  topological_sort: {
    python: `from collections import deque
def topological_sort(n, edges):
    indegree = [0] * n; graph = [[] for _ in range(n)]
    for u, v in edges: graph[u].append(v); indegree[v] += 1
    q = deque([i for i in range(n) if indegree[i] == 0])
    result = []
    while q:
        u = q.popleft(); result.append(u)
        for v in graph[u]:
            indegree[v] -= 1
            if indegree[v] == 0: q.append(v)
    return result`,
    javascript: `function topologicalSort(n, edges) {
    const indeg = new Array(n).fill(0);
    const g = Array.from({ length: n }, () => []);
    for (const [u, v] of edges) {
        g[u].push(v);
        indeg[v]++;
    }
    const q = [];
    const res = [];
    for (let i = 0; i < n; i++) {
        if (indeg[i] === 0) q.push(i);
    }
    while (q.length) {
        const u = q.shift();
        res.push(u);
        for (const v of g[u]) {
            if (--indeg[v] === 0) q.push(v);
        }
    }
    return res;
}`,
    cpp: `#include <vector>
#include <queue>
using namespace std;

vector<int> topologicalSort(int n, vector<pair<int, int>>& edges) {
    vector<int> indeg(n, 0);
    vector<vector<int>> g(n);
    for (auto& edge : edges) {
        g[edge.first].push_back(edge.second);
        indeg[edge.second]++;
    }
    queue<int> q;
    vector<int> res;
    for (int i = 0; i < n; i++) {
        if (indeg[i] == 0) q.push(i);
    }
    while (!q.empty()) {
        int u = q.front();
        q.pop();
        res.push_back(u);
        for (int v : g[u]) {
            if (--indeg[v] == 0) q.push(v);
        }
    }
    return res;
}`,
    java: `import java.util.*;

public class TopologicalSort {
    public static List<Integer> topologicalSort(int n, List<int[]> edges) {
        int[] indeg = new int[n];
        List<List<Integer>> g = new ArrayList<>();
        for (int i = 0; i < n; i++) g.add(new ArrayList<>());
        for (int[] edge : edges) {
            g.get(edge[0]).add(edge[1]);
            indeg[edge[1]]++;
        }
        Queue<Integer> q = new LinkedList<>();
        List<Integer> res = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            if (indeg[i] == 0) q.add(i);
        }
        while (!q.isEmpty()) {
            int u = q.poll();
            res.add(u);
            for (int v : g.get(u)) {
                if (--indeg[v] == 0) q.add(v);
            }
        }
        return res;
    }
}`,
  },
  array: {
    python: `# Array operations
arr = [1, 2, 3, 4, 5]
arr.append(6)          # O(1) amortized
arr.insert(0, 0)       # O(n) - shift elements
arr.pop()              # O(1)
arr[2] = 10            # O(1) random access`,
    javascript: `// Array operations
const arr = [1, 2, 3, 4, 5];
arr.push(6);             // O(1) amortized
arr.splice(0, 0, 0);     // O(n) - shift elements
arr.pop();               // O(1)
arr[2] = 10;             // O(1) random access`,
    cpp: `#include <vector>
using namespace std;

// Vector operations
vector<int> arr = {1, 2, 3, 4, 5};
arr.push_back(6);                // O(1) amortized
arr.insert(arr.begin(), 0);      // O(n) - shift elements
arr.pop_back();                  // O(1)
arr[2] = 10;                     // O(1) random access`,
    java: `import java.util.ArrayList;

// ArrayList operations
ArrayList<Integer> arr = new ArrayList<>(java.util.Arrays.asList(1, 2, 3, 4, 5));
arr.add(6);                     // O(1) amortized
arr.add(0, 0);                  // O(n) - shift elements
arr.remove(arr.size() - 1);     // O(1)
arr.set(2, 10);                 // O(1) random access`,
  },
  linked_list: {
    python: `class Node:
    def __init__(self, val):
        self.val = val; self.next = None

def traverse(head):
    cur = head
    while cur:
        print(cur.val, end=' -> ')
        cur = cur.next
    print('null')

def insert_head(head, val):
    node = Node(val); node.next = head
    return node`,
    javascript: `class ListNode {
    constructor(val) {
        this.val = val;
        this.next = null;
    }
}

function traverse(head) {
    let cur = head;
    while (cur) {
        console.log(cur.val + " -> ");
        cur = cur.next;
    }
    console.log("null");
}

function insertHead(head, val) {
    const node = new ListNode(val);
    node.next = head;
    return node;
}`,
    cpp: `#include <iostream>
using namespace std;

struct Node {
    int val;
    Node* next;
    Node(int v) : val(v), next(nullptr) {}
};

void traverse(Node* head) {
    Node* cur = head;
    while (cur) {
        cout << cur->val << " -> ";
        cur = cur->next;
    }
    cout << "null" << endl;
}

Node* insertHead(Node* head, int val) {
    Node* node = new Node(val);
    node->next = head;
    return node;
}`,
    java: `public class LinkedListDemo {
    static class Node {
        int val;
        Node next;
        Node(int val) { this.val = val; }
    }
    
    public static void traverse(Node head) {
        Node cur = head;
        while (cur != null) {
            System.out.print(cur.val + " -> ");
            cur = cur.next;
        }
        System.out.println("null");
    }
    
    public static Node insertHead(Node head, int val) {
        Node node = new Node(val);
        node.next = head;
        return node;
    }
}`,
  },
  doubly_linked_list: {
    python: `class Node:
    def __init__(self, val):
        self.val = val; self.prev = None; self.next = None

def insert_after(node, val):
    new_node = Node(val)
    new_node.prev = node; new_node.next = node.next
    if node.next: node.next.prev = new_node
    node.next = new_node`,
    javascript: `class DLLNode {
    constructor(val) {
        this.val = val;
        this.prev = null;
        this.next = null;
    }
}

function insertAfter(node, val) {
    const newNode = new DLLNode(val);
    newNode.prev = node;
    newNode.next = node.next;
    if (node.next) {
        node.next.prev = newNode;
    }
    node.next = newNode;
}`,
    cpp: `struct DLLNode {
    int val;
    DLLNode* prev;
    DLLNode* next;
    DLLNode(int v) : val(v), prev(nullptr), next(nullptr) {}
};

void insertAfter(DLLNode* node, int val) {
    if (!node) return;
    DLLNode* newNode = new DLLNode(val);
    newNode->prev = node;
    newNode->next = node->next;
    if (node->next) {
        node->next->prev = newNode;
    }
    node->next = newNode;
}`,
    java: `public class DoublyLinkedListDemo {
    static class DLLNode {
        int val;
        DLLNode prev, next;
        DLLNode(int val) { this.val = val; }
    }
    
    public static void insertAfter(DLLNode node, int val) {
        if (node == null) return;
        DLLNode newNode = new DLLNode(val);
        newNode.prev = node;
        newNode.next = node.next;
        if (node.next != null) {
            node.next.prev = newNode;
        }
        node.next = newNode;
    }
}`,
  },
  stack: {
    python: `class Stack:
    def __init__(self):
        self.items = []
        
    def push(self, item):
        self.items.append(item)
        
    def pop(self):
        if not self.is_empty():
            return self.items.pop()
        return None
        
    def peek(self):
        if not self.is_empty():
            return self.items[-1]
        return None
        
    def is_empty(self):
        return len(self.items) == 0`,
    javascript: `class Stack {
    constructor() {
        this.items = [];
    }
    
    push(item) {
        this.items.push(item);
    }
    
    pop() {
        if (!this.isEmpty()) {
            return this.items.pop();
        }
        return null;
    }
    
    peek() {
        if (!this.isEmpty()) {
            return this.items[this.items.length - 1];
        }
        return null;
    }
    
    isEmpty() {
        return this.items.length === 0;
    }
}`,
    cpp: `#include <vector>
#include <stdexcept>
using namespace std;

class Stack {
private:
    vector<int> items;
public:
    void push(int item) {
        items.push_back(item);
    }
    
    int pop() {
        if (!isEmpty()) {
            int val = items.back();
            items.pop_back();
            return val;
        }
        throw runtime_error("Stack is empty");
    }
    
    int peek() {
        if (!isEmpty()) {
            return items.back();
        }
        throw runtime_error("Stack is empty");
    }
    
    bool isEmpty() {
        return items.empty();
    }
};`,
    java: `import java.util.ArrayList;

public class Stack {
    private ArrayList<Integer> items = new ArrayList<>();
    
    public void push(int item) {
        items.add(item);
    }
    
    public int pop() {
        if (!isEmpty()) {
            return items.remove(items.size() - 1);
        }
        throw new IllegalStateException("Stack is empty");
    }
    
    public int peek() {
        if (!isEmpty()) {
            return items.get(items.size() - 1);
        }
        throw new IllegalStateException("Stack is empty");
    }
    
    public boolean isEmpty() {
        return items.isEmpty();
    }
}`,
  },
  queue: {
    python: `from collections import deque

class Queue:
    def __init__(self):
        self.items = deque()
        
    def enqueue(self, item):
        self.items.append(item)
        
    def dequeue(self):
        if not self.is_empty():
            return self.items.popleft()
        return None
        
    def peek_front(self):
        if not self.is_empty():
            return self.items[0]
        return None
        
    def is_empty(self):
        return len(self.items) == 0`,
    javascript: `class Queue {
    constructor() {
        this.items = [];
    }
    
    enqueue(item) {
        this.items.push(item);
    }
    
    dequeue() {
        if (!this.isEmpty()) {
            return this.items.shift();
        }
        return null;
    }
    
    peekFront() {
        if (!this.isEmpty()) {
            return this.items[0];
        }
        return null;
    }
    
    isEmpty() {
        return this.items.length === 0;
    }
}`,
    cpp: `#include <queue>
#include <stdexcept>
using namespace std;

class Queue {
private:
    queue<int> items;
public:
    void enqueue(int item) {
        items.push(item);
    }
    
    int dequeue() {
        if (!isEmpty()) {
            int val = items.front();
            items.pop();
            return val;
        }
        throw runtime_error("Queue is empty");
    }
    
    int peekFront() {
        if (!isEmpty()) {
            return items.front();
        }
        throw runtime_error("Queue is empty");
    }
    
    bool isEmpty() {
        return items.empty();
    }
};`,
    java: `import java.util.LinkedList;

public class QueueDemo {
    private java.util.Queue<Integer> items = new LinkedList<>();
    
    public void enqueue(int item) {
        items.offer(item);
    }
    
    public int dequeue() {
        if (!isEmpty()) {
            return items.poll();
        }
        throw new IllegalStateException("Queue is empty");
    }
    
    public int peekFront() {
        if (!isEmpty()) {
            return items.peek();
        }
        throw new IllegalStateException("Queue is empty");
    }
    
    public boolean isEmpty() {
        return items.isEmpty();
    }
}`,
  },
  binary_tree: {
    python: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val; self.left = left; self.right = right

def inorder(root):
    if not root: return
    inorder(root.left); print(root.val, end=' '); inorder(root.right)

def preorder(root):
    if not root: return
    print(root.val, end=' '); preorder(root.left); preorder(root.right)

def postorder(root):
    if not root: return
    postorder(root.left); postorder(root.right); print(root.val, end=' ')`,
    javascript: `function inorder(root) {
    if (!root) return;
    inorder(root.left);
    console.log(root.val);
    inorder(root.right);
}`,
    cpp: `struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

void inorder(TreeNode* root) {
    if (!root) return;
    inorder(root->left);
    cout << root->val << " ";
    inorder(root->right);
}`,
    java: `public class BinaryTreeDemo {
    static class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int val) { this.val = val; }
    }
    
    public static void inorder(TreeNode root) {
        if (root == null) return;
        inorder(root.left);
        System.out.print(root.val + " ");
        inorder(root.right);
    }
}`,
  },
  bst: {
    python: `class TreeNode:
    def __init__(self, val=0):
        self.val = val; self.left = None; self.right = None

def insert(root, val):
    if not root: return TreeNode(val)
    if val < root.val: root.left = insert(root.left, val)
    else: root.right = insert(root.right, val)
    return root

def search(root, val):
    if not root or root.val == val: return root
    return search(root.left, val) if val < root.val else search(root.right, val)`,
    javascript: `function search(root, val) {
    if (!root || root.val === val) return root;
    return val < root.val ? search(root.left, val) : search(root.right, val);
}`,
    cpp: `struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

TreeNode* search(TreeNode* root, int val) {
    if (!root || root->val == val) return root;
    return val < root->val ? search(root->left, val) : search(root->right, val);
}`,
    java: `public class BSTDemo {
    static class TreeNode {
        int val;
        TreeNode left, right;
        TreeNode(int val) { this.val = val; }
    }
    
    public static TreeNode search(TreeNode root, int val) {
        if (root == null || root.val == val) return root;
        return val < root.val ? search(root.left, val) : search(root.right, val);
    }
}`,
  },
  avl_tree: {
    python: `class Node:
    def __init__(self, val):
        self.val = val; self.left = None; self.right = None; self.height = 1

def height(n): return n.height if n else 0
def balance(n): return height(n.left) - height(n.right) if n else 0

def right_rotate(y):
    x = y.left; T2 = x.right
    x.right = y; y.left = T2
    y.height = 1 + max(height(y.left), height(y.right))
    x.height = 1 + max(height(x.left), height(x.right))
    return x

def left_rotate(x):
    y = x.right; T2 = y.left
    y.left = x; x.right = T2
    x.height = 1 + max(height(x.left), height(x.right))
    y.height = 1 + max(height(y.left), height(y.right))
    return y`,
    javascript: `function height(node) {
    return node ? node.height : 0;
}

function rightRotate(y) {
    const x = y.left;
    const T2 = x.right;
    x.right = y;
    y.left = T2;
    y.height = Math.max(height(y.left), height(y.right)) + 1;
    x.height = Math.max(height(x.left), height(x.right)) + 1;
    return x;
}`,
    cpp: `struct Node {
    int val, height;
    Node *left, *right;
};

int getHeight(Node* n) { return n ? n->height : 0; }

Node* rightRotate(Node* y) {
    Node* x = y->left;
    Node* T2 = x->right;
    x->right = y;
    y->left = T2;
    y->height = max(getHeight(y->left), getHeight(y->right)) + 1;
    x->height = max(getHeight(x->left), getHeight(x->right)) + 1;
    return x;
}`,
    java: `public class AVLTreeDemo {
    static class Node {
        int val, height;
        Node left, right;
        Node(int val) { this.val = val; this.height = 1; }
    }
    
    private static int getHeight(Node n) { return n == null ? 0 : n.height; }
    
    public static Node rightRotate(Node y) {
        Node x = y.left;
        Node T2 = x.right;
        x.right = y;
        y.left = T2;
        y.height = Math.max(getHeight(y.left), getHeight(y.right)) + 1;
        x.height = Math.max(getHeight(x.left), getHeight(x.right)) + 1;
        return x;
    }
}`,
  },
  red_black_tree: {
    python: `# Red-Black Tree - 5 invariants:
# 1) Nodes are RED or BLACK
# 2) Root is BLACK
# 3) Leaves (NIL) are BLACK
# 4) RED node's children must be BLACK
# 5) Every path from node to descendant leaves has same number of BLACK nodes
# Java: java.util.TreeMap is a Red-Black Tree`,
    javascript: `function leftRotate(root, x) {
    const y = x.right;
    x.right = y.left;
    if (y.left !== null) y.left.parent = x;
    y.parent = x.parent;
    if (x.parent === null) root = y;
    else if (x === x.parent.left) x.parent.left = y;
    else x.parent.right = y;
    y.left = x;
    x.parent = y;
    return root;
}`,
    cpp: `struct Node {
    int val;
    Node *left, *right, *parent;
    bool color; // 0 for BLACK, 1 for RED
};

void leftRotate(Node*& root, Node* x) {
    Node* y = x->right;
    x->right = y->left;
    if (y->left != nullptr) y->left->parent = x;
    y->parent = x->parent;
    if (x->parent == nullptr) root = y;
    else if (x == x->parent->left) x->parent->left = y;
    else x->parent->right = y;
    y->left = x;
    x->parent = y;
}`,
    java: `public class RedBlackTreeDemo {
    static class Node {
        int val;
        Node left, right, parent;
        boolean color; // true for RED, false for BLACK
    }
    
    public static Node leftRotate(Node root, Node x) {
        Node y = x.right;
        x.right = y.left;
        if (y.left != null) y.left.parent = x;
        y.parent = x.parent;
        if (x.parent == null) root = y;
        else if (x == x.parent.left) x.parent.left = y;
        else x.parent.right = y;
        y.left = x;
        x.parent = y;
        return root;
    }
}`,
  },
  heap_ds: {
    python: `import heapq
# Min-Heap
heap = []
heapq.heappush(heap, 3)  # insert
heapq.heappush(heap, 1)
heapq.heappush(heap, 2)
print(heapq.heappop(heap))  # 1 (pop min)
print(heap[0])              # 2 (peek)

# Max-Heap (negate values)
max_heap = []
heapq.heappush(max_heap, -3)
print(-heapq.heappop(max_heap))  # 3`,
    javascript: `class MinHeap {
    constructor() {
        this.heap = [];
    }
    push(val) {
        this.heap.push(val);
        this.bubbleUp(this.heap.length - 1);
    }
    pop() {
        if (this.heap.length === 0) return null;
        const top = this.heap[0];
        const end = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = end;
            this.sinkDown(0);
        }
        return top;
    }
}`,
    cpp: `#include <queue>
#include <iostream>
using namespace std;

void heapDemo() {
    priority_queue<int, vector<int>, greater<int>> min_heap;
    min_heap.push(3);
    min_heap.push(1);
    cout << min_heap.top() << endl; // 1
    min_heap.pop();
}`,
    java: `import java.util.PriorityQueue;

public class HeapDemo {
    public static void main(String[] args) {
        PriorityQueue<Integer> minHeap = new PriorityQueue<>();
        minHeap.offer(3);
        minHeap.offer(1);
        System.out.println(minHeap.peek()); // 1
        minHeap.poll();
    }
}`,
  },
  trie: {
    python: `class TrieNode:
    def __init__(self):
        self.children = {}; self.is_end = False

class Trie:
    def __init__(self): self.root = TrieNode()
    def insert(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.is_end = True
    def search(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children: return False
            node = node.children[ch]
        return node.is_end
    def starts_with(self, prefix):
        node = self.root
        for ch in prefix:
            if ch not in node.children: return False
            node = node.children[ch]
        return True`,
    javascript: `class TrieNode {
    constructor() {
        this.children = {};
        this.isEndOfWord = false;
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode();
    }
    insert(word) {
        let node = this.root;
        for (const ch of word) {
            if (!node.children[ch]) node.children[ch] = new TrieNode();
            node = node.children[ch];
        }
        node.isEndOfWord = true;
    }
}`,
    cpp: `#include <unordered_map>
#include <string>
using namespace std;

struct TrieNode {
    unordered_map<char, TrieNode*> children;
    bool isEndOfWord = false;
};

class Trie {
private:
    TrieNode* root;
public:
    Trie() { root = new TrieNode(); }
    void insert(string word) {
        TrieNode* node = root;
        for (char ch : word) {
            if (!node->children.count(ch)) node->children[ch] = new TrieNode();
            node = node->children[ch];
        }
        node->isEndOfWord = true;
    }
};`,
    java: `import java.util.HashMap;

public class TrieDemo {
    static class TrieNode {
        HashMap<Character, TrieNode> children = new HashMap<>();
        boolean isEndOfWord = false;
    }
    
    static class Trie {
        TrieNode root = new TrieNode();
        
        public void insert(String word) {
            TrieNode node = root;
            for (char ch : word.toCharArray()) {
                node.children.putIfAbsent(ch, new TrieNode());
                node = node.children.get(ch);
            }
            node.isEndOfWord = true;
        }
    }
}`,
  },
  union_find: {
    python: `class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n)); self.rank = [0] * n
    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]
    def union(self, x, y):
        px, py = self.find(x), self.find(y)
        if px == py: return
        if self.rank[px] < self.rank[py]: self.parent[px] = py
        elif self.rank[px] > self.rank[py]: self.parent[py] = px
        else: self.parent[py] = px; self.rank[px] += 1`,
    javascript: `class UnionFind {
    constructor(size) {
        this.parent = Array.from({ length: size }, (_, i) => i);
        this.rank = new Array(size).fill(0);
    }
    find(x) {
        if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
        return this.parent[x];
    }
    union(x, y) {
        const px = this.find(x), py = this.find(y);
        if (px !== py) {
            if (this.rank[px] < this.rank[py]) this.parent[px] = py;
            else if (this.rank[px] > this.rank[py]) this.parent[py] = px;
            else { this.parent[py] = px; this.rank[px]++; }
        }
    }
}`,
    cpp: `#include <vector>
using namespace std;

class UnionFind {
private:
    vector<int> parent, rank;
public:
    UnionFind(int size) {
        parent.resize(size);
        rank.assign(size, 0);
        for (int i = 0; i < size; i++) parent[i] = i;
    }
    int find(int x) {
        if (parent[x] != x) parent[x] = find(parent[x]);
        return parent[x];
    }
    void join(int x, int y) {
        int px = find(x), py = find(y);
        if (px != py) {
            if (rank[px] < rank[py]) parent[px] = py;
            else if (rank[px] > rank[py]) parent[py] = px;
            else { parent[py] = px; rank[px]++; }
        }
    }
};`,
    java: `public class UnionFind {
    private int[] parent, rank;
    
    public UnionFind(int size) {
        parent = new int[size];
        rank = new int[size];
        for (int i = 0; i < size; i++) parent[i] = i;
    }
    
    public int find(int x) {
        if (parent[x] != x) parent[x] = find(parent[x]);
        return parent[x];
    }
    
    public void union(int x, int y) {
        int px = find(x), py = find(y);
        if (px != py) {
            if (rank[px] < rank[py]) parent[px] = py;
            else if (rank[px] > rank[py]) parent[py] = px;
            else { parent[py] = px; rank[px]++; }
        }
    }
}`,
  },
  hash_table: {
    python: `# Python dict = Hash Table
hash_map = {}
hash_map["key"] = "value"
print(hash_map.get("key"))          # "value"
print(hash_map.get("miss", "def"))  # "def"
# Custom: hash(key) % size`,
    javascript: `// JavaScript Map represents Hash Table
const hashMap = new Map();
hashMap.set("key", "value");
console.log(hashMap.get("key")); // "value"
console.log(hashMap.has("miss") ? hashMap.get("miss") : "def");`,
    cpp: `#include <unordered_map>
#include <string>
#include <iostream>
using namespace std;

void hashDemo() {
    unordered_map<string, string> hash_map;
    hash_map["key"] = "value";
    cout << hash_map["key"] << endl;
}`,
    java: `import java.util.HashMap;

public class HashDemo {
    public static void main(String[] args) {
        HashMap<String, String> hashMap = new HashMap<>();
        hashMap.put("key", "value");
        System.out.println(hashMap.get("key"));
    }
}`,
  },
  knapsack_01: {
    python: `def knapsack_01(weights, values, capacity):
    n = len(weights)
    dp = [[0] * (capacity + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for w in range(capacity + 1):
            if weights[i-1] <= w:
                dp[i][w] = max(dp[i-1][w], dp[i-1][w-weights[i-1]] + values[i-1])
            else: dp[i][w] = dp[i-1][w]
    return dp[n][capacity]`,
    javascript: `function knapsack01(weights, values, capacity) {
    const n = weights.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));
    
    for (let i = 1; i <= n; i++) {
        for (let w = 0; w <= capacity; w++) {
            if (weights[i - 1] <= w) {
                dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - weights[i - 1]] + values[i - 1]);
            } else {
                dp[i][w] = dp[i - 1][w];
            }
        }
    }
    return dp[n][capacity];
}`,
    cpp: `#include <vector>
#include <algorithm>
using namespace std;

int knapsack01(vector<int>& weights, vector<int>& values, int capacity) {
    int n = weights.size();
    vector<vector<int>> dp(n + 1, vector<int>(capacity + 1, 0));
    
    for (int i = 1; i <= n; i++) {
        for (int w = 0; w <= capacity; w++) {
            if (weights[i - 1] <= w) {
                dp[i][w] = max(dp[i - 1][w], dp[i - 1][w - weights[i - 1]] + values[i - 1]);
            } else {
                dp[i][w] = dp[i - 1][w];
            }
        }
    }
    return dp[n][capacity];
}`,
    java: `public class Knapsack01 {
    public static int knapsack01(int[] weights, int[] values, int capacity) {
        int n = weights.length;
        int[][] dp = new int[n + 1][capacity + 1];
        
        for (int i = 1; i <= n; i++) {
            for (int w = 0; w <= capacity; w++) {
                if (weights[i - 1] <= w) {
                    dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - weights[i - 1]] + values[i - 1]);
                } else {
                    dp[i][w] = dp[i - 1][w];
                }
            }
        }
        return dp[n][capacity];
    }
}`,
  },
  unbounded_knapsack: {
    python: `def unbounded_knapsack(weights, values, capacity):
    dp = [0] * (capacity + 1)
    for w in range(capacity + 1):
        for i in range(len(weights)):
            if weights[i] <= w:
                dp[w] = max(dp[w], dp[w - weights[i]] + values[i])
    return dp[capacity]`,
    javascript: `function unboundedKnapsack(weights, values, capacity) {
    const dp = new Array(capacity + 1).fill(0);
    for (let w = 0; w <= capacity; w++) {
        for (let i = 0; i < weights.length; i++) {
            if (weights[i] <= w) {
                dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
            }
        }
    }
    return dp[capacity];
}`,
    cpp: `#include <vector>
#include <algorithm>
using namespace std;

int unboundedKnapsack(vector<int>& weights, vector<int>& values, int capacity) {
    vector<int> dp(capacity + 1, 0);
    for (int w = 0; w <= capacity; w++) {
        for (size_t i = 0; i < weights.size(); i++) {
            if (weights[i] <= w) {
                dp[w] = max(dp[w], dp[w - weights[i]] + values[i]);
            }
        }
    }
    return dp[capacity];
}`,
    java: `public class UnboundedKnapsack {
    public static int unboundedKnapsack(int[] weights, int[] values, int capacity) {
        int[] dp = new int[capacity + 1];
        for (int w = 0; w <= capacity; w++) {
            for (int i = 0; i < weights.length; i++) {
                if (weights[i] <= w) {
                    dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
                }
            }
        }
        return dp[capacity];
    }
}`,
  },
  lcs: {
    python: `def lcs(text1, text2):
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i-1] == text2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else: dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    return dp[m][n]`,
    javascript: `function lcs(text1, text2) {
    const m = text1.length, n = text2.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (text1[i - 1] === text2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    return dp[m][n];
}`,
    cpp: `#include <string>
#include <vector>
#include <algorithm>
using namespace std;

int lcs(string text1, string text2) {
    int m = text1.length(), n = text2.length();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
    
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (text1[i - 1] == text2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    return dp[m][n];
}`,
    java: `public class LCS {
    public static int lcs(String text1, String text2) {
        int m = text1.length(), n = text2.length();
        int[][] dp = new int[m + 1][n + 1];
        
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (text1.charAt(i - 1) == text2.charAt(j - 1)) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }
        return dp[m][n];
    }
}`,
  },
  lis: {
    python: `def lis(nums):
    if not nums: return 0
    n = len(nums); dp = [1] * n
    for i in range(n):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp)`,
    javascript: `function lis(nums) {
    if (!nums.length) return 0;
    const dp = new Array(nums.length).fill(1);
    for (let i = 0; i < nums.length; i++) {
        for (let j = 0; j < i; j++) {
            if (nums[j] < nums[i]) {
                dp[i] = Math.max(dp[i], dp[j] + 1);
            }
        }
    }
    return Math.max(...dp);
}`,
    cpp: `#include <vector>
#include <algorithm>
using namespace std;

int lis(vector<int>& nums) {
    if (nums.empty()) return 0;
    vector<int> dp(nums.size(), 1);
    for (size_t i = 0; i < nums.size(); i++) {
        for (size_t j = 0; j < i; j++) {
            if (nums[j] < nums[i]) {
                dp[i] = max(dp[i], dp[j] + 1);
            }
        }
    }
    return *max_element(dp.begin(), dp.end());
}`,
    java: `import java.util.Arrays;

public class LIS {
    public static int lis(int[] nums) {
        if (nums.length == 0) return 0;
        int[] dp = new int[nums.length];
        Arrays.fill(dp, 1);
        int maxLen = 1;
        for (int i = 0; i < nums.length; i++) {
            for (int j = 0; j < i; j++) {
                if (nums[j] < nums[i]) {
                    dp[i] = Math.max(dp[i], dp[j] + 1);
                }
            }
            maxLen = Math.max(maxLen, dp[i]);
        }
        return maxLen;
    }
}`,
  },
  edit_distance: {
    python: `def edit_distance(word1, word2):
    m, n = len(word1), len(word2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1): dp[i][0] = i
    for j in range(n + 1): dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if word1[i-1] == word2[j-1]:
                dp[i][j] = dp[i-1][j-1]
            else:
                dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
    return dp[m][n]`,
    javascript: `function editDistance(word1, word2) {
    const m = word1.length, n = word2.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (word1[i - 1] === word2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
    }
    return dp[m][n];
}`,
    cpp: `#include <string>
#include <vector>
#include <algorithm>
using namespace std;

int editDistance(string word1, string word2) {
    int m = word1.length(), n = word2.length();
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
    for (int i = 0; i <= m; i++) dp[i][0] = i;
    for (int j = 0; j <= n; j++) dp[0][j] = j;
    
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (word1[i - 1] == word2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + min({dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]});
            }
        }
    }
    return dp[m][n];
}`,
    java: `public class EditDistance {
    public static int editDistance(String word1, String String2) {
        int m = word1.length(), n = String2.length();
        int[][] dp = new int[m + 1][n + 1];
        for (int i = 0; i <= m; i++) dp[i][0] = i;
        for (int j = 0; j <= n; j++) dp[0][j] = j;
        
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (word1.charAt(i - 1) == String2.charAt(j - 1)) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + Math.min(dp[i - 1][j], Math.min(dp[i][j - 1], dp[i - 1][j - 1]));
                }
            }
        }
        return dp[m][n];
    }
}`,
  },
  matrix_chain: {
    python: `def matrix_chain_order(dims):
    n = len(dims) - 1
    dp = [[0] * n for _ in range(n)]
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1; dp[i][j] = float('inf')
            for k in range(i, j):
                cost = dp[i][k] + dp[k+1][j] + dims[i]*dims[k+1]*dims[j+1]
                dp[i][j] = min(dp[i][j], cost)
    return dp[0][n-1]`,
    javascript: `function matrixChainOrder(dims) {
    const n = dims.length - 1;
    const dp = Array.from({ length: n }, () => new Array(n).fill(0));
    
    for (let len = 2; len <= n; len++) {
        for (let i = 0; i <= n - len; i++) {
            const j = i + len - 1;
            dp[i][j] = Infinity;
            for (let k = i; k < j; k++) {
                const cost = dp[i][k] + dp[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1];
                dp[i][j] = Math.min(dp[i][j], cost);
            }
        }
    }
    return dp[0][n - 1];
}`,
    cpp: `#include <vector>
#include <algorithm>
using namespace std;

int matrixChainOrder(vector<int>& dims) {
    int n = dims.size() - 1;
    vector<vector<int>> dp(n, vector<int>(n, 0));
    
    for (int len = 2; len <= n; len++) {
        for (int i = 0; i <= n - len; i++) {
            int j = i + len - 1;
            dp[i][j] = 1e9;
            for (int k = i; k < j; k++) {
                int cost = dp[i][k] + dp[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1];
                dp[i][j] = min(dp[i][j], cost);
            }
        }
    }
    return dp[0][n - 1];
}`,
    java: `public class MatrixChain {
    public static int matrixChainOrder(int[] dims) {
        int n = dims.length - 1;
        int[][] dp = new int[n][n];
        
        for (int len = 2; len <= n; len++) {
            for (int i = 0; i <= n - len; i++) {
                int j = i + len - 1;
                dp[i][j] = Integer.MAX_VALUE;
                for (int k = i; k < j; k++) {
                    int cost = dp[i][k] + dp[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1];
                    dp[i][j] = Math.min(dp[i][j], cost);
                }
            }
        }
        return dp[0][n - 1];
    }
}`,
  },
  interval_dp: {
    python: `def stone_merge(stones):
    n = len(stones)
    prefix = [0]
    for s in stones: prefix.append(prefix[-1] + s)
    dp = [[0] * n for _ in range(n)]
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1; dp[i][j] = float('inf')
            total = prefix[j+1] - prefix[i]
            for k in range(i, j):
                dp[i][j] = min(dp[i][j], dp[i][k] + dp[k+1][j] + total)
    return dp[0][n-1]`,
    javascript: `function stoneMerge(stones) {
    const n = stones.length;
    const prefix = [0];
    for (const s of stones) {
        prefix.push(prefix[prefix.length - 1] + s);
    }
    const dp = Array.from({ length: n }, () => new Array(n).fill(0));
    
    for (let len = 2; len <= n; len++) {
        for (let i = 0; i <= n - len; i++) {
            const j = i + len - 1;
            dp[i][j] = Infinity;
            const total = prefix[j + 1] - prefix[i];
            for (let k = i; k < j; k++) {
                dp[i][j] = Math.min(dp[i][j], dp[i][k] + dp[k + 1][j] + total);
            }
        }
    }
    return dp[0][n - 1];
}`,
    cpp: `#include <vector>
#include <algorithm>
using namespace std;

int stoneMerge(vector<int>& stones) {
    int n = stones.size();
    vector<int> prefix = {0};
    for (int s : stones) {
        prefix.push_back(prefix.back() + s);
    }
    vector<vector<int>> dp(n, vector<int>(n, 0));
    
    for (int len = 2; len <= n; len++) {
        for (int i = 0; i <= n - len; i++) {
            int j = i + len - 1;
            dp[i][j] = 1e9;
            int total = prefix[j + 1] - prefix[i];
            for (int k = i; k < j; k++) {
                dp[i][j] = min(dp[i][j], dp[i][k] + dp[k + 1][j] + total);
            }
        }
    }
    return dp[0][n - 1];
}`,
    java: `import java.util.*;

public class StoneMerge {
    public static int stoneMerge(int[] stones) {
        int n = stones.length;
        int[] prefix = new int[n + 1];
        for (int i = 0; i < n; i++) {
            prefix[i + 1] = prefix[i] + stones[i];
        }
        int[][] dp = new int[n][n];
        
        for (int len = 2; len <= n; len++) {
            for (int i = 0; i <= n - len; i++) {
                int j = i + len - 1;
                dp[i][j] = Integer.MAX_VALUE;
                int total = prefix[j + 1] - prefix[i];
                for (int k = i; k < j; k++) {
                    dp[i][j] = Math.min(dp[i][j], dp[i][k] + dp[k + 1][j] + total);
                }
            }
        }
        return dp[0][n - 1];
    }
}`,
  },
  backtracking: {
    python: `def backtrack(choices, path, result):
    if satisfied:          # terminal condition
        result.append(path[:]); return
    for choice in choices:
        if not valid(choice): continue
        path.append(choice)  # make choice
        backtrack(choices, path, result)
        path.pop()           # undo choice`,
    javascript: `function backtrack(choices, path, result) {
    if (satisfied()) {
        result.push([...path]);
        return;
    }
    for (const choice of choices) {
        if (!isValid(choice)) continue;
        path.push(choice);
        backtrack(choices, path, result);
        path.pop();
    }
}`,
    cpp: `#include <vector>
using namespace std;

void backtrack(vector<int>& choices, vector<int>& path, vector<vector<int>>& result) {
    if (satisfied()) {
        result.push_back(path);
        return;
    }
    for (int choice : choices) {
        if (!isValid(choice)) continue;
        path.push_back(choice);
        backtrack(choices, path, result);
        path.pop_back();
    }
}`,
    java: `import java.util.*;

public class Backtracking {
    public static void backtrack(List<Integer> choices, List<Integer> path, List<List<Integer>> result) {
        if (satisfied()) {
            result.add(new ArrayList<>(path));
            return;
        }
        for (int choice : choices) {
            if (!isValid(choice)) continue;
            path.add(choice);
            backtrack(choices, path, result);
            path.remove(path.size() - 1);
        }
    }
}`,
  },
  n_queens: {
    python: `def solve_n_queens(n):
    board = [['.'] * n for _ in range(n)]; result = []
    def is_safe(row, col):
        for i in range(row):
            if board[i][col] == 'Q': return False
            d = row - i
            if col-d>=0 and board[i][col-d]=='Q': return False
            if col+d<n and board[i][col+d]=='Q': return False
        return True
    def solve(row):
        if row == n: result.append([''.join(r) for r in board]); return
        for col in range(n):
            if is_safe(row, col):
                board[row][col] = 'Q'; solve(row + 1); board[row][col] = '.'
    solve(0); return result`,
    javascript: `function solveNQueens(n) {
    const board = Array.from({ length: n }, () => new Array(n).fill('.'));
    const result = [];
    
    const isSafe = (row, col) => {
        for (let i = 0; i < row; i++) {
            if (board[i][col] === 'Q') return false;
            const d = row - i;
            if (col - d >= 0 && board[i][col - d] === 'Q') return false;
            if (col + d < n && board[i][col + d] === 'Q') return false;
        }
        return true;
    };
    
    const solve = (row) => {
        if (row === n) {
            result.push(board.map(r => r.join('')));
            return;
        }
        for (let col = 0; col < n; col++) {
            if (isSafe(row, col)) {
                board[row][col] = 'Q';
                solve(row + 1);
                board[row][col] = '.';
            }
        }
    };
    solve(0);
    return result;
}`,
    cpp: `#include <vector>
#include <string>
using namespace std;

class NQueens {
private:
    vector<vector<string>> result;
    vector<string> board;
    
    bool isSafe(int row, int col, int n) {
        for (int i = 0; i < row; i++) {
            if (board[i][col] == 'Q') return false;
            int d = row - i;
            if (col - d >= 0 && board[i][col - d] == 'Q') return false;
            if (col + d < n && board[i][col + d] == 'Q') return false;
        }
        return true;
    }
    
    void solve(int row, int n) {
        if (row == n) {
            result.push_back(board);
            return;
        }
        for (int col = 0; col < n; col++) {
            if (isSafe(row, col, n)) {
                board[row][col] = 'Q';
                solve(row + 1, n);
                board[row][col] = '.';
            }
        }
    }
public:
    vector<vector<string>> solveNQueens(int n) {
        board.assign(n, string(n, '.'));
        solve(0, n);
        return result;
    }
};`,
    java: `import java.util.*;

public class NQueens {
    private List<List<String>> result = new ArrayList<>();
    private char[][] board;
    
    private boolean isSafe(int row, int col, int n) {
        for (int i = 0; i < row; i++) {
            if (board[i][col] == 'Q') return false;
            int d = row - i;
            if (col - d >= 0 && board[i][col - d] == 'Q') return false;
            if (col + d < n && board[i][col + d] == 'Q') return false;
        }
        return true;
    }
    
    private void solve(int row, int n) {
        if (row == n) {
            List<String> list = new ArrayList<>();
            for (char[] r : board) list.add(new String(r));
            result.add(list);
            return;
        }
        for (int col = 0; col < n; col++) {
            if (isSafe(row, col, n)) {
                board[row][col] = 'Q';
                solve(row + 1, n);
                board[row][col] = '.';
            }
        }
    }
    
    public List<List<String>> solveNQueens(int n) {
        board = new char[n][n];
        for (char[] r : board) Arrays.fill(r, '.');
        solve(0, n);
        return result;
    }
}`,
  },
  sudoku: {
    python: `def solve_sudoku(board):
    def is_valid(row, col, num):
        for i in range(9):
            if board[row][i] == num: return False
            if board[i][col] == num: return False
            if board[3*(row//3)+i//3][3*(col//3)+i%3] == num: return False
        return True
    for i in range(9):
        for j in range(9):
            if board[i][j] == '.':
                for num in '123456789':
                    if is_valid(i, j, num):
                        board[i][j] = num
                        if solve_sudoku(board): return True
                        board[i][j] = '.'
                return False
    return True`,
  },
  kmp: {
    python: `def kmp_search(text, pattern):
    def build_lps(p):
        lps = [0] * len(p); length = 0; i = 1
        while i < len(p):
            if p[i] == p[length]: length += 1; lps[i] = length; i += 1
            elif length: length = lps[length - 1]
            else: lps[i] = 0; i += 1
        return lps
    lps = build_lps(pattern); i = j = 0
    while i < len(text):
        if text[i] == pattern[j]: i += 1; j += 1
        if j == len(pattern): return i - j
        elif i < len(text) and text[i] != pattern[j]:
            if j: j = lps[j - 1]
            else: i += 1
    return -1`,
  },
  manacher: {
    python: `def longest_palindrome(s):
    T = '#' + '#'.join(s) + '#'
    n = len(T); P = [0] * n; C = R = 0
    for i in range(n):
        mirror = 2 * C - i
        if i < R: P[i] = min(R - i, P[mirror])
        while i+P[i]+1<n and i-P[i]-1>=0 and T[i+P[i]+1]==T[i-P[i]-1]:
            P[i] += 1
        if i + P[i] > R: C, R = i, i + P[i]
    center = P.index(max(P))
    start = (center - max(P)) // 2
    return s[start:start + max(P)]`,
  },
  segment_tree: {
    python: `class SegmentTree:
    def __init__(self, arr):
        self.n = len(arr); self.tree = [0] * (4 * self.n)
        self.build(arr, 0, 0, self.n - 1)
    def build(self, arr, node, start, end):
        if start == end: self.tree[node] = arr[start]
        else:
            mid = (start + end) // 2
            self.build(arr, 2*node+1, start, mid)
            self.build(arr, 2*node+2, mid+1, end)
            self.tree[node] = self.tree[2*node+1] + self.tree[2*node+2]`,
  },
  fenwick_tree: {
    python: `class FenwickTree:
    def __init__(self, n):
        self.n = n; self.tree = [0] * (n + 1)
    def update(self, i, delta):
        i += 1
        while i <= self.n: self.tree[i] += delta; i += i & -i
    def query(self, i):
        s = 0; i += 1
        while i > 0: s += self.tree[i]; i -= i & -i
        return s
    def range_sum(self, l, r):
        return self.query(r) - self.query(l - 1)`,
  },
  monotonic_stack: {
    python: `def next_greater_element(nums):
    n = len(nums); result = [-1] * n; stack = []
    for i in range(n):
        while stack and nums[stack[-1]] < nums[i]:
            result[stack.pop()] = nums[i]
        stack.append(i)
    return result`,
    javascript: `function nextGreaterElement(nums) {
    const n = nums.length;
    const result = new Array(n).fill(-1);
    const stack = [];
    for (let i = 0; i < n; i++) {
        while (stack.length && nums[stack[stack.length - 1]] < nums[i]) {
            result[stack.pop()] = nums[i];
        }
        stack.push(i);
    }
    return result;
}`,
    cpp: `#include <vector>
#include <stack>
using namespace std;

vector<int> nextGreaterElement(vector<int>& nums) {
    int n = nums.size();
    vector<int> result(n, -1);
    stack<int> s;
    for (int i = 0; i < n; i++) {
        while (!s.empty() && nums[s.top()] < nums[i]) {
            result[s.top()] = nums[i];
            s.pop();
        }
        s.push(i);
    }
    return result;
}`,
    java: `import java.util.Stack;

public class MonotonicStack {
    public static int[] nextGreaterElement(int[] nums) {
        int n = nums.length;
        int[] result = new int[n];
        java.util.Arrays.fill(result, -1);
        Stack<Integer> stack = new Stack<>();
        for (int i = 0; i < n; i++) {
            while (!stack.isEmpty() && nums[stack.peek()] < nums[i]) {
                result[stack.pop()] = nums[i];
            }
            stack.push(i);
        }
        return result;
    }
}`,
  },
  sliding_window: {
    python: `def max_sum_subarray(arr, k):
    n = len(arr)
    if n < k: return -1
    window_sum = sum(arr[:k]); max_sum = window_sum
    for i in range(k, n):
        window_sum += arr[i] - arr[i - k]
        max_sum = max(max_sum, window_sum)
    return max_sum`,
    javascript: `function maxSumSubarray(arr, k) {
    const n = arr.length;
    if (n < k) return -1;
    let windowSum = 0;
    for (let i = 0; i < k; i++) windowSum += arr[i];
    let maxSum = windowSum;
    for (let i = k; i < n; i++) {
        windowSum += arr[i] - arr[i - k];
        maxSum = Math.max(maxSum, windowSum);
    }
    return maxSum;
}`,
    cpp: `#include <vector>
#include <numeric>
#include <algorithm>
using namespace std;

int maxSumSubarray(vector<int>& arr, int k) {
    int n = arr.size();
    if (n < k) return -1;
    int windowSum = accumulate(arr.begin(), arr.begin() + k, 0);
    int maxSum = windowSum;
    for (int i = k; i < n; i++) {
        windowSum += arr[i] - arr[i - k];
        maxSum = max(maxSum, windowSum);
    }
    return maxSum;
}`,
    java: `public class SlidingWindow {
    public static int maxSumSubarray(int[] arr, int k) {
        int n = arr.length;
        if (n < k) return -1;
        int windowSum = 0;
        for (int i = 0; i < k; i++) windowSum += arr[i];
        int maxSum = windowSum;
        for (int i = k; i < n; i++) {
            windowSum += arr[i] - arr[i - k];
            maxSum = Math.max(maxSum, windowSum);
        }
        return maxSum;
    }
}`,
  },
  leetcode_hot100: {
    python: `# LeetCode Hot 100 - Two Sum
def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen: return [seen[complement], i]
        seen[num] = i
    return []`,
    javascript: `function twoSum(nums, target) {
    const seen = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (seen.has(complement)) {
            return [seen.get(complement), i];
        }
        seen.set(nums[i], i);
    }
    return [];
}`,
    cpp: `#include <vector>
#include <unordered_map>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> seen;
    for (int i = 0; i < nums.size(); i++) {
        int complement = target - nums[i];
        if (seen.count(complement)) {
            return {seen[complement], i};
        }
        seen[nums[i]] = i;
    }
    return {};
}`,
    java: `import java.util.HashMap;

public class TwoSum {
    public static int[] twoSum(int[] nums, int target) {
        HashMap<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (seen.containsKey(complement)) {
                return new int[]{seen.get(complement), i};
            }
            seen.put(nums[i], i);
        }
        return new int[0];
    }
}`,
  },
  acm_templates: {
    python: `# ACM Common Templates
MOD = 10**9 + 7

def pow_mod(a, b, mod=MOD):
    result = 1
    while b:
        if b & 1: result = result * a % mod
        a = a * a % mod; b >>= 1
    return result

def sieve(n):
    is_prime = [True] * (n + 1); primes = []
    for i in range(2, n + 1):
        if is_prime[i]:
            primes.append(i)
            for j in range(i * i, n + 1, i): is_prime[j] = False
    return primes`,
  },
  linked_list_insert: {
    python: `def insert_after(prev_node, new_val):
    if prev_node is None: return
    new_node = ListNode(new_val)
    new_node.next = prev_node.next
    prev_node.next = new_node`,
    javascript: `function insertAfter(prevNode, newVal) {
    if (!prevNode) return;
    const newNode = new ListNode(newVal);
    newNode.next = prevNode.next;
    prevNode.next = newNode;
}`,
    cpp: `void insertAfter(ListNode* prevNode, int newVal) {
    if (!prevNode) return;
    ListNode* newNode = new ListNode(newVal);
    newNode->next = prevNode->next;
    prevNode->next = newNode;
}`,
    java: `public void insertAfter(ListNode prevNode, int newVal) {
    if (prevNode == null) return;
    ListNode newNode = new ListNode(newVal);
    newNode.next = prevNode.next;
    prevNode.next = newNode;
}`,
  },
  linked_list_delete: {
    python: `def delete_node(prev_node):
    if prev_node is None or prev_node.next is None: return
    target = prev_node.next
    prev_node.next = target.next`,
    javascript: `function deleteNode(prevNode) {
    if (!prevNode || !prevNode.next) return;
    const target = prevNode.next;
    prevNode.next = target.next;
}`,
    cpp: `void deleteNode(ListNode* prevNode) {
    if (!prevNode || !prevNode->next) return;
    ListNode* target = prevNode->next;
    prevNode->next = target->next;
    delete target;
}`,
    java: `public void deleteNode(ListNode prevNode) {
    if (prevNode == null || prevNode.next == null) return;
    ListNode target = prevNode.next;
    prevNode.next = target.next;
}`,
  },
  linked_list_search: {
    python: `def search_list(head, target):
    cur = head
    while cur is not None:
        if cur.value == target: return cur
        cur = cur.next
    return None`,
    javascript: `function searchList(head, target) {
    let cur = head;
    while (cur !== null) {
        if (cur.value === target) return cur;
        cur = cur.next;
    }
    return null;
}`,
    cpp: `ListNode* searchList(ListNode* head, int target) {
    ListNode* cur = head;
    while (cur != nullptr) {
        if (cur->value == target) return cur;
        cur = cur->next;
    }
    return nullptr;
}`,
    java: `public ListNode searchList(ListNode head, int target) {
    ListNode cur = head;
    while (cur != null) {
        if (cur.value == target) return cur;
        cur = cur.next;
    }
    return null;
}`,
  },
  bst_insert: {
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
}`,
  },
  bst_delete: {
    python: `def delete_node(root, key):
    if root is None: return root
    if key < root.val:
        root.left = delete_node(root.left, key)
    elif key > root.val:
        root.right = delete_node(root.right, key)
    else:
        if root.left is None: return root.right
        if root.right is None: return root.left
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
}`,
  },
  bst_search: {
    python: `def search(root, key):
    if root is None or root.val == key: return root
    if key < root.val: return search(root.left, key)
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
    if (key < root.val) root.left = search(root.left, key);
    else root.right = search(root.right, key);
    return root;
}`,
  },
  avl_insert: {
    python: `def insert(root, key):
    if not root: return TreeNode(key)
    if key < root.val: root.left = insert(root.left, key)
    else: root.right = insert(root.right, key)
    return balance(root)`,
    javascript: `function insert(root, key) {
    if (!root) return new TreeNode(key);
    if (key < root.val) root.left = insert(root.left, key);
    else root.right = insert(root.right, key);
    return balance(root);
}`,
    cpp: `TreeNode* insert(TreeNode* root, int key) {
    if (!root) return new TreeNode(key);
    if (key < root->val) root->left = insert(root->left, key);
    else root->right = insert(root->right, key);
    return balance(root);
}`,
    java: `public TreeNode insert(TreeNode root, int key) {
    if (root == null) return new TreeNode(key);
    if (key < root.val) root.left = insert(root.left, key);
    else root.right = insert(root.right, key);
    return balance(root);
}`,
  },
  binary_tree_traverse: {
    python: `def traverse(root):
    if root is None: return
    print(root.val)
    traverse(root.left)
    traverse(root.right)`,
    javascript: `function traverse(root) {
    if (root === null) return;
    console.log(root.val);
    traverse(root.left);
    traverse(root.right);
}`,
    cpp: `void traverse(TreeNode* root) {
    if (root == nullptr) return;
    cout << root->val << endl;
    traverse(root->left);
    traverse(root->right);
}`,
    java: `public void traverse(TreeNode root) {
    if (root == null) return;
    System.out.println(root.val);
    traverse(root.left);
    traverse(root.right);
}`,
  },
  btree: {
    python: `class BTreeNode:
    def __init__(self, t, leaf=False):
        self.t = t          # 最小度数
        self.leaf = leaf    # 是否叶子节点
        self.keys = []      # 关键码列表
        self.children = []  # 子节点指针

def search(node, key):
    i = 0
    while i < len(node.keys) and key > node.keys[i]:
        i += 1
    if i < len(node.keys) and node.keys[i] == key:
        return (node, i)        # 在当前节点找到
    if node.leaf:
        return None              # 叶子层未找到
    return search(node.children[i], key)

def split_child(parent, i):
    t = parent.t
    y = parent.children[i]
    z = BTreeNode(t, y.leaf)
    # 将 y 的后半部分关键码移到 z
    z.keys = y.keys[t:]
    y.keys = y.keys[:t - 1]
    # 如果不是叶子，移动对应的子指针
    if not y.leaf:
        z.children = y.children[t:]
        y.children = y.children[:t]
    # 将 z 插入到 parent 的 children 中
    parent.children.insert(i + 1, z)
    parent.keys.insert(i, y.keys[t - 1])

def insert_non_full(node, key):
    i = len(node.keys) - 1
    if node.leaf:
        node.keys.append(None)
        while i >= 0 and key < node.keys[i]:
            node.keys[i + 1] = node.keys[i]
            i -= 1
        node.keys[i + 1] = key
    else:
        while i >= 0 and key < node.keys[i]:
            i -= 1
        i += 1
        if len(node.children[i].keys) == 2 * node.t - 1:
            split_child(node, i)
            if key > node.keys[i]:
                i += 1
        insert_non_full(node.children[i], key)

def insert(root, key):
    if len(root.keys) == 2 * root.t - 1:
        # 根分裂：创建新根
        new_root = BTreeNode(root.t)
        new_root.children.append(root)
        split_child(new_root, 0)
        insert_non_full(new_root, key)
        return new_root
    else:
        insert_non_full(root, key)
        return root`,
    javascript: `class BTreeNode {
    constructor(t, leaf = false) {
        this.t = t;          // 最小度数
        this.leaf = leaf;    // 是否叶子节点
        this.keys = [];      // 关键码列表
        this.children = [];  // 子节点指针
    }
}

function search(node, key) {
    let i = 0;
    while (i < node.keys.length && key > node.keys[i]) i++;
    if (i < node.keys.length && node.keys[i] === key) return { node, i };
    if (node.leaf) return null;
    return search(node.children[i], key);
}

function splitChild(parent, i) {
    const t = parent.t;
    const y = parent.children[i];
    const z = new BTreeNode(t, y.leaf);
    z.keys = y.keys.splice(t);
    const mid = y.keys.pop();
    if (!y.leaf) z.children = y.children.splice(t);
    parent.children.splice(i + 1, 0, z);
    parent.keys.splice(i, 0, mid);
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
}

function insert(root, key) {
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
}`,
    cpp: `#include <vector>
using namespace std;

class BTreeNode {
public:
    int t;                      // 最小度数
    bool leaf;
    vector<int> keys;
    vector<BTreeNode*> children;
    BTreeNode(int t, bool leaf = false) : t(t), leaf(leaf) {}
};

// 在节点中搜索 key，返回 (node, index) 或 nullptr
pair<BTreeNode*, int> search(BTreeNode* node, int key) {
    int i = 0;
    while (i < node->keys.size() && key > node->keys[i]) i++;
    if (i < node->keys.size() && node->keys[i] == key)
        return {node, i};
    if (node->leaf) return {nullptr, -1};
    return search(node->children[i], key);
}

void splitChild(BTreeNode* parent, int i) {
    int t = parent->t;
    BTreeNode* y = parent->children[i];
    BTreeNode* z = new BTreeNode(t, y->leaf);
    // 后半部分关键码移到 z
    z->keys.assign(y->keys.begin() + t, y->keys.end());
    int mid = y->keys[t - 1];
    y->keys.resize(t - 1);
    // 如果不是叶子，移动子指针
    if (!y->leaf) {
        z->children.assign(y->children.begin() + t, y->children.end());
        y->children.resize(t);
    }
    parent->children.insert(parent->children.begin() + i + 1, z);
    parent->keys.insert(parent->keys.begin() + i, mid);
}

void insertNonFull(BTreeNode* node, int key) {
    int i = node->keys.size() - 1;
    if (node->leaf) {
        node->keys.push_back(0);
        while (i >= 0 && key < node->keys[i]) {
            node->keys[i + 1] = node->keys[i];
            i--;
        }
        node->keys[i + 1] = key;
    } else {
        while (i >= 0 && key < node->keys[i]) i--;
        i++;
        if (node->children[i]->keys.size() == 2 * node->t - 1) {
            splitChild(node, i);
            if (key > node->keys[i]) i++;
        }
        insertNonFull(node->children[i], key);
    }
}

BTreeNode* insert(BTreeNode* root, int key) {
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
}`,
    java: `import java.util.*;

class BTreeNode {
    int t;                       // 最小度数
    boolean leaf;
    List<Integer> keys;
    List<BTreeNode> children;

    BTreeNode(int t, boolean leaf) {
        this.t = t;
        this.leaf = leaf;
        this.keys = new ArrayList<>();
        this.children = new ArrayList<>();
    }
}

public class BTree {
    // 在节点中搜索 key，返回索引或 -1
    public int searchInNode(BTreeNode node, int key) {
        int i = 0;
        while (i < node.keys.size() && key > node.keys.get(i)) i++;
        if (i < node.keys.size() && node.keys.get(i) == key) return i;
        if (node.leaf) return -1;
        return searchInNode(node.children.get(i), key);
    }

    void splitChild(BTreeNode parent, int i) {
        int t = parent.t;
        BTreeNode y = parent.children.get(i);
        BTreeNode z = new BTreeNode(t, y.leaf);
        // 后半部分关键码移到 z
        for (int j = t; j < y.keys.size(); j++)
            z.keys.add(y.keys.get(j));
        int mid = y.keys.get(t - 1);
        y.keys = new ArrayList<>(y.keys.subList(0, t - 1));
        // 如果不是叶子，移动子指针
        if (!y.leaf) {
            for (int j = t; j < y.children.size(); j++)
                z.children.add(y.children.get(j));
            y.children = new ArrayList<>(y.children.subList(0, t));
        }
        parent.children.add(i + 1, z);
        parent.keys.add(i, mid);
    }

    void insertNonFull(BTreeNode node, int key) {
        int i = node.keys.size() - 1;
        if (node.leaf) {
            node.keys.add(0);
            while (i >= 0 && key < node.keys.get(i)) {
                node.keys.set(i + 1, node.keys.get(i));
                i--;
            }
            node.keys.set(i + 1, key);
        } else {
            while (i >= 0 && key < node.keys.get(i)) i--;
            i++;
            if (node.children.get(i).keys.size() == 2 * node.t - 1) {
                splitChild(node, i);
                if (key > node.keys.get(i)) i++;
            }
            insertNonFull(node.children.get(i), key);
        }
    }

    public BTreeNode insert(BTreeNode root, int key) {
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
}`,
  },
  bplus_tree: {
    python: `class BPlusNode:
    def __init__(self, t, leaf=False):
        self.t = t          # 最小度数
        self.leaf = leaf    # 是否叶子节点
        self.keys = []      # 关键码列表
        self.children = []  # 子节点（内部节点）/ 数据指针（叶子节点）
        self.next = None    # 叶子层链表指针（仅叶子节点使用）

def search(root, key):
    """在 B+ 树中搜索 key，返回对应的值，未找到返回 None"""
    node = root
    # 从根走到叶子层
    while not node.leaf:
        i = 0
        while i < len(node.keys) and key >= node.keys[i]:
            i += 1
        node = node.children[i]
    # 在叶子节点中二分查找
    lo, hi = 0, len(node.keys) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if node.keys[mid] == key:
            return node.children[mid]  # children 存数据
        elif key < node.keys[mid]:
            hi = mid - 1
        else:
            lo = mid + 1
    return None

def range_query(root, low, high):
    """范围查询：返回 [low, high] 区间内所有 (key, value) 对"""
    node = root
    while not node.leaf:
        i = 0
        while i < len(node.keys) and low >= node.keys[i]:
            i += 1
        node = node.children[i]
    # 在起始叶子中定位，然后沿 next 扫描
    result = []
    while node is not None:
        for i in range(len(node.keys)):
            k = node.keys[i]
            if k > high:
                return result
            if k >= low:
                result.append((k, node.children[i]))
        node = node.next
    return result

def split_child(parent, i):
    """分裂 parent 的第 i 个子节点"""
    t = parent.t
    y = parent.children[i]
    z = BPlusNode(t, y.leaf)
    z.keys = y.keys[t:]
    z.children = y.children[t:]
    y.keys = y.keys[:t]
    y.children = y.children[:t]
    if y.leaf:
        z.next = y.next
        y.next = z
    parent.children.insert(i + 1, z)
    parent.keys.insert(i, z.keys[0])

def insert_non_full(node, key, value):
    i = len(node.keys) - 1
    if node.leaf:
        # 叶子中保持有序插入
        while i >= 0 and key < node.keys[i]:
            i -= 1
        i += 1
        node.keys.insert(i, key)
        node.children.insert(i, value)
    else:
        while i >= 0 and key < node.keys[i]:
            i -= 1
        i += 1
        if len(node.children[i].keys) == 2 * node.t:
            split_child(node, i)
            if key > node.keys[i]:
                i += 1
        insert_non_full(node.children[i], key, value)

def insert(root, key, value):
    if len(root.keys) == 2 * root.t:
        new_root = BPlusNode(root.t)
        new_root.children.append(root)
        split_child(new_root, 0)
        insert_non_full(new_root, key, value)
        return new_root
    else:
        insert_non_full(root, key, value)
        return root`,
    javascript: `class BPlusNode {
    constructor(t, leaf = false) {
        this.t = t;          // 最小度数
        this.leaf = leaf;    // 是否叶子节点
        this.keys = [];      // 关键码列表
        this.children = [];  // 子节点 / 数据指针
        this.next = null;    // 叶子层链表指针
    }
}

function search(root, key) {
    let node = root;
    while (!node.leaf) {
        let i = 0;
        while (i < node.keys.length && key >= node.keys[i]) i++;
        node = node.children[i];
    }
    // 二分查找叶子节点
    let lo = 0, hi = node.keys.length - 1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (node.keys[mid] === key) return node.children[mid];
        if (key < node.keys[mid]) hi = mid - 1;
        else lo = mid + 1;
    }
    return null;
}

function rangeQuery(root, low, high) {
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
}

function splitChild(parent, i) {
    const t = parent.t;
    const y = parent.children[i];
    const z = new BPlusNode(t, y.leaf);
    z.keys = y.keys.splice(t);
    z.children = y.children.splice(t);
    if (y.leaf) { z.next = y.next; y.next = z; }
    parent.children.splice(i + 1, 0, z);
    parent.keys.splice(i, 0, z.keys[0]);
}

function insertNonFull(node, key, value) {
    let i = node.keys.length - 1;
    if (node.leaf) {
        while (i >= 0 && key < node.keys[i]) i--;
        i++;
        node.keys.splice(i, 0, key);
        node.children.splice(i, 0, value);
    } else {
        while (i >= 0 && key < node.keys[i]) i--;
        i++;
        if (node.children[i].keys.length === 2 * node.t) {
            splitChild(node, i);
            if (key > node.keys[i]) i++;
        }
        insertNonFull(node.children[i], key, value);
    }
}

function insert(root, key, value) {
    if (root.keys.length === 2 * root.t) {
        const newRoot = new BPlusNode(root.t);
        newRoot.children.push(root);
        splitChild(newRoot, 0);
        insertNonFull(newRoot, key, value);
        return newRoot;
    }
    insertNonFull(root, key, value);
    return root;
}`,
    cpp: `#include <vector>
#include <utility>
using namespace std;

class BPlusNode {
public:
    int t;
    bool leaf;
    vector<int> keys;
    vector<BPlusNode*> children;  // 内部：子指针 / 叶子：数据指针(存为索引)
    BPlusNode* next;              // 叶子层链表
    BPlusNode(int t, bool leaf = false) : t(t), leaf(leaf), next(nullptr) {}
};

// 搜索，返回索引(在 children 中的位置)或 -1
int search(BPlusNode* root, int key) {
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
}

vector<pair<int, int>> rangeQuery(BPlusNode* root, int low, int high) {
    BPlusNode* node = root;
    while (!node->leaf) {
        int i = 0;
        while (i < node->keys.size() && low >= node->keys[i]) i++;
        node = node->children[i];
    }
    vector<pair<int, int>> result;
    while (node) {
        for (int i = 0; i < node->keys.size(); i++) {
            int k = node->keys[i];
            if (k > high) return result;
            if (k >= low) result.push_back({k, (int)(intptr_t)node->children[i]});
        }
        node = node->next;
    }
    return result;
}

void splitChild(BPlusNode* parent, int i) {
    int t = parent->t;
    BPlusNode* y = parent->children[i];
    BPlusNode* z = new BPlusNode(t, y->leaf);
    z->keys.assign(y->keys.begin() + t, y->keys.end());
    z->children.assign(y->children.begin() + t, y->children.end());
    y->keys.resize(t);
    y->children.resize(t);
    if (y->leaf) { z->next = y->next; y->next = z; }
    parent->children.insert(parent->children.begin() + i + 1, z);
    parent->keys.insert(parent->keys.begin() + i, z->keys[0]);
}

void insertNonFull(BPlusNode* node, int key, int value) {
    int i = node->keys.size() - 1;
    if (node->leaf) {
        while (i >= 0 && key < node->keys[i]) i--;
        i++;
        node->keys.insert(node->keys.begin() + i, key);
        node->children.insert(node->children.begin() + i, (BPlusNode*)(intptr_t)value);
    } else {
        while (i >= 0 && key < node->keys[i]) i--;
        i++;
        if (node->children[i]->keys.size() == 2 * node->t) {
            splitChild(node, i);
            if (key > node->keys[i]) i++;
        }
        insertNonFull(node->children[i], key, value);
    }
}

BPlusNode* insert(BPlusNode* root, int key, int value) {
    if (root->keys.size() == 2 * root->t) {
        BPlusNode* newRoot = new BPlusNode(root->t);
        newRoot->children.push_back(root);
        splitChild(newRoot, 0);
        insertNonFull(newRoot, key, value);
        return newRoot;
    }
    insertNonFull(root, key, value);
    return root;
}`,
    java: `import java.util.*;

class BPlusNode {
    int t;
    boolean leaf;
    List<Integer> keys;
    List<BPlusNode> children;  // 内部：子指针 / 叶子：数据指针
    BPlusNode next;            // 叶子层链表

    BPlusNode(int t, boolean leaf) {
        this.t = t;
        this.leaf = leaf;
        this.keys = new ArrayList<>();
        this.children = new ArrayList<>();
        this.next = null;
    }
}

public class BPlusTree {
    public int search(BPlusNode root, int key) {
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
    }

    public List<int[]> rangeQuery(BPlusNode root, int low, int high) {
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
    }

    void splitChild(BPlusNode parent, int i) {
        int t = parent.t;
        BPlusNode y = parent.children.get(i);
        BPlusNode z = new BPlusNode(t, y.leaf);
        for (int j = t; j < y.keys.size(); j++)
            z.keys.add(y.keys.get(j));
        for (int j = t; j < y.children.size(); j++)
            z.children.add(y.children.get(j));
        y.keys = new ArrayList<>(y.keys.subList(0, t));
        y.children = new ArrayList<>(y.children.subList(0, t));
        if (y.leaf) { z.next = y.next; y.next = z; }
        parent.children.add(i + 1, z);
        parent.keys.add(i, z.keys.get(0));
    }

    void insertNonFull(BPlusNode node, int key, int value) {
        int i = node.keys.size() - 1;
        if (node.leaf) {
            while (i >= 0 && key < node.keys.get(i)) i--;
            i++;
            node.keys.add(i, key);
            node.children.add(i, null); // placeholder for data
        } else {
            while (i >= 0 && key < node.keys.get(i)) i--;
            i++;
            if (node.children.get(i).keys.size() == 2 * node.t) {
                splitChild(node, i);
                if (key > node.keys.get(i)) i++;
            }
            insertNonFull(node.children.get(i), key, value);
        }
    }

    public BPlusNode insert(BPlusNode root, int key, int value) {
        if (root.keys.size() == 2 * root.t) {
            BPlusNode newRoot = new BPlusNode(root.t, false);
            newRoot.children.add(root);
            splitChild(newRoot, 0);
            insertNonFull(newRoot, key, value);
            return newRoot;
        }
        insertNonFull(root, key, value);
        return root;
    }
}`,
  },
};

export function getCodeTemplate(algoId: string, lang: CodeLang): string {
  const templates = CODE_TEMPLATES[algoId]
  if (templates && templates[lang]) return templates[lang]!
  // Fallback: return Python code
  return templates?.python || `# ${lang} code template not available\n# Please write your own implementation`
}
