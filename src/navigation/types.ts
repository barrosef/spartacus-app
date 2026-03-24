// Auth screen names and params
export type AuthStackParamList = {
  Login: undefined;
  Step0AuthMethod: undefined;
  Step0bCredentials: undefined;
  Step1Profile: undefined;
  Step2PersonalData: undefined;
  Step3Contact: undefined;
  Step4Address: undefined;
  Step5DepData: { dependentId?: string } | undefined;
  Step5DepClasses: { dependentId: string };
  Step5DepList: undefined;
  Step5OwnClasses: undefined;
  Step6Review: undefined;
  EmailSent: { email: string };
  Pending: undefined;
};

export type AuthScreenName = keyof AuthStackParamList;

// Navigation helpers — substitui useNavigation() do react-navigation
export interface AuthNavigation {
  navigate: <T extends AuthScreenName>(
    screen: T,
    params?: AuthStackParamList[T],
  ) => void;
  goBack: () => void;
}
