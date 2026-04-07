import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { colors, spacing } from "../../theme/tokens";
import { api } from "../../lib/api";
import { auth } from "../../lib/firebase";
import { useProxy } from "../../context/ProxyContext";
import { AvatarHeader } from "../../components/profile/AvatarHeader";
import { CompletionBar } from "../../components/profile/CompletionBar";
import { MenuCard, MenuDivider } from "../../components/profile/MenuCard";
import { ProxyBanner } from "../../components/main/ProxyBanner";
import { PhotoPickerSheet } from "../../components/profile/PhotoPickerSheet";
import { PersonalDataScreen } from "./PersonalDataScreen";
import { RolesScreen } from "./RolesScreen";
import { AddressScreen } from "./AddressScreen";
import { DependentsScreen } from "./DependentsScreen";
import { ClassesScreen } from "./ClassesScreen";
import { GraduationScreen } from "./GraduationScreen";
import { CategoryScreen } from "./CategoryScreen";
import { ChangePasswordScreen } from "./ChangePasswordScreen";

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
  | "category"
  | "change-password";

interface ProfileScreenProps {
  onBack: () => void;
}

export function ProfileScreen({ onBack }: ProfileScreenProps) {
  const { actingAs } = useProxy();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [screen, setScreen] = useState<Screen>("profile");
  const [photoSheetVisible, setPhotoSheetVisible] = useState(false);

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
    setPhotoSheetVisible(true);
  };

  const webFileInputRef = useRef<HTMLInputElement | null>(null);
  const webFileInputCaptureRef = useRef<HTMLInputElement | null>(null);

  const pickFromCamera = async () => {
    if (Platform.OS === "web") {
      webFileInputCaptureRef.current?.click();
      return;
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permissão necessária", "Habilite o acesso à câmera nas configurações.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadPhoto(result.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    if (Platform.OS === "web") {
      webFileInputRef.current?.click();
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permissão necessária", "Habilite o acesso à galeria nas configurações.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadPhoto(result.assets[0].uri);
    }
  };

  const handleWebFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadPhotoWeb(file);
    e.target.value = "";
  };

  const uploadPhoto = async (uri: string) => {
    try {
      const formData = new FormData();
      const filename = uri.split("/").pop() ?? "photo.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1] : "jpg";
      formData.append("file", {
        uri,
        name: filename,
        type: `image/${ext}`,
      } as unknown as Blob);

      await api.upload("/users/me/photo", formData);
      fetchProfile();
    } catch {
      Alert.alert("Erro", "Não foi possível enviar a foto. Tente novamente.");
    }
  };

  const uploadPhotoWeb = async (file: File) => {
    try {
      const formData = new FormData();
      (formData as unknown as globalThis.FormData).append("file", file, file.name);
      await api.upload("/users/me/photo", formData);
      fetchProfile();
    } catch {
      Alert.alert("Erro", "Não foi possível enviar a foto. Tente novamente.");
    }
  };

  const deletePhoto = async () => {
    try {
      await api.delete("/users/me/photo");
      fetchProfile();
    } catch {
      Alert.alert("Erro", "Não foi possível remover a foto.");
    }
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
  if (screen === "change-password") {
    return (
      <ChangePasswordScreen onBack={() => setScreen("profile")} />
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

          {/* Change password */}
          <MenuDivider />
          <MenuCard
            icon="lock"
            title="Alterar senha"
            subtitle="Modifique sua senha de acesso"
            onPress={() => setScreen("change-password")}
          />

          {/* Logout */}
          <MenuDivider />
          <MenuCard
            icon="log-out"
            title="Sair"
            subtitle="Encerrar sessão e voltar à tela de login"
            onPress={() => {
              Alert.alert(
                "Sair do Spartacus",
                "Deseja realmente encerrar sua sessão?",
                [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Sair",
                    style: "destructive",
                    onPress: () => auth.signOut(),
                  },
                ],
              );
            }}
          />
        </View>
      </ScrollView>

      <PhotoPickerSheet
        visible={photoSheetVisible}
        hasPhoto={!!profile.photoUrl}
        onClose={() => setPhotoSheetVisible(false)}
        onCamera={pickFromCamera}
        onGallery={pickFromGallery}
        onDelete={deletePhoto}
      />

      {Platform.OS === "web" && (
        <>
          <input
            ref={webFileInputRef as React.RefObject<HTMLInputElement>}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleWebFileChange}
          />
          <input
            ref={webFileInputCaptureRef as React.RefObject<HTMLInputElement>}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={handleWebFileChange}
          />
        </>
      )}
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
