"use client";

import React, { useEffect, useState } from 'react';

export type VersionInfo = {
  version?: string;
  git_commit?: string;
  build_time?: string;
  node_env?: string;
};

export default function VersionBadge(): React.ReactElement | null {
  const [v, setV] = useState<VersionInfo | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch('/version.json')
      .then(res => res.json())
      .then((data) => {
        if (mounted) setV(data as VersionInfo);
      })
      .catch(() => {
        /* ignore */
      });
    return () => { mounted = false };
  }, []);

  if (!v) return null;

  return (
    <div className="text-[11px] opacity-90">
      <span className="font-bold">v{v.version}</span>
      {v.git_commit ? <span className="ml-1.5 font-mono">{v.git_commit.slice(0,7)}</span> : null}
    </div>
  );
}
