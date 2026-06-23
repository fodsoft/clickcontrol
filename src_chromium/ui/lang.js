// SPDX-FileCopyrightText: 2025-2026 FODSOFT. Neo Fodere de Frutos
// SPDX-License-Identifier: LicenseRef-FODL-1.0

export function applyLang() 
{
    document.querySelectorAll("[data-lang]").forEach(el => {
        const key = el.getAttribute("data-lang");
        el.textContent = chrome.i18n.getMessage(key);
    });

    document.querySelectorAll("[data-lang-placeholder]").forEach(el => {
        const key = el.getAttribute("data-lang-placeholder");
        const msg = chrome.i18n.getMessage(key);
        el.placeholder = msg;
        el.title = msg;
    });
}