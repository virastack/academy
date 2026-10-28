import type { Locator, Page } from "@playwright/test";

export class LoginPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly error: Locator;

  constructor(private readonly page: Page) {
    const form = page.getByRole("form", { name: "Sign in" });
    this.email = form.getByLabel("Email");
    this.password = form.getByLabel("Password");
    this.submit = form.getByRole("button", { name: "Sign in" });
    this.error = form.getByRole("alert");
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password = "password123") {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
