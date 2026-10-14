import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Lock,
  User,
  AtSign,
  Mail,
  Phone,
  MessageSquare,
  Gift,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import AuthShell from "../../components/auth/AuthShell";
import Field from "../../components/ui/Field";
import AvatarPicker from "../../components/auth/AvatarPicker";
import RolePicker from "../../components/auth/RolePicker";
import { Button } from "../../components/ui/Button";
import { useAuthStore } from "../../store/auth";
import { referralService } from "../../services/referral";

const PRIVACY_URL = "https://umucuruziprivacypolicy.site.je";

export default function Signup() {
  const nav = useNavigate();
  const signup = useAuthStore((s) => s.signup);

  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    role: "customer",
    description: "",
    profile_image: "",
    referral_code: "",
  });
  const [errors, setErrors] = useState({});
  const [formErr, setFormErr] = useState(null);
  const [loading, setLoading] = useState(false);

  /* Referral live check */
  const [referrerName, setReferrerName] = useState(null);
  const [referrerErr, setReferrerErr] = useState(null);
  const [checkingRef, setCheckingRef] = useState(false);

  const update = (key, value) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
    if (formErr) setFormErr(null);
  };

  /* Live referral validation (600 ms debounce) */
  useEffect(() => {
    const code = form.referral_code.trim();
    if (!code) {
      setReferrerName(null);
      setReferrerErr(null);
      setCheckingRef(false);
      return;
    }
    setCheckingRef(true);
    const t = setTimeout(async () => {
      try {
        const res = await referralService.validateCode(code);
        if (res?.valid) {
          setReferrerName(res.referrer?.full_name || res.referrer?.username);
          setReferrerErr(null);
        } else {
          setReferrerName(null);
          setReferrerErr("That referral code is not valid");
        }
      } catch {
        setReferrerName(null);
        setReferrerErr("That referral code is not valid");
      } finally {
        setCheckingRef(false);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [form.referral_code]);

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = "Full name is required";
    if (!form.username.trim()) e.username = "Username is required";
    if (!form.phone.trim()) e.phone = "Phone number is required";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 6)
      e.password = "Must be at least 6 characters";
    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    )
      e.email = "Enter a valid email address";
    if (form.referral_code.trim() && !referrerName)
      e.referral_code = "That referral code is not valid";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setFormErr(null);
    if (!validate()) return;

    setLoading(true);
    try {
      await signup(form);
      toast.success("Account created! Welcome to umucuruzi 🎉");
      nav("/");
    } catch (err) {
      setFormErr(
        err?.response?.data?.message ||
          err?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join umucuruzi and start buying or selling today"
    >
      <form onSubmit={submit} noValidate>
        {formErr && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-danger-500/30 bg-danger-500/10 p-3">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-danger-500" />
            <span className="text-[12.5px] font-semibold text-danger-500">
              {formErr}
            </span>
          </div>
        )}

        <AvatarPicker
          value={form.profile_image}
          onChange={(v) => update("profile_image", v)}
        />

        {/* Personal */}
        <SectionLabel>Personal information</SectionLabel>

        <Field
          label="Full name"
          icon={User}
          placeholder="Enter your full name"
          value={form.full_name}
          onChange={(e) => update("full_name", e.target.value)}
          error={errors.full_name}
          autoComplete="name"
        />

        <Field
          label="Username"
          icon={AtSign}
          placeholder="Choose a username"
          value={form.username}
          onChange={(e) => update("username", e.target.value)}
          error={errors.username}
          autoComplete="username"
        />

        <Field
          label="Email"
          icon={Mail}
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          error={errors.email}
          autoComplete="email"
          labelAccessory={
            <span className="text-[10.5px] font-semibold text-ink-400">
              · optional
            </span>
          }
        />

        <Field
          label="Phone number"
          icon={Phone}
          type="tel"
          placeholder="07XX XXX XXX"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          error={errors.phone}
          autoComplete="tel"
        />

        {/* Role */}
        <SectionLabel>I am a…</SectionLabel>
        <RolePicker value={form.role} onChange={(v) => update("role", v)} />

        {/* Password */}
        <SectionLabel>Account security</SectionLabel>
        <Field
          label="Password"
          icon={Lock}
          type="password"
          placeholder="At least 6 characters"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          error={errors.password}
          autoComplete="new-password"
        />

        {/* Additional */}
        <SectionLabel>
          Additional details{" "}
          <span className="text-[10.5px] font-semibold text-ink-400">
            · optional
          </span>
        </SectionLabel>

        <Field
          label="About you"
          icon={MessageSquare}
          multiline
          rows={3}
          placeholder="Tell us a little about yourself"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
        />

        <Field
          label="Referral code"
          icon={Gift}
          placeholder="Enter referral code"
          value={form.referral_code}
          onChange={(e) =>
            update("referral_code", e.target.value.toUpperCase())
          }
          error={errors.referral_code}
          autoComplete="off"
        >
          {checkingRef && (
            <p className="mt-1.5 ml-0.5 text-[11.5px] font-semibold text-ink-400">
              Checking…
            </p>
          )}
          {!checkingRef && referrerName && (
            <p className="mt-1.5 ml-0.5 flex items-center gap-1 text-[11.5px] font-bold text-emerald-600">
              <CheckCircle2 size={12} />
              Referred by {referrerName}
            </p>
          )}
          {!checkingRef && referrerErr && !errors.referral_code && (
            <p className="mt-1.5 ml-0.5 flex items-center gap-1 text-[11.5px] font-bold text-danger-500">
              <AlertCircle size={12} />
              {referrerErr}
            </p>
          )}
        </Field>

        <p className="mt-2 mb-5 text-center text-[12px] font-medium leading-relaxed text-ink-500">
          By creating an account you agree to our{" "}
          <a
            href={PRIVACY_URL}
            target="_blank"
            rel="noreferrer"
            className="font-extrabold text-brand-600 underline"
          >
            Privacy Policy
          </a>
          .
        </p>

        <Button type="submit" size="lg" fullWidth loading={loading}>
          Create account
          <ArrowRight size={16} />
        </Button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-ink-200" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-ink-400">
            Already a member?
          </span>
          <div className="h-px flex-1 bg-ink-200" />
        </div>

        <Link
          to="/auth/login"
          className="flex h-14 w-full items-center justify-center rounded-full border-2 border-brand-600 bg-white text-[15px] font-extrabold text-brand-600 transition-colors hover:bg-brand-50"
        >
          Sign in instead
        </Link>
      </form>
    </AuthShell>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="mb-3 mt-6 ml-0.5 text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-brand-600">
      {children}
    </p>
  );
}
