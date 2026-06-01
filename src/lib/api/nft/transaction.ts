"use server";
import {
  initBlockchain,
  accountBalanceMina,
  fetchMinaAccount,
} from "@/lib/blockchain";
import { PublicKey, UInt64, Mina, TokenId, PrivateKey } from "o1js";
import {
  buildNftTransaction,
  buildNftMintTransaction,
  LAUNCH_FEE,
  TRANSACTION_FEE,
} from "@silvana-one/abi";
import { createTransactionPayloads } from "@silvana-one/mina-utils";
import {
  NftTransaction,
  NftTransactions,
  LaunchNftCollectionStandardAdminParams,
  LaunchNftCollectionAdvancedAdminParams,
  MintNftData,
  NftMintTransactionParams,
  NftTransactionType,
  NftTransactionParams,
  NftSellTransactionParams,
} from "@silvana-one/api";
import { ApiName, ApiResponse } from "../api-types";
import { checkAddress, checkPrivateKey } from "../utils/address";
import { accountExists } from "@/lib/account";
import { debug } from "@/lib/debug";
import { getWallet, getChain, convertToPrismaChain } from "@/lib/chain";
import { getAccountNonce } from "../../nonce";
import { getFee } from "@/lib/fee";
import { saveMesaPrivateKey } from "@/lib/mesa/keys";
import { MesaKeyPersistenceError } from "@/lib/mesa/retry";
const WALLET = getWallet();
const chain = getChain();
const DEBUG = debug();

export type DeployedNftTransactionParams = Exclude<
  NftTransactionParams,
  | LaunchNftCollectionStandardAdminParams
  | LaunchNftCollectionAdvancedAdminParams
>;

export async function nftTransaction(props: {
  params: DeployedNftTransactionParams;
  name: ApiName;
  apiKeyAddress: string;
}): Promise<ApiResponse<NftTransaction>> {
  try {
    const { name, params: txParams, apiKeyAddress } = props;
    const txType = txParams.txType;
    if (DEBUG) console.log("NFT transaction", name, txParams);
    if (DEBUG) console.log("chain", chain);
    await initBlockchain();
    const FEE = txType === "nft:mint" ? LAUNCH_FEE : TRANSACTION_FEE;

    if (!checkAddress(txParams.sender)) {
      return {
        status: 400,
        json: { error: "Invalid sender address" },
      };
    }

    if (txParams.nonce && typeof txParams.nonce !== "number") {
      return {
        status: 400,
        json: { error: "Invalid nonce" },
      };
    }

    if (
      "nftSellParams" in txParams &&
      txParams.nftSellParams &&
      (!txParams.nftSellParams.price ||
        typeof txParams.nftSellParams.price !== "number" ||
        txParams.nftSellParams.price <= 0)
    ) {
      return {
        status: 400,
        json: { error: "Invalid price" },
      };
    }

    // if (
    //   (txType === "token:offer:create" || txType === "token:bid:create") &&
    //   (!("price" in txParams) ||
    //     !txParams.price ||
    //     typeof txParams.price !== "number" ||
    //     txParams.price <= 0)
    // ) {
    //   return {
    //     status: 400,
    //     json: { error: "Price is required for offer and bid" },
    //   };
    // }

    if (txParams.developerFee && typeof txParams.developerFee !== "number") {
      return {
        status: 400,
        json: { error: "Invalid developer fee" },
      };
    }

    if (
      !txParams.collectionAddress ||
      !checkAddress(txParams.collectionAddress)
    ) {
      return {
        status: 400,
        json: { error: "Invalid collection address" },
      };
    }

    if (
      txType !== "nft:mint" &&
      (!txParams.nftAddress || !checkAddress(txParams.nftAddress))
    ) {
      return {
        status: 400,
        json: { error: "Invalid NFT address" },
      };
    }

    if (!txParams.sender || !checkAddress(txParams.sender)) {
      return {
        status: 400,
        json: { error: "Invalid sender address" },
      };
    }

    if (
      "senderPrivateKey" in txParams &&
      txParams.senderPrivateKey &&
      !checkPrivateKey(txParams.senderPrivateKey)
    ) {
      return {
        status: 400,
        json: { error: "Invalid sender private key" },
      };
    }

    if (
      "nftSellParams" in txParams &&
      txParams.nftSellParams &&
      txParams.nftSellParams.offerPrivateKey &&
      (typeof txParams.nftSellParams.offerPrivateKey !== "string" ||
        !checkPrivateKey(txParams.nftSellParams.offerPrivateKey))
    ) {
      return {
        status: 400,
        json: { error: "Invalid offer contract private key" },
      };
    }

    if (!apiKeyAddress || !checkAddress(apiKeyAddress)) {
      return {
        status: 400,
        json: { error: "Invalid API key address" },
      };
    }

    if (txParams.developerFee && !(await accountExists(apiKeyAddress))) {
      return {
        status: 400,
        json: { error: "Developer address is not activated" },
      };
    }

    // if ("to" in txParams && txParams.to && !checkAddress(txParams.to)) {
    //   return {
    //     status: 400,
    //     json: { error: "Invalid to address" },
    //   };
    // }

    // if (
    //   "offerAddress" in txParams &&
    //   txParams.offerAddress &&
    //   !checkAddress(txParams.offerAddress)
    // ) {
    //   return {
    //     status: 400,
    //     json: { error: "Invalid offer address" },
    //   };
    // }

    // if (
    //   "bidAddress" in txParams &&
    //   txParams.bidAddress &&
    //   !checkAddress(txParams.bidAddress)
    // ) {
    //   return {
    //     status: 400,
    //     json: { error: "Invalid bid address" },
    //   };
    // }

    // if (txType === "token:transfer" && (!("to" in txParams) || !txParams.to)) {
    //   return {
    //     status: 400,
    //     json: { error: "To address is required for transfer" },
    //   };
    // }

    // if (txType === "token:mint" && (!("to" in txParams) || !txParams.to)) {
    //   return {
    //     status: 400,
    //     json: { error: "To address is required for mint" },
    //   };
    // }

    // if ("amount" in txParams && txParams.amount && txParams.amount <= 0) {
    //   return {
    //     status: 400,
    //     json: { error: "Invalid amount" },
    //   };
    // }

    if (txParams.memo && typeof txParams.memo !== "string") {
      return {
        status: 400,
        json: { error: "Invalid memo" },
      };
    }

    if (
      txParams.memo &&
      typeof txParams.memo === "string" &&
      txParams.memo.length > 30
    ) {
      return {
        status: 400,
        json: { error: "Memo is too long" },
      };
    }

    const sender = PublicKey.fromBase58(txParams.sender);

    const symbol = "NFT";

    const fee = txParams.fee ?? (await getFee({ params: { weight: 6 } }));
    txParams.fee = fee;
    const collectionAddress = PublicKey.fromBase58(txParams.collectionAddress);
    if (DEBUG) console.log("Collection", collectionAddress.toBase58());
    const wallet = PublicKey.fromBase58(WALLET);

    // const amount =
    //   "amount" in txParams && txParams.amount
    //     ? UInt64.from(txParams.amount)
    //     : UInt64.from(0);
    // const price =
    //   "price" in txParams && txParams.price
    //     ? UInt64.from(txParams.price)
    //     : undefined;
    const developerFee =
      "developerFee" in txParams && txParams.developerFee
        ? UInt64.from(txParams.developerFee)
        : undefined;
    const developerFeeAddress = PublicKey.fromBase58(apiKeyAddress);

    // if (DEBUG) console.log("amount:", amount.toBigInt());

    const tokenId = TokenId.derive(collectionAddress);

    const action =
      {
        "nft:mint": "mint",
        "nft:transfer": "transfer",
        "nft:approve": "approve",
        "nft:buy": "buy",
        "nft:sell": "sell",
      }[txType ?? ""] || "process";

    const memo = txParams.memo ?? `${action} ${symbol}`.substring(0, 30);
    if (DEBUG) console.log("memo:", memo);
    txParams.memo = memo;
    try {
      await fetchMinaAccount({
        publicKey: sender,
        force: false,
      });

      // await fetchMinaAccount({
      //   publicKey: sender,
      //   tokenId,
      //   force: false,
      // });
      // if ("to" in txParams && txParams.to)
      //   await fetchMinaAccount({
      //     publicKey: PublicKey.fromBase58(txParams.to),
      //     tokenId,
      //     force: false,
      //   });
    } catch (error) {
      return {
        status: 400,
        json: { error: "Error fetching Mina accounts" },
      };
    }
    if (DEBUG) console.log("Fetching accounts done");

    if (!Mina.hasAccount(sender)) {
      return {
        status: 400,
        json: {
          error: `Account ${sender.toBase58()} not found. Please fund your account or try again later, after all the previous transactions are included in the block.`,
        },
      };
    }

    const balance = await accountBalanceMina(sender);
    // const isNewAccount =
    //   "to" in txParams && txParams.to
    //     ? Mina.hasAccount(PublicKey.fromBase58(txParams.to), tokenId) === false
    //     : false;
    const requiredBalance = (FEE + fee) / 1_000_000_000;
    if (requiredBalance > balance) {
      return {
        status: 400,
        json: {
          error: `Insufficient balance of the sender: ${balance} MINA. Required: ${requiredBalance} MINA`,
        },
      };
    }
    let offerPrivateKey: string | undefined =
      "nftSellParams" in txParams && txParams.nftSellParams
        ? txParams.nftSellParams.offerPrivateKey
        : undefined;
    let offerAddress: string | undefined =
      "nftSellParams" in txParams && txParams.nftSellParams
        ? txParams.nftSellParams.offerAddress
        : undefined;
    if (txType === "nft:sell") {
      if (!offerPrivateKey) {
        offerPrivateKey = PrivateKey.random().toBase58();
        offerAddress = PrivateKey.fromBase58(offerPrivateKey)
          .toPublicKey()
          .toBase58();
      }
      (txParams as NftSellTransactionParams).nftSellParams.offerPrivateKey =
        offerPrivateKey;
      (txParams as NftSellTransactionParams).nftSellParams.offerAddress =
        offerAddress;

      if (!offerAddress) {
        return {
          status: 400,
          json: { error: "Invalid offer contract address" },
        };
      }

      if (
        PrivateKey.fromBase58(offerPrivateKey).toPublicKey().toBase58() !==
        PublicKey.fromBase58(offerAddress).toBase58()
      )
        return {
          status: 400,
          json: { error: "Invalid offer contract private key" },
        };

      // Mesa upgrade: persist the generated NFT offer account private key (testnet only).
      const mesaChain = convertToPrismaChain(chain);
      if (mesaChain && offerPrivateKey && offerAddress) {
        await saveMesaPrivateKey({
          publicKey: offerAddress,
          privateKey: offerPrivateKey,
          walletAddress: txParams.sender,
          operation: "NFT_SELL",
          accountType: "TOKEN",
          mainAccountPublicKey: txParams.collectionAddress,
          chain: mesaChain,
          source: "api",
          context: { role: "offer" },
        });
      }
    }

    // let bidPrivateKey: string | undefined =
    //   "bidPrivateKey" in txParams ? txParams.bidPrivateKey : undefined;
    // let bidAddress: string | undefined =
    //   "bidAddress" in txParams ? txParams.bidAddress : undefined;
    // if (txType === "token:bid:create") {
    //   if (!bidPrivateKey) {
    //     bidPrivateKey = PrivateKey.random().toBase58();
    //     bidAddress = PrivateKey.fromBase58(bidPrivateKey)
    //       .toPublicKey()
    //       .toBase58();
    //   }
    //   (txParams as TokenBidTransactionParams).bidPrivateKey = bidPrivateKey;
    //   (txParams as TokenBidTransactionParams).bidAddress = bidAddress;

    //   if (!bidAddress) {
    //     return {
    //       status: 400,
    //       json: { error: "Invalid bid address" },
    //     };
    //   }

    //   if (
    //     PrivateKey.fromBase58(bidPrivateKey).toPublicKey().toBase58() !==
    //     PublicKey.fromBase58(bidAddress).toBase58()
    //   )
    //     return {
    //       status: 400,
    //       json: { error: "Invalid bid private key" },
    //     };
    // }

    txParams.nonce =
      "nonce" in txParams && txParams.nonce
        ? txParams.nonce
        : await getAccountNonce(sender.toBase58());
    if (txParams.nonce === undefined) {
      return {
        status: 400,
        json: {
          error: "Failed to get account nonce for sender " + sender.toBase58(),
        },
      };
    }
    if (txType === "nft:mint") {
      txParams.nftMintParams.addressPrivateKey =
        txParams.nftMintParams.addressPrivateKey ??
        PrivateKey.random().toBase58();
      txParams.nftMintParams.address =
        txParams.nftMintParams.address ??
        PrivateKey.fromBase58(txParams.nftMintParams.addressPrivateKey)
          .toPublicKey()
          .toBase58();

      // Mesa upgrade: persist the generated NFT account private key (testnet only).
      const mesaChain = convertToPrismaChain(chain);
      if (mesaChain) {
        await saveMesaPrivateKey({
          publicKey: txParams.nftMintParams.address,
          privateKey: txParams.nftMintParams.addressPrivateKey,
          walletAddress: txParams.sender,
          operation: "NFT_MINT",
          accountType: "TOKEN",
          mainAccountPublicKey: txParams.collectionAddress,
          chain: mesaChain,
          source: "api",
          context: { role: "nft_mint" },
        });
      }
    }

    if (DEBUG) console.log("building tx", txParams);
    const {
      tx,
      request,
      metadataRoot,
      privateMetadata,
      storage,
      collectionName,
      nftName,
    } =
      txType === "nft:mint"
        ? await buildNftMintTransaction({
            chain,
            args: txParams,
            developerAddress: apiKeyAddress,
            provingKey: wallet.toBase58(),
            provingFee: FEE,
          })
        : await buildNftTransaction({
            chain,
            args: txParams,
            developerAddress: apiKeyAddress,
            provingKey: wallet.toBase58(),
            provingFee: FEE,
          });
    const signers: string[] = [];
    if (txType === "nft:sell" && offerPrivateKey) signers.push(offerPrivateKey);

    // if (txType === "token:bid:create" && bidPrivateKey)
    //   signers.push(bidPrivateKey);

    if (txType === "nft:mint" && txParams.nftMintParams.addressPrivateKey)
      signers.push(txParams.nftMintParams.addressPrivateKey);

    if ("senderPrivateKey" in txParams && txParams.senderPrivateKey)
      signers.push(txParams.senderPrivateKey);

    if (signers.length > 0)
      tx.sign(signers.map((s) => PrivateKey.fromBase58(s)));
    const payloads = createTransactionPayloads(tx);

    if (txType === "nft:mint") {
      (request as NftMintTransactionParams).nftMintParams = {
        ...txParams.nftMintParams,
        storage,
        metadata: metadataRoot,
      };
    }

    return {
      status: 200,
      json: {
        ...(payloads as any),
        symbol,
        collectionName,
        nftName,
        request: {
          ...request,
          txType,
        } as NftTransaction["request"],
        metadataRoot,
        privateMetadata,
        storage,
      } satisfies NftTransaction,
    };
  } catch (error) {
    if (error instanceof MesaKeyPersistenceError) {
      return {
        status: 503,
        json: { error: "Could not persist deployment key — please retry" },
      };
    }
    return {
      status: 400,
      json: {
        error:
          error instanceof Error
            ? error.message
            : "Error building NFT transaction",
      },
    };
  }
}
