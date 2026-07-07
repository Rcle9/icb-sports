// src/pages/admin/PaymentSettings.jsx

import { useEffect, useState } from "react";
import {
  Banknote,
  Building2,
  Clock3,
  CreditCard,
  ImagePlus,
  Loader2,
  QrCode,
  RefreshCcw,
  Save,
  Smartphone,
} from "lucide-react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { useAuth } from "../../context/AuthContext";
import {
  getPaymentSettings,
  resetPaymentSettings,
  savePaymentSettings,
} from "../../services/paymentSettingsService";

const DEFAULT_FORM = {
  gcash_name: "",
  gcash_number: "",
  gcash_qr_url: "",
  bank_name: "",
  bank_account_name: "",
  bank_account_number: "",
  bank_qr_url: "",
  payment_instructions: "",
  reservation_expiration_minutes: 15,
  is_gcash_enabled: true,
  is_bank_enabled: false,
  is_cash_enabled: true,
};

export default function PaymentSettings() {
  const { user } = useAuth();

  const [settingsId, setSettingsId] = useState("default");
  const [form, setForm] = useState(DEFAULT_FORM);

  const [gcashQrFile, setGcashQrFile] = useState(null);
  const [bankQrFile, setBankQrFile] = useState(null);

  const [gcashPreview, setGcashPreview] = useState("");
  const [bankPreview, setBankPreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  function applySettings(data) {
    const nextForm = {
      gcash_name: data?.gcash_name || "",
      gcash_number: data?.gcash_number || "",
      gcash_qr_url: data?.gcash_qr_url || "",
      bank_name: data?.bank_name || "",
      bank_account_name: data?.bank_account_name || "",
      bank_account_number: data?.bank_account_number || "",
      bank_qr_url: data?.bank_qr_url || "",
      payment_instructions: data?.payment_instructions || "",
      reservation_expiration_minutes:
        data?.reservation_expiration_minutes || 15,
      is_gcash_enabled: data?.is_gcash_enabled ?? true,
      is_bank_enabled: data?.is_bank_enabled ?? false,
      is_cash_enabled: data?.is_cash_enabled ?? true,
    };

    setSettingsId(data?.id || "default");
    setForm(nextForm);
    setGcashPreview(nextForm.gcash_qr_url);
    setBankPreview(nextForm.bank_qr_url);
    setGcashQrFile(null);
    setBankQrFile(null);
  }

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const data = await getPaymentSettings();
      applySettings(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load payment settings.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
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

  function removeQr(type) {
    if (type === "gcash") {
      setGcashQrFile(null);
      setGcashPreview("");
      setForm((prev) => ({
        ...prev,
        gcash_qr_url: "",
      }));
      return;
    }

    setBankQrFile(null);
    setBankPreview("");
    setForm((prev) => ({
      ...prev,
      bank_qr_url: "",
    }));
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

      applySettings(saved);
      setMessage("Payment settings saved successfully.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save payment settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    const confirmed = window.confirm(
      "Reset payment settings to default values?"
    );

    if (!confirmed) return;

    try {
      setResetting(true);
      setError("");
      setMessage("");

      const data = await resetPaymentSettings(user?.id || null);
      applySettings(data);
      setMessage("Payment settings reset successfully.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to reset payment settings.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="page-shell">
      <Sidebar role="admin" />

      <main className="page-main">
        <div className="page-container">
          <Topbar title="Payment Settings" />

          <section className="mb-6 rounded-[32px] bg-[#0B1F33] p-6 text-white shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/70">
                  Payment Configuration
                </p>

                <h1 className="mt-3 text-3xl font-black lg:text-4xl">
                  Manage payment accounts and QR codes.
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80">
                  These settings are shown to users when they need to pay and
                  upload proof before their reservation timer expires.
                </p>
              </div>

              <button
                type="button"
                onClick={loadSettings}
                disabled={loading || saving || resetting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm font-bold text-white ring-1 ring-white/20 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw size={18} />
                Refresh
              </button>
            </div>
          </section>

          {error && <div className="icb-alert-error mb-4">{error}</div>}

          {message && <div className="icb-alert-success mb-4">{message}</div>}

          {loading ? (
            <section className="icb-card flex items-center gap-3 p-6 text-sm text-slate-500">
              <Loader2 className="animate-spin" size={18} />
              Loading payment settings...
            </section>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]"
            >
              <section className="space-y-6">
                <div className="icb-card p-6">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-[#C97B6C]/10 p-3 text-[#C97B6C]">
                      <Smartphone size={22} />
                    </div>

                    <div>
                      <h2 className="icb-section-title">GCash Details</h2>
                      <p className="icb-section-subtitle mt-1">
                        Enable GCash payment and enter the account details users
                        should send payment to.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <ToggleField
                      label="Enable GCash Payment"
                      name="is_gcash_enabled"
                      checked={form.is_gcash_enabled}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
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
                  </div>
                </div>

                <div className="icb-card p-6">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-[#0B1F33]/10 p-3 text-[#0B1F33]">
                      <Building2 size={22} />
                    </div>

                    <div>
                      <h2 className="icb-section-title">Bank Details</h2>
                      <p className="icb-section-subtitle mt-1">
                        Add bank transfer information for users who prefer bank
                        payment.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <ToggleField
                      label="Enable Bank Transfer"
                      name="is_bank_enabled"
                      checked={form.is_bank_enabled}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
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
                  </div>
                </div>

                <div className="icb-card p-6">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                      <Banknote size={22} />
                    </div>

                    <div>
                      <h2 className="icb-section-title">
                        Other Payment Settings
                      </h2>
                      <p className="icb-section-subtitle mt-1">
                        Control cash payment, reservation timer, and payment
                        instructions.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                    <ToggleField
                      label="Enable Cash Payment"
                      name="is_cash_enabled"
                      checked={form.is_cash_enabled}
                      onChange={handleChange}
                    />

                    <InputField
                      label="Reservation Expiration Minutes"
                      name="reservation_expiration_minutes"
                      type="number"
                      min="5"
                      value={form.reservation_expiration_minutes}
                      onChange={handleChange}
                      placeholder="15"
                      icon={<Clock3 size={18} />}
                    />
                  </div>

                  <div className="mt-5">
                    <label className="icb-label">Payment Instructions</label>

                    <textarea
                      name="payment_instructions"
                      value={form.payment_instructions}
                      onChange={handleChange}
                      placeholder="Tell users how to pay and what proof they should upload."
                      className="icb-textarea min-h-[150px]"
                    />
                  </div>
                </div>
              </section>

              <aside className="space-y-6">
                <section className="icb-card p-6">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-[#C97B6C]/10 p-3 text-[#C97B6C]">
                      <QrCode size={22} />
                    </div>

                    <div>
                      <h2 className="icb-section-title">QR Code Upload</h2>
                      <p className="icb-section-subtitle mt-1">
                        Upload payment QR codes so users can scan and pay
                        faster.
                      </p>
                    </div>
                  </div>

                  <QrUploadCard
                    title="GCash QR Code"
                    preview={gcashPreview}
                    onChange={(event) => handleQrChange(event, "gcash")}
                    onRemove={() => removeQr("gcash")}
                  />

                  <QrUploadCard
                    title="Bank QR Code"
                    preview={bankPreview}
                    onChange={(event) => handleQrChange(event, "bank")}
                    onRemove={() => removeQr("bank")}
                  />
                </section>

                <section className="icb-card p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                      <CreditCard size={22} />
                    </div>

                    <div>
                      <h2 className="text-lg font-black text-[#2B2B2B]">
                        Save Changes
                      </h2>
                      <p className="text-xs text-slate-500">
                        Updates will be used on new payment screens.
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving || resetting}
                    className="icb-btn-accent w-full"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Save Payment Settings
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={saving || resetting}
                    className="icb-btn-light mt-3 w-full"
                  >
                    {resetting ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Resetting...
                      </>
                    ) : (
                      <>
                        <RefreshCcw size={18} />
                        Reset to Default
                      </>
                    )}
                  </button>
                </section>
              </aside>
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
  icon,
}) {
  return (
    <div>
      <label className="icb-label">{label}</label>

      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}

        <input
          type={type}
          min={min}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`icb-input ${icon ? "pl-11" : ""}`}
        />
      </div>
    </div>
  );
}

function ToggleField({ label, name, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-[#DED8D2] bg-slate-50 px-4 py-3">
      <span className="text-sm font-bold text-[#2B2B2B]">{label}</span>

      <input
        type="checkbox"
        name={name}
        checked={Boolean(checked)}
        onChange={onChange}
        className="h-5 w-5 accent-[#C97B6C]"
      />
    </label>
  );
}

function QrUploadCard({ title, preview, onChange, onRemove }) {
  return (
    <div className="mt-5 rounded-2xl border border-[#DED8D2] bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-[#2B2B2B]">{title}</p>

        {preview && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs font-bold text-red-600 hover:text-red-700"
          >
            Remove
          </button>
        )}
      </div>

      {preview ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-[#DED8D2] bg-white p-3">
          <img
            src={preview}
            alt={title}
            className="mx-auto h-56 w-56 rounded-xl object-contain"
          />
        </div>
      ) : (
        <div className="mt-3 flex h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-[#DED8D2] bg-white px-4 text-center text-sm text-slate-500">
          <ImagePlus className="mb-2 text-slate-400" size={28} />
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