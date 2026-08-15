"use client";

import TournamentFormPage from "@/components/admin/events/form/TournamentFormPage";
import { useParams } from "next/navigation";

export default function EditTournamentPage() {
    const params = useParams<{ id: string }>();
    const id = params?.id;

    if (!id) return null;

    return <TournamentFormPage id={id} />;
}