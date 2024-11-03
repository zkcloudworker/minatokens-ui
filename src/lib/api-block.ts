"use server";
import {
  Mina,
  PublicKey,
  Bool,
  TokenId,
  fetchAccount,
  Struct,
  UInt8,
  Field,
  UInt64,
  Encoding,
  Provable,
  UInt32,
} from "o1js";

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

class BlockState extends Struct({
  blockNumber: UInt64,
  root: Field,
  storage: Storage,
  previousBlock: PublicKey,
  txsHash: Field,
  blockParams: Field,
}) {}

export class LastBlockPacked extends Struct({
  x: Field,
  data: Field,
}) {}

export class LastBlock extends Struct({
  address: PublicKey,
  blockNumber: UInt64,
}) {
  pack(): LastBlockPacked {
    return new LastBlockPacked({
      x: this.address.x,
      data: Field.fromBits([
        ...this.blockNumber.value.toBits(64),
        this.address.isOdd,
      ]),
    });
  }

  static unpack(packed: LastBlockPacked): LastBlock {
    const bits = packed.data.toBits(64 + 1);
    const address = PublicKey.from({
      x: packed.x,
      isOdd: bits[64],
    });
    const blockNumber = UInt64.from(0);
    blockNumber.value = Field.fromBits(bits.slice(0, 64));
    return new LastBlock({
      address,
      blockNumber,
    });
  }
}

class ContractState extends Struct({
  domain: Field,
  validatorsPacked: Field,
  lastCreatedBlock: LastBlockPacked,
  lastValidatedBlock: LastBlockPacked,
  lastProvedBlock: LastBlockPacked,
}) {}

const ContractStateSize = ContractState.sizeInFields();
const BlockStateSize = BlockState.sizeInFields();

export class BlockParams extends Struct({
  txsCount: UInt32,
  timeCreated: UInt64,
  isValidated: Bool,
  isFinal: Bool,
  isProved: Bool,
  isInvalid: Bool,
}) {
  pack(): Field {
    const txsCount = this.txsCount.value.toBits(32);
    const timeCreated = this.timeCreated.value.toBits(64);
    return Field.fromBits([
      ...txsCount,
      ...timeCreated,
      this.isValidated,
      this.isFinal,
      this.isProved,
      this.isInvalid,
    ]);
  }
  static unpack(packed: Field) {
    const bits = packed.toBits(32 + 64 + 4);
    const txsCount = UInt32.from(0);
    const timeCreated = UInt64.from(0);
    txsCount.value = Field.fromBits(bits.slice(0, 32));
    timeCreated.value = Field.fromBits(bits.slice(32, 96));
    return new BlockParams({
      txsCount,
      timeCreated,
      isValidated: bits[96],
      isFinal: bits[97],
      isProved: bits[98],
      isInvalid: bits[99],
    });
  }
}

export async function getBlocksInfo(params: {
  contractAddress: string;
  startBlock?: string;
  chain: "devnet" | "mainnet";
}): Promise<
  { success: true; blockInfo: object } | { success: false; error: string }
> {
  const { chain } = params;
  const startTime = Date.now();
  const MAX_RUN_TIME = 1000 * 10; // 10 seconds
  const MAX_BLOCKS = 3;
  try {
    if (params.contractAddress === undefined) {
      console.error("getBlocksInfo: contractAddress is undefined");
      return {
        success: false,
        error: "getBlocksInfo: contractAddress is undefined",
      };
    }
    let startBlock: PublicKey | undefined = params.startBlock
      ? PublicKey.fromBase58(params.startBlock)
      : undefined;

    const contractAddress = PublicKey.fromBase58(params.contractAddress);
    if (
      contractAddress.toBase58() !==
      "B62qoYeVkaeVimrjBNdBEKpQTDR1gVN2ooaarwXaJmuQ9t8MYu9mDNS"
    ) {
      console.error("getBlocksInfo: contractAddress is invalid");
      return {
        success: false,
        error: "getBlocksInfo: contractAddress is invalid",
      };
    }
    await initBlockchain(chain);
    const tokenId = TokenId.derive(contractAddress);
    await fetchMinaAccount({
      publicKey: contractAddress,
      force: false,
    });
    if (!Mina.hasAccount(contractAddress)) {
      console.error(
        `getBlocksInfo: Contract ${contractAddress.toBase58()} not found`
      );
      return {
        success: false,
        error: `getBlocksInfo: Contract ${contractAddress.toBase58()} not found`,
      };
    }
    const zkAppAccount = Mina.getAccount(contractAddress);
    if (zkAppAccount.zkapp?.appState === undefined) {
      console.error(
        `getBlocksInfo: Contract ${contractAddress.toBase58()} has no appState`
      );
      return {
        success: false,
        error: `getBlocksInfo: Contract ${contractAddress.toBase58()} has no appState`,
      };
    }
    const zkApp: ContractState = ContractState.fromFields(
      zkAppAccount.zkapp?.appState.slice(0, ContractStateSize)
    );
    if (startBlock === undefined) {
      startBlock = LastBlock.unpack(zkApp.lastCreatedBlock).address;
    }
    await fetchMinaAccount({
      publicKey: startBlock,
      tokenId,
      force: false,
    });
    if (!Mina.hasAccount(startBlock, tokenId)) {
      console.error(`getBlocksInfo: Block ${startBlock.toBase58()} not found`);
      return {
        success: false,
        error: `getBlocksInfo: Block ${startBlock.toBase58()} not found`,
      };
    }
    let startBlockAccount = Mina.getAccount(startBlock, tokenId);
    if (startBlockAccount.zkapp?.appState === undefined) {
      console.error(
        `getBlocksInfo: Block ${startBlock.toBase58()} has no appState`
      );
      return {
        success: false,
        error: `getBlocksInfo: Block ${startBlock.toBase58()} has no appState`,
      };
    }
    let count = 0;
    // const validators = getValidators(0).validators;
    const validatorsPacked = zkApp.validatorsPacked;
    // if (validators.pack().toJSON() !== validatorsPacked.toJSON())
    //   throw new Error("Invalid validatorsPacked");
    const lastCreatedBlock = LastBlock.unpack(zkApp.lastCreatedBlock);
    const lastValidatedBlock = LastBlock.unpack(zkApp.lastValidatedBlock);
    const lastProvedBlock = LastBlock.unpack(zkApp.lastProvedBlock);
    const contractState = {
      domain: Encoding.stringFromFields([zkApp.domain]),
      validatorsPacked: validatorsPacked.toJSON(),
      lastCreatedBlock: {
        address: lastCreatedBlock.address.toBase58(),
        blockNumber: lastCreatedBlock.blockNumber.toBigInt().toString(),
      },
      lastValidatedBlock: {
        address: lastValidatedBlock.address.toBase58(),
        blockNumber: lastValidatedBlock.blockNumber.toBigInt().toString(),
      },
      lastProvedBlock: {
        address: lastProvedBlock.address.toBase58(),
        blockNumber: lastProvedBlock.blockNumber.toBigInt().toString(),
      },
    };
    let blockAddress = startBlock;
    let block: BlockState = BlockState.fromFields(
      startBlockAccount.zkapp?.appState.slice(0, BlockStateSize)
    );
    let blockNumber = Number(block.blockNumber.toBigInt());
    const blocks: {}[] = [];
    while (
      count < MAX_BLOCKS &&
      blockNumber > 0 &&
      Date.now() - startTime < MAX_RUN_TIME
    ) {
      const root = block.root.toJSON();
      const storage = block.storage.toIpfsHash();
      const flags = BlockParams.unpack(block.blockParams);
      const isValidated = flags.isValidated.toBoolean();
      const isInvalid = flags.isInvalid.toBoolean();
      const isProved = flags.isProved.toBoolean();
      const isFinal = flags.isFinal.toBoolean();
      const timeCreated = flags.timeCreated;
      const txsCount = flags.txsCount;
      const txsHash = block.txsHash.toJSON();
      const previousBlockAddress = block.previousBlock;
      blocks.push({
        blockNumber,
        blockAddress: blockAddress.toBase58(),
        root,
        ipfs: storage,
        isValidated,
        isInvalid,
        isProved,
        isFinal,
        timeCreated,
        txsCount,
        txsHash,
        previousBlockAddress: previousBlockAddress.toBase58(),
      });

      blockAddress = previousBlockAddress;

      await fetchMinaAccount({
        publicKey: blockAddress,
        tokenId,
        force: false,
      });
      if (!Mina.hasAccount(blockAddress, tokenId)) {
        console.error(
          `getBlocksInfo: Block ${blockAddress.toBase58()} not found`
        );
        return {
          success: false,
          error: `getBlocksInfo: Block ${blockAddress.toBase58()} not found`,
        };
      }
      const blockAccount = Mina.getAccount(blockAddress, tokenId);
      if (blockAccount.zkapp?.appState === undefined) {
        console.error(
          `getBlocksInfo: Block ${blockAddress.toBase58()} has no appState`
        );
        return {
          success: false,
          error: `getBlocksInfo: Block ${blockAddress.toBase58()} has no appState`,
        };
      }
      block = BlockState.fromFields(
        blockAccount.zkapp?.appState.slice(0, BlockStateSize)
      );

      blockNumber = Number(block.blockNumber.toBigInt());
      count++;
    }
    return {
      success: true,
      blockInfo: {
        contractAddress: contractAddress.toBase58(),
        startBlock: startBlock.toBase58(),
        blocks,
        contractState,
      },
    };
  } catch (error: any) {
    console.error("Error in getBlocksInfo", error);
    return {
      success: false,
      error: `Error in getBlocksInfo: ${error?.message ?? String(error)}`,
    };
  }
}

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

/**
 * Fetches the Mina account for a given public key with error handling
 * @param params the parameters for fetching the account
 * @param params.publicKey the public key of the account
 * @param params.tokenId the token id of the account
 * @param params.force whether to force the fetch - use it only if you are sure the account exists
 * @returns the account object
 */
export async function fetchMinaAccount(params: {
  publicKey: string | PublicKey;
  tokenId?: string | Field | undefined;
  force?: boolean;
}) {
  const { publicKey, tokenId, force } = params;
  const timeout = 1000 * 10; // 10 seconds
  const startTime = Date.now();
  let result = { account: undefined };
  while (Date.now() - startTime < timeout) {
    try {
      const result = await fetchAccount({
        publicKey,
        tokenId,
      });
      return result;
    } catch (error: any) {
      if (force === true)
        console.log("Error in fetchMinaAccount:", {
          error,
          publicKey:
            typeof publicKey === "string" ? publicKey : publicKey.toBase58(),
          tokenId: tokenId?.toString(),
          force,
        });
      else {
        console.log("fetchMinaAccount error", {
          error,
          publicKey:
            typeof publicKey === "string" ? publicKey : publicKey.toBase58(),
          tokenId: tokenId?.toString(),
          force,
        });
        return result;
      }
    }
    await sleep(1000 * 5);
  }
  if (force === true)
    throw new Error(
      `fetchMinaAccount timeout
      ${{
        publicKey:
          typeof publicKey === "string" ? publicKey : publicKey.toBase58(),
        tokenId: tokenId?.toString(),
        force,
      }}`
    );
  else
    console.log(
      "fetchMinaAccount timeout",
      typeof publicKey === "string" ? publicKey : publicKey.toBase58(),
      tokenId?.toString(),
      force
    );
  return result;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
