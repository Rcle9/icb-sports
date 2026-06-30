import { useEffect, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { useAuth } from "../../context/AuthContext";
import {
  getPaymentSettings,
  savePaymentSettings,
} from "../../services/paymentSettingsService";

export default function PaymentSettings() {
  const { user } = useAuth();

  const [settingsId, setSettingsId] = useState(null);

  const [form, setForm] = useState({
    gcash_name: "",
    gcash_number: "",
    gcash_qr_url: "",
    bank_name: "",
    bank_account_name: "",
    bank_account_number: "",
    bank_qr_url: "",
    payment_instructions: "",
    reservation_expiration_minutes: 15,
  });

  const [gcashQrFile, setGcashQrFile] = useState(null);
  const [bankQrFile, setBankQrFile] = useState(null);

  const [gcashPreview, setGcashPreview] = useState("");
  const [bankPreview, setBankPreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");

      const data = await getPaymentSettings();

      if (data) {
        setSettingsId(data.id);

        setForm({
          gcash_name: data.gcash_name || "",
          gcash_number: data.gcash_number || "",
          gcash_qr_url: data.gcash_qr_url || "",
          bank_name: data.bank_name || "",
          bank_account_name: data.bank_account_name || "",
          bank_account_number: data.bank_account_number || "",
          bank_qr_url: data.bank_qr_url || "",
          payment_instructions: data.payment_instructions || "",
          reservation_expiration_minutes:
            data.reservation_expiration_minutes || 15,
        });

        setGcashPreview(data.gcash_qr_url || "");
        setBankPreview(data.bank_qr_url || "");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load payment settings.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleQrChange(event, type) {
    const file = event.target.files?.[0];

    if (!file) return;

    const previewUrl = URL.createObjectURL(file);

    if (type === "gcash") {
      setGcashQrFile(file);
      setGcashPreview(previewUrl);
      return;
    }

    setBankQrFile(file);
    setBankPreview(previewUrl);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const saved = await savePaymentSettings({
        id: settingsId,
        ...form,
        gcash_qr_file: gcashQrFile,
        bank_qr_file: bankQrFile,
        updated_by: user?.id || null,
      });

      setSettingsId(saved.id);

      setForm({
        gcash_name: saved.gcash_name || "",
        gcash_number: saved.gcash_number || "",
        gcash_qr_url: saved.gcash_qr_url || "",
        bank_name: saved.bank_name || "",
        bank_account_name: saved.bank_account_name || "",
        bank_account_number: saved.bank_account_number || "",
        bank_qr_url: saved.bank_qr_url || "",
        payment_instructions: saved.payment_instructions || "",
        reservation_expiration_minutes:
          saved.reservation_expiration_minutes || 15,
      });

      setGcashPreview(saved.gcash_qr_url || "");
      setBankPreview(saved.bank_qr_url || "");
      setGcashQrFile(null);
      setBankQrFile(null);

      setMessage("Payment settings saved successfully.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save payment settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-shell">
      <Sidebar role="admin" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Payment Settings" />

          {error && (
            <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}

          <section className="page-hero mb-6">
            <p className="text-sm font-semibold">Payment Configuration</p>

            <h2 className="mt-2 text-3xl font-black">
              Manage payment accounts and QR codes.
            </h2>

            <p className="mt-2 text-sm text-white/90">
              These details will be shown to users when they upload payment
              proof for their reservation.
            </p>
          </section>

          {loading ? (
            <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">
                Loading payment settings...
              </p>
            </section>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]"
            >
              <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-black text-[#2B2B2B]">
                  Payment Accounts
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Add GCash and bank payment details for users.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                  <InputField
                    label="GCash Account Name"
                    name="gcash_name"
                    value={form.gcash_name}
                    onChange={handleChange}
                    placeholder="InCredoBall Sports"
                  />

                  <InputField
                    label="GCash Number"
                    name="gcash_number"
                    value={form.gcash_number}
                    onChange={handleChange}
                    placeholder="09XXXXXXXXX"
                  />

                  <InputField
                    label="Bank Name"
                    name="bank_name"
                    value={form.bank_name}
                    onChange={handleChange}
                    placeholder="Bank name"
                  />

                  <InputField
                    label="Bank Account Name"
                    name="bank_account_name"
                    value={form.bank_account_name}
                    onChange={handleChange}
                    placeholder="InCredoBall Sports"
                  />

                  <InputField
                    label="Bank Account Number"
                    name="bank_account_number"
                    value={form.bank_account_number}
                    onChange={handleChange}
                    placeholder="0000000000"
                  />

                  <InputField
                    label="Reservation Expiration Minutes"
                    name="reservation_expiration_minutes"
                    type="number"
                    min="1"
                    value={form.reservation_expiration_minutes}
                    onChange={handleChange}
                    placeholder="15"
                  />
                </div>

                <div className="mt-5">
                  <label className="mb-2 block text-sm font-bold text-[#2B2B2B]">
                    Payment Instructions
                  </label>

                  <textarea
                    name="payment_instructions"
                    value={form.payment_instructions}
                    onChange={handleChange}
                    placeholder="Tell users how to pay and what proof they should upload."
                    className="min-h-[150px] w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
                  />
                </div>
              </section>

              <section className="rounded-[28px] border border-[#DED8D2] bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-black text-[#2B2B2B]">
                  QR Code Upload
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Upload payment QR codes so users can scan and pay faster.
                </p>

                <QrUploadCard
                  title="GCash QR Code"
                  preview={gcashPreview}
                  onChange={(event) => handleQrChange(event, "gcash")}
                />

                <QrUploadCard
                  title="Bank QR Code"
                  preview={bankPreview}
                  onChange={(event) => handleQrChange(event, "bank")}
                />

                <button
                  type="submit"
                  disabled={saving}
                  className="mt-6 w-full rounded-2xl bg-[#C97B6C] px-6 py-4 font-bold text-white hover:bg-[#B87463] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Payment Settings"}
                </button>
              </section>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

function InputField({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-[#2B2B2B]">
        {label}
      </label>

      <input
        type={type}
        min={min}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-[#DED8D2] px-4 py-3 outline-none focus:border-[#C97B6C]"
      />
    </div>
  );
}

function QrUploadCard({ title, preview, onChange }) {
  return (
    <div className="mt-5 rounded-2xl border border-[#DED8D2] bg-slate-50 p-4">
      <p className="text-sm font-black text-[#2B2B2B]">{title}</p>

      {preview ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-[#DED8D2] bg-white p-3">
          <img
            src={preview}
            alt={title}
            className="mx-auto h-56 w-56 rounded-xl object-contain"
          />
        </div>
      ) : (
        <div className="mt-3 flex h-56 items-center justify-center rounded-2xl border border-dashed border-[#DED8D2] bg-white text-sm text-slate-500">
          No QR uploaded yet.
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        onChange={onChange}
        className="mt-4 w-full rounded-2xl border border-[#DED8D2] bg-white px-4 py-3 text-sm outline-none focus:border-[#C97B6C]"
      />
    </div>
  );
}