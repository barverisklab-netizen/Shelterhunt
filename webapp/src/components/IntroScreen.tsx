import { useMemo } from "react";
import { motion } from "motion/react";
import { Button } from "./ui/button";
import { useI18n } from "@/i18n";
import introIllustration from "../assets/graphics/bosaisensai_w.svg";

interface IntroScreenProps {
  onContinue: () => void;
}

export function IntroScreen({ onContinue }: IntroScreenProps) {
  const { t } = useI18n();
  const paragraphs = useMemo(
    () => [
      t("intro.paragraph1"),
      t("intro.paragraph2"),
      t("intro.paragraph3"),
    ],
    [t],
  );

  const fullIntroText = useMemo(() => paragraphs.join("\n\n"), [paragraphs]);

  return (
    <div className="min-h-screen bg-white text-black relative flex flex-col items-center px-4 py-10">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-8 -left-8 h-40 w-40 rounded-full bg-red-500/20 blur-3xl" />
        <div className="absolute bottom-4 right-6 h-44 w-44 rounded-full bg-black/10 blur-3xl" />
      </div>

      <div className="flex-1 flex items-center justify-center w-full">
        <div
          className="relative grid grid-cols-1 md:grid-cols-2 items-center gap-8 md:gap-10 bg-white/90 border-4 border-black rounded-3xl px-6 py-8 sm:px-8 sm:py-10 shadow-[10px_10px_0_#000]"
          style={{ width: "min(100%, 960px)" }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className="flex justify-center md:justify-end"
          >
            <div className="w-[240px] h-[240px] sm:w-[260px] sm:h-[260px] md:w-[320px] md:h-[320px] lg:w-[360px] lg:h-[360px] bg-white rounded-3xl border-4 border-black overflow-hidden shadow-[8px_8px_0_#000] flex justify-center items-center">
              <img
                className="block h-full w-full object-cover"
                src={introIllustration}
                alt={t("intro.imageAlt", { fallback: "Bosai Sensei illustration" })}
              />
            </div>
          </motion.div>

          <div className="flex flex-col space-y-6 md:space-y-8 items-center md:items-start">
            <motion.h1
              className="text-center md:text-left text-3xl font-black tracking-[0.28em] sm:text-4xl"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              {t("intro.title")}
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
              className="space-y-5 text-center md:text-left text-base leading-7 sm:text-lg sm:leading-8 w-full max-w-[420px]"
            >
              <p className="whitespace-pre-line">{fullIntroText}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
              className="flex md:justify-start justify-center pt-2"
            >
              <Button
                onClick={onContinue}
                className="w-full max-w-xs border border-black bg-white text-black transition-colors hover:bg-neutral-100 hover:text-black hover:border-black active:hover:bg-neutral-100 active:text-black active:border-black disabled:bg-neutral-200 disabled:text-black-40 disabled:border-neutral-400 disabled:opacity-100"
              >
                {t("intro.play")}
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
