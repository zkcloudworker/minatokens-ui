import { LaunchTokenData, MintAddressVerified } from "@/lib/token";
import { checkMintData } from "@/lib/address";
import { getChain, getChainId } from "@/lib/chain";
import { getWalletInfo } from "@/lib/wallet";
import { getSystemInfo } from "@/lib/system-info";
import { debug } from "@/lib/debug";
import { deployToken } from "./deploy";
import { mintToken } from "@/lib/mint";
import { TimeLineItem, TimelineGroup, TimelineGroupStatus } from "../TimeLine";
import { pinImageToArweave, pinStringToArweave } from "@/lib/arweave";
import { arweaveHashToUrl } from "@/lib/arweave";
import { TokenInfo } from "@/lib/token";
import { sendTransaction } from "@/lib/send";
import { messages, LineId, GroupId } from "./messages";
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
  addLog: (item: TimelineGroup) => void;
  updateTimelineItem: (params: {
    groupId: string;
    update: TimeLineItem;
  }) => void;
  setTotalSupply: (totalSupply: number) => void;
  setTokenAddress: (tokenAddress: string) => void;
  setLikes: (likes: number) => void;
}) {
  const {
    data,
    addLog,
    updateTimelineItem: updateTimeLineItemInternal,
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

  function updateTimelineItem(params: {
    groupId: GroupId;
    update: TimeLineItem;
  }): void {
    const { groupId, update } = params;
    updateTimeLineItemInternal({
      groupId,
      update: update,
    });
  }

  function updateMintTimelineItem(params: {
    groupId: GroupId;
    update: TimeLineItem;
  }): void {
    const { groupId, update } = params;
    updateTimeLineItemInternal({
      groupId,
      update,
    });
  }

  try {
    addLog({
      groupId: "pin",
      status: "waiting",
      title: `Pinning token metadata for ${data.symbol}`,
      successTitle: `Token metadata for ${data.symbol} pinned`,
      errorTitle: `Failed to pin token metadata for ${data.symbol}`,
      lines: [messages.verifyData],
      requiredForSuccess: ["pinningMetadata", "verifyData"],
    });

    if (DEBUG) console.log("launchToken: launching token:", data);
    const walletInfo = await getWalletInfo();
    if (DEBUG) console.log("launchToken: Wallet Info:", walletInfo);
    const systemInfo = await getSystemInfo();
    if (DEBUG) console.log("launchToken: System Info:", systemInfo);
    const adminPublicKey = AURO_TEST ? ADMIN_ADDRESS : adminAddress;
    if (!adminPublicKey) {
      updateTimelineItem({
        groupId: "pin",
        update: messages.adminRequired,
      });
      updateTimelineItem({
        groupId: "pin",
        update: {
          lineId: "verifyData",
          content: "Data verification failed",
          status: "error",
        },
      });
      return;
    }
    if (adminPublicKey !== walletInfo.address) {
      updateTimelineItem({
        groupId: "pin",
        update: {
          lineId: "adminRequired",
          content: messages.adminAddressDoNotMatch.content,
          status: "error",
        },
      });
      updateTimelineItem({
        groupId: "pin",
        update: {
          lineId: "verifyData",
          content: "Data verification failed",
          status: "error",
        },
      });
      return;
    }
    const mina = (window as any).mina;
    if (mina === undefined || mina?.isAuro !== true) {
      updateTimelineItem({
        groupId: "pin",
        update: {
          lineId: "noAuroWallet",
          content: messages.noAuroWallet.content,
          status: "error",
        },
      });
      updateTimelineItem({
        groupId: "pin",
        update: {
          lineId: "verifyData",
          content: "Data verification failed",
          status: "error",
        },
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
        updateTimelineItem({
          groupId: "pin",
          update: {
            lineId: "mintDataError",
            content: `Cannot mint ${item.amount} ${symbol} tokens to ${item.address} because of wrong amount or address`,
            status: "error",
          },
        });
        updateTimelineItem({
          groupId: "pin",
          update: {
            lineId: "verifyData",
            content: "Data verification failed",
            status: "error",
          },
        });
        return;
      }
    }
    if (DEBUG) console.log("Mint items filtered:", mintItems);

    updateTimelineItem({
      groupId: "pin",
      update: {
        lineId: "verifyData",
        content: "Token data is verified",
        status: "success",
      },
    });
    setLikes((likes += 10));

    addLog({
      groupId: "deploy",
      status: "waiting",
      title: `Launching token ${data.symbol}`,
      successTitle: `Token ${data.symbol} launched`,
      errorTitle: `Failed to launch token ${data.symbol}`,
      lines: [messages.o1js, messages.saveDeployParams, messages.transaction],
      requiredForSuccess: [
        "o1js",
        "saveDeployParams",
        "transaction",
        "contractVerification",
      ],
    });

    const libPromise = loadLib(updateTimelineItem);

    let imageHash: string | undefined = undefined;
    if (image) {
      updateTimelineItem({
        groupId: "pin",
        update: messages.pinningImage,
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
        updateTimelineItem({
          groupId: "pin",
          update: {
            lineId: "pinningImage",
            content: imageTxMessage,
            status: "waiting",
          },
        });
      } else {
        updateTimelineItem({
          groupId: "pin",
          update: {
            lineId: "pinningImage",
            content: "Failed to pin token image to Arweave permanent storage",
            status: "error",
          },
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

    updateTimelineItem({
      groupId: "pin",
      update: messages.pinningMetadata,
    });

    const metadataHash = await pinStringToArweave(
      JSON.stringify(info, null, 2)
    );

    if (!metadataHash) {
      updateTimelineItem({
        groupId: "pin",
        update: {
          lineId: "pinningMetadata",
          content: "Failed to pin token metadata to Arweave permanent storage",
          status: "error",
        },
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
      updateTimelineItem({
        groupId: "pin",
        update: {
          lineId: "pinningMetadata",
          content: metadataTxMessage,
          status: "waiting",
        },
      });
    }
    setLikes((likes += 10));

    let waitForArweaveImageTxPromise = undefined;
    if (imageHash) {
      waitForArweaveImageTxPromise = waitForArweaveTx({
        hash: imageHash,
        groupId: "pin",
        lineId: "pinningImage",
        updateTimelineItem,
        type: "image",
      });
    }

    const waitForArweaveMetadataTxPromise = waitForArweaveTx({
      hash: metadataHash,
      groupId: "pin",
      lineId: "pinningMetadata",
      updateTimelineItem,
      type: "metadata",
    });

    const uri = await arweaveHashToUrl(metadataHash);
    const lib = await libPromise;

    const {
      tokenPrivateKey,
      adminContractPrivateKey,
      tokenPublicKey,
      adminContractPublicKey,
    } = await deployTokenParams(lib);
    if (DEBUG) console.log("Deploy Params received");
    setTokenAddress(tokenPublicKey);

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
    updateTimelineItem({
      groupId: "deploy",
      update: {
        lineId: "saveDeployParams",
        content: saveDeployParamsSuccessMsg,
        status: "success",
      },
    });
    setLikes((likes += 10));

    const deployResult = await deployToken({
      tokenPrivateKey,
      adminContractPrivateKey,
      adminPublicKey,
      symbol,
      uri,
      libraries: lib,
      updateTimelineItem,
      groupId: "deploy",
    });
    if (DEBUG) console.log("Deploy result:", deployResult);
    if (deployResult.success === false || deployResult.jobId === undefined) {
      updateTimelineItem({
        groupId: "deploy",
        update: {
          lineId: "deployTransactionError",
          content:
            deployResult.error ?? messages.deployTransactionError.content,
          status: "error",
        },
      });
      return;
    }
    setLikes((likes += 10));
    const deployJobId = deployResult.jobId;

    const transaction = await waitForProveJob({
      jobId: deployJobId,
      groupId: "deploy",
      lineId: "transaction",
      updateTimelineItem,
    });
    if (DEBUG) console.log("Transaction proved:", transaction?.slice(0, 50));
    if (!transaction) {
      return;
    }

    const sendResult = await sendTransaction(transaction);
    if (DEBUG) console.log("Transaction sent:", sendResult);
    if (sendResult.success === false || sendResult.hash === undefined) {
      updateTimelineItem({
        groupId: "deploy",
        update: {
          lineId: "transaction",
          content: `Failed to send transaction to Mina blockchain: ${
            sendResult.status ? "status: " + sendResult.status + ", " : ""
          } ${String(sendResult.error ?? "error D437")}`,
          status: "error",
        },
      });
      return;
    }

    const txIncluded = await waitForMinaDeployTx({
      hash: sendResult.hash,
      jobId: deployJobId,
      groupId: "deploy",
      lineId: "transaction",
      updateTimelineItem,
    });

    if (!txIncluded) {
      return;
    }

    const contractVerified = await waitForContractVerification({
      tokenContractAddress: tokenPublicKey,
      adminContractAddress: adminContractPublicKey,
      adminAddress: adminPublicKey,
      groupId: "deploy",
      lineId: "contractVerification",
      updateTimelineItem,
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
        updateMintTimelineItem({
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
      groupId: "error",
      status: "error",
      title: "Error launching token",
      lines: [
        {
          lineId: "error",
          content: String(error),
          status: "error",
        },
      ],
    });
  }
}
