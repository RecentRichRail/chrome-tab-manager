const { performance } = require('perf_hooks');

function sanitizeUrlForLog(urlStr) {
  if (!urlStr) return String(urlStr);
  try {
    const u = new URL(urlStr);
    return u.origin + u.pathname;
  } catch (error) {
    return '[invalid/redacted url]';
  }
}

function matchesPattern(url, pattern, lowerUrl) {
  return lowerUrl.includes(pattern);
}

const rule = {
  patterns: ['test1', 'test2', 'test3', 'test4', 'test5', 'test6', 'test7', 'test8', 'test9', 'test10']
};

const tabs = [];
for (let i = 0; i < 1000; i++) {
  tabs.push({ url: `https://example.com/page${i}?q=123` });
}

function runBenchmark(withLogging) {
  const start = performance.now();
  for (let i = 0; i < 100; i++) {
    for (const tab of tabs) {
      const lowerUrl = tab.url.toLowerCase();
      rule.patterns.some(pattern => {
        const result = matchesPattern(tab.url, pattern, lowerUrl);
        if (withLogging) {
          // Simulate the overhead even if console.log is disabled or swallowed
          const logMsg = `Existing tab pattern check: "${pattern}" vs "${sanitizeUrlForLog(tab.url)}" = ${result}`;
        }
        return result;
      });
    }
  }
  return performance.now() - start;
}

const baseline = runBenchmark(true);
const optimized = runBenchmark(false);

console.log(`Baseline (with sanitizeUrlForLog in loop): ${baseline.toFixed(2)} ms`);
console.log(`Optimized (without logging): ${optimized.toFixed(2)} ms`);
console.log(`Improvement: ${((baseline - optimized) / baseline * 100).toFixed(2)}%`);
