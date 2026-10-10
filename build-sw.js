const layout-protections = require('./layout-protections.js');
const injectDynamics = require('./inject-dynamics.js');
const generateServiceWorker = require('./generate-sw.js');

async function runPipeline() {
  console.log('Starting Modular Build Pipeline...');
  try {
    layout-protections();
    injectDynamics();
    await generateServiceWorker();
    console.log('Build Pipeline Completed Successfully!');
  } catch (error) {
    console.error('Build Pipeline Failed:', error);
    process.exit(1);
  }
}

runPipeline();
