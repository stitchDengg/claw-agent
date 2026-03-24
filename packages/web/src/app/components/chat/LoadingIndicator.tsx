"use client";

import { memo } from "react";

function LoadingIndicator() {
  return (
    <div className="animate-fade-in flex flex-col space-y-4">
      {/* Label */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-weak-foreground">
          CLAW AGENT
        </span>
      </div>

      {/* Loading dots */}
      <div className="flex items-center gap-1.5">
        <span className="loading-dot" />
        <span className="loading-dot" />
        <span className="loading-dot" />
      </div>
    </div>
  );
}

export default memo(LoadingIndicator);
