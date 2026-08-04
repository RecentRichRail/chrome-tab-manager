const { performance } = require('perf_hooks');

// Setup
const numTabs = 5000;
let tabUrlMap = new Map();
let tabIdUrlMap = new Map(); // Proposed optimization

// Fill maps
for (let i = 0; i < numTabs; i++) {
  const url = `https://example.com/page${i}`;
  tabUrlMap.set(url, i);
  tabIdUrlMap.set(i, url);
}

// Benchmark 1: Current implementation O(N)
function benchmarkCurrent(tabIdToRemove) {
  for (const [url, id] of tabUrlMap.entries()) {
    if (id === tabIdToRemove) {
      tabUrlMap.delete(url);
      break;
    }
  }
}

// Benchmark 2: Optimized implementation O(1)
function benchmarkOptimized(tabIdToRemove) {
  const url = tabIdUrlMap.get(tabIdToRemove);
  if (url) {
    tabUrlMap.delete(url);
    tabIdUrlMap.delete(tabIdToRemove);
  }
}

// Measure Current
const startCurrent = performance.now();
for (let i = 0; i < numTabs; i++) {
  benchmarkCurrent(i);
}
const endCurrent = performance.now();
console.log(`Current O(N) took: ${endCurrent - startCurrent} ms`);

// Refill maps for second run
tabUrlMap = new Map();
tabIdUrlMap = new Map();
for (let i = 0; i < numTabs; i++) {
  const url = `https://example.com/page${i}`;
  tabUrlMap.set(url, i);
  tabIdUrlMap.set(i, url);
}

// Measure Optimized
const startOptimized = performance.now();
for (let i = 0; i < numTabs; i++) {
  benchmarkOptimized(i);
}
const endOptimized = performance.now();
console.log(`Optimized O(1) took: ${endOptimized - startOptimized} ms`);
