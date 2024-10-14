"use client";

import { LaunchTokenData, MintAddressVerified } from "@/lib/token";
import { checkMintData } from "@/lib/address";
import { getChain, getChainId } from "@/lib/chain";
import { getWalletInfo } from "@/lib/wallet";
import { getSystemInfo } from "@/lib/system-info";
import { debug } from "@/lib/debug";
import { sleep } from "@/lib/sleep";
import { deployToken } from "./deploy";
import { mintToken } from "./mint";
import {
  TimeLineItem,
  TimelineGroup,
  TimelineGroupStatus,
  IsErrorFunction,
  GetMintStatisticsFunction,
} from "../TimeLine";
import { pinImageToArweave, pinStringToArweave } from "@/lib/arweave";
import { arweaveHashToUrl } from "@/lib/arweave";
import { TokenInfo } from "@/lib/token";
import { sendTransaction } from "@/lib/send";
import {
  messages,
  LineId,
  GroupId,
  UpdateTimelineItemFunction,
} from "./messages";
import { loadLib } from "./libraries";
import { waitForArweaveTx } from "./arweave-tx";
import { getAccountNonce } from "@/lib/nonce";
import {
  waitForProveJob,
  waitForContractVerification,
  waitForMinaDeployTx,
} from "./mina-tx";
import { deployTokenParams } from "@/lib/keys";
const AURO_TEST = process.env.NEXT_PUBLIC_AURO_TEST === "true";
const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_PK;
const chain = getChain();
const DEBUG = debug();

export async function launchToken(params: {
  data: LaunchTokenData;
  addLog: (item: TimelineGroup) => void;
  updateTimelineItem: UpdateTimelineItemFunction;
  isError: IsErrorFunction;
  getMintStatistics: GetMintStatisticsFunction;
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
    isError,
    getMintStatistics,
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
    groupId: string;
    update: TimeLineItem;
  }): void {
    const { groupId, update } = params;
    updateTimeLineItemInternal({
      groupId,
      update: update,
    });
  }

  function showMintStatistics(tokensToMint: number): boolean {
    const statistics = getMintStatistics();
    if (statistics.success > 0)
      updateTimelineItem({
        groupId: "mint",
        update: {
          lineId: "minted",
          content: `${statistics.success} tokens minted`,
          status: statistics.success === tokensToMint ? "success" : "waiting",
        },
      });
    if (statistics.error > 0)
      updateTimelineItem({
        groupId: "mint",
        update: {
          lineId: "notMinted",
          content: `${statistics.error} tokens failed to be minted`,
          status: "error",
        },
      });
    if (statistics.waiting > 0)
      updateTimelineItem({
        groupId: "mint",
        update: {
          lineId: "waitToMint",
          content: `${statistics.waiting} tokens are waiting to be minted`,
          status: statistics.waiting === 0 ? "success" : "waiting",
        },
      });
    return statistics.success === tokensToMint;
  }

  try {
    addLog({
      groupId: "verify",
      status: "waiting",
      title: `Verifying token data for ${data.symbol}`,
      successTitle: `Token data for ${data.symbol} verified`,
      errorTitle: `Failed to verify token data for ${data.symbol}`,
      lines: [messages.verifyData],
      requiredForSuccess: [
        "verifyData",
        "o1js",
        "privateKeysGenerated",
        "tokenAddress",
        "privateKeysSaved",
      ],
    });

    if (DEBUG) console.log("launchToken: launching token:", data);
    const walletInfo = await getWalletInfo();
    if (DEBUG) console.log("launchToken: Wallet Info:", walletInfo);
    const systemInfo = await getSystemInfo();
    if (DEBUG) console.log("launchToken: System Info:", systemInfo);
    const adminPublicKey = AURO_TEST ? ADMIN_ADDRESS : adminAddress;
    if (!adminPublicKey) {
      updateTimelineItem({
        groupId: "verify",
        update: messages.adminRequired,
      });
      updateTimelineItem({
        groupId: "verify",
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
        groupId: "verify",
        update: {
          lineId: "adminRequired",
          content: messages.adminAddressDoNotMatch.content,
          status: "error",
        },
      });
      updateTimelineItem({
        groupId: "verify",
        update: {
          lineId: "verifyData",
          content: "Data verification failed",
          status: "error",
        },
      });
      return;
    }
    if (isError()) return;
    const mina = (window as any).mina;
    if (mina === undefined || mina?.isAuro !== true) {
      updateTimelineItem({
        groupId: "verify",
        update: {
          lineId: "noAuroWallet",
          content: messages.noAuroWallet.content,
          status: "error",
        },
      });
      updateTimelineItem({
        groupId: "verify",
        update: {
          lineId: "verifyData",
          content: "Data verification failed",
          status: "error",
        },
      });
      return;
    }
    if (isError()) return;

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
          groupId: "verify",
          update: {
            lineId: "mintDataError",
            content: `Cannot mint ${item.amount} ${symbol} tokens to ${item.address} because of wrong amount or address`,
            status: "error",
          },
        });
        updateTimelineItem({
          groupId: "verify",
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
    if (isError()) return;

    updateTimelineItem({
      groupId: "verify",
      update: messages.o1js,
    });
    updateTimelineItem({
      groupId: "verify",
      update: {
        lineId: "verifyData",
        content: "Token data is verified",
        status: "success",
      },
    });
    setLikes((likes += 10));
    const libPromise = loadLib(updateTimelineItem);
    updateTimelineItem({
      groupId: "verify",
      update: messages.privateKeysGenerated,
    });

    let imageHash: string | undefined = undefined;
    if (image) {
      addLog({
        groupId: "image",
        status: "waiting",
        title: `Pinning token image for ${data.symbol}`,
        successTitle: `Token image for ${data.symbol} pinned`,
        errorTitle: `Failed to pin token image for ${data.symbol}`,
        lines: [messages.pinningImage],
        requiredForSuccess: ["pinningImage", "arweaveTx", "arweaveIncluded"],
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
              Transaction
            </a>{" "}
            is sent to Arweave.
          </>
        );
        updateTimelineItem({
          groupId: "image",
          update: {
            lineId: "arweaveTx",
            content: imageTxMessage,
            status: "success",
          },
        });
        updateTimelineItem({
          groupId: "image",
          update: messages.arweaveIncluded,
        });
        updateTimelineItem({
          groupId: "image",
          update: {
            lineId: "pinningImage",
            content: "Token image is uploaded to Arweave",
            status: "success",
          },
        });
      } else {
        updateTimelineItem({
          groupId: "image",
          update: {
            lineId: "pinningImage",
            content:
              "Failed to upload token image to Arweave permanent storage",
            status: "error",
          },
        });
        return;
      }
    }
    if (isError()) return;
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

    addLog({
      groupId: "metadata",
      status: "waiting",
      title: `Pinning token metadata for ${data.symbol}`,
      successTitle: `Token metadata for ${data.symbol} pinned`,
      errorTitle: `Failed to pin token metadata for ${data.symbol}`,
      lines: [messages.pinningMetadata],
      requiredForSuccess: ["pinningMetadata", "arweaveTx", "arweaveIncluded"],
    });

    const metadataHash = await pinStringToArweave(
      JSON.stringify(info, null, 2)
    );

    if (!metadataHash) {
      updateTimelineItem({
        groupId: "metadata",
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
            Transaction
          </a>{" "}
          is sent to Arweave.
        </>
      );
      updateTimelineItem({
        groupId: "metadata",
        update: {
          lineId: "arweaveTx",
          content: metadataTxMessage,
          status: "success",
        },
      });
      updateTimelineItem({
        groupId: "metadata",
        update: messages.arweaveIncluded,
      });
      updateTimelineItem({
        groupId: "metadata",
        update: {
          lineId: "pinningMetadata",
          content: "Token metadata is uploaded to Arweave",
          status: "success",
        },
      });
    }
    if (isError()) return;
    setLikes((likes += 10));

    let waitForArweaveImageTxPromise = undefined;
    if (imageHash) {
      waitForArweaveImageTxPromise = waitForArweaveTx({
        hash: imageHash,
        groupId: "image",
        lineId: "arweaveIncluded",
        updateTimelineItem,
        type: "image",
      });
    }

    const waitForArweaveMetadataTxPromise = waitForArweaveTx({
      hash: metadataHash,
      groupId: "metadata",
      lineId: "arweaveIncluded",
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
      tokenId,
    } = await deployTokenParams(lib);
    if (DEBUG) console.log("Deploy Params received");
    setTokenAddress(tokenPublicKey);
    updateTimelineItem({
      groupId: "verify",
      update: {
        lineId: "privateKeysGenerated",
        content: `Token private keys are generated`,
        status: "success",
      },
    });

    const tokenAddressMsg = (
      <>
        Token address:{" "}
        <a
          href={`https://minascan.io/${chain}/account/${tokenPublicKey}`}
          className="text-accent hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {tokenPublicKey}
        </a>
      </>
    );
    updateTimelineItem({
      groupId: "verify",
      update: {
        lineId: "tokenAddress",
        content: tokenAddressMsg,
        status: "success",
      },
    });
    if (isError()) return;
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
    updateTimelineItem({
      groupId: "verify",
      update: messages.privateKeysSaved,
    });
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
      groupId: "verify",
      update: {
        lineId: "privateKeysSaved",
        content: saveDeployParamsSuccessMsg,
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
      lines: [messages.txPrepared],
      requiredForSuccess: [
        "txPrepared",
        "txSigned",
        "txProved",
        "txSent",
        "txIncluded",
        "contractStateVerified",
      ],
    });
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
    if (isError()) return;
    setLikes((likes += 10));
    const deployJobId = deployResult.jobId;

    const txIncluded = await waitForProveJob({
      jobId: deployJobId,
      groupId: "deploy",
      updateTimelineItem,
      isError,
      type: "deploy",
      tokenContractAddress: tokenPublicKey,
    });

    if (!txIncluded) {
      return;
    }

    const contractVerified = await waitForContractVerification({
      tokenContractAddress: tokenPublicKey,
      adminContractAddress: adminContractPublicKey,
      adminAddress: adminPublicKey,
      tokenId,
      groupId: "deploy",
      updateTimelineItem,
      info,
      isError,
    });
    if (!contractVerified) {
      return;
    }

    if (isError()) return;

    if (DEBUG) {
      console.log("Minting tokens", mintItems);
    }
    setLikes((likes += 10));

    let minted = 0;
    if (mintItems.length > 0) {
      const tokensToMint = mintItems.length;

      const mintingTokensMsg = (
        <>
          Minting{" "}
          <a
            href={`https://minascan.io/${chain}/token/${tokenId}/zk-txs`}
            className="text-accent hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {symbol}
          </a>{" "}
          tokens to {mintItems.length} addresses...
        </>
      );
      addLog({
        groupId: "mint",
        status: "waiting",
        title: `Minting ${data.symbol} tokens`,
        successTitle: `${mintItems.length} ${data.symbol} tokens minted`,
        errorTitle: `Failed to mint ${mintItems.length} ${data.symbol} tokens`,
        lines: [
          {
            lineId: "mintingTokens",
            content: mintingTokensMsg,
            status: "waiting",
          },
        ],
        requiredForSuccess: ["mintingTokens", "minted"],
      });

      let nonce = await getAccountNonce(adminPublicKey);
      let mintPromises: Promise<boolean>[] = [];

      for (let i = 0; i < mintItems.length; i++) {
        const item = mintItems[i];
        const groupId = `mint-${symbol}-${i}`;
        const amountMsg = (
          <>
            Amount: {item.amount}{" "}
            <a
              href={`https://minascan.io/${chain}/token/${tokenId}/zk-txs`}
              className="text-accent hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {symbol}
            </a>{" "}
            tokens
          </>
        );
        const tokenAddressMsg = (
          <>
            Address:{" "}
            <a
              href={`https://minascan.io/${chain}/account/${item.address}`}
              className="text-accent hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {item.address}
            </a>
          </>
        );
        addLog({
          groupId,
          status: "waiting",
          title: `Minting ${item.amount} ${data.symbol} tokens`,
          successTitle: `${item.amount} ${data.symbol} tokens minted`,
          errorTitle: `Failed to mint ${item.amount} ${data.symbol} tokens`,
          lines: [
            messages.txMint,
            {
              lineId: "amount",
              content: amountMsg,
              status: "success",
            },
            {
              lineId: "address",
              content: tokenAddressMsg,
              status: "success",
            },
          ],
          requiredForSuccess: [
            "txMint",
            "txSigned",
            "txProved",
            "txSent",
            "txIncluded",
            "mintBalance",
          ],
        });

        const mintResult = await mintToken({
          tokenPublicKey,
          adminContractPublicKey,
          adminPublicKey,
          to: item.address,
          amount: item.amount,
          nonce: nonce++,
          groupId,
          updateTimelineItem,
          symbol,
          lib,
          isError,
        });
        if (mintResult.success === false || mintResult.jobId === undefined) {
          return;
        }
        const mintJobId = mintResult.jobId;
        await sleep(1000);
        showMintStatistics(tokensToMint);
        await sleep(1000);
        const waitForMintJobPromise = waitForProveJob({
          jobId: mintJobId,
          groupId,
          updateTimelineItem,
          isError,
          type: "mint",
          tokenContractAddress: tokenPublicKey,
          address: item.address,
        });
        mintPromises.push(waitForMintJobPromise);
        if (isError()) return;
      }
      while (!showMintStatistics(tokensToMint) && !isError()) {
        await sleep(5000);
      }
      setLikes((likes += 10));

      await Promise.all(mintPromises);
      const statistics = getMintStatistics();
      const mintedTokensMsg = (
        <>
          Minted{" "}
          <a
            href={`https://minascan.io/${chain}/token/${tokenId}/zk-txs`}
            className="text-accent hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {symbol}
          </a>{" "}
          tokens to {statistics.success} addresses
        </>
      );
      updateTimelineItem({
        groupId: "mint",
        update: {
          lineId: "mintingTokens",
          content: mintedTokensMsg,
          status: statistics.success === tokensToMint ? "success" : "error",
        },
      });
    }

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
