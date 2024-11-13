"use server";
import type { NextApiRequest, NextApiResponse } from "next";
import {
  PrivateKey,
  Mina,
  AccountUpdate,
  SmartContract,
  method,
  state,
  State,
  PublicKey,
  UInt64,
} from "o1js";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET" || req.method === "POST") {
    try {
      const { status, json } = await test();
      console.log("GameContract", status, json);
      res.status(status).json(json);
    } catch (error) {
      res.status(500).json({ error: "Invalid request body" });
    }
  } else {
    // Handle other HTTP methods
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default handler;

/* Usage:
devnet:
curl -X POST \
  -H "Content-Type: application/json" \
  https://minatokens.com/api/v1/test1
*/

export class GameContract extends SmartContract {
  @state(PublicKey) player1 = State<PublicKey>();
  @state(PublicKey) player2 = State<PublicKey>();
  @state(UInt64) totalAmount = State<UInt64>();

  @method async initGame(player1Address: PublicKey, player2Address: PublicKey) {
    this.player1.set(player1Address);
    this.player2.set(player2Address);

    this.send({ to: this.address, amount: UInt64.from(1_000_000_000) });
  }

  @method async distributeReward(winnerAddress: PublicKey) {
    const p1 = this.player1.getAndRequireEquals();
    const p2 = this.player2.getAndRequireEquals();

    const isWinnerValid = winnerAddress.equals(p1).or(winnerAddress.equals(p2));
    isWinnerValid.assertTrue("Winner must be one of the two players");

    this.send({ to: winnerAddress, amount: UInt64.from(2_000_000_000) });
  }
}

async function test() {
  try {
    const { zkAppAddress, txId } = await deployGameContract(
      PrivateKey.fromBase58(
        "EKF6pVuFihtj2YDjQxumLsVnR6Wxhkk1RPCCxNjVjaDFKSjq1L1z"
      ),
      [PrivateKey.random().toPublicKey(), PrivateKey.random().toPublicKey()]
    );
    return { status: 200, json: { zkAppAddress, txId } };
  } catch (error) {
    return { status: 500, json: { error: String(error) } };
  }
}
/**
   
  Helper function to deploy the GameContract smart contract
  @param {PrivateKey} deployerKey - The private key for the deployer account
  @param {PublicKey[]} players - Array of public keys for players (2 players)
  @returns {Promise<{ zkAppAddress: string; txId: string }>} - Returns the zkApp address and transaction ID*/

async function deployGameContract(
  deployerKey: PrivateKey,
  players: PublicKey[]
): Promise<{ zkAppAddress: string; txId: string }> {
  const zkAppPrivateKey = PrivateKey.random();
  const zkAppAddress = zkAppPrivateKey.toPublicKey();
  const zkAppInstance = new GameContract(zkAppAddress);

  const Network = Mina.Network(
    "https://api.minascan.io/node/devnet/v1/graphql"
  );
  Mina.setActiveInstance(Network);

  const vk = (await GameContract.compile()).verificationKey.hash.toJSON();
  console.log("vk", vk);

  const deployTransaction = await Mina.transaction(
    {
      sender: deployerKey.toPublicKey(),
      fee: UInt64.from(100_000_000),
    },
    async () => {
      AccountUpdate.fundNewAccount(deployerKey.toPublicKey());
      await zkAppInstance.deploy();
      await zkAppInstance.initGame(players[0], players[1]);
    }
  );
  await deployTransaction.prove();

  deployTransaction.sign([deployerKey, zkAppPrivateKey]);
  const pendingTransaction = await deployTransaction.send();
  const txId = pendingTransaction.hash;

  return { zkAppAddress: zkAppAddress.toBase58(), txId };
}
