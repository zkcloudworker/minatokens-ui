import { zkCloudWorkerClient } from "zkcloudworker";
import { getChain } from "../chain";

const ZKCW_JWT = process.env.ZKCW_JWT;
const chain = getChain();

export async function getResult(
  jobId: string
): Promise<{ success: boolean; error?: string; tx?: string; hash?: string }> {
  if (ZKCW_JWT === undefined) throw new Error("ZKCW_JWT is undefined");
  try {
    const client: zkCloudWorkerClient = new zkCloudWorkerClient({
      jwt: ZKCW_JWT,
      chain,
    });

    const callResult = await client.jobResult({ jobId });
    if (!callResult.success) {
      return { success: false, error: callResult.error };
    }
    const jobResult = callResult.result?.result;
    if (!jobResult) return { success: true };

    if (jobResult.toLowerCase().startsWith("error")) {
      console.log("jobResult error:", jobResult);
      return { success: false, error: jobResult };
    }

    try {
      const { success, tx, hash, error } = JSON.parse(jobResult);
      if (success === undefined) return { success: false, tx, hash, error };
      return { success, tx, hash, error };
    } catch (e) {
      return {
        success: false,
        error: `Error parsing job result: ${jobResult}`,
      };
    }
  } catch (e) {
    return { success: false, error: `Error getting job result: ${e}` };
  }
}
