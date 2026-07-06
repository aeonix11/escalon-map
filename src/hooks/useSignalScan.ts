import { useCallback, useState } from "react";

export function useSignalScan(onRefresh: () => void) {
  const [scanning, setScanning] = useState(false);
  const [scanOutput, setScanOutput] = useState("");

  const runDeepAnalysis = useCallback(async () => {
    setScanning(true);
    setScanOutput("");
    try {
      const res = await fetch("/api/signals/scan", { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Analysis failed" }));
        setScanOutput(err.error ?? "Analysis failed");
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setScanOutput(text);
      }
      onRefresh();
    } catch (e) {
      setScanOutput(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setScanning(false);
    }
  }, [onRefresh]);

  const clearScanOutput = useCallback(() => setScanOutput(""), []);

  return { scanning, scanOutput, runDeepAnalysis, clearScanOutput };
}
