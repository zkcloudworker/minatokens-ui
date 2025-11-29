"use server";
/**
 * Helper module to manage activity context for transactions
 * This bridges the gap between transaction creation and transaction sending
 */

import { ActivityType } from "@prisma/client";
import { ActivityData } from "./activity-types";
import { ActivityContext } from "./send";

// In-memory store for activity contexts indexed by jobId
// This is temporary storage until we send the transaction
const activityContextStore = new Map<string, ActivityContext>();

/**
 * Store activity context for a job
 * Called after creating a transaction with a jobId
 */
export function storeActivityContext(
  jobId: string,
  context: ActivityContext
): void {
  activityContextStore.set(jobId, context);
}

/**
 * Retrieve and remove activity context for a job
 * Called when sending the transaction
 */
export function getActivityContext(jobId: string): ActivityContext | undefined {
  const context = activityContextStore.get(jobId);
  if (context) {
    activityContextStore.delete(jobId); // Clean up after retrieval
  }
  return context;
}

/**
 * Clear activity context (in case transaction fails before sending)
 */
export function clearActivityContext(jobId: string): void {
  activityContextStore.delete(jobId);
}

/**
 * Get all stored contexts (for debugging)
 */
export function getAllStoredContexts(): Map<string, ActivityContext> {
  return new Map(activityContextStore);
}

/**
 * Clear old contexts (cleanup job - contexts older than 1 hour)
 */
const contextTimestamps = new Map<string, number>();

export function storeActivityContextWithTimestamp(
  jobId: string,
  context: ActivityContext
): void {
  activityContextStore.set(jobId, context);
  contextTimestamps.set(jobId, Date.now());
}

export function cleanupOldContexts(maxAgeMs: number = 3600000): number {
  // 1 hour default
  const now = Date.now();
  let cleaned = 0;

  for (const [jobId, timestamp] of contextTimestamps.entries()) {
    if (now - timestamp > maxAgeMs) {
      activityContextStore.delete(jobId);
      contextTimestamps.delete(jobId);
      cleaned++;
    }
  }

  return cleaned;
}
