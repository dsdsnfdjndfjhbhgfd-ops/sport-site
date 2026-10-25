"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label>
      Сортировка:{" "}
      <select
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          next.set("sort", e.target.value);
          router.push(`${pathname}?${next}`, { scroll: false });
        }}
      >
        <option value="new">Сначала новые</option>
        <option value="cheap">Сначала дешёвые</option>
        <option value="expensive">Сначала дорогие</option>
        <option value="name">По названию</option>
      </select>
    </label>
  );
}
