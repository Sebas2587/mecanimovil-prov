import React from 'react';
import { HostProgressRow } from '@/app/design-system/components';

type Props = {
  label: string;
  score: number | null | undefined;
  last?: boolean;
};

/** Alias Host — barra 4px + tipografía institucional. */
export function KpiProgressRow({ label, score, last }: Props) {
  return <HostProgressRow label={label} score={score} last={last} />;
}
