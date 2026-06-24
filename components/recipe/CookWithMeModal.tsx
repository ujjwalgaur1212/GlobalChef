import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useKeepAwake } from "expo-keep-awake";
import * as Speech from "expo-speech";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent
} from "expo-speech-recognition";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Mic,
  MicOff,
  Volume2,
  Play,
  Pause,
  RotateCcw
} from "lucide-react-native";

import { colors } from "@/constants/theme";

type CookWithMeModalProps = {
  visible: boolean;
  onClose: () => void;
  steps: string[];
  recipeTitle: string;
};

export function CookWithMeModal({
  visible,
  onClose,
  steps,
  recipeTitle
}: CookWithMeModalProps) {
  // 1. Keep Screen Awake
  useKeepAwake();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVoiceActive, setIsVoiceActive] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Timer states
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerDuration, setTimerDuration] = useState<number | null>(null);

  const stepsCount = steps ? steps.length : 0;
  const currentStepText = steps && steps.length > 0 ? steps[currentStepIndex] : "No steps available.";

  // Extract timer in minutes
  const parsedMinutes = useMemo(() => {
    if (!currentStepText) return null;
    const match = currentStepText.match(/(\d+)\s*(?:minute|minutes|min|mins)\b/i);
    return match ? parseInt(match[1], 10) : null;
  }, [currentStepText]);

  // Voice Command Event handlers
  useSpeechRecognitionEvent("start", () => {
    setIsListening(true);
  });

  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
    // Keep listening loop active if voice assistant is enabled and modal is open
    if (isVoiceActive && visible && !isSpeaking) {
      startSpeechRecognition();
    }
  });

  useSpeechRecognitionEvent("result", (event) => {
    if (event.results && event.results.length > 0) {
      const transcript = event.results[0]?.transcript?.toLowerCase()?.trim() || "";
      console.log("[CookMode STT] Heard transcript:", transcript);
      
      // Commands matching
      if (transcript.includes("next")) {
        handleNext();
      } else if (transcript.includes("previous") || transcript.includes("prev") || transcript.includes("back")) {
        handlePrev();
      } else if (transcript.includes("repeat") || transcript.includes("say again") || transcript.includes("read again")) {
        handleRepeat();
      } else if (transcript.includes("pause") || transcript.includes("stop timer")) {
        // If user says "pause timer" we pause the timer, otherwise we pause the mic
        if (transcript.includes("timer")) {
          setIsTimerRunning(false);
        } else {
          handlePauseVoice();
        }
      } else if (transcript.includes("resume") || transcript.includes("start timer")) {
        if (transcript.includes("timer")) {
          if (timeLeft > 0) setIsTimerRunning(true);
        } else {
          handleResumeVoice();
        }
      }
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    console.log("[CookMode STT] error occurred:", event.error);
    setIsListening(false);
    
    // Auto-restart listening loop if voice is active and modal is open
    if (isVoiceActive && visible && !isSpeaking) {
      const harmlessErrors = ["no-speech", "speech-timeout", "aborted"];
      const delay = harmlessErrors.includes(event.error) ? 500 : 1500;
      setTimeout(() => {
        if (isVoiceActive && visible && !isSpeaking) {
          startSpeechRecognition();
        }
      }, delay);
    }
  });

  // Countdown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            playTimerEndAlert();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timeLeft]);

  // Read current step when step index changes
  useEffect(() => {
    if (visible && steps && steps.length > 0) {
      // Reset step-specific timer states
      setIsTimerRunning(false);
      setTimeLeft(0);
      setTimerDuration(null);

      // Read current step
      readStep(steps[currentStepIndex]);
    }

    return () => {
      Speech.stop();
      ExpoSpeechRecognitionModule.stop();
    };
  }, [currentStepIndex, visible]);

  // Read current step aloud using expo-speech
  const readStep = async (text: string) => {
    try {
      setIsSpeaking(true);
      await Speech.stop();
      // Temporarily stop microphone listening while Tarzan speaks to avoid feedback echo
      await ExpoSpeechRecognitionModule.stop();

      const voices = await Speech.getAvailableVoicesAsync();
      const preferred = ["en-in-x-ene-network", "en-us-x-tpf-local", "en-gb-x-gba-network", "en-au-x-aua-network"];
      const selectedVoice = voices.find(v => preferred.includes(v.identifier));

      const speechOptions: Speech.SpeechOptions = {
        rate: 0.92,
        pitch: 1.0,
        onDone: () => {
          setIsSpeaking(false);
          if (isVoiceActive && visible) {
            startSpeechRecognition();
          }
        },
        onError: () => {
          setIsSpeaking(false);
          if (isVoiceActive && visible) {
            startSpeechRecognition();
          }
        }
      };

      if (selectedVoice) {
        speechOptions.voice = selectedVoice.identifier;
      }

      Speech.speak(text, speechOptions);
    } catch (err) {
      console.warn("[CookMode TTS] speak failed:", err);
      setIsSpeaking(false);
      if (isVoiceActive && visible) {
        startSpeechRecognition();
      }
    }
  };

  const startSpeechRecognition = async () => {
    if (!isVoiceActive || !visible || isSpeaking) return;
    try {
      const check = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      if (!check.granted) {
        const req = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!req.granted) {
          setIsVoiceActive(false);
          return;
        }
      }

      await ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: false,
        continuous: false
      });
    } catch (e) {
      console.log("[CookMode STT] Failed starting mic:", e);
    }
  };

  const playTimerEndAlert = () => {
    Speech.stop();
    Speech.speak("Time is up! The cooking timer for this step has completed.", { rate: 0.95 });
    Alert.alert("Timer Finished", "Your cooking step timer has completed!");
  };

  // Navigations
  const handleNext = () => {
    if (currentStepIndex < stepsCount - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      Speech.stop();
      Speech.speak("You have completed all the cooking steps! Enjoy your meal.", { rate: 0.95 });
      Alert.alert("Congratulations!", "You have finished cooking this recipe!");
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleRepeat = () => {
    readStep(currentStepText);
  };

  const handlePauseVoice = () => {
    setIsVoiceActive(false);
    Speech.stop();
    ExpoSpeechRecognitionModule.stop();
  };

  const handleResumeVoice = () => {
    setIsVoiceActive(true);
    // Briefly delay to start recognition loop correctly
    setTimeout(() => {
      startSpeechRecognition();
    }, 200);
  };

  const handleStartTimer = (mins: number) => {
    setTimerDuration(mins);
    setTimeLeft(mins * 60);
    setIsTimerRunning(true);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-chef-black px-6 py-6 justify-between">
        {/* Top bar details */}
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={onClose}
            className="h-11 w-11 items-center justify-center rounded-full bg-chef-panel/40 border border-chef-line"
          >
            <ArrowLeft stroke={colors.cream} size={22} strokeWidth={2.4} />
          </Pressable>

          <View className="items-center">
            <Text className="text-chef-xs font-bold text-chef-muted uppercase tracking-widest" numberOfLines={1}>
              {recipeTitle}
            </Text>
            {isVoiceActive ? (
              <View className="flex-row items-center mt-1">
                <View className={`h-2 w-2 rounded-full mr-2 ${isSpeaking ? "bg-chef-herb animate-pulse" : isListening ? "bg-chef-saffron animate-pulse" : "bg-neutral-600"}`} />
                <Text className="text-[11px] font-extrabold text-chef-saffron uppercase tracking-wider">
                  {isSpeaking ? "Tarzan Speaking" : isListening ? "Tarzan Listening" : "Voice Mode Active"}
                </Text>
              </View>
            ) : (
              <Text className="text-[11px] font-extrabold text-chef-muted uppercase mt-1">
                Voice Assistant Paused
              </Text>
            )}
          </View>

          <Pressable
            onPress={isVoiceActive ? handlePauseVoice : handleResumeVoice}
            className={`h-11 w-11 items-center justify-center rounded-full border ${isVoiceActive ? "bg-chef-saffron/10 border-chef-saffron/30" : "bg-chef-panel/20 border-chef-line"}`}
          >
            {isVoiceActive ? (
              <Mic stroke={colors.saffron} size={20} strokeWidth={2.2} />
            ) : (
              <MicOff stroke={colors.textMuted} size={20} strokeWidth={2.2} />
            )}
          </Pressable>
        </View>

        {/* Current Step Centered Content */}
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingVertical: 32 }}
          showsVerticalScrollIndicator={false}
          className="my-4"
        >
          <View className="items-center justify-center p-6 rounded-chef border border-chef-line bg-chef-charcoal">
            {/* Step Counter */}
            <Text className="text-chef-saffron text-chef-base font-extrabold uppercase tracking-widest mb-6">
              Step {currentStepIndex + 1} of {stepsCount}
            </Text>

            {/* Step Text (Readable Typography) */}
            <Text className="text-[28px] font-extrabold text-chef-cream text-center leading-10 px-2 mb-8">
              {currentStepText}
            </Text>

            {/* Timer Panel */}
            {parsedMinutes !== null && (
              <View className="w-full mt-4 p-5 rounded-chef bg-chef-panel/60 border border-chef-line/80 items-center justify-center">
                {timerDuration === null ? (
                  <Pressable
                    onPress={() => handleStartTimer(parsedMinutes)}
                    className="flex-row items-center justify-center bg-chef-saffron rounded-chef py-3 px-6 active:opacity-90 w-full"
                  >
                    <Text className="text-chef-black font-extrabold text-chef-sm">
                      ⏱️ Start {parsedMinutes} minute timer?
                    </Text>
                  </Pressable>
                ) : (
                  <View className="w-full items-center">
                    {/* Time Countdown */}
                    <Text className="text-chef-2xl font-black text-chef-cream tracking-widest mb-3">
                      {formatTime(timeLeft)}
                    </Text>

                    {/* Timer Actions */}
                    <View className="flex-row items-center gap-4">
                      <Pressable
                        onPress={() => setIsTimerRunning(!isTimerRunning)}
                        className={`h-11 px-6 flex-row items-center justify-center rounded-chef ${isTimerRunning ? "bg-chef-tomato" : "bg-chef-herb"}`}
                      >
                        {isTimerRunning ? (
                          <Pause stroke={colors.background} size={16} strokeWidth={2.5} />
                        ) : (
                          <Play stroke={colors.background} size={16} strokeWidth={2.5} />
                        )}
                        <Text className="text-chef-black font-extrabold text-chef-xs ml-1.5">
                          {isTimerRunning ? "Pause" : "Resume"}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          setIsTimerRunning(false);
                          setTimeLeft(timerDuration * 60);
                        }}
                        className="h-11 w-11 items-center justify-center rounded-chef border border-chef-line bg-chef-black active:opacity-80"
                      >
                        <RotateCcw stroke={colors.cream} size={18} strokeWidth={2} />
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Bottom controls bar */}
        <View className="flex-row items-center justify-between border-t border-chef-line/20 pt-6">
          <Pressable
            disabled={currentStepIndex === 0}
            onPress={handlePrev}
            className={`h-14 flex-1 flex-row items-center justify-center rounded-chef border mr-3 ${currentStepIndex === 0 ? "border-chef-line bg-chef-panel/10 opacity-30" : "border-chef-line bg-chef-panel/40 active:opacity-80"}`}
          >
            <ChevronLeft stroke={colors.cream} size={22} strokeWidth={2.5} />
            <Text className="text-chef-cream font-extrabold text-chef-sm ml-1">Prev</Text>
          </Pressable>

          <Pressable
            onPress={handleRepeat}
            className="h-14 w-14 items-center justify-center rounded-chef border border-chef-line bg-chef-panel/40 mr-3 active:opacity-85"
            accessibilityLabel="Repeat Step"
          >
            <Volume2 stroke={colors.saffron} size={22} strokeWidth={2.2} />
          </Pressable>

          <Pressable
            onPress={handleNext}
            className="h-14 flex-[1.4] flex-row items-center justify-center bg-chef-saffron rounded-chef active:opacity-90"
          >
            <Text className="text-chef-black font-extrabold text-chef-sm mr-1">
              {currentStepIndex === stepsCount - 1 ? "Finish" : "Next Step"}
            </Text>
            {currentStepIndex < stepsCount - 1 && (
              <ChevronRight stroke={colors.background} size={22} strokeWidth={2.5} />
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
