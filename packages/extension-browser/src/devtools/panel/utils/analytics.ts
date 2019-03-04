import { AppInsights } from 'applicationinsights-js';

import { HintResults, Results } from '../../../shared/types';

/** Called to initialize the underlying analytics library. */
export const setup = () => {
    AppInsights.downloadAndSetup!({ instrumentationKey: '8ef2b55b-2ce9-4c33-a09a-2c3ef605c97d' });
};

/** Called when analysis was canceled by the user. */
export const trackCancel = (duration: number) => {
    AppInsights.trackEvent('f12-cancel', undefined, { 'f12-cancel-duration': duration });
};

/** Called when analysis finished. */
export const trackFinish = (duration: number) => {
    AppInsights.trackEvent('f12-finish', undefined, { 'f12-finish-duration': duration });
};

/** Called when the "Hints" tab was opened by the user. */
export const trackShow = () => {
    AppInsights.trackEvent('f12-show');
};

/** Called when analysis was started by the user. */
export const trackStart = () => {
    AppInsights.trackEvent('f12-start');
};

const trackResults = (results: Results): void => {
    const hints = results.categories.reduce((list, category) => {
        return [...list, ...category.hints];
    }, [] as HintResults[]);

    const passed = hints.filter((hint) => {
        return hint.problems.length === 0;
    }).map((hint) => {
        return hint.id;
    });

    const failed = hints.filter((hint) => {
        return hint.problems.length > 0;
    }).map((hint) => {
        return hint.id;
    });

    // TODO
    AppInsights.trackEvent('f12-results', undefined, {
        'f12-fixed-hint-axe': 0, // Date.now() - firstSeen
        'f12-fixed-hint-button-type': 600000,
        'f12-hint-axe': 12, // hint.problems.length
        'f12-hint-button-type': 4
    });
};
