import React from "react";
import { useAuthNavigation } from "../../../navigation/AuthNavContext";
import { SelecaoTurmasScreen } from "../../../components/wizard/SelecaoTurmasScreen";
import { useWizard } from "../../../context/WizardContext";
import { useClasses } from "../../../hooks/useClasses";

export function Step5TurmasProprias() {
  const navigation = useAuthNavigation();
  const { state, dispatch } = useWizard();
  const { classes, loading, error } = useClasses();

  const roleLabel = state.roles.includes("student")
    ? "Aluno"
    : state.roles.includes("teacher")
    ? "Professor"
    : "Instrutor";

  function handleConfirm(selectedIds: string[]) {
    dispatch({ type: "SET_CLASS_IDS", payload: selectedIds });
    navigation.navigate("Step6Revisao");
  }

  return (
    <SelecaoTurmasScreen
      contextType="self"
      personName={state.name || "Você"}
      roleLabel={roleLabel}
      classes={classes}
      loading={loading}
      error={error}
      initialSelection={state.classIds}
      currentStep={5}
      totalSteps={6}
      stepLabel="Suas Turmas"
      onBack={() => navigation.goBack()}
      onConfirm={handleConfirm}
    />
  );
}
