"use server";
import Arweave from "arweave";
import { debug } from "@/lib/debug";
import { getChain } from "@/lib/chain";
const chain = getChain();
import { log as logtail } from "@logtail/next";
const log = logtail.with({
  service: "arweave",
  chain,
});
const DEBUG = debug();
const ARWEAVE_KEY_STRING = process.env.ARWEAVE_KEY_STRING;
const ARWEAVE_TEST = process.env.ARWEAVE_TEST;

export async function arweaveHashToUrl(hash: string): Promise<string> {
  return ArweaveService.hashToUrl(hash);
}
export async function arweaveTxStatus(hash: string): Promise<{
  success: boolean;
  data?: any;
  error?: any;
  url: string;
}> {
  if (ARWEAVE_KEY_STRING === undefined) {
    log.error("arweaveTxStatus: ARWEAVE_KEY_STRING is undefined");
    return {
      success: false,
      error: "ARWEAVE_KEY_STRING is undefined",
      url: ArweaveService.hashToUrl(hash),
    };
  }
  if (ARWEAVE_TEST === "true") {
    return {
      success: true,
      data: {
        status: 200,
        confirmed: {
          block_height: 1505770,
          block_indep_hash:
            "kJv_3rXKAwia0AEffu6HwkFii2u5-hyiFgJF1Bu6hq2ehYWMlF3bTabMCrjqL3yE",
          number_of_confirmations: 1,
        },
      },
      url: "https://arweave.net/WYqJVOIBqnVmOzAdlHJ5NE7K6WJnzDWARlxA4iSt11I",
    };
  }
  const arweave = new ArweaveService(ARWEAVE_KEY_STRING);
  return {
    ...(await arweave.status(hash)),
    url: ArweaveService.hashToUrl(hash),
  };
}

async function checkArweaveBalance(
  arweave: ArweaveService
): Promise<number | undefined> {
  const balance = await arweave.balance();
  if (balance === undefined) {
    log.error("checkArweaveBalance: Cannot get arweave balance");
    return undefined;
  }
  const arBalance = Number(balance);
  if (arBalance < 0.25) {
    log.error("checkArweaveBalance: Insufficient arweave balance", {
      balance: arBalance,
    });
  } else {
    log.info("checkArweaveBalance: Sufficient arweave balance", {
      balance: arBalance,
    });
  }
  return arBalance;
}

export async function pinStringToArweave(
  data: string
): Promise<string | undefined> {
  if (ARWEAVE_KEY_STRING === undefined) {
    log.error("pinStringToArweave: ARWEAVE_KEY_STRING is undefined");
    return undefined;
  }

  const arweave = new ArweaveService(
    ARWEAVE_TEST === "true" ? "" : ARWEAVE_KEY_STRING
  );
  const arBalance = await checkArweaveBalance(arweave);
  if (arBalance === undefined) return undefined;

  const hash = await arweave.pinString({
    data,
    waitForConfirmation: false,
  });
  if (hash === undefined) {
    log.error("pinStringToArweave: Arweave pin failed");
    return undefined;
  }
  if (DEBUG)
    console.log("pinStringToArweave url:", ArweaveService.hashToUrl(hash));
  return hash;
}

// export async function pinImageToArweave(
//   file: File
// ): Promise<string | undefined> {
//   if (ARWEAVE_KEY_STRING === undefined) {
//     console.error("ARWEAVE_KEY_STRING is undefined");
//     return undefined;
//   }

//   async function readFileAsync(file: File): Promise<Uint8Array> {
//     return new Promise((resolve, reject) => {
//       const reader = new FileReader();

//       reader.onload = () => {
//         if (reader.result) {
//           resolve(new Uint8Array(reader.result as ArrayBuffer));
//         } else {
//           reject(new Error("File reading failed"));
//         }
//       };

//       reader.onerror = () => reject(new Error("File reading error"));

//       reader.readAsArrayBuffer(file);
//     });
//   }

//   try {
//     const arweave = new ArweaveService(ARWEAVE_KEY_STRING);

//     const binary = await readFileAsync(file);
//     const hash = await arweave.pinFile({
//       data: binary,
//       filename: file.name,
//       size: file.size,
//       mimeType: file.type,
//       waitForConfirmation: false,
//     });

//     if (hash === undefined) throw new Error(`Arweave pin failed`);
//     if (DEBUG)
//       console.log("pinImageToArweave url:", ArweaveService.hashToUrl(hash));
//     return hash;
//   } catch (err) {
//     console.error(err);
//     return undefined;
//   }
// }

export async function pinBase64ImageToArweave(
  imageBase64: string
): Promise<string | undefined> {
  if (ARWEAVE_KEY_STRING === undefined) {
    log.error("ARWEAVE_KEY_STRING is undefined");
    return undefined;
  }

  try {
    const arweave = new ArweaveService(ARWEAVE_KEY_STRING);
    const arBalance = await checkArweaveBalance(arweave);
    if (arBalance === undefined) return undefined;

    const binary = Buffer.from(imageBase64, "base64");
    const hash = await arweave.pinFile({
      data: binary,
      waitForConfirmation: false,
    });

    if (hash === undefined) throw new Error(`Arweave pin failed`);
    if (DEBUG)
      console.log("pinImageToArweave url:", ArweaveService.hashToUrl(hash));
    return hash;
  } catch (err) {
    log.error("pinBase64ImageToArweave error", { error: err });
    return undefined;
  }
}

class ArweaveService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private key: any;
  arweave: Arweave;

  constructor(key: string | object) {
    if (typeof key === "string") {
      if (key === "") this.key = { test: true };
      else this.key = JSON.parse(key);
    } else {
      this.key = key;
    }
    this.arweave = Arweave.init({
      host: "arweave.net",
      port: 443,
      protocol: "https",
    });
  }

  public static hashToUrl(hash: string): string {
    return `https://arweave.net/${hash}`;
  }

  public async pinString(params: {
    data: string;
    waitForConfirmation?: boolean;
  }): Promise<string | undefined> {
    const { data, waitForConfirmation } = params;
    try {
      if (this.key === undefined) {
        log.error("pinString: no key");
        return undefined;
      }
      if (this.key?.test === true)
        return "DE6IatWeT6V6uhmKIVAcGU4mrGVInNkhPM9-A1X_wA4";
      const address = await this.arweave.wallets.jwkToAddress(this.key);
      console.log("address", address);
      const balance = await this.arweave.wallets.getBalance(address);
      if (parseInt(balance) === 0) {
        log.error("pinString: no balance");
        return undefined;
      }

      const transaction = await this.arweave.createTransaction(
        {
          data: Buffer.from(data, "utf8"),
        },
        this.key
      );
      transaction.addTag("Content-Type", "application/json");
      await this.arweave.transactions.sign(transaction, this.key);

      const uploader = await this.arweave.transactions.getUploader(transaction);

      while (!uploader.isComplete) {
        await uploader.uploadChunk();
        if (DEBUG)
          console.log(
            `Arweave: ${uploader.pctComplete}% complete, ${uploader.uploadedChunks}/${uploader.totalChunks}`
          );
      }
      //console.log("transaction", transaction);
      const hash = transaction.id;
      if (DEBUG) console.log("arweave hash", hash);
      if (waitForConfirmation === true) await this.wait({ hash }); // wait for confirmation, can take a while

      return hash;
    } catch (err) {
      log.error("pinString: error", { error: err });
      return undefined;
    }
  }

  public async pinFile(params: {
    data: Uint8Array;
    filename?: string;
    size?: number;
    mimeType?: string;
    // eslint-disable-next-line @typescript-eslint/no-inferrable-types
    waitForConfirmation?: boolean;
  }): Promise<string | undefined> {
    const { data, filename, size, mimeType, waitForConfirmation } = params;
    try {
      if (this.key === undefined) return undefined;
      if (this.key?.test === true)
        return "DE6IatWeT6V6uhmKIVAcGU4mrGVInNkhPM9-A1X_wA4";
      const address = await this.arweave.wallets.jwkToAddress(this.key);
      const balance = await this.arweave.wallets.getBalance(address);
      if (parseInt(balance) === 0) return undefined;

      const transaction = await this.arweave.createTransaction(
        { data: data },
        this.key
      );
      if (mimeType) transaction.addTag("Content-Type", mimeType);
      if (size) transaction.addTag("knownLength", size.toString());
      if (filename) transaction.addTag("filename", filename);
      await this.arweave.transactions.sign(transaction, this.key);
      const uploader = await this.arweave.transactions.getUploader(transaction);

      while (!uploader.isComplete) {
        await uploader.uploadChunk();
        console.log(
          `${uploader.pctComplete}% complete, ${uploader.uploadedChunks}/${uploader.totalChunks}`
        );
      }
      //console.log("transaction", transaction);
      const hash = transaction.id;
      if (DEBUG) console.log("pinFile: arweave hash:", hash);
      if (waitForConfirmation === true) await this.wait({ hash }); // wait for confirmation, can take a while
      return hash;
    } catch (err) {
      log.error("pinFile: error", { error: err });
      return undefined;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async status(hash: string) {
    try {
      const status = await this.arweave.transactions.getStatus(hash);
      return { success: true, data: status };
    } catch (err) {
      log.error("status: error", { error: err });
      return { success: false, error: err };
    }
  }

  public async wait(data: {
    hash: string;
    maxAttempts?: number;
    interval?: number;
    maxErrors?: number;
  }): Promise<{
    success: boolean;
    error?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result?: any;
  }> {
    const maxAttempts = data?.maxAttempts ?? 360;
    const interval = data?.interval ?? 5000;
    const maxErrors = data?.maxErrors ?? 10;
    const errorDelay = 30000; // 30 seconds
    let attempts = 0;
    let errors = 0;
    while (attempts < maxAttempts) {
      const result = await this.status(data.hash);
      if (result.success === false) {
        errors++;
        if (errors > maxErrors) {
          log.error("arweave wait: Too many network errors", {
            errors,
            maxErrors,
          });
          return {
            success: false,
            error: "Too many network errors",
            result: undefined,
          };
        }
        await sleep(errorDelay * errors);
      } else {
        if (result.data?.confirmed?.block_height !== undefined) {
          return {
            success: result.success,
            result: result.data,
          };
        }
        await sleep(interval);
      }
      attempts++;
    }
    log.error("arweave wait: Timeout", {
      hash: data.hash,
      maxAttempts,
      interval,
    });
    return {
      success: false,
      error: "Timeout",
      result: undefined,
    };
  }

  public async balance(): Promise<string | undefined> {
    const address = await this.arweave.wallets.jwkToAddress(this.key);
    const balance = await this.arweave.wallets.getBalance(address);
    const ar = this.arweave.ar.winstonToAr(balance);
    return ar;
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
