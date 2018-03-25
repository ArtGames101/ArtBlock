/*******************************************************************************

    µBlock - a Chromium browser extension to block requests.
    Copyright (C) 2014 Raymond Hill

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see {http://www.gnu.org/licenses/}.

    Home: https://github.com/gorhill/uBlock
*/

/* global chrome, µBlock */

/******************************************************************************/

(function(){
    // When the DOM content of root frame is loaded, this means the tab
    // content has changed.
    function onDOMContentLoaded(details) {
        if ( details.frameId !== 0 ) {
            return;
        }
        µBlock.updateBadgeAsync(details.tabId);
    }
    chrome.webNavigation.onDOMContentLoaded.addListener(onDOMContentLoaded);

    // It may happen the URL in the tab changes, while the page's document
    // stays the same (for instance, Google Maps). Without this listener,
    // the extension icon won't be properly refreshed.
    function onTabUpdated(tabId, changeInfo, tab) {
        if ( !tab.url || tab.url === '' ) {
            return;
        }
        if ( changeInfo.url && µBlock.pageStores[tabId] ) {
            µBlock.updateBadgeAsync(tabId);
        }
    }
    chrome.tabs.onUpdated.addListener(onTabUpdated);

    function onTabRemoved(tabId) {
        if ( tabId < 0 ) {
            return;
        }
        µBlock.unbindTabFromPageStats(tabId);
    }
    chrome.tabs.onRemoved.addListener(onTabRemoved);

    // Initialize internal state with maybe already existing tabs
    chrome.tabs.query({ url: '<all_urls>' }, function(tabs) {
        var i = tabs.length;
        while ( i-- ) {
            µBlock.bindTabToPageStats(tabs[i].id, tabs[i].url);
        }
    });
})();

/******************************************************************************/
/******************************************************************************/

// https://github.com/gorhill/httpswitchboard/issues/303
// Some kind of trick going on here:
//   Any scheme other than 'http' and 'https' is remapped into a fake
//   URL which trick the rest of µBlock into being able to process an
//   otherwise unmanageable scheme. µBlock needs web page to have a proper
//   hostname to work properly, so just like the 'chromium-behind-the-scene'
//   fake domain name, we map unknown schemes into a fake '{scheme}-scheme'
//   hostname. This way, for a specific scheme you can create scope with
//   rules which will apply only to that scheme.

µBlock.normalizePageURL = function(pageURL) {
    var uri = this.URI.set(pageURL);
    if ( uri.scheme === 'https' || uri.scheme === 'http' ) {
        return uri.normalizedURI();
    }
    return '';
};

/******************************************************************************/

// Create an entry for the tab if it doesn't exist.

µBlock.bindTabToPageStats = function(tabId, pageURL) {
    this.updateBadgeAsync(tabId);

    // First unbind whatever page store is bound to the tab id.
    this.unbindTabFromPageStats(tabId);

    // https://github.com/gorhill/httpswitchboard/issues/303
    // Normalize to a page-URL.
    pageURL = this.normalizePageURL(pageURL);

    // do not create stats store for urls which are of no interests
    if ( pageURL === '' ) {
        return null;
    }

    // Bring back existing page store or create new one.
    var pageStore = this.pageStores[tabId];
    if ( !pageStore ) {
        var k = pageURL + ' ' + tabId;
        pageStore = this.pageStoreDump[k];
        if ( pageStore ) {
            delete this.pageStoreDump[k];
        }
    }

    if ( !pageStore ) {
        pageStore = this.PageStore.factory(tabId, pageURL);
        pageStore.perLoadAllowedRequestCount =
        pageStore.perLoadBlockedRequestCount = 0;
    }

    //console.log('µBlock> bindTabToPageStats(%d, "%s")', tabId, pageURL);
    this.pageStores[tabId] = pageStore;

    return pageStore;
};

µBlock.unbindTabFromPageStats = function(tabId) {
    var pageStore = this.pageStores[tabId];
    if ( pageStore ) {
        //pageStore.disposeTime = Date.now();
        //this.pageStoreDump[pageStore.pageURL + ' ' + tabId] = pageStore;
        //console.log('µBlock> unbindTabFromPageStats(%d)', tabId);
    }
    delete this.pageStores[tabId];
};

/******************************************************************************/

µBlock.pageUrlFromTabId = function(tabId) {
    var pageStore = this.pageStores[tabId];
    return pageStore ? pageStore.pageURL : '';
};

µBlock.pageUrlFromPageStats = function(pageStats) {
    if ( pageStats ) {
        return pageStats.pageURL;
    }
    return '';
};

µBlock.pageStoreFromTabId = function(tabId) {
    return this.pageStores[tabId];
};

/******************************************************************************/

µBlock.forceReload = function(pageURL) {
    var tabId = this.tabIdFromPageUrl(pageURL);
    if ( tabId ) {
        chrome.tabs.reload(tabId, { bypassCache: true });
    }
};
