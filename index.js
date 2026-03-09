import { registerRootComponent } from "expo";
import { View, Text } from "react-native";

let AppComponent;
let loadError = null;

try {
  const mod = require("./src/App");
  AppComponent = mod.default || mod;
} catch (e) {
  loadError = e;
}

function ErrorFallback() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1a0000", padding: 20 }}>
      <Text style={{ color: "#ff4444", fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>
        Bundle Load Error
      </Text>
      <Text style={{ color: "#ffcccc", fontSize: 13 }}>
        {loadError ? loadError.message : "Unknown error"}
      </Text>
      <Text style={{ color: "#888", fontSize: 10, fontFamily: "monospace", marginTop: 12 }}>
        {loadError ? loadError.stack : ""}
      </Text>
    </View>
  );
}

registerRootComponent(AppComponent || ErrorFallback);
