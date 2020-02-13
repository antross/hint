import test from 'ava';
import * as proxyquire from 'proxyquire';
import * as sinon from 'sinon';

import { readFixture } from './helpers/fixtures';

const base = '../src/content-script';

/**
 * Modules to provide stubbed globals to.
 * Declared in reverse dependency order so the lowest dependency gets
 * overridden with stubbed globals before modules which depend on it.
 */
const paths: { [name: string]: string } = {
    connector: `${base}/connector`,
    webhint: `${base}/webhint`
};

const stubContext = () => {
    const listeners = new Set<Function>();

    const stubs = {
        '../shared/globals': {
            '@noCallThru': true,
            self: {
                addEventListener(name: string, handler: Function) {
                    if (name !== 'message') {
                        throw new Error(`Event ${name} has not been stubbed.`);
                    }

                    listeners.add(handler);
                },
                postMessage(data: any, origin: string) {},
                removeEventListener(name: string, handler: Function) {
                    if (name !== 'message') {
                        throw new Error(`Event ${name} has not been stubbed.`);
                    }

                    listeners.delete(handler);
                }
            }
        }
    };

    const connector = proxyquire(paths.connector, stubs);

    connector['@noCallThru'] = true;

    proxyquire(paths.webhint, {
        './connector': connector,
        ...stubs
    });

    return { listeners, self };
};

test('It handles invalid ignored urls', async (t) => {
    const url = 'http://localhost/';
    const html = await readFixture('missing-lang.html');
    const { listeners, self } = stubContext();

    sinon.stub(self, 'addEventListener')

    const resultsPromise = stubEvents({ ignoredUrls: '(foo' }, () => {
        sendFetch(url, html);
    });

    stubContext(url, html);

    const results = await resultsPromise;

    t.not(results.categories.length, 0);
});
