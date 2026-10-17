// ui/popup.js - ClickControl(TM) v1.0

import { aplicarTraduccion } from "./lang.js";

document.addEventListener('DOMContentLoaded', () => 
{
    aplicarTraduccion();
    const params = new URLSearchParams(window.location.search);
    const urlTarget = params.get('target');
    const tabId = parseInt(params.get('tabId'), 10);
    if (urlTarget)
        document.getElementById('url-target').textContent = urlTarget;

    document.getElementById('btn-si').addEventListener('click', () => 
    {
        chrome.runtime.sendMessage({ res: "permitir", urlTarget, tabId }, () => 
        {
            window.location.href = urlTarget;
        });
    });

    document.getElementById('btn-no').addEventListener('click', () => 
    {
        if (window.history.length > 1)
            window.history.back();
        else 
        {
            window.close();
            setTimeout(() => { chrome.tabs.update(tabId, {url: "chrome://newtab/"}); }, 100);
        }
    });
});
// FODSOFT(TM). Neo Fodere de Frutos. All rights reserved.