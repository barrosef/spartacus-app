import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  ActionSheetIOS,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { colors, spacing } from "../../theme/tokens";
import { api } from "../../lib/api";
import { useProxy } from "../../context/ProxyContext";
import { AvatarHeader } from "../../components/profile/AvatarHeader";
import { CompletionBar } from "../../components/profile/CompletionBar";
import { MenuCard, MenuDivider } from "../../components/profile/MenuCard";
import { ProxyBanner } from "../../components/main/ProxyBanner";
import { PersonalDataScreen } from "./PersonalDataScreen";
import { RolesScreen } from "./RolesScreen";
import { AddressScreen } from "./AddressScreen";
import { DependentsScreen } from "./DependentsScreen";
import { ClassesScreen } from "./ClassesScreen";
import { GraduationScreen } from "./GraduationScreen";
import { CategoryScreen } from "./CategoryScreen";

interface ProfileData {
  uid: string;
  name: string;
  email?: string | null;
  photoUrl?: string | null;
  roles: string[];
  completionPercent: number;
  isDependent: boolean;
}

type Screen =
  | "profile"
  | "personal-data"
  | "roles"
  | "address"
  | "dependents"
  | "classes"
  | "graduation"
  | "category";

interface ProfileScreenProps {
  onBack: () => void;
}

export function ProfileScreen({ onBack }: ProfileScreenProps) {
  const { actingAs } = useProxy();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [screen, setScreen] = useState<Screen>("profile");

  const fetchProfile = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (actingAs) headers["X-Acting-As"] = actingAs;
      const data = await api.get<ProfileData>(
        "/users/me/profile",
      );
      setProfile(data);
    } catch {
      // graceful
    }
  }, [actingAs]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleAvatarPress = () => {
    const hasPhoto = !!profile?.photoUrl;
    const options = hasPhoto
      ? ["Câmera", "Escolher arquivo", "Excluir foto", "Cancelar"]
      : ["Câmera", "Escolher arquivo", "Cancelar"];
    const cancelIndex = options.length - 1;
    const destructiveIndex = hasPhoto ? 2 : -1;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex, destructiveButtonIndex: destructiveIndex },
        (idx) => handleAvatarOption(idx, hasPhoto),
      );
    } else {
      // Android: use Alert as simple action sheet
      Alert.alert("Foto do perfil", undefined, [
        { text: "Câmera", onPress: () => handleAvatarOption(0, hasPhoto) },
        { text: "Escolher arquivo", onPress: () => handleAvatarOption(1, hasPhoto) },
        ...(hasPhoto
          ? [{ text: "Excluir foto", style: "destructive" as const, onPress: () => handleAvatarOption(2, hasPhoto) }]
          : []),
        { text: "Cancelar", style: "cancel" as const },
      ]);
    }
  };

  const handleAvatarOption = (_idx: number, _hasPhoto: boolean) => {
    // TODO Fase B app: implement camera/gallery via expo-image-picker
    // and DELETE /users/me/photo
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading} />
      </SafeAreaView>
    );
  }

  const isGuardian = profile.roles.includes("guardian");
  const isStudent = profile.roles.some((r) =>
    ["student", "instructor", "teacher"].includes(r),
  );
  const isProxy = !!actingAs;

  // Sub-screens
  if (screen === "personal-data") {
    return (
      <PersonalDataScreen onBack={() => { setScreen("profile"); fetchProfile(); }} />
    );
  }
  if (screen === "roles") {
    return <RolesScreen onBack={() => setScreen("profile")} />;
  }
  if (screen === "address") {
    return (
      <AddressScreen onBack={() => { setScreen("profile"); fetchProfile(); }} />
    );
  }
  if (screen === "dependents") {
    return (
      <DependentsScreen onBack={() => { setScreen("profile"); fetchProfile(); }} />
    );
  }
  if (screen === "classes") {
    return (
      <ClassesScreen onBack={() => { setScreen("profile"); fetchProfile(); }} />
    );
  }
  if (screen === "graduation") {
    return (
      <GraduationScreen onBack={() => { setScreen("profile"); fetchProfile(); }} />
    );
  }
  if (screen === "category") {
    return (
      <CategoryScreen onBack={() => { setScreen("profile"); fetchProfile(); }} />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Feather
          name="chevron-left"
          size={24}
          color={colors.foreground}
          onPress={onBack}
        />
      </View>

      <ProxyBanner />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <AvatarHeader
          name={profile.name}
          roles={profile.roles}
          photoUrl={profile.photoUrl}
          onAvatarPress={handleAvatarPress}
        />

        <CompletionBar percent={profile.completionPercent} />

        {/* Menu sections */}
        <View style={styles.menu}>
          <MenuCard
            icon="user"
            title="Dados pessoais"
            subtitle="Nome, data de nascimento, sexo e contato"
            onPress={() => setScreen("personal-data")}
          />
          <MenuDivider />

          <MenuCard
            icon="tag"
            title="Perfil"
            subtitle={profile.roles
              .map((r) => {
                const labels: Record<string, string> = {
                  student: "Aluno",
                  teacher: "Professor",
                  instructor: "Instrutor",
                  guardian: "Responsável",
                  supporter: "Apoiador",
                  sponsor: "Patrocinador",
                };
                return labels[r] ?? r;
              })
              .join(", ")}
            onPress={() => setScreen("roles")}
          />
          <MenuDivider />

          {isGuardian && !isProxy && (
            <>
              <MenuCard
                icon="users"
                title="Dependentes"
                subtitle="Dados de cadastro dos seus dependentes"
                onPress={() => setScreen("dependents")}
              />
              <MenuDivider />
            </>
          )}

          <MenuCard
            icon="map-pin"
            title="Endereço"
            subtitle="Atualize os dados do seu endereço"
            onPress={() => setScreen("address")}
          />

          {isStudent && (
            <>
              <MenuDivider />
              <MenuCard
                icon="clipboard"
                title="Turmas e modalidades"
                subtitle="Informações sobre turmas e modalidades praticadas"
                onPress={() => setScreen("classes")}
              />
              <MenuDivider />
              <MenuCard
                icon="award"
                title="Graduação"
                subtitle="Informe sua faixa, prajied e graduação"
                onPress={() => setScreen("graduation")}
              />
              <MenuDivider />
              <MenuCard
                icon="target"
                title="Categoria"
                subtitle="Informe peso e categorias que busca competir"
                onPress={() => setScreen("category")}
              />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  subHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scroll: {
    paddingBottom: spacing.xxl,
  },
  menu: {
    marginTop: spacing.sm,
  },
});
