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

// ORDER IS IMPORTANT

/******************************************************************************/

// Load everything

µBlock.load();

/******************************************************************************/

// Automatic update of non-user assets
// https://github.com/gorhill/httpswitchboard/issues/334

(function() {
    var µb = µBlock;

    var jobDone = function(details) {
        if ( details.changedCount === 0 ) {
            return;
        }
        µb.loadUpdatableAssets();
    };

    var jobCallback = function() {
        µb.assetUpdater.update(null, jobDone);
    };

    µb.asyncJobs.add('autoUpdateAssets', null, jobCallback, µb.updateAssetsEvery, true);
})();

/******************************************************************************/
