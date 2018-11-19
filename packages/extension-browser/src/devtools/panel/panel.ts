import browser from '../../shared/browser';

const analyzeButton = document.getElementById('analyze')!;
const logElement = document.getElementById('log')!;

const log = (message: string) => {
    logElement.textContent += `${message}\n`;
}

const onNavigated = () => {
    browser.devtools.network.onRequestFinished.removeListener(onRequestFinished);
    browser.devtools.network.onRequestFinished.removeListener(onNavigated);
};

const onRequestFinished = (request: chrome.devtools.network.Request) => {
    request.getContent((content: string) => {

        const url = request.request.url;

        log(url);

        if (!content) {
            log('    - No content');
        }

        if (!request.response.status) {
            log('    - No status code');
        }

        if (!request.response.headers || !request.response.headers.length) {
            log('    - No response headers');
        }
    });
};

analyzeButton.onclick = () => {
    logElement.textContent = '';

    browser.devtools.network.onRequestFinished.addListener(onRequestFinished);
    browser.devtools.network.onNavigated.addListener(onNavigated);

    browser.devtools.inspectedWindow.eval('location.reload(true);');
};
