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
  /**
   * Structural-identity resolver. Two nodes that should be treated as "the
   * same block" for DMP alignment (even though they differ in some props,
   * e.g. a renamed activity) return the same key here. The char mapper then
   * matches a doc1 node to the doc0 entry that shares its structural key,
   * assigning the SAME char so DMP keeps them paired instead of emitting a
   * whole-container delete+insert. The per-element `getDiffStrategy` later
   * surfaces the prop difference as a granular update. Unlike `ignoreProps`
   * (which only relaxes byte-equality), this works across props that DID
   * change — which is exactly the update case.
   */
  getStructuralKey?: (node: Descendant) => string | undefined;
};

export class StringCharMapping {
  private readonly _charGenerator = unusedCharGenerator();
  private readonly _mappedNodes: [Descendant, string][] = [];
  private readonly _ignoreProps?: string[];
  private readonly _getStructuralKey?: (node: Descendant) => string | undefined;
  /**
   * Char → the doc0-side node that established a structural pairing. When a
   * doc1 node maps to the same char by structural identity (NOT byte
   * equality), we do NOT overwrite `_mappedNodes` — that would orphan the
   * doc0 node and make every consumer of `charToNode` see only the new
   * side. Instead we record the doc0 node here so block-mode pairing can
   * recover BOTH halves for the per-element strategy (granular update).
   */
  private readonly _structuralPairOld = new Map<string, Descendant>();
  /**
   * The two source docs, recorded by `computeDiff` before diffing so the
   * descendant transform can resolve the NEW side of a structural pairing by
   * position (the char map itself only ever resolves the old side).
   */
  sourceDoc0?: Descendant[];
  sourceDoc1?: Descendant[];

  constructor({
    ignoreProps,
    getStructuralKey,
  }: StringCharMappingOptions = {}) {
    this._ignoreProps = ignoreProps;
    this._getStructuralKey = getStructuralKey;
  }

  /**
   * The doc0-side node paired with `c` by structural identity, if this char
   * was shared across a byte-UNEQUAL (old, new) pair. `undefined` for
   * byte-equal chars and for any char that isn't a structural pairing.
   */
  structuralOldForChar(c: string): Descendant | undefined {
    return this._structuralPairOld.get(c);
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

    // Structural-identity match: fall back to matching a prior entry by
    // shared structural key. A doc1 node that isn't byte-equal to its doc0
    // sibling (e.g. a renamed activity) but shares its structural identity
    // is assigned the SAME char, so DMP keeps the two paired as "unchanged"
    // and the per-element strategy marks just the changed props.
    //
    // CRITICAL: we do NOT overwrite the `_mappedNodes` entry here (unlike
    // the byte-equality path above). The paired (old, new) nodes are NOT
    // interchangeable — that is precisely the update case — so the char
    // must keep resolving to doc0's node. We record the doc0 node in
    // `_structuralPairOld` and hand the doc1 node through by keeping it as
    // a separate mapping that shares the char; block-mode pairing reads
    // BOTH sides via `structuralOldForChar` + the new-side nodes array.
    if (this._getStructuralKey) {
      const key = this._getStructuralKey(node);
      if (key !== undefined) {
        for (const entry of this._mappedNodes) {
          if (this._getStructuralKey(entry[0]) === key) {
            // First time this char is shared across a byte-unequal pair:
            // `entry[0]` is the doc0 node. Stash it, then hand the new
            // node the same char WITHOUT displacing the old mapping.
            if (!this._structuralPairOld.has(entry[1])) {
              this._structuralPairOld.set(entry[1], entry[0]);
            }
            return entry[1];
          }
        }
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
