import type { HashTableAlgorithmEvent } from '../../eventTypes'

/**
 * hashTable 域图元构建器:语义方法 → HashTableAlgorithmEvent。
 * preset 生成器与 AI 调它构建脚本,替代手写裸 events。
 */
export const hashTableBuilder = {
  create: (capacity: number): HashTableAlgorithmEvent => ({ type: 'hashtable.create', capacity }),
  put: (key: string, value: number | string, bucket: number, collision?: boolean): HashTableAlgorithmEvent => ({ type: 'hashtable.put', key, value, bucket, ...(collision !== undefined && { collision }) }),
  get: (key: string, bucket: number, found: boolean): HashTableAlgorithmEvent => ({ type: 'hashtable.get', key, bucket, found }),
  remove: (key: string, bucket: number): HashTableAlgorithmEvent => ({ type: 'hashtable.remove', key, bucket }),
  highlightBucket: (bucket: number): HashTableAlgorithmEvent => ({ type: 'hashtable.highlight_bucket', bucket }),
}
