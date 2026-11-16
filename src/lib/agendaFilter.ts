import { AgendaItem } from '../types';

/**
 * Filtert en sorteert agenda-items voor weergave op de publieke website:
 * - moet zichtbaar zijn (isVisible === true)
 * - moet binnen displayFrom / displayUntil vallen (indien ingevuld)
 * - optreeddatum mag niet in het verleden liggen (blijft zichtbaar t/m de speeldag zelf)
 */
export function filterActiveAgendaItems(items: AgendaItem[], now: Date = new Date()): AgendaItem[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const nowMs = now.getTime();

  return items
    .filter((item) => {
      if (!item.isVisible) return false;

      const showMs = new Date(item.date).getTime();
      if (!Number.isFinite(showMs) || showMs < startOfToday) {
        return false;
      }

      if (item.displayFrom) {
        const fromMs = new Date(item.displayFrom).getTime();
        if (Number.isFinite(fromMs) && nowMs < fromMs) {
          return false;
        }
      }

      if (item.displayUntil) {
        const untilMs = new Date(item.displayUntil).getTime();
        if (Number.isFinite(untilMs) && nowMs > untilMs) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
