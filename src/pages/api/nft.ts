"use server";
import type { NextApiRequest, NextApiResponse } from "next";
import { checkApiKey } from "@/lib/api";
import { getNFTState } from "@/lib/nft";
import { checkAddress } from "@/lib/address";

/* Usage:

  contractAddress: string; // always B62qs2NthDuxAT94tTFg6MtuaP1gaBxTZyNv9D3uQiQciy1VsaimNFT
  nftAddress: string; 
  // example: B62qnkz5juL135pJAw7XjLXwvrKAdgbau1V9kEpC1S1x8PfUxcu8KMP on mainnet
  // example: B62qoT6jXebkJVmsUmxCxGJmvHJUXPNF417rms4PATi5R6Hw7e56CRt on devnet with markdown
  chain: "devnet" | "mainnet";

devnet:
curl -X POST -H 'x-api-key: API_KEY' \
  -H "Content-Type: application/json" \
  -d '{"contractAddress":"B62qs2NthDuxAT94tTFg6MtuaP1gaBxTZyNv9D3uQiQciy1VsaimNFT", "nftAddress":"B62qoT6jXebkJVmsUmxCxGJmvHJUXPNF417rms4PATi5R6Hw7e56CRt", "chain":"devnet"}' \
  https://minatokens.com/api/nft

mainnet:
curl -X POST -H 'x-api-key: API_KEY' \
  -H "Content-Type: application/json" \
  -d '{"contractAddress":"B62qs2NthDuxAT94tTFg6MtuaP1gaBxTZyNv9D3uQiQciy1VsaimNFT", "nftAddress":"B62qnkz5juL135pJAw7XjLXwvrKAdgbau1V9kEpC1S1x8PfUxcu8KMP", "chain":"mainnet"}' \
  https://minatokens.com/api/nft


  algolia.status: "applied" | "pending" | "failed" | "created" | "blocked"
  NFT info should be shown only if status is "applied" or "pending"

  reply example:
{
  contractAddress: "B62qs2NthDuxAT94tTFg6MtuaP1gaBxTZyNv9D3uQiQciy1VsaimNFT",
  nftAddress: "B62qoT6jXebkJVmsUmxCxGJmvHJUXPNF417rms4PATi5R6Hw7e56CRt",
  tokenId: "wXqDrUzWtK58CaWCzN2g3zseU275dhSnRtBthcroeqT6HGKkos",
  tokenSymbol: "NFT",
  contractUri: "https://minanft.io",
  name: "Minaty 0001",
  metadataRoot: {
    data: "12679389298125948166059309544447259892894738673204711267274310664702682460795",
    kind: "27125089194256017147736279796017779599844703410798002747911858803632742670820",
  },
  storage: "bafkreiffyjf6lpxw5uzniwam7lv7oyezfsxnnfj3yeo67ht3nch3gvgvwi",
  owner: "B62qkX4VQYdmgc7dmLyiPpMhLRfrWjWnyoGGhdqF4bXtTcbv6E1HWsD",
  price: 0,
  version: 1,
  algolia: {
    name: "Minaty 0001",
    chain: "devnet",
    contractAddress: "B62qs2NthDuxAT94tTFg6MtuaP1gaBxTZyNv9D3uQiQciy1VsaimNFT",
    owner: "B62qkX4VQYdmgc7dmLyiPpMhLRfrWjWnyoGGhdqF4bXtTcbv6E1HWsD",
    price: "0",
    status: "applied",
    jobId: "zkCWTQSsqyytppGBMw2YclHjuDmMjlrEKoVr2wzZwaQGiziG",
    ipfs: "bafkreiffyjf6lpxw5uzniwam7lv7oyezfsxnnfj3yeo67ht3nch3gvgvwi",
    version: "1",
    hash: "5JtvxgKwahMjsgsj13oi5bxW2Birgu3a8CDERQ9UMQRBPcF39qHP",
    collection: "Minaty Anonymous Private Club",
    address: "B62qoT6jXebkJVmsUmxCxGJmvHJUXPNF417rms4PATi5R6Hw7e56CRt",
    description:
      "##Minaty 0001: The Emblem of the Founder\n\n**Minaty 0001 is not just an NFT**; it embodies the very essence of the vision that drives the Minaty project. As a unique and non-transferable piece, it symbolizes the presence, conviction, and leadership of the founder. This NFT reflects your personal journey as a creator, merging passion, overcoming challenges, and the mission to inspire a community to reclaim control over their data and defend privacy in the Web3 space.\n\n**What Makes Minaty 0001 Unique:**\n\n- **Founder’s Identity:** Minaty 0001 is exclusively reserved for its creator. It will never be sold or traded, representing the personal and unbreakable bond between the founder and the project.\n- **Symbol of Leadership:** This NFT stands as a testament to your role as a guide and innovator, serving as an example and rallying point for those who believe in a new digital era.\n- **Vision and Values:** Minaty 0001 is a constant reminder of the project's mission: to champion digital freedom, promote privacy, and push the boundaries of what is possible in the Web3 ecosystem.\n\n**Message from the Founder:** “Minaty 0001 is more than just an NFT. It is my personal emblem, a proof of my commitment to the Minaty community, and an expression of my values as a leader in this digital revolution. This NFT is a declaration of who I am, what I stand for, and what I strive to build every day.",
    image:
      "https://gateway.pinata.cloud/ipfs/bafybeigj6f2hmwuikmwiwfmfaicysz55qmuw3o3bnfo6ikcycfeuhve6jm",
    external_url:
      "https://minascan.io/devnet/account/B62qoT6jXebkJVmsUmxCxGJmvHJUXPNF417rms4PATi5R6Hw7e56CRt",
    time: 1727251779058,
    metadata: {
      data: "12679389298125948166059309544447259892894738673204711267274310664702682460795",
      kind: "27125089194256017147736279796017779599844703410798002747911858803632742670820",
    },
    properties: {
      collection: { data: "Minaty Anonymous Private Club", kind: "string" },
      description: {
        data: "16527745706976875000609656778783904462112167743011922036445449332102670389939",
        kind: "text",
        linkedObject: {
          type: "text",
          MerkleTreeHeight: 12,
          size: 1396,
          text: "##Minaty 0001: The Emblem of the Founder\n\n**Minaty 0001 is not just an NFT**; it embodies the very essence of the vision that drives the Minaty project. As a unique and non-transferable piece, it symbolizes the presence, conviction, and leadership of the founder. This NFT reflects your personal journey as a creator, merging passion, overcoming challenges, and the mission to inspire a community to reclaim control over their data and defend privacy in the Web3 space.\n\n**What Makes Minaty 0001 Unique:**\n\n- **Founder’s Identity:** Minaty 0001 is exclusively reserved for its creator. It will never be sold or traded, representing the personal and unbreakable bond between the founder and the project.\n- **Symbol of Leadership:** This NFT stands as a testament to your role as a guide and innovator, serving as an example and rallying point for those who believe in a new digital era.\n- **Vision and Values:** Minaty 0001 is a constant reminder of the project's mission: to champion digital freedom, promote privacy, and push the boundaries of what is possible in the Web3 ecosystem.\n\n**Message from the Founder:** “Minaty 0001 is more than just an NFT. It is my personal emblem, a proof of my commitment to the Minaty community, and an expression of my values as a leader in this digital revolution. This NFT is a declaration of who I am, what I stand for, and what I strive to build every day.",
        },
      },
      image: {
        data: "12124533463210990947737723549002369080716928570399596458576185709312061729258",
        kind: "image",
        linkedObject: {
          fileMerkleTreeRoot: "0",
          MerkleTreeHeight: 0,
          size: 715109,
          mimeType: "image/png",
          SHA3_512:
            "l3tIUyFHE4cQCWIA2UDzZbZfWM1buW01s2pQdMRvVooilZ59gYgnFZUSmU7w4VPkUQk1oGCJkZpPqXm22ZX+aQ==",
          filename: "37.png",
          storage:
            "i:bafybeigj6f2hmwuikmwiwfmfaicysz55qmuw3o3bnfo6ikcycfeuhve6jm",
          fileType: "binary",
          metadata: "0",
        },
      },
    },
    objectID:
      "devnet.B62qs2NthDuxAT94tTFg6MtuaP1gaBxTZyNv9D3uQiQciy1VsaimNFT.Minaty 0001",
  },
  metadata: {
    name: "Minaty 0001",
    collection: "Minaty Anonymous Private Club",
    address: "B62qoT6jXebkJVmsUmxCxGJmvHJUXPNF417rms4PATi5R6Hw7e56CRt",
    description:
      "##Minaty 0001: The Emblem of the Founder\n\n**Minaty 0001 is not just an NFT**; it embodies the very essence of the vision that drives the Minaty project. As a unique and non-transferable piece, it symbolizes the presence, conviction, and leadership of the founder. This NFT reflects your personal journey as a creator, merging passion, overcoming challenges, and the mission to inspire a community to reclaim control over their data and defend privacy in the Web3 space.\n\n**What Makes Minaty 0001 Unique:**\n\n- **Founder’s Identity:** Minaty 0001 is exclusively reserved for its creator. It will never be sold or traded, representing the personal and unbreakable bond between the founder and the project.\n- **Symbol of Leadership:** This NFT stands as a testament to your role as a guide and innovator, serving as an example and rallying point for those who believe in a new digital era.\n- **Vision and Values:** Minaty 0001 is a constant reminder of the project's mission: to champion digital freedom, promote privacy, and push the boundaries of what is possible in the Web3 ecosystem.\n\n**Message from the Founder:** “Minaty 0001 is more than just an NFT. It is my personal emblem, a proof of my commitment to the Minaty community, and an expression of my values as a leader in this digital revolution. This NFT is a declaration of who I am, what I stand for, and what I strive to build every day.",
    image:
      "https://gateway.pinata.cloud/ipfs/bafybeigj6f2hmwuikmwiwfmfaicysz55qmuw3o3bnfo6ikcycfeuhve6jm",
    external_url:
      "https://minascan.io/devnet/account/B62qoT6jXebkJVmsUmxCxGJmvHJUXPNF417rms4PATi5R6Hw7e56CRt",
    time: 1727251779058,
    metadata: {
      data: "12679389298125948166059309544447259892894738673204711267274310664702682460795",
      kind: "27125089194256017147736279796017779599844703410798002747911858803632742670820",
    },
    properties: {
      collection: { data: "Minaty Anonymous Private Club", kind: "string" },
      description: {
        data: "16527745706976875000609656778783904462112167743011922036445449332102670389939",
        kind: "text",
        linkedObject: {
          type: "text",
          MerkleTreeHeight: 12,
          size: 1396,
          text: "##Minaty 0001: The Emblem of the Founder\n\n**Minaty 0001 is not just an NFT**; it embodies the very essence of the vision that drives the Minaty project. As a unique and non-transferable piece, it symbolizes the presence, conviction, and leadership of the founder. This NFT reflects your personal journey as a creator, merging passion, overcoming challenges, and the mission to inspire a community to reclaim control over their data and defend privacy in the Web3 space.\n\n**What Makes Minaty 0001 Unique:**\n\n- **Founder’s Identity:** Minaty 0001 is exclusively reserved for its creator. It will never be sold or traded, representing the personal and unbreakable bond between the founder and the project.\n- **Symbol of Leadership:** This NFT stands as a testament to your role as a guide and innovator, serving as an example and rallying point for those who believe in a new digital era.\n- **Vision and Values:** Minaty 0001 is a constant reminder of the project's mission: to champion digital freedom, promote privacy, and push the boundaries of what is possible in the Web3 ecosystem.\n\n**Message from the Founder:** “Minaty 0001 is more than just an NFT. It is my personal emblem, a proof of my commitment to the Minaty community, and an expression of my values as a leader in this digital revolution. This NFT is a declaration of who I am, what I stand for, and what I strive to build every day.",
        },
      },
      image: {
        data: "12124533463210990947737723549002369080716928570399596458576185709312061729258",
        kind: "image",
        linkedObject: {
          fileMerkleTreeRoot: "0",
          MerkleTreeHeight: 0,
          size: 715109,
          mimeType: "image/png",
          SHA3_512:
            "l3tIUyFHE4cQCWIA2UDzZbZfWM1buW01s2pQdMRvVooilZ59gYgnFZUSmU7w4VPkUQk1oGCJkZpPqXm22ZX+aQ==",
          filename: "37.png",
          storage:
            "i:bafybeigj6f2hmwuikmwiwfmfaicysz55qmuw3o3bnfo6ikcycfeuhve6jm",
          fileType: "binary",
          metadata: "0",
        },
      },
    },
  },
};
*/

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { contractAddress, nftAddress, chain } = req.body;
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.status(200).end();
    return;
  }
  if (!contractAddress || !nftAddress || !chain) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  if (!checkAddress(contractAddress)) {
    res.status(400).json({ error: "Invalid contract address" });
    return;
  }
  if (!checkAddress(nftAddress)) {
    res.status(400).json({ error: "Invalid NFT address" });
    return;
  }
  if (chain !== "devnet" && chain !== "mainnet") {
    res.status(400).json({ error: "Invalid chain" });
    return;
  }
  if (req.method === "GET" || req.method === "POST") {
    try {
      const nftState = await getNFTState({
        contractAddress,
        nftAddress,
        chain,
      });
      if (!nftState.success) {
        res.status(404).json({ error: nftState.error });
        return;
      }
      res.status(200).json(nftState.tokenState);
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
