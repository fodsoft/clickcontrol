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
const tabQueues = new Map();

function runExclusive(tabId, taskFn) 
{
    const prevTask = tabQueues.get(tabId) || Promise.resolve();
    const thisTask = prevTask.catch(() => {}).then(taskFn);

    tabQueues.set(tabId, thisTask);
    thisTask.catch(() => {}).finally(() => {
        if (tabQueues.get(tabId) === thisTask) 
            tabQueues.delete(tabId);
    });
    return thisTask;
}

function isInternalUrl(url) 
{
    return (
        urlUtils.isInternalUrl(url) ||
        url.startsWith(chrome.runtime.getURL(''))
    );
}

function evaluateProtection(src, cfg) 
{
    if (cfg.allSites) 
    {
        if (cfg.exclusionList) 
        {
            for (const rule of cfg.exclusionList) 
            {
                if (urlUtils.isMatch(src, rule)) 
                    return { isProtected: false, matchedRule: null };
            }
        }
        return { isProtected: true, matchedRule: null };
    }

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

        if (src && !isInternalUrl(src) && !tabOrigins.has(details.tabId))
            tabOrigins.set(details.tabId, src);

        if (!src || isInternalUrl(src)) 
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

async function handleBeforeRedirect(details) 
{
    if (details.tabId < 0) 
        return;

    const tabId = details.tabId;
    const redirectUrl = details.redirectUrl;

    if (isInternalUrl(redirectUrl)) 
        return;

    if (tabAllowWindow.has(tabId)) 
        return;

    try 
    {
        const cfg = await Config.get();
        if (!cfg.enable) 
            return;

        if (tabAllowWindow.has(tabId)) 
            return;

        const src = tabOrigins.get(tabId);
        if (!src || isInternalUrl(src)) 
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
    } 
    catch (e) {}
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

        if (!src || src === '' || src === 'chrome://newtab/' || src === 'about:newtab' 
            || src === 'about:home' || src === 'about:blank') 
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

        if (!src || isInternalUrl(src)) 
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
    runExclusive(details.tabId, () => handleNav(details));
});

chrome.webRequest.onBeforeRedirect.addListener(
    (details) => runExclusive(details.tabId, () => handleBeforeRedirect(details)),
    { urls: ["<all_urls>"], types: ["main_frame"] }
);

chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId !== 0) 
        return;

    runExclusive(details.tabId, async () => {
        const qualifiers = details.transitionQualifiers || [];
        const wasAllowed = tabAllowWindow.has(details.tabId);

        if (qualifiers.includes('server_redirect')) 
            await handleBackendRedirect(details);
        else 
            await handleNav(details);

        if (wasAllowed) 
            tabAllowWindow.delete(details.tabId);

        try 
        {
            const cfg = await Config.get();
            if (cfg.enable && cfg.maxProtect && !isInternalUrl(details.url)) 
            {
                await chrome.scripting.executeScript
                ({
                    target: { tabId: details.tabId },
                    func: Blocker.protectDOM
                });
            }
        } catch (e) {}
    });
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    runExclusive(details.tabId, () => handleNav(details));
});

chrome.webNavigation.onErrorOccurred.addListener((details) => {
    if (details.frameId !== 0) 
        return;
    tabAllowWindow.delete(details.tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
    tabOrigins.delete(tabId);
    tabAllowWindow.delete(tabId);
    tabPendingRequest.delete(tabId);
    tabPendingSource.delete(tabId);
    tabPendingIsNewTab.delete(tabId);
    tabQueues.delete(tabId);
});

chrome.runtime.onMessage.addListener((req, sender, sendRes) => {
    if (req.action === "allow") 
    {
        runExclusive(req.tabId, async () => {
            tabAllowWindow.add(req.tabId);
            tabOrigins.set(req.tabId, req.urlTarget);
            try { await chrome.tabs.update(req.tabId, { url: req.urlTarget }); }
            catch (e) {}
        });
        sendRes({ success: true });
    }
    else if (req.action === "deny") 
    {
        runExclusive(req.tabId, async () => {
            tabAllowWindow.add(req.tabId);

            if (req.isNewTab)
            {
                try { await chrome.tabs.remove(req.tabId); }
                catch (e) {}
                return;
            }

            if (req.backUrl)
            {
                try { await chrome.tabs.update(req.tabId, { url: req.backUrl }); }
                catch (e) {}
                return;
            }

            try 
            {
                await chrome.tabs.goBack(req.tabId);
            } 
            catch (e) 
            {
                try { await chrome.tabs.update(req.tabId, { url: "about:blank" }); }
                catch (e2) {}
            }
        });
        sendRes({ success: true });
    } 
    else if (req.action === "openTrustedLink")
    {
        const TRUSTED_URL = "https://fodsoft.com/";

        chrome.tabs.create({ url: "about:blank" }, (tab) => {
            runExclusive(tab.id, async () => {
                tabAllowWindow.add(tab.id);
                try { await chrome.tabs.update(tab.id, { url: TRUSTED_URL }); }
                catch (e) {}
            });
            sendRes({ success: true });
        });
        return true;
    }
});

function armKeepAlive() 
{
    try 
    {
        chrome.alarms.create('cc-keepalive', { periodInMinutes: 0.4 });
    } 
    catch (e) {}
}

if (chrome.alarms) 
{
    chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name !== 'cc-keepalive') 
            return;
    });
    chrome.runtime.onInstalled.addListener(armKeepAlive);
    chrome.runtime.onStartup.addListener(armKeepAlive);
    armKeepAlive();
}
