"use client";

import React, { useEffect, useState } from 'react';

type VersionInfo = {
  version?: string;
  git_commit?: string;
  build_time?: string;
  node_env?: string;
};

export default function VersionBadge() {
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
    <div style={{ fontSize: 11, opacity: 0.9 }}>
      <span style={{ fontWeight: 700 }}>v{v.version}</span>
      {v.git_commit ? <span style={{ marginLeft: 6, fontFamily: 'monospace' }}>{v.git_commit.slice(0,7)}</span> : null}
    </div>
  );
}
