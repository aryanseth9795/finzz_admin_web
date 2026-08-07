/**
 * Page numbers as a SLIDING WINDOW around the current page.
 *
 * THE BUG THIS FIXES
 * `UsersPage` rendered:
 *
 *     Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => i + 1)
 *
 * — always pages 1 to 5, regardless of where the admin actually was. With 15
 * users per page, a 500-user database has 34 pages of which 5 were reachable;
 * getting to page 20 meant clicking "Next" fifteen times, each a full round
 * trip. Worse, past page 5 the "active" highlight disappeared from every
 * visible button, so the control gave no indication of position at all.
 *
 * A window of up to 5 centred on the current page keeps every page reachable
 * and always shows where you are.
 *
 * Lives in its own module rather than beside the component so that Fast
 * Refresh keeps working — a file that exports both a component and a plain
 * function loses component-level hot reload.
 */
export const buildWindow = (current: number, total: number): number[] => {
  const span = 5;
  if (total <= span) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  // Clamp the window so it never runs past either end.
  let start = Math.max(1, current - Math.floor(span / 2));
  const end = Math.min(total, start + span - 1);
  start = Math.max(1, end - span + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};
