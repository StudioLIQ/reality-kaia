import React from 'react';
import { render, screen } from "@testing-library/react";
import AppHeader from "@/components/AppHeader";
import { WagmiTestWrapper } from "./helpers/WagmiTestWrapper";

test("renders header with menu and wallet button", () => {
  render(
    <WagmiTestWrapper>
      <AppHeader />
    </WagmiTestWrapper>
  );
  expect(screen.getByText("Dashboard")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Create Question/i })).toBeInTheDocument();
});