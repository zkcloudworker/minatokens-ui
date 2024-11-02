"use server";
import {
  Mina,
  PublicKey,
  Bool,
  TokenId,
  Struct,
  Field,
  Provable,
  Encoding,
  UInt64,
  UInt32,
  fetchAccount,
} from "o1js";

interface NFTStateJson {
  name: string;
  metadata: {
    data: number;
    kind: number;
  };
  storage: string;
  owner: string;
  price: number;
  version: number;
}

// export async function getNFTState(params: {
//   contractAddress: string; // always B62qs2NthDuxAT94tTFg6MtuaP1gaBxTZyNv9D3uQiQciy1VsaimNFT
//   nftAddress: string; // example: B62qnkz5juL135pJAw7XjLXwvrKAdgbau1V9kEpC1S1x8PfUxcu8KMP on mainnet
//   // B62qoT6jXebkJVmsUmxCxGJmvHJUXPNF417rms4PATi5R6Hw7e56CRt on devnet with markdown
//   chain: "devnet" | "mainnet";
// }): Promise<
//   | {
//       success: true;
//       tokenState: NFTStateJson;
//     }
//   | {
//       success: false;
//       error: string;
//     }
// > {
//   const { contractAddress, nftAddress, chain } = params;
//   try {
//     await initBlockchain(chain);
//     const contractPublicKey = PublicKey.fromBase58(contractAddress);
//     const nftPublicKey = PublicKey.fromBase58(nftAddress);
//     const tokenId = TokenId.derive(contractPublicKey);

//     await fetchAccount({ publicKey: nftPublicKey, tokenId });
//     if (!Mina.hasAccount(tokenContractPublicKey)) {
//       if (DEBUG)
//         console.error("getTokenState: Token contract account not found", {
//           tokenAddress,
//         });
//       return { success: false, error: "Token contract account not found" };
//     }
//     const tokenId = tokenContract.deriveTokenId();
//     await fetchMinaAccount({
//       publicKey: tokenContractPublicKey,
//       tokenId,
//       force: false,
//     });
//     if (!Mina.hasAccount(tokenContractPublicKey, tokenId)) {
//       console.error(
//         "getTokenState: Token contract totalSupply account not found",
//         {
//           tokenAddress,
//         }
//       );
//       return {
//         success: false,
//         error: "Token contract totalSupply account not found",
//       };
//     }

//     const adminContractPublicKey = tokenContract.admin.get();
//     const decimals = tokenContract.decimals.get().toNumber();
//     const isPaused = (tokenContract.paused.get() as Bool).toBoolean();
//     const totalSupply = Number(
//       Mina.getBalance(tokenContractPublicKey, tokenId).toBigInt()
//     );
//     const account = Mina.getAccount(tokenContractPublicKey);
//     const tokenSymbol = account.tokenSymbol;
//     const uri = account.zkapp?.zkappUri;

//     if (uri === undefined) {
//       console.error("getTokenState: Token uri not found", {
//         tokenAddress,
//       });
//       return {
//         success: false,
//         error: "Token uri not found",
//       };
//     }
//     const verificationKeyHash = account.zkapp?.verificationKey?.hash.toJSON();
//     if (verificationKeyHash === undefined) {
//       console.error("getTokenState: Token verification key hash not found", {
//         tokenAddress,
//       });
//       return {
//         success: false,
//         error: "Token verification key hash not found",
//       };
//     }
//     const versionData = account.zkapp?.zkappVersion;
//     if (versionData === undefined) {
//       console.error("getTokenState: Token contract version not found", {
//         tokenAddress,
//       });
//       return {
//         success: false,
//         error: "Token contract version not found",
//       };
//     }
//     const version = Number(versionData.toBigint());

//     await fetchMinaAccount({ publicKey: adminContractPublicKey, force: false });
//     if (!Mina.hasAccount(adminContractPublicKey)) {
//       console.error("getTokenState: Admin contract account not found", {
//         tokenAddress,
//       });
//       return {
//         success: false,
//         error: "Admin contract account not found",
//       };
//     }

//     const adminContract = Mina.getAccount(adminContractPublicKey);
//     const adminTokenSymbol = adminContract.tokenSymbol;
//     const adminUri = adminContract.zkapp?.zkappUri;

//     const adminVerificationKeyHash =
//       adminContract.zkapp?.verificationKey?.hash.toJSON();
//     if (adminVerificationKeyHash === undefined) {
//       console.error(
//         "getTokenState: Admin contract verification key hash not found",
//         {
//           adminContractPublicKey: adminContractPublicKey.toBase58(),
//         }
//       );
//       return {
//         success: false,
//         error: "Admin contract verification key hash not found",
//       };
//     }
//     const adminVersionData = adminContract.zkapp?.zkappVersion;
//     if (adminVersionData === undefined) {
//       console.error("getTokenState: Admin contract version not found", {
//         adminContractPublicKey: adminContractPublicKey.toBase58(),
//       });
//       return {
//         success: false,
//         error: "Admin contract version not found",
//       };
//     }
//     const adminVersion = Number(adminVersionData.toBigint());
//     const adminAddress0 = adminContract.zkapp?.appState[0];
//     const adminAddress1 = adminContract.zkapp?.appState[1];
//     if (adminAddress0 === undefined || adminAddress1 === undefined) {
//       console.error("Cannot fetch admin address from admin contract");
//       return {
//         success: false,
//         error: "Cannot fetch admin address from admin contract",
//       };
//     }
//     const adminAddress = PublicKey.fromFields([adminAddress0, adminAddress1]);
//     let adminTokenBalance = 0;
//     try {
//       await fetchMinaAccount({
//         publicKey: adminAddress,
//         tokenId,
//         force: false,
//       });
//       adminTokenBalance = Number(
//         Mina.getBalance(adminAddress, tokenId).toBigInt()
//       );
//     } catch (error) {
//       console.error("getTokenState: Cannot fetch admin token balance", {
//         adminAddress: adminAddress.toBase58(),
//       });
//     }

//     const tokenState: TokenState = {
//       tokenAddress: tokenContractPublicKey.toBase58(),
//       tokenId: TokenId.toBase58(tokenId),
//       adminContractAddress: adminContractPublicKey.toBase58(),
//       adminAddress: adminAddress.toBase58(),
//       adminTokenBalance,
//       totalSupply,
//       isPaused,
//       decimals,
//       tokenSymbol,
//       verificationKeyHash,
//       uri,
//       version,
//       adminTokenSymbol,
//       adminUri: adminUri ?? "",
//       adminVerificationKeyHash,
//       adminVersion,
//     };
//     let tokenInfo = info;
//     let isStateUpdated = false;
//     if (tokenInfo === undefined) {
//       tokenInfo = await algoliaGetToken({
//         tokenAddress: tokenContractPublicKey.toBase58(),
//       });
//     }
//     if (tokenInfo === undefined) {
//       console.error("getTokenState: Token info not found", {
//         tokenAddress,
//       });
//     } else {
//       if (
//         tokenInfo.adminContractAddress !== tokenState.adminContractAddress ||
//         tokenInfo.adminAddress !== tokenState.adminAddress ||
//         tokenInfo.totalSupply !== tokenState.totalSupply ||
//         tokenInfo.isPaused !== tokenState.isPaused ||
//         tokenInfo.decimals !== tokenState.decimals ||
//         tokenInfo.chain === undefined ||
//         tokenInfo.created === undefined ||
//         tokenInfo.updated === undefined ||
//         tokenInfo.tokenId !== tokenState.tokenId
//       ) {
//         console.error("getTokenState: Token info mismatch, updating the info", {
//           tokenAddress,
//           tokenInfo,
//           tokenState,
//         });
//         tokenInfo.tokenId = tokenState.tokenId;
//         tokenInfo.adminContractAddress = tokenState.adminContractAddress;
//         tokenInfo.adminAddress = tokenState.adminAddress;
//         tokenInfo.totalSupply = tokenState.totalSupply;
//         tokenInfo.isPaused = tokenState.isPaused;
//         tokenInfo.decimals = tokenState.decimals;
//         tokenInfo.updated = Date.now();
//         if (!tokenInfo.created) tokenInfo.created = tokenInfo.updated;
//         if (!tokenInfo.chain) tokenInfo.chain = chainId;
//         console.log("Updating token info", { tokenInfo });
//         await algoliaWriteToken({
//           tokenAddress: tokenContractPublicKey.toBase58(),
//           info: tokenInfo,
//         });
//         isStateUpdated = true;
//       }
//     }
//     return {
//       success: true,
//       tokenState,
//       isStateUpdated,
//     };
//   } catch (error: any) {
//     console.error("getTokenState catch", error);
//     return {
//       success: false,
//       error: "getTokenState catch:" + (error?.message ?? String(error)),
//     };
//   }
// }

class Metadata extends Struct({
  data: Field,
  kind: Field,
}) {
  /**
   * Asserts that two Metadata objects are equal
   * @param state1 first Metadata object
   * @param state2 second Metadata object
   */
  static assertEquals(state1: Metadata, state2: Metadata) {
    state1.data.assertEquals(state2.data);
    state1.kind.assertEquals(state2.kind);
  }
}

class Storage extends Struct({
  hashString: Provable.Array(Field, 2),
}) {
  constructor(value: { hashString: [Field, Field] }) {
    super(value);
  }

  static empty(): Storage {
    return new Storage({ hashString: [Field(0), Field(0)] });
  }

  isEmpty(): Bool {
    return this.hashString[0]
      .equals(Field(0))
      .and(this.hashString[1].equals(Field(0)));
  }

  static assertEquals(a: Storage, b: Storage) {
    a.hashString[0].assertEquals(b.hashString[0]);
    a.hashString[1].assertEquals(b.hashString[1]);
  }

  static fromIpfsHash(hash: string): Storage {
    const fields = Encoding.stringToFields("i:" + hash);
    if (fields.length !== 2) throw new Error("Invalid IPFS hash");
    return new Storage({ hashString: [fields[0], fields[1]] });
  }

  toIpfsHash(): string {
    const hash = Encoding.stringFromFields(this.hashString);
    if (hash.startsWith("i:")) {
      return hash.substring(2);
    } else throw new Error("Invalid IPFS hash");
  }

  toString(): string {
    if (this.isEmpty().toBoolean()) return "";
    else return Encoding.stringFromFields(this.hashString);
  }

  static fromString(storage: string) {
    if (
      storage.startsWith("i:") === false &&
      storage.startsWith("a:") === false
    )
      throw new Error("Invalid storage string");
    const fields = Encoding.stringToFields(storage);
    if (fields.length !== 2) throw new Error("Invalid storage string");
    return new Storage({ hashString: [fields[0], fields[1]] });
  }
}

class NFTparams extends Struct({
  price: UInt64,
  version: UInt32,
}) {
  pack(): Field {
    const price = this.price.value.toBits(64);
    const version = this.version.value.toBits(32);
    return Field.fromBits([...price, ...version]);
  }
  static unpack(packed: Field) {
    const bits = packed.toBits(64 + 32);
    const price = UInt64.from(0);
    price.value = Field.fromBits(bits.slice(0, 64));
    const version = UInt32.from(0);
    version.value = Field.fromBits(bits.slice(64, 64 + 32));
    return new NFTparams({ price, version });
  }
}

class NFTState extends Struct({
  name: Field,
  metadata: Metadata,
  storage: Storage,
  owner: PublicKey,
  data: Field,
}) {}

/**
 * blockchain is the type for the chain ID.
 */
type blockchain = "local" | "devnet" | "lightnet" | "mainnet" | "zeko";

interface MinaNetwork {
  /** The Mina endpoints */
  mina: string[];

  /** The archive endpoints */
  archive: string[];

  /** The chain ID */
  chainId: blockchain;

  /** The name of the network (optional) */
  name?: string;

  /** The account manager for Lightnet (optional) */
  accountManager?: string;

  /** The explorer account URL (optional) */
  explorerAccountUrl?: string;

  /** The explorer transaction URL (optional) */
  explorerTransactionUrl?: string;

  /** The faucet URL (optional) */
  faucet?: string;
}

const Mainnet: MinaNetwork = {
  mina: [
    //"https://proxy.devnet.minaexplorer.com/graphql",
    "https://api.minascan.io/node/mainnet/v1/graphql",
  ],
  archive: [
    "https://api.minascan.io/archive/mainnet/v1/graphql",
    //"https://archive.devnet.minaexplorer.com",
  ],
  explorerAccountUrl: "https://minascan.io/mainnet/account/",
  explorerTransactionUrl: "https://minascan.io/mainnet/tx/",
  chainId: "mainnet",
  name: "Mainnet",
};

const Devnet: MinaNetwork = {
  mina: [
    "https://api.minascan.io/node/devnet/v1/graphql",
    //"https://proxy.devnet.minaexplorer.com/graphql",
  ],
  archive: [
    "https://api.minascan.io/archive/devnet/v1/graphql",
    //"https://archive.devnet.minaexplorer.com",
  ],
  explorerAccountUrl: "https://minascan.io/devnet/account/",
  explorerTransactionUrl: "https://minascan.io/devnet/tx/",
  chainId: "devnet",
  name: "Devnet",
  faucet: "https://faucet.minaprotocol.com",
};

const Zeko: MinaNetwork = {
  mina: ["https://devnet.zeko.io/graphql"],
  archive: [],
  explorerAccountUrl: "https://zekoscan.io/devnet/account/",
  explorerTransactionUrl: "https://zekoscan.io/devnet/tx/",
  chainId: "zeko",
  name: "Zeko",
  faucet: "https://zeko.io/faucet",
};

const Local: MinaNetwork = {
  mina: [],
  archive: [],
  chainId: "local",
};

const networks: MinaNetwork[] = [Mainnet, Local, Devnet, Zeko];

let currentNetwork: MinaNetwork | undefined = undefined;

async function initBlockchain(instance: blockchain): Promise<MinaNetwork> {
  if (currentNetwork !== undefined) {
    if (currentNetwork?.chainId === instance) {
      return currentNetwork;
    } else {
      throw new Error(
        `Network is already initialized to different chain ${currentNetwork.chainId}, cannot initialize to ${instance}`
      );
    }
  }

  if (instance === "local") {
    const local = await Mina.LocalBlockchain({
      proofsEnabled: true,
    });
    Mina.setActiveInstance(local);

    currentNetwork = Local;
    return currentNetwork;
  }

  const network = networks.find((n) => n.chainId === instance);
  if (network === undefined) {
    throw new Error("Unknown network");
  }

  const networkInstance = Mina.Network({
    mina: network.mina,
    archive: network.archive,
    lightnetAccountManager: network.accountManager,
    networkId: instance === "mainnet" ? "mainnet" : "testnet",
  });
  Mina.setActiveInstance(networkInstance);

  currentNetwork = network;
  return currentNetwork;
}
