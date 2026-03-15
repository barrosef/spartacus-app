import React, { useState, useCallback } from "react";
import type { AuthScreenName, AuthStackParamList } from "./types";
import { AuthNavContext } from "./AuthNavContext";
import { WizardProvider } from "../context/WizardContext";

import { LoginScreen } from "../screens/auth/LoginScreen";
import { Step0AuthMethod } from "../screens/auth/SignupWizard/Step0AuthMethod";
import { Step0bCredentials } from "../screens/auth/SignupWizard/Step0bCredentials";
import { Step1Profile } from "../screens/auth/SignupWizard/Step1Profile";
import { Step2PersonalData } from "../screens/auth/SignupWizard/Step2PersonalData";
import { Step3Contact } from "../screens/auth/SignupWizard/Step3Contact";
import { Step4Address } from "../screens/auth/SignupWizard/Step4Address";
import { Step5DepData } from "../screens/auth/SignupWizard/Step5DepData";
import { Step5DepClasses } from "../screens/auth/SignupWizard/Step5DepClasses";
import { Step5DepList } from "../screens/auth/SignupWizard/Step5DepList";
import { Step5OwnClasses } from "../screens/auth/SignupWizard/Step5OwnClasses";
import { Step6Review } from "../screens/auth/SignupWizard/Step6Review";
import { PendingScreen } from "../screens/auth/PendingScreen";

interface ScreenProps {
  route?: { params?: AuthStackParamList[AuthScreenName] };
}

const SCREENS: Record<AuthScreenName, React.ComponentType<ScreenProps>> = {
  Login: LoginScreen,
  Step0AuthMethod,
  Step0bCredentials,
  Step1Profile,
  Step2PersonalData,
  Step3Contact,
  Step4Address,
  Step5DepData,
  Step5DepClasses,
  Step5DepList,
  Step5OwnClasses,
  Step6Review,
  Pending: PendingScreen,
};

interface StackEntry {
  screen: AuthScreenName;
  params?: AuthStackParamList[AuthScreenName];
}

export function AuthNavigator() {
  const [stack, setStack] = useState<StackEntry[]>([{ screen: "Login" }]);

  const navigate = useCallback(<T extends AuthScreenName>(
    screen: T,
    params?: AuthStackParamList[T],
  ) => {
    setStack((prev) => [...prev, { screen, params }]);
  }, []);

  const goBack = useCallback(() => {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const current = stack[stack.length - 1];
  const Screen = SCREENS[current.screen];

  return (
    <AuthNavContext.Provider value={{ navigate, goBack }}>
      <WizardProvider>
        <Screen route={{ params: current.params }} />
      </WizardProvider>
    </AuthNavContext.Provider>
  );
}
