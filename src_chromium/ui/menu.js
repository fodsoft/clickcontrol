// SPDX-FileCopyrightText: 2025-2026 FODSOFT. Neo Fodere de Frutos
// SPDX-License-Identifier: LicenseRef-FODL-1.0

import { applyLang } from "./lang.js";
import { Config } from '../utils/config.js';
import { urlUtils } from '../utils/url.js';

document.addEventListener('DOMContentLoaded', async () => {
    const cfg = await Config.get();
    const togEnable = document.getElementById('tog-enable');
    const togAll = document.getElementById('tog-all');
    const togMax = document.getElementById('tog-max');
    const inpSite = document.getElementById('inp-site');
    const btnAdd = document.getElementById('btn-add');
    const btnAddCurrent = document.getElementById('btn-add-current');
    const siteList = document.getElementById('site-list');
    const listTitle = document.getElementById('list-title');
    const listDesc = document.getElementById('list-desc');

    // Both lists always exist; which one is shown/edited below depends on
    // whether "All sites" is on. With it off, the custom list says which
    // sites get protection. With it on, everything is protected already,
    // so the same list slot switches to an exclusion list: sites added
    // there are the ones exempted from that blanket protection.
    function activeKey() 
    {
        return cfg.allSites ? 'exclusionList' : 'sitesList';
    }

    function activeList() 
    {
        return cfg[activeKey()];
    }

    function isCovered(list, domain) 
    {
        return list.some(rule => {
            if (rule === domain) 
                return true;
            if (rule.endsWith('.*')) 
            {
                const base = rule.slice(0, -2);
                return (domain === base || domain.startsWith(base + '.') 
                    || domain.endsWith('.' + base));
            }
            return false;
        });
    }

    function updateListLabels() 
    {
        const titleKey = cfg.allSites ? 'option_exclusionList' : 'option_customList';
        const descKey = cfg.allSites ? 'desc_exclusionList' : 'desc_customList';

        listTitle.setAttribute('data-lang', titleKey);
        listDesc.setAttribute('data-lang', descKey);
        listTitle.textContent = chrome.i18n.getMessage(titleKey);
        listDesc.textContent = chrome.i18n.getMessage(descKey);

        siteList.classList.toggle('site-list--exclusion', cfg.allSites);
    }

    let currentTabDomain = null;

    function refreshAddCurrentButton() 
    {
        if (!currentTabDomain) 
            return;

        if (!isCovered(activeList(), currentTabDomain)) 
        {
            btnAddCurrent.style.display = 'block';
            const ogTxt = chrome.i18n.getMessage("btn_addCurrent");
            btnAddCurrent.textContent = `${ogTxt} (${currentTabDomain})`;
            btnAddCurrent.onclick = () => addSite(currentTabDomain);
        } 
        else
            btnAddCurrent.style.display = 'none';
    }

    togEnable.checked = cfg.enable;
    togAll.checked = cfg.allSites;
    togMax.checked = cfg.maxProtect;
    updateListLabels();
    renderList(activeList());
    applyLang();
    // applyLang() only runs once here, but the list title/description were
    // just set directly above (and are re-set on every toggle change), so
    // they stay correct without needing a second applyLang() pass.

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
    
        if (currentTab && currentTab.url && 
            (currentTab.url.startsWith('http://') || 
            currentTab.url.startsWith('https://')))
        {
            let domain = urlUtils.getDomain(currentTab.url);
            if (domain)
            {
                domain = urlUtils.getRootDomain(domain) || domain;
                
                if (urlUtils.isValidDomain(domain)) 
                {
                    currentTabDomain = domain;
                    refreshAddCurrentButton();
                }
            }
        }
    });

    togEnable.addEventListener('change', () => {
        updateCfg('enable', togEnable.checked);
    });

    togMax.addEventListener('change', () => {
        updateCfg('maxProtect', togMax.checked);
    });

    togAll.addEventListener('change', async () => {
        await updateCfg('allSites', togAll.checked);
        updateListLabels();
        renderList(activeList());
        refreshAddCurrentButton();
    });

    function addSite(site) 
    {
        if (!site) 
            return;

        const key = activeKey();
        const list = cfg[key];

        if (!isCovered(list, site))
        {
            list.push(site);
            updateCfg(key, list);
            renderList(list);
        }
        inpSite.value = '';
        refreshAddCurrentButton();
    }

    function addSiteHandler() 
    {
        let site = inpSite.value.trim().toLowerCase();
        
        site = urlUtils.getDomain(site) || site;
        site = urlUtils.getRootDomain(site) || site;
            
        if (!urlUtils.isValidDomain(site))
        {
            inpSite.style.backgroundColor = 'rgba(231, 76, 60, 0.2)';
            inpSite.style.borderColor = '#e74c3c';
            setTimeout(() => {
                inpSite.style.backgroundColor = '';
                inpSite.style.borderColor = '';
            }, 800);
            return;
        }

        addSite(site);
    }

    btnAdd.addEventListener('click', addSiteHandler);
    inpSite.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') 
        {
            e.preventDefault();
            addSiteHandler();
        }
    });

    const fodsoftLink = document.getElementById('fodsoft-link');
    if (fodsoftLink) 
    {
        fodsoftLink.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.runtime.sendMessage({ action: 'openTrustedLink' });
        });
    }

    async function updateCfg(key, val) 
    {
        cfg[key] = val;
        // await new Promise(resolve => setTimeout(resolve, 500));
        await Config.set(cfg);
    }

    function renderList(list) 
    {
        siteList.innerHTML = '';
        list.forEach((domain, idx) => 
        {
            const li = document.createElement('li');
            li.textContent = domain;
            const del = document.createElement('span');
            del.textContent = '✖';
            del.className = 'btn-del';
            del.title = chrome.i18n.getMessage("msg_remove");
            del.setAttribute("data-lang-placeholder", "msg_remove");
            del.addEventListener('click', async () => 
            {
                const key = activeKey();
                cfg[key] = cfg[key].filter(item => item !== domain);
                await updateCfg(key, cfg[key]);
                renderList(cfg[key]);
                refreshAddCurrentButton();
            });
            li.appendChild(del);
            siteList.appendChild(li);
        });
    }
});
