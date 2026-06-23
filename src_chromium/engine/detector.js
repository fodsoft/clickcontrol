// SPDX-FileCopyrightText: 2025-2026 FODSOFT. Neo Fodere de Frutos
// SPDX-License-Identifier: LicenseRef-FODL-1.0

import { urlUtils } from '../utils/url.js';

export const Detector = {
    check(src, target, cfg) 
    {
        if (!cfg.enable || !src || !target || src === target || 
            target.startsWith('chrome://') || 
            target.startsWith('edge://') || 
            target.startsWith('about:'))
                return false;

        const real = urlUtils.unwrap(target) || target;
        let isProtected = cfg.allSites;
        let matchedRule = null;
        
        if (!isProtected && cfg.sitesList) 
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