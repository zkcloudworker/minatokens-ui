"use server";
import { apiHandler } from "@/lib/api/api";
import { generateApiKey, KeyParams, KeyResponse } from "@/lib/api/key";

export default apiHandler<KeyParams, KeyResponse>({
  name: "key",
  handler: generateApiKey,
  isInternal: true,
});
