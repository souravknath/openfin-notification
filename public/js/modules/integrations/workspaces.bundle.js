/******/ var __webpack_modules__ = ({

/***/ "./client/src/framework/uuid.ts":
/*!**************************************!*\
  !*** ./client/src/framework/uuid.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "randomUUID": () => (/* binding */ randomUUID)
/* harmony export */ });
function randomUUID() {
    if ("randomUUID" in window.crypto) {
        // eslint-disable-next-line no-restricted-syntax
        return window.crypto.randomUUID();
    }
    // Polyfill the window.crypto.randomUUID if we are running in a non secure context that doesn't have it
    // we are still using window.crypto.getRandomValues which is always available
    // https://stackoverflow.com/a/2117523/2800218
    const getRandomHex = (c) => 
    // eslint-disable-next-line no-bitwise, no-mixed-operators
    (c ^ (window.crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16);
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, getRandomHex);
}


/***/ }),

/***/ "./client/src/modules/integrations/workspaces/integration.ts":
/*!*******************************************************************!*\
  !*** ./client/src/modules/integrations/workspaces/integration.ts ***!
  \*******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "WorkspacesProvider": () => (/* binding */ WorkspacesProvider)
/* harmony export */ });
/* harmony import */ var _framework_uuid__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../framework/uuid */ "./client/src/framework/uuid.ts");

/**
 * Implement the integration provider for workspaces.
 */
class WorkspacesProvider {
    /**
     * Initialize the module.
     * @param definition The definition of the module from configuration include custom options.
     * @param loggerCreator For logging entries.
     * @param helpers Helper methods for the module to interact with the application core.
     * @returns Nothing.
     */
    async initialize(definition, loggerCreator, helpers) {
        this._settings = definition.data;
        this._integrationHelpers = helpers;
        this._logger = loggerCreator("WorkspacesProvider");
        this._integrationHelpers.subscribeLifecycleEvent("workspace-changed", async (platform, payload) => {
            if (payload.action === "create") {
                if (!this._lastQuery.startsWith("/w ")) {
                    await this.rebuildResults(platform);
                }
            }
            else if (payload.action === "update") {
                const lastResult = this._lastResults?.find((res) => res.key === payload.id);
                if (lastResult) {
                    lastResult.title = payload.workspace.title;
                    lastResult.data.workspaceTitle = payload.workspace.title;
                    lastResult.templateContent.data.title = payload.workspace.title;
                    this.resultAddUpdate([lastResult]);
                }
            }
            else if (payload.action === "delete") {
                this.resultRemove(payload.id);
            }
        });
        this._integrationHelpers.subscribeLifecycleEvent("theme-changed", async () => {
            const platform = this._integrationHelpers.getPlatform();
            await this.rebuildResults(platform);
        });
    }
    /**
     * Get a list of the static help entries.
     * @returns The list of help entries.
     */
    async getHelpSearchEntries() {
        const colorScheme = await this._integrationHelpers.getCurrentColorSchemeMode();
        return [
            {
                key: `${WorkspacesProvider._PROVIDER_ID}-help1`,
                title: "Workspaces",
                label: "Help",
                icon: this._settings.images.workspace.replace("{scheme}", colorScheme),
                actions: [],
                data: {
                    providerId: WorkspacesProvider._PROVIDER_ID
                },
                template: "Custom",
                templateContent: await this._integrationHelpers.templateHelpers.createHelp("Workspaces", ["Use the workspaces command to save your current layout."], ["/w title"])
            }
        ];
    }
    /**
     * Get a list of search results based on the query and filters.
     * @param query The query to search for.
     * @param filters The filters to apply.
     * @param lastResponse The last search response used for updating existing results.
     * @param options Options for the search query.
     * @returns The list of results and new filters.
     */
    async getSearchResults(query, filters, lastResponse, options) {
        const platform = this._integrationHelpers.getPlatform();
        const workspaces = await platform.Storage.getWorkspaces();
        const colorScheme = await this._integrationHelpers.getCurrentColorSchemeMode();
        const queryLower = query.toLowerCase();
        this._lastResponse = lastResponse;
        this._lastQuery = queryLower;
        this._lastQueryMinLength = options.queryMinLength;
        if (queryLower.startsWith("/w ")) {
            const title = queryLower.replace("/w ", "");
            const foundMatch = workspaces.find((entry) => entry.title.toLowerCase() === title.toLowerCase());
            if (foundMatch) {
                return {
                    results: [
                        {
                            key: WorkspacesProvider._ACTION_EXISTS_WORKSPACE,
                            title: `Workspace ${foundMatch.title} already exists.`,
                            icon: this._settings.images.workspace.replace("{scheme}", colorScheme),
                            actions: [],
                            data: {
                                providerId: WorkspacesProvider._PROVIDER_ID,
                                tags: ["workspace"],
                                workspaceId: foundMatch.workspaceId
                            },
                            template: null,
                            templateContent: null
                        }
                    ]
                };
            }
            return {
                results: [
                    {
                        key: WorkspacesProvider._ACTION_SAVE_WORKSPACE,
                        title: `Save Current Workspace as ${title}`,
                        icon: this._settings.images.workspace.replace("{scheme}", colorScheme),
                        label: "Suggestion",
                        actions: [{ name: "Save Workspace", hotkey: "Enter" }],
                        data: {
                            providerId: WorkspacesProvider._PROVIDER_ID,
                            tags: ["workspace"],
                            workspaceId: (0,_framework_uuid__WEBPACK_IMPORTED_MODULE_0__.randomUUID)(),
                            workspaceTitle: title
                        },
                        template: null,
                        templateContent: null
                    }
                ]
            };
        }
        const workspaceResults = await this.buildResults(platform, workspaces, queryLower, options.queryMinLength, colorScheme);
        this._lastResults = workspaceResults;
        return {
            results: workspaceResults
        };
    }
    /**
     * An entry has been selected.
     * @param result The dispatched result.
     * @param lastResponse The last response.
     * @returns True if the item was handled.
     */
    async itemSelection(result, lastResponse) {
        let handled = false;
        if (result.action.trigger === "user-action") {
            const data = result.data;
            if (data?.workspaceId) {
                handled = true;
                if (result.key === WorkspacesProvider._ACTION_SAVE_WORKSPACE) {
                    // Remove the save workspace entry
                    this.resultRemove(result.key);
                    const platform = this._integrationHelpers.getPlatform();
                    const snapshot = await platform.getSnapshot();
                    const currentWorkspace = await platform.getCurrentWorkspace();
                    const currentMetaData = currentWorkspace?.metadata;
                    const workspace = {
                        workspaceId: data.workspaceId,
                        title: data.workspaceTitle,
                        metadata: currentMetaData,
                        snapshot
                    };
                    await platform.Storage.saveWorkspace(workspace);
                    const shareEnabled = await this._integrationHelpers.condition("sharing");
                    const palette = await this._integrationHelpers.getCurrentPalette();
                    const colorScheme = await this._integrationHelpers.getCurrentColorSchemeMode();
                    const savedWorkspace = this.getWorkspaceTemplate(workspace.workspaceId, workspace.title, shareEnabled, true, colorScheme, palette);
                    // And add the new one
                    this.resultAddUpdate([savedWorkspace]);
                }
                else if (result.key === WorkspacesProvider._ACTION_EXISTS_WORKSPACE) {
                    // Do nothing, the user must update the query to give it a different
                    // name which will automatically refresh the results
                }
                else if (result.action.name === WorkspacesProvider._ACTION_OPEN_WORKSPACE) {
                    const platform = this._integrationHelpers.getPlatform();
                    const workspace = await platform.Storage.getWorkspace(data.workspaceId);
                    await platform.applyWorkspace(workspace);
                    // We rebuild the results here as we will now have a new current workspace
                    // and we need to change the existing one back to a standard template
                    await this.rebuildResults(platform);
                }
                else if (result.action.name === WorkspacesProvider._ACTION_DELETE_WORKSPACE) {
                    const platform = this._integrationHelpers.getPlatform();
                    await platform.Storage.deleteWorkspace(data.workspaceId);
                    // Deleting the working will eventually trigger the "delete" lifecycle
                    // event which will remove it from the result list
                }
                else if (result.action.name === WorkspacesProvider._ACTION_SHARE_WORKSPACE) {
                    await this._integrationHelpers.share({ workspaceId: data.workspaceId });
                }
                else {
                    handled = false;
                    this._logger.warn(`Unrecognized action for workspace selection: ${data.workspaceId}`);
                }
            }
        }
        return handled;
    }
    getWorkspaceTemplate(id, title, shareEnabled, isCurrent, colorScheme, palette) {
        let actions = [];
        let layout;
        let data;
        if (isCurrent) {
            layout = this.getOtherWorkspaceTemplate(shareEnabled, false, palette);
            data = {
                title,
                instructions: "This is the currently active workspace. You can use the Browser menu to update/rename this workspace",
                openText: "Open",
                shareText: "Share"
            };
            if (shareEnabled) {
                actions.push({
                    name: WorkspacesProvider._ACTION_SHARE_WORKSPACE,
                    hotkey: "CmdOrCtrl+Shift+S"
                });
            }
            actions = actions.concat([
                {
                    name: WorkspacesProvider._ACTION_OPEN_WORKSPACE,
                    hotkey: "Enter"
                }
            ]);
        }
        else {
            if (shareEnabled) {
                actions.push({
                    name: WorkspacesProvider._ACTION_SHARE_WORKSPACE,
                    hotkey: "CmdOrCtrl+Shift+S"
                });
            }
            actions = actions.concat([
                {
                    name: WorkspacesProvider._ACTION_DELETE_WORKSPACE,
                    hotkey: "CmdOrCtrl+Shift+D"
                },
                {
                    name: WorkspacesProvider._ACTION_OPEN_WORKSPACE,
                    hotkey: "Enter"
                }
            ]);
            layout = this.getOtherWorkspaceTemplate(shareEnabled, true, palette);
            data = {
                title,
                instructions: "Use the buttons below to interact with your saved workspace",
                openText: "Open",
                deleteText: "Delete",
                shareText: "Share"
            };
        }
        return {
            key: id,
            title,
            label: "Workspace",
            icon: this._settings.images.workspace.replace("{scheme}", colorScheme),
            actions,
            data: {
                providerId: WorkspacesProvider._PROVIDER_ID,
                workspaceTitle: title,
                workspaceId: id,
                tags: ["workspace"]
            },
            template: "Custom",
            templateContent: {
                layout,
                data
            }
        };
    }
    getOtherWorkspaceTemplate(enableShare, enableDelete, palette) {
        const actionButtons = [
            {
                type: "Button",
                action: WorkspacesProvider._ACTION_OPEN_WORKSPACE,
                children: [
                    {
                        type: "Text",
                        dataKey: "openText"
                    }
                ]
            }
        ];
        if (enableDelete) {
            actionButtons.push({
                type: "Button",
                buttonStyle: "primary",
                action: WorkspacesProvider._ACTION_DELETE_WORKSPACE,
                children: [
                    {
                        type: "Text",
                        dataKey: "deleteText"
                    }
                ]
            });
        }
        if (enableShare) {
            actionButtons.push({
                type: "Button",
                buttonStyle: "primary",
                action: WorkspacesProvider._ACTION_SHARE_WORKSPACE,
                children: [
                    {
                        type: "Text",
                        dataKey: "shareText"
                    }
                ]
            });
        }
        return {
            type: "Container",
            style: {
                padding: "10px",
                display: "flex",
                flexDirection: "column",
                flex: 1
            },
            children: [
                {
                    type: "Text",
                    dataKey: "title",
                    style: {
                        fontWeight: "bold",
                        fontSize: "16px",
                        paddingBottom: "5px",
                        marginBottom: "10px",
                        borderBottom: `1px solid ${palette.background6}`
                    }
                },
                {
                    type: "Text",
                    dataKey: "instructions",
                    style: {
                        flex: 1
                    }
                },
                {
                    type: "Container",
                    style: {
                        display: "flex",
                        justifyContent: "center",
                        gap: "10px"
                    },
                    children: actionButtons
                }
            ]
        };
    }
    async rebuildResults(platform) {
        const colorScheme = await this._integrationHelpers.getCurrentColorSchemeMode();
        const workspaces = await platform.Storage.getWorkspaces();
        const results = await this.buildResults(platform, workspaces, this._lastQuery, this._lastQueryMinLength, colorScheme);
        this.resultAddUpdate(results);
    }
    async buildResults(platform, workspaces, query, queryMinLength, colorScheme) {
        let results = [];
        if (Array.isArray(workspaces)) {
            const currentWorkspace = await platform.getCurrentWorkspace();
            const currentWorkspaceId = currentWorkspace?.workspaceId;
            const shareEnabled = await this._integrationHelpers.condition("sharing");
            const palette = await this._integrationHelpers.getCurrentPalette();
            results = workspaces
                .filter((pg) => query.length === 0 || (query.length >= queryMinLength && pg.title.toLowerCase().includes(query)))
                .map((ws, index) => this.getWorkspaceTemplate(ws.workspaceId, ws.title, shareEnabled, currentWorkspaceId === ws.workspaceId, colorScheme, palette))
                .sort((a, b) => a.title.localeCompare(b.title));
        }
        return results;
    }
    resultAddUpdate(results) {
        if (this._lastResults) {
            for (const result of results) {
                const resultIndex = this._lastResults.findIndex((res) => res.key === result.key);
                if (resultIndex >= 0) {
                    this._lastResults.splice(resultIndex, 1, result);
                }
                else {
                    this._lastResults.push(result);
                }
            }
        }
        if (this._lastResponse) {
            this._lastResponse.respond(results);
        }
    }
    resultRemove(id) {
        if (this._lastResults) {
            const resultIndex = this._lastResults.findIndex((res) => res.key === id);
            if (resultIndex >= 0) {
                this._lastResults.splice(resultIndex, 1);
            }
        }
        if (this._lastResponse) {
            this._lastResponse.revoke(id);
        }
    }
}
/**
 * Provider id.
 * @internal
 */
WorkspacesProvider._PROVIDER_ID = "workspaces";
/**
 * The key to use for opening a workspace.
 * @internal
 */
WorkspacesProvider._ACTION_OPEN_WORKSPACE = "Open Workspace";
/**
 * The key to use for deleting a workspace.
 * @internal
 */
WorkspacesProvider._ACTION_DELETE_WORKSPACE = "Delete Workspace";
/**
 * The key to use for sharing a workspace.
 * @internal
 */
WorkspacesProvider._ACTION_SHARE_WORKSPACE = "Share Workspace";
/**
 * The key to use for saving a workspace.
 * @internal
 */
WorkspacesProvider._ACTION_SAVE_WORKSPACE = "Save Workspace";
/**
 * The key to use for a workspace exists.
 * @internal
 */
WorkspacesProvider._ACTION_EXISTS_WORKSPACE = "Workspace Exists";


/***/ })

/******/ });
/************************************************************************/
/******/ // The module cache
/******/ var __webpack_module_cache__ = {};
/******/ 
/******/ // The require function
/******/ function __webpack_require__(moduleId) {
/******/ 	// Check if module is in cache
/******/ 	var cachedModule = __webpack_module_cache__[moduleId];
/******/ 	if (cachedModule !== undefined) {
/******/ 		return cachedModule.exports;
/******/ 	}
/******/ 	// Create a new module (and put it into the cache)
/******/ 	var module = __webpack_module_cache__[moduleId] = {
/******/ 		// no module.id needed
/******/ 		// no module.loaded needed
/******/ 		exports: {}
/******/ 	};
/******/ 
/******/ 	// Execute the module function
/******/ 	__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 
/******/ 	// Return the exports of the module
/******/ 	return module.exports;
/******/ }
/******/ 
/************************************************************************/
/******/ /* webpack/runtime/define property getters */
/******/ (() => {
/******/ 	// define getter functions for harmony exports
/******/ 	__webpack_require__.d = (exports, definition) => {
/******/ 		for(var key in definition) {
/******/ 			if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 				Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 			}
/******/ 		}
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/hasOwnProperty shorthand */
/******/ (() => {
/******/ 	__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ })();
/******/ 
/******/ /* webpack/runtime/make namespace object */
/******/ (() => {
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = (exports) => {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/ })();
/******/ 
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!*************************************************************!*\
  !*** ./client/src/modules/integrations/workspaces/index.ts ***!
  \*************************************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "entryPoints": () => (/* binding */ entryPoints)
/* harmony export */ });
/* harmony import */ var _integration__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./integration */ "./client/src/modules/integrations/workspaces/integration.ts");

const entryPoints = {
    integrations: new _integration__WEBPACK_IMPORTED_MODULE_0__.WorkspacesProvider()
};

})();

var __webpack_exports__entryPoints = __webpack_exports__.entryPoints;
export { __webpack_exports__entryPoints as entryPoints };

//# sourceMappingURL=data:application/json;charset=utf-8;base64,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RCxhQUFhO1VBQzdEOzs7Ozs7Ozs7Ozs7Ozs7QUNObUQ7QUFFNUMsTUFBTSxXQUFXLEdBQXlDO0lBQ2hFLFlBQVksRUFBRSxJQUFJLDREQUFrQixFQUFFO0NBQ3RDLENBQUMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9vcGVuZmluLXdvcmtzcGFjZS0tY3VzdG9taXplLXdvcmtzcGFjZS8uL2NsaWVudC9zcmMvZnJhbWV3b3JrL3V1aWQudHMiLCJ3ZWJwYWNrOi8vb3BlbmZpbi13b3Jrc3BhY2UtLWN1c3RvbWl6ZS13b3Jrc3BhY2UvLi9jbGllbnQvc3JjL21vZHVsZXMvaW50ZWdyYXRpb25zL3dvcmtzcGFjZXMvaW50ZWdyYXRpb24udHMiLCJ3ZWJwYWNrOi8vb3BlbmZpbi13b3Jrc3BhY2UtLWN1c3RvbWl6ZS13b3Jrc3BhY2Uvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vb3BlbmZpbi13b3Jrc3BhY2UtLWN1c3RvbWl6ZS13b3Jrc3BhY2Uvd2VicGFjay9ydW50aW1lL2RlZmluZSBwcm9wZXJ0eSBnZXR0ZXJzIiwid2VicGFjazovL29wZW5maW4td29ya3NwYWNlLS1jdXN0b21pemUtd29ya3NwYWNlL3dlYnBhY2svcnVudGltZS9oYXNPd25Qcm9wZXJ0eSBzaG9ydGhhbmQiLCJ3ZWJwYWNrOi8vb3BlbmZpbi13b3Jrc3BhY2UtLWN1c3RvbWl6ZS13b3Jrc3BhY2Uvd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly9vcGVuZmluLXdvcmtzcGFjZS0tY3VzdG9taXplLXdvcmtzcGFjZS8uL2NsaWVudC9zcmMvbW9kdWxlcy9pbnRlZ3JhdGlvbnMvd29ya3NwYWNlcy9pbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgZnVuY3Rpb24gcmFuZG9tVVVJRCgpOiBzdHJpbmcge1xyXG5cdGlmIChcInJhbmRvbVVVSURcIiBpbiB3aW5kb3cuY3J5cHRvKSB7XHJcblx0XHQvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tcmVzdHJpY3RlZC1zeW50YXhcclxuXHRcdHJldHVybiB3aW5kb3cuY3J5cHRvLnJhbmRvbVVVSUQoKTtcclxuXHR9XHJcblx0Ly8gUG9seWZpbGwgdGhlIHdpbmRvdy5jcnlwdG8ucmFuZG9tVVVJRCBpZiB3ZSBhcmUgcnVubmluZyBpbiBhIG5vbiBzZWN1cmUgY29udGV4dCB0aGF0IGRvZXNuJ3QgaGF2ZSBpdFxyXG5cdC8vIHdlIGFyZSBzdGlsbCB1c2luZyB3aW5kb3cuY3J5cHRvLmdldFJhbmRvbVZhbHVlcyB3aGljaCBpcyBhbHdheXMgYXZhaWxhYmxlXHJcblx0Ly8gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9hLzIxMTc1MjMvMjgwMDIxOFxyXG5cdGNvbnN0IGdldFJhbmRvbUhleCA9IChjKSA9PlxyXG5cdFx0Ly8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWJpdHdpc2UsIG5vLW1peGVkLW9wZXJhdG9yc1xyXG5cdFx0KGMgXiAod2luZG93LmNyeXB0by5nZXRSYW5kb21WYWx1ZXMobmV3IFVpbnQ4QXJyYXkoMSkpWzBdICYgKDE1ID4+IChjIC8gNCkpKSkudG9TdHJpbmcoMTYpO1xyXG5cdHJldHVybiBcIjEwMDAwMDAwLTEwMDAtNDAwMC04MDAwLTEwMDAwMDAwMDAwMFwiLnJlcGxhY2UoL1swMThdL2csIGdldFJhbmRvbUhleCk7XHJcbn1cclxuIiwiaW1wb3J0IHR5cGUge1xyXG5cdEJ1dHRvblN0eWxlLFxyXG5cdENMSUZpbHRlcixcclxuXHRDTElUZW1wbGF0ZSxcclxuXHRDdXN0b21UZW1wbGF0ZSxcclxuXHRIb21lRGlzcGF0Y2hlZFNlYXJjaFJlc3VsdCxcclxuXHRIb21lU2VhcmNoTGlzdGVuZXJSZXNwb25zZSxcclxuXHRIb21lU2VhcmNoUmVzcG9uc2UsXHJcblx0SG9tZVNlYXJjaFJlc3VsdCxcclxuXHRUZW1wbGF0ZUZyYWdtZW50XHJcbn0gZnJvbSBcIkBvcGVuZmluL3dvcmtzcGFjZVwiO1xyXG5pbXBvcnQgdHlwZSB7IEN1c3RvbVBhbGV0dGVTZXQsIFdvcmtzcGFjZSwgV29ya3NwYWNlUGxhdGZvcm1Nb2R1bGUgfSBmcm9tIFwiQG9wZW5maW4vd29ya3NwYWNlLXBsYXRmb3JtXCI7XHJcbmltcG9ydCB0eXBlIHsgV29ya3NwYWNlQ2hhbmdlZExpZmVjeWNsZVBheWxvYWQgfSBmcm9tIFwiY3VzdG9taXplLXdvcmtzcGFjZS9zaGFwZXNcIjtcclxuaW1wb3J0IHR5cGUgeyBJbnRlZ3JhdGlvbkhlbHBlcnMsIEludGVncmF0aW9uTW9kdWxlIH0gZnJvbSBcImN1c3RvbWl6ZS13b3Jrc3BhY2Uvc2hhcGVzL2ludGVncmF0aW9ucy1zaGFwZXNcIjtcclxuaW1wb3J0IHR5cGUgeyBMb2dnZXIsIExvZ2dlckNyZWF0b3IgfSBmcm9tIFwiY3VzdG9taXplLXdvcmtzcGFjZS9zaGFwZXMvbG9nZ2VyLXNoYXBlc1wiO1xyXG5pbXBvcnQgdHlwZSB7IE1vZHVsZURlZmluaXRpb24gfSBmcm9tIFwiY3VzdG9taXplLXdvcmtzcGFjZS9zaGFwZXMvbW9kdWxlLXNoYXBlc1wiO1xyXG5pbXBvcnQgdHlwZSB7IENvbG9yU2NoZW1lTW9kZSB9IGZyb20gXCJjdXN0b21pemUtd29ya3NwYWNlL3NoYXBlcy90aGVtZS1zaGFwZXNcIjtcclxuaW1wb3J0IHsgcmFuZG9tVVVJRCB9IGZyb20gXCIuLi8uLi8uLi9mcmFtZXdvcmsvdXVpZFwiO1xyXG5pbXBvcnQgdHlwZSB7IFdvcmtzcGFjZXNTZXR0aW5ncyB9IGZyb20gXCIuL3NoYXBlc1wiO1xyXG5cclxuLyoqXHJcbiAqIEltcGxlbWVudCB0aGUgaW50ZWdyYXRpb24gcHJvdmlkZXIgZm9yIHdvcmtzcGFjZXMuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgV29ya3NwYWNlc1Byb3ZpZGVyIGltcGxlbWVudHMgSW50ZWdyYXRpb25Nb2R1bGU8V29ya3NwYWNlc1NldHRpbmdzPiB7XHJcblx0LyoqXHJcblx0ICogUHJvdmlkZXIgaWQuXHJcblx0ICogQGludGVybmFsXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgX1BST1ZJREVSX0lEID0gXCJ3b3Jrc3BhY2VzXCI7XHJcblxyXG5cdC8qKlxyXG5cdCAqIFRoZSBrZXkgdG8gdXNlIGZvciBvcGVuaW5nIGEgd29ya3NwYWNlLlxyXG5cdCAqIEBpbnRlcm5hbFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IF9BQ1RJT05fT1BFTl9XT1JLU1BBQ0UgPSBcIk9wZW4gV29ya3NwYWNlXCI7XHJcblxyXG5cdC8qKlxyXG5cdCAqIFRoZSBrZXkgdG8gdXNlIGZvciBkZWxldGluZyBhIHdvcmtzcGFjZS5cclxuXHQgKiBAaW50ZXJuYWxcclxuXHQgKi9cclxuXHRwcml2YXRlIHN0YXRpYyByZWFkb25seSBfQUNUSU9OX0RFTEVURV9XT1JLU1BBQ0UgPSBcIkRlbGV0ZSBXb3Jrc3BhY2VcIjtcclxuXHJcblx0LyoqXHJcblx0ICogVGhlIGtleSB0byB1c2UgZm9yIHNoYXJpbmcgYSB3b3Jrc3BhY2UuXHJcblx0ICogQGludGVybmFsXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgX0FDVElPTl9TSEFSRV9XT1JLU1BBQ0UgPSBcIlNoYXJlIFdvcmtzcGFjZVwiO1xyXG5cclxuXHQvKipcclxuXHQgKiBUaGUga2V5IHRvIHVzZSBmb3Igc2F2aW5nIGEgd29ya3NwYWNlLlxyXG5cdCAqIEBpbnRlcm5hbFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IF9BQ1RJT05fU0FWRV9XT1JLU1BBQ0UgPSBcIlNhdmUgV29ya3NwYWNlXCI7XHJcblxyXG5cdC8qKlxyXG5cdCAqIFRoZSBrZXkgdG8gdXNlIGZvciBhIHdvcmtzcGFjZSBleGlzdHMuXHJcblx0ICogQGludGVybmFsXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgX0FDVElPTl9FWElTVFNfV09SS1NQQUNFID0gXCJXb3Jrc3BhY2UgRXhpc3RzXCI7XHJcblxyXG5cdC8qKlxyXG5cdCAqIFRoZSBzZXR0aW5ncyBmcm9tIGNvbmZpZy5cclxuXHQgKi9cclxuXHRwcml2YXRlIF9zZXR0aW5nczogV29ya3NwYWNlc1NldHRpbmdzO1xyXG5cclxuXHQvKipcclxuXHQgKiBUaGUgc2V0dGluZ3MgZm9yIHRoZSBpbnRlZ3JhdGlvbi5cclxuXHQgKiBAaW50ZXJuYWxcclxuXHQgKi9cclxuXHRwcml2YXRlIF9sb2dnZXI6IExvZ2dlcjtcclxuXHJcblx0LyoqXHJcblx0ICogVGhlIGludGVncmF0aW9uIGhlbHBlcnMuXHJcblx0ICogQGludGVybmFsXHJcblx0ICovXHJcblx0cHJpdmF0ZSBfaW50ZWdyYXRpb25IZWxwZXJzOiBJbnRlZ3JhdGlvbkhlbHBlcnMgfCB1bmRlZmluZWQ7XHJcblxyXG5cdC8qKlxyXG5cdCAqIFRoZSBsYXN0IHNlYXJjaCByZXNwb25zZS5cclxuXHQgKi9cclxuXHRwcml2YXRlIF9sYXN0UmVzcG9uc2U/OiBIb21lU2VhcmNoTGlzdGVuZXJSZXNwb25zZTtcclxuXHJcblx0LyoqXHJcblx0ICogVGhlIGxhc3QgcXVlcnkuXHJcblx0ICovXHJcblx0cHJpdmF0ZSBfbGFzdFF1ZXJ5Pzogc3RyaW5nO1xyXG5cclxuXHQvKipcclxuXHQgKiBUaGUgbGFzdCBxdWVyeSBtaW4gbGVuZ3RoLlxyXG5cdCAqL1xyXG5cdHByaXZhdGUgX2xhc3RRdWVyeU1pbkxlbmd0aD86IG51bWJlcjtcclxuXHJcblx0LyoqXHJcblx0ICogVGhlIGxhc3QgcmVzdWx0cy5cclxuXHQgKi9cclxuXHRwcml2YXRlIF9sYXN0UmVzdWx0cz86IEhvbWVTZWFyY2hSZXN1bHRbXTtcclxuXHJcblx0LyoqXHJcblx0ICogSW5pdGlhbGl6ZSB0aGUgbW9kdWxlLlxyXG5cdCAqIEBwYXJhbSBkZWZpbml0aW9uIFRoZSBkZWZpbml0aW9uIG9mIHRoZSBtb2R1bGUgZnJvbSBjb25maWd1cmF0aW9uIGluY2x1ZGUgY3VzdG9tIG9wdGlvbnMuXHJcblx0ICogQHBhcmFtIGxvZ2dlckNyZWF0b3IgRm9yIGxvZ2dpbmcgZW50cmllcy5cclxuXHQgKiBAcGFyYW0gaGVscGVycyBIZWxwZXIgbWV0aG9kcyBmb3IgdGhlIG1vZHVsZSB0byBpbnRlcmFjdCB3aXRoIHRoZSBhcHBsaWNhdGlvbiBjb3JlLlxyXG5cdCAqIEByZXR1cm5zIE5vdGhpbmcuXHJcblx0ICovXHJcblx0cHVibGljIGFzeW5jIGluaXRpYWxpemUoXHJcblx0XHRkZWZpbml0aW9uOiBNb2R1bGVEZWZpbml0aW9uPFdvcmtzcGFjZXNTZXR0aW5ncz4sXHJcblx0XHRsb2dnZXJDcmVhdG9yOiBMb2dnZXJDcmVhdG9yLFxyXG5cdFx0aGVscGVyczogSW50ZWdyYXRpb25IZWxwZXJzXHJcblx0KTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHR0aGlzLl9zZXR0aW5ncyA9IGRlZmluaXRpb24uZGF0YTtcclxuXHRcdHRoaXMuX2ludGVncmF0aW9uSGVscGVycyA9IGhlbHBlcnM7XHJcblx0XHR0aGlzLl9sb2dnZXIgPSBsb2dnZXJDcmVhdG9yKFwiV29ya3NwYWNlc1Byb3ZpZGVyXCIpO1xyXG5cclxuXHRcdHRoaXMuX2ludGVncmF0aW9uSGVscGVycy5zdWJzY3JpYmVMaWZlY3ljbGVFdmVudChcclxuXHRcdFx0XCJ3b3Jrc3BhY2UtY2hhbmdlZFwiLFxyXG5cdFx0XHRhc3luYyAocGxhdGZvcm06IFdvcmtzcGFjZVBsYXRmb3JtTW9kdWxlLCBwYXlsb2FkOiBXb3Jrc3BhY2VDaGFuZ2VkTGlmZWN5Y2xlUGF5bG9hZCkgPT4ge1xyXG5cdFx0XHRcdGlmIChwYXlsb2FkLmFjdGlvbiA9PT0gXCJjcmVhdGVcIikge1xyXG5cdFx0XHRcdFx0aWYgKCF0aGlzLl9sYXN0UXVlcnkuc3RhcnRzV2l0aChcIi93IFwiKSkge1xyXG5cdFx0XHRcdFx0XHRhd2FpdCB0aGlzLnJlYnVpbGRSZXN1bHRzKHBsYXRmb3JtKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9IGVsc2UgaWYgKHBheWxvYWQuYWN0aW9uID09PSBcInVwZGF0ZVwiKSB7XHJcblx0XHRcdFx0XHRjb25zdCBsYXN0UmVzdWx0ID0gdGhpcy5fbGFzdFJlc3VsdHM/LmZpbmQoKHJlcykgPT4gcmVzLmtleSA9PT0gcGF5bG9hZC5pZCk7XHJcblx0XHRcdFx0XHRpZiAobGFzdFJlc3VsdCkge1xyXG5cdFx0XHRcdFx0XHRsYXN0UmVzdWx0LnRpdGxlID0gcGF5bG9hZC53b3Jrc3BhY2UudGl0bGU7XHJcblx0XHRcdFx0XHRcdGxhc3RSZXN1bHQuZGF0YS53b3Jrc3BhY2VUaXRsZSA9IHBheWxvYWQud29ya3NwYWNlLnRpdGxlO1xyXG5cdFx0XHRcdFx0XHQobGFzdFJlc3VsdC50ZW1wbGF0ZUNvbnRlbnQgYXMgQ3VzdG9tVGVtcGxhdGUpLmRhdGEudGl0bGUgPSBwYXlsb2FkLndvcmtzcGFjZS50aXRsZTtcclxuXHRcdFx0XHRcdFx0dGhpcy5yZXN1bHRBZGRVcGRhdGUoW2xhc3RSZXN1bHRdKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9IGVsc2UgaWYgKHBheWxvYWQuYWN0aW9uID09PSBcImRlbGV0ZVwiKSB7XHJcblx0XHRcdFx0XHR0aGlzLnJlc3VsdFJlbW92ZShwYXlsb2FkLmlkIGFzIHN0cmluZyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cdFx0dGhpcy5faW50ZWdyYXRpb25IZWxwZXJzLnN1YnNjcmliZUxpZmVjeWNsZUV2ZW50KFwidGhlbWUtY2hhbmdlZFwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHBsYXRmb3JtOiBXb3Jrc3BhY2VQbGF0Zm9ybU1vZHVsZSA9IHRoaXMuX2ludGVncmF0aW9uSGVscGVycy5nZXRQbGF0Zm9ybSgpO1xyXG5cdFx0XHRhd2FpdCB0aGlzLnJlYnVpbGRSZXN1bHRzKHBsYXRmb3JtKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGEgbGlzdCBvZiB0aGUgc3RhdGljIGhlbHAgZW50cmllcy5cclxuXHQgKiBAcmV0dXJucyBUaGUgbGlzdCBvZiBoZWxwIGVudHJpZXMuXHJcblx0ICovXHJcblx0cHVibGljIGFzeW5jIGdldEhlbHBTZWFyY2hFbnRyaWVzKCk6IFByb21pc2U8SG9tZVNlYXJjaFJlc3VsdFtdPiB7XHJcblx0XHRjb25zdCBjb2xvclNjaGVtZSA9IGF3YWl0IHRoaXMuX2ludGVncmF0aW9uSGVscGVycy5nZXRDdXJyZW50Q29sb3JTY2hlbWVNb2RlKCk7XHJcblxyXG5cdFx0cmV0dXJuIFtcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGtleTogYCR7V29ya3NwYWNlc1Byb3ZpZGVyLl9QUk9WSURFUl9JRH0taGVscDFgLFxyXG5cdFx0XHRcdHRpdGxlOiBcIldvcmtzcGFjZXNcIixcclxuXHRcdFx0XHRsYWJlbDogXCJIZWxwXCIsXHJcblx0XHRcdFx0aWNvbjogdGhpcy5fc2V0dGluZ3MuaW1hZ2VzLndvcmtzcGFjZS5yZXBsYWNlKFwie3NjaGVtZX1cIiwgY29sb3JTY2hlbWUgYXMgc3RyaW5nKSxcclxuXHRcdFx0XHRhY3Rpb25zOiBbXSxcclxuXHRcdFx0XHRkYXRhOiB7XHJcblx0XHRcdFx0XHRwcm92aWRlcklkOiBXb3Jrc3BhY2VzUHJvdmlkZXIuX1BST1ZJREVSX0lEXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR0ZW1wbGF0ZTogXCJDdXN0b21cIiBhcyBDTElUZW1wbGF0ZS5DdXN0b20sXHJcblx0XHRcdFx0dGVtcGxhdGVDb250ZW50OiBhd2FpdCB0aGlzLl9pbnRlZ3JhdGlvbkhlbHBlcnMudGVtcGxhdGVIZWxwZXJzLmNyZWF0ZUhlbHAoXHJcblx0XHRcdFx0XHRcIldvcmtzcGFjZXNcIixcclxuXHRcdFx0XHRcdFtcIlVzZSB0aGUgd29ya3NwYWNlcyBjb21tYW5kIHRvIHNhdmUgeW91ciBjdXJyZW50IGxheW91dC5cIl0sXHJcblx0XHRcdFx0XHRbXCIvdyB0aXRsZVwiXVxyXG5cdFx0XHRcdClcclxuXHRcdFx0fVxyXG5cdFx0XTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBhIGxpc3Qgb2Ygc2VhcmNoIHJlc3VsdHMgYmFzZWQgb24gdGhlIHF1ZXJ5IGFuZCBmaWx0ZXJzLlxyXG5cdCAqIEBwYXJhbSBxdWVyeSBUaGUgcXVlcnkgdG8gc2VhcmNoIGZvci5cclxuXHQgKiBAcGFyYW0gZmlsdGVycyBUaGUgZmlsdGVycyB0byBhcHBseS5cclxuXHQgKiBAcGFyYW0gbGFzdFJlc3BvbnNlIFRoZSBsYXN0IHNlYXJjaCByZXNwb25zZSB1c2VkIGZvciB1cGRhdGluZyBleGlzdGluZyByZXN1bHRzLlxyXG5cdCAqIEBwYXJhbSBvcHRpb25zIE9wdGlvbnMgZm9yIHRoZSBzZWFyY2ggcXVlcnkuXHJcblx0ICogQHJldHVybnMgVGhlIGxpc3Qgb2YgcmVzdWx0cyBhbmQgbmV3IGZpbHRlcnMuXHJcblx0ICovXHJcblx0cHVibGljIGFzeW5jIGdldFNlYXJjaFJlc3VsdHMoXHJcblx0XHRxdWVyeTogc3RyaW5nLFxyXG5cdFx0ZmlsdGVyczogQ0xJRmlsdGVyW10sXHJcblx0XHRsYXN0UmVzcG9uc2U6IEhvbWVTZWFyY2hMaXN0ZW5lclJlc3BvbnNlLFxyXG5cdFx0b3B0aW9uczoge1xyXG5cdFx0XHRxdWVyeU1pbkxlbmd0aDogbnVtYmVyO1xyXG5cdFx0XHRxdWVyeUFnYWluc3Q6IHN0cmluZ1tdO1xyXG5cdFx0fVxyXG5cdCk6IFByb21pc2U8SG9tZVNlYXJjaFJlc3BvbnNlPiB7XHJcblx0XHRjb25zdCBwbGF0Zm9ybTogV29ya3NwYWNlUGxhdGZvcm1Nb2R1bGUgPSB0aGlzLl9pbnRlZ3JhdGlvbkhlbHBlcnMuZ2V0UGxhdGZvcm0oKTtcclxuXHRcdGNvbnN0IHdvcmtzcGFjZXM6IFdvcmtzcGFjZVtdID0gYXdhaXQgcGxhdGZvcm0uU3RvcmFnZS5nZXRXb3Jrc3BhY2VzKCk7XHJcblx0XHRjb25zdCBjb2xvclNjaGVtZSA9IGF3YWl0IHRoaXMuX2ludGVncmF0aW9uSGVscGVycy5nZXRDdXJyZW50Q29sb3JTY2hlbWVNb2RlKCk7XHJcblxyXG5cdFx0Y29uc3QgcXVlcnlMb3dlciA9IHF1ZXJ5LnRvTG93ZXJDYXNlKCk7XHJcblxyXG5cdFx0dGhpcy5fbGFzdFJlc3BvbnNlID0gbGFzdFJlc3BvbnNlO1xyXG5cdFx0dGhpcy5fbGFzdFF1ZXJ5ID0gcXVlcnlMb3dlcjtcclxuXHRcdHRoaXMuX2xhc3RRdWVyeU1pbkxlbmd0aCA9IG9wdGlvbnMucXVlcnlNaW5MZW5ndGg7XHJcblxyXG5cdFx0aWYgKHF1ZXJ5TG93ZXIuc3RhcnRzV2l0aChcIi93IFwiKSkge1xyXG5cdFx0XHRjb25zdCB0aXRsZSA9IHF1ZXJ5TG93ZXIucmVwbGFjZShcIi93IFwiLCBcIlwiKTtcclxuXHJcblx0XHRcdGNvbnN0IGZvdW5kTWF0Y2ggPSB3b3Jrc3BhY2VzLmZpbmQoKGVudHJ5KSA9PiBlbnRyeS50aXRsZS50b0xvd2VyQ2FzZSgpID09PSB0aXRsZS50b0xvd2VyQ2FzZSgpKTtcclxuXHRcdFx0aWYgKGZvdW5kTWF0Y2gpIHtcclxuXHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0cmVzdWx0czogW1xyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0a2V5OiBXb3Jrc3BhY2VzUHJvdmlkZXIuX0FDVElPTl9FWElTVFNfV09SS1NQQUNFLFxyXG5cdFx0XHRcdFx0XHRcdHRpdGxlOiBgV29ya3NwYWNlICR7Zm91bmRNYXRjaC50aXRsZX0gYWxyZWFkeSBleGlzdHMuYCxcclxuXHRcdFx0XHRcdFx0XHRpY29uOiB0aGlzLl9zZXR0aW5ncy5pbWFnZXMud29ya3NwYWNlLnJlcGxhY2UoXCJ7c2NoZW1lfVwiLCBjb2xvclNjaGVtZSBhcyBzdHJpbmcpLFxyXG5cdFx0XHRcdFx0XHRcdGFjdGlvbnM6IFtdLFxyXG5cdFx0XHRcdFx0XHRcdGRhdGE6IHtcclxuXHRcdFx0XHRcdFx0XHRcdHByb3ZpZGVySWQ6IFdvcmtzcGFjZXNQcm92aWRlci5fUFJPVklERVJfSUQsXHJcblx0XHRcdFx0XHRcdFx0XHR0YWdzOiBbXCJ3b3Jrc3BhY2VcIl0sXHJcblx0XHRcdFx0XHRcdFx0XHR3b3Jrc3BhY2VJZDogZm91bmRNYXRjaC53b3Jrc3BhY2VJZFxyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdFx0dGVtcGxhdGU6IG51bGwsXHJcblx0XHRcdFx0XHRcdFx0dGVtcGxhdGVDb250ZW50OiBudWxsXHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdF1cclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0cmVzdWx0czogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRrZXk6IFdvcmtzcGFjZXNQcm92aWRlci5fQUNUSU9OX1NBVkVfV09SS1NQQUNFLFxyXG5cdFx0XHRcdFx0XHR0aXRsZTogYFNhdmUgQ3VycmVudCBXb3Jrc3BhY2UgYXMgJHt0aXRsZX1gLFxyXG5cdFx0XHRcdFx0XHRpY29uOiB0aGlzLl9zZXR0aW5ncy5pbWFnZXMud29ya3NwYWNlLnJlcGxhY2UoXCJ7c2NoZW1lfVwiLCBjb2xvclNjaGVtZSBhcyBzdHJpbmcpLFxyXG5cdFx0XHRcdFx0XHRsYWJlbDogXCJTdWdnZXN0aW9uXCIsXHJcblx0XHRcdFx0XHRcdGFjdGlvbnM6IFt7IG5hbWU6IFwiU2F2ZSBXb3Jrc3BhY2VcIiwgaG90a2V5OiBcIkVudGVyXCIgfV0sXHJcblx0XHRcdFx0XHRcdGRhdGE6IHtcclxuXHRcdFx0XHRcdFx0XHRwcm92aWRlcklkOiBXb3Jrc3BhY2VzUHJvdmlkZXIuX1BST1ZJREVSX0lELFxyXG5cdFx0XHRcdFx0XHRcdHRhZ3M6IFtcIndvcmtzcGFjZVwiXSxcclxuXHRcdFx0XHRcdFx0XHR3b3Jrc3BhY2VJZDogcmFuZG9tVVVJRCgpLFxyXG5cdFx0XHRcdFx0XHRcdHdvcmtzcGFjZVRpdGxlOiB0aXRsZVxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHR0ZW1wbGF0ZTogbnVsbCxcclxuXHRcdFx0XHRcdFx0dGVtcGxhdGVDb250ZW50OiBudWxsXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XVxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHdvcmtzcGFjZVJlc3VsdHM6IEhvbWVTZWFyY2hSZXN1bHRbXSA9IGF3YWl0IHRoaXMuYnVpbGRSZXN1bHRzKFxyXG5cdFx0XHRwbGF0Zm9ybSxcclxuXHRcdFx0d29ya3NwYWNlcyxcclxuXHRcdFx0cXVlcnlMb3dlcixcclxuXHRcdFx0b3B0aW9ucy5xdWVyeU1pbkxlbmd0aCxcclxuXHRcdFx0Y29sb3JTY2hlbWVcclxuXHRcdCk7XHJcblxyXG5cdFx0dGhpcy5fbGFzdFJlc3VsdHMgPSB3b3Jrc3BhY2VSZXN1bHRzO1xyXG5cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHJlc3VsdHM6IHdvcmtzcGFjZVJlc3VsdHNcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBBbiBlbnRyeSBoYXMgYmVlbiBzZWxlY3RlZC5cclxuXHQgKiBAcGFyYW0gcmVzdWx0IFRoZSBkaXNwYXRjaGVkIHJlc3VsdC5cclxuXHQgKiBAcGFyYW0gbGFzdFJlc3BvbnNlIFRoZSBsYXN0IHJlc3BvbnNlLlxyXG5cdCAqIEByZXR1cm5zIFRydWUgaWYgdGhlIGl0ZW0gd2FzIGhhbmRsZWQuXHJcblx0ICovXHJcblx0cHVibGljIGFzeW5jIGl0ZW1TZWxlY3Rpb24oXHJcblx0XHRyZXN1bHQ6IEhvbWVEaXNwYXRjaGVkU2VhcmNoUmVzdWx0LFxyXG5cdFx0bGFzdFJlc3BvbnNlOiBIb21lU2VhcmNoTGlzdGVuZXJSZXNwb25zZVxyXG5cdCk6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG5cdFx0bGV0IGhhbmRsZWQgPSBmYWxzZTtcclxuXHRcdGlmIChyZXN1bHQuYWN0aW9uLnRyaWdnZXIgPT09IFwidXNlci1hY3Rpb25cIikge1xyXG5cdFx0XHRjb25zdCBkYXRhOiB7XHJcblx0XHRcdFx0d29ya3NwYWNlSWQ/OiBzdHJpbmc7XHJcblx0XHRcdFx0d29ya3NwYWNlVGl0bGU/OiBzdHJpbmc7XHJcblx0XHRcdH0gPSByZXN1bHQuZGF0YTtcclxuXHJcblx0XHRcdGlmIChkYXRhPy53b3Jrc3BhY2VJZCkge1xyXG5cdFx0XHRcdGhhbmRsZWQgPSB0cnVlO1xyXG5cclxuXHRcdFx0XHRpZiAocmVzdWx0LmtleSA9PT0gV29ya3NwYWNlc1Byb3ZpZGVyLl9BQ1RJT05fU0FWRV9XT1JLU1BBQ0UpIHtcclxuXHRcdFx0XHRcdC8vIFJlbW92ZSB0aGUgc2F2ZSB3b3Jrc3BhY2UgZW50cnlcclxuXHRcdFx0XHRcdHRoaXMucmVzdWx0UmVtb3ZlKHJlc3VsdC5rZXkpO1xyXG5cclxuXHRcdFx0XHRcdGNvbnN0IHBsYXRmb3JtOiBXb3Jrc3BhY2VQbGF0Zm9ybU1vZHVsZSA9IHRoaXMuX2ludGVncmF0aW9uSGVscGVycy5nZXRQbGF0Zm9ybSgpO1xyXG5cdFx0XHRcdFx0Y29uc3Qgc25hcHNob3QgPSBhd2FpdCBwbGF0Zm9ybS5nZXRTbmFwc2hvdCgpO1xyXG5cdFx0XHRcdFx0Y29uc3QgY3VycmVudFdvcmtzcGFjZSA9IGF3YWl0IHBsYXRmb3JtLmdldEN1cnJlbnRXb3Jrc3BhY2UoKTtcclxuXHRcdFx0XHRcdGNvbnN0IGN1cnJlbnRNZXRhRGF0YSA9IGN1cnJlbnRXb3Jrc3BhY2U/Lm1ldGFkYXRhO1xyXG5cclxuXHRcdFx0XHRcdGNvbnN0IHdvcmtzcGFjZSA9IHtcclxuXHRcdFx0XHRcdFx0d29ya3NwYWNlSWQ6IGRhdGEud29ya3NwYWNlSWQsXHJcblx0XHRcdFx0XHRcdHRpdGxlOiBkYXRhLndvcmtzcGFjZVRpdGxlLFxyXG5cdFx0XHRcdFx0XHRtZXRhZGF0YTogY3VycmVudE1ldGFEYXRhLFxyXG5cdFx0XHRcdFx0XHRzbmFwc2hvdFxyXG5cdFx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0XHRhd2FpdCBwbGF0Zm9ybS5TdG9yYWdlLnNhdmVXb3Jrc3BhY2Uod29ya3NwYWNlKTtcclxuXHJcblx0XHRcdFx0XHRjb25zdCBzaGFyZUVuYWJsZWQ6IGJvb2xlYW4gPSBhd2FpdCB0aGlzLl9pbnRlZ3JhdGlvbkhlbHBlcnMuY29uZGl0aW9uKFwic2hhcmluZ1wiKTtcclxuXHRcdFx0XHRcdGNvbnN0IHBhbGV0dGU6IEN1c3RvbVBhbGV0dGVTZXQgPSBhd2FpdCB0aGlzLl9pbnRlZ3JhdGlvbkhlbHBlcnMuZ2V0Q3VycmVudFBhbGV0dGUoKTtcclxuXHRcdFx0XHRcdGNvbnN0IGNvbG9yU2NoZW1lID0gYXdhaXQgdGhpcy5faW50ZWdyYXRpb25IZWxwZXJzLmdldEN1cnJlbnRDb2xvclNjaGVtZU1vZGUoKTtcclxuXHJcblx0XHRcdFx0XHRjb25zdCBzYXZlZFdvcmtzcGFjZSA9IHRoaXMuZ2V0V29ya3NwYWNlVGVtcGxhdGUoXHJcblx0XHRcdFx0XHRcdHdvcmtzcGFjZS53b3Jrc3BhY2VJZCxcclxuXHRcdFx0XHRcdFx0d29ya3NwYWNlLnRpdGxlLFxyXG5cdFx0XHRcdFx0XHRzaGFyZUVuYWJsZWQsXHJcblx0XHRcdFx0XHRcdHRydWUsXHJcblx0XHRcdFx0XHRcdGNvbG9yU2NoZW1lLFxyXG5cdFx0XHRcdFx0XHRwYWxldHRlXHJcblx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdC8vIEFuZCBhZGQgdGhlIG5ldyBvbmVcclxuXHRcdFx0XHRcdHRoaXMucmVzdWx0QWRkVXBkYXRlKFtzYXZlZFdvcmtzcGFjZV0pO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAocmVzdWx0LmtleSA9PT0gV29ya3NwYWNlc1Byb3ZpZGVyLl9BQ1RJT05fRVhJU1RTX1dPUktTUEFDRSkge1xyXG5cdFx0XHRcdFx0Ly8gRG8gbm90aGluZywgdGhlIHVzZXIgbXVzdCB1cGRhdGUgdGhlIHF1ZXJ5IHRvIGdpdmUgaXQgYSBkaWZmZXJlbnRcclxuXHRcdFx0XHRcdC8vIG5hbWUgd2hpY2ggd2lsbCBhdXRvbWF0aWNhbGx5IHJlZnJlc2ggdGhlIHJlc3VsdHNcclxuXHRcdFx0XHR9IGVsc2UgaWYgKHJlc3VsdC5hY3Rpb24ubmFtZSA9PT0gV29ya3NwYWNlc1Byb3ZpZGVyLl9BQ1RJT05fT1BFTl9XT1JLU1BBQ0UpIHtcclxuXHRcdFx0XHRcdGNvbnN0IHBsYXRmb3JtOiBXb3Jrc3BhY2VQbGF0Zm9ybU1vZHVsZSA9IHRoaXMuX2ludGVncmF0aW9uSGVscGVycy5nZXRQbGF0Zm9ybSgpO1xyXG5cdFx0XHRcdFx0Y29uc3Qgd29ya3NwYWNlID0gYXdhaXQgcGxhdGZvcm0uU3RvcmFnZS5nZXRXb3Jrc3BhY2UoZGF0YS53b3Jrc3BhY2VJZCk7XHJcblx0XHRcdFx0XHRhd2FpdCBwbGF0Zm9ybS5hcHBseVdvcmtzcGFjZSh3b3Jrc3BhY2UpO1xyXG5cdFx0XHRcdFx0Ly8gV2UgcmVidWlsZCB0aGUgcmVzdWx0cyBoZXJlIGFzIHdlIHdpbGwgbm93IGhhdmUgYSBuZXcgY3VycmVudCB3b3Jrc3BhY2VcclxuXHRcdFx0XHRcdC8vIGFuZCB3ZSBuZWVkIHRvIGNoYW5nZSB0aGUgZXhpc3Rpbmcgb25lIGJhY2sgdG8gYSBzdGFuZGFyZCB0ZW1wbGF0ZVxyXG5cdFx0XHRcdFx0YXdhaXQgdGhpcy5yZWJ1aWxkUmVzdWx0cyhwbGF0Zm9ybSk7XHJcblx0XHRcdFx0fSBlbHNlIGlmIChyZXN1bHQuYWN0aW9uLm5hbWUgPT09IFdvcmtzcGFjZXNQcm92aWRlci5fQUNUSU9OX0RFTEVURV9XT1JLU1BBQ0UpIHtcclxuXHRcdFx0XHRcdGNvbnN0IHBsYXRmb3JtID0gdGhpcy5faW50ZWdyYXRpb25IZWxwZXJzLmdldFBsYXRmb3JtKCk7XHJcblx0XHRcdFx0XHRhd2FpdCBwbGF0Zm9ybS5TdG9yYWdlLmRlbGV0ZVdvcmtzcGFjZShkYXRhLndvcmtzcGFjZUlkKTtcclxuXHRcdFx0XHRcdC8vIERlbGV0aW5nIHRoZSB3b3JraW5nIHdpbGwgZXZlbnR1YWxseSB0cmlnZ2VyIHRoZSBcImRlbGV0ZVwiIGxpZmVjeWNsZVxyXG5cdFx0XHRcdFx0Ly8gZXZlbnQgd2hpY2ggd2lsbCByZW1vdmUgaXQgZnJvbSB0aGUgcmVzdWx0IGxpc3RcclxuXHRcdFx0XHR9IGVsc2UgaWYgKHJlc3VsdC5hY3Rpb24ubmFtZSA9PT0gV29ya3NwYWNlc1Byb3ZpZGVyLl9BQ1RJT05fU0hBUkVfV09SS1NQQUNFKSB7XHJcblx0XHRcdFx0XHRhd2FpdCB0aGlzLl9pbnRlZ3JhdGlvbkhlbHBlcnMuc2hhcmUoeyB3b3Jrc3BhY2VJZDogZGF0YS53b3Jrc3BhY2VJZCB9KTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0aGFuZGxlZCA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0dGhpcy5fbG9nZ2VyLndhcm4oYFVucmVjb2duaXplZCBhY3Rpb24gZm9yIHdvcmtzcGFjZSBzZWxlY3Rpb246ICR7ZGF0YS53b3Jrc3BhY2VJZH1gKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gaGFuZGxlZDtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZ2V0V29ya3NwYWNlVGVtcGxhdGUoXHJcblx0XHRpZDogc3RyaW5nLFxyXG5cdFx0dGl0bGU6IHN0cmluZyxcclxuXHRcdHNoYXJlRW5hYmxlZDogYm9vbGVhbixcclxuXHRcdGlzQ3VycmVudDogYm9vbGVhbixcclxuXHRcdGNvbG9yU2NoZW1lOiBDb2xvclNjaGVtZU1vZGUsXHJcblx0XHRwYWxldHRlOiBDdXN0b21QYWxldHRlU2V0XHJcblx0KTogSG9tZVNlYXJjaFJlc3VsdCB7XHJcblx0XHRsZXQgYWN0aW9ucyA9IFtdO1xyXG5cdFx0bGV0IGxheW91dDtcclxuXHRcdGxldCBkYXRhO1xyXG5cclxuXHRcdGlmIChpc0N1cnJlbnQpIHtcclxuXHRcdFx0bGF5b3V0ID0gdGhpcy5nZXRPdGhlcldvcmtzcGFjZVRlbXBsYXRlKHNoYXJlRW5hYmxlZCwgZmFsc2UsIHBhbGV0dGUpO1xyXG5cdFx0XHRkYXRhID0ge1xyXG5cdFx0XHRcdHRpdGxlLFxyXG5cdFx0XHRcdGluc3RydWN0aW9uczpcclxuXHRcdFx0XHRcdFwiVGhpcyBpcyB0aGUgY3VycmVudGx5IGFjdGl2ZSB3b3Jrc3BhY2UuIFlvdSBjYW4gdXNlIHRoZSBCcm93c2VyIG1lbnUgdG8gdXBkYXRlL3JlbmFtZSB0aGlzIHdvcmtzcGFjZVwiLFxyXG5cdFx0XHRcdG9wZW5UZXh0OiBcIk9wZW5cIixcclxuXHRcdFx0XHRzaGFyZVRleHQ6IFwiU2hhcmVcIlxyXG5cdFx0XHR9O1xyXG5cdFx0XHRpZiAoc2hhcmVFbmFibGVkKSB7XHJcblx0XHRcdFx0YWN0aW9ucy5wdXNoKHtcclxuXHRcdFx0XHRcdG5hbWU6IFdvcmtzcGFjZXNQcm92aWRlci5fQUNUSU9OX1NIQVJFX1dPUktTUEFDRSxcclxuXHRcdFx0XHRcdGhvdGtleTogXCJDbWRPckN0cmwrU2hpZnQrU1wiXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdFx0YWN0aW9ucyA9IGFjdGlvbnMuY29uY2F0KFtcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRuYW1lOiBXb3Jrc3BhY2VzUHJvdmlkZXIuX0FDVElPTl9PUEVOX1dPUktTUEFDRSxcclxuXHRcdFx0XHRcdGhvdGtleTogXCJFbnRlclwiXHJcblx0XHRcdFx0fVxyXG5cdFx0XHRdKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGlmIChzaGFyZUVuYWJsZWQpIHtcclxuXHRcdFx0XHRhY3Rpb25zLnB1c2goe1xyXG5cdFx0XHRcdFx0bmFtZTogV29ya3NwYWNlc1Byb3ZpZGVyLl9BQ1RJT05fU0hBUkVfV09SS1NQQUNFLFxyXG5cdFx0XHRcdFx0aG90a2V5OiBcIkNtZE9yQ3RybCtTaGlmdCtTXCJcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRhY3Rpb25zID0gYWN0aW9ucy5jb25jYXQoW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdG5hbWU6IFdvcmtzcGFjZXNQcm92aWRlci5fQUNUSU9OX0RFTEVURV9XT1JLU1BBQ0UsXHJcblx0XHRcdFx0XHRob3RrZXk6IFwiQ21kT3JDdHJsK1NoaWZ0K0RcIlxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0bmFtZTogV29ya3NwYWNlc1Byb3ZpZGVyLl9BQ1RJT05fT1BFTl9XT1JLU1BBQ0UsXHJcblx0XHRcdFx0XHRob3RrZXk6IFwiRW50ZXJcIlxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XSk7XHJcblx0XHRcdGxheW91dCA9IHRoaXMuZ2V0T3RoZXJXb3Jrc3BhY2VUZW1wbGF0ZShzaGFyZUVuYWJsZWQsIHRydWUsIHBhbGV0dGUpO1xyXG5cdFx0XHRkYXRhID0ge1xyXG5cdFx0XHRcdHRpdGxlLFxyXG5cdFx0XHRcdGluc3RydWN0aW9uczogXCJVc2UgdGhlIGJ1dHRvbnMgYmVsb3cgdG8gaW50ZXJhY3Qgd2l0aCB5b3VyIHNhdmVkIHdvcmtzcGFjZVwiLFxyXG5cdFx0XHRcdG9wZW5UZXh0OiBcIk9wZW5cIixcclxuXHRcdFx0XHRkZWxldGVUZXh0OiBcIkRlbGV0ZVwiLFxyXG5cdFx0XHRcdHNoYXJlVGV4dDogXCJTaGFyZVwiXHJcblx0XHRcdH07XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0a2V5OiBpZCxcclxuXHRcdFx0dGl0bGUsXHJcblx0XHRcdGxhYmVsOiBcIldvcmtzcGFjZVwiLFxyXG5cdFx0XHRpY29uOiB0aGlzLl9zZXR0aW5ncy5pbWFnZXMud29ya3NwYWNlLnJlcGxhY2UoXCJ7c2NoZW1lfVwiLCBjb2xvclNjaGVtZSBhcyBzdHJpbmcpLFxyXG5cdFx0XHRhY3Rpb25zLFxyXG5cdFx0XHRkYXRhOiB7XHJcblx0XHRcdFx0cHJvdmlkZXJJZDogV29ya3NwYWNlc1Byb3ZpZGVyLl9QUk9WSURFUl9JRCxcclxuXHRcdFx0XHR3b3Jrc3BhY2VUaXRsZTogdGl0bGUsXHJcblx0XHRcdFx0d29ya3NwYWNlSWQ6IGlkLFxyXG5cdFx0XHRcdHRhZ3M6IFtcIndvcmtzcGFjZVwiXVxyXG5cdFx0XHR9LFxyXG5cdFx0XHR0ZW1wbGF0ZTogXCJDdXN0b21cIiBhcyBDTElUZW1wbGF0ZS5DdXN0b20sXHJcblx0XHRcdHRlbXBsYXRlQ29udGVudDoge1xyXG5cdFx0XHRcdGxheW91dCxcclxuXHRcdFx0XHRkYXRhXHJcblx0XHRcdH1cclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldE90aGVyV29ya3NwYWNlVGVtcGxhdGUoXHJcblx0XHRlbmFibGVTaGFyZTogYm9vbGVhbixcclxuXHRcdGVuYWJsZURlbGV0ZTogYm9vbGVhbixcclxuXHRcdHBhbGV0dGU6IEN1c3RvbVBhbGV0dGVTZXRcclxuXHQpOiBUZW1wbGF0ZUZyYWdtZW50IHtcclxuXHRcdGNvbnN0IGFjdGlvbkJ1dHRvbnM6IFRlbXBsYXRlRnJhZ21lbnRbXSA9IFtcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHR5cGU6IFwiQnV0dG9uXCIsXHJcblx0XHRcdFx0YWN0aW9uOiBXb3Jrc3BhY2VzUHJvdmlkZXIuX0FDVElPTl9PUEVOX1dPUktTUEFDRSxcclxuXHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR0eXBlOiBcIlRleHRcIixcclxuXHRcdFx0XHRcdFx0ZGF0YUtleTogXCJvcGVuVGV4dFwiXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XVxyXG5cdFx0XHR9XHJcblx0XHRdO1xyXG5cclxuXHRcdGlmIChlbmFibGVEZWxldGUpIHtcclxuXHRcdFx0YWN0aW9uQnV0dG9ucy5wdXNoKHtcclxuXHRcdFx0XHR0eXBlOiBcIkJ1dHRvblwiLFxyXG5cdFx0XHRcdGJ1dHRvblN0eWxlOiBcInByaW1hcnlcIiBhcyBCdXR0b25TdHlsZS5QcmltYXJ5LFxyXG5cdFx0XHRcdGFjdGlvbjogV29ya3NwYWNlc1Byb3ZpZGVyLl9BQ1RJT05fREVMRVRFX1dPUktTUEFDRSxcclxuXHRcdFx0XHRjaGlsZHJlbjogW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR0eXBlOiBcIlRleHRcIixcclxuXHRcdFx0XHRcdFx0ZGF0YUtleTogXCJkZWxldGVUZXh0XCJcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRdXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChlbmFibGVTaGFyZSkge1xyXG5cdFx0XHRhY3Rpb25CdXR0b25zLnB1c2goe1xyXG5cdFx0XHRcdHR5cGU6IFwiQnV0dG9uXCIsXHJcblx0XHRcdFx0YnV0dG9uU3R5bGU6IFwicHJpbWFyeVwiIGFzIEJ1dHRvblN0eWxlLlByaW1hcnksXHJcblx0XHRcdFx0YWN0aW9uOiBXb3Jrc3BhY2VzUHJvdmlkZXIuX0FDVElPTl9TSEFSRV9XT1JLU1BBQ0UsXHJcblx0XHRcdFx0Y2hpbGRyZW46IFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0dHlwZTogXCJUZXh0XCIsXHJcblx0XHRcdFx0XHRcdGRhdGFLZXk6IFwic2hhcmVUZXh0XCJcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRdXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB7XHJcblx0XHRcdHR5cGU6IFwiQ29udGFpbmVyXCIsXHJcblx0XHRcdHN0eWxlOiB7XHJcblx0XHRcdFx0cGFkZGluZzogXCIxMHB4XCIsXHJcblx0XHRcdFx0ZGlzcGxheTogXCJmbGV4XCIsXHJcblx0XHRcdFx0ZmxleERpcmVjdGlvbjogXCJjb2x1bW5cIixcclxuXHRcdFx0XHRmbGV4OiAxXHJcblx0XHRcdH0sXHJcblx0XHRcdGNoaWxkcmVuOiBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dHlwZTogXCJUZXh0XCIsXHJcblx0XHRcdFx0XHRkYXRhS2V5OiBcInRpdGxlXCIsXHJcblx0XHRcdFx0XHRzdHlsZToge1xyXG5cdFx0XHRcdFx0XHRmb250V2VpZ2h0OiBcImJvbGRcIixcclxuXHRcdFx0XHRcdFx0Zm9udFNpemU6IFwiMTZweFwiLFxyXG5cdFx0XHRcdFx0XHRwYWRkaW5nQm90dG9tOiBcIjVweFwiLFxyXG5cdFx0XHRcdFx0XHRtYXJnaW5Cb3R0b206IFwiMTBweFwiLFxyXG5cdFx0XHRcdFx0XHRib3JkZXJCb3R0b206IGAxcHggc29saWQgJHtwYWxldHRlLmJhY2tncm91bmQ2fWBcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHR5cGU6IFwiVGV4dFwiLFxyXG5cdFx0XHRcdFx0ZGF0YUtleTogXCJpbnN0cnVjdGlvbnNcIixcclxuXHRcdFx0XHRcdHN0eWxlOiB7XHJcblx0XHRcdFx0XHRcdGZsZXg6IDFcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHR5cGU6IFwiQ29udGFpbmVyXCIsXHJcblx0XHRcdFx0XHRzdHlsZToge1xyXG5cdFx0XHRcdFx0XHRkaXNwbGF5OiBcImZsZXhcIixcclxuXHRcdFx0XHRcdFx0anVzdGlmeUNvbnRlbnQ6IFwiY2VudGVyXCIsXHJcblx0XHRcdFx0XHRcdGdhcDogXCIxMHB4XCJcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogYWN0aW9uQnV0dG9uc1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XVxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgcmVidWlsZFJlc3VsdHMocGxhdGZvcm06IFdvcmtzcGFjZVBsYXRmb3JtTW9kdWxlKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRjb25zdCBjb2xvclNjaGVtZSA9IGF3YWl0IHRoaXMuX2ludGVncmF0aW9uSGVscGVycy5nZXRDdXJyZW50Q29sb3JTY2hlbWVNb2RlKCk7XHJcblxyXG5cdFx0Y29uc3Qgd29ya3NwYWNlczogV29ya3NwYWNlW10gPSBhd2FpdCBwbGF0Zm9ybS5TdG9yYWdlLmdldFdvcmtzcGFjZXMoKTtcclxuXHRcdGNvbnN0IHJlc3VsdHMgPSBhd2FpdCB0aGlzLmJ1aWxkUmVzdWx0cyhcclxuXHRcdFx0cGxhdGZvcm0sXHJcblx0XHRcdHdvcmtzcGFjZXMsXHJcblx0XHRcdHRoaXMuX2xhc3RRdWVyeSxcclxuXHRcdFx0dGhpcy5fbGFzdFF1ZXJ5TWluTGVuZ3RoLFxyXG5cdFx0XHRjb2xvclNjaGVtZVxyXG5cdFx0KTtcclxuXHRcdHRoaXMucmVzdWx0QWRkVXBkYXRlKHJlc3VsdHMpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBidWlsZFJlc3VsdHMoXHJcblx0XHRwbGF0Zm9ybTogV29ya3NwYWNlUGxhdGZvcm1Nb2R1bGUsXHJcblx0XHR3b3Jrc3BhY2VzOiBXb3Jrc3BhY2VbXSxcclxuXHRcdHF1ZXJ5OiBzdHJpbmcsXHJcblx0XHRxdWVyeU1pbkxlbmd0aDogbnVtYmVyLFxyXG5cdFx0Y29sb3JTY2hlbWU6IENvbG9yU2NoZW1lTW9kZVxyXG5cdCk6IFByb21pc2U8SG9tZVNlYXJjaFJlc3VsdFtdPiB7XHJcblx0XHRsZXQgcmVzdWx0czogSG9tZVNlYXJjaFJlc3VsdFtdID0gW107XHJcblxyXG5cdFx0aWYgKEFycmF5LmlzQXJyYXkod29ya3NwYWNlcykpIHtcclxuXHRcdFx0Y29uc3QgY3VycmVudFdvcmtzcGFjZSA9IGF3YWl0IHBsYXRmb3JtLmdldEN1cnJlbnRXb3Jrc3BhY2UoKTtcclxuXHRcdFx0Y29uc3QgY3VycmVudFdvcmtzcGFjZUlkID0gY3VycmVudFdvcmtzcGFjZT8ud29ya3NwYWNlSWQ7XHJcblx0XHRcdGNvbnN0IHNoYXJlRW5hYmxlZDogYm9vbGVhbiA9IGF3YWl0IHRoaXMuX2ludGVncmF0aW9uSGVscGVycy5jb25kaXRpb24oXCJzaGFyaW5nXCIpO1xyXG5cdFx0XHRjb25zdCBwYWxldHRlOiBDdXN0b21QYWxldHRlU2V0ID0gYXdhaXQgdGhpcy5faW50ZWdyYXRpb25IZWxwZXJzLmdldEN1cnJlbnRQYWxldHRlKCk7XHJcblxyXG5cdFx0XHRyZXN1bHRzID0gd29ya3NwYWNlc1xyXG5cdFx0XHRcdC5maWx0ZXIoXHJcblx0XHRcdFx0XHQocGcpID0+XHJcblx0XHRcdFx0XHRcdHF1ZXJ5Lmxlbmd0aCA9PT0gMCB8fCAocXVlcnkubGVuZ3RoID49IHF1ZXJ5TWluTGVuZ3RoICYmIHBnLnRpdGxlLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMocXVlcnkpKVxyXG5cdFx0XHRcdClcclxuXHRcdFx0XHQubWFwKCh3czogV29ya3NwYWNlLCBpbmRleDogbnVtYmVyKSA9PlxyXG5cdFx0XHRcdFx0dGhpcy5nZXRXb3Jrc3BhY2VUZW1wbGF0ZShcclxuXHRcdFx0XHRcdFx0d3Mud29ya3NwYWNlSWQsXHJcblx0XHRcdFx0XHRcdHdzLnRpdGxlLFxyXG5cdFx0XHRcdFx0XHRzaGFyZUVuYWJsZWQsXHJcblx0XHRcdFx0XHRcdGN1cnJlbnRXb3Jrc3BhY2VJZCA9PT0gd3Mud29ya3NwYWNlSWQsXHJcblx0XHRcdFx0XHRcdGNvbG9yU2NoZW1lLFxyXG5cdFx0XHRcdFx0XHRwYWxldHRlXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdFx0KVxyXG5cdFx0XHRcdC5zb3J0KChhLCBiKSA9PiBhLnRpdGxlLmxvY2FsZUNvbXBhcmUoYi50aXRsZSkpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHJlc3VsdHM7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlc3VsdEFkZFVwZGF0ZShyZXN1bHRzOiBIb21lU2VhcmNoUmVzdWx0W10pOiB2b2lkIHtcclxuXHRcdGlmICh0aGlzLl9sYXN0UmVzdWx0cykge1xyXG5cdFx0XHRmb3IgKGNvbnN0IHJlc3VsdCBvZiByZXN1bHRzKSB7XHJcblx0XHRcdFx0Y29uc3QgcmVzdWx0SW5kZXggPSB0aGlzLl9sYXN0UmVzdWx0cy5maW5kSW5kZXgoKHJlcykgPT4gcmVzLmtleSA9PT0gcmVzdWx0LmtleSk7XHJcblx0XHRcdFx0aWYgKHJlc3VsdEluZGV4ID49IDApIHtcclxuXHRcdFx0XHRcdHRoaXMuX2xhc3RSZXN1bHRzLnNwbGljZShyZXN1bHRJbmRleCwgMSwgcmVzdWx0KTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0dGhpcy5fbGFzdFJlc3VsdHMucHVzaChyZXN1bHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0aWYgKHRoaXMuX2xhc3RSZXNwb25zZSkge1xyXG5cdFx0XHR0aGlzLl9sYXN0UmVzcG9uc2UucmVzcG9uZChyZXN1bHRzKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVzdWx0UmVtb3ZlKGlkOiBzdHJpbmcpOiB2b2lkIHtcclxuXHRcdGlmICh0aGlzLl9sYXN0UmVzdWx0cykge1xyXG5cdFx0XHRjb25zdCByZXN1bHRJbmRleCA9IHRoaXMuX2xhc3RSZXN1bHRzLmZpbmRJbmRleCgocmVzKSA9PiByZXMua2V5ID09PSBpZCk7XHJcblx0XHRcdGlmIChyZXN1bHRJbmRleCA+PSAwKSB7XHJcblx0XHRcdFx0dGhpcy5fbGFzdFJlc3VsdHMuc3BsaWNlKHJlc3VsdEluZGV4LCAxKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0aWYgKHRoaXMuX2xhc3RSZXNwb25zZSkge1xyXG5cdFx0XHR0aGlzLl9sYXN0UmVzcG9uc2UucmV2b2tlKGlkKTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuIiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXShtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIi8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb25zIGZvciBoYXJtb255IGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uZCA9IChleHBvcnRzLCBkZWZpbml0aW9uKSA9PiB7XG5cdGZvcih2YXIga2V5IGluIGRlZmluaXRpb24pIHtcblx0XHRpZihfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZGVmaW5pdGlvbiwga2V5KSAmJiAhX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIGtleSkpIHtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBrZXksIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBkZWZpbml0aW9uW2tleV0gfSk7XG5cdFx0fVxuXHR9XG59OyIsIl9fd2VicGFja19yZXF1aXJlX18ubyA9IChvYmosIHByb3ApID0+IChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKSkiLCIvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSAoZXhwb3J0cykgPT4ge1xuXHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcblx0fVxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xufTsiLCJpbXBvcnQgeyBXb3Jrc3BhY2VzUHJvdmlkZXIgfSBmcm9tIFwiLi9pbnRlZ3JhdGlvblwiO1xyXG5cclxuZXhwb3J0IGNvbnN0IGVudHJ5UG9pbnRzOiB7IFtpZDogc3RyaW5nXTogV29ya3NwYWNlc1Byb3ZpZGVyIH0gPSB7XHJcblx0aW50ZWdyYXRpb25zOiBuZXcgV29ya3NwYWNlc1Byb3ZpZGVyKClcclxufTtcclxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9