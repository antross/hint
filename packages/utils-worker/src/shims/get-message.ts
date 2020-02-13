import camelCase = require('lodash/camelCase');

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

    // TODO: Get actual localized message.
    return `${prefix}_${key} ${substitutions}`;
};
