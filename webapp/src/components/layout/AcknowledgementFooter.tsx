import { useI18n } from "@/i18n";

export function AcknowledgementFooter() {
  const { t } = useI18n();

  return (
    <footer className="mt-8 w-full text-center text-xs uppercase tracking-[0.35em] text-neutral-900/60 p-4">
      <table className="w-full">
        <tbody>
          <tr>
            <td className="text-center">
              {t("footer.madeBy")}{" "}
              <a
                href="https://urbanrisklab.mit.edu"
                target="_blank"
                rel="noreferrer"
                className="text-neutral-900 underline-offset-4 hover:underline"
              >
                MIT Urban Risk Lab
              </a>{" "}
              | {t("footer.support")}
            </td>
          </tr>
        </tbody>  
      </table>
    </footer>
  );
}
