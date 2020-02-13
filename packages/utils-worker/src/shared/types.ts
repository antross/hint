import { DocumentData } from '@hint/utils-dom';
import { Problem } from '@hint/utils-types';
import { FetchEnd, FetchStart } from 'hint/dist/src/lib/types';

export type Config = {
    locale?: string;
    url: string;
};

export type ErrorData = {
    message: string;
    stack: string;
};

export type Events = {
    config?: Config;
    done?: true;
    error?: ErrorData;
    fetchEnd?: FetchEnd;
    fetchStart?: FetchStart;
    ready?: true;
    requestConfig?: true;
    results?: Problem[];
    snapshot?: DocumentData;
};
