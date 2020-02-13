import camelCase = require('lodash/camelCase');
import messages = require('../../dist/bundle/_locales/en/messages.json');

type GetMessage = typeof import('@hint/utils-i18n').getMessage;

export const getMessage: GetMessage = (key, path, options?) => {
    /*
     * Path will be something like:
     * ..\hint-axe\dist\src
     * or
     * ../hint-axe/dist/src
     */
    const pathParts = path.split(/\\|\//g);
    const packageName = pathParts[pathParts.length - 3];
    const prefix = camelCase(packageName);
    const substitutions = options && options.substitutions;
    const name = `${prefix}_${key}`;

    if (!(messages as any)[name]) {
        console.log('Name', name);
        console.log('Message', messages);
    }

    return (messages as any)[name].message + (substitutions || '');
};
