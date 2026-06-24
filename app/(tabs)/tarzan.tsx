import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ChefHat, Mic, Send, Volume2, VolumeX, Keyboard as KeyboardIcon, Pause, Play } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming
} from "react-native-reanimated";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import * as Speech from "expo-speech";

import { colors } from "@/constants/theme";
import { getAiResponse } from "@/services/tarzanService";
import { TypingIndicator } from "@/components/TypingIndicator";
import type { ChatMessage } from "@/types/tarzan";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CENTER_X = SCREEN_WIDTH / 2;
const CENTER_Y = SCREEN_HEIGHT / 2;
const PARTICLE_COUNT = 16;

function getMessageTime(date: Date): string {
  try {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

// Performant Particle Component for Cinematic Intro
function Particle({ index }: { index: number }) {
  const progress = useSharedValue(0);

  // Divide coordinates along the edges
  const side = index % 4; // 0: top, 1: right, 2: bottom, 3: left
  let startX = 0;
  let startY = 0;
  const offset = ((index / PARTICLE_COUNT) * 0.85) + 0.08;

  if (side === 0) {
    startX = SCREEN_WIDTH * offset;
    startY = -30;
  } else if (side === 1) {
    startX = SCREEN_WIDTH + 30;
    startY = SCREEN_HEIGHT * offset;
  } else if (side === 2) {
    startX = SCREEN_WIDTH * offset;
    startY = SCREEN_HEIGHT + 30;
  } else {
    startX = -30;
    startY = SCREEN_HEIGHT * offset;
  }

  useEffect(() => {
    progress.value = withDelay(
      index * 60,
      withTiming(1, { duration: 1000 })
    );
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => {
    const x = startX + (CENTER_X - startX) * progress.value;
    const y = startY + (CENTER_Y - startY) * progress.value;
    const scale = 1 - progress.value * 0.7;
    const opacity = progress.value < 0.12
      ? (progress.value / 0.12)
      : (1 - progress.value);

    return {
      position: "absolute",
      left: x,
      top: y,
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: "#FFA500", // gold-orange color
      opacity,
      transform: [{ scale }],
      shadowColor: "#FF8C00",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 3,
    };
  });

  return <Animated.View style={animatedStyle} />;
}

// Visualizer Wave Bar for Speaking State
function WaveBar({ index }: { index: number }) {
  const height = useSharedValue(12);

  useEffect(() => {
    const durations = [400, 600, 500, 700, 450, 550, 650];
    const maxHeights = [45, 65, 55, 75, 50, 60, 70];
    const duration = durations[index % durations.length];
    const maxHeight = maxHeights[index % maxHeights.length];

    height.value = withRepeat(
      withSequence(
        withTiming(maxHeight, { duration }),
        withTiming(12, { duration })
      ),
      -1,
      true
    );
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: height.value,
    };
  });

  return (
    <Animated.View
      style={[
        {
          width: 6,
          borderRadius: 3,
          backgroundColor: colors.saffron,
          marginHorizontal: 3,
        },
        animatedStyle,
      ]}
    />
  );
}

// Gorgeous visualizer covering Listening, Thinking, Speaking, and Idle states
function TarzanVisualizer({ convoState }: { convoState: "idle" | "listening" | "thinking" | "speaking" }) {
  const pulse = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (convoState === "listening") {
      pulse.value = 1;
      pulseOpacity.value = 0.6;
      pulse.value = withRepeat(withTiming(2.2, { duration: 1500 }), -1, false);
      pulseOpacity.value = withRepeat(withTiming(0, { duration: 1500 }), -1, false);
    } else if (convoState === "idle") {
      pulse.value = 1;
      pulseOpacity.value = 0.3;
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 1200 }),
          withTiming(1.0, { duration: 1200 })
        ),
        -1,
        true
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 1200 }),
          withTiming(0.3, { duration: 1200 })
        ),
        -1,
        true
      );
    } else {
      pulse.value = 1;
      pulseOpacity.value = 0;
    }
  }, [convoState]);

  useEffect(() => {
    if (convoState === "thinking") {
      rotation.value = 0;
      rotation.value = withRepeat(
        withTiming(360, { duration: 2500 }),
        -1,
        false
      );
    } else {
      rotation.value = 0;
    }
  }, [convoState]);

  const animatedPulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulse.value }],
      opacity: pulseOpacity.value,
    };
  });

  const animatedRotationStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <View style={{ width: 220, height: 220, justifyContent: "center", alignItems: "center" }}>
      {/* Listening / Idle Sonar Wave Effect */}
      {(convoState === "listening" || convoState === "idle") && (
        <Animated.View
          style={[
            {
              position: "absolute",
              width: 140,
              height: 140,
              borderRadius: 70,
              borderWidth: 3,
              borderColor: convoState === "listening" ? colors.saffron : "rgba(255, 255, 255, 0.2)",
            },
            animatedPulseStyle,
          ]}
        />
      )}

      {/* Thinking Orbiting Elements */}
      {convoState === "thinking" && (
        <Animated.View
          style={[
            {
              position: "absolute",
              width: 170,
              height: 170,
              justifyContent: "center",
              alignItems: "center",
            },
            animatedRotationStyle,
          ]}
        >
          {/* Orbiting Dots */}
          <View style={{ position: "absolute", top: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.saffron }} />
          <View style={{ position: "absolute", bottom: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.saffron }} />
          <View style={{ position: "absolute", left: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.saffron }} />
          <View style={{ position: "absolute", right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.saffron }} />
        </Animated.View>
      )}

      {/* Center Orb */}
      {convoState !== "speaking" ? (
        <LinearGradient
          colors={
            convoState === "listening" ? ["#FF8C00", colors.tomato] :
              convoState === "thinking" ? ["#FFA500", "#FFD700"] :
                ["#32363D", "#171A1F"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 110,
            height: 110,
            borderRadius: 55,
            justifyContent: "center",
            alignItems: "center",
            shadowColor: colors.saffron,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: convoState === "idle" ? 0.2 : 0.6,
            shadowRadius: 15,
            elevation: 10,
          }}
        >
          <ChefHat stroke={colors.cream} size={48} strokeWidth={2.4} />
        </LinearGradient>
      ) : (
        /* Speaking Waveform */
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: 110, width: 150 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <WaveBar key={i} index={i} />
          ))}
        </View>
      )}
    </View>
  );
}

export default function TarzanScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  // View Mode: 'voice' is the default immersive ChatGPT voice-like UI, 'text' is traditional chat
  const [viewMode, setViewMode] = useState<"voice" | "text">("voice");
  const [liveTranscript, setLiveTranscript] = useState("");

  // Speech Recognition & Voice Loop State
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [convoState, _setConvoState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");

  const convoStateRef = useRef<"idle" | "listening" | "thinking" | "speaking">("idle");
  const latestTranscriptRef = useRef<string>("");
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const micPulseScale = useSharedValue(1);

  const setConvoState = (state: "idle" | "listening" | "thinking" | "speaking") => {
    _setConvoState(state);
    convoStateRef.current = state;
  };

  // Get current language locale
  const getSpeechLocale = () => {
    const lang = i18n.language || "en";
    if (lang.startsWith("en")) return "en-US";
    if (lang.startsWith("hi")) return "hi-IN";
    if (lang.startsWith("es")) return "es-ES";
    if (lang.startsWith("fr")) return "fr-FR";
    return lang;
  };

  // Reset silence timer on speech/interaction
  const resetSilenceTimeout = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    silenceTimeoutRef.current = setTimeout(() => {
      console.log("5 seconds of silence detected. Stopping speech recognition.");
      ExpoSpeechRecognitionModule.stop();
    }, 5000);
  };

  // Speech recognition events
  useSpeechRecognitionEvent("start", () => {
    console.log("[Tarzan] Speech recognition event: 'start' fired.");
    setIsListening(true);
    resetSilenceTimeout();
  });

  useSpeechRecognitionEvent("end", () => {
    console.log("[Tarzan] Speech recognition event: 'end' fired.");
    setIsListening(false);
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    // Auto-submit transcript on end in listening mode
    if (convoStateRef.current === "listening") {
      const transcript = latestTranscriptRef.current.trim();
      console.log(`[Tarzan] Handling 'end' in listening state. Transcript: "${transcript}"`);
      if (transcript) {
        processVoiceMessage(transcript);
      } else {
        // If transcript is empty, automatically restart listening loop to keep conversation active
        console.log("[Tarzan] No speech detected. Restarting listening loop to keep conversation active.");
        startListeningFlow();
      }
    }
  });

  useSpeechRecognitionEvent("result", (event) => {
    resetSilenceTimeout();
    console.log("[Tarzan] Speech recognition event: 'result' fired:", JSON.stringify(event));
    if (event.results && event.results.length > 0) {
      const transcript = event.results[0]?.transcript || "";
      console.log(`[Tarzan] Result received: "${transcript}" (isFinal: ${event.isFinal})`);
      setInput(transcript);
      latestTranscriptRef.current = transcript;
      setLiveTranscript(transcript);
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    const harmlessErrors = ["no-speech", "speech-timeout", "aborted"];
    const isHarmless = harmlessErrors.includes(event.error);

    if (isHarmless) {
      console.log(`[Tarzan] Harmless speech recognition error ignored: ${event.error} - ${event.message}`);
    } else {
      console.warn(`[Tarzan] Speech recognition error: ${event.error} - ${event.message}`);
    }

    setIsListening(false);
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    // If error occurs in listening mode, retry starting after a brief delay
    if (convoStateRef.current === "listening") {
      setTimeout(() => {
        if (convoStateRef.current === "listening") {
          console.log("[Tarzan] Retrying listening flow after error...");
          startListeningFlow();
        }
      }, 1000);
    }
  });

  // Handle permission check and request
  const checkPermissions = async (): Promise<boolean> => {
    try {
      console.log("[Tarzan] Checking speech recognition permissions...");
      const check = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      console.log(`[Tarzan] getPermissionsAsync returned check.granted = ${check.granted}`);
      if (check.granted) {
        console.log("[Tarzan] Permissions check: GRANTED");
        return true;
      }

      console.log("[Tarzan] Requesting speech recognition permissions...");
      const request = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      console.log(`[Tarzan] requestPermissionsAsync returned request.granted = ${request.granted}`);
      if (request.granted) {
        console.log("[Tarzan] Permissions check: GRANTED (after request)");
        return true;
      }

      console.log("[Tarzan] Permissions check: DENIED");
      Alert.alert(
        t("tarzan.micPermissionTitle", "Permission Required"),
        t("tarzan.micPermissionMessage", "Microphone and speech recognition permissions are required to use voice input. Please enable them in your device settings."),
        [{ text: "OK" }]
      );
      return false;
    } catch (error) {
      console.warn("[Tarzan] Failed to check/request permissions:", error);
      return false;
    }
  };

  // Start continuous listening loop
  const startListeningFlow = async () => {
    console.log("[Tarzan] startListeningFlow called. convoState =", convoStateRef.current);
    if (convoStateRef.current === "idle") {
      console.log("[Tarzan] startListeningFlow aborted because convoState is idle.");
      return;
    }

    // Verify permissions before starting
    const hasPermission = await checkPermissions();
    if (!hasPermission) {
      console.log("[Tarzan] startListeningFlow aborted due to missing permissions.");
      switchToTextMode();
      return;
    }

    setConvoState("listening");
    latestTranscriptRef.current = "";
    setLiveTranscript("");
    setInput("");

    try {
      console.log("[Tarzan] Starting ExpoSpeechRecognitionModule with continuous: false...");
      await ExpoSpeechRecognitionModule.start({
        lang: getSpeechLocale(),
        interimResults: true,
        continuous: false, // stops naturally when user finishes speaking (facilitating conversational loop)
      });
      console.log("[Tarzan] ExpoSpeechRecognitionModule.start succeeded.");
    } catch (err) {
      console.warn("[Tarzan] Failed to start speech recognition in loop:", err);
      if (convoStateRef.current === "listening") {
        setTimeout(startListeningFlow, 1000);
      }
    }
  };

  // Process transcript through Gemini AI
  const processVoiceMessage = async (messageText: string) => {
    console.log(`[Tarzan] Processing voice message: "${messageText}"`);
    if (convoStateRef.current === "thinking" || convoStateRef.current === "speaking") {
      console.log("[Tarzan] processVoiceMessage skipped because convoState is", convoStateRef.current);
      return;
    }

    setConvoState("thinking");
    setLiveTranscript("");

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      createdAt: new Date()
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const responseText = await getAiResponse(messageText);
      console.log(`[Tarzan] Gemini response received: "${responseText}"`);
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: responseText,
        createdAt: new Date()
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);

      setConvoState("speaking");
      handleSpeakVoiceMode(responseText);
    } catch (error) {
      console.warn("[Tarzan] Gemini AI error in voice mode:", error);
      setIsTyping(false);

      const errorMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        role: "assistant",
        content: "Oops! I encountered an issue in my virtual kitchen. Please say that again! 🍳",
        createdAt: new Date()
      };
      setMessages((prev) => [...prev, errorMsg]);

      // Return to listening mode after a short delay
      setTimeout(() => {
        if (convoStateRef.current === "thinking" || convoStateRef.current === "speaking") {
          setConvoState("listening");
          startListeningFlow();
        }
      }, 1500);
    }
  };

  // Speak AI response and loop back to listening on completion
  const handleSpeakVoiceMode = async (text: string) => {
    try {
      console.log(`[Tarzan] Speaking response: "${text}"`);
      Speech.stop();

      if (isMuted) {
        console.log("[Tarzan] Assistant is muted. Waiting 1.5 seconds and restarting listening loop.");
        // Respect mute: wait 1.5 seconds, then restart listening automatically
        setTimeout(() => {
          if (convoStateRef.current === "speaking") {
            setConvoState("listening");
            startListeningFlow();
          }
        }, 1500);
        return;
      }

      // Fetch all available voices and select high quality ones
      const voices = await Speech.getAvailableVoicesAsync();
      const preferredIdentifiers = [
        "en-in-x-ene-network",
        "en-us-x-tpf-local",
        "en-gb-x-gba-network",
        "en-au-x-aua-network"
      ];

      let selectedVoice: Speech.Voice | undefined = undefined;
      for (const id of preferredIdentifiers) {
        const found = voices.find(v => v.identifier === id);
        if (found) {
          selectedVoice = found;
          break;
        }
      }

      const speakOptions: Speech.SpeechOptions = {
        language: getSpeechLocale(),
        rate: 0.95,
        pitch: 1.0,
        onDone: () => {
          console.log("[Tarzan] TTS speak onDone fired. Restarting listening loop.");
          if (convoStateRef.current === "speaking") {
            setConvoState("listening");
            startListeningFlow();
          }
        },
        onError: (err) => {
          console.warn("[Tarzan] TTS voice mode onError fired:", err);
          if (convoStateRef.current === "speaking") {
            setConvoState("listening");
            startListeningFlow();
          }
        }
      };

      if (selectedVoice) {
        console.log("Using voice:", selectedVoice.identifier);
        speakOptions.voice = selectedVoice.identifier;
      } else {
        console.log("[Tarzan] Preferred high-quality voices not found. Falling back to default.");
      }

      Speech.speak(text, speakOptions);
    } catch (error) {
      console.warn("[Tarzan] Speech speak error:", error);
      if (convoStateRef.current === "speaking") {
        setConvoState("listening");
        startListeningFlow();
      }
    }
  };

  // Helpers for switching view modes
  const switchToVoiceMode = async () => {
    console.log("[Tarzan] Switching to voice mode.");
    setViewMode("voice");
    const hasPermission = await checkPermissions();
    console.log("[Tarzan] Permissions check result:", hasPermission);
    if (!hasPermission) {
      console.log("[Tarzan] switchToVoiceMode aborted due to missing permissions.");
      setViewMode("text");
      return;
    }
    setConvoState("listening");
    await startListeningFlow();
  };

  const switchToTextMode = () => {
    console.log("[Tarzan] Switching to text mode.");
    setViewMode("text");
    setConvoState("idle");
    setIsListening(false);
    ExpoSpeechRecognitionModule.stop();
    Speech.stop();
  };

  // Toggle continuous voice mode / mic press
  const handleMicPress = async () => {
    console.log("[Tarzan] Mic button pressed. viewMode =", viewMode, ", convoState =", convoStateRef.current);
    if (viewMode === "text") {
      await switchToVoiceMode();
    } else {
      if (convoStateRef.current !== "idle") {
        console.log("[Tarzan] Pausing voice session.");
        setConvoState("idle");
        setIsListening(false);
        await ExpoSpeechRecognitionModule.stop();
        Speech.stop();
      } else {
        console.log("[Tarzan] Resuming voice session.");
        await switchToVoiceMode();
      }
    }
  };

  // Manual replay button handler
  const handleManualReplay = (text: string) => {
    if (convoStateRef.current !== "idle") {
      setConvoState("idle");
      ExpoSpeechRecognitionModule.stop();
    }
    handleSpeak(text, true);
  };

  // Manual replay Speech handler
  const handleSpeak = async (text: string, force: boolean = false) => {
    try {
      Speech.stop();
      if (isMuted && !force) {
        return;
      }

      // Fetch all available voices and select high quality ones
      const voices = await Speech.getAvailableVoicesAsync();
      const preferredIdentifiers = [
        "en-in-x-ene-network",
        "en-us-x-tpf-local",
        "en-gb-x-gba-network",
        "en-au-x-aua-network"
      ];

      let selectedVoice: Speech.Voice | undefined = undefined;
      for (const id of preferredIdentifiers) {
        const found = voices.find(v => v.identifier === id);
        if (found) {
          selectedVoice = found;
          break;
        }
      }

      const speakOptions: Speech.SpeechOptions = {
        language: getSpeechLocale(),
        rate: 0.95,
        pitch: 1.0
      };

      if (selectedVoice) {
        console.log("Using voice:", selectedVoice.identifier);
        speakOptions.voice = selectedVoice.identifier;
      } else {
        console.log("[Tarzan] Preferred high-quality voices not found. Falling back to default.");
      }

      Alert.alert(
        "Voice In Use",
        selectedVoice
          ? `${selectedVoice.name}\n${selectedVoice.identifier}`
          : "No selected voice"
      );

      Speech.speak(text, speakOptions);
    } catch (error) {
      console.log("Text-to-Speech playback error:", error);
      // Fallback
      try {
        Speech.speak(text, {
          language: getSpeechLocale(),
          rate: 0.9
        });
      } catch (fallbackError) {
        console.warn("[Tarzan] Fallback speech error:", fallbackError);
      }
    }
  };

  // Pulse animation for the microphone
  useEffect(() => {
    if (isListening) {
      micPulseScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 600 }),
          withTiming(1.0, { duration: 600 })
        ),
        -1,
        true
      );
    } else {
      micPulseScale.value = withTiming(1);
    }
  }, [isListening]);

  const animatedMicPulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: micPulseScale.value }],
      opacity: 1.5 - micPulseScale.value,
    };
  });

  // Clean up speech recognition and text-to-speech on unmount
  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      ExpoSpeechRecognitionModule.stop();
      Speech.stop();
    };
  }, []);

  // Detect and log all available Text-to-Speech voices on mount
  useEffect(() => {
    const detectVoices = async () => {
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        console.log("AVAILABLE VOICES:", voices);
        console.log("TOTAL VOICES:", voices.length);
        const englishVoices = voices.filter(voice => voice.language.startsWith("en"));
        console.log("ENGLISH VOICES:", englishVoices);
      } catch (error) {
        console.warn("[Tarzan] Error detecting available TTS voices:", error);
      }
    };
    detectVoices();
  }, []);

  // Intro scene animated values
  const portalScale = useSharedValue(0);
  const portalOpacity = useSharedValue(0);
  const mascotScale = useSharedValue(0);
  const mascotFloat = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);

  // Campfire flickering glow animated values
  const flickerOpacity = useSharedValue(0.6);
  const flickerScale = useSharedValue(1);

  // Initialize with localized greeting message when intro finishes
  useEffect(() => {
    if (!showIntro && messages.length === 0) {
      const welcomeText = t("tarzan.greeting");
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: welcomeText,
          createdAt: new Date()
        }
      ]);
    }
  }, [showIntro, messages.length]);

  // Start voice session when intro finishes and we are in voice mode
  useEffect(() => {
    if (!showIntro && viewMode === "voice") {
      switchToVoiceMode();
    }
  }, [showIntro]);

  // Handle intro scene triggers
  useEffect(() => {
    console.log("Chef intro started");
    console.log("Chef intro state enabled");

    // Flickering Flame Effect Animation Loop
    flickerOpacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 150 }),
        withTiming(0.4, { duration: 200 }),
        withTiming(0.75, { duration: 100 }),
        withTiming(0.5, { duration: 180 })
      ),
      -1,
      true
    );
    flickerScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 250 }),
        withTiming(0.95, { duration: 250 })
      ),
      -1,
      true
    );

    // 1. Scale up the circular portal
    portalScale.value = withSpring(1, { damping: 12, stiffness: 90 });
    portalOpacity.value = withTiming(1, { duration: 450 });

    // 2. Scale up chef mascot emerging with timing delay
    mascotScale.value = withDelay(
      350,
      withSpring(1, { damping: 10, stiffness: 100 })
    );

    // 3. Initiate continuous floating animation after mascot emerges
    const floatTimeout = setTimeout(() => {
      mascotFloat.value = withRepeat(
        withSequence(
          withTiming(10, { duration: 1100 }),
          withTiming(-10, { duration: 1100 })
        ),
        -1,
        true
      );
    }, 850);

    // 4. Trigger total overlay fade-out after 1.8s
    const exitTimeout = setTimeout(() => {
      overlayOpacity.value = withTiming(0, { duration: 350 });
    }, 1800);

    // 5. Hide overlay from hierarchy
    const unmountTimeout = setTimeout(() => {
      console.log("Chef intro animation completed");
      console.log("Chef intro completed");
      setShowIntro(false);
    }, 2150);

    return () => {
      clearTimeout(floatTimeout);
      clearTimeout(exitTimeout);
      clearTimeout(unmountTimeout);
    };
  }, []);

  // Execute processing logic
  async function processUserMessage(messageText: string) {
    if (isTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      createdAt: new Date()
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const responseText = await getAiResponse(messageText);
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: responseText,
        createdAt: new Date()
      };
      setMessages((prev) => [...prev, assistantMsg]);
      handleSpeak(responseText, false);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        role: "assistant",
        content: "Oops! I encountered an issue in my virtual kitchen. Please try again. 🍳",
        createdAt: new Date()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  }

  // Handle traditional text submission
  async function handleSendText() {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;
    setInput("");
    if (convoStateRef.current !== "idle") {
      setConvoState("idle");
    }
    if (isListening) {
      await ExpoSpeechRecognitionModule.stop();
    }
    await processUserMessage(trimmedInput);
  }

  // Animated styles for intro
  const animatedPortalStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: portalScale.value }],
      opacity: portalOpacity.value,
    };
  });

  const animatedFlickerStyle = useAnimatedStyle(() => {
    return {
      opacity: flickerOpacity.value * portalOpacity.value,
      transform: [{ scale: flickerScale.value * portalScale.value }],
    };
  });

  const animatedMascotStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: mascotScale.value },
        { translateY: mascotFloat.value }
      ],
      opacity: mascotScale.value,
    };
  });

  const animatedOverlayStyle = useAnimatedStyle(() => {
    return {
      opacity: overlayOpacity.value,
    };
  });

  function renderMessageItem({ item }: { item: ChatMessage }) {
    const isUser = item.role === "user";
    return (
      <View className={`my-2.5 flex-row ${isUser ? "justify-end" : "justify-start"}`}>
        {!isUser && (
          <View className="mr-2.5 h-9 w-9 items-center justify-center rounded-full bg-chef-saffron/15 border border-chef-saffron/30">
            <ChefHat stroke={colors.saffron} size={18} strokeWidth={2.2} />
          </View>
        )}
        <View
          style={{ maxWidth: "78%" }}
          className={`rounded-chef px-4 py-3 border ${isUser
            ? "bg-chef-saffron border-chef-saffron text-chef-black rounded-tr-none"
            : "bg-chef-panel border-chef-line text-chef-cream rounded-tl-none"
            }`}
        >
          <Text className={`text-chef-sm font-semibold leading-5 ${isUser ? "text-chef-black" : "text-chef-cream"}`}>
            {item.content}
          </Text>
          <View className="flex-row items-center justify-between mt-1.5">
            {!isUser ? (
              <Pressable
                onPress={() => handleManualReplay(item.content)}
                hitSlop={8}
                className="mr-3"
              >
                <Volume2 stroke={colors.textMuted} size={14} strokeWidth={2.4} />
              </Pressable>
            ) : null}
            <View className="flex-1" />
            <Text
              className={`text-[9px] font-bold ${isUser ? "text-chef-black/60" : "text-chef-muted"
                }`}
            >
              {getMessageTime(item.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-chef-black">
      {/* Intro Portal Animation Overlay */}
      {showIntro && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              ...StyleSheet.absoluteFillObject,
              backgroundColor: "#050606",
              zIndex: 999,
            },
            animatedOverlayStyle
          ]}
        >
          {/* Campfire flickering glow backdrop */}
          <Animated.View
            style={[
              {
                position: "absolute",
                left: CENTER_X - 100,
                top: CENTER_Y - 100,
                width: 200,
                height: 200,
                borderRadius: 100,
                backgroundColor: colors.saffron,
                shadowColor: "#FF4500", // Red-orange flame shadow
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.9,
                shadowRadius: 36,
              },
              animatedFlickerStyle
            ]}
          />

          {/* Portal ring */}
          <Animated.View
            style={[
              {
                position: "absolute",
                left: CENTER_X - 75,
                top: CENTER_Y - 75,
                width: 150,
                height: 150,
                borderRadius: 75,
                borderWidth: 4,
                borderColor: colors.saffron,
                backgroundColor: "transparent",
                shadowColor: colors.saffron,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 16,
              },
              animatedPortalStyle
            ]}
          />

          {/* Mascot badge (3D Gold Metallic Ring) */}
          <Animated.View
            style={[
              {
                position: "absolute",
                left: CENTER_X - 55,
                top: CENTER_Y - 55,
                width: 110,
                height: 110,
                borderRadius: 55,
                overflow: "hidden",
                borderWidth: 4,
                borderColor: "#FFD700", // Gold Metallic
                backgroundColor: "#000",
                shadowColor: "#FF8C00",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.8,
                shadowRadius: 12,
              },
              animatedMascotStyle
            ]}
          >
            <LinearGradient
              colors={["#FF4500", "#FF8C00", "#FFD700"]}
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ChefHat stroke={colors.cream} size={50} strokeWidth={2.4} />
            </LinearGradient>
          </Animated.View>

          {/* Golden Imploding Particles */}
          {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
            <Particle key={i} index={i} />
          ))}
        </Animated.View>
      )}

      {/* Main Chat Interface */}
      <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
        {viewMode === "voice" ? (
          /* Immersive Voice Assistant Mode */
          <View className="flex-1 justify-between px-6 py-4">
            {/* Header */}
            <View className="flex-row items-center justify-between mt-2">
              <Pressable
                className="h-11 w-11 items-center justify-center rounded-full bg-chef-panel/40 border border-chef-line"
                onPress={() => {
                  switchToTextMode();
                  router.back();
                }}
              >
                <ArrowLeft stroke={colors.cream} size={22} strokeWidth={2.4} />
              </Pressable>

              <View className="items-center">
                <Text className="text-chef-base font-extrabold text-chef-cream tracking-wide">
                  Tarzan Voice
                </Text>
                <View className="flex-row items-center mt-1">
                  <View className={`h-2 w-2 rounded-full mr-2 ${convoState === "listening" ? "bg-chef-tomato" :
                    convoState === "thinking" ? "bg-chef-saffron" :
                      convoState === "speaking" ? "bg-chef-herb" : "bg-neutral-600"
                    }`} />
                  <Text className="text-chef-xs font-bold text-chef-muted uppercase tracking-wider">
                    {convoState === "listening" ? "Listening" :
                      convoState === "thinking" ? "Thinking" :
                        convoState === "speaking" ? "Speaking" : "Paused"}
                  </Text>
                </View>
              </View>

              <Pressable
                className="h-11 w-11 items-center justify-center rounded-full bg-chef-panel/40 border border-chef-line"
                onPress={() => {
                  const nextMuted = !isMuted;
                  setIsMuted(nextMuted);
                  if (nextMuted) {
                    Speech.stop();
                  }
                }}
              >
                {isMuted ? (
                  <VolumeX stroke={colors.cream} size={20} strokeWidth={2.4} />
                ) : (
                  <Volume2 stroke={colors.cream} size={20} strokeWidth={2.4} />
                )}
              </Pressable>
            </View>

            {/* Visualizer Center Area */}
            <View className="flex-1 items-center justify-center py-6">
              <TarzanVisualizer convoState={convoState} />

              {/* Status and Subtitle Feedback */}
              <View className="items-center mt-8 px-4 h-24 justify-center">
                {convoState === "listening" && (
                  <Text className="text-chef-sm text-chef-muted text-center italic max-w-xs leading-5">
                    {liveTranscript || "Speak naturally... I'm listening"}
                  </Text>
                )}
                {convoState === "thinking" && (
                  <Text className="text-chef-sm text-chef-muted text-center italic">
                    Cooking up a response...
                  </Text>
                )}
                {convoState === "speaking" && (
                  <Text className="text-chef-sm text-chef-cream text-center font-medium max-w-xs leading-5">
                    {messages[messages.length - 1]?.content || ""}
                  </Text>
                )}
                {convoState === "idle" && (
                  <Text className="text-chef-sm text-chef-muted text-center font-bold uppercase tracking-wider">
                    Tap Mic to Resume Conversation
                  </Text>
                )}
              </View>
            </View>

            {/* Control Bar */}
            <View className="flex-row items-center justify-around mb-6 px-8">
              {/* Keyboard Button (Switch to Text Mode) */}
              <Pressable
                className="h-14 w-14 items-center justify-center rounded-full bg-chef-panel/60 border border-chef-line active:bg-chef-panel"
                onPress={switchToTextMode}
              >
                <KeyboardIcon stroke={colors.cream} size={22} strokeWidth={2.2} />
              </Pressable>

              {/* Central Pause/Play/Mic Button */}
              <Pressable
                className={`h-20 w-20 items-center justify-center rounded-full border border-chef-line/20 shadow-lg ${convoState !== "idle" ? "bg-chef-tomato" : "bg-chef-saffron"
                  }`}
                onPress={handleMicPress}
              >
                {convoState !== "idle" ? (
                  <Pause stroke={colors.cream} size={28} strokeWidth={2.4} />
                ) : (
                  <Mic stroke={colors.background} size={28} strokeWidth={2.4} />
                )}
              </Pressable>

              {/* Speaker Mute/Unmute Toggle */}
              <Pressable
                className="h-14 w-14 items-center justify-center rounded-full bg-chef-panel/60 border border-chef-line active:bg-chef-panel"
                onPress={() => {
                  const nextMuted = !isMuted;
                  setIsMuted(nextMuted);
                  if (nextMuted) {
                    Speech.stop();
                  }
                }}
              >
                {isMuted ? (
                  <VolumeX stroke={colors.cream} size={22} strokeWidth={2.2} />
                ) : (
                  <Volume2 stroke={colors.cream} size={22} strokeWidth={2.2} />
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          /* Text Chat View Mode (Original UI) */
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            className="flex-1"
          >
            {/* Header */}
            <View className="flex-row items-center justify-between border-b border-chef-line px-5 py-4 bg-chef-black">
              <Pressable
                className="h-11 w-11 items-center justify-center rounded-full bg-chef-panel border border-chef-line"
                onPress={() => router.back()}
              >
                <ArrowLeft stroke={colors.cream} size={22} strokeWidth={2.4} />
              </Pressable>

              <View className="flex-1 items-center px-3">
                <Text className="text-chef-base font-extrabold text-chef-cream">
                  Tarzan
                </Text>
              </View>

              <Pressable
                className="h-11 w-11 items-center justify-center rounded-full bg-chef-panel border border-chef-line"
                onPress={() => {
                  const nextMuted = !isMuted;
                  setIsMuted(nextMuted);
                  if (nextMuted) {
                    Speech.stop();
                  }
                }}
              >
                {isMuted ? (
                  <VolumeX stroke={colors.cream} size={20} strokeWidth={2.4} />
                ) : (
                  <Volume2 stroke={colors.cream} size={20} strokeWidth={2.4} />
                )}
              </Pressable>
            </View>

            {/* Messages List */}
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessageItem}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 12 }}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              ListFooterComponent={isTyping ? <TypingIndicator /> : null}
              showsVerticalScrollIndicator={false}
            />

            {/* Voice Mode Status Banner */}
            {convoState !== "idle" && (
              <View className="mx-4 mb-2 p-3 bg-chef-panel rounded-chef border border-chef-line flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className={`h-2.5 w-2.5 rounded-full mr-2.5 ${convoState === "listening" ? "bg-chef-tomato" :
                    convoState === "thinking" ? "bg-chef-saffron" : "bg-chef-herb"
                    }`} />
                  <Text className="text-chef-sm font-bold text-chef-cream">
                    {convoState === "listening" && "Listening... 🎤"}
                    {convoState === "thinking" && "Thinking... 🤔"}
                    {convoState === "speaking" && "Speaking... 🔊"}
                  </Text>
                </View>
                <Pressable
                  onPress={async () => {
                    setConvoState("idle");
                    await ExpoSpeechRecognitionModule.stop();
                    Speech.stop();
                  }}
                  className="px-3 py-1 rounded bg-chef-line active:opacity-80"
                >
                  <Text className="text-chef-xs font-bold text-chef-cream">Cancel</Text>
                </Pressable>
              </View>
            )}

            {/* Text Input Layout */}
            <View className="border-t border-chef-line bg-chef-panel/40 px-4 py-3 flex-row items-center">
              <View className="flex-1 flex-row items-center bg-chef-panel rounded-chef border border-chef-line px-4 min-h-14">
                <TextInput
                  className="flex-1 py-3 text-chef-base text-chef-cream"
                  placeholder={t("tarzan.inputPlaceholder", "Ask about recipes, substitutions...")}
                  placeholderTextColor={colors.textMuted}
                  value={input}
                  onChangeText={(text) => {
                    setInput(text);
                    if (convoStateRef.current !== "idle") {
                      setConvoState("idle");
                    }
                    if (isListening) {
                      ExpoSpeechRecognitionModule.stop();
                    }
                  }}
                  multiline
                  maxLength={500}
                  editable={!isTyping}
                />

                {/* Microphone Button */}
                <Pressable
                  className="ml-2 relative h-10 w-10 items-center justify-center rounded-full"
                  onPress={handleMicPress}
                  disabled={isTyping}
                >
                  {isListening && (
                    <Animated.View
                      style={[
                        {
                          position: "absolute",
                          width: "100%",
                          height: "100%",
                          borderRadius: 9999,
                          backgroundColor: "rgba(244, 93, 72, 0.35)",
                        },
                        animatedMicPulseStyle
                      ]}
                    />
                  )}
                  <View
                    className={`h-10 w-10 items-center justify-center rounded-full ${isListening ? "bg-chef-tomato" : "bg-chef-line"
                      }`}
                  >
                    <Mic stroke={colors.cream} size={16} strokeWidth={2.5} />
                  </View>
                </Pressable>

                <Pressable
                  className={`ml-2 h-10 w-10 items-center justify-center rounded-full ${input.trim() && !isTyping ? "bg-chef-saffron" : "bg-chef-line opacity-50"
                    }`}
                  disabled={!input.trim() || isTyping}
                  onPress={handleSendText}
                >
                  {isTyping ? (
                    <ActivityIndicator color={colors.background} size="small" />
                  ) : (
                    <Send stroke={input.trim() ? colors.background : colors.textMuted} size={16} strokeWidth={2.5} />
                  )}
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </View>
  );
}
