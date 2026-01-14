import sovereigntyGuard from './src/managers/SovereigntyGuard.js';
import complianceBeacon from './src/agents/ComplianceBeacon.js';

async function operationalize() {
  console.log("🌑 THE ARTIFACT: INITIALIZING NEURAL UPLINK...");

  // 1. Activate Sovereignty (Simulating K-AI Protocol for the South Korea Blueprint)
  console.log("\n🌍 Step 1: Checking Jurisdiction...");
  await sovereigntyGuard.detectJurisdiction(); 
  
  // 2. Establish Command Link
  console.log("\n💓 Step 2: Pulsing Compliance Beacon...");
  const status = await complianceBeacon.pulse();

  if (status.status === 'secure') {
    console.log("\n✅ UPLINK ESTABLISHED: The Judge is watching.");
  } else {
    console.log("\n⚠️ UPLINK DARK: SaaS Mothership unreachable. Operating in Stealth Mode.");
  }

  console.log("\n🏁 DIRECTIVE 02 COMPLETE. NODE IS INTELLIGENT.");
}

operationalize().catch(console.error);
