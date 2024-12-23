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
import { bidInfo, offerInfo } from "@/lib/api/info/token-info";
import {
  TokenBuyTransactionParams,
  TokenSellTransactionParams,
} from "@minatokens/api";
import { useContext } from "react";
import { AddressContext } from "@/context/address";

export function OrderbookTab({
  tokenAddress,
  tokenState,
  symbol,
  decimals,
  onSubmit,
  tab,
}: {
  tokenAddress: string;
  tokenState: TokenState | undefined;
  symbol: string;
  decimals: number;
  onSubmit: (data: TokenActionData) => void;
  tab: TokenAction;
}) {
  const [bids, setBids] = useState<Order[]>([]);
  const [offers, setOffers] = useState<Order[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { address } = useContext(AddressContext);

  useEffect(() => {
    const fetchOrderbook = async () => {
      if (!address && tab === "withdraw") {
        setBids([]);
        setOffers([]);
        setIsLoaded(true);
        return;
      }
      const orderbook = await getOrderbook({
        tokenAddress,
        ownerAddress: tab === "withdraw" ? address : undefined,
        maxItems: tab === "withdraw" ? 100 : 20,
      });
      //setBids(orderbook.bids);

      const offers: Order[] = orderbook.offers
        .map(
          (offer) =>
            ({
              amount: Number(offer.amount) / 10 ** decimals,
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
                10 ** decimals /
                (tab === "orderbook" ? Number(bid.price) / 10 ** 9 : 1),
              price: Number(bid.price) / 10 ** 9,
              address: bid.bidAddress,
              type: "bid",
            } as Order)
        )
        .sort((a, b) => b.price - a.price);
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
              info.json.amount !== offers[i].amount * 10 ** decimals)
          ) {
            if (info.json.amount !== 0) {
              offers[i].price = info.json.price / 10 ** 9;
              offers[i].amount = info.json.amount / 10 ** decimals;
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
                bids[i].amount *
                  10 ** decimals *
                  (tab === "orderbook" ? bids[i].price : 1))
          ) {
            if (info.json.amount !== 0) {
              bids[i].price = info.json.price / 10 ** 9;
              bids[i].amount =
                info.json.amount /
                10 ** decimals /
                (tab === "orderbook" ? bids[i].price : 1);
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
      symbol,
      txs: [
        {
          txType:
            tab === "orderbook"
              ? order.type === "offer"
                ? "token:offer:buy"
                : "token:bid:sell"
              : order.type === "offer"
              ? "token:offer:withdraw"
              : "token:bid:withdraw",
          amount: order.amount * 10 ** decimals,
          tokenAddress,
          sender: tokenState?.adminAddress,
          offerAddress: order.type === "offer" ? order.address : undefined,
          bidAddress: order.type === "bid" ? order.address : undefined,
        } as TokenBuyTransactionParams | TokenSellTransactionParams,
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
            bidSymbol={tab === "withdraw" ? "MINA" : symbol}
            offerSymbol={symbol}
            priceSymbol={"MINA"}
            tab={tab}
            enableButtons={tokenState !== undefined}
            onSubmit={handleSubmit}
            offersTitle={tab === "withdraw" ? "My Offers" : "Offers"}
            bidsTitle={tab === "withdraw" ? "My Bids" : "Bids"}
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
