/**
 * Performance Testing Script for WeddingFlo
 *
 * This script provides basic performance checks.
 * For full Lighthouse testing, install: npm install -g lighthouse
 * Then run: lighthouse http://localhost:3000 --view
 */

const https = require('https');
const http = require('http');

function testEndpoint(url, label) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`✓ ${label}`);
        console.log(`  Status: ${res.statusCode}`);
        console.log(`  Time: ${duration}ms`);
        console.log(`  Size: ${(data.length / 1024).toFixed(2)}KB`);
        console.log('');

        resolve({
          label,
          duration,
          status: res.statusCode,
          size: data.length,
        });
      });
    }).on('error', (err) => {
      console.error(`✗ ${label}: ${err.message}`);
      resolve({
        label,
        duration: -1,
        status: 0,
        size: 0,
        error: err.message,
      });
    });
  });
}

async function runPerformanceTests() {
  const baseUrl = process.argv[2] || 'http://localhost:3000';

  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  WeddingFlo - Performance Test Suite          ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Testing: ${baseUrl}`);
  console.log('');

  const endpoints = [
    { url: `${baseUrl}/`, label: 'Homepage' },
    { url: `${baseUrl}/manifest.json`, label: 'Manifest' },
  ];

  const results = [];

  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.url, endpoint.label);
    results.push(result);
  }

  // Performance analysis
  console.log('═══════════════════════════════════════════════');
  console.log('Performance Analysis:');
  console.log('═══════════════════════════════════════════════');
  console.log('');

  const successfulResults = results.filter(r => r.status === 200);

  if (successfulResults.length === 0) {
    console.error('❌ All tests failed. Is the server running?');
    console.error(`   Try: npm run dev`);
    process.exit(1);
  }

  const avgTime = successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length;
  const maxTime = Math.max(...successfulResults.map(r => r.duration));
  const totalSize = successfulResults.reduce((sum, r) => sum + r.size, 0);

  console.log(`Average Response Time: ${avgTime.toFixed(0)}ms`);
  console.log(`Max Response Time: ${maxTime}ms`);
  console.log(`Total Page Weight: ${(totalSize / 1024).toFixed(2)}KB`);
  console.log('');

  // Performance targets
  const targets = {
    avgTime: 500, // 500ms
    maxTime: 1000, // 1s
    totalSize: 2048, // 2MB in KB
  };

  let passed = true;

  if (avgTime > targets.avgTime) {
    console.log(`⚠️  Average response time exceeds target (${targets.avgTime}ms)`);
    passed = false;
  } else {
    console.log(`✅ Average response time meets target (<${targets.avgTime}ms)`);
  }

  if (maxTime > targets.maxTime) {
    console.log(`⚠️  Max response time exceeds target (${targets.maxTime}ms)`);
    passed = false;
  } else {
    console.log(`✅ Max response time meets target (<${targets.maxTime}ms)`);
  }

  if (totalSize / 1024 > targets.totalSize) {
    console.log(`⚠️  Total page weight exceeds target (${targets.totalSize}KB)`);
    passed = false;
  } else {
    console.log(`✅ Total page weight meets target (<${targets.totalSize}KB)`);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════');

  if (passed) {
    console.log('✅ All performance targets met!');
    console.log('');
    console.log('For detailed analysis, run:');
    console.log('  npm install -g lighthouse');
    console.log(`  lighthouse ${baseUrl} --view`);
    process.exit(0);
  } else {
    console.log('⚠️  Some performance targets not met');
    console.log('');
    console.log('Recommendations:');
    console.log('  1. Run bundle analyzer: npm run build:analyze');
    console.log('  2. Optimize images and assets');
    console.log('  3. Review PERFORMANCE_GUIDE.md');
    console.log('  4. Check Network tab in DevTools');
    process.exit(1);
  }
}

runPerformanceTests();
