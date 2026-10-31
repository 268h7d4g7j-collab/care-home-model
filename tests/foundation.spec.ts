import { test, expect } from "@playwright/test";
test("navigation, scope reset, filtering and persistence", async ({ page }) => {
  await page.goto("/residents");
  await expect(page.getByRole("link", { name: /View record/ })).toHaveCount(3);
  const company = page.getByLabel("Company", { exact: true });
  const home = page.getByLabel("Care Home", { exact: true });
  await expect(home.locator("option")).toHaveText([
    "All Homes",
    "Home A",
    "Home B",
    "Home C",
  ]);
  await company.selectOption("example");
  await expect(home.locator("option")).toHaveText([
    "All Homes",
    "Home A",
    "Home B",
  ]);
  await expect(page.getByRole("link", { name: /View record/ })).toHaveCount(2);
  await home.selectOption("b");
  await expect(page.getByRole("link", { name: /View record/ })).toHaveCount(1);
  await expect(
    page.getByRole("cell", { name: "Resident B", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/residents-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: /View record/ }).click();
  await expect(
    page.getByRole("heading", { name: "Resident B", exact: true }),
  ).toBeVisible();
  await expect(home).toHaveValue("b");
  for (const label of [
    "Dashboard",
    "Occupancy",
    "Revenue",
    "Settings",
    "Residents",
  ]) {
    await page
      .getByRole("navigation")
      .getByRole("link", { name: label })
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: label, exact: true }),
    ).toBeVisible();
    await expect(home).toHaveValue("b");
    await expect(company).toHaveValue("example");
    await expect(
      page.getByRole("navigation").getByRole("link", { name: label }),
    ).toHaveAttribute("aria-current", "page");
  }
  await company.selectOption("second");
  await expect(home).toHaveValue("all");
  await expect(home.locator("option")).toHaveText(["All Homes", "Home C"]);
  await expect(
    page.getByRole("cell", { name: "Resident C", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /View record/ })).toHaveCount(1);
  await home.selectOption("c");
  await company.selectOption("all");
  await expect(home).toHaveValue("all");
  await expect(page.getByRole("link", { name: /View record/ })).toHaveCount(3);
  await home.selectOption("a");
  await expect(
    page.getByRole("cell", { name: "Resident A", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /View record/ })).toHaveCount(1);
});
test("resident form, reference funding, totals and chronological snapshots", async ({
  page,
}) => {
  await page.goto("/residents/RES-001");
  for (const label of [
    "Resident ID",
    "Resident name",
    "Period start date",
    "Period end date",
    "Comments",
  ]) {
    await expect(page.getByLabel(label, { exact: true })).toHaveAttribute(
      "readonly",
      "",
    );
  }
  await expect(page.getByLabel("Resident ID", { exact: true })).toHaveValue(
    "RES-001",
  );
  await expect(page.getByLabel("Period end date", { exact: true })).toHaveValue(
    "",
  );
  for (const label of [
    "Home",
    "Room",
    "Stay type",
    "Care type",
    "Physical occupancy",
    "Financial occupancy",
  ])
    await expect(page.getByLabel(label, { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Home", { exact: true })).toHaveValue("a");
  await expect(
    page.getByLabel("Room", { exact: true }).locator("option"),
  ).toHaveText(["101", "102"]);
  await expect(
    page.getByLabel("Stay type", { exact: true }).locator("option"),
  ).toHaveText(["Permanent", "Respite", "D2A"]);
  await expect(
    page.getByLabel("Care type", { exact: true }).locator("option"),
  ).toHaveCount(4);
  const entries = page.locator("fieldset");
  await expect(entries).toHaveCount(3);
  await expect(entries.first().getByLabel("Funding type")).toHaveValue(
    "Local Authority",
  );
  await expect(entries.first().getByLabel("Funder")).toHaveJSProperty(
    "tagName",
    "SELECT",
  );
  await expect(
    entries.first().getByLabel("Funder").locator("option"),
  ).toHaveText(["Example Borough Council", "Demo County Council"]);
  await expect(entries.nth(1).getByLabel("Funding type")).toHaveValue("FNC");
  await expect(page.locator(".weekly-total")).toContainText("£1,300.00");
  const history = page.locator(".history-table tbody tr");
  await expect(history).toHaveCount(2);
  await expect(history.first()).toContainText("06 Jan 2025");
  await expect(history.first()).toContainText("31 Mar 2025");
  await expect(history.first()).toContainText("£1,100.00");
  await expect(history.nth(1)).toContainText("01 Apr 2025");
  await expect(history.nth(1)).toContainText("Ongoing");
  await expect(
    page.getByText(
      "Demonstration only. Fields are read-only and no changes are saved.",
    ),
  ).toBeVisible();
  await page
    .getByLabel("Company", { exact: true })
    .first()
    .selectOption("second");
  await expect(page.getByRole("status")).toContainText("outside your current");
  await page.goto("/residents/RES-003");
  await expect(
    page.locator("fieldset").first().getByLabel("Funder").locator("option"),
  ).toHaveText(["Example NHS Integrated Care Board"]);
  await expect(
    page.getByLabel("Physical occupancy", { exact: true }),
  ).toHaveValue("No");
  await expect(page.locator(".weekly-total")).toContainText("£1,300.00");
});
test("tablet layout retains selectors and navigation", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/residents/RES-001");
  await expect(page.getByLabel("Care Home", { exact: true })).toBeVisible();
  await expect(page.getByRole("navigation")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/resident-tablet.png",
    fullPage: true,
  });
});
