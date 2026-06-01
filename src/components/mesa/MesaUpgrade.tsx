"use client";

import { useContext, useEffect, useState } from "react";
import { CheckCircle, XCircle, Loader2, Circle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/orderbook/dialog";
import { AddressContext } from "@/context/address";
import { getMesaUpgradeInfo, buildMesaUpgradeTx } from "@/lib/mesa/upgrade";
import { sendTransaction } from "@/lib/send";
import { getTxStatusFast } from "@/lib/txstatus-fast";
import { sleep } from "@/lib/sleep";
import type { MesaUpgradeInfo } from "@/lib/mesa/types";

const ENABLED = process.env.NEXT_PUBLIC_UPGRADE_MESA_TESTNET_KEYS === "true";

type StepStatus = "pending" | "active" | "success" | "error";
interface Step {
  id: string;
  label: string;
  status: StepStatus;
}
const INITIAL_STEPS: Step[] = [
  { id: "prepared", label: "Transaction prepared", status: "pending" },
  { id: "signed", label: "Transaction signed", status: "pending" },
  { id: "sent", label: "Transaction sent", status: "pending" },
  { id: "included", label: "Included in block", status: "pending" },
];

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "success") return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (status === "error") return <XCircle className="h-4 w-4 text-red-500" />;
  if (status === "active")
    return <Loader2 className="h-4 w-4 animate-spin text-accent" />;
  return <Circle className="h-4 w-4 text-jacarta-300" />;
}

function short(s: string | undefined, n = 10): string {
  if (!s) return "";
  return s.length <= n * 2 + 3 ? s : `${s.slice(0, n)}…${s.slice(-n)}`;
}

export function MesaUpgradeButton({
  address,
  tokenId,
  label = "Mesa Upgrade",
  className,
}: {
  address: string;
  tokenId?: string;
  label?: string;
  className?: string;
}) {
  const { address: wallet } = useContext(AddressContext);
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<MesaUpgradeInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [providedKey, setProvidedKey] = useState("");
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);

  if (!ENABLED) return null;

  async function loadInfo() {
    setLoadingInfo(true);
    setInfoError(null);
    try {
      const result = await getMesaUpgradeInfo({ address, tokenId });
      if ("error" in result) setInfoError(result.error);
      else setInfo(result);
    } catch (e) {
      setInfoError(e instanceof Error ? e.message : "Failed to load info");
    } finally {
      setLoadingInfo(false);
    }
  }

  useEffect(() => {
    if (open) {
      setSteps(INITIAL_STEPS);
      setRunError(null);
      setHash(null);
      setProvidedKey("");
      loadInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function setStep(id: string, status: StepStatus) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      // Find a private key whose public key matches this account, across the
      // known launch-JSON key fields.
      const candidates = [
        json.tokenPrivateKey,
        json.adminContractPrivateKey,
        json.collectionContractPrivateKey,
        json.nftContractPrivateKey,
        json.privateKey,
      ].filter((x): x is string => typeof x === "string");
      // The modal can't derive the public key client-side without o1js; let the
      // server validate the match. Prefer an exact field if present.
      if (candidates.length === 1) setProvidedKey(candidates[0]);
      else if (candidates.length > 1) setProvidedKey(candidates[0]);
      if (candidates.length === 0)
        setRunError("No private key field found in the uploaded JSON");
    } catch {
      setRunError("Could not parse the uploaded JSON file");
    }
  }

  async function onUpgrade() {
    if (!wallet) {
      setRunError("Connect your wallet first");
      return;
    }
    setRunning(true);
    setRunError(null);
    setSteps(INITIAL_STEPS);
    try {
      // 1. Build (server signs the contract account update with its key).
      setStep("prepared", "active");
      const build = await buildMesaUpgradeTx({
        address,
        tokenId,
        sender: wallet,
        privateKey: providedKey || undefined,
      });
      if ("error" in build) {
        setStep("prepared", "error");
        setRunError(build.error);
        return;
      }
      setStep("prepared", "success");

      // 2. Wallet signs the fee payer (Auro).
      setStep("signed", "active");
      const mina = (window as any).mina;
      if (!mina) {
        setStep("signed", "error");
        setRunError("Auro wallet not found");
        return;
      }
      const txResult = await mina.sendTransaction(build.payloads.walletPayload);
      const signedData = txResult?.signedData;
      if (!signedData) {
        setStep("signed", "error");
        setRunError("Wallet did not return a signature");
        return;
      }
      setStep("signed", "success");

      // 3. Send. For a signature-only tx, signedData is the fully-signed tx.
      // NOTE: validate this round-trip on a live Mesa devnet (plan spike);
      // fallback is to route via the prove+send service.
      setStep("sent", "active");
      const sent = await sendTransaction(signedData);
      if (!sent.success || !sent.hash) {
        setStep("sent", "error");
        setRunError(
          typeof sent.error === "string"
            ? sent.error
            : "Failed to send the transaction"
        );
        return;
      }
      setHash(sent.hash);
      setStep("sent", "success");

      // 4. Wait for inclusion.
      setStep("included", "active");
      const start = Date.now();
      const TIMEOUT = 1000 * 60 * 20;
      let status = await getTxStatusFast({ hash: sent.hash });
      while (
        status.success === true &&
        status.result === false &&
        Date.now() - start < TIMEOUT
      ) {
        await sleep(10000);
        status = await getTxStatusFast({ hash: sent.hash });
      }
      if (status.result !== true) {
        setStep("included", "error");
        setRunError("Transaction was not included before timeout");
        return;
      }
      setStep("included", "success");

      // 5. Refetch the on-chain VK and show the updated value.
      await loadInfo();
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Upgrade failed");
    } finally {
      setRunning(false);
    }
  }

  const upgraded =
    info && info.newVk && info.currentVk.hash === info.newVk.hash;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex items-center rounded-xl border border-jacarta-100 bg-white px-3 py-2 text-sm font-semibold text-jacarta-700 hover:bg-jacarta-50 dark:border-jacarta-600 dark:bg-jacarta-700 dark:text-white"
        }
      >
        {label}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Mesa verification key upgrade</DialogTitle>
            <DialogDescription>
              Reset this account&apos;s verification key to the new Mesa key,
              authorized by its private-key signature.
            </DialogDescription>
          </DialogHeader>

          {loadingInfo && (
            <p className="text-sm text-jacarta-500">Loading account info…</p>
          )}
          {infoError && (
            <p className="text-sm text-red-500">{infoError}</p>
          )}

          {info && (
            <div className="space-y-2 text-sm">
              <Row label="Contract" value={info.name} />
              <Row label="Account" value={info.address} mono />
              <Row
                label="Token ID"
                value={info.isDefaultTokenId ? "none" : info.tokenId}
                mono={!info.isDefaultTokenId}
              />
              <Row label="Current VK" value={short(info.currentVk.hash)} mono />
              <Row
                label="New VK (mainnet)"
                value={info.newVk ? short(info.newVk.hash) : "not found"}
                mono={!!info.newVk}
              />
              <Row
                label="Private key in DB"
                value={info.savedInDb ? "yes" : "no"}
              />
              {upgraded && (
                <p className="rounded-lg bg-green-500/10 px-3 py-2 text-green-600">
                  Verification key matches the new Mesa key — upgraded.
                </p>
              )}
            </div>
          )}

          {info && !info.savedInDb && !upgraded && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-jacarta-700 dark:text-white">
                Private key not in DB — provide it to upgrade
              </label>
              <textarea
                value={providedKey}
                onChange={(e) => setProvidedKey(e.target.value.trim())}
                placeholder="Paste the account's base58 private key (EK…)"
                className="w-full rounded-lg border border-jacarta-100 px-3 py-2 text-sm dark:border-jacarta-600 dark:bg-jacarta-700 dark:text-white"
                rows={2}
              />
              <input type="file" accept="application/json" onChange={onFile} className="text-xs" />
            </div>
          )}

          {(running || hash || runError) && (
            <ul className="space-y-1 rounded-lg bg-jacarta-50 p-3 text-sm dark:bg-jacarta-800">
              {steps.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <StepIcon status={s.status} />
                  <span
                    className={
                      s.status === "pending"
                        ? "text-jacarta-300"
                        : "text-jacarta-700 dark:text-white"
                    }
                  >
                    {s.label}
                  </span>
                </li>
              ))}
              {hash && (
                <li className="pt-1 text-xs text-jacarta-400">
                  tx: <span className="font-mono">{short(hash, 8)}</span>
                </li>
              )}
            </ul>
          )}
          {runError && <p className="text-sm text-red-500">{runError}</p>}

          <DialogFooter>
            <DialogClose asChild>
              <button
                type="button"
                className="rounded-xl border border-jacarta-100 px-4 py-2 text-sm font-semibold dark:border-jacarta-600 dark:text-white"
              >
                Close
              </button>
            </DialogClose>
            <button
              type="button"
              disabled={
                running ||
                !info ||
                !info.newVk ||
                upgraded ||
                (!info.savedInDb && !providedKey)
              }
              onClick={onUpgrade}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-50"
            >
              {running ? "Upgrading…" : "Upgrade"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-jacarta-400">{label}</span>
      <span
        className={`text-right text-jacarta-700 dark:text-white ${
          mono ? "font-mono break-all" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
