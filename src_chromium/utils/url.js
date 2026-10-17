// utils/url.js - ClickControl(TM) v1.0

export const UtilsUrl = 
{
    obtenerDominio(urlStr) 
    {
        try 
        {
            const url = new URL(urlStr);
            return (url.hostname.replace(/^www\./, ''));
        } 
        catch (e) 
        {
            return (null);
        }
    },
    
    esMismoDominio(urlA, urlB) 
    {
        const domA = this.obtenerDominio(urlA);
        const domB = this.obtenerDominio(urlB);
        if (!domA || !domB) 
            return (false);
        return (domA === domB || domA.endsWith('.' + domB) || domB.endsWith('.' + domA));
    },

    coincideProteccion(urlActual, itemProtegido) 
    {
        try
        {
            const urlObj = new URL(urlActual);
            const hostLimpio = urlObj.hostname.replace(/^www\./, '');
            const ruta = hostLimpio + urlObj.pathname;
            if (itemProtegido.includes('/')) 
            {
                const reglaLimpia = itemProtegido.replace(/^(https?:\/\/)?(www\.)?/, '');
                return (ruta.startsWith(reglaLimpia));
            } 
            else
                return (hostLimpio === itemProtegido || hostLimpio.endsWith('.' + itemProtegido));
        } 
        catch (e) 
        {
            return (false);
        }
    }
};
// FODSOFT(TM). Neo Fodere de Frutos. All rights reserved.