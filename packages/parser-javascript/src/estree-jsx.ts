/* eslint-disable @typescript-eslint/interface-name-prefix */

// Based on https://github.com/facebook/jsx/blob/master/AST.md

import {
    Expression,
    Identifier,
    Literal,
    SpreadElement
} from 'estree';

type Omit<Props, T> = Pick<T, Exclude<keyof T, Props>>;

export type JSXNode =
    JSXIdentifier | JSXNamespacedName | JSXMemberExpression |
    JSXEmptyExpression | JSXExpressionContainer | JSXSpreadAttribute |
    JSXAttribute | JSXOpeningElement | JSXOpeningFragment |
    JSXClosingElement | JSXClosingFragment | JSXElement | JSXFragment |
    JSXText;

interface SourceLocation {
    source?: string | null;
    start: Position;
    end: Position;
}

interface Position {
    /** >= 1 */
    line: number;
    /** >= 0 */
    column: number;
}

interface BaseNode {
    leadingComments?: Array<Comment>;
    trailingComments?: Array<Comment>;
    type: string;
    loc?: SourceLocation | null;
    range?: [number, number];
}

export interface JSXIdentifier extends Omit<'type', Identifier> {
    type: 'JSXIdentifier';
}

export interface JSXMemberExpression extends Omit<'type', Expression> {
    type: 'JSXMemberExpression';
}

export interface JSXNamespacedName extends Omit<'type', Expression> {
    type: 'JSXNamespacedName';
}

export interface JSXEmptyExpression extends BaseNode {
    type: 'JSXEmptyExpression';
}

export interface JSXExpressionContainer extends BaseNode {
    type: 'JSXExpressionContainer';
    expression: Expression | JSXEmptyExpression;
}

export interface JSXSpreadChild extends BaseNode {
    type: 'JSXSpreadChild';
    expression: Expression;
}

interface JSXBoundaryElement extends BaseNode {
    name: JSXIdentifier | JSXMemberExpression | JSXNamespacedName;
}

export interface JSXOpeningElement extends JSXBoundaryElement {
    type: 'JSXOpeningElement';
    attributes: (JSXAttribute | JSXSpreadAttribute)[];
    selfClosing: boolean;
}

export interface JSXClosingElement extends JSXBoundaryElement {
    type: 'JSXClosingElement';
}

export interface JSXAttribute extends BaseNode {
    type: 'JSXAttribute';
    name: JSXIdentifier | JSXNamespacedName;
    value: Literal | JSXExpressionContainer | JSXElement | JSXFragment | null;
}

export interface JSXSpreadAttribute extends Omit<'type', SpreadElement> {
    type: 'JSXSpreadAttribute';
}

export interface JSXText extends BaseNode {
    type: 'JSXText';
    value: string;
    raw: string;
}

export interface JSXElement extends Omit<'type', Expression> {
    type: 'JSXElement';
    openingElement: JSXOpeningElement;
    children: (JSXText | JSXExpressionContainer | JSXSpreadChild | JSXElement | JSXFragment)[];
}

export interface JSXFragment extends Omit<'type', Expression> {
    type: 'JSXFragment';
    openingFragment: JSXOpeningFragment;
    children: (JSXText | JSXExpressionContainer | JSXSpreadChild | JSXElement | JSXFragment)[];
    closingFragment: JSXClosingFragment;
}

export interface JSXOpeningFragment extends BaseNode {
    type: 'JSXOpeningFragment';
}

export interface JSXClosingFragment extends BaseNode {
    type: 'JSXClosingFragment';
}
