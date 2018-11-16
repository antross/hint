import { AST } from 'eslint';
import SourceCode = require('eslint/lib/util/source-code');
import * as espree from 'espree';

import * as logger from 'hint/dist/src/lib/utils/logging';
import { determineMediaTypeForScript } from 'hint/dist/src/lib/utils/content-type';
import { IAsyncHTMLElement, ElementFound, FetchEnd, Parser } from 'hint/dist/src/lib/types';
import { ScriptEvents } from './types';
import { Engine } from 'hint';

export * from './types';

const scriptContentRegex: RegExp = /^<script[^>]*>([\s\S]*)<\/script>$/;
// This is the default configuration in eslint for espree.
const defaultParserOptions = {
    comment: true,
    ecmaVersion: 8,
    loc: true,
    range: true,
    tokens: true
};

export default class JavascriptParser extends Parser<ScriptEvents> {
    public constructor(engine: Engine<ScriptEvents>) {
        super(engine, 'javascript');

        engine.on('fetch::end::script', this.parseJavascript.bind(this));
        engine.on('element::script', this.parseJavascriptTag.bind(this));
    }

    private async emitScript(code: string, resource: string) {
        try {
            await this.engine.emitAsync(`parse::start::javascript`, { resource });

            const ast: AST.Program = espree.parse(code, defaultParserOptions);

            await this.engine.emitAsync(`parse::end::javascript`, {
                ast,
                resource,
                sourceCode: new SourceCode(code, ast)
            });
        } catch (err) {
            logger.error(`Error parsing JS code: ${code}`);
        }
    }

    private async parseJavascript(fetchEnd: FetchEnd) {
        const code = fetchEnd.response.body.content;
        const resource = fetchEnd.resource;

        await this.emitScript(code, resource);
    }

    private hasSrcAttribute(element: IAsyncHTMLElement) {
        const src = element.getAttribute('src');

        return !!src;
    }


    private isJavaScriptType(element: IAsyncHTMLElement) {
        const type = determineMediaTypeForScript(element);

        return !!type;
    }

    private getScriptContent(scriptTagText: string) {
        const match = scriptTagText.match(scriptContentRegex);

        if (!match) {
            // QUESTION: throw an exception?
            return '';
        }

        return match[1].trim();
    }

    private async parseJavascriptTag(elementFound: ElementFound) {
        const element: IAsyncHTMLElement = elementFound.element;

        if (this.hasSrcAttribute(element)) {
            // Ignore because this will be (or have been) processed in the event 'fetch::end::script'.
            return;
        }

        if (!this.isJavaScriptType(element)) {
            // Ignore if it is not javascript.
            return;
        }

        const code = this.getScriptContent(await element.outerHTML());
        const resource: string = 'Internal javascript';

        await this.emitScript(code, resource);
    }
}
