import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { CanvasRenderer } from './components/CanvasRenderer';
import { CommandHUD } from './components/CommandHUD';

import { WorldProvider } from './context/WorldContext';

const App = () => {
    const [manifest, setManifest] = useState(null);

    useEffect(() => {
        // Fetch the world architected by the AI
        fetch('/scenes/latest.json')
            .then((res) => res.json())
            .then((data) => setManifest(data))
            .catch((err) => console.error("Failed to load scene:", err));
    }, []);

    if (!manifest) return <div style={{ color: 'white', textAlign: 'center', paddingTop: '20%' }}>LOADING SEOUL LABORATORY...</div>;

    return (
        <>
            <CommandHUD />
            <CanvasRenderer manifest={manifest} />
        </>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <WorldProvider>
            <App />
        </WorldProvider>
    </React.StrictMode>
);
