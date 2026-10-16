import { useEffect } from "react";

type PageMetaProps = {
  title?: string;
  description?: string;
  image?: string;
};

const DEFAULT_DESC =
  "Digital tools, camera gear, and GSM repairs in Koforidua, Ghana. Shop in GHS with MoMo, bank, or Paystack.";

export function PageMeta({ title, description, image }: PageMetaProps) {
  useEffect(() => {
    const fullTitle = title ? `${title} · Media Extensions` : "Media Extensions";
    document.title = fullTitle;

    function setMeta(name: string, content: string, property = false) {
      const attr = property ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.content = content;
    }

    const desc = description ?? DEFAULT_DESC;
    setMeta("description", desc);
    setMeta("og:title", fullTitle, true);
    setMeta("og:description", desc, true);
    setMeta("og:type", "website", true);
    if (image) setMeta("og:image", image, true);
  }, [title, description, image]);

  return null;
}
