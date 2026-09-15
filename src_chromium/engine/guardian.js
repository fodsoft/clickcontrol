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

// Serializes all navigation-related work per tab. Two navigations firing
// back-to-back on the same tab (fast clicking, a page that redirects
// again immediately, etc.) used to be handled by concurrent, overlapping
// async calls; whichever one finished its awaits first could win and
// overwrite the other's bookkeeping (tabOrigins and friends), which is
// what let some redirect chains slip through unchecked. Routing every
// handler through this queue guarantees they run in the same order the
// events fired, one at a time, per tab.
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

        // The allow window only has to survive until the approved
        // navigation actually commits (including any redirect chain that
        // happened along the way while loading it). Clearing it right
        // here - instead of on a blind timer - means a later, unrelated
        // redirect on the same tab can no longer ride along on an old
        // approval, which is what made the protection skippable before.
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

// Safety net: if an approved navigation never actually commits (network
// error, cancelled, blocked by something else...), don't leave its allow
// window open forever - that would silently wave through whatever this
// tab navigates to next.
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
                try { await chrome.tabs.update(req.tabId, { url: "chrome://newtab/" }); }
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

// Keeps the background service worker warm on slower devices via a
// recurring alarm, so it's less likely to have gone idle - and need a
// slow cold-start - right when it needs to evaluate a navigation.
// Manifest V3 has no literal "execution priority" flag to request; this,
// together with registering every listener above synchronously at the
// top level (required for Chrome to reliably wake the worker for these
// events), is the practical equivalent available today.
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
        // No-op: simply receiving this alarm is what keeps the worker warm.
        if (alarm.name !== 'cc-keepalive') 
            return;
    });
    chrome.runtime.onInstalled.addListener(armKeepAlive);
    chrome.runtime.onStartup.addListener(armKeepAlive);
    armKeepAlive();
}
