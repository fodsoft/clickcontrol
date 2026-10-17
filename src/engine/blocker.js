// engine/blocker.js - ClickControl(TM) v1.0

export const Blocker = 
{
    bloquear(tabId, urlSource, esNewTab)
    {
        if (esNewTab)
            chrome.tabs.remove(tabId).catch(() => {});
        else 
        {
            chrome.tabs.goBack(tabId).catch(() => 
            {
                chrome.tabs.update(tabId, { url: urlSource || "chrome://newtab/" });
            });
        }
    },
    interceptar(tabId, urlTarget)
    {
        const urlPopup = chrome.runtime.getURL(`ui/popup.html?target=${encodeURIComponent(urlTarget)}&tabId=${tabId}`);
        chrome.tabs.update(tabId, { url: urlPopup });
    }
};
// FODSOFT(TM). Neo Fodere de Frutos. All rights reserved.