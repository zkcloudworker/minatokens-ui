import { LaunchTokenData } from "../LaunchForm";
import { getChain, getChainId } from "@/lib/chain";
import { getWalletInfo, connectWallet } from "@/lib/wallet";
import { getSystemInfo } from "@/lib/system-info";
import { debug } from "@/lib/debug";
import { TimelineItem } from "../TimeLine";
const AURO_TEST = process.env.NEXT_PUBLIC_AURO_TEST === "true";
const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_PK;
const chainId = getChainId();
const chain = getChain();
const DEBUG = debug();

/*
const a: React.ReactNode = (
      <>
        Check the{" "}
        <a href="#" className="text-accent hover:underline">
          design feedback
        </a>
        .
      </>
    );
    const b: React.ReactNode = (
      <>
        Item 3{" "}
        <a href="#" className="text-accent hover:underline">
          link
        </a>
        .
      </>
    );
    addLog({ id: "a", status: "waiting", title: "Item A", details: a });
    await new Promise((resolve) => setTimeout(resolve, 5000));
    updateLog("a", { details: logList([a, "Item 2"]) });
    await new Promise((resolve) => setTimeout(resolve, 5000));
    updateLog("a", { details: logList([a, "Item 2", b]) });
*/

export async function launchToken(
  data: LaunchTokenData,
  addLog: (item: TimelineItem) => void,
  updateLog: (id: string, update: Partial<TimelineItem>) => void
) {
  const walletInfo = await getWalletInfo();
  if (DEBUG) console.log("Wallet Info:", walletInfo);
  const systemInfo = await getSystemInfo();
  if (DEBUG) console.log("System Info:", systemInfo);
  if (DEBUG) console.log("Navigator:", navigator);
  if (AURO_TEST) {
    if (ADMIN_ADDRESS === undefined) {
      console.error("ADMIN_ADDRESS is not set");
      return;
    }
  }

  logWaitingItem({
    title: "Issuing token",
    description: "Checking data...",
  });
  const mintItems: MintVerified[] = [];
  if (DEBUG) console.log("Mint items:", mint);
  for (const item of mint) {
    if (
      item.amount !== "" &&
      item.to !== "" &&
      item.amount !== undefined &&
      item.to !== undefined
    ) {
      const verified = await checkMintData(item);
      if (verified !== undefined) {
        if (DEBUG) console.log("Mint item verified:", verified, item);
        mintItems.push(verified);
      } else {
        if (DEBUG) console.log("Mint item skipped:", item);
        setIsError(true);
        logItem({
          id: "mint",
          status: "error",
          title: "Wrong mint data",
          description: `Cannot mint ${item.amount} ${tokenSymbol} tokens to ${item.to} because of wrong amount or address`,
          date: new Date(),
        });
        setWaitingItem(undefined);
        return;
      }
    }
  }
  if (DEBUG) console.log("Mint items filtered:", mintItems);

  setIssued(false);
  setIsError(false);

  bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  if (DEBUG) {
    console.log("Token Name:", tokenName);
    console.log("Token Symbol:", tokenSymbol);
    console.log("Token Description:", tokenDescription);
    console.log("Website:", website);
    console.log("Telegram:", telegram);
    console.log("Twitter:", twitter);
    console.log("Discord:", discord);
    console.log("Image:", image);
  }

  //TODO: Pin token image to Arweave
  // TODO: add issuer
  if (!libraries) setLibraries(loadLibraries());

  const { address, network, error, success } = await connectWallet({});
  console.log("Connected wallet", { address, network, error, success });
  if (!success || !address) {
    logItem({
      id: "metadata",
      status: "error",
      title: "Failed to connect to wallet",
      description: "Connect to wallet to continue",
      date: new Date(),
    });
    setWaitingItem(undefined);
    return;
  }
  const adminPublicKey = AURO_TEST ? ADMIN_ADDRESS : address;
  if (!adminPublicKey) {
    console.error("adminPublicKey is not set");
    return;
  }

  const imageHash = image ? await pinImageToArweave(image) : undefined;
  if (image !== undefined && imageHash === undefined) {
    logItem({
      id: "metadata",
      status: "error",
      title: "Token image pinning failed",
      description: "Failed to pin token image to Arweave permanent storage",
      date: new Date(),
    });
    return;
  }

  const info: TokenInfo = {
    symbol: tokenSymbol,
    name: tokenName,
    description: tokenDescription,
    image: imageHash ? await arweaveHashToUrl(imageHash) : undefined,
    website,
    telegram,
    twitter,
    discord,
    tokenContractCode:
      "https://github.com/MinaFoundation/mina-fungible-token/blob/main/FungibleToken.ts",
    adminContractsCode: [
      "https://github.com/MinaFoundation/mina-fungible-token/blob/main/FungibleTokenAdmin.ts",
    ],
    data: undefined,
    isMDA: undefined,
  };

  const metadataHash = await pinStringToArweave(JSON.stringify(info, null, 2));

  if (!metadataHash) {
    logItem({
      id: "metadata",
      status: "error",
      title: "Token metadata pinning failed",
      description: "Failed to pin data to Arweave permanent storage",
      date: new Date(),
    });
    setWaitingItem(undefined);
    return;
  }

  let waitForArweaveImageTxPromise = undefined;
  if (imageHash) {
    waitForArweaveImageTxPromise = waitForArweaveTx({
      hash: imageHash,
      id: "image",
      type: "image",
      waitingTitle: "Pinning token image to Arweave permanent storage",
      successTitle: "Token image is included into Arweave permanent storage",
      failedTitle: "Failed to pin token image to Arweave permanent storage",
    });
  }

  const waitForArweaveMetadataTxPromise = waitForArweaveTx({
    hash: metadataHash,
    id: "metadata",
    type: "metadata",
    waitingTitle: "Pinning token metadata to Arweave permanent storage",
    successTitle: "Token metadata is included into Arweave permanent storage",
    failedTitle: "Failed to pin token metadata to Arweave permanent storage",
  });
  setWaitingItem(undefined);

  const deployParamsPromise = deployTokenParams();
  const uri = await arweaveHashToUrl(metadataHash);

  if (isError || !uri) {
    return;
  }
  const {
    tokenPrivateKey,
    adminContractPrivateKey,
    tokenPublicKey,
    adminContractPublicKey,
  } = await deployParamsPromise;
  if (DEBUG) console.log("Deploy Params received");

  // Save the result to a JSON file
  const deployParams = {
    symbol: tokenSymbol,
    name: tokenName,
    description: tokenDescription,
    image: "", // TODO: imageUrl
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
  const name = `${tokenSymbol}-${tokenPublicKey}.json`;
  a.download = name;
  a.click();
  logItem({
    id: "saveDeployParams",
    status: "success",
    title: "Token deploy parameters saved to a JSON file",
    description: (
      <>
        <a
          href={url}
          download={name}
          className="text-blue-500 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {name}
        </a>{" "}
        has been saved to your device.
      </>
    ),
    date: new Date(),
  });
  const deployResult = await deployToken({
    tokenPrivateKey,
    adminContractPrivateKey,
    adminPublicKey,
    symbol: tokenSymbol,
    uri,
    libraries: libraries ?? loadLibraries(),
    logItem,
    updateLogItem,
  });
  if (DEBUG) console.log("Deploy result:", deployResult);
  if (
    deployResult.success === false ||
    deployResult.jobId === undefined ||
    isError
  ) {
    updateLogItem("cloud-proving-job", {
      status: "error",
      title: "Deploying token contract failed",
      description: "Failed to deploy token contract",
      date: new Date(),
    });
    setWaitingItem(undefined);
    return;
  }
  const deployJobId = deployResult.jobId;

  const waitForProveJobPromise = waitForProveJob({
    jobId: deployJobId,
    id: "cloud-proving-job",
    waitingTitle: "Proving deploy transaction",
    successTitle: "Deploy transaction is proved",
    failedTitle: "Failed to prove deploy transaction",
  });

  const transaction = await waitForProveJobPromise;
  if (DEBUG) console.log("Transaction proved:", transaction?.slice(0, 50));
  if (isError || !transaction) {
    return;
  }

  const sendResult = await sendTransaction(transaction);
  if (DEBUG) console.log("Transaction sent:", sendResult);
  if (
    isError ||
    sendResult.success === false ||
    sendResult.hash === undefined
  ) {
    logItem({
      id: "deploySend",
      status: "error",
      title: "Failed to send transaction to Mina blockchain",
      description: `Failed to send transaction to Mina blockchain: ${
        sendResult.status ? "status: " + sendResult.status + ", " : ""
      } ${String(sendResult.error ?? "error D437")}`,
      date: new Date(),
    });
    return;
  }

  const waitForMinaTxPromise = waitForMinaTx({
    hash: sendResult.hash,
    id: "deploySend",
    waitingTitle: "Waiting for token contract to be deployed",
    successTitle: "Token contract is deployed",
    failedTitle: "Failed to deploy token contract",
    type: "deploy",
  });

  await waitForMinaTxPromise;

  if (isError) {
    return;
  }

  await waitForContractVerification({
    tokenContractAddress: tokenPublicKey,
    adminContractAddress: adminContractPublicKey,
    adminAddress: adminPublicKey,
    id: "contractVerification",
    waitingTitle: "Verifying token contract state",
    successTitle: "Token contract state is verified",
    failedTitle: "Failed to verify token contract state",
    info,
  });
  if (isError) {
    return;
  }

  if (DEBUG) {
    console.log("Minting tokens", mintItems);
  }

  let minted = 0;
  if (mintItems.length > 0) {
    logWaitingItem({
      title: "Minting tokens",
      description: createElement(
        "span",
        null,
        "Loading ",
        createElement(
          "a",
          {
            href: "https://docs.minaprotocol.com/zkapps/o1js",
            target: "_blank",
            rel: "noopener noreferrer",
          },
          "o1js"
        ),
        " library..."
      ),
    });
    const lib = await (libraries ?? loadLibraries());
    logWaitingItem({
      title: "Minting tokens",
      description: `Preparing data to mint ${tokenSymbol} tokens to ${mintItems.length} addresses`,
    });
    let nonce = await getAccountNonce(adminPublicKey);
    let mintPromises: Promise<string | undefined>[] = [];
    for (let i = 0; i < mintItems.length; i++) {
      const item = mintItems[i];
      const id = `mint-${i}`;
      logItem({
        id,
        status: "waiting",
        title: `Minting ${item.amount} ${tokenSymbol} to ${item.to}`,
        description: `Building transaction...`,
        date: new Date(),
      });
      if (i === mintItems.length - 1)
        logWaitingItem({
          title: "Minting tokens",
          description: `Waiting for mint transactions to be created and proved`,
        });
      else
        logWaitingItem({
          title: "Minting tokens",
          description: `Preparing data to mint ${tokenSymbol} tokens to ${
            mintItems.length - (i + 1)
          } addresses`,
        });
      const mintResult = await mintToken({
        tokenPublicKey,
        adminContractPublicKey,
        adminPublicKey,
        to: item.to,
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
  if (waitForArweaveImageTxPromise) await waitForArweaveImageTxPromise;
  await waitForArweaveMetadataTxPromise;
  setWaitingItem(undefined);
  setIssuing(false);
  setIssued(true);
}
