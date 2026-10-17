"use client";

import { notFound, useParams } from "next/navigation";
import { FormulaireInspection } from "@/components/FormulaireInspection";
import { Protege } from "@/components/Protege";
import { SERVICES } from "@/lib/services";
import type { TypeService } from "@/lib/types";

export default function NouvelleInspection() {
  const { type } = useParams<{ type: string }>();
  if (!(type in SERVICES)) notFound();
  const t = type as TypeService;

  return (
    <Protege titre={SERVICES[t].titre} retour="/">
      <FormulaireInspection type={t} />
    </Protege>
  );
}
