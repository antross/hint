import * as isCI from 'is-ci';
import { launch, Browser, Page, Target } from 'puppeteer';
import test from 'ava';

import { Server } from '@hint/utils-create-server';

import { Events, Results } from '../src/shared/types';

import { readFixture } from './helpers/fixtures';

const pathToExtension = `${__dirname}/../bundle`;

const wait = (delay = 500): Promise<void> => {
    return new Promise((resolve) => {
        setTimeout(resolve, delay);
    });
};

const getPageFromTarget = async (target: Target) => {
    (target as any)._targetInfo.type = 'page';

    return await target.page();
};

/**
 * Find the Puppeteer `Page` associated with the background script
 * for the webhint browser extension.
 *
 * Needed because Chromium has a built-in extension with a background
 * script that runs even when all other extensions are disabled. The
 * order in which the background scripts are returned varies randomly
 * between runs, so clear identification is necessary.
 *
 * @param browser The Puppeteer `Browser` instance to search.
 * @returns The found page for the background script.
 */
const findBackgroundScriptPage = async (browser: Browser): Promise<Page> => {
    const targets = await browser.targets();
    const bgTargets = targets.filter((t) => {
        return t.type() === 'background_page';
    });

    const matches = await Promise.all(bgTargets.map(async (t) => {
        const page = await t.page();

        // TODO: Rename `background-script.js` to make the ID more unique.
        return await page.$('script[src="background-script.js"]');
    }));

    const bgTarget = bgTargets.filter((t, i) => {
        return matches[i];
    })[0];

    return await bgTarget.page();
};

/**
 * Find the Puppeteer `Page` associated with the devtools panel
 * for the webhint browser extension.
 *
 * Needed because Puppeteer doesn't expose the devtools as a page.
 *
 * @param browser The Puppeteer `Browser` instance to search.
 * @returns The found devtools panel for the extension.
 */
const findWebhintDevtoolsPanel = async (test: any, browser: Browser): Promise<Page | null> => {
    const targets = await browser.targets();
    const devtoolsTarget = targets.filter((t) => {
        return t.type() === 'other' && t.url().startsWith('chrome-devtools://');
    })[0];

    const devtoolsPage = await getPageFromTarget(devtoolsTarget);

    await wait();

    // Based on https://github.com/GoogleChrome/puppeteer/issues/3699#issuecomment-450526587
    await devtoolsPage.keyboard.down('Control');
    await devtoolsPage.keyboard.press('[');
    await devtoolsPage.keyboard.up('Control');

    await wait();

    const newTargets = await browser.targets();

    const webhintTarget = newTargets.filter((target) => {
        const url = target.url();
        const isExtension = url.startsWith('chrome-extension://');
        const isPanel = url.endsWith('devtools/panel.html');

        return isExtension && isPanel;
    })[0];

    test.log('webhint target: ', webhintTarget.url());

    const webhintPanel = await getPageFromTarget(webhintTarget);

    test.log('webhint panel: ', !!webhintPanel);

    return webhintPanel;
};

test('It runs end-to-end in a page', async (t) => {
    const server = await Server.create({ configuration: await readFixture('missing-lang.html') });

    const url = `http://localhost:${server.port}/`;

    const browser = await launch();
    const page = (await browser.pages())[0];

    await page.goto(url);

    const resultsPromise = page.evaluate(() => {
        return new Promise<Results>((resolve) => {
            let onMessage: ((events: Events) => void) = () => { };

            window.chrome = {
                runtime: {
                    onMessage: {
                        addListener: (fn: () => void) => {
                            onMessage = fn;
                        },
                        removeListener: () => { }
                    },
                    sendMessage: (event: Events) => {
                        if (event.requestConfig) {
                            onMessage({ config: {} });
                        }
                        if (event.results) {
                            resolve(event.results);
                        }
                    }
                }
            } as any;
        });
    });

    await page.addScriptTag({ path: `${__dirname}/../bundle/content-script/webhint.js` });

    const results = await resultsPromise;

    t.not(results.categories.length, 0);
    t.true(results.categories.some((category) => {
        return category.hints.some((hint) => {
            return hint.problems.some((problem) => {
                return problem.message === '<html> element must have a lang attribute';
            });
        });
    }), 'Missing `lang` attribute was not reported');

    await browser.close();
    server.stop();
});

// TODO: Get this working in CI (at least for Linux).
if (!isCI) {
    test('It runs end-to-end as an extension', async (t) => {
        const server = await Server.create({ configuration: await readFixture('missing-lang.html') });

        const url = `http://localhost:${server.port}/`;

        const browser = await launch({
            args: [
                `--disable-extensions-except=${pathToExtension}`,
                `--load-extension=${pathToExtension}`
            ],
            defaultViewport: null,
            devtools: true,
            headless: false
        });

        const pages = await browser.pages();

        await pages[0].goto(url);

        await wait();

        const backgroundPage = await findBackgroundScriptPage(browser);
        const webhintPanel = await findWebhintDevtoolsPanel(t, browser);

        await wait();

        // t.log(webhintPanel && webhintPanel.url());

        if (webhintPanel) {
            const button = await webhintPanel.$('button[type="submit"]');

            if (button) {
                t.log('Got a button!');

                // button.click();
            }
        }

        const results: Results = await backgroundPage.evaluate(() => {
            return new Promise<Results>((resolve) => {
                chrome.runtime.onMessage.addListener((message: Events) => {
                    if (message.results) {
                        resolve(message.results);
                    }
                });
            });
        });

        t.not(results.categories.length, 0);
        t.true(results.categories.some((category) => {
            return category.hints.some((hint) => {
                return hint.problems.some((problem) => {
                    return problem.message === '<html> element must have a lang attribute';
                });
            });
        }), 'Missing `lang` attribute was not reported');

        await browser.close();
        server.stop();
    });
}
