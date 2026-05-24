/**
 * This Apache-2.0 licensed file has been modified by Udecode and other
 * contributors. See /packages/diff/LICENSE for more information.
 */

import type { Descendant } from 'platejs';

import { isEqual } from './is-equal';
import { unusedCharGenerator } from './unused-char-generator';

export type StringCharMappingOptions = {
  /**
   * Properties to ignore (deeply) when deciding whether two nodes are the
   * "same node" for the purpose of char mapping. Without this, two nodes
   * with identical content but different transient props (e.g. fresh
   * `id`s assigned by `deserializeMd` on every parse) get mapped to
   * different characters — which prevents DMP from recognising them as
   * equal and forces the whole region into a delete+insert pair.
   *
   * Should be passed the same `ignoreProps` value as the surrounding
   * `ComputeDiffOptions`.
   */
  ignoreProps?: string[];
};

export class StringCharMapping {
  private readonly _charGenerator = unusedCharGenerator();
  private readonly _mappedNodes: [Descendant, string][] = [];
  private readonly _ignoreProps?: string[];

  constructor({ ignoreProps }: StringCharMappingOptions = {}) {
    this._ignoreProps = ignoreProps;
  }

  charToNode(c: string): Descendant {
    const entry = this._mappedNodes.find(([_node, c2]) => c2 === c);

    if (!entry) throw new Error(`No node found for char ${c}`);

    return entry[0];
  }

  nodesToString(nodes: Descendant[]): string {
    return nodes.map(this.nodeToChar.bind(this)).join('');
  }

  nodeToChar(node: Descendant): string {
    // Check for a previously assigned character. Compare with the same
    // `ignoreDeep` semantics the rest of the engine uses so transient
    // props (e.g. fresh ids from deserialisation) don't break structural
    // matching at the char-mapping layer.
    for (const [n, c] of this._mappedNodes) {
      if (isEqual(n, node, { ignoreDeep: this._ignoreProps })) {
        return c;
      }
    }

    const c = this._charGenerator.next().value;
    this._mappedNodes.push([node, c]);

    return c;
  }

  stringToNodes(s: string): Descendant[] {
    return s.split('').map(this.charToNode.bind(this));
  }
}
