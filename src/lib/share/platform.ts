import { Platform } from "react-native";

/**
 * Gate único das features de compartilhamento externo. Saída e share-target
 * só existem no Android — em web/iOS os botões não renderizam.
 */
export const canShareExternally = Platform.OS === "android";
