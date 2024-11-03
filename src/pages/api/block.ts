"use server";
import type { NextApiRequest, NextApiResponse } from "next";
import { checkApiKey } from "@/lib/api";
import { getBlocksInfo } from "@/lib/api-block";
import { checkAddress } from "@/lib/address";

/* Usage:

  contractAddress: string; 
  // example: "B62qoYeVkaeVimrjBNdBEKpQTDR1gVN2ooaarwXaJmuQ9t8MYu9mDNS"
  chain: "devnet" | "mainnet";

devnet:
curl -X POST -H 'x-api-key: API_KEY' \
  -H "Content-Type: application/json" \
  -d '{"contractAddress":"B62qoYeVkaeVimrjBNdBEKpQTDR1gVN2ooaarwXaJmuQ9t8MYu9mDNS", "chain":"devnet"}' \
  https://minatokens.com/api/block


  reply example:
{
  contractAddress: "B62qoYeVkaeVimrjBNdBEKpQTDR1gVN2ooaarwXaJmuQ9t8MYu9mDNS",
  startBlock: "B62qk2PmZQb3FcygdspV1NzUoqXkza4EVes5HmP2eSUnSeVfxf3sBZL",
  blocks: [
    {
      blockNumber: 120,
      blockAddress: "B62qk2PmZQb3FcygdspV1NzUoqXkza4EVes5HmP2eSUnSeVfxf3sBZL",
      root: "14690689137321256443252601542901519327289673102760379541221995838420973290283",
      ipfs: "bafkreiaybqwissnywy2c57saldu4xbawqnm26wukwfpka3qnu34pnz6cfm",
      isValidated: true,
      isInvalid: false,
      isProved: true,
      isFinal: true,
      timeCreated: "1725091856553",
      txsCount: "2",
      txsHash:
        "13381093276112067523370195830764898684727433585856733428444038839142129434694",
      previousBlockAddress:
        "B62qqhwM1mzfLQNU9FsQbeV14gKJA3RYyhSUsc8xdMWSXmjvRYT3Vok",
    },
    {
      blockNumber: 119,
      blockAddress: "B62qqhwM1mzfLQNU9FsQbeV14gKJA3RYyhSUsc8xdMWSXmjvRYT3Vok",
      root: "19987404897851621622585331675373625209420256394437610455098581068249576953838",
      ipfs: "bafkreigeqctn2wajcws2j6r2v3wcdybcizkzy6hts26ydvn2nye5zlk2ti",
      isValidated: true,
      isInvalid: false,
      isProved: true,
      isFinal: true,
      timeCreated: "1724924750544",
      txsCount: "1",
      txsHash:
        "11918595193180789850576139183172343385045817273676986428428836844425699680258",
      previousBlockAddress:
        "B62qnk2bRhGWQ5ats9S4Wbfyq5n3NCxH2zGY8K2XEoRqHPNcWZyZ16r",
    },
    {
      blockNumber: 118,
      blockAddress: "B62qnk2bRhGWQ5ats9S4Wbfyq5n3NCxH2zGY8K2XEoRqHPNcWZyZ16r",
      root: "6592405196376834551180725755405186910732846782001634437917682091295624487446",
      ipfs: "bafkreibmvghfvubcwjqsjzxjfjpnjkv3nk3w7ijjrj3u2ox7scm4wtk5ci",
      isValidated: true,
      isInvalid: false,
      isProved: true,
      isFinal: true,
      timeCreated: "1722374449545",
      txsCount: "1",
      txsHash:
        "22673565994127334775357733573946820735107822894588601671827314491174719436106",
      previousBlockAddress:
        "B62qqjg9xaL2sPuqQftd6ceAein6fzHoTngWixupoaU5Fc7YKnWraix",
    },
  ],
  contractState: {
    domain: "mina",
    validatorsPacked:
      "24439230666567705447588875750776001804793188109530397251111721542846184402310",
    lastCreatedBlock: {
      address: "B62qk2PmZQb3FcygdspV1NzUoqXkza4EVes5HmP2eSUnSeVfxf3sBZL",
      blockNumber: "120",
    },
    lastValidatedBlock: {
      address: "B62qk2PmZQb3FcygdspV1NzUoqXkza4EVes5HmP2eSUnSeVfxf3sBZL",
      blockNumber: "120",
    },
    lastProvedBlock: {
      address: "B62qk2PmZQb3FcygdspV1NzUoqXkza4EVes5HmP2eSUnSeVfxf3sBZL",
      blockNumber: "120",
    },
  },
};
*/

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { contractAddress, chain } = req.body;
  if (!contractAddress || !chain) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  if (!checkAddress(contractAddress)) {
    res.status(400).json({ error: "Invalid contract address" });
    return;
  }

  if (chain !== "devnet" && chain !== "mainnet") {
    res.status(400).json({ error: "Invalid chain" });
    return;
  }
  if (req.method === "GET" || req.method === "POST") {
    try {
      const result = await getBlocksInfo({
        contractAddress,
        chain,
      });
      if (!result.success) {
        res.status(404).json({ error: result.error });
        return;
      }
      res.status(200).json(result.blockInfo);
    } catch (error) {
      res.status(500).json({ error: "Invalid request body" });
    }
  } else {
    // Handle other HTTP methods
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default checkApiKey(handler);
