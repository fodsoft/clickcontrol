// SPDX-FileCopyrightText: 2025-2026 FODSOFT. Neo Fodere de Frutos
// SPDX-License-Identifier: LicenseRef-FODL-1.0

import { applyLang } from "./lang.js";

function markOverflowIfNeeded(box) 
{
    box.classList.remove('overflowing');
    if (box.scrollHeight > box.clientHeight + 1) 
        box.classList.add('overflowing');
}

document.addEventListener('DOMContentLoaded', () => {
    applyLang();

    const params = new URLSearchParams(window.location.search);
    const targetUrl = params.get('target');
    const tabId = parseInt(params.get('tabId'), 10);
    const isNewTab = params.get('isNewTab') === 'true';
    const isBackend = params.get('backend') === '1';
    const displayHost = params.get('displayHost') || '';
    const backUrl = params.get('backUrl') || '';
    const urlBox = document.getElementById('target-url');

    urlBox.addEventListener('mouseleave', () => {
        urlBox.scrollTop = 0;
    });

    if (isBackend && displayHost) 
    {
        urlBox.textContent = '';
        const originRow = document.createElement('div');
        originRow.className = 'backend-row';
        const hostNode = document.createTextNode(displayHost + '\u00A0');
        const tagSpan = document.createElement('span');
        tagSpan.className = 'backend-tag';
        tagSpan.textContent = '[BACKEND REDIRECT]';
        originRow.appendChild(hostNode);
        originRow.appendChild(tagSpan);
        urlBox.appendChild(originRow);

        if (targetUrl) 
        {
            const divider = document.createElement('hr');
            divider.className = 'backend-div';
            urlBox.appendChild(divider);

            const destRow = document.createElement('div');
            destRow.className = 'backend-row backend-dest-row';

            const destSpan = document.createElement('span');
            destSpan.className   = 'backend-dest-url';
            destSpan.textContent = targetUrl;
            destRow.appendChild(destSpan);

            urlBox.appendChild(destRow);
        }
    } 
    else if (targetUrl)
        urlBox.textContent = targetUrl;

    markOverflowIfNeeded(urlBox);

    document.getElementById('btn-allow').addEventListener('click', () => {
        chrome.runtime.sendMessage(
            { action: "allow", urlTarget: targetUrl, tabId }
        );
    });

    document.getElementById('btn-deny').addEventListener('click', () => {
        const msg = { action: "deny", tabId, isNewTab };
        if (isBackend && backUrl)
            msg.backUrl = backUrl;
        chrome.runtime.sendMessage(msg);
    });
});