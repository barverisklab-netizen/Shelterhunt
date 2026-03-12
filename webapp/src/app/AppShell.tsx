import { Clock } from "lucide-react";
import loadingMascot from "@/assets/graphics/character-mascot-loading.gif";
import { GameScreen, type WrongGuessStage } from "@/components/GameScreen";
import { HelpModal } from "@/components/overlays/HelpModal";
import { HostShareModal } from "@/components/overlays/HostShareModal";
import { IntroScreen } from "@/components/IntroScreen";
import { LanguageToggle } from "@/components/controls/LanguageToggle";
import { OnboardingScreen } from "@/components/OnboardingScreen";
import { PwaIosInstallModal } from "@/components/overlays/PwaIosInstallModal";
import { ProfileNameModal } from "@/components/overlays/ProfileNameModal";
import { PwaInstallModal } from "@/components/overlays/PwaInstallModal";
import { SoloModeScreen } from "@/components/SoloModeScreen";
import { TerminalScreen } from "@/components/TerminalScreen";
import { Toaster } from "@/components/ui/sonner";
import { WaitingRoom } from "@/components/WaitingRoom";
import { useI18n } from "@/i18n";
import type {
  LatLng,
  MultiplayerWinInfo,
  OtherPlayerLocation,
  POI,
  Player,
  QuestionAttribute,
  RemoteOutcome,
  SecretShelterInfo,
  ShelterOption,
} from "@/types/game";
import type { Shelter } from "@/services/shelterDataService";

export type AppShellGameState =
  | "intro"
  | "onboarding"
  | "mode-select"
  | "waiting"
  | "playing"
  | "ended";

export type AppShellGameMode = "lightning" | "citywide";

interface AppShellProps {
  gameState: AppShellGameState;
  profilePromptActive: boolean;
  showLoadingOverlay: boolean;
  modeProcessing: boolean;
  sessionBootstrapLoading: boolean;
  gameCode: string;
  players: Player[];
  isHost: boolean;
  currentUserId: string;
  sessionHostId: string | null;
  designatedShelters: POI[];
  questionAttributes: QuestionAttribute[];
  shelters: Shelter[];
  playerLocation: LatLng;
  timeRemaining: number;
  secretShelter: SecretShelterInfo | null;
  shelterOptions: ShelterOption[];
  isTimerCritical: boolean;
  timerEnabled: boolean;
  currentPlayerDisplayName: string;
  currentSessionUserId: string;
  remoteOutcome: RemoteOutcome | null;
  gameMode: AppShellGameMode | null;
  lightningCenter: LatLng | null;
  lightningRadiusKm: number | null;
  otherPlayerLocations: OtherPlayerLocation[];
  resumeId: string;
  showHelp: boolean;
  joinNameModalOpen: boolean;
  hostSetupModalOpen: boolean;
  joinCodeScreenOpen: boolean;
  profileName: string;
  joinSubmitting: boolean;
  joinError: string | null;
  hostShareModalOpen: boolean;
  hostShareCode: string | null;
  installPromptOpen: boolean;
  installPromptPending: boolean;
  iosInstallPromptOpen: boolean;
  multiplayerActive: boolean;
  onSkipIntro: () => void;
  onJoinGameRequest: () => void;
  onHostGame: () => void;
  onPlaySolo: () => void;
  onShowHelp: () => void;
  onModeBack: () => void;
  onSelectLightning: () => void;
  onSelectCitywide: () => void;
  onToggleReady: () => void;
  onStartGame: () => void;
  onLeaveGame: () => void;
  onApplyPenalty: () => WrongGuessStage;
  onEndGame: () => void;
  onPlayerLocationChange: (location: LatLng) => void;
  onSecretShelterChange: (info: SecretShelterInfo) => void;
  onShelterOptionsChange: (options: ShelterOption[]) => void;
  onMultiplayerWin: (info: MultiplayerWinInfo) => void;
  onCloseHelp: () => void;
  onJoinNameSubmit: (value: string) => void;
  onCloseJoinNameModal: () => void;
  onHostSetupSubmit: (value: string) => void;
  onCloseHostSetupModal: () => void;
  onJoinSessionSubmit: (code: string) => void;
  onCloseJoinCodeModal: () => void;
  onCloseHostShareModal: () => void;
  onInstallPromptSkip: () => void;
  onInstallPromptTimeout: () => void;
  onInstallPromptConfirm: () => void;
  onIosInstallPromptSkip: () => void;
  onIosInstallPromptTimeout: () => void;
  onIosInstallPromptAcknowledge: () => void;
}

export function AppShell({
  gameState,
  profilePromptActive,
  showLoadingOverlay,
  modeProcessing,
  sessionBootstrapLoading,
  gameCode,
  players,
  isHost,
  currentUserId,
  sessionHostId,
  designatedShelters,
  questionAttributes,
  shelters,
  playerLocation,
  timeRemaining,
  secretShelter,
  shelterOptions,
  isTimerCritical,
  timerEnabled,
  currentPlayerDisplayName,
  currentSessionUserId,
  remoteOutcome,
  gameMode,
  lightningCenter,
  lightningRadiusKm,
  otherPlayerLocations,
  resumeId,
  showHelp,
  joinNameModalOpen,
  hostSetupModalOpen,
  joinCodeScreenOpen,
  profileName,
  joinSubmitting,
  joinError,
  hostShareModalOpen,
  hostShareCode,
  installPromptOpen,
  installPromptPending,
  iosInstallPromptOpen,
  multiplayerActive,
  onSkipIntro,
  onJoinGameRequest,
  onHostGame,
  onPlaySolo,
  onShowHelp,
  onModeBack,
  onSelectLightning,
  onSelectCitywide,
  onToggleReady,
  onStartGame,
  onLeaveGame,
  onApplyPenalty,
  onEndGame,
  onPlayerLocationChange,
  onSecretShelterChange,
  onShelterOptionsChange,
  onMultiplayerWin,
  onCloseHelp,
  onJoinNameSubmit,
  onCloseJoinNameModal,
  onHostSetupSubmit,
  onCloseHostSetupModal,
  onJoinSessionSubmit,
  onCloseJoinCodeModal,
  onCloseHostShareModal,
  onInstallPromptSkip,
  onInstallPromptTimeout,
  onInstallPromptConfirm,
  onIosInstallPromptSkip,
  onIosInstallPromptTimeout,
  onIosInstallPromptAcknowledge,
}: AppShellProps) {
  const { t } = useI18n();

  const loadingTitle = sessionBootstrapLoading
    ? t("app.processing.connecting", {
        fallback: "Connecting to your lobby…",
      })
    : t("app.processing.title", {
        fallback: "Preparing multiplayer session…",
      });
  const loadingSubtitle = sessionBootstrapLoading
    ? t("app.processing.connectingSubtitle", {
        fallback: "Setting up your waiting room and pulling players in",
      })
    : t("app.processing.subtitle", {
        fallback: "Checking your location & locking a nearby shelter",
      });

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {gameState !== "playing" && <LanguageToggle />}
      <div className="relative z-10">
        {gameState === "intro" && <IntroScreen onContinue={onSkipIntro} />}

        {gameState === "onboarding" && !profilePromptActive && !showLoadingOverlay && (
          <OnboardingScreen
            onJoinGame={onJoinGameRequest}
            onHostGame={onHostGame}
            onPlaySolo={onPlaySolo}
            onShowHelp={onShowHelp}
          />
        )}

        {gameState === "mode-select" && (
          <SoloModeScreen
            isProcessing={modeProcessing}
            onBack={onModeBack}
            onSelectLightning={onSelectLightning}
            onSelectCitywide={onSelectCitywide}
          />
        )}

        {gameState === "waiting" && (
          <WaitingRoom
            gameCode={gameCode}
            players={players}
            isHost={isHost}
            currentUserId={currentUserId}
            hostId={sessionHostId}
            onToggleReady={onToggleReady}
            onStartGame={onStartGame}
            onLeaveGame={onLeaveGame}
          />
        )}

        {gameState === "playing" && (
          <GameScreen
            pois={designatedShelters}
            questionAttributes={questionAttributes}
            shelters={shelters}
            playerLocation={playerLocation}
            timeRemaining={timeRemaining}
            secretShelter={secretShelter}
            shelterOptions={shelterOptions}
            isTimerCritical={isTimerCritical}
            isTimerEnabled={timerEnabled}
            onApplyPenalty={onApplyPenalty}
            onEndGame={onEndGame}
            onLocationChange={onPlayerLocationChange}
            onSecretShelterChange={onSecretShelterChange}
            onShelterOptionsChange={onShelterOptionsChange}
            currentPlayerName={currentPlayerDisplayName}
            currentPlayerId={currentSessionUserId}
            onMultiplayerWin={multiplayerActive ? onMultiplayerWin : undefined}
            remoteOutcome={remoteOutcome}
            gameMode={gameMode}
            lightningCenter={lightningCenter}
            lightningRadiusKm={lightningRadiusKm ?? undefined}
            otherPlayerLocations={otherPlayerLocations}
            resumeId={resumeId}
            onShowHelp={onShowHelp}
          />
        )}

        {gameState === "ended" && <TerminalScreen onRestart={onLeaveGame} />}
      </div>

      <HelpModal isOpen={showHelp} onClose={onCloseHelp} />

      <Toaster
        position="top-center"
        toastOptions={{
          className: "rounded border-4 border-black bg-red-500 text-white shadow-lg",
          style: { background: "#ef4444", border: "4px solid #000", color: "#fff" },
        }}
      />

      {gameState === "onboarding" && (
        <>
          <ProfileNameModal
            open={joinNameModalOpen}
            initialValue={profileName}
            title={t("profile.setCallsignTitle")}
            subtitle={t("profile.setCallsignSubtitle")}
            placeholder={t("profile.callsignPlaceholder")}
            submitLabel={t("profile.submitContinue")}
            variant="screen"
            onSubmit={onJoinNameSubmit}
            onClose={onCloseJoinNameModal}
          />

          <ProfileNameModal
            open={hostSetupModalOpen}
            initialValue={profileName}
            title={t("profile.createSessionTitle")}
            subtitle={t("profile.createSessionSubtitle")}
            placeholder={t("profile.callsignPlaceholder")}
            submitLabel={t("profile.submitStart")}
            variant="screen"
            onSubmit={onHostSetupSubmit}
            onClose={onCloseHostSetupModal}
          />

          <ProfileNameModal
            open={joinCodeScreenOpen}
            initialValue=""
            title={t("profile.joinGameTitle")}
            subtitle={t("profile.joinGameSubtitle")}
            placeholder={t("profile.codePlaceholder")}
            submitLabel={joinSubmitting ? t("profile.joining") : t("profile.submitJoin")}
            label={t("profile.codeLabel")}
            variant="screen"
            submitting={joinSubmitting}
            error={joinError}
            onSubmit={onJoinSessionSubmit}
            onClose={onCloseJoinCodeModal}
          />
        </>
      )}

      <HostShareModal
        open={hostShareModalOpen && Boolean(hostShareCode)}
        code={hostShareCode}
        onClose={onCloseHostShareModal}
      />

      <PwaInstallModal
        open={installPromptOpen}
        installing={installPromptPending}
        onSkip={onInstallPromptSkip}
        onTimeoutClose={onInstallPromptTimeout}
        onInstall={onInstallPromptConfirm}
      />

      <PwaIosInstallModal
        open={iosInstallPromptOpen}
        onSkip={onIosInstallPromptSkip}
        onTimeoutClose={onIosInstallPromptTimeout}
        onAcknowledge={onIosInstallPromptAcknowledge}
      />

      {showLoadingOverlay && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 text-black">
          <div className="w-full max-w-[320px] text-center px-6 py-8 rounded-2xl border-4 border-black bg-white shadow-[8px_8px_0_#000]">
            <div className="mb-4 flex justify-center">
              <img
                src={loadingMascot}
                alt={t("app.processing.loadingMascotAlt", {
                  fallback: "Mascot animation showing the game is loading",
                })}
                className="h-28 w-28 object-contain"
              />
            </div>
            <div className="mb-4 flex items-center justify-center gap-3 text-lg font-black uppercase tracking-[0.3em]">
              <Clock className="h-5 w-5" />
              {loadingTitle}
            </div>
            <div className="flex justify-center gap-2">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="h-4 w-4 animate-bounce rounded-full bg-white"
                  style={{ animationDelay: `${index * 0.15}s` }}
                />
              ))}
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-neutral-300">
              {loadingSubtitle}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
