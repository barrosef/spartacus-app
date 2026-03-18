import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { ClassOption } from "../context/WizardContext";

interface ClassOut {
  id: string;
  name: string;
  modality: string;
  schedule: string;
  teacher?: string;
  age_range?: { min: number; max?: number };
}

interface ClassesResponse {
  classes: ClassOut[];
}

function mapClass(c: ClassOut): ClassOption {
  return {
    id: c.id,
    name: c.name,
    modality: c.modality,
    schedule: c.schedule,
    teacher: c.teacher,
    ageRange: c.age_range ? { min: c.age_range.min, max: c.age_range.max ?? 99 } : undefined,
  };
}

export function useClasses() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "spartacus-artes-marciais";

    api.get<ClassesResponse>(`/projects/${projectId}/classes`)
      .then((data) => {
        setClasses(data.classes.map(mapClass));
      })
      .catch((err) => {
        setError(err.message ?? "Erro ao carregar turmas");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { classes, loading, error };
}
