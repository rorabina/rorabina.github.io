const injectDynamics = require('./inject-dynamics.js');
const generateServiceWorker = require('./generate-sw.js');

async function runPipeline() {
  console.log('Starting HTML Dynamics & Service Worker Build...');
  try {
    injectDynamics();
    await generateServiceWorker();
    console.log('HTML Dynamics, Service Worker & Manifest Build Completed Successfully!');
  } catch (error) {
    console.error('Build Failed:', error);
    process.exit(1);
  }
}

runPipeline();
