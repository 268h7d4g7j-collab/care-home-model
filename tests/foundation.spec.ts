import { test, expect } from "@playwright/test";
test("create, open and edit a resident master with server-generated IDs", async ({
  page,
}) => {
  await page.goto("/residents");
  await page.getByRole("link", { name: "New resident", exact: true }).click();
  await expect(page.getByLabel("Resident ID", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Resident ID", { exact: true })).toHaveAttribute(
    "readonly",
    "",
  );
  await page
    .getByLabel("Resident name", { exact: true })
    .fill("Fictional Browser Resident");
  await page.getByRole("button", { name: "Save resident" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Resident saved to Supabase.",
  );
  const id = await page.getByLabel("Resident ID", { exact: true }).inputValue();
  expect(id).toMatch(/^[0-9a-f-]{36}$/);
  await page.getByRole("link", { name: "Open resident record" }).click();
  await expect(page).toHaveURL(new RegExp(`/residents/${id}$`));
  await expect(page.getByLabel("Resident name", { exact: true })).toHaveValue(
    "Fictional Browser Resident",
  );
  await page
    .getByLabel("Resident name", { exact: true })
    .fill("Fictional Browser Resident Updated");
  await page.getByRole("button", { name: "Save resident" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Resident saved to Supabase.",
  );
  await page.reload();
  await expect(page.getByLabel("Resident name", { exact: true })).toHaveValue(
    "Fictional Browser Resident Updated",
  );
  await expect(page.getByLabel("Resident ID", { exact: true })).toHaveValue(id);
  await expect(page.locator("form").first().locator("input")).toHaveCount(2);
  await expect(
    page.getByRole("heading", { name: "Funding breakdown" }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "Back to residents", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("cell", {
      name: "Fictional Browser Resident Updated",
      exact: true,
    }),
  ).toBeVisible();
});

test("existing navigation, company options, reset and selection persistence remain intact", async ({
  page,
}) => {
  await page.goto("/residents");
  const company = page.getByLabel("Company", { exact: true });
  const home = page.getByLabel("Care Home", { exact: true });
  await expect(home.locator("option")).toHaveText([
    "All Homes",
    "Home A",
    "Home B",
    "Home C",
  ]);
  await company.selectOption({ label: "Example Care Group" });
  const companyId = await company.inputValue();
  await expect(home.locator("option")).toHaveText([
    "All Homes",
    "Home A",
    "Home B",
  ]);
  await home.selectOption({ label: "Home B" });
  const homeId = await home.inputValue();
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
    await expect(home).toHaveValue(homeId);
    await expect(company).toHaveValue(companyId);
    await expect(
      page.getByRole("navigation").getByRole("link", { name: label }),
    ).toHaveAttribute("aria-current", "page");
  }
  await company.selectOption({ label: "Second Care Group" });
  await expect(home).toHaveValue("all");
  await expect(home.locator("option")).toHaveText(["All Homes", "Home C"]);
  await expect(
    page.getByText(/Resident masters contain only ID and name/),
  ).toBeVisible();
});

test("failed writes remain unsaved, names can be retried and errors are explicit", async ({
  page,
}) => {
  await page.goto("/residents/new");
  await page.getByLabel("Resident name", { exact: true }).fill("   ");
  await page.getByRole("button", { name: "Save resident" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText(
    "Enter a resident name.",
  );
  await page
    .getByLabel("Resident name", { exact: true })
    .fill("Fictional unavailable storage");
  await page.getByRole("button", { name: "Save resident" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "Supabase could not complete",
  );
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.getByLabel("Resident ID", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Resident name", { exact: true })).toHaveValue(
    "Fictional unavailable storage",
  );
  await page
    .getByLabel("Resident name", { exact: true })
    .fill("Fictional retry resident");
  await page.getByRole("button", { name: "Save resident" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Resident saved to Supabase.",
  );
});

test("tablet layout retains the master form, selectors and navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/residents/new");
  await expect(page.getByLabel("Care Home", { exact: true })).toBeVisible();
  await expect(page.getByRole("navigation")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/resident-master-tablet.png",
    fullPage: true,
  });
});
