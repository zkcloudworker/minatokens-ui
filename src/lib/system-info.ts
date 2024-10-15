"use client";

export async function getSystemInfo(): Promise<{
  memoryAvailable: number;
  cpuType: string;
  numberOfCores: number;
  browser: string;
  sharedArrayBufferAvailable: boolean;
  corsStatus: string;
  isMobile: boolean;
  isAndroid: boolean;
  isIOS: boolean;
}> {
  const memoryAvailable = (navigator as any).deviceMemory || 0;
  const cpuType = (navigator as any).hardwareConcurrency
    ? "Multi-core"
    : "Single-core";
  const numberOfCores = navigator.hardwareConcurrency || 1;
  const browser = navigator.userAgent;
  const sharedArrayBufferAvailable = typeof SharedArrayBuffer !== "undefined";
  const userAgent =
    navigator.userAgent || navigator.vendor || (window as any).opera;

  const isMobile = /Mobi|Android/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

  let corsStatus = "unknown";
  try {
    const response = await fetch(window.location.origin, { method: "HEAD" });
    corsStatus = response.ok ? "enabled" : "disabled";
  } catch (error) {
    corsStatus = "disabled";
  }

  return {
    memoryAvailable,
    cpuType,
    numberOfCores,
    browser,
    sharedArrayBufferAvailable,
    corsStatus,
    isMobile,
    isAndroid,
    isIOS,
  };
}
