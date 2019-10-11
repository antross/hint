import { Options, Parser } from 'acorn';
import { Node } from './estree-jsx';

import { HTMLElement } from '@hint/utils/dist/src/dom';
import * as logger from '@hint/utils/dist/src/logging';
import { determineMediaTypeForScript } from '@hint/utils/dist/src/content-type';
import { ElementFound, FetchEnd, Parser as WebhintParser } from 'hint/dist/src/lib/types';
import { Engine } from 'hint/dist/src/lib/engine';

import { ScriptEvents } from './types';
import { prepareWalk, performWalk } from './walk';

export * from './types';

const jsx = require('acorn-jsx');
const jsParser = Parser.extend();
const jsxParser = Parser.extend(jsx());

export default class JavascriptParser extends WebhintParser<ScriptEvents> {
    public constructor(engine: Engine<ScriptEvents>) {
        super(engine, 'javascript');

        engine.on('fetch::end::script', this.parseJavascript.bind(this));
        engine.on('element::script', this.parseJavascriptTag.bind(this));
    }

    private async emitScript(parser: typeof Parser, sourceCode: string, resource: string, element: HTMLElement | null) {
        try {
            await this.engine.emitAsync(`parse::start::javascript`, { resource });

            const options: Options = { locations: true, ranges: true };
            const ast = parser.parse(sourceCode, options) as Node;
            const tokens = [...parser.tokenizer(sourceCode, options)];

            const { walk, walkArrays } = prepareWalk();

            const emits = this.engine.emitAsync(`parse::end::javascript`, {
                ast,
                element,
                resource,
                sourceCode,
                tokens,
                walk
            });

            performWalk(walkArrays);

            await emits;

        } catch (err) {
            logger.error(`Error parsing JS code (${err}): ${sourceCode}`);
        }
    }

    private async parseJavascript(fetchEnd: FetchEnd) {
        const code = fetchEnd.response.body.content;
        const resource = fetchEnd.resource;
        const type = fetchEnd.response.mediaType;
        const parser = type === 'text/jsx' ? jsxParser : jsParser;

        logger.log(`Parsing "${type}" from ${resource}`);

        await this.emitScript(parser, code, resource, null);
    }

    private hasSrcAttribute(element: HTMLElement) {
        const src = element.getAttribute('src');

        return !!src;
    }


    private isJavaScriptType(element: HTMLElement) {
        const type = determineMediaTypeForScript(element);

        return !!type;
    }

    private async parseJavascriptTag({ element, resource }: ElementFound) {
        if (this.hasSrcAttribute(element)) {
            // Ignore because this will be (or have been) processed in the event 'fetch::end::script'.
            return;
        }

        if (!this.isJavaScriptType(element)) {
            // Ignore if it is not javascript.
            return;
        }

        await this.emitScript(jsParser, element.innerHTML, resource, element);
    }
}
