// autogenerated by scripts/create/create-hints.js
import { HintContext } from 'hint/dist/src/lib/hint-context';
import { IHint } from 'hint/dist/src/lib/types';
import { register } from './util/axe';

import meta from './meta/other';

export default class AxeHint implements IHint {
    public static readonly meta = meta;
    public constructor(context: HintContext) {
        register(context, ['avoid-inline-spacing', 'label-content-name-mismatch', 'scrollable-region-focusable'], ['label-content-name-mismatch']);
    }
}
