// SPDX-FileCopyrightText: 2025-2026 FODSOFT. Neo Fodere de Frutos
// SPDX-License-Identifier: LicenseRef-FODL-1.0

import { urlUtils } from '../utils/url.js';

export const Detector = {
    check(src, target, cfg) 
    {
        if (!cfg.enable || !src || !target || src === target || 
            urlUtils.isInternalUrl(src) || urlUtils.isInternalUrl(target))
                return false;

        const real = urlUtils.unwrap(target) || target;
        let isProtected = false;
        let matchedRule = null;

        if (cfg.allSites) 
        {
            // Everything is protected by default; sites in the exclusion
            // list are the only ones exempted.
            isProtected = true;

            if (cfg.exclusionList) 
            {
                for (const rule of cfg.exclusionList) 
                {
                    if (urlUtils.isMatch(src, rule)) 
                    {
                        isProtected = false;
                        break;
                    }
                }
            }
        } 
        else if (cfg.sitesList) 
        {
            for (const rule of cfg.sitesList) 
            {
                if (urlUtils.isMatch(src, rule)) 
                {
                    isProtected = true;
                    matchedRule = rule;
                    break;
                }
            }
        }
        
        if (isProtected) 
        {
            let isInternal = cfg.allSites 
                ? urlUtils.isSame(src, real) 
                : urlUtils.isMatch(real, matchedRule);

            if (!isInternal)
                return {
                    intercept: true, 
                    maxProtect: cfg.maxProtect, 
                    realTarget: real 
                };
        }
        return false;
    }
};
