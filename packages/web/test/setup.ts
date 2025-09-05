import "@testing-library/jest-dom";
import { vi, afterEach } from 'vitest';
import React from 'react';
import { cleanup } from "@testing-library/react";
import { resetWagmiMocks } from "./mocks/wagmi";

// Cleanup after each test
afterEach(() => {
  cleanup();
  resetWagmiMocks();
});

// ---- Mock Next.js bits that often break tests
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => React.createElement('a', { href, ...rest }, children)
}));
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => React.createElement('img', { alt: props.alt || "", ...props })
}));
vi.mock("next/navigation", () => {
  return {
    usePathname: () => "/",
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() })
  };
});

// ---- Provide a stable fetch for deployments JSON
const mockDeployments8217 = {
  realitioERC20: "0x1111111111111111111111111111111111111111",
  usdt: "0x2222222222222222222222222222222222222222",
  wkaia: "0x3333333333333333333333333333333333333333",
  permit2: "0x4444444444444444444444444444444444444444",
  feeRecipient: "0x7abEdc832254DaA2032505e33A8Dd325841D6f2D",
  feeBps: 25
};
const mockDeployments1001 = {
  realitioERC20: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  usdt: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  wkaia: "0xcccccccccccccccccccccccccccccccccccccccc",
  permit2: "0xdddddddddddddddddddddddddddddddddddddddd",
  feeRecipient: "0x7abEdc832254DaA2032505e33A8Dd325841D6f2D",
  feeBps: 25
};

global.fetch = vi.fn(async (input: any) => {
  const url = typeof input === "string" ? input : input?.url || "";
  if (url.includes("/deployments/8217.json")) {
    return new Response(JSON.stringify(mockDeployments8217), { status: 200 });
  }
  if (url.includes("/deployments/1001.json")) {
    return new Response(JSON.stringify(mockDeployments1001), { status: 200 });
  }
  return new Response("Not Found", { status: 404 });
}) as any;

// ---- JSDOM niceties
// Avoid crashes when components call .scrollTo / .matchMedia
(window as any).scrollTo = () => {};
window.matchMedia ||= (() => {
  const listeners = new Set();
  const m = {
    matches: false,
    media: "",
    onchange: null,
    addListener: (fn: any) => listeners.add(fn),
    removeListener: (fn: any) => listeners.delete(fn),
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true
  };
  return () => m as any;
})();

// Optional: silence console noise in tests
const origError = console.error;
console.error = (...args) => {
  const msg = String(args[0] || "");
  if (msg.includes("Warning:")) return; // ignore React warnings in tests
  origError(...args);
};