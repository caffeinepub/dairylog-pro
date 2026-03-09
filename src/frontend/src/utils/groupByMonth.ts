export interface MonthGroup<T> {
  monthKey: string; // "2026-03"
  label: string; // "March 2026"
  items: T[];
}

export function groupByMonth<T>(
  items: T[],
  getDate: (item: T) => string,
): MonthGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const d = getDate(item);
    const key = d.slice(0, 7); // "YYYY-MM"
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // newest first
    .map(([key, groupItems]) => {
      const [year, month] = key.split("-");
      const label = new Date(
        Number(year),
        Number(month) - 1,
        1,
      ).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      });
      return { monthKey: key, label, items: groupItems };
    });
}

export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
