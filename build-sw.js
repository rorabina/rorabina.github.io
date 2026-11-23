const layoutProtections = require('./layout-protections.js');
const injectDynamics = require('./inject-dynamics.js');
const generateServiceWorker = require('./generate-sw.js');

async function runPipeline() {
  console.log('Starting Layout Protections, HTML Dynamics & Service Worker Build...');
  try {
    layoutProtections();
    injectDynamics();
    await generateServiceWorker();
    console.log('Full Build Completed Successfully!');
  } catch (error) {
    console.error('Build Failed:', error);
    process.exit(1);
  }
}

runPipeline();
