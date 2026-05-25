// ui/lang.js - ClickControl(TM) v1.0

export function aplicarTraduccion()
{
    document.querySelectorAll("[data-lang]").forEach(elem => 
    {
        const key = elem.getAttribute("data-lang");
        elem.textContent = chrome.i18n.getMessage(key);
    });

    document.querySelectorAll("[data-lang-placeholder]").forEach(elem => 
    {
        const key = elem.getAttribute("data-lang-placeholder");
        elem.placeholder = chrome.i18n.getMessage(key);
    });
}
// FODSOFT(TM). Neo Fodere de Frutos. All rights reserved.