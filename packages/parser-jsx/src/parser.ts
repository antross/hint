/**
 * @fileoverview webhint parser needed to analyze HTML contained within JSX files.
 */

import { HTMLDocument } from '@hint/utils/dist/src/dom/html';
import { ElementData } from '@hint/utils/dist/src/types/snapshot';
import { Parser } from 'hint/dist/src/lib/types';
import { Engine } from 'hint/dist/src/lib/engine';
import { HTMLEvents } from '@hint/parser-html';
import { JSXElement, ScriptEvents } from '@hint/parser-javascript';

export default class JSXParser extends Parser<HTMLEvents> {

    public constructor(engine: Engine<HTMLEvents & ScriptEvents>) {
        super(engine, 'html');

        engine.on('parse::end::javascript', async ({ ast, resource, walk }) => {
            await this.engine.emitAsync(`parse::start::html`, { resource });

            const elements = new Map<JSXElement, ElementData>();

            walk.ancestor(ast, {
                JSXElement(node, ancestors) {
                    if (!('name' in node.openingElement.name)) {
                        return;
                    }

                    const { name } = node.openingElement.name;

                    if (name[0] !== name[0].toLowerCase()) {
                        return;
                    }

                    elements.set(node, {
                        attribs: {},
                        children: [],
                        name,
                        next: null,
                        parent: null,
                        prev: null,
                        sourceCodeLocation: {
                            attrs: {},
                            endCol: node.loc && node.loc.end.column || -1,
                            endLine: node.loc && node.loc.end.line || -1,
                            endOffset: node.range && node.range[1] || -1,
                            endTag: {
                                endCol: 0,
                                endLine: 0,
                                endOffset: 0,
                                startCol: 0,
                                startLine: 0,
                                startOffset: 0
                            },
                            startCol: node.loc && node.loc.start.column || -1,
                            startLine: node.loc && node.loc.start.line || -1,
                            startOffset: node.range && node.range[0] || -1,
                            startTag: {
                                attrs: {},
                                endCol: 0,
                                endLine: 0,
                                endOffset: 0,
                                startCol: 0,
                                startLine: 0,
                                startOffset: 0
                            }
                        },
                        type: 'tag',
                        'x-attribsNamespace': {},
                        'x-attribsPrefix': {}
                    });
                }
            });

            const data: any;

            const document = new HTMLDocument(data, resource);
            const html = `<!doctype html>\n${document.documentElement.outerHTML}`;

            await this.engine.emitAsync('parse::end::html', { document, html, resource });
        });
    }
}
