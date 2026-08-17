"use client";

import { useQuery } from "@tanstack/react-query";
import type { Occupancy, Table, TimeRange } from "@/entities/booking";
import { http } from "@/shared/api/http";

export interface AvailabilityResponse {
  date: string;
  window: TimeRange | null;
  slots: number[];
  tables: Table[];
  occupied: Occupancy[];
}

/**
 * Availability for one club/date. Kept fresh on a short interval: someone
 * else taking your table while you decide is the flow's most jarring
 * failure, and seeing it happen live is far better than discovering it at
 * payment.
 */
export function useAvailability(clubId: string, date: string | null) {
  return useQuery({
    queryKey: ["availability", clubId, date],
    enabled: date !== null,
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    queryFn: () =>
      http<AvailabilityResponse>(
        `/api/availability?clubId=${encodeURIComponent(clubId)}&date=${encodeURIComponent(date ?? "")}`,
      ),
  });
}
