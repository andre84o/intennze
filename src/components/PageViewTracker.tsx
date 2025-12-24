"use client";

import { useEffect } from "react";
import { trackPageView } from "@/utils/metaPixel";

interface Props {
  pageName: string;
}

export default function PageViewTracker({ pageName }: Props) {
  useEffect(() => {
    trackPageView(pageName);
  }, [pageName]);

  return null;
}
