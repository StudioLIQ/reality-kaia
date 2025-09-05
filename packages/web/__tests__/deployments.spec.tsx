import React from 'react';
import { renderHook, waitFor } from "@testing-library/react";
import { useNetworkDeployments } from "@/lib/addresses";
import { WagmiTestWrapper } from "./helpers/WagmiTestWrapper";

test("loads deployments for default chain (8217) via fetch mock", async () => {
  const { result } = renderHook(() => useNetworkDeployments(8217), {
    wrapper: WagmiTestWrapper
  });
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.deployments?.realitioERC20).toBe("0x1111111111111111111111111111111111111111");
});