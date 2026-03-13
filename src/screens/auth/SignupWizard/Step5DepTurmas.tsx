import React from "react";
import { useAuthNavigation } from "../../../navigation/AuthNavContext";
import { SelecaoTurmasScreen } from "../../../components/wizard/SelecaoTurmasScreen";
import { useWizard } from "../../../context/WizardContext";
import { useClasses } from "../../../hooks/useClasses";
import type { AuthStackParamList } from "../../../navigation/types";

export function Step5DepTurmas({ route }: { route?: { params?: AuthStackParamList["Step5DepTurmas"] } }) {
  const navigation = useAuthNavigation();
  const { state, dispatch, hasClassRole } = useWizard();
  const { classes, loading, error } = useClasses();

  const dependenteId = route?.params?.dependenteId;
  if (!dependenteId) {
    navigation.goBack();
    return null;
  }
  const dep = state.dependents.find((d) => d.id === dependenteId);

  if (!dep) {
    navigation.goBack();
    return null;
  }

  const depIndex = state.dependents.indexOf(dep) + 1;

  function calcAge(birthDate: string): number | undefined {
    const parts = birthDate.split("/");
    if (parts.length !== 3) return undefined;
    const [day, month, year] = parts.map(Number);
    if (!year || year < 1900) return undefined;
    const dob = new Date(year, month - 1, day);
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    return age;
  }

  const age = calcAge(dep.birthDate);

  function handleConfirm(selectedIds: string[]) {
    dispatch({
      type: "UPDATE_DEPENDENT",
      payload: { ...dep!, classIds: selectedIds },
    });
    navigation.navigate("Step5DepLista");
  }

  return (
    <SelecaoTurmasScreen
      contextType="dependent"
      personName={dep.name}
      personAge={age}
      roleLabel="Aluno"
      classes={classes}
      loading={loading}
      error={error}
      initialSelection={dep.classIds}
      currentStep={5}
      totalSteps={6}
      stepLabel={`Dep. ${depIndex} · Turmas`}
      onBack={() => navigation.goBack()}
      onConfirm={handleConfirm}
    />
  );
}
