// engine/detector.js - ClickControl(TM) v1.0

import { UtilsUrl } from '../utils/url.js';

export const Detector =
{
    debeInterceptar(urlSource, urlTarget, config) 
    {
        if (!config.enable || !urlSource || !urlTarget || urlSource === urlTarget || 
			urlTarget.startsWith('chrome://') || urlTarget.startsWith('edge://') || urlTarget.startsWith('about:')) 
				return (false);
        
        let esSitioProtegido = config.allSites;
        let reglaMatch = null;
        
        if (!esSitioProtegido && config.sitesList) 
        {
            for (const regla of config.sitesList) 
            {
                if (UtilsUrl.coincideProteccion(urlSource, regla))
                {
                    esSitioProtegido = true;
                    reglaMatch = regla;
                    break;
                }
            }
        }
        
        if (esSitioProtegido) 
        {
            let esDestinoInterno = false;
            if (config.allSites)
                esDestinoInterno = UtilsUrl.esMismoDominio(urlSource, urlTarget);
            else if (reglaMatch)
                esDestinoInterno = UtilsUrl.coincideProteccion(urlTarget, reglaMatch);
            if (!esDestinoInterno) 
            {
                return {
                    interceptar: true,
                    maxProtect: config.maxProtect
                };
            }
        }
        return (false);
    }
};