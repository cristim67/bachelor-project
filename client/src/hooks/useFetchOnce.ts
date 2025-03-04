import { useEffect, useRef } from "react";

export const useFetchOnce = (
  callback: () => Promise<void>,
  dependencies: unknown[] = [],
) => {
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      if (hasFetchedRef.current) return;
      hasFetchedRef.current = true;
      await callback();
    };
    fetchData();
  }, dependencies);
};
