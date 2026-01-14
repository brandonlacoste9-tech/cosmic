import script from 'crypto-js';

const SECRET = "Quantum_Vault_2026_Secure_Key"; // Match the .env

export const sendSecureCommand = async (command: string, parameters: any) => {
  const body = JSON.stringify({ command, parameters });
  
  // Sign the request
  const signature = script.HmacSHA256(body, SECRET).toString();

  const response = await fetch('http://localhost:4000/api/enforce', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hmac-signature': signature
    },
    body: body
  });

  return response.json();
};
