import { useEffect, useState } from 'react';
import { getClassTypes, getDanceClass } from '@/lib/api/danceClass';
import type { ClassType } from '@/lib/types/booking';

/**
 * What the booking form loads from the backend: the class types the user may
 * book (once, on mount) and the chosen class type's price.
 *
 * @return `classTypes` is null while loading or if loading failed
 *     (`classTypesFailed`); `pricePerHour` is null until the chosen class
 *     type's price has loaded, and never the previous class type's price
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
        if (current) setClassTypes(types);
      })
      .catch(() => {
        if (current) setClassTypesFailed(true);
      });
    return () => {
      current = false;
    };
  }, []);

  useEffect(() => {
    if (!classType) return;
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

  const pricePerHour = price && price.classType === classType ? price.perHour : null;
  return { classTypes, classTypesFailed, pricePerHour };
}
