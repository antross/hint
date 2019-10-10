/**
 * @fileoverview webhint parser needed to analyze HTML contained within JSX files.
 */
import * as parse5 from 'parse5';
import * as htmlparser2Adapter from 'parse5-htmlparser2-tree-adapter';
import { HTMLDocument } from '@hint/utils/dist/src/dom/html';
import { restoreReferences } from '@hint/utils/dist/src/dom/snapshot';
import { DocumentData, ElementData } from '@hint/utils/dist/src/types/snapshot';
import { Parser } from 'hint/dist/src/lib/types';
import { Engine } from 'hint/dist/src/lib/engine';
import { HTMLEvents } from '@hint/parser-html';
import { JSXElement, Node, ScriptEvents } from '@hint/parser-javascript';

const mapAttributes = (node: JSXElement) => {
    const attribs: { [name: string]: string } = {};

    for (const attribute of node.openingElement.attributes) {
        if (attribute.type !== 'JSXAttribute') {
            continue; // TODO: Do something useful with JSXSpreadAttribute instances.
        }
        if (attribute.name.type !== 'JSXIdentifier') {
            continue;
        }
        if (attribute.value && attribute.value.type !== 'Literal') {
            continue; // TODO: Should we add placeholder text for JSXExpressionContainer?
        }

        attribs[attribute.name.name] = `${attribute.value ? attribute.value.value : ''}`;
    }

    return attribs;
};

const mapLocation = (node: Node): parse5.Location => {
    return {
        endCol: node.loc && node.loc.end.column || -1,
        endLine: node.loc && node.loc.end.line || -1,
        endOffset: node.range && node.range[1] || -1,
        startCol: node.loc && node.loc.start.column || -1,
        startLine: node.loc && node.loc.start.line || -1,
        startOffset: node.range && node.range[0] || -1
    };
};

export default class JSXParser extends Parser<HTMLEvents> {

    public constructor(engine: Engine<HTMLEvents & ScriptEvents>) {
        super(engine, 'html');

        engine.on('parse::end::javascript', async ({ ast, resource, walk }) => {
            await this.engine.emitAsync(`parse::start::html`, { resource });

            const roots = new Map<JSXElement, ElementData>();
            const elements = new Map<JSXElement, ElementData>();

            await walk.ancestor(ast, {
                JSXElement(node, ancestors = []) {
                    if (node.openingElement.name.type !== 'JSXIdentifier') {
                        return; // Ignore JSXMemberExpression and JSXNamespacedName.
                    }

                    const { name } = node.openingElement.name;

                    if (name[0] !== name[0].toLowerCase()) {
                        return;
                    }

                    const data: ElementData = {
                        attribs: mapAttributes(node),
                        children: [],
                        name,
                        next: null,
                        parent: null,
                        prev: null,
                        sourceCodeLocation: {
                            attrs: {},
                            endTag: node.closingElement ? mapLocation(node.closingElement) : undefined as any, // TODO: Fix types to allow undefined (matches parse5 behavior)
                            startTag: {
                                attrs: {},
                                ...mapLocation(node.openingElement)
                            },
                            ...mapLocation(node)
                        },
                        type: 'tag',
                        'x-attribsNamespace': {},
                        'x-attribsPrefix': {}
                    };

                    const parent = ancestors
                        .slice()
                        .reverse()
                        .filter((ancestor) => {
                            return ancestor.type === 'JSXElement' && elements.has(ancestor);
                        })[0];

                    elements.set(node, data);

                    if (parent) {
                        const parentData = elements.get(parent as JSXElement)!;

                        parentData.children.push(data);
                    } else {
                        roots.set(node, data);
                    }
                }
            });

            const dom = parse5.parse(
                `<!doctype html><html data-webhint-fragment></html>`,
                { treeAdapter: htmlparser2Adapter }
            ) as DocumentData;

            const body = (dom.children[1] as ElementData).children[1] as ElementData;

            roots.forEach((root) => {
                body.children.push(root);
            });

            restoreReferences(dom);

            const document = new HTMLDocument(dom, resource);
            const html = `<!doctype html>\n${document.documentElement.outerHTML}`;

            console.log('Generated fake html:', html);

            await this.engine.emitAsync('parse::end::html', { document, html, resource });
        });
    }
}
