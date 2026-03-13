import React from "react";
import { useAuthNavigation } from "../../../navigation/AuthNavContext";
import { SelecaoTurmasScreen } from "../../../components/wizard/SelecaoTurmasScreen";
import { useWizard } from "../../../context/WizardContext";
import { useClasses } from "../../../hooks/useClasses";
import type { AuthStackParamList } from "../../../navigation/types";

export function Step5DepClasses({ route }: { route?: { params?: AuthStackParamList["Step5DepClasses"] } }) {
  const navigation = useAuthNavigation();
  const { state, dispatch, hasClassRole } = useWizard();
  const { classes, loading, error } = useClasses();

  const dependentId = route?.params?.dependentId;
  if (!dependentId) {
    navigation.goBack();
    return null;
  }
  const dep = state.dependents.find((d) => d.id === dependentId);

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
    navigation.navigate("Step5DepList");
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
