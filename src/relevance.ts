/**
 * Engram v2.2 - Task-Aware Retrieval Routing
 *
 * Reranks search candidates based on task context, access history,
 * graph relationships, and content-type matching.
 */

import {
  SearchResult,
  MemoryNode,
  TaskContext,
  AccessEntry,
  RerankOptions,
} from './types';
import { MemoryGraph } from './graph';

// ============== INTENT-TAG MAPPING ==============

/**
 * Maps task intents to tags that are considered relevant.
 * A node whose tags overlap with these gets boosted.
 */
const INTENT_TAG_MAP: Record<string, string[]> = {
  debugging: [
    'error', 'bug', 'fix', 'error-fix', 'debug', 'stack-trace',
    'exception', 'crash', 'issue', 'patch', 'hotfix', 'workaround',
  ],
  preference_recall: [
    'preference', 'setting', 'config', 'choice', 'favorite',
    'default', 'option', 'personal', 'habit',
  ],
  fact_lookup: [
    'fact', 'definition', 'reference', 'spec', 'documentation',
    'api', 'standard', 'protocol', 'specification',
  ],
  research: [
    'research', 'study', 'analysis', 'paper', 'finding',
    'evidence', 'data', 'experiment', 'hypothesis', 'review',
  ],
  planning: [
    'plan', 'roadmap', 'milestone', 'goal', 'task', 'todo',
    'schedule', 'deadline', 'sprint', 'backlog', 'strategy',
  ],
};

// ============== DOMAIN-CONTENT MAPPING ==============

/**
 * Maps task domains to preferred content types.
 */
const DOMAIN_CONTENT_MAP: Record<string, string[]> = {
  code: ['code'],
  personal: ['text'],
  research: ['text'],
  general: ['text', 'code'],
};

// ============== RERANK ==============

/**
 * Rerank search candidates using task context signals.
 *
 * Scoring adjustments (additive):
 * 1. Tag-intent matching
 * 2. Access pattern scoring (recency-weighted usefulness)
 * 3. Graph neighbor boost
 * 4. Content-type matching
 *
 * If candidates is empty or options has no meaningful signals, the original
 * order is preserved.
 */
export function rerankWithContext(
  candidates: SearchResult[],
  options: RerankOptions,
  graph?: MemoryGraph,
  recentNodeIds?: string[],
): SearchResult[] {
  if (candidates.length === 0) {
    return candidates;
  }

  const {
    taskContext,
    graphNeighborBoost = 0.1,
    intentMatchBoost = 0.15,
    accessPatternWeight = 0.1,
  } = options;

  const recentSet = new Set(recentNodeIds ?? []);

  // Pre-compute the set of neighbor node IDs for graph boosting.
  // A candidate gets a boost if it is linked to any recently-accessed node.
  let graphNeighborSet: Set<string> | null = null;
  if (graph && recentSet.size > 0) {
    graphNeighborSet = new Set<string>();
    for (const recentId of recentSet) {
      const linked = graph.getLinkedNodes(recentId);
      for (const node of linked) {
        graphNeighborSet.add(node.id);
      }
    }
  }

  const relevantTags = INTENT_TAG_MAP[taskContext.intent] ?? [];
  const preferredContentTypes = taskContext.domain
    ? (DOMAIN_CONTENT_MAP[taskContext.domain] ?? [])
    : [];

  const reranked = candidates.map((result) => {
    let boost = 0;

    // 1. Tag-intent matching
    const nodeTags = result.node.metadata.tags ?? [];
    if (relevantTags.length > 0 && nodeTags.length > 0) {
      const overlap = nodeTags.some((t) => relevantTags.includes(t));
      if (overlap) {
        boost += intentMatchBoost;
      }
    }

    // 2. Access pattern scoring (recency-weighted usefulness)
    const accessLog = result.node.metadata.accessLog;
    if (accessLog && accessLog.length > 0) {
      boost += computeAccessPatternScore(
        accessLog,
        taskContext.intent,
        accessPatternWeight,
      );
    }

    // 3. Graph neighbor boost
    if (graphNeighborSet && graphNeighborSet.has(result.node.id)) {
      boost += graphNeighborBoost;
    }

    // 4. Content-type matching
    if (preferredContentTypes.length > 0) {
      if (preferredContentTypes.includes(result.node.content.type)) {
        boost += 0.05;
      }
    }

    return {
      ...result,
      score: result.score + boost,
    };
  });

  // Re-sort by adjusted score (descending)
  reranked.sort((a, b) => b.score - a.score);
  return reranked;
}

// ============== ACCESS PATTERN SCORING ==============

/**
 * Compute an additive score from the access log.
 *
 * Recent entries carry more weight (exponential decay over time).
 * Entries matching the current intent and marked useful get a positive signal.
 * Entries matching the current intent and marked not useful get a negative signal.
 * Non-matching intents contribute nothing.
 */
function computeAccessPatternScore(
  accessLog: AccessEntry[],
  currentIntent: string,
  weight: number,
): number {
  const now = Date.now();
  const ONE_DAY_MS = 86_400_000;
  let signal = 0;
  let totalWeight = 0;

  for (const entry of accessLog) {
    // Only consider entries with matching intent
    if (entry.intent !== currentIntent) continue;
    if (entry.useful === undefined) continue;

    const daysSince = Math.max(0, (now - entry.timestamp) / ONE_DAY_MS);
    const recencyWeight = Math.exp(-0.1 * daysSince);

    if (entry.useful) {
      signal += recencyWeight;
    } else {
      signal -= 0.5 * recencyWeight; // smaller penalty than reward
    }
    totalWeight += recencyWeight;
  }

  if (totalWeight === 0) return 0;

  // Normalize to [-1, 1] range, then scale by weight
  const normalized = signal / totalWeight;
  return normalized * weight;
}

// ============== RECORD ACCESS ==============

/**
 * Record an access event on a memory node.
 * Appends to the node's accessLog and updates temporal.accessed.
 * Returns a new node (immutable update).
 */
export function recordAccess(
  node: MemoryNode,
  intent?: string,
  useful?: boolean,
): MemoryNode {
  const now = Date.now();
  const entry: AccessEntry = { timestamp: now };
  if (intent !== undefined) {
    entry.intent = intent;
  }
  if (useful !== undefined) {
    entry.useful = useful;
  }

  const existingLog = node.metadata.accessLog ?? [];

  return {
    ...node,
    temporal: {
      ...node.temporal,
      accessed: now,
    },
    metadata: {
      ...node.metadata,
      accessLog: [...existingLog, entry],
    },
  };
}
