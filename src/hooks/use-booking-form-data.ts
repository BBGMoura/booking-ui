import { useEffect, useState } from 'react';
import { getClassTypes, getDanceClass } from '@/lib/api/danceClass';
import type { ClassType } from '@/lib/types/booking';

/**
 * What the booking form loads from the backend: the class types the user may
 * book (once, on mount) and the chosen class type's price.
 *
 * @return `classTypes` (never Group class) is null while loading or if loading failed
 *     (`classTypesFailed`); `pricePerHour` is null until the chosen class
 *     type's price has loaded, and never the previous class type's price;
 *     `noCharge` is true for Closed
 */
export function useBookingFormData(classType: ClassType | undefined) {
  const [classTypes, setClassTypes] = useState<ClassType[] | null>(null);
  const [classTypesFailed, setClassTypesFailed] = useState(false);
  // Tagged with its class type, so a switch never shows the previous price.
  const [price, setPrice] = useState<{ classType: ClassType; perHour: number } | null>(null);

  useEffect(() => {
    let current = true;
    getClassTypes()
      .then((types) => {
        // Group classes come from timetables, so they're never booked by hand.
        if (current) setClassTypes(types.filter((type) => type !== 'GROUP'));
      })
      .catch(() => {
        if (current) setClassTypesFailed(true);
      });
    return () => {
      current = false;
    };
  }, []);

  useEffect(() => {
    // Closed is never charged, so there's no floor fee to fetch.
    if (!classType || classType === 'UNAVAILABLE') return;
    let current = true;
    getDanceClass(classType)
      .then((danceClass) => {
        if (current) setPrice({ classType, perHour: danceClass.pricePerHour });
      })
      .catch(() => {
        if (current) setPrice(null);
      });
    return () => {
      current = false;
    };
  }, [classType]);

  const noCharge = classType === 'UNAVAILABLE';
  const pricePerHour = price && price.classType === classType ? price.perHour : null;
  return { classTypes, classTypesFailed, pricePerHour, noCharge };
}
