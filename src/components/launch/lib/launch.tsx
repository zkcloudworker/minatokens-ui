import { LaunchTokenData, MintAddressVerified } from "@/lib/token";
import { checkMintData } from "@/lib/address";
import { getChain, getChainId } from "@/lib/chain";
import { getWalletInfo } from "@/lib/wallet";
import { getSystemInfo } from "@/lib/system-info";
import { debug } from "@/lib/debug";
import { deployToken } from "./deploy";
import { mintToken } from "@/lib/mint";
import { TimelineItem, LogListItem, TimelineStatus } from "../TimeLine";
import { pinImageToArweave, pinStringToArweave } from "@/lib/arweave";
import { arweaveHashToUrl } from "@/lib/arweave";
import { TokenInfo } from "@/lib/token";
import { sendTransaction } from "@/lib/send";
import { messages, LogItemId, MessageId } from "./messages";
import { loadLib } from "./libraries";
import { waitForArweaveTx } from "./arweave-tx";
import { getAccountNonce } from "@/lib/nonce";
import {
  waitForProveJob,
  waitForContractVerification,
  waitForMinaDeployTx,
} from "./mina-tx";
import { deployTokenParams } from "@/lib/keys";
import { ReactNode } from "react";
const AURO_TEST = process.env.NEXT_PUBLIC_AURO_TEST === "true";
const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_PK;
const chainId = getChainId();
const chain = getChain();
const DEBUG = debug();

export async function launchToken(params: {
  data: LaunchTokenData;
  addLog: (item: TimelineItem) => void;
  updateLogList: (params: {
    id: string;
    detailId: string;
    update: ReactNode;
    status?: TimelineStatus;
  }) => void;
  setTotalSupply: (totalSupply: number) => void;
  setTokenAddress: (tokenAddress: string) => void;
  setLikes: (likes: number) => void;
}) {
  const {
    data,
    addLog,
    updateLogList: updateLogListInternal,
    setTotalSupply,
    setTokenAddress,
    setLikes,
  } = params;
  const {
    symbol,
    name,
    description,
    links,
    image,
    imageURL,
    adminAddress,
    mintAddresses,
  } = data;
  const { twitter, telegram, website, discord, instagram } = links;
  let likes = 10;

  if (AURO_TEST) {
    if (ADMIN_ADDRESS === undefined) {
      console.error("ADMIN_ADDRESS is not set");
      return;
    }
  }

  function updateLogList(params: {
    id: LogItemId;
    itemToUpdate: MessageId;
    updatedItem: ReactNode;
    status?: TimelineStatus;
  }): void {
    const { id, itemToUpdate, updatedItem, status } = params;
    updateLogListInternal({
      id: id,
      detailId: itemToUpdate,
      update: updatedItem,
      status,
    });
  }

  function updateMintLogList(params: {
    id: LogItemId;
    itemToUpdate: string;
    updatedItem: ReactNode;
    status?: TimelineStatus;
  }): void {
    const { id, itemToUpdate, updatedItem, status } = params;
    updateLogListInternal({
      id: id,
      detailId: itemToUpdate,
      update: updatedItem,
      status,
    });
  }

  try {
    addLog({
      id: "deploy",
      status: "waiting",
      title: `Launching token ${data.symbol}`,
      details: [messages.verifyData, messages.o1js],
    });

    const libPromise = loadLib(updateLogList);

    if (DEBUG) console.log("launchToken: launching token:", data);
    const walletInfo = await getWalletInfo();
    if (DEBUG) console.log("launchToken: Wallet Info:", walletInfo);
    const systemInfo = await getSystemInfo();
    if (DEBUG) console.log("launchToken: System Info:", systemInfo);
    const adminPublicKey = AURO_TEST ? ADMIN_ADDRESS : adminAddress;
    if (!adminPublicKey) {
      updateLogList({
        id: "deploy",
        status: "error",
        itemToUpdate: "adminRequired",
        updatedItem: messages.adminRequired.content,
      });
      updateLogList({
        id: "deploy",
        status: "error",
        itemToUpdate: "verifyData",
        updatedItem: "Data verification failed",
      });
      return;
    }
    if (adminPublicKey !== walletInfo.address) {
      updateLogList({
        id: "deploy",
        status: "error",
        itemToUpdate: "adminRequired",
        updatedItem: messages.adminAddressDoNotMatch.content,
      });
      updateLogList({
        id: "deploy",
        status: "error",
        itemToUpdate: "verifyData",
        updatedItem: "Data verification failed",
      });
      return;
    }
    const mina = (window as any).mina;
    if (mina === undefined || mina?.isAuro !== true) {
      updateLogList({
        id: "deploy",
        itemToUpdate: "noAuroWallet",
        updatedItem: messages.noAuroWallet.content,
      });
      updateLogList({
        id: "deploy",
        itemToUpdate: "verifyData",
        updatedItem: "Data verification failed",
      });
      return;
    }

    const mintItems: MintAddressVerified[] = [];
    if (DEBUG) console.log("Mint addresses:", mintAddresses);
    for (const item of mintAddresses) {
      const verified = await checkMintData(item);
      if (verified !== undefined) {
        if (DEBUG) console.log("Mint item verified:", verified, item);
        mintItems.push(verified);
      } else {
        if (DEBUG) console.log("Mint item skipped:", item);
        updateLogList({
          id: "deploy",
          status: "error",
          itemToUpdate: "mintDataError",
          updatedItem: `Cannot mint ${item.amount} ${symbol} tokens to ${item.address} because of wrong amount or address`,
        });
        updateLogList({
          id: "deploy",
          status: "error",
          itemToUpdate: "verifyData",
          updatedItem: "Data verification failed",
        });
        return;
      }
    }
    if (DEBUG) console.log("Mint items filtered:", mintItems);

    updateLogList({
      id: "deploy",
      itemToUpdate: "verifyData",
      updatedItem: "Token data is verified",
    });
    setLikes((likes += 10));

    let imageHash: string | undefined = undefined;
    if (image) {
      updateLogList({
        id: "deploy",
        itemToUpdate: "pinningImage",
        updatedItem: messages.pinningImage.content,
      });

      imageHash = await pinImageToArweave(image);
      if (imageHash) {
        const imageTxMessage = (
          <>
            <a
              href={`https://arscan.io/tx/${imageHash}`}
              className="text-accent hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Pinning
            </a>{" "}
            token image to Arweave permanent storage...
          </>
        );
        updateLogList({
          id: "deploy",
          itemToUpdate: "pinningImage",
          updatedItem: imageTxMessage,
        });
      } else {
        updateLogList({
          id: "deploy",
          status: "error",
          itemToUpdate: "pinningImage",
          updatedItem: "Failed to pin token image to Arweave permanent storage",
        });
        return;
      }
    }
    setLikes((likes += 10));

    const imageURL = imageHash ? await arweaveHashToUrl(imageHash) : undefined;
    const info: TokenInfo = {
      symbol,
      name,
      description,
      image: imageURL,
      twitter,
      discord,
      telegram,
      instagram,
      website,
      tokenContractCode:
        "https://github.com/MinaFoundation/mina-fungible-token/blob/main/FungibleToken.ts",
      adminContractsCode: [
        "https://github.com/MinaFoundation/mina-fungible-token/blob/main/FungibleTokenAdmin.ts",
      ],
      data: undefined,
      isMDA: undefined,
    };

    updateLogList({
      id: "deploy",
      itemToUpdate: "pinningMetadata",
      updatedItem: messages.pinningMetadata.content,
    });

    const metadataHash = await pinStringToArweave(
      JSON.stringify(info, null, 2)
    );

    if (!metadataHash) {
      updateLogList({
        id: "deploy",
        status: "error",
        itemToUpdate: "pinningMetadata",
        updatedItem:
          "Failed to pin token metadata to Arweave permanent storage",
      });
      return;
    } else {
      const metadataTxMessage = (
        <>
          <a
            href={`https://arscan.io/tx/${metadataHash}`}
            className="text-accent hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Pinning
          </a>{" "}
          token metadata to Arweave permanent storage...
        </>
      );
      updateLogList({
        id: "deploy",
        itemToUpdate: "pinningMetadata",
        updatedItem: metadataTxMessage,
      });
    }
    setLikes((likes += 10));

    let waitForArweaveImageTxPromise = undefined;
    if (imageHash) {
      waitForArweaveImageTxPromise = waitForArweaveTx({
        hash: imageHash,
        id: "deploy",
        itemToUpdate: "pinningImage",
        updateLogList,
        type: "image",
      });
    }

    const waitForArweaveMetadataTxPromise = waitForArweaveTx({
      hash: metadataHash,
      id: "deploy",
      itemToUpdate: "pinningMetadata",
      updateLogList,
      type: "metadata",
    });

    const uri = await arweaveHashToUrl(metadataHash);
    const lib = await libPromise;

    updateLogList({
      id: "deploy",
      itemToUpdate: "saveDeployParams",
      updatedItem: messages.saveDeployParams.content,
    });

    const {
      tokenPrivateKey,
      adminContractPrivateKey,
      tokenPublicKey,
      adminContractPublicKey,
    } = await deployTokenParams(lib);
    if (DEBUG) console.log("Deploy Params received");

    // Save the result to a JSON file
    const deployParams = {
      symbol,
      name,
      description,
      image: imageURL,
      website,
      telegram,
      twitter,
      discord,
      tokenPrivateKey,
      adminContractPrivateKey,
      tokenPublicKey,
      adminContractPublicKey,
      adminPublicKey,
      metadata: uri,
    };
    // TODO: save with password encryption
    const deployParamsJson = JSON.stringify(deployParams, null, 2);
    const blob = new Blob([deployParamsJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const fileName = `${symbol}-${tokenPublicKey}.json`;
    a.download = fileName;
    a.click();
    const saveDeployParamsSuccessMsg = (
      <>
        Token private keys have been saved to a{" "}
        <a
          href={url}
          download={fileName}
          className="text-accent hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          JSON file
        </a>
      </>
    );
    updateLogList({
      id: "deploy",
      itemToUpdate: "saveDeployParams",
      updatedItem: saveDeployParamsSuccessMsg,
    });
    setLikes((likes += 10));

    const deployResult = await deployToken({
      tokenPrivateKey,
      adminContractPrivateKey,
      adminPublicKey,
      symbol,
      uri,
      libraries: lib,
      updateLogList,
      id: "deploy",
    });
    if (DEBUG) console.log("Deploy result:", deployResult);
    if (deployResult.success === false || deployResult.jobId === undefined) {
      updateLogList({
        id: "deploy",
        status: "error",
        itemToUpdate: "deployTransactionError",
        updatedItem:
          deployResult.error ?? messages.deployTransactionError.content,
      });
      return;
    }
    setLikes((likes += 10));
    const deployJobId = deployResult.jobId;

    const transaction = await waitForProveJob({
      jobId: deployJobId,
      id: "deploy",
      itemToUpdate: "transaction",
      updateLogList,
    });
    if (DEBUG) console.log("Transaction proved:", transaction?.slice(0, 50));
    if (!transaction) {
      return;
    }

    const sendResult = await sendTransaction(transaction);
    if (DEBUG) console.log("Transaction sent:", sendResult);
    if (sendResult.success === false || sendResult.hash === undefined) {
      updateLogList({
        id: "deploy",
        itemToUpdate: "transaction",
        updatedItem: `Failed to send transaction to Mina blockchain: ${
          sendResult.status ? "status: " + sendResult.status + ", " : ""
        } ${String(sendResult.error ?? "error D437")}`,
      });
      return;
    }

    const txIncluded = await waitForMinaDeployTx({
      hash: sendResult.hash,
      jobId: deployJobId,
      id: "deploy",
      itemToUpdate: "transaction",
      updateLogList,
    });

    if (!txIncluded) {
      return;
    }

    const contractVerified = await waitForContractVerification({
      tokenContractAddress: tokenPublicKey,
      adminContractAddress: adminContractPublicKey,
      adminAddress: adminPublicKey,
      id: "deploy",
      itemToUpdate: "contractVerification",
      updateLogList,
      info,
    });
    if (!contractVerified) {
      return;
    }

    if (DEBUG) {
      console.log("Minting tokens", mintItems);
    }
    /*
    let minted = 0;
    if (mintItems.length > 0) {
      addLog({
        id: "mint",
        status: "waiting",
        title: "Minting tokens",
        details: [
          {
            id: "mintingTokens",
            content: `Minting ${symbol} tokens to ${mintItems.length} addresses...`,
          },
        ],
      });

      let nonce = await getAccountNonce(adminPublicKey);
      let mintPromises: Promise<string | undefined>[] = [];
      for (let i = 0; i < mintItems.length; i++) {
        const item = mintItems[i];
        const itemId = `mint-${symbol}-${i}`;
        updateMintLogList({
          id: "mint",
          itemToUpdate: itemId,
          updatedItem: `Minting ${item.amount} ${symbol} tokens to ${item.address}`,
        });

        const mintResult = await mintToken({
          tokenPublicKey,
          adminContractPublicKey,
          adminPublicKey,
          to: item.address,
          amount: item.amount,
          nonce: nonce++,
          id,
          updateLogItem,
          symbol: tokenSymbol,
          lib,
        });
        if (
          mintResult.success === false ||
          mintResult.jobId === undefined ||
          isError
        ) {
          logItem({
            id,
            status: "error",
            title: "Failed to mint tokens",
            description: mintResult.error ?? "Mint error",
            date: new Date(),
          });
          setWaitingItem(undefined);
          setIsError(true);
          return;
        }
        const mintJobId = mintResult.jobId;
        await sleep(1000);

        const waitForMintJobPromise = waitForMintJob({
          jobId: mintJobId,
          id: `mint-${i}`,
          sequence: i,
        });
        mintPromises.push(waitForMintJobPromise);
      }
      if (isError) {
        logItem({
          id: "mint",
          status: "error",
          title: "Failed to mint tokens",
          description: "Failed to mint tokens",
          date: new Date(),
        });
        setWaitingItem(undefined);
        setIsError(true);
        return;
      }
      logWaitingItem({
        title: "Minting tokens",
        description: `Waiting for mint transactions to be included into a block`,
      });
      await Promise.all(mintPromises);
      if (isError) {
        logItem({
          id: "mint",
          status: "error",
          title: "Failed to mint tokens",
          description: "Failed to mint tokens",
          date: new Date(),
        });
        setWaitingItem(undefined);
        setIsError(true);
        return;
      }
      logItem({
        id: "mint",
        status: "success",
        title: `Tokens are minted to ${mintItems.length} addresses`,
        description: `All mint transactions are included into a block`,
        date: new Date(),
      });
    }
    */
    if (waitForArweaveImageTxPromise) await waitForArweaveImageTxPromise;
    setLikes((likes += 10));
    await waitForArweaveMetadataTxPromise;
    setLikes((likes += 10));
  } catch (error) {
    console.error("launchToken catch:", error);
    addLog({
      id: "error",
      status: "error",
      title: "Error launching token",
      details: [
        {
          id: "error",
          content: String(error),
        },
      ],
    });
  }
}
