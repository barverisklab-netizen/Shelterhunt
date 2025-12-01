import { useI18n } from "@/i18n";

export function AcknowledgementFooter() {
  const { t } = useI18n();

  return (
    <footer className="mt-8 w-full text-center text-xs uppercase tracking-[0.35em] text-neutral-900/60 p-4">
      <table className="w-full">
        <tbody>
          <tr>
            <td className="text-center">{t("footer.madeBy")}   |   {t("footer.support")}</td>
          </tr>
        </tbody>  
      </table>
    </footer>
  );
}
