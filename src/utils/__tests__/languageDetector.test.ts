import { describe, expect, it } from 'vitest'
import { detectCodeLanguage, getCodeLanguageLabel } from '../languageDetector'

describe('detectCodeLanguage', () => {
  it('detects Java LeetCode-style solutions', () => {
    const code = `
class Solution {
  int ans;

  public int diameterOfBinaryTree(TreeNode root) {
    depth(root);
    return ans;
  }

  private int depth(TreeNode node) {
    if (node == null) return 0;
    int left = depth(node.left);
    int right = depth(node.right);
    ans = Math.max(ans, left + right);
    return Math.max(left, right) + 1;
  }
}
`

    expect(detectCodeLanguage(code)).toBe('java')
  })

  it('detects C++ code with pointers, STL containers, and includes', () => {
    const code = `
#include <vector>
#include <queue>
using namespace std;

class Solution {
public:
  vector<int> levelOrder(TreeNode* root) {
    queue<TreeNode*> q;
    vector<int> ans;
    if (root == nullptr) return ans;
    q.push(root);
    return ans;
  }
};
`

    expect(detectCodeLanguage(code)).toBe('cpp')
  })

  it('detects Python functions', () => {
    const code = `
class Solution:
    def twoSum(self, nums, target):
        seen = {}
        for i, num in enumerate(nums):
            if target - num in seen:
                return [seen[target - num], i]
            seen[num] = i
`

    expect(detectCodeLanguage(code)).toBe('python')
  })

  it('detects JavaScript functions and declarations', () => {
    const code = `
const twoSum = function(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];
    seen.set(nums[i], i);
  }
};
`

    expect(detectCodeLanguage(code)).toBe('javascript')
  })

  it('uses friendly labels for detected languages', () => {
    expect(getCodeLanguageLabel('cpp')).toBe('C++')
  })
})
