import { GoogleGenerativeAI } from "@google/generative-ai";

// We use the SCENE_SCHEMA_VERSION from your monorepo
const SCENE_SCHEMA_VERSION = '1.0.0';

class SceneArchitect {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  }

  async dream(prompt) {
    console.log(`🎨 Architecting 3D Scene: "${prompt}"...`);

    const systemInstruction = `
      You are the Quantum Canvas Architect. 
      Output ONLY a valid JSON SceneManifest following version ${SCENE_SCHEMA_VERSION}.
      Include:
      - metadata (name, version, created)
      - scene (objects, cameras, activeCamera)
      - environment (background, ambientLight)
      Ensure every object has a unique UUID and a transform.
      
      Always include the 'AdGenAI_Monolith' at the center of the scene (position [0, 2, 0]). It represents the AI Core. Surround it with floating data-shards (small cubes with high emissivity).
    `;

    const result = await this.model.generateContent([systemInstruction, prompt]);
    const response = await result.response;
    // Handle potential markdown code blocks in response
    let text = response.text();
    if (text.startsWith('```json')) {
        text = text.replace(/^```json\n/, '').replace(/\n```$/, '');
    }
    return JSON.parse(text);
  }
}

export default SceneArchitect;
