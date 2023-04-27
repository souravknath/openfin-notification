var __webpack_exports__ = {};
/*!**********************************************************************!*\
  !*** ./client/src/windows/intent-window/intent-snapshot-launcher.ts ***!
  \**********************************************************************/
let lastContextGroupIndex = -1;
async function getLauncherSettings() {
    const options = await fin.me.getOptions();
    let settings = {};
    if (options?.customData?.settings !== undefined) {
        settings = Object.assign(settings, options.customData.settings);
        if (settings.snapshotUrl === undefined) {
            console.error("Unable to setup intent handler as we need a snapshotUrl setting passed to fetch.");
            return null;
        }
        if (settings.intentName === undefined) {
            console.error("Unable to setup intent handler as we need a intentName setting passed.");
            return null;
        }
    }
    return settings;
}
async function getContextGroupName(contextGroupName, contextGroupToken) {
    let targetContextGroupName = contextGroupName;
    if (targetContextGroupName !== undefined) {
        const availableContextGroups = await fin.me.interop.getContextGroups();
        if (targetContextGroupName === "*") {
            console.log("The specified context group is all (*) indicating the target group should be rotated.");
            lastContextGroupIndex++;
            if (lastContextGroupIndex > availableContextGroups.length) {
                lastContextGroupIndex = 0;
            }
            targetContextGroupName = availableContextGroups[lastContextGroupIndex].id;
        }
        const targetContextGroup = availableContextGroups.find((entry) => entry.id === targetContextGroupName);
        if (targetContextGroup === undefined) {
            if (contextGroupToken !== undefined) {
                console.warn("Passed contextGroupName is invalid and cannot be used for contextGroupToken replacement. Setting context group to first in available list:", availableContextGroups[0].id);
                targetContextGroupName = availableContextGroups[0].id;
            }
            else {
                console.warn("The passed context group name is not valid and isn't used in the snapshot so will not be used or defaulted.");
                targetContextGroupName = undefined;
            }
        }
    }
    return targetContextGroupName;
}
async function launcherInit() {
    const settings = await getLauncherSettings();
    if (settings !== null) {
        const snapshotUrl = settings.snapshotUrl;
        const idName = settings.idName;
        const contextGroupName = settings.contextGroupName;
        const contextGroupToken = settings.contextGroupToken;
        const idToken = settings.idToken;
        const intentName = settings.intentName;
        await fin.me.interop.registerIntentHandler(async (intent) => {
            try {
                const response = await fetch(snapshotUrl, {
                    headers: {
                        Accept: "application/json"
                    }
                });
                if (response.status === 200) {
                    console.log("Received snapshot response");
                    let text = await response.text();
                    if (idName !== undefined &&
                        intent?.context?.id !== undefined &&
                        intent.context.id[idName] !== undefined) {
                        text = text.replaceAll(idToken, intent.context.id[idName]);
                    }
                    const targetContextGroupName = await getContextGroupName(contextGroupName, contextGroupToken);
                    if (targetContextGroupName !== undefined && contextGroupToken !== undefined) {
                        text = text.replaceAll(contextGroupToken, targetContextGroupName);
                    }
                    const snapshot = JSON.parse(text);
                    const platform = fin.Platform.getCurrentSync();
                    if (targetContextGroupName !== undefined) {
                        await fin.me.interop.joinContextGroup(targetContextGroupName);
                        await fin.me.interop.setContext(intent.context);
                    }
                    await platform.applySnapshot(snapshot);
                }
            }
            catch (error) {
                console.error("Error while trying to handle intent request for:", intent.name, error);
            }
        }, intentName);
    }
}
window.addEventListener("DOMContentLoaded", launcherInit);


//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uLndpbmRvd3MuaW50ZW50LXNuYXBzaG90LWxhdW5jaGVyLmJ1bmRsZS5qcyIsIm1hcHBpbmdzIjoiOzs7O0FBUUEsSUFBSSxxQkFBcUIsR0FBVyxDQUFDLENBQUMsQ0FBQztBQUV2QyxLQUFLLFVBQVUsbUJBQW1CO0lBQ2pDLE1BQU0sT0FBTyxHQUFHLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsQ0FBQztJQUMxQyxJQUFJLFFBQVEsR0FBcUIsRUFBRSxDQUFDO0lBQ3BDLElBQUksT0FBTyxFQUFFLFVBQVUsRUFBRSxRQUFRLEtBQUssU0FBUyxFQUFFO1FBQ2hELFFBQVEsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2hFLElBQUksUUFBUSxDQUFDLFdBQVcsS0FBSyxTQUFTLEVBQUU7WUFDdkMsT0FBTyxDQUFDLEtBQUssQ0FBQyxrRkFBa0YsQ0FBQyxDQUFDO1lBQ2xHLE9BQU8sSUFBSSxDQUFDO1NBQ1o7UUFDRCxJQUFJLFFBQVEsQ0FBQyxVQUFVLEtBQUssU0FBUyxFQUFFO1lBQ3RDLE9BQU8sQ0FBQyxLQUFLLENBQUMsd0VBQXdFLENBQUMsQ0FBQztZQUN4RixPQUFPLElBQUksQ0FBQztTQUNaO0tBQ0Q7SUFDRCxPQUFPLFFBQVEsQ0FBQztBQUNqQixDQUFDO0FBRUQsS0FBSyxVQUFVLG1CQUFtQixDQUFDLGdCQUF3QixFQUFFLGlCQUF5QjtJQUNyRixJQUFJLHNCQUFzQixHQUFHLGdCQUFnQixDQUFDO0lBQzlDLElBQUksc0JBQXNCLEtBQUssU0FBUyxFQUFFO1FBQ3pDLE1BQU0sc0JBQXNCLEdBQUcsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3ZFLElBQUksc0JBQXNCLEtBQUssR0FBRyxFQUFFO1lBQ25DLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUZBQXVGLENBQUMsQ0FBQztZQUNyRyxx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QUcsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLENBQUM7b0JBQy9DLElBQUksc0JBQXNCLEtBQUssU0FBUyxFQUFFO3dCQUN6QyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLHNCQUFzQixDQUFDLENBQUM7d0JBQzlELE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztxQkFDaEQ7b0JBQ0QsTUFBTSxRQUFRLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2lCQUN2QzthQUNEO1lBQUMsT0FBTyxLQUFLLEVBQUU7Z0JBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxrREFBa0QsRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO2FBQ3RGO1FBQ0YsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0tBQ2Y7QUFDRixDQUFDO0FBRUQsTUFBTSxDQUFDLGdCQUFnQixDQUFDLGtCQUFrQixFQUFFLFlBQVksQ0FBQyxDQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vb3BlbmZpbi13b3Jrc3BhY2UtLWNvbW1vbi8uL2NsaWVudC9zcmMvd2luZG93cy9pbnRlbnQtd2luZG93L2ludGVudC1zbmFwc2hvdC1sYXVuY2hlci50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbnRlcmZhY2UgTGF1bmNoZXJTZXR0aW5ncyB7XHJcblx0aW50ZW50TmFtZT86IHN0cmluZztcclxuXHRzbmFwc2hvdFVybD86IHN0cmluZztcclxuXHRpZFRva2VuPzogc3RyaW5nO1xyXG5cdGlkTmFtZT86IHN0cmluZztcclxuXHRjb250ZXh0R3JvdXBOYW1lPzogc3RyaW5nO1xyXG5cdGNvbnRleHRHcm91cFRva2VuPzogc3RyaW5nO1xyXG59XHJcbmxldCBsYXN0Q29udGV4dEdyb3VwSW5kZXg6IG51bWJlciA9IC0xO1xyXG5cclxuYXN5bmMgZnVuY3Rpb24gZ2V0TGF1bmNoZXJTZXR0aW5ncygpOiBQcm9taXNlPExhdW5jaGVyU2V0dGluZ3M+IHtcclxuXHRjb25zdCBvcHRpb25zID0gYXdhaXQgZmluLm1lLmdldE9wdGlvbnMoKTtcclxuXHRsZXQgc2V0dGluZ3M6IExhdW5jaGVyU2V0dGluZ3MgPSB7fTtcclxuXHRpZiAob3B0aW9ucz8uY3VzdG9tRGF0YT8uc2V0dGluZ3MgIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0c2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHNldHRpbmdzLCBvcHRpb25zLmN1c3RvbURhdGEuc2V0dGluZ3MpO1xyXG5cdFx0aWYgKHNldHRpbmdzLnNuYXBzaG90VXJsID09PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIlVuYWJsZSB0byBzZXR1cCBpbnRlbnQgaGFuZGxlciBhcyB3ZSBuZWVkIGEgc25hcHNob3RVcmwgc2V0dGluZyBwYXNzZWQgdG8gZmV0Y2guXCIpO1xyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHRcdGlmIChzZXR0aW5ncy5pbnRlbnROYW1lID09PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIlVuYWJsZSB0byBzZXR1cCBpbnRlbnQgaGFuZGxlciBhcyB3ZSBuZWVkIGEgaW50ZW50TmFtZSBzZXR0aW5nIHBhc3NlZC5cIik7XHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRyZXR1cm4gc2V0dGluZ3M7XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGdldENvbnRleHRHcm91cE5hbWUoY29udGV4dEdyb3VwTmFtZTogc3RyaW5nLCBjb250ZXh0R3JvdXBUb2tlbjogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcclxuXHRsZXQgdGFyZ2V0Q29udGV4dEdyb3VwTmFtZSA9IGNvbnRleHRHcm91cE5hbWU7XHJcblx0aWYgKHRhcmdldENvbnRleHRHcm91cE5hbWUgIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0Y29uc3QgYXZhaWxhYmxlQ29udGV4dEdyb3VwcyA9IGF3YWl0IGZpbi5tZS5pbnRlcm9wLmdldENvbnRleHRHcm91cHMoKTtcclxuXHRcdGlmICh0YXJnZXRDb250ZXh0R3JvdXBOYW1lID09PSBcIipcIikge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIlRoZSBzcGVjaWZpZWQgY29udGV4dCBncm91cCBpcyBhbGwgKCopIGluZGljYXRpbmcgdGhlIHRhcmdldCBncm91cCBzaG91bGQgYmUgcm90YXRlZC5cIik7XHJcblx0XHRcdGxhc3RDb250ZXh0R3JvdXBJbmRleCsrO1xyXG5cdFx0XHRpZiAobGFzdENvbnRleHRHcm91cEluZGV4ID4gYXZhaWxhYmxlQ29udGV4dEdyb3Vwcy5sZW5ndGgpIHtcclxuXHRcdFx0XHRsYXN0Q29udGV4dEdyb3VwSW5kZXggPSAwO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRhcmdldENvbnRleHRHcm91cE5hbWUgPSBhdmFpbGFibGVDb250ZXh0R3JvdXBzW2xhc3RDb250ZXh0R3JvdXBJbmRleF0uaWQ7XHJcblx0XHR9XHJcblx0XHRjb25zdCB0YXJnZXRDb250ZXh0R3JvdXAgPSBhdmFpbGFibGVDb250ZXh0R3JvdXBzLmZpbmQoKGVudHJ5KSA9PiBlbnRyeS5pZCA9PT0gdGFyZ2V0Q29udGV4dEdyb3VwTmFtZSk7XHJcblx0XHRpZiAodGFyZ2V0Q29udGV4dEdyb3VwID09PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0aWYgKGNvbnRleHRHcm91cFRva2VuICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRcIlBhc3NlZCBjb250ZXh0R3JvdXBOYW1lIGlzIGludmFsaWQgYW5kIGNhbm5vdCBiZSB1c2VkIGZvciBjb250ZXh0R3JvdXBUb2tlbiByZXBsYWNlbWVudC4gU2V0dGluZyBjb250ZXh0IGdyb3VwIHRvIGZpcnN0IGluIGF2YWlsYWJsZSBsaXN0OlwiLFxyXG5cdFx0XHRcdFx0YXZhaWxhYmxlQ29udGV4dEdyb3Vwc1swXS5pZFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0dGFyZ2V0Q29udGV4dEdyb3VwTmFtZSA9IGF2YWlsYWJsZUNvbnRleHRHcm91cHNbMF0uaWQ7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0XCJUaGUgcGFzc2VkIGNvbnRleHQgZ3JvdXAgbmFtZSBpcyBub3QgdmFsaWQgYW5kIGlzbid0IHVzZWQgaW4gdGhlIHNuYXBzaG90IHNvIHdpbGwgbm90IGJlIHVzZWQgb3IgZGVmYXVsdGVkLlwiXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHR0YXJnZXRDb250ZXh0R3JvdXBOYW1lID0gdW5kZWZpbmVkO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cdHJldHVybiB0YXJnZXRDb250ZXh0R3JvdXBOYW1lO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBsYXVuY2hlckluaXQoKSB7XHJcblx0Y29uc3Qgc2V0dGluZ3MgPSBhd2FpdCBnZXRMYXVuY2hlclNldHRpbmdzKCk7XHJcblxyXG5cdGlmIChzZXR0aW5ncyAhPT0gbnVsbCkge1xyXG5cdFx0Y29uc3Qgc25hcHNob3RVcmw6IHN0cmluZyA9IHNldHRpbmdzLnNuYXBzaG90VXJsO1xyXG5cdFx0Y29uc3QgaWROYW1lOiBzdHJpbmcgPSBzZXR0aW5ncy5pZE5hbWU7XHJcblx0XHRjb25zdCBjb250ZXh0R3JvdXBOYW1lOiBzdHJpbmcgPSBzZXR0aW5ncy5jb250ZXh0R3JvdXBOYW1lO1xyXG5cdFx0Y29uc3QgY29udGV4dEdyb3VwVG9rZW46IHN0cmluZyA9IHNldHRpbmdzLmNvbnRleHRHcm91cFRva2VuO1xyXG5cdFx0Y29uc3QgaWRUb2tlbjogc3RyaW5nID0gc2V0dGluZ3MuaWRUb2tlbjtcclxuXHRcdGNvbnN0IGludGVudE5hbWU6IHN0cmluZyA9IHNldHRpbmdzLmludGVudE5hbWU7XHJcblxyXG5cdFx0YXdhaXQgZmluLm1lLmludGVyb3AucmVnaXN0ZXJJbnRlbnRIYW5kbGVyKGFzeW5jIChpbnRlbnQpID0+IHtcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHNuYXBzaG90VXJsLCB7XHJcblx0XHRcdFx0XHRoZWFkZXJzOiB7XHJcblx0XHRcdFx0XHRcdEFjY2VwdDogXCJhcHBsaWNhdGlvbi9qc29uXCJcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRpZiAocmVzcG9uc2Uuc3RhdHVzID09PSAyMDApIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiUmVjZWl2ZWQgc25hcHNob3QgcmVzcG9uc2VcIik7XHJcblx0XHRcdFx0XHRsZXQgdGV4dCA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcclxuXHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0aWROYW1lICE9PSB1bmRlZmluZWQgJiZcclxuXHRcdFx0XHRcdFx0aW50ZW50Py5jb250ZXh0Py5pZCAhPT0gdW5kZWZpbmVkICYmXHJcblx0XHRcdFx0XHRcdGludGVudC5jb250ZXh0LmlkW2lkTmFtZV0gIT09IHVuZGVmaW5lZFxyXG5cdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdHRleHQgPSB0ZXh0LnJlcGxhY2VBbGwoaWRUb2tlbiwgaW50ZW50LmNvbnRleHQuaWRbaWROYW1lXSk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Y29uc3QgdGFyZ2V0Q29udGV4dEdyb3VwTmFtZTogc3RyaW5nID0gYXdhaXQgZ2V0Q29udGV4dEdyb3VwTmFtZShcclxuXHRcdFx0XHRcdFx0Y29udGV4dEdyb3VwTmFtZSxcclxuXHRcdFx0XHRcdFx0Y29udGV4dEdyb3VwVG9rZW5cclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRpZiAodGFyZ2V0Q29udGV4dEdyb3VwTmFtZSAhPT0gdW5kZWZpbmVkICYmIGNvbnRleHRHcm91cFRva2VuICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0XHRcdFx0dGV4dCA9IHRleHQucmVwbGFjZUFsbChjb250ZXh0R3JvdXBUb2tlbiwgdGFyZ2V0Q29udGV4dEdyb3VwTmFtZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRjb25zdCBzbmFwc2hvdDogT3BlbkZpbi5TbmFwc2hvdCA9IEpTT04ucGFyc2UodGV4dCk7XHJcblx0XHRcdFx0XHRjb25zdCBwbGF0Zm9ybSA9IGZpbi5QbGF0Zm9ybS5nZXRDdXJyZW50U3luYygpO1xyXG5cdFx0XHRcdFx0aWYgKHRhcmdldENvbnRleHRHcm91cE5hbWUgIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdFx0XHRhd2FpdCBmaW4ubWUuaW50ZXJvcC5qb2luQ29udGV4dEdyb3VwKHRhcmdldENvbnRleHRHcm91cE5hbWUpO1xyXG5cdFx0XHRcdFx0XHRhd2FpdCBmaW4ubWUuaW50ZXJvcC5zZXRDb250ZXh0KGludGVudC5jb250ZXh0KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGF3YWl0IHBsYXRmb3JtLmFwcGx5U25hcHNob3Qoc25hcHNob3QpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiRXJyb3Igd2hpbGUgdHJ5aW5nIHRvIGhhbmRsZSBpbnRlbnQgcmVxdWVzdCBmb3I6XCIsIGludGVudC5uYW1lLCBlcnJvcik7XHJcblx0XHRcdH1cclxuXHRcdH0sIGludGVudE5hbWUpO1xyXG5cdH1cclxufVxyXG5cclxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsIGxhdW5jaGVySW5pdCk7XHJcbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==