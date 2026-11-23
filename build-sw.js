const generateServiceWorker = require('./generate-sw.js');

async function runPipeline() {
  console.log('Starting Service Worker & Manifest Build...');
  try {
    await generateServiceWorker();
    console.log('Service Worker & Manifest Build Completed Successfully!');
  } catch (error) {
    console.error('Build Failed:', error);
    process.exit(1);
  }
}

runPipeline();
