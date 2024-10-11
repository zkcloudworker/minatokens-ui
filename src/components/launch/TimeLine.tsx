"use client";

import { TokenPreview, TokenPreviewProps } from "./TokenPreview";
import Image from "next/image";
import { useEffect, useState, createElement } from "react";
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  CheckSquare,
  LoaderCircle,
} from "lucide-react";
import { motion } from "framer-motion";

export type TimelineItem = {
  id: string;
  status: "success" | "warning" | "error" | "waiting" | "completed";
  title: string;
  details: React.ReactNode;
  time: Date;
};

interface Item {
  id: number;
  imageSrc: string;
  title: string;
  details: string;
  time: string;
  status: string;
  svgPath: string;
}

export const exampleItems: TimelineItem[] = [
  {
    id: "1",
    status: "completed",
    title: "Project Kickoff",
    details: (
      <>
        Successfully launched the project. View the{" "}
        <a href="#" className="text-blue-500 hover:underline">
          kickoff document
        </a>
        .
      </>
    ),
    time: new Date("2023-06-01T09:00:00"),
  },
  {
    id: "2",
    status: "warning",
    title: "Design Review",
    details: (
      <>
        Minor issues found during review. Check the{" "}
        <a href="#" className="text-accent hover:underline">
          design feedback
        </a>
        .
      </>
    ),
    time: new Date("2023-06-15T14:30:15"),
  },
  {
    id: "3",
    status: "error",
    title: "Backend Integration",
    details: (
      <>
        Critical error in API integration. See the{" "}
        <a href="#" className="text-blue-500 hover:underline">
          error log
        </a>
        .
      </>
    ),
    time: new Date("2023-07-01T11:15:30"),
  },
  {
    id: "4",
    status: "waiting",
    title: "User Testing",
    details: (
      <>
        Awaiting user feedback. Check the{" "}
        <a href="#" className="text-blue-500 hover:underline">
          testing schedule
        </a>
        .
      </>
    ),
    time: new Date("2023-07-15T10:00:45"),
  },
  {
    id: "5",
    status: "success",
    title: "Final Deployment",
    details: (
      <>
        Successfully deployed to production. View the{" "}
        <a href="#" className="text-blue-500 hover:underline">
          deployment report
        </a>
        .
      </>
    ),
    time: new Date("2023-08-01T16:45:20"),
  },
  {
    id: "6",
    status: "waiting",
    title: "Waiting for tx",
    details: (
      <>
        Awaiting the tx to be mined. Check the{" "}
        <a href="#" className="text-blue-500 hover:underline">
          tx status
        </a>
        .
      </>
    ),
    time: new Date("2023-07-15T17:00:45"),
  },
];

/*

export const items = [
  {
    id: 1,
    title: "Lazyone Panda",
    imageSrc: "/img/avatars/avatar_2.jpg",
    altText: "avatar 2",
    details: "sold for 1.515 ETH\n\n by 027ab52",
    time: "14:15",
    status: "Purchases",
    svgPath:
      "M6.5 2h11a1 1 0 0 1 .8.4L21 6v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6l2.7-3.6a1 1 0 0 1 .8-.4zM19 8H5v12h14V8zm-.5-2L17 4H7L5.5 6h13zM9 10v2a3 3 0 0 0 6 0v-2h2v2a5 5 0 0 1-10 0v-2h2z",
  },
  {
    id: 2,
    title: "NFT Funny Cat",
    imageSrc: "/img/products/item_21_sm.jpg",
    altText: "item 2",
    details: "listed by 051_Hart .08095 ETH",
    time: "14:16",
    status: "Listing",
    svgPath:
      "M10.9 2.1l9.899 1.415 1.414 9.9-9.192 9.192a1 1 0 0 1-1.414 0l-9.9-9.9a1 1 0 0 1 0-1.414L10.9 2.1zm.707 2.122L3.828 12l8.486 8.485 7.778-7.778-1.06-7.425-7.425-1.06zm2.12 6.364a2 2 0 1 1 2.83-2.829 2 2 0 0 1-2.83 2.829z",
  },
  {
    id: 3,
    title: "Prince Ape Planet",
    imageSrc: "/img/products/item_22_sm.jpg",
    altText: "item 3",
    details: "tranferred from 027ab52",
    time: "14:17",
    status: "Transfer",
    svgPath:
      "M16.05 12.05L21 17l-4.95 4.95-1.414-1.414 2.536-2.537L4 18v-2h13.172l-2.536-2.536 1.414-1.414zm-8.1-10l1.414 1.414L6.828 6 20 6v2H6.828l2.536 2.536L7.95 11.95 3 7l4.95-4.95z",
  },
  {
    id: 4,
    title: "Origin Morish",
    imageSrc: "/img/products/item_23_sm.jpg",
    altText: "item 3",
    details: "bid cancelled by 0397fd",
    time: "14:18",
    status: "Bids",
    svgPath:
      "M14 20v2H2v-2h12zM14.586.686l7.778 7.778L20.95 9.88l-1.06-.354L17.413 12l5.657 5.657-1.414 1.414L16 13.414l-2.404 2.404.283 1.132-1.415 1.414-7.778-7.778 1.415-1.414 1.13.282 6.294-6.293-.353-1.06L14.586.686zm.707 3.536l-7.071 7.07 3.535 3.536 7.071-7.07-3.535-3.536z",
  },
  {
    id: 5,
    title: "Portrait Gallery#029",
    imageSrc: "/img/products/item_24_sm.jpg",
    altText: "item 3",
    details: "liked by Trina_more",
    time: "14:19",
    status: "Likes",
    svgPath:
      "M12.001 4.529c2.349-2.109 5.979-2.039 8.242.228 2.262 2.268 2.34 5.88.236 8.236l-8.48 8.492-8.478-8.492c-2.104-2.356-2.025-5.974.236-8.236 2.265-2.264 5.888-2.34 8.244-.228zm6.826 1.641c-1.5-1.502-3.92-1.563-5.49-.153l-1.335 1.198-1.336-1.197c-1.575-1.412-3.99-1.35-5.494.154-1.49 1.49-1.565 3.875-.192 5.451L12 18.654l7.02-7.03c1.374-1.577 1.299-3.959-.193-5.454z",
  },
  // Add more items if needed
];
*/

const WaitingIcon = () => (
  <motion.svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <motion.circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray="50 50"
      initial={{ rotate: 0 }}
      animate={{ rotate: 360 }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "linear",
      }}
      style={{ stroke: "url(#gradient)" }} // Add gradient for a better color transition
    />
    <motion.circle
      cx="12"
      cy="12"
      r="5"
      initial={{ fill: "#3b82f6", scale: 0.8 }}
      animate={{
        fill: ["#3b82f6", "#10b981", "#3b82f6"], // Blue to green to blue transition
        scale: [0.8, 1.2, 0.8],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
    {/* Define the gradient */}
    <defs>
      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#10b981" />
      </linearGradient>
    </defs>
  </motion.svg>
);

const statusIcons = {
  success: <CheckCircle color="#22c55e" />,
  warning: <AlertCircle color="#eab308" />,
  error: <XCircle color="#ef4444" />,
  waiting: <WaitingIcon />,
  completed: <CheckSquare color="#a855f7" />,
};
// color="#428af8"

const statusColors = {
  success: "text-green-500",
  warning: "text-yellow-500",
  error: "text-red-500",
  waiting: "text-blue-500",
  completed: "text-purple-500",
};

const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: undefined,
    hour12: false,
  }).format(date);
};
export default function TimeLine() {
  const [items, setItems] = useState<TimelineItem[]>(exampleItems);

  const sortedItems = items.reverse().sort((a, b) => {
    if (a.status === "waiting" && b.status !== "waiting") {
      return -1;
    }
    if (a.status !== "waiting" && b.status === "waiting") {
      return 1;
    }
    if (a.status === "waiting" && b.status === "waiting") {
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    }
    return 0;
  });

  return (
    <section className="relative py-24">
      <picture className="pointer-events-none absolute inset-0 -z-10 dark:hidden">
        <Image
          width={1920}
          height={789}
          src="/img/gradient_light.jpg"
          priority
          alt="gradient"
          className="h-full w-full"
        />
      </picture>
      <div className="container">
        <h1 className="py-16 text-center font-display text-4xl font-medium text-jacarta-700 dark:text-white">
          Token Launch Progress
        </h1>

        <div className="lg:flex">
          {/* Records */}
          <div className="mb-10 shrink-0 basis-8/12 space-y-5 lg:mb-0 lg:pr-10">
            {sortedItems.map((elm, i) => (
              <div
                key={i}
                className="relative flex items-center rounded-2.5xl border border-jacarta-100 bg-white p-4 transition-shadow hover:shadow-lg dark:border-jacarta-700 dark:bg-jacarta-700"
              >
                <div>
                  <h3 className="mb-1 font-display text-sm font-semibold text-jacarta-700 dark:text-white">
                    {elm.title}
                  </h3>
                  <span className="mb-1 block text-sm text-jacarta-500 dark:text-jacarta-200">
                    {elm.details}
                  </span>
                </div>

                <div className="ml-auto flex flex-col items-center w-1/6">
                  <div className="rounded-full p-1">
                    {statusIcons[elm.status]}
                  </div>
                  <span className="block text-xs text-jacarta-300">
                    {formatTime(elm.time)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <aside className="basis-4/12 lg:pl-5">
            <TokenPreview
              tokenAddress="0x1234567890abcdef"
              image="token.png"
              likes={10}
              name="Example Token"
              symbol="EXT"
              totalSupply={10000}
              isLiked={true}
            />
          </aside>
        </div>
      </div>
    </section>
  );
}
