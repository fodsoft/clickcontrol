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

    togEnable.checked = cfg.enable;
    togAll.checked = cfg.allSites;
    togMax.checked = cfg.maxProtect;
    renderList(cfg.sitesList);
    applyLang();

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
                
                const isAlreadyCovered = cfg.sitesList.some(rule => {
                    if (rule === domain) 
                        return true;

                    if (rule.endsWith('.*')) {
                        const base = rule.slice(0, -2);
                        return (
                            domain === base || domain.startsWith(base + '.') 
                            || domain.endsWith('.' + base)
                        );
                    }
                    return false;
                });
                
                if (urlUtils.isValidDomain(domain) && !isAlreadyCovered) 
                {
                    btnAddCurrent.style.display = 'block';
                    const ogTxt = chrome.i18n.getMessage("btn_addCurrent");
                    btnAddCurrent.textContent = `${ogTxt} (${domain})`;
                    btnAddCurrent.onclick = () => addSite(domain);
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

    togAll.addEventListener('change', () => {
        updateCfg('allSites', togAll.checked);
    });

    function addSite(site) 
    {
        if (!site) 
            return;

        const isAlreadyCovered = cfg.sitesList.some(rule => {
            if (rule === site) 
                return true;
            if (rule.endsWith('.*')) 
            {
                const base = rule.slice(0, -2);
                return (site === base || site.startsWith(base + '.'));
            }
            return false;
        });

        if (!isAlreadyCovered)
        {
            cfg.sitesList.push(site);
            updateCfg('sitesList', cfg.sitesList);
            renderList(cfg.sitesList);
        }
        inpSite.value = '';
        
        if (btnAddCurrent.textContent.includes(site))
            btnAddCurrent.style.display = 'none';
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
            // del.title = '';
            del.setAttribute("data-lang-placeholder", "msg_remove");
            del.addEventListener('click', async () => 
            {
                cfg.sitesList = cfg.sitesList.filter(item => item !== domain);
                await updateCfg('sitesList', cfg.sitesList);
                renderList(cfg.sitesList);
            });
            li.appendChild(del);
            siteList.appendChild(li);
        });
    }
});