// utils/config.js - ClickControl(TM) v1.0

export const Config =
{
    async obtenerConfig()
    {
        const data = await chrome.storage.local.get(['config']);
        if (data.config) 
            return (data.config);
        const respuesta = await fetch(chrome.runtime.getURL('config/default.json'));
        const configuracionPorDefecto = await respuesta.json();
        await (this.guardarConfig(configuracionPorDefecto));
        return (configuracionPorDefecto);
    },
    
    async guardarConfig(config) 
    {
        await (chrome.storage.local.set({ config: config }));
    }
};
// FODSOFT(TM). Neo Fodere de Frutos. All rights reserved.