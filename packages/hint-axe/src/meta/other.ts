// autogenerated by scripts/create/create-metas.js
import { Category } from 'hint/dist/src/lib/enums/category';
import { HintScope } from 'hint/dist/src/lib/enums/hint-scope';
import { HintMetadata } from 'hint/dist/src/lib/types';

import { getMessage } from '../i18n.import';

const meta: HintMetadata = {
    docs: {
        category: Category.accessibility,
        description: getMessage('other_description', 'en'),
        name: getMessage('other_name', 'en')
    },
    /* istanbul ignore next */
    getDescription(language: string) {
        return getMessage('other_description', language);
    },
    /* istanbul ignore next */
    getName(language: string) {
        return getMessage('other_name', language);
    },
    id: 'axe/other',
    schema: [{
        additionalProperties: false,
        properties: {
            'avoid-inline-spacing': { enum: ['off', 'warning', 'error'], type: 'string' },
            'label-content-name-mismatch': { enum: ['off', 'warning', 'error'], type: 'string' },
            'scrollable-region-focusable': { enum: ['off', 'warning', 'error'], type: 'string' }
        }
    }],
    scope: HintScope.any
};

export default meta;
