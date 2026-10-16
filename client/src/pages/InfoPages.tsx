import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api, formatGhs } from "../lib/api";
import { useSiteMeta } from "../context/SiteMetaContext";

function InfoPage({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string;
  children: ReactNode;
}) {
  return (
    <div className="page container info-page">
      <h1>{title}</h1>
      {lede && <p className="lede">{lede}</p>}
      <div className="info-body stack">{children}</div>
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel stack">
      <h2 style={{ margin: 0, fontSize: "1.15rem", letterSpacing: "-0.02em" }}>{title}</h2>
      <div className="info-copy">{children}</div>
    </section>
  );
}

export function AboutPage() {
  return (
    <InfoPage
      title="About"
      lede="Media Extensions is a Koforidua-based shop for creators — presets, plugins, camera accessories, and reliable GSM repairs."
    >
      <InfoSection title="What we do">
        <p>
          We build and curate digital tools that speed up editing workflows, stock physical gear you
          can pick up or have delivered across Ghana, and run a repair bench for phones and related
          devices.
        </p>
        <p>
          Whether you need a cinematic LUT pack tonight or a screen replacement tomorrow, the goal
          is the same: clear pricing in cedis, honest timelines, and support that answers.
        </p>
      </InfoSection>
      <InfoSection title="Where we are">
        <p>
          Based in Koforidua with pickup for physical orders and repairs. Delivery is available
          across Ghana — see <Link to="/shipping">Shipping</Link> and{" "}
          <Link to="/pickup">Pickup & location</Link>.
        </p>
      </InfoSection>
    </InfoPage>
  );
}

export function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+233");
  const [topic, setTopic] = useState("general");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const { meta } = useSiteMeta();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      await api("/api/contact", {
        method: "POST",
        body: JSON.stringify({ name, email, phone, topic, message }),
      });
      setStatus("sent");
      setMessage("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not send message");
    }
  }

  const storePhone = meta?.storePhone || meta?.storeWhatsApp;
  const storeEmail = meta?.storeEmail;
  const hours = meta?.pickup?.hours ?? "Monday–Saturday, 9:00–18:00 GMT";

  return (
    <InfoPage
      title="Contact"
      lede="Questions about an order, repair, or wholesale? Reach the Media Extensions team."
    >
      <div className="split split-2">
        <form className="panel stack" onSubmit={onSubmit}>
          <div className="form-grid two">
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
            </label>
            <label>
              Phone
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
            </label>
          </div>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" required />
          </label>
          <label>
            Topic
            <select value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="general">General Inquiry</option>
              <option value="order">Order Support & Downloads</option>
              <option value="repair">GSM Hardware Repair</option>
              <option value="wholesale">Wholesale & Bulk Orders</option>
            </select>
          </label>
          <label>
            Message
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="How can our team help you?"
              required
              minLength={10}
            />
          </label>
          {error && <p className="error">{error}</p>}
          {status === "sent" && <p className="success">Message sent. We’ll reply soon.</p>}
          <button className="btn btn-primary" type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Sending…" : "Send Message"}
          </button>
        </form>

        <div className="panel stack">
          <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Customer Support</h2>
          {storePhone && (
            <p className="meta">
              WhatsApp / Call: <strong>{storePhone}</strong>
            </p>
          )}
          {storeEmail && (
            <p className="meta">
              Email: <strong>{storeEmail}</strong>
            </p>
          )}
          <p className="meta">Studio Hours: {hours}</p>
          <Link to="/pickup" className="btn btn-light" style={{ textAlign: "center" }}>
            Visit / Pickup Info
          </Link>
          <Link to="/track" className="btn btn-light" style={{ textAlign: "center" }}>
            Track an Order
          </Link>
        </div>
      </div>
    </InfoPage>
  );
}

export function ShippingPage() {
  const { meta } = useSiteMeta();
  const accra = meta?.shipping.accraPesewas ?? 2500;
  const other = meta?.shipping.otherPesewas ?? 4500;
  const pickupName = meta?.pickup?.name?.trim() || "our Koforidua pickup point";

  return (
    <InfoPage
      title="Shipping"
      lede="Physical gear ships across Ghana. Digital products are unlocked after payment is confirmed."
    >
      <InfoSection title="Rates">
        <p>
          <strong>Greater Accra:</strong> {formatGhs(accra)} flat for physical items.
        </p>
        <p>
          <strong>Other regions:</strong> {formatGhs(other)} flat.
        </p>
        <p>
          Pickup at {pickupName} is free — choose “Pay on pickup” at checkout, or pay online with
          Paystack.
        </p>
      </InfoSection>
      <InfoSection title="Timing">
        <p>
          Accra deliveries usually leave within 1–2 business days after payment confirmation.
          Regional orders typically arrive in 2–5 business days depending on courier routes.
        </p>
      </InfoSection>
      <InfoSection title="Digital">
        <p>
          LUTs, presets, plugins, and templates do not ship. After staff marks your order paid,
          download links appear on the order page and in your account.
        </p>
      </InfoSection>
    </InfoPage>
  );
}

export function ReturnsPage() {
  return (
    <InfoPage
      title="Returns"
      lede="Clear policy for physical gear, digital downloads, and repair work."
    >
      <InfoSection title="Physical products">
        <p>
          Unused items in original packaging may be returned within 7 days of delivery or pickup.
          Contact us first so we can arrange inspection. Shipping fees are non-refundable unless
          the item arrived damaged or incorrect.
        </p>
      </InfoSection>
      <InfoSection title="Digital products">
        <p>
          Because downloads are delivered instantly after payment confirmation, digital purchases
          are generally final. If a file is corrupt or incomplete, we’ll replace it.
        </p>
      </InfoSection>
      <InfoSection title="Repairs">
        <p>
          Repair work is quoted before we proceed. If parts fail under normal use within 30 days of
          collection, bring the device back for assessment. Physical damage after handover is not
          covered.
        </p>
      </InfoSection>
    </InfoPage>
  );
}

export function PrivacyPage() {
  return (
    <InfoPage
      title="Privacy"
      lede="How Media Extensions handles the information you share with us."
    >
      <InfoSection title="What we collect">
        <p>
          Account details (name, email, phone), order and shipping information, repair booking
          details, and messages you send through contact forms. Guest checkout still stores the
          contact details needed to fulfill your order.
        </p>
      </InfoSection>
      <InfoSection title="How we use it">
        <p>
          To process orders and repairs, confirm Mobile Money or bank payments, deliver downloads,
          improve the shop, and respond to support requests. We do not sell your personal data.
        </p>
      </InfoSection>
      <InfoSection title="Retention">
        <p>
          Order and repair records are kept as required for business and accounting. You may request
          account updates by contacting us.
        </p>
      </InfoSection>
    </InfoPage>
  );
}

export function TermsPage() {
  return (
    <InfoPage title="Terms" lede="Terms of use for the Media Extensions storefront and repair services.">
      <InfoSection title="Orders">
        <p>
          Placing an order creates a request to purchase at the listed Ghana cedi price. Payment
          methods are Paystack (card/MoMo), Mobile Money, bank transfer, or pay on pickup. Ownership of digital files
          transfers after payment is confirmed by staff; physical goods remain ours until paid.
        </p>
      </InfoSection>
      <InfoSection title="Accounts">
        <p>
          Public registration creates a consumer account. Manager and admin access is issued by
          Media Extensions only. You are responsible for keeping login details private.
        </p>
      </InfoSection>
      <InfoSection title="Repairs">
        <p>
          Repair bookings are diagnostic requests. Final pricing may change after inspection; we
          will confirm before continuing billable work beyond an agreed quote.
        </p>
      </InfoSection>
      <InfoSection title="Liability">
        <p>
          We aim for accurate listings and careful fulfillment. We are not liable for indirect
          losses from delayed courier routes or device data loss — please back up devices before
          repair drop-off.
        </p>
      </InfoSection>
    </InfoPage>
  );
}

export function FaqPage() {
  const items = [
    {
      q: "Can I checkout without an account?",
      a: "Yes. Guests can shop, check out, and book repairs. Create an account anytime to track orders and downloads.",
    },
    {
      q: "How do I pay?",
      a: "Paystack (card or MoMo), Mobile Money, bank transfer, or cash/MoMo on pickup. Online Paystack payments confirm automatically; offline methods are marked paid by staff — then digital downloads unlock.",
    },
    {
      q: "Where do I download LUTs and plugins?",
      a: "On the order confirmation page after payment is confirmed, and under Account → Downloads when signed in.",
    },
    {
      q: "Do you repair all phone brands?",
      a: "We handle common Android and iPhone models. Book a general diagnosis if you are unsure — we’ll confirm parts availability.",
    },
    {
      q: "How long do Accra deliveries take?",
      a: "Usually 1–2 business days after payment confirmation. Regional deliveries typically take 2–5 business days.",
    },
  ];

  return (
    <InfoPage title="FAQ" lede="Quick answers for shoppers and repair customers.">
      {items.map((item) => (
        <InfoSection key={item.q} title={item.q}>
          <p>{item.a}</p>
        </InfoSection>
      ))}
      <p className="meta">
        Still stuck? <Link to="/contact">Contact us</Link>.
      </p>
    </InfoPage>
  );
}

export function PickupPage() {
  const { meta } = useSiteMeta();

  const address =
    meta?.pickup?.address?.trim() ||
    "Kumasi Station, Koforidua (landmark details shared after order confirmation).";
  const landmark = meta?.pickup?.landmark;
  const hours = meta?.pickup?.hours ?? "Monday–Saturday, 9:00–18:00 GMT. Closed public holidays.";
  const phone = meta?.storePhone ?? meta?.storeWhatsApp;
  const email = meta?.storeEmail;

  return (
    <InfoPage
      title="Pickup & location"
      lede="Collect physical orders and drop off devices for GSM repair at Kumasi Station, Koforidua."
    >
      <InfoSection title="Location">
        <p>
          <strong>{meta?.pickup?.name?.trim() || "Media Extensions — Koforidua"}</strong>
          <br />
          {address}
          {landmark ? (
            <>
              <br />
              Landmark: {landmark}
            </>
          ) : null}
        </p>
        <p>Hours: {hours}</p>
        {(phone || email) && (
          <p>
            {phone && <>Phone: {phone}</>}
            {phone && email ? " · " : null}
            {email && <>Email: {email}</>}
          </p>
        )}
      </InfoSection>
      <InfoSection title="How pickup works">
        <p>
          Pay securely through <strong>Paystack</strong> at checkout, then arrange collection. Bring a valid ID matching the order name when collecting
          high-value gear.
        </p>
      </InfoSection>
      <InfoSection title="Repairs drop-off">
        <p>
          Book online, then bring your device during open hours. We’ll confirm the quote before
          starting paid work.{" "}
          <Link to="/repairs/book">Book a repair</Link>.
        </p>
      </InfoSection>
    </InfoPage>
  );
}

export function RepairWarrantyPage() {
  return (
    <InfoPage
      title="Repair warranty"
      lede="What we stand behind after your device leaves the bench."
    >
      <InfoSection title="Workmanship">
        <p>
          Paid repair work is covered against defects in our labor for <strong>30 days</strong> from
          collection. If the same fault returns without new physical damage, bring the device back with
          your ticket ID and we will re-inspect at no diagnostic fee.
        </p>
      </InfoSection>
      <InfoSection title="Parts">
        <p>
          Replacement parts carry the supplier’s warranty where applicable. We will note on your quote
          when a part is refurbished or aftermarket so you can decide before approving work.
        </p>
      </InfoSection>
      <InfoSection title="Not covered">
        <p>
          Liquid damage after repair, cracked screens from drops, lost devices, and issues caused by
          unauthorized third-party repairs are outside warranty. See also{" "}
          <Link to="/returns">Returns & refunds</Link> for store purchases.
        </p>
      </InfoSection>
    </InfoPage>
  );
}

export function RepairHowWeQuotePage() {
  return (
    <InfoPage
      title="How we quote repairs"
      lede="Transparent steps from drop-off to approval — no surprise invoices."
    >
      <InfoSection title="1 · Intake">
        <p>
          We log your device, issue description, and contact details. You receive a ticket ID by email
          for tracking.
        </p>
      </InfoSection>
      <InfoSection title="2 · Diagnosis">
        <p>
          A technician inspects hardware and software. Simple fixes may be quoted same-day; board-level
          or parts-on-order jobs may take longer.
        </p>
      </InfoSection>
      <InfoSection title="3 · Your approval">
        <p>
          We send a quote in Ghana cedis. Work starts only after you approve in your{" "}
          <Link to="/track">tracking page</Link> or in store. You can decline and collect the device
          after paying any agreed diagnostic fee noted upfront.
        </p>
      </InfoSection>
      <InfoSection title="4 · Payment & pickup">
        <p>
          Pay via MoMo, bank, cash at the counter, or Paystack where enabled. We notify you when the
          device is ready for collection in Koforidua.
        </p>
      </InfoSection>
    </InfoPage>
  );
}

export function WholesalePage() {
  const { meta } = useSiteMeta();
  const email = meta?.storeEmail?.trim() || meta?.store?.email?.trim() || "hello@mediaextensions.com";

  return (
    <InfoPage
      title="Wholesale & bulk"
      lede="Studios, schools, and resellers — let’s talk volume pricing on gear and digital licenses."
    >
      <InfoSection title="Who it’s for">
        <p>
          Content teams buying LUT packs in bulk, schools equipping labs, and shops needing consistent
          supply of accessories or repair turnaround SLAs.
        </p>
      </InfoSection>
      <InfoSection title="How to enquire">
        <p>
          Email <a href={`mailto:${email}?subject=Wholesale%20enquiry`}>{email}</a> with your business
          name, rough quantities, and timeline. We respond with availability and MoMo / invoice options
          in GHS.
        </p>
      </InfoSection>
      <InfoSection title="Repairs at scale">
        <p>
          Fleet or shop accounts can arrange scheduled drop-offs and consolidated billing. See{" "}
          <Link to="/repairs/how-we-quote">how we quote</Link> for the standard repair flow.
        </p>
      </InfoSection>
    </InfoPage>
  );
}

export function NotFoundPage() {
  return (
    <div className="page container" style={{ textAlign: "center", paddingBottom: "5rem" }}>
      <h1>Page not found</h1>
      <p className="lede" style={{ marginInline: "auto" }}>
        That link doesn’t exist in the Media Extensions shop.
      </p>
      <div className="cta-row" style={{ justifyContent: "center" }}>
        <Link to="/" className="btn btn-dark">
          Home
        </Link>
        <Link to="/shop" className="btn btn-light">
          Shop
        </Link>
        <Link to="/contact" className="btn btn-light">
          Contact
        </Link>
      </div>
    </div>
  );
}
