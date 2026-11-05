// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import App from "./App";

afterEach(cleanup);

test("navigates between Café, Shop, and Recipe Book", async () => {
  const user = userEvent.setup();
  render(<App />);
  expect(
    screen.getByRole("heading", { name: "Welcome to the café" }),
  ).toBeTruthy();
  for (const [name, heading] of [
    ["Shop", "The cozy shop"],
    ["Recipe Book", "Your recipe book"],
    ["Café", "Welcome to the café"],
  ]) {
    await user.click(screen.getByRole("button", { name }));
    expect(screen.getByRole("heading", { name: heading })).toBeTruthy();
    expect(
      screen.getByRole("button", { name }).getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.queryByRole("heading", {
        name: name === "Shop" ? "Welcome to the café" : "The cozy shop",
      }),
    ).toBeNull();
  }
});
