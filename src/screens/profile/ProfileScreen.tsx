import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Image as RNImage,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { signOut } from "firebase/auth";
import { colors, spacing } from "../../theme/tokens";
import { api } from "../../lib/api";
import { auth } from "../../lib/firebase";
import { useProxy } from "../../context/ProxyContext";
import { AvatarHeader } from "../../components/profile/AvatarHeader";
import { CompletionBar } from "../../components/profile/CompletionBar";
import { MenuCard, MenuDivider } from "../../components/profile/MenuCard";
import { ProxyBanner } from "../../components/main/ProxyBanner";
import { PhotoPickerSheet } from "../../components/profile/PhotoPickerSheet";
import { PhotoConfirmModal, type CropRegion } from "../../components/profile/PhotoConfirmModal";
import {
  AccountSwitcherPanel,
  type AccountOption,
} from "../../components/profile/AccountSwitcherPanel";
import { PersonalDataScreen } from "./PersonalDataScreen";
import { RolesScreen } from "./RolesScreen";
import { AddressScreen } from "./AddressScreen";
import { DependentsScreen } from "./DependentsScreen";
import { ClassesScreen } from "./ClassesScreen";
import { GraduationScreen } from "./GraduationScreen";
import { ChangePasswordScreen } from "./ChangePasswordScreen";
import { DependentsListScreen } from "./DependentsListScreen";

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
  | "dependents-list"
  | "classes"
  | "graduation"
  | "change-password";

interface DependentInfo {
  uid: string;
  name: string;
  age: number | null;
  photoUrl?: string | null;
}

interface ProfileScreenProps {
  onBack: () => void;
  dependents?: DependentInfo[];
  realUserName?: string;
  realUserPhotoUrl?: string | null;
  realUserIsGuardian?: boolean;
}

export function ProfileScreen({
  onBack,
  dependents = [],
  realUserName,
  realUserPhotoUrl,
  realUserIsGuardian = false,
}: ProfileScreenProps) {
  const { actingAs, switchTo, clearProxy } = useProxy();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [screen, setScreen] = useState<Screen>("profile");
  const [photoSheetVisible, setPhotoSheetVisible] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<
    | { uri: string; source: "camera" | "gallery"; width: number; height: number }
    | { file: File; source: "web" }
    | null
  >(null);
  const [pendingPreviewUri, setPendingPreviewUri] = useState<string | null>(null);
  const [pendingDims, setPendingDims] = useState<{ w: number; h: number } | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (actingAs) headers["X-Acting-As"] = actingAs;
      const data = await api.get<ProfileData>(
        "/users/me/profile",
        { headers },
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
      allowsEditing: false,
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setPendingPhoto({ uri: a.uri, source: "camera", width: a.width, height: a.height });
      setPendingPreviewUri(a.uri);
      setPendingDims({ w: a.width, h: a.height });
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
      allowsEditing: false,
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setPendingPhoto({ uri: a.uri, source: "gallery", width: a.width, height: a.height });
      setPendingPreviewUri(a.uri);
      setPendingDims({ w: a.width, h: a.height });
    }
  };

  const handleWebFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUri = URL.createObjectURL(file);
    setPendingPhoto({ file, source: "web" });
    setPendingPreviewUri(previewUri);
    RNImage.getSize(
      previewUri,
      (w, h) => setPendingDims({ w, h }),
      () => setPendingDims(null),
    );
    e.target.value = "";
  };

  const proxyHeaders = (): Record<string, string> =>
    actingAs ? { "X-Acting-As": actingAs } : {};

  const uploadPhoto = async (uri: string) => {
    try {
      const formData = new FormData();
      const filename = uri.split("/").pop() ?? "photo.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const ext = (match ? match[1] : "jpg").toLowerCase();
      const mimeType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
      formData.append("file", {
        uri,
        name: filename,
        type: mimeType,
      } as unknown as Blob);

      await api.upload("/users/me/photo", formData, { headers: proxyHeaders() });
      fetchProfile();
    } catch {
      Alert.alert("Erro", "Não foi possível enviar a foto. Tente novamente.");
    }
  };

  const uploadPhotoWeb = async (file: File) => {
    try {
      const formData = new FormData();
      (formData as unknown as globalThis.FormData).append("file", file, file.name);
      await api.upload("/users/me/photo", formData, { headers: proxyHeaders() });
      fetchProfile();
    } catch {
      Alert.alert("Erro", "Não foi possível enviar a foto. Tente novamente.");
    }
  };

  const cleanupPending = () => {
    if (pendingPreviewUri && pendingPhoto?.source === "web") {
      URL.revokeObjectURL(pendingPreviewUri);
    }
    setPendingPhoto(null);
    setPendingPreviewUri(null);
    setPendingDims(null);
  };

  const confirmPendingPhoto = async (region: CropRegion | null) => {
    if (!pendingPhoto) return;
    const photo = pendingPhoto;
    cleanupPending();
    if (photo.source === "web") {
      await uploadPhotoWeb(photo.file);
      return;
    }
    try {
      let finalUri = photo.uri;
      if (region) {
        const manipulated = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{
            crop: {
              originX: Math.round(region.originX),
              originY: Math.round(region.originY),
              width: Math.round(region.size),
              height: Math.round(region.size),
            },
          }],
          { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
        );
        finalUri = manipulated.uri;
      }
      await uploadPhoto(finalUri);
    } catch {
      Alert.alert("Erro", "Não foi possível processar a foto. Tente novamente.");
    }
  };

  const retryPendingPhoto = () => {
    const source = pendingPhoto?.source;
    cleanupPending();
    if (source === "camera") pickFromCamera();
    else if (source === "gallery" || source === "web") pickFromGallery();
  };

  const deletePhoto = async () => {
    try {
      await api.delete("/users/me/photo", { headers: proxyHeaders() });
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
  const showAccountSwitcher = realUserIsGuardian && dependents.length > 0;

  const switcherOptions: AccountOption[] = [
    {
      uid: null,
      name: realUserName ?? profile.name,
      photoUrl: realUserPhotoUrl ?? profile.photoUrl,
      isSelf: true,
    },
    ...dependents.map((d) => ({
      uid: d.uid,
      name: d.name,
      photoUrl: d.photoUrl,
      age: d.age,
    })),
  ];

  const handleAccountSelect = (opt: AccountOption) => {
    if (opt.uid === null) {
      clearProxy();
    } else {
      switchTo(opt.uid, opt.name);
    }
  };

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
  if (screen === "dependents-list") {
    return (
      <DependentsListScreen
        onBack={() => setScreen("profile")}
      />
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

        {showAccountSwitcher && (
          <AccountSwitcherPanel
            options={switcherOptions}
            activeUid={actingAs}
            onSelect={handleAccountSelect}
          />
        )}

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
                subtitle="Veja os cards dos seus dependentes"
                onPress={() => setScreen("dependents-list")}
              />
              <MenuDivider />
              <MenuCard
                icon="user-plus"
                title="Gerenciar dependentes"
                subtitle="Adicionar e editar cadastro dos dependentes"
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
              signOut(auth).catch((err) => {
                console.error("[ProfileScreen] signOut failed:", err);
              });
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

      <PhotoConfirmModal
        visible={!!pendingPreviewUri}
        uri={pendingPreviewUri}
        imageWidth={pendingDims?.w ?? null}
        imageHeight={pendingDims?.h ?? null}
        supportsPan={pendingPhoto?.source !== "web" || Platform.OS === "web"}
        onConfirm={confirmPendingPhoto}
        onRetry={retryPendingPhoto}
        onClose={cleanupPending}
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
