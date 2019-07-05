// autogenerated by scripts/create/create-metas.js
import { Category } from 'hint/dist/src/lib/enums/category';
import { HintScope } from 'hint/dist/src/lib/enums/hint-scope';
import { HintMetadata } from 'hint/dist/src/lib/types';

import { getMessage } from '../i18n.import';

const meta: HintMetadata = {
    docs: {
        category: Category.accessibility,
        description: getMessage('color_description', 'en'),
        name: getMessage('color_name', 'en')
    },
    /* istanbul ignore next */
    getDescription(language: string) {
        return getMessage('color_description', language);
    },
    /* istanbul ignore next */
    getName(language: string) {
        return getMessage('color_name', language);
    },
    id: 'axe/color',
    schema: [{
        additionalProperties: false,
        properties: {
            'color-contrast': { enum: ['off', 'warning', 'error'], type: 'string' },
            'link-in-text-block': { enum: ['off', 'warning', 'error'], type: 'string' }
        }
    }],
    scope: HintScope.any
};

export default meta;
