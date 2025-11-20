import { motion } from "motion/react";
import { Button } from "./ui/button";
import bosaiSensei from "../assets/bosai-sensei.png";

interface IntroScreenProps {
  onContinue: () => void;
}

const TITLE = "ShelterSearch";
const PARAGRAPHS = [
  "Ah, welcome, heroes! I'm Bosai-Sensei, your disaster-preparedness guide. A powerful hurricane is approaching Koto City--and our beloved mascot, Koto-chan, has taken shelter somewhere safe... but we've lost contact!",
  "Your mission is to help me locate which shelter Koto-chan is in before the storm arrives. To do that, you'll need to explore the city, complete disaster-preparedness challenges, and collect clues.",
  "Each correct answer brings us one step closer to Koto-chan--and helps you learn how to stay safe during real emergencies! Ready your team, check your surroundings, and remember: preparedness is the best superpower!",
];

export function IntroScreen({ onContinue }: IntroScreenProps) {
  return (
    <div className="min-h-screen bg-white text-black">
      <div className="h-16 sm:h-24" />
      <div className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col justify-center gap-8 px-6 py-12 sm:gap-10 sm:px-8 sm:py-16">
        {/* TITLE */}
        <motion.h1
          className="text-center text-3xl font-black tracking-[0.28em] sm:text-4xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {TITLE}
        </motion.h1>

        {/* IMAGE */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          className="flex justify-center"
        >
          {/* Parent fixed-size box */}
          <div className="w-[260px] h-[260px] mx-auto bg-white rounded-3xl border-4 border-black overflow-hidden shadow-[8px_8px_0_#000] flex justify-center items-center">
            <img
              src={bosaiSensei}
              alt="Bosai-Sensei welcomes players"
              width={220}
              height={220}
              className="block mx-auto object-contain"
              style={{ width: "220px", height: "220px" }}
            />
          </div>
        </motion.div>

        {/* PARAGRAPHS */}
        {/* PARAGRAPHS */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          className="mx-auto max-w-[480px] space-y-5 text-center text-base leading-7 sm:text-lg sm:leading-8"
        >
          {PARAGRAPHS.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </motion.div>

        {/* spacer */}
        <div className="h-6 sm:h-4" />

        {/* PLAY BUTTON */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
          className="flex justify-center pt-2 m-16"
        >
          <Button
            onClick={onContinue}
            className="w-full max-w-xs border border-black bg-white text-black transition-colors hover:bg-neutral-200 hover:text-black hover:border-black active:bg-black active:text-white active:border-black disabled:bg-neutral-200 disabled:text-neutral-500 disabled:border-neutral-400 disabled:opacity-100"
          >
            Play
          </Button>
        </motion.div>

        {/* spacer */}
        <div className="h-16 sm:h-24" />
      </div>
    </div>
  );
}
