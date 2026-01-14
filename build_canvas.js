import fs from 'fs';
import path from 'path';

try {
    const content = fs.readFileSync('quantum-canvas-monorepo.md', 'utf8');
    const fileRegex = /#### ([^\n]+)\n```(?:\w+)\n([\s\S]*?)```/g;
    let match;

    console.log("🏗️ MATERIALIZING QUANTUM CANVAS...");

    while ((match = fileRegex.exec(content)) !== null) {
      const filePath = match[1].trim();
      const fileContent = match[2];
      const fullPath = path.join('quantum-canvas', filePath);

      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, fileContent);
      console.log(`  > [CREATED]: ${filePath}`);
    }

    console.log("\n✅ CANVAS ENGINE INSTALLED.");
} catch (error) {
    if (error.code === 'ENOENT') {
        console.error("❌ ERROR: 'quantum-canvas-monorepo.md' not found in root.");
        console.error("Please place the monorepo markdown file in the cosmic directory to proceed with materialization.");
    } else {
        console.error(error);
    }
}
