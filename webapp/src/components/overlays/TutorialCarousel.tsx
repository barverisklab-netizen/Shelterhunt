import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/i18n";
import onboarding1 from "@/assets/graphics/onboarding_1.svg";
import onboarding2 from "@/assets/graphics/onboarding_2.svg";
import onboarding3 from "@/assets/graphics/onboarding_3.svg";
import onboarding4 from "@/assets/graphics/onboarding_4.svg";
import onboarding5 from "@/assets/graphics/onboarding_5.svg";

interface TutorialCarouselProps {
  onComplete: () => void;
}

interface TutorialSlide {
  image: string;
  title: string;
  body: string;
  imageAlt: string;
}

export function TutorialCarousel({ onComplete }: TutorialCarouselProps) {
  const { t } = useI18n();
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = useMemo<TutorialSlide[]>(
    () => [
      {
        image: onboarding1,
        title: t("tutorial.slides.one.title", { fallback: "Find Mobi" }),
        body: t("tutorial.slides.one.body", {
          fallback:
            'Walk through the city and find the evacuation shelter where "Mobi" is hiding.',
        }),
        imageAlt: t("tutorial.slides.one.imageAlt", {
          fallback: "Onboarding illustration showing Mobi hiding in a shelter",
        }),
      },
      {
        image: onboarding2,
        title: t("tutorial.slides.two.title", {
          fallback: "Ask location-based questions",
        }),
        body: t("tutorial.slides.two.body", {
          fallback:
            "Visit disaster-related points around the city, such as schools, stations, or bridges, to ask a question related to that specific location.",
        }),
        imageAlt: t("tutorial.slides.two.imageAlt", {
          fallback: "Onboarding illustration showing city points with question prompts",
        }),
      },
      {
        image: onboarding3,
        title: t("tutorial.slides.three.title", {
          fallback: "Narrow the candidates",
        }),
        body: t("tutorial.slides.three.body", {
          fallback:
            "You may ask only one question per location. Use each answer, correct or incorrect, as a clue to narrow down the possible shelters where Mobi could be hiding.",
        }),
        imageAlt: t("tutorial.slides.three.imageAlt", {
          fallback: "Onboarding illustration showing clue-based shelter filtering",
        }),
      },
      {
        image: onboarding4,
        title: t("tutorial.slides.four.title", {
          fallback: "Submit your final answer",
        }),
        body: t("tutorial.slides.four.body", {
          fallback:
            'Once you think you have identified the shelter where "Mobi" is located, submit your final answer.',
        }),
        imageAlt: t("tutorial.slides.four.imageAlt", {
          fallback: "Onboarding illustration prompting the final answer",
        }),
      },
      {
        image: onboarding5,
        title: t("tutorial.slides.five.title", {
          fallback: "Start with the nearest shelter",
        }),
        body: t("tutorial.slides.five.body", {
          fallback:
            'First, try going to the nearest "Evacuation Shelter." Ask a hazard layer question to significantly narrow the search area and progress through the game efficiently.',
        }),
        imageAlt: t("tutorial.slides.five.imageAlt", {
          fallback: "Onboarding illustration guiding the player to the nearest shelter",
        }),
      },
    ],
    [t],
  );

  const isLast = activeSlide === slides.length - 1;
  const progressLabel = t("tutorial.progress", {
    replacements: { current: activeSlide + 1, total: slides.length },
    fallback: `Step ${activeSlide + 1} of ${slides.length}`,
  });

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative w-full max-w-lg rounded-lg border-2 border-black bg-background p-5 text-black shadow-xl"
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
      >
        <button
          type="button"
          onClick={onComplete}
          className="absolute right-4 top-4 px-2 py-1 text-[11px] font-bold uppercase tracking-wide hover:bg-neutral-100"
        >
          {t("tutorial.skip", { fallback: "Skip" })}
        </button>

        <div className="mb-4 pr-20">
          <h2 className="text-lg font-bold uppercase">
            {t("tutorial.title", { fallback: "Quick Tutorial" })}
          </h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-black/70">
            {progressLabel}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="mb-4 flex justify-center overflow-hidden rounded border-2 border-black bg-white p-3">
              <img
                src={slides[activeSlide].image}
                alt={slides[activeSlide].imageAlt}
                className="h-20 w-auto max-w-full object-contain"
              />
            </div>

            <h3 className="text-base font-bold uppercase">
              {slides[activeSlide].title}
            </h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-black/80">
              {slides[activeSlide].body}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-4 flex items-center justify-center gap-2">
          {slides.map((_, index) => (
            <span
              key={index}
              className={`h-2.5 w-2.5 rounded-full border border-black ${
                index === activeSlide ? "bg-black" : "bg-white"
              }`}
              aria-hidden="true"
            />
          ))}
        </div>

        <div className="mt-5 flex justify-center gap-3">
          <button
            className="rounded border border-black px-4 py-2 text-sm font-semibold uppercase tracking-wide hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed"
            type="button"
            onClick={() => setActiveSlide((prev) => Math.max(0, prev - 1))}
            disabled={activeSlide === 0}
          >
            <span className="inline-flex items-center gap-1">
              <ChevronLeft className="h-4 w-4" />
              {t("tutorial.back", { fallback: "Back" })}
            </span>
          </button>

          <button
            className="rounded border border-black px-4 py-2 text-sm font-bold uppercase tracking-wide hover:bg-green-500/20"
            type="button"
            onClick={() => {
              if (isLast) {
                onComplete();
                return;
              }
              setActiveSlide((prev) => Math.min(slides.length - 1, prev + 1));
            }}
          >
            <span className="inline-flex items-center gap-1">
              {isLast
                ? t("tutorial.start", { fallback: "Start Game" })
                : t("tutorial.next", { fallback: "Next" })}
              {!isLast && <ChevronRight className="h-4 w-4" />}
            </span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
