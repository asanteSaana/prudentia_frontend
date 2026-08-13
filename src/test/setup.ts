import '@testing-library/jest-dom';

/**
 * Vitest is present so the CAPABILITY exists (conflict C-9) — the frontend template
 * ships no test runner at all. Coverage here stays deliberately thin: debt TD-G records
 * that frontend regressions are caught by a human looking at a screen, and the prompt
 * pack designates frontend polish as the schedule sacrifice.
 *
 * What does get tested in Phase 6 is chart-type reconciliation, because that is where a
 * defect is silent rather than visible — the reference build shipped a wrong answer to a
 * question the app itself suggested, and a screenshot caught it, not a test.
 */
