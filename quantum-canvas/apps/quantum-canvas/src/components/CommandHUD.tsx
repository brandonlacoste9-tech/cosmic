import React, { useState } from 'react';
import { useWorldContext } from '../context/WorldContext';
import { sendSecureCommand } from '../utils/bridge';

export const CommandHUD = () => {
    const [command, setCommand] = useState('');
    const [logs, setLogs] = useState(['[SYSTEM]: Battalion standing by.', '[SYSTEM]: Monolith Pulse: Stable.']);
    const { setAlertLights, setCalmLights, setLightColor } = useWorldContext();

    const handleCommand = (e: React.FormEvent) => {
        e.preventDefault();
        const cleaned = command.trim().toLowerCase();

        setLogs(prev => [...prev, `> ${command}`]);

        if (cleaned === 'alert') {
            setAlertLights();
            setLogs(prev => [...prev, `[AI]: 🚨 ALERT MODE ENGAGED. SYSTEMS RED.`]);
        } else if (cleaned === 'calm') {
            setCalmLights();
            setLogs(prev => [...prev, `[AI]: 🟢 CALM DETECTED. SYSTEMS BLUE.`]);
        } else if (cleaned.startsWith('set ')) {
            const hex = cleaned.slice(4).trim();
            if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                setLightColor(hex);
                setLogs(prev => [...prev, `[AI]: Custom Spectrum: ${hex}`]);
            } else {
                setLogs(prev => [...prev, `[AI]: Invalid Hex Code.`]);
            }
        } else if (cleaned.startsWith('deploy ')) {
            const pkg = cleaned.slice(7).trim();
            setLogs(prev => [...prev, `[BRIDGE]: Initiating SECURE deployment for ${pkg}...`]);

            sendSecureCommand('deploy', { package: pkg })
                .then(data => {
                    if (data.exitCode === 0) {
                        setLogs(prev => [...prev, `[BRIDGE]: ✅ ${pkg} deployed.`, `[STDOUT]: ${data.stdout.slice(0, 50)}...`]);
                    } else {
                        setLogs(prev => [...prev, `[BRIDGE]: ❌ Error: ${data.stderr || data.error}`]);
                    }
                })
                .catch(err => {
                    setLogs(prev => [...prev, `[BRIDGE]: ⚠️ Uplink Failed: ${err.message}`]);
                });

        } else {
            setLogs(prev => [...prev, `[AI]: Unknown Directive.`]);
        }

        setCommand('');
    };

    return (
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 100, color: '#00ffff', fontFamily: 'monospace' }}>
            <div style={{ background: 'rgba(0,0,0,0.7)', padding: '20px', border: '1px solid #00ffff', borderRadius: '5px' }}>
                <h2 style={{ margin: '0 0 10px 0' }}>ADGENAI COMMAND</h2>
                <div style={{ height: '150px', overflowY: 'auto', marginBottom: '10px', fontSize: '12px' }}>
                    {logs.map((log, i) => <div key={i}>{log}</div>)}
                </div>
                <form onSubmit={handleCommand}>
                    <input
                        type="text"
                        value={command}
                        onChange={(e) => setCommand(e.target.value)}
                        style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #00ffff', color: '#fff', outline: 'none' }}
                        placeholder="Type 'alert', 'calm' or 'set #color'..."
                    />
                </form>
            </div>
        </div>
    );
};
