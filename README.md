# ClickControl™
![](https://img.shields.io/github/repo-size/fodsoft/clickcontrol?style=flat&color=lightgray)
![](https://img.shields.io/github/last-commit/fodsoft/clickcontrol?color=lightgray)
![](https://img.shields.io/badge/source-public-green)
![License](https://img.shields.io/badge/license-proprietary-red)

<br>

<div align="center">
    <img src="https://resources.fodsoft.com/images/ext/logo_clickcontrol_a.png" width="512" alt="ClickControl logo">
</div>

<br>

ClickControl™ is a lightweight protection web extension against unwanted redirects, deceptive navigation tricks, and unsafe web behavior, developed by Néo Foderé de Frutos under the FODSOFT™ brand.

It blocks forced tab openings, hidden click zones, malicious redirects, and other actions that try to move you away from the page without your consent. Lightweight, privacy‑friendly, and fully local, ClickControl ensures that every navigation is intentional and under your control.


## How it works
ClickControl acts as a silent guardian that intercepts navigation whenever a domain on your active scope attempts to force you away. It is precisely engineered to neutralize suspicious websites that abuse background tab spawns, intrusive pop-unders, or unwanted adult content exposure, shielding the user from persistent disruptions and potential drive-by security threats.

Engineered to be ultra-lightweight, the extension weighs under 100 KB and has virtually zero impact on browser performance while still delivering advanced protection. 

Please note that ClickControl is by no means intended to replace a traditional adblocker; instead, it is highly recommended to use both alongside each other for optimal defense.

### Options
- **Enable Protection:**
  Activates or deactivates the entire protection of the extension without needing to do it from the browser itself.

- **Max Protection:**
  Designed to be activated when browsing highly unsafe websites. It activates an aggressive protection that directly blocks redirection attempts without triggering the pop-up, avoiding any disruption to the user. Additionally, this option uses a MutationObserver to detect if the website adds new elements and also tries to block iframes or other invisible elements directly. This option may break legitimate behaviors on some websites in very specific cases.
  
- **All Sites:**
  Activates the protection—whether normal or maximum—on absolutely all sites, meaning every domain on the web. It is mainly designed to be turned on occasionally when browsing sites that tend to redirect you to other places, ensuring the user is aware at all times of where they are trying to take them. Leaving this option enabled all the time can become annoying during normal browsing.
  
- **Custom Sites List:**
  A dynamic and intuitive list where you can add the domains where the protection will be activated. For example, if you enter fodsoft.com into the list, any redirection attempt from fodsoft.com to another domain will be intercepted.

- **Add this site (domain):**
  Adds to the list the domain of the tab where the user is currently located when opening the menu.


## Download
### For Chromium-based browsers:
  - **[Chrome Web Store](https://chromewebstore.google.com/detail/clickcontrol/fikeadnpjmaekddaabdggmcbopbihkef)**

  - **[Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/clickcontrol%E2%84%A2/mbahcpomjmojgbnibgobknimgcojmjmf)**

  - **[ZIP](https://resources.fodsoft.com/downloads/clickcontrol/releases/latest/clickcontrol-chromium)**

### For Firefox:
  - **[Firefox Add-ons](https://addons.mozilla.org/es-ES/firefox/addon/click-control/)**

  - **[ZIP](https://resources.fodsoft.com/downloads/clickcontrol/releases/latest/clickcontrol-firefox)**

*If you want to install it from a ZIP, in most Chromium-based browsers, you just need to go to `chrome://extensions`, enable **Developer mode**, click on **Load unpacked**, and select the root folder where you extracted the ZIP. For Firefox, you must go to `about:config`, search for the `xpinstall.signatures.required` setting, and **change it from true to false**. To do this, you will need a version of Firefox such as **Developer Edition, Nightly, or ESR**.*


## Screenshots
<table border="0">
  <tr>
    <td align="center" valign="bottom">
      <img src="https://resources.fodsoft.com/images/ext/clickcontrol_screenshot_menu.png" width="326" alt="ClickControl menu"><br>
      <sub><b>Menu</b></sub>
    </td>
    <td align="center" valign="bottom">
      <img src="https://resources.fodsoft.com/images/ext/clickcontrol_screenshot_popup.png" width="326" alt="ClickControl Pop-up"><br>
      <sub><b>Pop-up</b></sub>
    </td>
  </tr>
</table>

<hr>

**ClickControl™ and all related titles and logos are property of FODSOFT™ and Néo Foderé de Frutos.**

**© 2026 FODSOFT™. Néo Foderé de Frutos. All rights reserved.**
