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
    //
    // When an equivalent entry already exists, OVERWRITE its node reference
    // with the latest occurrence. `nodesToString` is called doc0 first, then
    // doc1, so this makes doc1's representation win for any node that exists
    // in both docs. That matters for unchanged chars: the diff is presented
    // as "doc1 with deletes/inserts marked", and downstream consumers
    // (`stringToNodes` lookups for OP_UNCHANGED) expect doc1's version —
    // otherwise a node whose only difference was an ignored prop (id,
    // pairId, suggestion id, etc.) would silently revert to doc0's value
    // in the output. Deletes still resolve to the correct doc0 node
    // because they never match an existing entry; inserts get fresh chars
    // by definition.
    for (const entry of this._mappedNodes) {
      if (isEqual(entry[0], node, { ignoreDeep: this._ignoreProps })) {
        entry[0] = node;
        return entry[1];
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
