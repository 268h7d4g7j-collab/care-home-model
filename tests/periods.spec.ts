import { test, expect } from "@playwright/test";
test("period editor copies funding, corrects dates, preserves history, transfers and survives reload", async ({
  page,
}) => {
  await page.goto("/residents/new");
  await page
    .getByLabel("Resident name", { exact: true })
    .fill("Fictional period browser");
  await page
    .getByRole("button", { name: "Save resident", exact: true })
    .click();
  await page.getByRole("link", { name: "Open resident record" }).click();
  await page.getByRole("button", { name: "Add Period", exact: true }).click();
  await page.getByLabel("Start date", { exact: true }).fill("2026-01-01");
  await page
    .getByLabel("Period home", { exact: true })
    .selectOption({ label: "Home A" });
  await page.getByLabel("Room", { exact: true }).selectOption({ label: "101" });
  await page.getByRole("button", { name: "Add funding", exact: true }).click();
  await page
    .getByLabel("Funding type", { exact: true })
    .selectOption("Local Authority");
  await page
    .getByLabel("Funder", { exact: true })
    .selectOption({ label: "Example Borough Council" });
  await page.getByLabel("Weekly amount (£)", { exact: true }).fill("900");
  await page.getByRole("button", { name: "Add funding", exact: true }).click();
  await page
    .getByLabel("Funding type", { exact: true })
    .nth(1)
    .selectOption("FNC");
  await page
    .getByLabel("Funder", { exact: true })
    .nth(1)
    .selectOption({ label: "Example NHS Integrated Care Board" });
  await page
    .getByLabel("Weekly amount (£)", { exact: true })
    .nth(1)
    .fill("200");
  await page
    .getByRole("button", { name: "Save period and funding", exact: true })
    .click();
  await expect(
    page.getByText("Period and funding saved together.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("£1,100.00").first()).toBeVisible();
  await page.getByRole("button", { name: "Add Period", exact: true }).click();
  await expect(
    page.getByLabel("Weekly amount (£)", { exact: true }),
  ).toHaveCount(2);
  await page.getByLabel("Start date", { exact: true }).fill("2026-02-01");
  await page
    .getByLabel("Weekly amount (£)", { exact: true })
    .first()
    .fill("950");
  await page
    .getByRole("button", { name: "Save period and funding", exact: true })
    .click();
  await expect(page.getByText("2026-01-01 / 2026-01-31")).toBeVisible();
  await page
    .getByRole("button", { name: "Open period", exact: true })
    .first()
    .click();
  await expect(
    page.getByLabel("Weekly amount (£)", { exact: true }).first(),
  ).toHaveValue("900.00");
  await page.getByLabel("End date", { exact: true }).fill("2026-02-03");
  await page
    .getByRole("button", { name: "Save period and funding", exact: true })
    .click();
  await expect(page.getByText("2026-02-04 / Ongoing")).toBeVisible();
  await page.getByRole("button", { name: "Add Period", exact: true }).click();
  await page.getByLabel("Start date", { exact: true }).fill("2026-03-01");
  await page
    .getByLabel("Period home", { exact: true })
    .selectOption({ label: "Home B" });
  await page.getByLabel("Room", { exact: true }).selectOption({ label: "101" });
  await page.getByLabel("admission", { exact: true }).selectOption("Yes");
  await page
    .getByRole("button", { name: "Save period and funding", exact: true })
    .click();
  await expect(page.getByText("2026-02-04 / 2026-02-28")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Open period", exact: true }),
  ).toHaveCount(3);
  await page
    .getByRole("button", { name: "Open period", exact: true })
    .last()
    .click();
  await expect(
    page.getByLabel("Period home", { exact: true }).locator("option:checked"),
  ).toHaveText("Home B");
  await page.setViewportSize({ width: 768, height: 1024 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/period-editor-tablet.png",
    fullPage: true,
  });
});
test("reference maintenance creates and edits a predefined funder", async ({
  page,
}) => {
  await page.goto("/settings");
  await page
    .getByLabel("Reference type", { exact: true })
    .selectOption("funders");
  await page
    .getByLabel("Reference name", { exact: true })
    .fill("Fictional new NHS board");
  await page
    .getByLabel("Funder category", { exact: true })
    .selectOption("NHS ICB");
  await page
    .getByRole("button", { name: "Save reference", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Fictional new NHS board", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit Fictional new NHS board", exact: true })
    .click();
  await page
    .getByLabel("Reference name", { exact: true })
    .fill("Fictional revised NHS board");
  await page
    .getByRole("button", { name: "Save reference", exact: true })
    .click();
  await page.reload();
  await page
    .getByLabel("Reference type", { exact: true })
    .selectOption("funders");
  await expect(
    page.getByRole("cell", {
      name: "Fictional revised NHS board",
      exact: true,
    }),
  ).toBeVisible();
});
