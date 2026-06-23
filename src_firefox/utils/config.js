// SPDX-FileCopyrightText: 2025-2026 FODSOFT. Neo Fodere de Frutos
// SPDX-License-Identifier: LicenseRef-FODL-1.0

let cache = null;

function load() 
{
    return new Promise((resolve) => {
        chrome.storage.local.get(['enable', 'maxProtect', 'allSites', 'sitesList'], (res) => {
            cache = {
                enable: res.enable ?? true,
                maxProtect: res.maxProtect ?? false,
                allSites: res.allSites ?? false,
                sitesList: res.sitesList ?? []
            };
            resolve(cache);
        });
    });
}

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') 
        cache = null;
});

export const Config = {
    async get() 
    {
        if (cache) 
            return cache;
        return load();
    },
    async set(cfg) 
    {
        return new Promise((resolve) => {
            chrome.storage.local.set(cfg, () => {
                cache = null;
                resolve();
            });
        });
    }
};