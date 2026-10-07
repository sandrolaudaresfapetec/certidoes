"use client";

import { FeedbackProvider } from "@fasterfixes/react";

type Props = {
  projectId?: string;
  apiOrigin?: string;
  children: React.ReactNode;
};

export function FeedbackWidget({ projectId, apiOrigin, children }: Props) {
  if (!projectId) return <>{children}</>;

  return (
    <FeedbackProvider
      projectId={projectId}
      apiOrigin={apiOrigin}
      color="#166534"
      position="bottom-right"
    >
      {children}
    </FeedbackProvider>
  );
}
