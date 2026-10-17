// SPDX-FileCopyrightText: 2025-2026 FODSOFT. Neo Fodere de Frutos
// SPDX-License-Identifier: LicenseRef-FODL-1.0

import { Config } from '../utils/config.js';
import { Detector } from './detector.js';
import { Blocker } from './blocker.js';
import { urlUtils } from '../utils/url.js';

const tabAllowWindow = new Set();
const tabOrigins = new Map();
const tabPendingRequest = new Map();
const tabPendingSource = new Map();
const tabPendingIsNewTab = new Map();

function isInternalUrl(url) 
{
    return (
        !url ||
        url.startsWith('chrome://') ||
        url.startsWith('edge://') ||
        url.startsWith(chrome.runtime.getURL(''))
    );
}

function evaluateProtection(src, cfg) 
{
    if (cfg.allSites) 
        return { isProtected: true, matchedRule: null };

    if (cfg.sitesList) 
    {
        for (const rule of cfg.sitesList) 
        {
            if (urlUtils.isMatch(src, rule)) 
                return { isProtected: true, matchedRule: rule };
        }
    }
    return { isProtected: false, matchedRule: null };
}

function staysInsideBoundary(src, candidateUrl, cfg, matchedRule) 
{
    return (
        cfg.allSites
        ? urlUtils.isSame(src, candidateUrl)
        : urlUtils.isMatch(candidateUrl, matchedRule)
    );
}

async function handleNav(details) 
{
    if (details.frameId !== 0) 
        return;
    
    const target = details.url;
    if (isInternalUrl(target))
    {
        tabOrigins.delete(details.tabId);
        return;
    }

    if (tabAllowWindow.has(details.tabId)) 
    {
        tabOrigins.set(details.tabId, target);
        return;
    }

    try 
    {
        const tab = await chrome.tabs.get(details.tabId);
        const cfg = await Config.get();
        let src = tabOrigins.get(details.tabId) || tab.url;
        let isNewTab = false;

        if (!src || src === '' || src === 'about:blank')
        {
            if (tab.openerTabId) 
            {
                try 
                {
                    const originTab = await chrome.tabs.get(tab.openerTabId);
                    src = originTab.url;
                    isNewTab = true;
                } 
                catch (e) {}
            }
        }

        if (src && !src.startsWith('chrome://') &&  !tabOrigins.has(details.tabId))
            tabOrigins.set(details.tabId, src);

        if (!src || src.startsWith('chrome://')) 
            return;

        tabPendingSource.set(details.tabId, src);
        tabPendingIsNewTab.set(details.tabId, isNewTab);

        const action = Detector.check(src, target, cfg);
        if (action) 
        {
            if (action.maxProtect) 
                Blocker.block(details.tabId, isNewTab);
            else
                Blocker.intercept(details.tabId, action.realTarget || target, isNewTab);
        } 
        else
            tabOrigins.set(details.tabId, target);
    } 
    catch (err) {}
}

function handleBeforeRedirect(details) 
{
    if (details.tabId < 0) 
        return;

    const tabId = details.tabId;
    const redirectUrl = details.redirectUrl;

    if (isInternalUrl(redirectUrl)) 
        return;

    if (tabAllowWindow.has(tabId)) 
        return;

    Config.get().then((cfg) => {
        if (!cfg.enable) 
            return;

        if (tabAllowWindow.has(tabId)) 
            return;

        const src = tabOrigins.get(tabId);
        if (!src || src.startsWith('chrome://')) 
            return; 

        const { isProtected, matchedRule } = evaluateProtection(src, cfg);
        if (!isProtected) 
            return;

        if (staysInsideBoundary(src, redirectUrl, cfg, matchedRule)) 
            return; 

        const pendingUrl = tabPendingRequest.get(tabId) || details.url || src;
        const isNewTab = tabPendingIsNewTab.get(tabId) ?? false;
        const backUrl = tabPendingSource.get(tabId) || '';

        let displayHost;
        try 
        {
            displayHost = new URL(pendingUrl).hostname;
        } 
        catch (e) 
        {
            displayHost = pendingUrl;
        }

        if (cfg.maxProtect) 
            Blocker.block(tabId, isNewTab);
        else 
            Blocker.interceptBackend(tabId, redirectUrl, displayHost, backUrl, isNewTab);
    }).catch(() => {});
}

async function handleBackendRedirect(details) 
{
    const tabId = details.tabId;
    const finalUrl = details.url;

    if (isInternalUrl(finalUrl)) 
        return;

    if (tabAllowWindow.has(tabId)) 
    {
        tabOrigins.set(tabId, finalUrl);
        return;
    }

    try 
    {
        const cfg = await Config.get();
        if (!cfg.enable) 
        {
            tabOrigins.set(tabId, finalUrl);
            return;
        }

        if (tabAllowWindow.has(tabId)) 
            return;

        const tab = await chrome.tabs.get(tabId);
        let src = tabOrigins.get(tabId) || tab.url;
        let isNewTab = tabPendingIsNewTab.get(tabId) ?? false;

        if (!src || src === '' || src === 'chrome://newtab/' || src === 'about:blank') 
        {
            if (tab.openerTabId) 
            {
                try 
                {
                    const originTab = await chrome.tabs.get(tab.openerTabId);
                    src = originTab.url;
                    isNewTab = true;
                } 
                catch (e) {}
            }
        }

        if (!src || src.startsWith('chrome://')) 
        {
            tabOrigins.set(tabId, finalUrl);
            return;
        }

        const { isProtected, matchedRule } = evaluateProtection(src, cfg);
        if (!isProtected) 
        {
            tabOrigins.set(tabId, finalUrl);
            return;
        }

        if (staysInsideBoundary(src, finalUrl, cfg, matchedRule)) 
        {
            tabOrigins.set(tabId, finalUrl);
            return;
        }

        const pendingUrl = tabPendingRequest.get(tabId) || src;
        let displayHost;
        try 
        {
            displayHost = new URL(pendingUrl).hostname;
        } 
        catch (e) 
        {
            displayHost = pendingUrl;
        }

        const backUrl = tabPendingSource.get(tabId) || '';

        if (cfg.maxProtect) 
            Blocker.block(tabId, isNewTab);
        else 
            Blocker.interceptBackend(tabId, finalUrl, displayHost, backUrl, isNewTab);
    } 
    catch (err) {}
}

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (details.frameId !== 0) 
        return;
    const url = details.url;
    if (!isInternalUrl(url)) 
        tabPendingRequest.set(details.tabId, url);
    handleNav(details);
});

chrome.webRequest.onBeforeRedirect.addListener(
    handleBeforeRedirect,
    { urls: ["<all_urls>"], types: ["main_frame"] }
);

chrome.webNavigation.onCommitted.addListener(async (details) => {
    if (details.frameId !== 0) 
        return;

    const qualifiers = details.transitionQualifiers || [];
    if (qualifiers.includes('server_redirect')) 
        await handleBackendRedirect(details);
    else 
        await handleNav(details);

    try 
    {
        const cfg = await Config.get();
        if (cfg.enable && cfg.maxProtect) 
        {
            await chrome.scripting.executeScript
            ({
                target: { tabId: details.tabId },
                func: Blocker.protectDOM
            });
        }
    } catch (e) {}
});

chrome.webNavigation.onHistoryStateUpdated.addListener(handleNav);

chrome.tabs.onRemoved.addListener((tabId) => {
    tabOrigins.delete(tabId);
    tabAllowWindow.delete(tabId);
    tabPendingRequest.delete(tabId);
    tabPendingSource.delete(tabId);
    tabPendingIsNewTab.delete(tabId);
});

chrome.runtime.onMessage.addListener((req, sender, sendRes) => {
    if (req.action === "allow") 
    {
        tabAllowWindow.add(req.tabId);

        // Prevents infinite intercept loops during active tab updates
        setTimeout(() => tabAllowWindow.delete(req.tabId), 2000);
        tabOrigins.set(req.tabId, req.urlTarget);
        chrome.tabs.update(req.tabId, { url: req.urlTarget });
        sendRes({ success: true });
    }
    else if (req.action === "deny") 
    {
        tabAllowWindow.add(req.tabId);
        setTimeout(() => tabAllowWindow.delete(req.tabId), 2000);

        if (req.isNewTab)
        {
            chrome.tabs.remove(req.tabId).catch(() => {});
        }
        else if (req.backUrl)
            chrome.tabs.update(req.tabId, { url: req.backUrl });
        else
        {
            chrome.tabs.goBack(req.tabId, () => {
                if (chrome.runtime.lastError)
                    chrome.tabs.update(req.tabId, { url: "chrome://newtab/" });
            });
        }
        sendRes({ success: true });
    } 
    else if (req.action === "openTrustedLink")
    {
        const TRUSTED_URL = "https://fodsoft.com/";

        chrome.tabs.create({ url: "about:blank" }, (tab) => {
            tabAllowWindow.add(tab.id);
            setTimeout(() => tabAllowWindow.delete(tab.id), 2000);

            chrome.tabs.update(tab.id, { url: TRUSTED_URL }, () => {
                sendRes({ success: true });
            });
        });
        return true;
    }
});