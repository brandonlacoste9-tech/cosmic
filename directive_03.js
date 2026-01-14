import SceneArchitect from './src/agents/SceneArchitect.js';
import fs from 'fs';
import path from 'path';
import 'dotenv/config'; // Load .env


const architect = new SceneArchitect(process.env.GEMINI_API_KEY);

async function runDirective03() {
  if (!process.env.GEMINI_API_KEY) {
      console.error("❌ ERROR: GEMINI_API_KEY environment variable is missing.");
      console.error("Please set it in your environment or .env file.");
      return;
  }

  const prompt = "A futuristic AdGenAI laboratory in Seoul, with neon accents and floating holographic displays.";
  
  try {
      const manifest = await architect.dream(prompt);
      saveManifest(manifest);
  } catch (error) {
      console.error("⚠️ GENESIS UPLINK FAILED. ENGAGING LOCAL FALLBACK PROTOCOL.");
      console.error("Reason:", error.message);
      
      const fallbackManifest = {
          "metadata": {
            "name": "Seoul AdGenAI Lab (Stealth Mode)",
            "version": "1.0.0",
            "created": new Date().toISOString()
          },
          "environment": {
            "background": "#050510",
            "ambientLight": {
              "color": "#00ffff",
              "intensity": 0.5
            }
          },
          "scene": {
            "objects": [
              {
                "id": "floor",
                "name": "Holographic Floor",
                "type": "mesh",
                "geometry": "box",
                "material": { "color": "#1a1a2e", "opacity": 0.8 },
                "transform": {
                  "position": { "x": 0, "y": -1, "z": 0 },
                  "rotation": { "x": 0, "y": 0, "z": 0, "w": 1 },
                  "scale": { "x": 20, "y": 0.2, "z": 20 }
                }
              },
              {
                "id": "holotable",
                "name": "Central Interface",
                "type": "mesh",
                "geometry": "cylinder", // Corrected geometry name if needed, assuming builder allows specific types
                // Note: user schema allows box, sphere, plane, cylinder. 
                "material": { "color": "#00ffcc", "emissive": "#00ccaa", "opacity": 0.9 },
                "transform": {
                  "position": { "x": 0, "y": 0.5, "z": 0 },
                  "rotation": { "x": 0, "y": 0, "z": 0, "w": 1 },
                  "scale": { "x": 2, "y": 0.1, "z": 2 }
                }
              }, 
               {
                "id": "floating_cube",
                "name": "AI Core",
                "type": "mesh",
                "geometry": "box",
                "material": { "color": "#ff00ff", "emissive": "#aa00aa", "opacity": 1.0 },
                "transform": {
                  "position": { "x": 0, "y": 2, "z": 0 },
                  "rotation": { "x": 0.5, "y": 0.5, "z": 0, "w": 1 },
                  "scale": { "x": 0.5, "y": 0.5, "z": 0.5 }
                }
              }
            ]
          }
        };
       saveManifest(fallbackManifest);
  }
}

function saveManifest(manifest) {
      const outputDir = './quantum-canvas/apps/quantum-canvas/public/scenes';
      const outputPath = path.join(outputDir, 'latest.json');
      
      // Ensure directory exists
      fs.mkdirSync(outputDir, { recursive: true });
      
      fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
      
      console.log(`\n✨ WORLD GENERATED: ${outputPath}`);
      console.log("🖥️ Open Quantum Canvas to view the render.");
}


runDirective03();
