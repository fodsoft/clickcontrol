// engine/guardian.js - ClickControl(TM) v1.0

import { Config } from '../utils/config.js';
import { Detector } from './detector.js';
import { Blocker } from './blocker.js';

const navPermitidas = new Set();
setInterval(() => navPermitidas.clear(), 1000 * 60 * 60);

async function manejarNav(detalles) 
{
    if (detalles.frameId !== 0) 
        return;
    const urlTarget = detalles.url;
    if (urlTarget.startsWith('chrome://') || urlTarget.startsWith('edge://') || urlTarget.startsWith('about:') || urlTarget.startsWith(chrome.runtime.getURL('')))
        return;
    try 
    {
        const tab = await chrome.tabs.get(detalles.tabId);
        const config = await Config.obtenerConfig();
        let urlSource = tab.url;
        let esNewTab = false;
        if (!urlSource || urlSource === '' || urlSource === 'chrome://newtab/' || urlSource === 'chrome://new-tab-page/' || urlSource === 'about:newtab' || urlSource === 'about:blank') 
        {
            if (tab.openerTabId) 
            {
                try 
                {
                    const tabOrigen = await chrome.tabs.get(tab.openerTabId);
                    urlSource = tabOrigen.url;
                    esNewTab = true;
                } 
                catch (e) {}
            }
        }
        if (!urlSource || urlSource.startsWith('chrome://') || urlSource.startsWith('about:')) 
            return;
        const keyPermiso = `${detalles.tabId}:${urlTarget}`;
        if (navPermitidas.has(keyPermiso)) 
        {
            setTimeout(() => { navPermitidas.delete(keyPermiso); }, 1000);
            return;
        }
        const res = Detector.debeInterceptar(urlSource, urlTarget, config);
        if (res)
        {
            if (res.maxProtect)
                Blocker.bloquear(detalles.tabId, urlSource, esNewTab);
            else
                Blocker.interceptar(detalles.tabId, urlTarget);
        }
    } 
    catch (err) {}
}

chrome.webNavigation.onBeforeNavigate.addListener(manejarNav);
chrome.webNavigation.onHistoryStateUpdated.addListener(manejarNav);
chrome.runtime.onMessage.addListener((peticion, remitente, enviarResponse) => 
{
    if (peticion.res === "permitir")
        navPermitidas.add(`${peticion.tabId}:${peticion.urlTarget}`);
});