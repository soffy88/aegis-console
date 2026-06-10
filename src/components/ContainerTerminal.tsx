"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";

interface Props {
  orgId: string;
  containerName: string;
  token: string; // JWT
  onClose?: () => void;
}

export function ContainerTerminal({ orgId, containerName, token, onClose }: Props) {
  const termRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!termRef.current) return;

    // Initialize xterm
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "Menlo, Monaco, 'Courier New', monospace",
      theme: {
        background: "#1a1b26",
        foreground: "#c0caf5",
        cursor: "#c0caf5",
      },
      rows: 24,
      cols: 80,
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.open(termRef.current);
    fitAddon.fit();

    // Establish WebSocket
    // Use the backend URL from process.env if available, otherwise fallback to current host
    const apiBase = process.env["NEXT_PUBLIC_AEGIS_API"] || "";
    let wsUrl: string;
    if (apiBase.startsWith("http")) {
      wsUrl = apiBase.replace(/^http/, "ws");
    } else {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      wsUrl = `${protocol}//${host}`;
    }

    const url = `${wsUrl}/api/v1/orgs/${orgId}/docker/containers/${containerName}/terminal?token=${token}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      term.writeln("\x1b[32mConnected to container terminal\x1b[0m");
      const dims = fitAddon.proposeDimensions();
      if (dims) {
        ws.send(JSON.stringify({ type: "resize", rows: dims.rows, cols: dims.cols }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data as string) as { type: string; data: string };
        if (payload.type === "output") {
          term.write(payload.data);
        } else if (payload.type === "error") {
          term.writeln(`\x1b[31mError: ${payload.data}\x1b[0m`);
        }
      } catch (e) {
        console.error("Failed to parse WS message", e);
      }
    };

    ws.onclose = () => {
      term.writeln("\x1b[33mConnection closed.\x1b[0m");
      onClose?.();
    };

    ws.onerror = () => {
      term.writeln("\x1b[31mWebSocket error.\x1b[0m");
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "input", data }));
      }
    });

    const observer = new ResizeObserver(() => {
      fitAddon.fit();
      const dims = fitAddon.proposeDimensions();
      if (dims && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "resize", rows: dims.rows, cols: dims.cols }));
      }
    });
    observer.observe(termRef.current);

    return () => {
      observer.disconnect();
      ws.close();
      term.dispose();
    };
  }, [orgId, containerName, token, onClose]);

  return (
    <div
      ref={termRef}
      className="h-[400px] w-full rounded border border-border bg-[#1a1b26] p-1"
    />
  );
}
