// SPDX-FileCopyrightText: 2025-2026 FODSOFT. Neo Fodere de Frutos
// SPDX-License-Identifier: LicenseRef-FODL-1.0

export const urlUtils = {
    getDomain(urlStr)
    {
        if (!urlStr || typeof urlStr !== 'string')
            return null;
        
        let raw = urlStr.trim().toLowerCase();
        let isWildcard = false;

        if (raw.includes('.*'))
        {
            isWildcard = true;

            // Native URL() crashes on asterisks; temporary subdomain bypasses this
            raw = raw.replace('.*', '.tempwildcard');
        }

        if (!/^https?:\/\//i.test(raw))
            raw = 'https://' + raw;

        try
        {
            const url = new URL(raw);
            let host = url.hostname.replace(/^www\./, '').split(':')[0];
            if (isWildcard)
                host = host.replace('.tempwildcard', '.*');
            return host;
        }
        catch (e)
        {
            return null;
        }
    },

    isValidDomain(domain)
    {
        if (!domain || typeof domain !== 'string')
            return false;
        if (domain.includes(' ') || domain.length < 3)
            return false;

        const parts = domain.split('.');
        if (parts.length < 2)
            return false;
        
        const tld = parts[parts.length - 1];
        return (/^[a-z]{2,}$/i.test(tld) || tld === '*' || /^[0-9]+$/.test(tld));
    },

    getRootDomain(domain)
    {
        if (!domain || typeof domain !== 'string') 
            return null;
        
        if (domain.endsWith('.*'))
        {
            const parts = domain.split('.');
            if (parts.length > 2) 
                return parts.slice(-2).join('.');
            return domain;
        }

        if (/^[0-9.]+$/.test(domain) || !domain.includes('.')) 
            return domain;

        const parts = domain.split('.');
        if (parts.length <= 2) 
            return domain;

        const last = parts[parts.length - 1];
        const secondToLast = parts[parts.length - 2];

        // Supports multi-level ccTLDs (like .co.uk) to avoid clipping root domains
        if (last.length === 2 && (secondToLast.length === 2 || secondToLast.length === 3))
            return parts.slice(-3).join('.');

        return parts.slice(-2).join('.');
    },

    isSame(urlA, urlB)
    {
        const domA = this.getDomain(urlA);
        const domB = this.getDomain(urlB);
        if (!domA || !domB) 
            return false;
        return (domA === domB || domA.endsWith(`.${domB}`) || domB.endsWith(`.${domA}`));
    },

    isMatch(currUrl, rule)
    {
        try 
        {
            const urlObj = new URL(currUrl);
            const host = urlObj.hostname.replace(/^www\./, '');
            const path = host + urlObj.pathname;
            
            if (rule.includes('/'))
            {
                const cleanRule = rule.replace(/^(https?:\/\/)?(www\.)?/, '');
                return path.startsWith(cleanRule);
            }

            if (rule.endsWith('.*'))
            {
                const base = rule.slice(0, -2);
                return (host.startsWith(`${base}.`) || host.includes(`.${base}.`));
            }

            return (host === rule || host.endsWith(`.${rule}`));
        }
        catch (e)
        {
            return false;
        }
    },

    unwrap(urlStr)
    {
        const KNOWN_PARAMS = [
            'url', 'u', 'q', 'target', 'redirect', 'redirect_uri', 
            'redirect_url', 'redir', 'dest', 'destination', 'continue', 
            'next', 'out', 'r', 'link', 'ru', 'to', 'goto'
        ];

        let urlObj;
        try
        {
            urlObj = new URL(urlStr);
        } 
        catch (e)
        {
            return null;
        }

        const asAbsoluteUrl = (value) => {
            try 
            {
                const test = new URL(value);
                if (test.protocol === 'http:' || test.protocol === 'https:') 
                    return test.href;
            } 
            catch (e) {}
            return null;
        };

        const resolve = (raw) => {
            const direct = asAbsoluteUrl(raw);
            if (direct) 
                return direct;

            try
            {
                return asAbsoluteUrl(decodeURIComponent(raw));
            } 
            catch (e)
            {
                return null;
            }
        };

        const params = urlObj.searchParams;

        for (const name of KNOWN_PARAMS)
        {
            const raw = params.get(name);
            if (!raw) 
                continue;
            const found = resolve(raw);
            if (found) 
                return found;
        }

        for (const [, raw] of params)
        {
            const found = resolve(raw);
            if (found && this.getDomain(found) !== this.getDomain(urlStr)) 
                return found;
        }

        return null;
    }
};