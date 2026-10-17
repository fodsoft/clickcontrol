// SPDX-FileCopyrightText: 2025-2026 FODSOFT. Neo Fodere de Frutos
// SPDX-License-Identifier: LicenseRef-FODL-1.0

export const Blocker = {
    block(tabId, isNewTab) 
    {
        if (isNewTab)
            chrome.tabs.remove(tabId).catch(() => {});
        else
            chrome.tabs.update(tabId, { url: "about:newtab" });
    },
    
    intercept(tabId, target, isNewTab = false) 
    {
        const params = new URLSearchParams({ target, tabId, isNewTab });
        const popupUrl = chrome.runtime.getURL(`ui/popup.html?${params}`);
        chrome.tabs.update(tabId, { url: popupUrl });
    },

    interceptBackend(tabId, realTarget, displayHost, backUrl, isNewTab = false) 
    {
        const popupUrl = chrome.runtime.getURL(
            `ui/popup.html` +
            `?target=${encodeURIComponent(realTarget)}` +
            `&tabId=${tabId}` +
            `&isNewTab=${isNewTab}` +
            `&backend=1` +
            `&displayHost=${encodeURIComponent(displayHost)}` +
            `&backUrl=${encodeURIComponent(backUrl)}`
        );
        chrome.tabs.update(tabId, { url: popupUrl });
    },

    protectDOM() 
    {
        const scanDOM = () => {
            const elements = document.querySelectorAll( 'iframe, div, a, button, span');
            elements.forEach(el => {
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();

                // Clickjacking thresholds to block invisible overlays without breaking small UI popups
                const isOverlay = (style.position === 'absolute' || 
                    style.position === 'fixed') &&  
                    (parseInt(style.zIndex, 10) > 500) && 
                    (rect.width > window.innerWidth * 0.4 &&
                    rect.height > window.innerHeight * 0.4);
                
                const isInvisible = style.opacity === '0' || 
                    style.visibility === 'hidden' || style.display === 'none';
                
                const bg = style.backgroundColor;
                const fg = style.color;
                const isCamouflaged = bg && fg &&  bg !== 'rgba(0, 0, 0, 0)' && bg === fg;

                if (el.tagName === 'IFRAME' && (isInvisible || isOverlay))
                    el.remove();
                else if ((isOverlay && isInvisible) || isCamouflaged) 
                {
                    if (el.style.pointerEvents !== 'none')
                        el.style.pointerEvents = 'none';
                }
            });
        };

        scanDOM();

        const observer = new MutationObserver(() => {
            observer.disconnect();
            scanDOM();
            startListening();
        });

        function startListening() 
        {
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class']
            });
        }

        startListening();
    }
};