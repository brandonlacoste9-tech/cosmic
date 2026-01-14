import { createContext, useContext, useState, ReactNode } from 'react';

/**
 * The light settings that the world will observe.
 * Only the color is needed for this demo but you can add intensity, type, etc.
 */
export type LightSettings = {
    color: string; // hex string e.g. '#ff0000'
};

export type WorldContextType = {
    lightSettings: LightSettings;
    /**
     * Switch to “alert” mode – red lights.
     */
    setAlertLights: () => void;
    /**
     * Switch to “calm” mode – blue lights.
     */
    setCalmLights: () => void;
    /**
     * Generic helper – any hex colour.
     */
    setLightColor: (hex: string) => void;
};

const WorldContext = createContext<WorldContextType | undefined>(undefined);

export const WorldProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [lightSettings, setLightSettings] = useState<LightSettings>({ color: '#ffffff' });

    /** Helper actions */
    const setAlertLights = () => setLightSettings({ color: '#ff0000' });
    const setCalmLights = () => setLightSettings({ color: '#0000ff' });
    const setLightColor = (hex: string) => setLightSettings({ color: hex });

    return (
        <WorldContext.Provider value={{ lightSettings, setAlertLights, setCalmLights, setLightColor }}>
            {children}
        </WorldContext.Provider>
    );
};

export const useWorldContext = (): WorldContextType => {
    const ctx = useContext(WorldContext);
    if (!ctx) throw new Error('useWorldContext must be used within a WorldProvider');
    return ctx;
};
