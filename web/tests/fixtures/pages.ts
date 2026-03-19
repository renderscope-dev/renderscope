import { Page, Locator } from "@playwright/test";

/**
 * Page object models encapsulate page-specific selectors and actions.
 *
 * Selector priority: data-testid > role/aria > text > CSS class.
 * data-testid attributes are added to components in this session.
 */

export class LandingPage {
  constructor(private page: Page) {}

  get hero(): Locator {
    return this.page.locator('[data-testid="hero-section"]');
  }
  get statsBar(): Locator {
    return this.page.locator('[data-testid="stats-bar"]');
  }
  get featuredComparison(): Locator {
    return this.page.locator('[data-testid="featured-comparison"]');
  }
  get taxonomyPreview(): Locator {
    return this.page.locator('[data-testid="taxonomy-preview"]');
  }
  get ctaButtons(): Locator {
    return this.page.locator('[data-testid="hero-section"] a');
  }

  async goto() {
    await this.page.goto("/");
  }
}

export class ExplorePage {
  constructor(private page: Page) {}

  get rendererGrid(): Locator {
    return this.page.locator('[data-testid="renderer-grid"]');
  }
  get filterSidebar(): Locator {
    return this.page.locator('[data-testid="filter-sidebar"]');
  }
  get searchBar(): Locator {
    return this.page.locator(
      'input[type="search"], input[placeholder*="Search"]'
    );
  }
  get rendererCards(): Locator {
    return this.page.locator('[data-testid="renderer-card"]');
  }
  get viewToggle(): Locator {
    return this.page.locator('[data-testid="view-toggle"]');
  }

  async goto() {
    await this.page.goto("/explore");
  }
}

export class ComparePage {
  constructor(private page: Page) {}

  get rendererPicker(): Locator {
    return this.page.locator('[data-testid="renderer-picker"]');
  }
  get featureMatrix(): Locator {
    return this.page.locator('[data-testid="feature-matrix"]');
  }
  get imageSlider(): Locator {
    return this.page.locator('[data-testid="image-compare-slider"]');
  }
  get tabNav(): Locator {
    return this.page.locator(
      '[data-testid="compare-tabs"], [role="tablist"]'
    );
  }

  async goto() {
    // Navigate with pre-selected renderers for consistent testing
    await this.page.goto("/compare?r=pbrt,mitsuba3");
  }
}

export class GalleryPage {
  constructor(private page: Page) {}

  get sceneGrid(): Locator {
    return this.page.locator('[data-testid="scene-grid"]');
  }
  get lightbox(): Locator {
    return this.page.locator('[data-testid="lightbox"], [role="dialog"]');
  }

  async goto() {
    await this.page.goto("/gallery");
  }
}

export class BenchmarksPage {
  constructor(private page: Page) {}

  get dataTable(): Locator {
    return this.page.locator('[data-testid="benchmark-table"], table');
  }
  get chartsSection(): Locator {
    return this.page.locator('[data-testid="benchmark-charts"]');
  }
  get rankingCards(): Locator {
    return this.page.locator('[data-testid="ranking-cards"]');
  }

  async goto() {
    await this.page.goto("/benchmarks");
  }
}

export class NavigationComponent {
  constructor(private page: Page) {}

  get desktopNav(): Locator {
    return this.page.locator("nav");
  }
  get hamburgerButton(): Locator {
    return this.page.locator(
      '[data-testid="mobile-menu-button"]'
    );
  }
  get mobileDrawer(): Locator {
    return this.page.locator('[data-testid="mobile-drawer"]');
  }
  get navLinks(): Locator {
    return this.page.locator("nav a");
  }
  get themeToggle(): Locator {
    return this.page.locator('[data-testid="theme-toggle"]');
  }
  get footer(): Locator {
    return this.page.locator("footer");
  }
}
