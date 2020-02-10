import { DocumentData } from '@hint/utils-dom';
import { Category, Problem } from '@hint/utils-types';
import { FetchEnd, FetchStart } from 'hint/dist/src/lib/types';

export type Config = {
    disabledCategories?: string[];
    browserslist?: string;
    ignoredUrls?: string;
    severityThreshold?: string;
};

export type ErrorData = {
    message: string;
    stack: string;
};

export type InjectDetails = {
    config: Config;
}

export type HintResults = {
    helpURL: string;
    id: string;
    name: string;
    problems: Problem[];
};

export type CategoryResults = {
    hints: HintResults[];
    name: Category;
    passed: number;
};

export type Results = {
    categories: CategoryResults[];
    url: string;
};

export type EvaluateRequest = {
    id: string;
    code: string;
};

export type EvaluateResult = {
    id: string;
    err?: any;
    value?: any;
}

export type Events = {
    config?: Config;
    enable?: InjectDetails;
    error?: ErrorData;
    evaluate?: EvaluateRequest;
    evaluateResult?: EvaluateResult;
    fetchEnd?: FetchEnd;
    fetchStart?: FetchStart;
    done?: boolean;
    ready?: boolean;
    requestConfig?: boolean;
    results?: Results;
    snapshot?: DocumentData;
    tabId?: number;
};
