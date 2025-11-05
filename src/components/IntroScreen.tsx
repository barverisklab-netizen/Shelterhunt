import { motion } from "motion/react";
import { Button } from "./ui/button";
import bosaiSensei from "../assets/bosai-sensei.png";

interface IntroScreenProps {
  onContinue: () => void;
}

const TITLE = "ShelterSearch";
const PARAGRAPHS = [
  "Ah, welcome, heroes! I'm Bosai-Sensei, your disaster-preparedness guide. A powerful hurricane is approaching Koto City—and our beloved mascot, Koto-chan, has taken shelter somewhere safe... but we've lost contact!",
  "Your mission is to help me locate which shelter Koto-chan is in before the storm arrives. To do that, you'll need to explore the city, complete disaster-preparedness challenges, and collect clues.",
  "Each correct answer brings us one step closer to Koto-chan—and helps you learn how to stay safe during real emergencies! Ready your team, check your surroundings, and remember: preparedness is the best superpower!",
];

export function IntroScreen({ onContinue }: IntroScreenProps) {
  return (

    <div className="min-h-screen bg-background text-black flex items-center justify-center">
  <div className="mx-auto w-full max-w-5xl rounded-2xl border border-black bg-white px-8 py-12 sm:px-16 sm:py-16 shadow-lg">
    
    <div className="min-h-screen bg-background text-black">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center px-6 pt-10 pb-24 sm:px-10 sm:pb-32">

        {/* TITLE */}
        <motion.h1
          className="w-full max-w-3xl bg-white py-4 text-center text-2xl font-extrabold uppercase tracking-wide"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {TITLE}
        </motion.h1>

        {/* IMAGE */}
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
            className="mt-10 flex justify-center"
          >
            <div className="max-w-[220px] overflow-hidden rounded-2xl border-4 border-black bg-white">
              <img
                src={bosaiSensei}
                alt="Bosai-Sensei welcomes players"
                className="w-full object-contain"
              />
            </div>
          </motion.div>


        {/* PARAGRAPH BOX */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.2 }}
          className="mt-10 w-full max-w-4xl bg-white p-6 sm:p-8"
        >
          <div className="space-y-4 text-center text-base leading-7 sm:text-lg sm:leading-8">
            {PARAGRAPHS.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </motion.div>

        {/* PLAY BUTTON */}
          <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
          className="mt-10 mb-12 flex w-full justify-center"  // 👈 added mb-12
        >
          <Button
            onClick={onContinue}
            className="w-full max-w-xs border border-black bg-white text-black transition-colors hover:bg-neutral-200 hover:text-black hover:border-black active:bg-black active:text-white active:border-black disabled:bg-neutral-200 disabled:text-neutral-500 disabled:border-neutral-400 disabled:opacity-100"
          >
            Play
          </Button>
        </motion.div>

{/* spacer */}
<div className="h-10 sm:h-20" />

      </div>
    </div>
      </div>
</div>
  );
}
