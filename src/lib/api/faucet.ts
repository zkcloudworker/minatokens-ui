"use server";
import {
  ApiResponse,
  FaucetParams,
  FaucetResponse,
  TxStatus,
} from "@minatokens/api";
import { checkAddress } from "./address";
import { getChain } from "@/lib/chain";
const chain = getChain();

export async function faucet(
  params: FaucetParams,
  apiKeyAddress: string
): Promise<ApiResponse<FaucetResponse>> {
  const { address } = params;
  try {
    if (!address || !checkAddress(address)) {
      return {
        status: 400,
        json: { error: "Invalid address" },
      };
    }
    if (chain === "mainnet") {
      return {
        status: 400,
        json: { error: "Faucet not available on mainnet" },
      };
    }
    if (chain !== "devnet" && chain !== "zeko") {
      return {
        status: 400,
        json: { error: `Chain ${chain} not supported` },
      };
    }

    if (chain === "devnet") {
      try {
        const response = await fetch(
          "https://faucet.minaprotocol.com/api/v1/faucet",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              address,
              network: "devnet",
            }),
          }
        );
        if (!response.ok) {
          return {
            status: 503,
            json: { error: (await response.json()).status },
          };
        }
        const result = await response.json();
        /*
          {
            status: 'success',
            message: { paymentID: '5JtdptLKf4Juvij7vHXkB3RQvDMq9UALV2Vt74t2ZkeKVC3dqVYS' }
          }
        */
        console.log("faucet result:", result);
        if (result?.status === "success" && result?.message?.paymentID) {
          return {
            status: 200,
            json: { success: true, hash: result.message.paymentID },
          };
        } else {
          return {
            status: 503,
            json: {
              error:
                result?.status ??
                (result?.message ? String(result.message) : "unknown error"),
            },
          };
        }
      } catch (error) {
        console.error("faucet error:", error);
        return {
          status: 503,
          json: { error: "faucet is not available" },
        };
      }
    }

    if (chain === "zeko") {
      try {
        const response = await fetch("https://zeko-faucet-a1ct.onrender.com/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            address,
          }),
        });
        if (!response.ok) {
          const result = await response.text();
          console.error("Zeko faucet error:", { address, result });
          return {
            status: 503,
            json: { error: result },
          };
        }
        const result = await response.text();
        if (result === "Successfully sent") {
          return { status: 200, json: { success: true } };
        } else {
          return { status: 503, json: { error: result } };
        }
      } catch (error: any) {
        console.error("Zeko faucet error:", error);
        return {
          status: 503,
          json: { error: "faucet error " + (error?.message ?? "") },
        };
      }
    }
    return { status: 500, json: { error: "unknown error" } };
  } catch (error: any) {
    console.error("faucet catch", error);
    return {
      status: 500,
      json: {
        error: error?.message ?? (error ? String(error) : "unknown error"),
      },
    };
  }
}
