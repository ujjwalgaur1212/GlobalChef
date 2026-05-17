import { createContext, useCallback, useContext, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { Animated, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ToastTone = "success" | "error" | "info";

type ToastState = {
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const toneClassNames: Record<ToastTone, string> = {
  success: "border-chef-herb/50 bg-chef-herb/15",
  error: "border-chef-tomato/50 bg-chef-tomato/15",
  info: "border-chef-saffron/50 bg-chef-saffron/15"
};

const toneTextClassNames: Record<ToastTone, string> = {
  success: "text-chef-herb",
  error: "text-chef-tomato",
  info: "text-chef-saffron"
};

export function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true
      }),
      Animated.timing(translateY, {
        toValue: -12,
        duration: 180,
        useNativeDriver: true
      })
    ]).start(() => setToast(null));
  }, [opacity, translateY]);

  const showToast = useCallback(
    (message: string, tone: ToastTone = "info") => {
      if (timer.current) {
        clearTimeout(timer.current);
      }

      setToast({ message, tone });
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true
        })
      ]).start();

      timer.current = setTimeout(hideToast, 3200);
    },
    [hideToast, opacity, translateY]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <SafeAreaView pointerEvents="none" className="absolute left-0 right-0 top-0 px-5">
          <Animated.View style={{ opacity, transform: [{ translateY }] }}>
            <View className={`mt-3 rounded-chef border px-4 py-3 ${toneClassNames[toast.tone]}`}>
              <Text className={`text-chef-sm font-extrabold ${toneTextClassNames[toast.tone]}`}>{toast.message}</Text>
            </View>
          </Animated.View>
        </SafeAreaView>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider.");
  }

  return context;
}
