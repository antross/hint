import { FetchEnd, FetchStart, Request, Response } from 'hint/dist/src/lib/types';
import { Config, Details, Events } from './shared/types';
import browser from './shared/browser';
import { mapHeaders } from './shared/headers';

// Track data associated with all outstanding requests by `requestId`.
const requests = new Map<string, Details[]>();

// Track response content associated with requests by `requestId`.
const responses = new Map<string, Promise<string>>();

/** Convert `webRequest` details to a `hint` `Request` object. */
const mapRequest = (parts: Details[]): Request => {
    const requestDetails = parts[0];

    // Take the first `requestHeaders` found (ignoring headers for redirects).
    const requestHeaders = parts.map((details) => {
        return details.requestHeaders;
    }).filter((headers) => {
        return !!headers;
    })[0];

    // Build a `hint` request object.
    return {
        headers: mapHeaders(requestHeaders),
        url: requestDetails.url
    };
};

/** Convert `webRequest` details to a `hint` `Response` object. */
const mapResponse = async (parts: Details[], responsePromise?: Promise<string>): Promise<Response> => {
    const responseDetails = parts[parts.length - 1];

    let content = '';

    if (responsePromise) {

        // Get the response text from a `StreamFilter` promise if available (Firefox).
        content = await responsePromise;

    } else {

        // Otherwise re-fetch the URL to get the response text (Edge).
        const responseBody = await fetch(responseDetails.url);
        content = await responseBody.text(); // eslint-disable-line

    }

    // Build a `hint` response object.
    return {
        body: {
            content,
            rawContent: null as any,
            rawResponse: null as any
        },
        charset: '', // Set by `content-script/connector`.
        headers: mapHeaders(responseDetails.responseHeaders),
        hops: parts.map((details) => {
            return details.redirectUrl;
        }).filter((url) => {
            return !!url;
        }),
        mediaType: '', // Set by `content-script/connector`.
        statusCode: responseDetails.statusCode,
        url: responseDetails.url
    };
};

const configs = new Map<number, Config>();
const enabledTabs = new Set<number>();
const readyTabs = new Set<number>();
const queuedEvents = new Map<number, Events[]>();

/** Emit an event to a tab's content script if ready; queue otherwise. */
const sendEvent = (tabId: number, event: Events) => {
    if (readyTabs.has(tabId)) {

        browser.tabs.sendMessage(tabId, event);

    } else {

        if (!queuedEvents.has(tabId)) {
            queuedEvents.set(tabId, []);
        }

        const events = queuedEvents.get(tabId)!; // Won't be `null` per `has` check above.

        events.push(event);
    }
};

// Keep a mapping of tab IDs to connected devtools panels for messaging.
const ports = new Map<number, chrome.runtime.Port>();

/** Build and trigger `fetch::end::*` based on provided `webRequest` details. */
const sendFetchEnd = async (parts: Details[]): Promise<void> => {
    const tabId = parts[0].tabId;
    const requestId = parts[0].requestId;
    const responsePromise = responses.get(requestId);

    responses.delete(requestId);

    /*
     * If response content is not already available via a `StreamFilter`,
     * ignore sending `fetch::end` here when a devtools page is attached (Chrome).
     *
     * This is because there's no `responseBody` property in the `webRequest` APIs so
     * we have to make an extra `fetch` call to get it, adding additional overhead.
     *
     * Since `devtools.network.onRequestFinished` has a `getContent()` method,
     * it gets used when `StreamFilter` is not available (see `devtools/panel/panel.ts`).
     */
    if (!responsePromise && ports.has(tabId)) {
        return;
    }

    const element = null; // Set by `content-script/connector`.
    const request = mapRequest(parts);
    const response = await mapResponse(parts, responsePromise);
    const resource = response.url;

    const fetchEnd: FetchEnd = { element, request, resource, response };

    sendEvent(tabId, { fetchEnd });
};

/** Build and trigger `fetch::start` based on provided `webRequest` details. */
const sendFetchStart = (details: Details) => {
    const resource = details.url;
    const fetchStart: FetchStart = { resource };

    sendEvent(details.tabId, { fetchStart });
};

/** Add the script to run webhint to the page. */
const injectContentScript = (tabId: number, retries = 0) => {
    browser.tabs.executeScript(tabId, { file: 'content-script/webhint.js', runAt: 'document_start' }, (result) => {
        // We get an empty object `{}` back on success, or `undefined` if the script failed to execute.
        if (!result) {
            if (retries <= 2) {
                /*
                 * Injection occassionally fails in Firefox; retry.
                 * Variation of https://bugzilla.mozilla.org/show_bug.cgi?id=1397667
                 */
                console.warn('Failed to inject content script. Retrying...');
                injectContentScript(tabId, retries + 1);
            } else {
                // Give up if retrying still doesn't inject the content script.
                console.error('Failed to inject content script after retrying.');
            }
        }
    });
};

/** Store the content of the specified response via `webRequest` APIs (if possible). */
const saveResponseContent = (requestId: string): void => {
    if (!browser.webRequest.filterResponseData) {
        return;
    }

    responses.set(requestId, new Promise<string>((resolve) => {
        let responseText = '';
        const filter = browser.webRequest.filterResponseData(requestId);
        const decoder = new TextDecoder('utf-8');

        filter.ondata = (event) => {
            responseText += decoder.decode(event.data, { stream: true });
            filter.write(event.data);
        };

        filter.onstop = () => {
            resolve(responseText);
            filter.disconnect();
        };
    }));
};

/** Queue a `webRequest` event by `requestId`, flushing after `onCompleted`. */
const queueDetails = (event: string, details: Details) => {
    if (!requests.has(details.requestId)) {
        requests.set(details.requestId, []);

        // Trigger a `fetch::start` on the first event for a `requestId`.
        sendFetchStart(details);
    }

    const parts = requests.get(details.requestId)!; // Won't be null due to above if + set.

    parts.push(details);

    if (event === 'onBeforeRequest') {
        saveResponseContent(details.requestId);
    }

    if (event === 'onResponseStarted' && details.type === 'main_frame' && enabledTabs.has(details.tabId)) {
        injectContentScript(details.tabId);
    }

    if (event === 'onCompleted') {
        requests.delete(details.requestId);

        // Trigger a `fetch::end::*` on `onCompleted` for a `requestId`.
        sendFetchEnd(parts);
    }
};

const webRequestEvents = [
    'onBeforeRequest',
    'onBeforeSendHeaders',
    'onSendHeaders',
    'onHeadersReceived',
    'onBeforeRedirect',
    'onAuthRequired',
    'onResponseStarted',
    'onCompleted'
];

const webRequestHandlers = webRequestEvents.map((event) => {
    return (details: Details) => {
        queueDetails(event, details);
    };
});

const requestFilter = {
    types: ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image'],
    urls: ['<all_urls>']
};

const extraInfo: { [name: string]: string[] } = {
    onBeforeRequest: ['blocking'],
    onCompleted: ['responseHeaders'],
    onHeadersReceived: ['responseHeaders'],
    onSendHeaders: ['requestHeaders']
};

/** Turn on request tracking for the specified tab. */
const enable = (tabId: number) => {
    if (!enabledTabs.size) {
        // Register and queue all `webRequest` events by `requestId`.
        webRequestEvents.forEach((event, i) => {
            (browser.webRequest as any)[event].addListener(webRequestHandlers[i], requestFilter, extraInfo[event]);
        });
    }
    enabledTabs.add(tabId);
    readyTabs.delete(tabId);
    browser.tabs.reload(tabId, { bypassCache: true });
};

/** Turn off request tracking for the specified tab. */
const disable = (tabId: number) => {
    enabledTabs.delete(tabId);
    if (!enabledTabs.size) {
        webRequestEvents.forEach((event, i) => {
            (browser.webRequest as any)[event].removeListener(webRequestHandlers[i]);
        });
    }
};

// Support starting/stopping via the icon in the browser toolbar.
browser.browserAction.onClicked.addListener((tab) => {
    if (tab.id) {
        if (enabledTabs.has(tab.id)) {
            disable(tab.id);
        } else {
            enable(tab.id);
        }
    }
});

// Watch for new connections from devtools panels.
browser.runtime.onConnect.addListener((port) => {
    ports.set(parseInt(port.name), port);
});

// Watch for messages from content scripts and devtools panels (listed roughly in the order they will occur).
browser.runtime.onMessage.addListener((message: Events, sender) => {
    const tabId = sender.tab && sender.tab.id || message.tabId;

    // Aid debugging by ensuring a tabId is always found.
    if (!tabId) {
        throw new Error(`Message received without a tabId: ${JSON.stringify(message)}`);
    }

    // Activate content-script when requested by devtools page (saving configuration for when content-script is ready).
    if (message.enable) {
        configs.set(tabId, message.enable);
        enable(tabId);
    }

    // Forward configuration to content-script when asked (happens before `message.ready`).
    if (message.requestConfig) {
        const configMessage: Events = { enable: configs.get(tabId) || {} };

        browser.tabs.sendMessage(tabId, configMessage);
    }

    // Send queued events to content-script when ready.
    if (message.ready) {
        readyTabs.add(tabId);

        if (queuedEvents.has(tabId)) {
            const events = queuedEvents.get(tabId)!;

            events.forEach((event) => {
                sendEvent(tabId, event);
            });

            queuedEvents.delete(tabId);
        }
    }

    // Forward or queue `fetch::*` events from devtools page to content script (can occur before `message.ready`).
    if (message.fetchEnd || message.fetchStart) {
        // But only if response content wasn't available from the `webRequest` APIs directly (Chrome).
        if (!browser.webRequest.filterResponseData) {
            sendEvent(tabId, message);
        }
    }

    // Forward results from content-script to the associated devtools panel.
    if (message.results) {
        disable(tabId);

        const port = ports.get(tabId);

        if (port) {
            port.postMessage(message);
        }
    }
});
