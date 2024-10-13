"use client";

import { TokenPreview, TokenPreviewProps } from "./TokenPreview";
import Image from "next/image";
import { useEffect, useState, createElement } from "react";
import { CheckCircle, AlertCircle, XCircle, CheckSquare } from "lucide-react";
import { motion } from "framer-motion";

export interface TimelineItem {
  id: string;
  status: "success" | "warning" | "error" | "waiting" | "completed";
  title: string;
  details: React.ReactNode;
}

export interface TimelineDatedItem extends TimelineItem {
  time: number;
}

export interface TimeLineProps {
  items: TimelineDatedItem[];
}

export function logItem(params: {
  item: TimelineItem;
  items: TimelineDatedItem[];
}): TimelineDatedItem[] {
  const { item, items } = params;
  return [...items, { ...item, time: Date.now() }];
}

export function updateLogItem(params: {
  items: TimelineDatedItem[];
  id: string;
  update: Partial<TimelineItem>;
}) {
  const { items, id, update } = params;
  return items.map((item) =>
    item.id === id
      ? {
          ...item,
          ...update,
          time:
            (update.status ?? item.status) === "waiting"
              ? item.time
              : Date.now(),
        }
      : item
  );
}

export function deleteLogItem(params: {
  items: TimelineDatedItem[];
  id: string;
}) {
  const { items, id } = params;
  return items.filter((item) => item.id !== id);
}

export function logList(items: React.ReactNode[]): React.ReactNode {
  return (
    <ul className="list-disc pl-5">
      {items.map((item, i) => (
        <li key={"list-" + i}>{item}</li>
      ))}
    </ul>
  );
}

export function TimeLine({ items }: TimeLineProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [sortedItems, setSortedItems] = useState<TimelineDatedItem[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!items || items?.length === 0) {
      setSortedItems([]);
      return;
    }
    const sorted = items.reverse().sort((a, b) => {
      if (a.status === "waiting" && b.status !== "waiting") {
        return -1;
      }
      if (a.status !== "waiting" && b.status === "waiting") {
        return 1;
      }
      return b.time - a.time;
    });
    setSortedItems(sorted);
  }, [items]);

  return (
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
            <div className="rounded-full p-1">{statusIcons[elm.status]}</div>
            {elm.status === "waiting" && (
              <span className="block text-xs text-jacarta-300">
                {formatTime(elm.time, currentTime)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

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

const formatTime = (time: number, currentTime: number) => {
  const secondsPassed = Math.floor((currentTime - time) / 1000);
  const minutesPassed = Math.floor(secondsPassed / 60);
  const remainingSeconds = secondsPassed % 60;
  return `${minutesPassed > 0 ? `${minutesPassed} min ` : ""}${
    secondsPassed > 0 ? `${remainingSeconds} sec` : ""
  }`;
};
