import { Orderbook, Order } from "@/components/orderbook/OrderBook";
import {
  MintAddress,
  TokenAction,
  TokenState,
  TokenActionData,
  TokenActionTransactionParams,
} from "@/lib/token";
import { useState, useEffect } from "react";
import { getOrderbook } from "@/lib/trade";
import { bidInfo, offerInfo } from "@/lib/api/token-info";
import { BuyTransactionParams, SellTransactionParams } from "@minatokens/api";

export function OrderbookTab({
  tokenAddress,
  tokenState,
  onSubmit,
}: {
  tokenAddress: string;
  tokenState: TokenState;
  onSubmit: (data: TokenActionData) => void;
}) {
  const [bids, setBids] = useState<Order[]>([]);
  const [offers, setOffers] = useState<Order[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    const fetchOrderbook = async () => {
      const orderbook = await getOrderbook({ tokenAddress });
      //setBids(orderbook.bids);

      const offers: Order[] = orderbook.offers
        .map(
          (offer) =>
            ({
              amount: Number(offer.amount) / 10 ** (tokenState.decimals ?? 9),
              price: Number(offer.price) / 10 ** 9,
              address: offer.offerAddress,
              type: "offer",
            } as Order)
        )
        .sort((a, b) => a.price - b.price);
      setOffers(offers);
      const bids: Order[] = orderbook.bids
        .map(
          (bid) =>
            ({
              amount:
                Number(bid.amount) /
                10 ** (tokenState.decimals ?? 9) /
                (Number(bid.price) / 10 ** 9),
              price: Number(bid.price) / 10 ** 9,
              address: bid.bidAddress,
              type: "bid",
            } as Order)
        )
        .sort((a, b) => a.price - b.price);
      setBids(bids);
      setIsLoaded(true);
      const length = Math.max(offers.length, bids.length);
      for (let i = 0; i < length; i++) {
        if (i < offers.length) {
          const info = await offerInfo(
            {
              tokenAddress,
              offerAddress: offers[i].address,
            },
            tokenAddress
          );
          if (
            info.status === 200 &&
            (info.json.price !== offers[i].price * 10 ** 9 ||
              info.json.amount !== offers[i].amount * 10 ** tokenState.decimals)
          ) {
            if (info.json.amount !== 0) {
              offers[i].price = info.json.price / 10 ** 9;
              offers[i].amount = info.json.amount / 10 ** tokenState.decimals;
            } else {
              offers.splice(i, 1);
            }
            setOffers(offers);
          }
        }
        if (i < bids.length) {
          const info = await bidInfo(
            {
              tokenAddress,
              bidAddress: bids[i].address,
            },
            tokenAddress
          );
          if (
            info.status === 200 &&
            (info.json.price !== bids[i].price * 10 ** 9 ||
              info.json.amount !==
                bids[i].amount * 10 ** tokenState.decimals * bids[i].price)
          ) {
            if (info.json.amount !== 0) {
              bids[i].price = info.json.price / 10 ** 9;
              bids[i].amount =
                info.json.amount / 10 ** tokenState.decimals / bids[i].price;
            } else {
              bids.splice(i, 1);
            }
            setBids(bids);
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 1000)); // handle rate limit
      }
    };
    fetchOrderbook();
  }, [tokenAddress]);

  const handleSubmit = (order: Order) => {
    onSubmit({
      symbol: tokenState.tokenSymbol ?? "",
      txs: [
        {
          txType: order.type === "offer" ? "buy" : "sell",
          amount: order.amount * 10 ** tokenState.decimals,
          tokenAddress,
          sender: tokenState.adminAddress,
          offerAddress: order.type === "offer" ? order.address : undefined,
          bidAddress: order.type === "bid" ? order.address : undefined,
        } as BuyTransactionParams | SellTransactionParams,
      ],
    });
  };

  return (
    <div>
      {isLoaded ? (
        <div className="flex items-center justify-center">
          <Orderbook
            bids={bids}
            offers={offers}
            bidSymbol={tokenState.tokenSymbol ?? ""}
            offerSymbol={tokenState.tokenSymbol ?? ""}
            priceSymbol={"MINA"}
            type="orderbook"
            onSubmit={handleSubmit}
          />
        </div>
      ) : (
        <div className="mb-2 flex items-left">
          <span className="mr-2 min-w-[14rem] dark:text-jacarta-300">
            Loading...
          </span>
        </div>
      )}
    </div>
  );
}
