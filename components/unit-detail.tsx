"use client";
import BuildingDetail from './building-detail';

export default function UnitDetail({ id }: { id: string }) {
  // In this implementation Units map to Property model; reuse BuildingDetail
  return <BuildingDetail id={id} />;
}
